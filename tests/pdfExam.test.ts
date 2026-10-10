import { describe, expect, test } from 'bun:test';
import {
  getAttemptAnswerKey,
  getAttemptKind,
  getPdfExamReadiness,
  isContentTestAttempt,
  normalizePdfAnswer,
  parsePdfAnswerKey,
  pdfAnswersEqual,
  scorePdfAnswers,
  scoreablePdfQuestionCount,
  type PdfExam,
  type PdfExamAttempt,
} from '../src/types/pdfExam';

const baseAttempt: PdfExamAttempt = {
  id: 'attempt-1',
  mode: 'test',
  answers: {},
  score: 0,
  submittedAt: 1_700_000_000_000,
};

function examWith(overrides: Partial<PdfExam>): PdfExam {
  return {
    id: 'exam-1',
    title: 'Đề mẫu',
    subject: 'math',
    createdAt: 1_700_000_000_000,
    questionCount: 3,
    pdfFileName: 'de-mau.pdf',
    pdfBlob: new Blob(['pdf'], { type: 'application/pdf' }),
    answerKey: { 1: 'A', 2: 'B', 3: 'C' },
    attempts: [],
    scrollLocked: false,
    status: 'approved',
    version: 1,
    ...overrides,
  };
}

describe('normalizePdfAnswer / pdfAnswersEqual', () => {
  test('chuẩn hóa chữ hoa, khoảng trắng và dấu phẩy thập phân', () => {
    expect(normalizePdfAnswer(' 12,5 ')).toBe('12.5');
    expect(normalizePdfAnswer('a')).toBe('A');
  });

  test('số tương đương nhau thì bằng nhau, khác thì không', () => {
    expect(pdfAnswersEqual('12,5', '12.5')).toBe(true);
    expect(pdfAnswersEqual('0.50', '0.5')).toBe(true);
    expect(pdfAnswersEqual('A', 'a')).toBe(true);
    expect(pdfAnswersEqual('A', 'B')).toBe(false);
    expect(pdfAnswersEqual('', 'A')).toBe(false);
  });
});

describe('parsePdfAnswerKey', () => {
  test('đọc đáp án theo khoảng câu bắt đầu (đề gộp từ câu 101)', () => {
    const result = parsePdfAnswerKey('101.A 102.C 103.12,5', 3, 101);
    expect(result.answers).toEqual({ 101: 'A', 102: 'C', 103: '12,5' });
    expect(result.missing).toEqual([]);
    expect(result.outOfRange).toEqual([]);
  });

  test('báo câu trùng, ngoài khoảng và còn thiếu', () => {
    const result = parsePdfAnswerKey('1.A 1.B 9.D', 3, 1);
    expect(result.duplicates).toEqual([1]);
    expect(result.outOfRange).toEqual([9]);
    expect(result.missing).toEqual([2, 3]);
  });
});

describe('scorePdfAnswers', () => {
  test('chấm đúng khoảng câu của đề gộp và tính cả đáp án chấp nhận/phúc khảo', () => {
    const answers = { 101: 'a', 102: 'sai', 103: '4' };
    const key = { 101: 'A', 102: 'B', 103: 'C' };
    // 101 đúng, 102 sai, 103 được chấp nhận biến thể "4"
    expect(scorePdfAnswers(answers, key, 3, { 103: ['4'] }, [], 101)).toBe(2);
    // Phúc khảo thủ công tính đúng cho câu được duyệt
    expect(scorePdfAnswers(answers, key, 3, {}, [102], 101)).toBe(2);
  });

  test('đếm số câu có đáp án chuẩn để tính điểm tối đa', () => {
    expect(scoreablePdfQuestionCount({ 1: 'A', 3: 'C' }, 3, 1)).toBe(2);
  });
});

describe('chế độ lượt làm bài (Task 7.x)', () => {
  test('lượt cũ không có cờ được hiểu là Luyện tập thật', () => {
    expect(getAttemptKind(baseAttempt)).toBe('real');
    expect(isContentTestAttempt(baseAttempt)).toBe(false);
  });

  test('cờ cũ và attemptKind mới đều nhận ra lượt kiểm thử', () => {
    expect(isContentTestAttempt({ ...baseAttempt, isContentTest: true })).toBe(true);
    expect(isContentTestAttempt({ ...baseAttempt, attemptKind: 'content-test' })).toBe(true);
    expect(getAttemptKind({ ...baseAttempt, attemptKind: 'content-test', isContentTest: false })).toBe('content-test');
  });
});

describe('ảnh chụp đáp án khi chấm lại (Task 6.x/8.8)', () => {
  test('điểm của lượt cũ tính theo ảnh chụp, không theo đáp án hiện tại của đề', () => {
    const attempt: PdfExamAttempt = {
      ...baseAttempt,
      answers: { 1: 'A', 2: 'B', 3: 'C' },
      answerKeySnapshot: { 1: 'A', 2: 'B', 3: 'C' },
    };
    const examNow = examWith({ answerKey: { 1: 'D', 2: 'D', 3: 'D' } });
    const gradingKey = getAttemptAnswerKey(examNow, attempt);
    expect(gradingKey).toEqual({ 1: 'A', 2: 'B', 3: 'C' });
    expect(scorePdfAnswers(attempt.answers, gradingKey, 3, {}, [], 1)).toBe(3);
  });
});

describe('getPdfExamReadiness (cổng đề cho lượt mới)', () => {
  test('đề đã duyệt, đủ đáp án thì sẵn sàng', () => {
    expect(getPdfExamReadiness(examWith({})).readyForNewAttempt).toBe(true);
  });

  test('đề nháp chưa được dùng cho lượt thi mới', () => {
    const readiness = getPdfExamReadiness(examWith({ status: 'draft' }));
    expect(readiness.readyForNewAttempt).toBe(false);
    expect(readiness.issues.join(' ')).toContain('chưa được duyệt');
  });

  test('thiếu đáp án chuẩn thì chưa sẵn sàng khi yêu cầu đủ đáp án', () => {
    const readiness = getPdfExamReadiness(examWith({ answerKey: { 1: 'A' } }));
    expect(readiness.readyForNewAttempt).toBe(false);
    expect(readiness.answeredCount).toBe(1);
  });
});
