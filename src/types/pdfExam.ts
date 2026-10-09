import type { DrawingStroke, ScratchpadPageData } from './hsa';

export type PdfSubject = 'math' | 'literature' | 'science';
export type PdfExamMode = 'test' | 'study' | 'review';
export type PdfAnswerMode = 'choice' | 'fill';
export type PdfAnnotationTool = 'pen' | 'highlight' | 'underline';

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

export function parsePdfAnswerKey(text: string, questionCount: number): PdfAnswerKeyParseResult {
  const matches = [...text.matchAll(/(\d{1,6})\s*[.):\-]\s*([A-D]|[-+]?\d+(?:[.,]\d+)?)/gi)];
  const answers: Record<number, string> = {};
  const duplicates = new Set<number>();
  const outOfRange = new Set<number>();
  for (const match of matches) {
    const questionNumber = Number(match[1]);
    if (questionNumber < 1 || questionNumber > questionCount) {
      outOfRange.add(questionNumber);
      continue;
    }
    if (answers[questionNumber] !== undefined) duplicates.add(questionNumber);
    answers[questionNumber] = match[2].trim().toUpperCase();
  }
  const missing = Array.from({ length: questionCount }, (_, index) => index + 1)
    .filter((number) => !answers[number]);
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
  overriddenCorrect: number[] = []
): number {
  let score = 0;
  for (let questionNumber = 1; questionNumber <= questionCount; questionNumber++) {
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

export function scoreablePdfQuestionCount(answerKey: Record<number, string>, questionCount: number): number {
  let scoreable = 0;
  for (let questionNumber = 1; questionNumber <= questionCount; questionNumber++) {
    if (normalizePdfAnswer(answerKey[questionNumber])) scoreable++;
  }
  return scoreable;
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
