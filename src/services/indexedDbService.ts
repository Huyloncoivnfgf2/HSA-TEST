import { Question, ExamSession, ExamSet, QuestionEditHistory } from '../types/hsa';
import { ExamRecord } from '../types/analytics';
import { FSRSCardData, normalizeCard } from './fsrsService';
import { INITIAL_QUESTIONS } from '../data/sampleQuestions';
import { encodeStrokesDelta, decodeStrokesDelta } from './annotationService';

const DB_NAME = 'HSA_MASTER_DB_V4';
const DB_VERSION = 2;

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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
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

