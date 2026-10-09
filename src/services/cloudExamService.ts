import type { PdfExam, PdfSubject } from '../types/pdfExam';
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

export async function loadCloudExamLibrary(isAdmin = false): Promise<PdfExam[]> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data: records, error } = await supabase
    .from('exams')
    .select('id,title,section,question_count,pdf_path,created_at,updated_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const localExams = await loadPdfExams();
  const localById = new Map(localExams.map((exam) => [exam.id, exam]));
  const result: PdfExam[] = [];
  for (const record of (records ?? []) as CloudExamRecord[]) {
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
      pdfFileName: record.pdf_path.split('/').at(-1) ?? `${record.id}.pdf`,
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
  await savePdfExam(exam);
}

export async function updateCloudExamMetadata(exam: PdfExam): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  const pdfPath = `${exam.id}/${exam.pdfFileName}`;
  const solutionPath = exam.solutionBlob && exam.solutionFileName
    ? `${exam.id}/${exam.solutionFileName}`
    : exam.solutionPath ?? null;
  const { error } = await supabase.from('exams').update({
    title: exam.title,
    section: sectionForSubject[exam.subject],
    question_count: exam.questionCount,
    pdf_path: pdfPath,
    solution_path: solutionPath,
    updated_at: new Date().toISOString(),
  }).eq('id', exam.id);
  if (error) throw error;
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
      const pdfPath = `${exam.id}/${exam.pdfFileName}`;
      const { error: pdfError } = await supabase.storage.from('exam-files').upload(pdfPath, exam.pdfBlob, {
        upsert: true,
        contentType: 'application/pdf',
      });
      if (pdfError) throw pdfError;
      let solutionPath: string | null = null;
      if (exam.solutionBlob && exam.solutionFileName) {
        solutionPath = `${exam.id}/${exam.solutionFileName}`;
        const { error: solutionError } = await supabase.storage.from('exam-files').upload(solutionPath, exam.solutionBlob, {
          upsert: true,
          contentType: exam.solutionBlob.type || 'application/octet-stream',
        });
        if (solutionError) throw solutionError;
      }
      const { error: examError } = await supabase.from('exams').upsert({
        id: exam.id,
        title: exam.title,
        section: sectionForSubject[exam.subject],
        question_count: exam.questionCount,
        pdf_path: pdfPath,
        solution_path: solutionPath,
      });
      if (examError) throw examError;
      if (Object.keys(exam.answerKey).length) await saveCloudAnswerKey(exam);
      await savePdfExam({ ...exam, updatedAt: Date.now() });
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
  const { data: files, error: listError } = await supabase.storage.from('exam-files').list(examId);
  if (listError) throw listError;
  if (files?.length) {
    const { error: removeError } = await supabase.storage
      .from('exam-files').remove(files.map((file) => `${examId}/${file.name}`));
    if (removeError) throw removeError;
  }
  const { error } = await supabase.from('exams').delete().eq('id', examId);
  if (error) throw error;
  await deletePdfExam(examId);
}
