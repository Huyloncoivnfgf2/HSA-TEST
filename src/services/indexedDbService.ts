import { Question, ExamSession, ExamSet, QuestionEditHistory } from '../types/hsa';
import { ExamRecord } from '../types/analytics';
import { FSRSCardData, normalizeCard } from './fsrsService';
import { INITIAL_QUESTIONS } from '../data/sampleQuestions';
import { encodeStrokesDelta, decodeStrokesDelta } from './annotationService';
import type {
  PdfExam,
  PdfExamBackup,
  PdfExamScratchpad,
  PdfExamSession,
  PdfPageAnnotations,
} from '../types/pdfExam';

const DB_NAME = 'HSA_MASTER_DB_V4';
const DB_VERSION = 4;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('questions')) {
        db.createObjectStore('questions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('exam_sets')) {
        db.createObjectStore('exam_sets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('active_session')) {
        db.createObjectStore('active_session', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('exam_history')) {
        db.createObjectStore('exam_history', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('fsrs_cards')) {
        db.createObjectStore('fsrs_cards', { keyPath: 'questionId' });
      }
      if (!db.objectStoreNames.contains('question_edits')) {
        db.createObjectStore('question_edits', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('question_annotations')) {
        db.createObjectStore('question_annotations', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('group_annotations')) {
        db.createObjectStore('group_annotations', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('pdf_exams')) {
        db.createObjectStore('pdf_exams', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pdf_exam_sessions')) {
        db.createObjectStore('pdf_exam_sessions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pdf_page_annotations')) {
        const store = db.createObjectStore('pdf_page_annotations', { keyPath: 'key' });
        store.createIndex('examId', 'examId');
      }
      const annotations = request.transaction?.objectStore('pdf_page_annotations');
      if (annotations && !annotations.indexNames.contains('examId')) {
        annotations.createIndex('examId', 'examId');
      }
      if (!db.objectStoreNames.contains('pdf_exam_scratchpads')) {
        db.createObjectStore('pdf_exam_scratchpads', { keyPath: 'examId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

const PDF_SESSION_STORAGE_KEY = 'hsa_pdf_exam_session_v1';
const PDF_BACKUP_STORES = [
  'questions',
  'exam_sets',
  'active_session',
  'exam_history',
  'fsrs_cards',
  'question_edits',
  'question_annotations',
  'group_annotations',
  'pdf_exams',
  'pdf_exam_sessions',
  'pdf_page_annotations',
  'pdf_exam_scratchpads',
];

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export async function savePdfExam(exam: PdfExam): Promise<void> {
  const db = await getDb();
  const transaction = db.transaction('pdf_exams', 'readwrite');
  transaction.objectStore('pdf_exams').put(exam);
  await transactionComplete(transaction);
  await requestPersistentStorage();
}

export async function savePdfExams(exams: PdfExam[]): Promise<void> {
  if (exams.length === 0) return;
  const db = await getDb();
  const transaction = db.transaction('pdf_exams', 'readwrite');
  const store = transaction.objectStore('pdf_exams');
  for (const exam of exams) store.put(exam);
  await transactionComplete(transaction);
  await requestPersistentStorage();
}

export async function savePdfPageAnnotations(data: PdfPageAnnotations): Promise<void> {
  const db = await getDb();
  const transaction = db.transaction('pdf_page_annotations', 'readwrite');
  transaction.objectStore('pdf_page_annotations').put(data);
  await transactionComplete(transaction);
}

export async function loadPdfPageAnnotations(examId: string): Promise<PdfPageAnnotations[]> {
  const db = await getDb();
  const transaction = db.transaction('pdf_page_annotations', 'readonly');
  const store = transaction.objectStore('pdf_page_annotations');
  return requestResult(store.index('examId').getAll(examId)) as Promise<PdfPageAnnotations[]>;
}

export async function savePdfExamScratchpad(data: PdfExamScratchpad): Promise<void> {
  const db = await getDb();
  const transaction = db.transaction('pdf_exam_scratchpads', 'readwrite');
  transaction.objectStore('pdf_exam_scratchpads').put(data);
  await transactionComplete(transaction);
}

export async function loadPdfExamScratchpad(examId: string): Promise<PdfExamScratchpad | null> {
  const db = await getDb();
  const transaction = db.transaction('pdf_exam_scratchpads', 'readonly');
  const data = await requestResult(transaction.objectStore('pdf_exam_scratchpads').get(examId));
  return (data as PdfExamScratchpad | undefined) ?? null;
}

export async function loadPdfExams(): Promise<PdfExam[]> {
  const db = await getDb();
  const transaction = db.transaction('pdf_exams', 'readonly');
  return requestResult(transaction.objectStore('pdf_exams').getAll()) as Promise<PdfExam[]>;
}

export async function deletePdfExam(id: string): Promise<void> {
  const db = await getDb();
  const transaction = db.transaction(
    ['pdf_exams', 'pdf_exam_sessions', 'pdf_page_annotations', 'pdf_exam_scratchpads'],
    'readwrite'
  );
  transaction.objectStore('pdf_exams').delete(id);
  const sessionStore = transaction.objectStore('pdf_exam_sessions');
  const session = await requestResult(sessionStore.get('active')) as PdfExamSession | undefined;
  if (session?.examId === id) {
    sessionStore.delete('active');
    localStorage.removeItem(PDF_SESSION_STORAGE_KEY);
  }
  const annotations = transaction.objectStore('pdf_page_annotations');
  const pages = await requestResult(annotations.getAll()) as PdfPageAnnotations[];
  pages.filter((page) => page.examId === id).forEach((page) => annotations.delete(page.key));
  transaction.objectStore('pdf_exam_scratchpads').delete(id);
  await transactionComplete(transaction);
}

export function loadPdfSessionFromLocalStorage(): PdfExamSession | null {
  try {
    const raw = localStorage.getItem(PDF_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<PdfExamSession>;
    return {
      ...session,
      id: 'active',
      answers: session.answers ?? {},
      answerModes: session.answerModes ?? {},
      flaggedQuestions: session.flaggedQuestions ?? {},
      chapterLabels: session.chapterLabels ?? {},
      questionPages: session.questionPages ?? {},
      mode: session.mode ?? 'test',
      submitted: session.submitted ?? false,
      examId: session.examId ?? '',
      startedAt: session.startedAt ?? Date.now(),
      endsAt: session.endsAt ?? null,
    };
  } catch (error) {
    console.error('Could not read the saved PDF exam session:', error);
    return null;
  }
}

export function savePdfExamSessionLocally(session: PdfExamSession): void {
  localStorage.setItem(PDF_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function savePdfExamSession(session: PdfExamSession | null): Promise<void> {
  if (session) {
    localStorage.setItem(PDF_SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(PDF_SESSION_STORAGE_KEY);
  }
  const db = await getDb();
  const transaction = db.transaction('pdf_exam_sessions', 'readwrite');
  const store = transaction.objectStore('pdf_exam_sessions');
  if (session) store.put(session);
  else store.delete('active');
  await transactionComplete(transaction);
}

export async function loadPdfExamSession(): Promise<PdfExamSession | null> {
  const db = await getDb();
  const transaction = db.transaction('pdf_exam_sessions', 'readonly');
  const session = await requestResult(transaction.objectStore('pdf_exam_sessions').get('active'));
  return session
    ? loadPdfSessionFromLocalStorage() ?? session as PdfExamSession
    : loadPdfSessionFromLocalStorage();
}

async function encodeBackupValue(value: unknown): Promise<unknown> {
  if (value instanceof Blob) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error ?? new Error('Could not read a file for backup'));
      reader.readAsDataURL(value);
    });
    return { __hsaBlob: true, type: value.type, data };
  }
  if (Array.isArray(value)) return Promise.all(value.map(encodeBackupValue));
  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]) => [key, await encodeBackupValue(item)] as const)
    );
    return Object.fromEntries(entries);
  }
  return value;
}

function decodeBackupValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeBackupValue);
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    if (item.__hsaBlob === true && typeof item.data === 'string' && typeof item.type === 'string') {
      const binary = atob(item.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: item.type });
    }
    return Object.fromEntries(
      Object.entries(item).map(([key, nested]) => [key, decodeBackupValue(nested)])
    );
  }
  return value;
}

export async function exportApplicationBackup(): Promise<Blob> {
  const db = await getDb();
  const transaction = db.transaction(PDF_BACKUP_STORES, 'readonly');
  const indexedDb: Record<string, unknown[]> = {};
  await Promise.all(PDF_BACKUP_STORES.map(async (name) => {
    indexedDb[name] = await requestResult(transaction.objectStore(name).getAll()) as unknown[];
  }));
  await transactionComplete(transaction);
  const localStorageData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('hsa_')) localStorageData[key] = localStorage.getItem(key) ?? '';
  }
  const backup: PdfExamBackup = {
    format: 'hsa-pdf-backup',
    version: 1,
    createdAt: Date.now(),
    localStorage: localStorageData,
    indexedDb: Object.fromEntries(
      await Promise.all(
        Object.entries(indexedDb).map(async ([name, values]) => [
          name,
          await encodeBackupValue(values) as unknown[],
        ])
      )
    ),
  };
  return new Blob([JSON.stringify(backup)], { type: 'application/json' });
}

