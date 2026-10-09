import type { PdfExam, PdfExamStatus, PdfSubject } from '../types/pdfExam';
import { deletePdfExam, loadPdfExams, savePdfExam } from './indexedDbService';
import { supabase, type CloudExamRecord } from './supabaseClient';
import { userStorage as localStorage } from './userStorage';

const sectionForSubject: Record<PdfSubject, CloudExamRecord['section']> = {
  math: 'dinh_luong',
  literature: 'dinh_tinh',
  science: 'khoa_hoc',
};
const subjectForSection: Record<CloudExamRecord['section'], PdfSubject> = {
  dinh_luong: 'math',
  dinh_tinh: 'literature',
  khoa_hoc: 'science',
};

// Storage object keys must be fixed ASCII names. Original file names can
// contain Vietnamese diacritics or spaces, which Supabase Storage rejects
// with "Invalid key"; the friendly name lives in exams.title instead.
function cloudPdfPath(examId: string): string {
  return `${examId}/exam.pdf`;
}

function cloudSolutionPath(exam: PdfExam): string {
  const solutionFileName = exam.solutionFileName ?? '';
  const rawExtension = solutionFileName.includes('.')
    ? solutionFileName.split('.').pop() ?? ''
    : '';
  const cleanExtension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, '');
  const mimeSubtype = exam.solutionBlob?.type.split('/')[1] ?? '';
  const mimeExtension = mimeSubtype === 'svg+xml'
    ? 'svg'
    : mimeSubtype.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${exam.id}/solution.${cleanExtension || mimeExtension || 'pdf'}`;
}

const EXAM_SELECT_WITH_MANAGEMENT =
  'id,title,section,question_count,pdf_path,original_filename,file_id,page_start,page_end,start_question,status,version,created_at,updated_at';
const EXAM_SELECT_LEGACY = 'id,title,section,question_count,pdf_path,created_at,updated_at';

function isMissingManagementColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /original_filename|file_id|page_start|page_end|start_question|status|version|exam_revisions|schema cache|column/i.test(message);
}

async function logExamRevision(examId: string, action: string, details: Record<string, unknown> = {}): Promise<void> {
  if (!supabase) return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('exam_revisions').insert({
      exam_id: examId,
      changed_by: userData.user?.id ?? null,
      action,
      details,
    });
    if (error && !isMissingManagementColumn(error)) console.warn('Could not write exam revision:', error.message);
  } catch (revisionError) {
    console.warn('Could not write exam revision:', revisionError);
  }
}

export async function loadCloudExamLibrary(isAdmin = false): Promise<PdfExam[]> {
  if (!supabase) throw new Error('Supabase is not configured');
  let recordsResponse = await supabase
    .from('exams')
    .select(EXAM_SELECT_WITH_MANAGEMENT)
    .order('created_at', { ascending: false });
  if (recordsResponse.error && isMissingManagementColumn(recordsResponse.error)) {
    recordsResponse = await supabase
      .from('exams')
      .select(EXAM_SELECT_LEGACY)
      .order('created_at', { ascending: false });
  }
  const { data: records, error } = recordsResponse;
  if (error) throw error;
  const localExams = await loadPdfExams();
  const localById = new Map(localExams.map((exam) => [exam.id, exam]));
  const result: PdfExam[] = [];
  for (const record of (records ?? []) as CloudExamRecord[]) {
    if (record.status === 'archived') continue;
    const local = localById.get(record.id);
    const cloudUpdatedAt = Date.parse(record.updated_at);
    let pdfBlob = local?.pdfBlob;
    if (!pdfBlob || (local?.updatedAt ?? 0) < cloudUpdatedAt) {
      const { data: signed, error: signedError } = await supabase.storage
        .from('exam-files').createSignedUrl(record.pdf_path, 3600);
      if (signedError) throw signedError;
      const response = await fetch(signed.signedUrl);
      if (!response.ok) throw new Error(`Không thể tải đề PDF "${record.title}".`);
      pdfBlob = await response.blob();
    }

    let solutionBlob = local?.solutionBlob;
    const attempts = local?.attempts?.length ? local.attempts : parseAttemptCache(record.id);
    const exam: PdfExam = {
      id: record.id,
      title: record.title,
      subject: subjectForSection[record.section],
      createdAt: Date.parse(record.created_at),
      updatedAt: cloudUpdatedAt,
      questionCount: record.question_count,
      pdfFileName: local?.pdfFileName ?? record.pdf_path.split('/').at(-1) ?? `${record.id}.pdf`,
      originalFileName: record.original_filename ?? local?.originalFileName ?? local?.pdfFileName,
      fileId: record.file_id ?? record.pdf_path,
      pageStart: record.page_start ?? local?.pageStart,
      pageEnd: record.page_end ?? local?.pageEnd,
      startQuestion: record.start_question ?? local?.startQuestion ?? 1,
      status: record.status ?? local?.status ?? 'approved',
      version: record.version ?? local?.version ?? 1,
      pdfBlob,
      solutionFileName: local?.solutionFileName,
      solutionPath: isAdmin || attempts.length ? local?.solutionPath : undefined,
      solutionBlob: isAdmin || attempts.length ? solutionBlob : undefined,
      answerKey: isAdmin
        ? local?.answerKey ?? {}
        : attempts.length ? local?.answerKey ?? {} : {},
      acceptedAnswers: local?.acceptedAnswers,
      attempts,
      bestScore: local?.bestScore ?? Math.max(0, ...attempts.map((attempt) => attempt.score)),
      scrollLocked: local?.scrollLocked ?? false,
    };
    await savePdfExam(exam);
    result.push(exam);
  }
  if (isAdmin) {
    const cloudIds = new Set(result.map((exam) => exam.id));
    result.push(...localExams.filter((exam) => !cloudIds.has(exam.id)));
  }
  return result;
}

function parseAttemptCache(examId: string): PdfExam['attempts'] {
  try {
    const raw = localStorage.getItem(`__cloud:pdf_attempts:${examId}`);
    if (!raw) return [];
    const value = JSON.parse(raw) as { attempts?: PdfExam['attempts'] };
    return value.attempts ?? [];
  } catch (error) {
    console.error('Could not read synchronized PDF attempts:', error);
    return [];
  }
}

export async function saveCloudAnswerKey(exam: PdfExam): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.rpc('save_exam_key', {
    exam_id: exam.id,
    answers: exam.answerKey,
  });
  if (error) throw error;
  const nextVersion = (exam.version ?? 1) + 1;
  const { error: versionError } = await supabase.from('exams').update({ version: nextVersion }).eq('id', exam.id);
  if (versionError && !isMissingManagementColumn(versionError)) throw versionError;
  await logExamRevision(exam.id, 'answer_key_updated', { version: nextVersion, answeredCount: Object.keys(exam.answerKey).length });
  await savePdfExam({ ...exam, version: versionError ? exam.version : nextVersion });
}

export async function updateCloudExamMetadata(exam: PdfExam): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  // Do not rewrite pdf_path/solution_path here: renaming metadata must keep
  // pointing at the object that is already stored for this exam.
  const nextVersion = (exam.version ?? 1) + 1;
  const managementUpdate = {
    title: exam.title,
    section: sectionForSubject[exam.subject],
    question_count: exam.questionCount,
    original_filename: exam.originalFileName ?? exam.pdfFileName,
    file_id: exam.fileId ?? null,
    page_start: exam.pageStart ?? null,
    page_end: exam.pageEnd ?? null,
    start_question: exam.startQuestion ?? 1,
    status: exam.status ?? 'draft',
    version: nextVersion,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('exams').update(managementUpdate).eq('id', exam.id);
  if (error) {
    if (!isMissingManagementColumn(error)) throw error;
    const { error: legacyError } = await supabase.from('exams').update({
      title: exam.title,
      section: sectionForSubject[exam.subject],
      question_count: exam.questionCount,
      updated_at: new Date().toISOString(),
    }).eq('id', exam.id);
    if (legacyError) throw legacyError;
    return;
  }
  await logExamRevision(exam.id, 'metadata_updated', {
    version: nextVersion,
    status: exam.status ?? 'draft',
    pageStart: exam.pageStart ?? null,
    pageEnd: exam.pageEnd ?? null,
    startQuestion: exam.startQuestion ?? 1,
  });
}

export async function submitCloudExam(examId: string, answers: Record<number, string>): Promise<{
  answers: Record<number, string>;
  solutionPath: string | null;
}> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('submit_exam', {
    exam_id: examId,
    answers,
  });
  if (error) throw error;
  const response = data as { answers: Record<number, string>; solution_path: string | null };
  return { answers: response.answers, solutionPath: response.solution_path };
}

export async function getCloudSolutionUrl(path: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.storage.from('exam-files').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadLocalExams(
  exams: PdfExam[],
  onProgress: (examId: string, status: 'uploading' | 'done' | 'error', message?: string) => void
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  const failures: string[] = [];
  for (const exam of exams) {
    onProgress(exam.id, 'uploading');
    try {
      const pdfPath = cloudPdfPath(exam.id);
      const { error: pdfError } = await supabase.storage.from('exam-files').upload(pdfPath, exam.pdfBlob, {
        upsert: true,
        contentType: 'application/pdf',
      });
      if (pdfError) throw pdfError;
      let solutionPath: string | null = null;
      if (exam.solutionBlob && exam.solutionFileName) {
        solutionPath = cloudSolutionPath(exam);
        const { error: solutionError } = await supabase.storage.from('exam-files').upload(solutionPath, exam.solutionBlob, {
          upsert: true,
          contentType: exam.solutionBlob.type || 'application/octet-stream',
        });
        if (solutionError) throw solutionError;
      }
      const managementPayload = {
        id: exam.id,
        title: exam.title,
        section: sectionForSubject[exam.subject],
        question_count: exam.questionCount,
        pdf_path: pdfPath,
        solution_path: solutionPath,
        original_filename: exam.originalFileName ?? exam.pdfFileName,
        file_id: exam.fileId ?? pdfPath,
        page_start: exam.pageStart ?? null,
        page_end: exam.pageEnd ?? null,
        start_question: exam.startQuestion ?? 1,
        status: exam.status ?? 'draft',
        version: exam.version ?? 1,
      };
      let { error: examError } = await supabase.from('exams').upsert(managementPayload);
      if (examError && isMissingManagementColumn(examError)) {
        ({ error: examError } = await supabase.from('exams').upsert({
          id: exam.id,
          title: exam.title,
          section: sectionForSubject[exam.subject],
          question_count: exam.questionCount,
          pdf_path: pdfPath,
          solution_path: solutionPath,
        }));
      }
      if (examError) throw examError;
      await logExamRevision(exam.id, 'exam_uploaded', { status: exam.status ?? 'draft', version: exam.version ?? 1 });
      if (Object.keys(exam.answerKey).length) await saveCloudAnswerKey(exam);
      await savePdfExam({ ...exam, fileId: exam.fileId ?? pdfPath, status: exam.status ?? 'draft', version: exam.version ?? 1, updatedAt: Date.now(), ...(solutionPath ? { solutionPath } : {}) });
      onProgress(exam.id, 'done');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi tải đề lên cloud';
      failures.push(`${exam.title}: ${message}`);
      onProgress(exam.id, 'error', message);
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
}

export async function deleteCloudExam(examId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  // Giai đoạn 3.8: ẩn mềm đề thay vì xóa cứng, để bài nộp và lịch sử không bị
  // xóa dây chuyền. File gốc vẫn giữ trong kho cho tới khi có task dọn riêng.
  const { error } = await supabase.from('exams').update({ status: 'archived' as PdfExamStatus }).eq('id', examId);
  if (error) {
    if (!isMissingManagementColumn(error)) throw error;
    const { error: legacyError } = await supabase.from('exams').delete().eq('id', examId);
    if (legacyError) throw legacyError;
  } else {
    await logExamRevision(examId, 'exam_archived', {});
  }
  await deletePdfExam(examId);
}
