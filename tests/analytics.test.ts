import { beforeAll, describe, expect, test } from 'bun:test';
import type { ExamRecord } from '../src/types/analytics';

// analyticsService đọc dữ liệu qua userStorage (localStorage có tiền tố theo
// tài khoản). Test này thay localStorage bằng bộ nhớ tạm trước khi import.
const memory = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, String(value)); },
  removeItem: (key: string) => { memory.delete(key); },
  clear: () => memory.clear(),
  key: (index: number) => [...memory.keys()][index] ?? null,
  get length() { return memory.size; },
} as Storage;

let service: typeof import('../src/services/analyticsService');
let storage: typeof import('../src/services/userStorage');

function record(overrides: Partial<ExamRecord>): ExamRecord {
  return {
    id: `rec-${Math.random()}`,
    date: Date.now(),
    mode: 'single-subject',
    subjectScores: {
      math: { score: 0, maxScore: 0, correct: 0, total: 0 },
      literature: { score: 0, maxScore: 0, correct: 0, total: 0 },
      science: { score: 0, maxScore: 0, correct: 0, total: 0 },
    },
    totalScore: 0,
    totalMaxScore: 0,
    timeSpentSeconds: 600,
    details: [],
    ...overrides,
  };
}

function mathRecord(id: string, date: number, score: number, correctFlags: boolean[]): ExamRecord {
  return record({
    id,
    date,
    pdfExamId: 'exam-1',
    pdfExamTitle: 'Đề mẫu',
    pdfSubject: 'math',
    subjectScores: {
      math: { score, maxScore: correctFlags.length, correct: score, total: correctFlags.length },
      literature: { score: 0, maxScore: 0, correct: 0, total: 0 },
      science: { score: 0, maxScore: 0, correct: 0, total: 0 },
    },
    totalScore: score,
    totalMaxScore: correctFlags.length,
    details: correctFlags.map((isCorrect, idx) => ({
      questionId: `pdf:exam-1:${idx + 1}`,
      subject: 'math' as const,
      subTopic: idx < 2 ? 'Đại số' : 'Tổng hợp',
      userAnswer: isCorrect ? 'A' : 'B',
      correctAnswer: 'A',
      isCorrect,
      timeSpentSeconds: 0,
      pdfExamId: 'exam-1',
      pdfExamTitle: 'Đề mẫu',
      pdfPageNumber: 1,
    })),
  });
}

beforeAll(async () => {
  storage = await import('../src/services/userStorage');
  storage.setStorageUserId('test-user');
  service = await import('../src/services/analyticsService');
  service.saveExamHistory([]);
  service.saveMistakeNotebook([]);
});

describe('tổng hợp Dashboard (Task 8.1/8.3/8.4)', () => {
  test('điểm gần nhất lấy theo ngày nộp mới nhất, tỉ lệ đúng tính thật, độ tin cậy có căn cứ', () => {
    const now = Date.now();
    service.saveExamHistory([
      mathRecord('new', now, 2, [true, true, false]),
      mathRecord('old', now - 86400000, 1, [true, false, false]),
    ]);
    const summary = service.getAnalyticsSummary();
    expect(summary.latestExamScores.math).toBe(2);
    expect(summary.recentScoreEntries.math.map((e) => e.score)).toEqual([1, 2]);
    expect(summary.practiceAccuracy.math.totalAnswered).toBe(6);
    expect(summary.practiceAccuracy.math.accuracy).toBe(50);
    expect(summary.reliability.math.examsTaken).toBe(2);
    expect(summary.subjectTimeStats.math.avgSecondsPerQuestion).toBe(200);
  });

  test('phần chưa có bài thì độ tin cậy báo chưa có dữ liệu', () => {
    const summary = service.getAnalyticsSummary();
    expect(summary.reliability.science.level).toBe('none');
    expect(summary.goalRisks.science.level).toBe('unknown');
  });
});

describe('thống kê chuyên đề (Task 8.2/8.3)', () => {
  test('nhóm Tổng hợp không thành chuyên đề yếu; thời gian từng câu không bị bịa', () => {
    const stats = service.calculateTopicStats('math');
    const tongHop = stats.find((s) => s.topic === 'Tổng hợp');
    expect(tongHop?.avgTimeSeconds).toBeNull();
    const weak = service.getWeakestTopics('math');
    expect(weak.every((s) => s.topic !== 'Tổng hợp')).toBe(true);
  });

  test('độ phủ phân loại đếm đúng câu có nhãn', () => {
    const coverage = service.calculateClassificationCoverage('math');
    expect(coverage.totalQuestions).toBe(6);
    expect(coverage.classifiedQuestions).toBe(4);
    expect(coverage.coveragePct).toBe(67);
  });
});

describe('chấm lại không làm xáo thứ tự lịch sử (Task 8.8)', () => {
  test('thay kết quả của lượt cũ không biến nó thành bài gần nhất', () => {
    const now = Date.now();
    const older = mathRecord('rec-old', now - 86400000, 1, [true, false, false]);
    const newer = mathRecord('rec-new', now, 2, [true, true, false]);
    service.saveExamHistory([newer, older]);
    const regraded = { ...older, totalScore: 3, subjectScores: { ...older.subjectScores, math: { score: 3, maxScore: 3, correct: 3, total: 3 } }, regradedAt: now };
    service.replacePdfExamResult(regraded);
    const history = service.getExamHistory();
    expect(history[0].id).toBe('rec-new');
    const summary = service.getAnalyticsSummary();
    expect(summary.latestExamScores.math).toBe(2);
  });
});