export async function importApplicationBackup(file: File): Promise<void> {
  const parsed: unknown = JSON.parse(await file.text());
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as PdfExamBackup).format !== 'hsa-pdf-backup' ||
    (parsed as PdfExamBackup).version !== 1 ||
    !(parsed as PdfExamBackup).indexedDb ||
    typeof (parsed as PdfExamBackup).indexedDb !== 'object'
  ) {
    throw new Error('Tệp sao lưu không hợp lệ hoặc không được hỗ trợ.');
  }
  const backup = parsed as PdfExamBackup;
  if (
    !backup.localStorage ||
    typeof backup.localStorage !== 'object' ||
    Array.isArray(backup.localStorage)
  ) {
    throw new Error('Tệp sao lưu thiếu dữ liệu lưu trữ hợp lệ.');
  }
  const restoredStores: Record<string, Array<Record<string, unknown>>> = {};
  for (const name of PDF_BACKUP_STORES) {
    const values = backup.indexedDb[name];
    if (!Array.isArray(values)) throw new Error(`Tệp sao lưu thiếu dữ liệu "${name}".`);
    const decoded = decodeBackupValue(values);
    if (!Array.isArray(decoded) || !decoded.every((value) => (
      value !== null && typeof value === 'object' && !Array.isArray(value)
    ))) {
      throw new Error(`Dữ liệu "${name}" trong tệp sao lưu không hợp lệ.`);
    }
    restoredStores[name] = decoded as Array<Record<string, unknown>>;
  }
  const db = await getDb();
  const storeNames = PDF_BACKUP_STORES.filter((name) => db.objectStoreNames.contains(name));
  const transaction = db.transaction(storeNames, 'readwrite');
  for (const name of storeNames) {
    const store = transaction.objectStore(name);
    store.clear();
    for (const value of restoredStores[name]) store.put(value);
  }
  await transactionComplete(transaction);
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith('hsa_')) localStorage.removeItem(key);
  }
  for (const [key, value] of Object.entries(backup.localStorage ?? {})) {
    if (key.startsWith('hsa_') && typeof value === 'string') localStorage.setItem(key, value);
  }
  await requestPersistentStorage();
}

