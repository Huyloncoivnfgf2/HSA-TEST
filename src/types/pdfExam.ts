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
  attemptKind?: PdfAttemptKind;
  examVersion?: number;
  answers: Record<number, string>;
  score: number;
  submittedAt: number;
  startedAt?: number;
  answerModes?: Record<number, PdfAnswerMode>;
  flaggedQuestions?: Record<number, boolean>;
  chapterLabels?: Record<number, string>;
  questionPages?: Record<number, number>;
  overriddenCorrect?: number[];
  // Ảnh chụp bộ đáp án đã dùng để chấm lượt này. Khi Owner sửa đáp án cho các
  // lượt mới, lượt cũ vẫn hiển thị/chấm theo ảnh chụp này trừ khi Owner quyết
  // định chấm lại và ảnh chụp được thay bằng bộ đáp án đã sửa.
  answerKeySnapshot?: Record<number, string>;
  acceptedAnswersSnapshot?: Record<number, string[]>;
  questionCountSnapshot?: number;
  startQuestionSnapshot?: number;
  originalScore?: number;
  regradedAt?: number;
  regradeCorrectionIds?: string[];
  // Đánh giá của Owner cho một lượt kiểm thử nội dung (Task 7.4). Chỉ lưu ở
  // lượt đó, không đi vào phân tích tiến độ học tập.
  contentTestEvaluation?: {
    verdict: 'ok' | 'needs_fix';
    note?: string;
    evaluatedAt: number;
  };
}

// Chế độ của một lượt làm bài PDF. `real` là luyện tập thật (tính vào tiến
// độ học tập); `content-test` là lượt Owner kiểm thử nội dung đề, không tính
// vào tiến độ. Lượt cũ chưa có cờ được hiểu là luyện tập thật.
export type PdfAttemptKind = 'real' | 'content-test';

export function getAttemptKind(attempt?: PdfExamAttempt | null): PdfAttemptKind {
  if (!attempt) return 'real';
  if (attempt.attemptKind) return attempt.attemptKind;
  return attempt.isContentTest ? 'content-test' : 'real';
}

export function isContentTestAttempt(attempt?: PdfExamAttempt | null): boolean {
  return getAttemptKind(attempt) === 'content-test';
}

export function getSessionAttemptKind(session?: PdfExamSession | null): PdfAttemptKind {
  if (!session) return 'real';
  if (session.attemptKind) return session.attemptKind;
  return session.isContentTest ? 'content-test' : 'real';
}

export function isContentTestSession(session?: PdfExamSession | null): boolean {
  return getSessionAttemptKind(session) === 'content-test';
}

export function attemptKindLabel(kind: PdfAttemptKind): string {
  return kind === 'content-test' ? 'Kiểm thử nội dung' : 'Luyện tập thật';
}

export function getAttemptAnswerKey(
  exam: PdfExam,
  attempt?: PdfExamAttempt | null
): Record<number, string> {
  return attempt?.answerKeySnapshot ?? exam.answerKey;
}

export function getAttemptAcceptedAnswers(
  exam: PdfExam,
  attempt?: PdfExamAttempt | null
): Record<number, string[]> {
  return attempt?.acceptedAnswersSnapshot ?? exam.acceptedAnswers ?? {};
}

export function getAttemptQuestionCount(
  exam: PdfExam,
  attempt?: PdfExamAttempt | null
): number {
  return attempt?.questionCountSnapshot ?? exam.questionCount;
}

export function getAttemptStartQuestion(
  exam: PdfExam,
  attempt?: PdfExamAttempt | null
): number {
  return attempt?.startQuestionSnapshot ?? exam.startQuestion ?? 1;
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
  attemptKind?: PdfAttemptKind;
  examVersion?: number;
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

export function getPdfExamReadiness(
  exam: PdfExam,
  options: { requireAnswerKey?: boolean } = {}
): PdfExamReadiness {
  const issues: string[] = [];
  const warnings: string[] = [];
  const startQuestion = exam.startQuestion ?? 1;
  const answeredCount = scoreablePdfQuestionCount(exam.answerKey, exam.questionCount, startQuestion);
  if (!exam.pdfBlob || exam.pdfBlob.size === 0) issues.push('Chưa có file PDF đề.');
  if (!Number.isSafeInteger(exam.questionCount) || exam.questionCount < 1) issues.push('Số câu chưa hợp lệ.');
  if (!Number.isSafeInteger(startQuestion) || startQuestion < 1) issues.push('Số câu bắt đầu chưa hợp lệ.');
  if (exam.pageStart !== undefined && (!Number.isSafeInteger(exam.pageStart) || exam.pageStart < 1)) issues.push('Trang bắt đầu chưa hợp lệ.');
  if (exam.pageEnd !== undefined && (!Number.isSafeInteger(exam.pageEnd) || exam.pageEnd < (exam.pageStart ?? 1))) issues.push('Khoảng trang chưa hợp lệ.');
  if (options.requireAnswerKey !== false && answeredCount < exam.questionCount) issues.push(`Đáp án chuẩn mới có ${answeredCount}/${exam.questionCount} câu.`);
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
