import type { DrawingStroke, ScratchpadPageData } from './hsa';

export type PdfSubject = 'math' | 'literature' | 'science';
export type PdfExamMode = 'test' | 'study' | 'review';
export type PdfAnswerMode = 'choice' | 'fill';
export type PdfAnnotationTool = 'pen' | 'highlight' | 'underline';
export type PdfExamStatus = 'draft' | 'verified' | 'approved' | 'archived';

export interface PdfAnnotationStroke extends DrawingStroke {
  tool: PdfAnnotationTool;
}

export interface PdfPageAnnotations {
  key: string;
  examId: string;
  pageNumber: number;
  strokes: PdfAnnotationStroke[];
}

export interface PdfExamScratchpad {
  examId: string;
  questionPages: Record<number, ScratchpadPageData[]>;
  globalPages: ScratchpadPageData[];
  currentQuestionPages: Record<number, number>;
  currentGlobalPage: number;
}

export interface PdfExamAttempt {
  id: string;
  mode: PdfExamMode;
  isContentTest?: boolean;
  answers: Record<number, string>;
  score: number;
  submittedAt: number;
  startedAt?: number;
  answerModes?: Record<number, PdfAnswerMode>;
  flaggedQuestions?: Record<number, boolean>;
  chapterLabels?: Record<number, string>;
  questionPages?: Record<number, number>;
  overriddenCorrect?: number[];
}

export interface PdfExam {
  id: string;
  title: string;
  subject: PdfSubject;
  createdAt: number;
  updatedAt?: number;
  questionCount: number;
  pdfFileName: string;
  pdfBlob: Blob;
  originalFileName?: string;
  fileId?: string;
  pageStart?: number;
  pageEnd?: number;
  startQuestion?: number;
  status?: PdfExamStatus;
  version?: number;
  approvedAt?: number;
  solutionFileName?: string;
  solutionBlob?: Blob;
  solutionPath?: string;
  answerKey: Record<number, string>;
  acceptedAnswers?: Record<number, string[]>;
  attempts: PdfExamAttempt[];
  bestScore?: number;
  scrollLocked: boolean;
}

export interface PdfExamSession {
  id: 'active';
  examId: string;
  attemptId?: string;
  mode: PdfExamMode;
  isContentTest?: boolean;
  answers: Record<number, string>;
  answerModes: Record<number, PdfAnswerMode>;
  flaggedQuestions: Record<number, boolean>;
  chapterLabels: Record<number, string>;
  questionPages: Record<number, number>;
  startedAt: number;
  endsAt: number | null;
  submitted: boolean;
  score?: number;
  submittedAt?: number;
}

export interface PdfExamBackup {
  format: 'hsa-pdf-backup';
  version: 1;
  createdAt: number;
  localStorage: Record<string, string>;
  indexedDb: Record<string, unknown[]>;
}

export interface PdfAnswerKeyParseResult {
  answers: Record<number, string>;
  duplicates: number[];
  outOfRange: number[];
  missing: number[];
}

export function pdfQuestionNumbers(questionCount: number, startQuestion = 1): number[] {
  const start = Number.isSafeInteger(startQuestion) && startQuestion > 0 ? startQuestion : 1;
  const count = Number.isSafeInteger(questionCount) && questionCount > 0 ? questionCount : 0;
  return Array.from({ length: count }, (_, index) => start + index);
}

export function parsePdfAnswerKey(text: string, questionCount: number, startQuestion = 1): PdfAnswerKeyParseResult {
  const questionNumbers = pdfQuestionNumbers(questionCount, startQuestion);
  const firstQuestion = questionNumbers[0] ?? 1;
  const lastQuestion = questionNumbers.at(-1) ?? firstQuestion;
  const matches = [...text.matchAll(/(\d{1,6})\s*[.):\-]\s*([A-D]|[-+]?\d+(?:[.,]\d+)?)/gi)];
  const answers: Record<number, string> = {};
  const duplicates = new Set<number>();
  const outOfRange = new Set<number>();
  for (const match of matches) {
    const questionNumber = Number(match[1]);
    if (questionNumber < firstQuestion || questionNumber > lastQuestion) {
      outOfRange.add(questionNumber);
      continue;
    }
    if (answers[questionNumber] !== undefined) duplicates.add(questionNumber);
    answers[questionNumber] = match[2].trim().toUpperCase();
  }
  const missing = questionNumbers.filter((number) => !answers[number]);
  return { answers, duplicates: [...duplicates], outOfRange: [...outOfRange], missing };
}