/**
 * Request persistent storage permission from the browser so the OS won't evict data
 */
export async function requestPersistentStorage(): Promise<{
  persisted: boolean;
  quota?: number;
  usage?: number;
}> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      let quota: number | undefined;
      let usage: number | undefined;

      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        quota = estimate.quota;
        usage = estimate.usage;
      }

      return { persisted: isPersisted, quota, usage };
    }
  } catch (err) {
    console.warn('Persistent storage request failed:', err);
  }
  return { persisted: false };
}

// ==================== QUESTIONS ====================
export async function saveQuestionsIDB(questions: Question[]): Promise<void> {
  try {
    // Mirror to localStorage
    localStorage.setItem('hsa_question_bank_v1', JSON.stringify(questions));

    const db = await getDb();
    const tx = db.transaction('questions', 'readwrite');
    const store = tx.objectStore('questions');
    await new Promise<void>((resolve, reject) => {
      store.clear().onsuccess = () => resolve();
    });
    for (const q of questions) {
      store.put(q);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save questions to IDB:', err);
  }
}

export async function loadQuestionsIDB(): Promise<Question[]> {
  try {
    const db = await getDb();
    const tx = db.transaction('questions', 'readonly');
    const store = tx.objectStore('questions');
    const req = store.getAll();

    const items = await new Promise<Question[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as Question[]);
      req.onerror = () => reject(req.error);
    });

    if (items && items.length > 0) {
      return items;
    }
  } catch (err) {
    console.warn('Could not read questions from IDB, using localStorage fallback');
  }

  // Fallback to localStorage or INITIAL_QUESTIONS
  try {
    const raw = localStorage.getItem('hsa_question_bank_v1');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }

  return INITIAL_QUESTIONS;
}

// ==================== EXAM SETS ====================
const STORAGE_KEY_EXAM_SETS = 'hsa_exam_sets_v1';

export async function saveExamSetsIDB(sets: ExamSet[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY_EXAM_SETS, JSON.stringify(sets));
    const db = await getDb();
    const tx = db.transaction('exam_sets', 'readwrite');
    const store = tx.objectStore('exam_sets');
    store.clear();
    for (const s of sets) {
      store.put(s);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save exam sets to IDB:', err);
  }
}

export async function loadExamSetsIDB(): Promise<ExamSet[]> {
  try {
    const db = await getDb();
    const tx = db.transaction('exam_sets', 'readonly');
    const store = tx.objectStore('exam_sets');
    const req = store.getAll();

    const items = await new Promise<ExamSet[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as ExamSet[]);
      req.onerror = () => reject(req.error);
    });

    if (items && items.length > 0) return items;
  } catch (err) {
    // fallback
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXAM_SETS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }

  return [];
}

// ==================== ACTIVE EXAM SESSION ====================
const STORAGE_KEY_ACTIVE_SESSION = 'hsa_active_exam_session_v1';

export async function saveActiveSessionIDB(session: ExamSession | null): Promise<void> {
  try {
    if (!session) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
    } else {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, JSON.stringify(session));
    }

    const db = await getDb();
    const tx = db.transaction('active_session', 'readwrite');
    const store = tx.objectStore('active_session');
    store.clear();
    if (session) {
      store.put(session);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save active session to IDB:', err);
  }
}

export async function loadActiveSessionIDB(): Promise<ExamSession | null> {
  try {
    const db = await getDb();
    const tx = db.transaction('active_session', 'readonly');
    const store = tx.objectStore('active_session');
    const req = store.getAll();

    const items = await new Promise<ExamSession[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as ExamSession[]);
      req.onerror = () => reject(req.error);
    });

    if (items && items.length > 0) return items[0];
  } catch (err) {
    // fallback
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }

  return null;
}

// ==================== FSRS CARDS ====================
const STORAGE_KEY_FSRS = 'hsa_fsrs_cards_v1';

export async function saveFSRSCardsIDB(cards: FSRSCardData[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY_FSRS, JSON.stringify(cards));

    const db = await getDb();
    const tx = db.transaction('fsrs_cards', 'readwrite');
    const store = tx.objectStore('fsrs_cards');
    store.clear();
    for (const c of cards) {
      store.put(c);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save FSRS cards to IDB:', err);
  }
}

export async function loadFSRSCardsIDB(): Promise<FSRSCardData[]> {
  try {
    const db = await getDb();
    const tx = db.transaction('fsrs_cards', 'readonly');
    const store = tx.objectStore('fsrs_cards');
    const req = store.getAll();

    const items = await new Promise<FSRSCardData[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as FSRSCardData[]);
      req.onerror = () => reject(req.error);
    });

    if (items && items.length > 0) {
      return items.map((item) => ({
        ...item,
        card: normalizeCard(item.card),
      }));
    }
  } catch (err) {
    // fallback
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_FSRS);
    if (raw) {
      const parsed = JSON.parse(raw) as FSRSCardData[];
      return parsed.map((item) => ({
        ...item,
        card: normalizeCard(item.card),
      }));
    }
  } catch {
    // fallback
  }

  return [];
}