export function normalizePdfAnswer(answer: string | undefined): string {
  return (answer ?? '').trim().toUpperCase().replace(/,/g, '.').replace(/\s+/g, '');
}

export function pdfAnswersEqual(first: string | undefined, second: string | undefined): boolean {
  const normalizedFirst = normalizePdfAnswer(first);
  const normalizedSecond = normalizePdfAnswer(second);
  if (!normalizedFirst || !normalizedSecond) return false;
  const firstNumber = Number(normalizedFirst);
  const secondNumber = Number(normalizedSecond);
  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) return firstNumber === secondNumber;
  return normalizedFirst === normalizedSecond;
}

export function scorePdfAnswers(
  answers: Record<number, string>,
  answerKey: Record<number, string>,
  questionCount: number,
  acceptedAnswers: Record<number, string[]> = {},
  overriddenCorrect: number[] = [],
  startQuestion = 1
): number {
  let score = 0;
  for (const questionNumber of pdfQuestionNumbers(questionCount, startQuestion)) {
    const answer = answers[questionNumber];
    const correctAnswer = answerKey[questionNumber];
    const accepted = (acceptedAnswers[questionNumber] ?? []).map(normalizePdfAnswer);
    if (
      answer &&
      (overriddenCorrect.includes(questionNumber) ||
        (correctAnswer && (
          pdfAnswersEqual(answer, correctAnswer) ||
          accepted.some((variant) => pdfAnswersEqual(answer, variant))
        )))
    ) score++;
  }
  return score;
}

export function scoreablePdfQuestionCount(answerKey: Record<number, string>, questionCount: number, startQuestion = 1): number {
  let scoreable = 0;
  for (const questionNumber of pdfQuestionNumbers(questionCount, startQuestion)) {
    if (normalizePdfAnswer(answerKey[questionNumber])) scoreable++;
  }
  return scoreable;
}

export interface PdfExamReadiness {
  readyForNewAttempt: boolean;
  issues: string[];
  warnings: string[];
  answeredCount: number;
}

export function getPdfExamReadiness(exam: PdfExam): PdfExamReadiness {
  const issues: string[] = [];
  const warnings: string[] = [];
  const startQuestion = exam.startQuestion ?? 1;
  const answeredCount = scoreablePdfQuestionCount(exam.answerKey, exam.questionCount, startQuestion);
  if (!exam.pdfBlob || exam.pdfBlob.size === 0) issues.push('Chưa có file PDF đề.');
  if (!Number.isSafeInteger(exam.questionCount) || exam.questionCount < 1) issues.push('Số câu chưa hợp lệ.');
  if (!Number.isSafeInteger(startQuestion) || startQuestion < 1) issues.push('Số câu bắt đầu chưa hợp lệ.');
  if (exam.pageStart !== undefined && (!Number.isSafeInteger(exam.pageStart) || exam.pageStart < 1)) issues.push('Trang bắt đầu chưa hợp lệ.');
  if (exam.pageEnd !== undefined && (!Number.isSafeInteger(exam.pageEnd) || exam.pageEnd < (exam.pageStart ?? 1))) issues.push('Khoảng trang chưa hợp lệ.');
  if (answeredCount < exam.questionCount) issues.push(`Đáp án chuẩn mới có ${answeredCount}/${exam.questionCount} câu.`);
  if ((exam.status ?? 'approved') !== 'approved') issues.push('Đề chưa được duyệt cho lượt thi mới.');
  if (!exam.solutionBlob && !exam.solutionPath) warnings.push('Chưa có lời giải; người học vẫn làm bài được nhưng không xem được lời giải sau khi nộp.');
  return { readyForNewAttempt: issues.length === 0, issues, warnings, answeredCount };
}

export function isPdfAnswerCorrect(
  questionNumber: number,
  answer: string | undefined,
  answerKey: Record<number, string>,
  acceptedAnswers: Record<number, string[]> = [],
  overriddenCorrect: number[] = []
): boolean | null {
  const normalizedAnswer = normalizePdfAnswer(answer);
  const normalizedKey = normalizePdfAnswer(answerKey[questionNumber]);
  if (!normalizedKey) return null;
  return overriddenCorrect.includes(questionNumber) ||
    (!!normalizedAnswer && (
      pdfAnswersEqual(answer, answerKey[questionNumber]) ||
      (acceptedAnswers[questionNumber] ?? []).some((accepted) => pdfAnswersEqual(answer, accepted))
    ));
}