// ==================== QUESTION REVISION HISTORY ====================
const STORAGE_KEY_EDITS = 'hsa_question_edits_v1';

export async function saveQuestionEditsIDB(edits: QuestionEditHistory[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY_EDITS, JSON.stringify(edits));
    const db = await getDb();
    const tx = db.transaction('question_edits', 'readwrite');
    const store = tx.objectStore('question_edits');
    store.clear();
    for (const e of edits) {
      store.put(e);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save question edits to IDB:', err);
  }
}

export async function loadQuestionEditsIDB(): Promise<QuestionEditHistory[]> {
  try {
    const db = await getDb();
    const tx = db.transaction('question_edits', 'readonly');
    const store = tx.objectStore('question_edits');
    const req = store.getAll();

    const items = await new Promise<QuestionEditHistory[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as QuestionEditHistory[]);
      req.onerror = () => reject(req.error);
    });

    if (items && items.length > 0) return items;
  } catch (err) {
    // fallback
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_EDITS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }

  return [];
}

export async function addQuestionEditRecord(edit: QuestionEditHistory): Promise<void> {
  const current = await loadQuestionEditsIDB();
  const updated = [edit, ...current];
  await saveQuestionEditsIDB(updated);
}

// ==================== ANNOTATIONS & SCRATCHPAD ====================
export async function saveQuestionAnnotationIDB(data: any): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('question_annotations', 'readwrite');
    const store = tx.objectStore('question_annotations');

    // Nén delta cho mảng điểm vẽ trước khi lưu vào IndexedDB
    const payloadToSave = {
      ...data,
      strokes: encodeStrokesDelta(data.strokes || []),
      scratchpadPages: Array.isArray(data.scratchpadPages)
        ? data.scratchpadPages.map((p: any) => ({
            ...p,
            strokes: encodeStrokesDelta(p.strokes || []),
          }))
        : data.scratchpadPages,
      _isDeltaEncoded: true,
    };

    store.put(payloadToSave);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save question annotation to IDB:', err);
  }
}

export async function loadQuestionAnnotationIDB(key: string): Promise<any | null> {
  try {
    const db = await getDb();
    const tx = db.transaction('question_annotations', 'readonly');
    const store = tx.objectStore('question_annotations');
    const req = store.get(key);
    const result = await new Promise<any | null>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!result) return null;

    // Giải nén delta về toạ độ tuyệt đối nếu được nén delta
    if (result._isDeltaEncoded) {
      return {
        ...result,
        strokes: decodeStrokesDelta(result.strokes || []),
        scratchpadPages: Array.isArray(result.scratchpadPages)
          ? result.scratchpadPages.map((p: any) => ({
              ...p,
              strokes: decodeStrokesDelta(p.strokes || []),
            }))
          : result.scratchpadPages,
      };
    }

    return result;
  } catch (err) {
    return null;
  }
}

export async function saveGroupAnnotationIDB(data: any): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('group_annotations', 'readwrite');
    const store = tx.objectStore('group_annotations');

    const payloadToSave = {
      ...data,
      strokes: encodeStrokesDelta(data.strokes || []),
      _isDeltaEncoded: true,
    };

    store.put(payloadToSave);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save group annotation to IDB:', err);
  }
}

export async function loadGroupAnnotationIDB(key: string): Promise<any | null> {
  try {
    const db = await getDb();
    const tx = db.transaction('group_annotations', 'readonly');
    const store = tx.objectStore('group_annotations');
    const req = store.get(key);
    const result = await new Promise<any | null>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!result) return null;

    if (result._isDeltaEncoded) {
      return {
        ...result,
        strokes: decodeStrokesDelta(result.strokes || []),
      };
    }

    return result;
  } catch (err) {
    return null;
  }
}
