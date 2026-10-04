import { SubjectType, ScienceSubSubject, Question } from './hsa';

export type ErrorClassification = 'sai kiến thức' | 'làm quá nhanh' | 'hết giờ chưa làm' | 'bỏ trống';

export interface UserGoals {
  targetMath: number; // e.g. 40
  targetLiterature: number; // e.g. 38
  targetScience: number; // e.g. 37
  targetTotal: number; // e.g. 115
  examDate?: string; // YYYY-MM-DD
  maxScorePerSubject: number; // Default 50
  scaleFactor: number; // Default 1 (1 question = 1 point)
  dailyQuestionGoal: number; // e.g. 25 questions per day
}

export const DEFAULT_GOALS: UserGoals = {
  targetMath: 38,
  targetLiterature: 37,
  targetScience: 35,
  targetTotal: 110,
  examDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  maxScorePerSubject: 50,
  scaleFactor: 1,
  dailyQuestionGoal: 20,
};

export interface QuestionAttemptDetail {
  questionId: string;
  subject: SubjectType;
  subSubject?: ScienceSubSubject;
  subTopic: string;
  userAnswer?: number | string;
  correctAnswer: number | string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  errorType?: ErrorClassification;
  isStarred?: boolean;
}

export interface ExamRecord {
  id: string;
  date: number; // timestamp
  mode: 'single-subject' | 'full-hsa';
  subjectScores: Record<SubjectType, { score: number; maxScore: number; correct: number; total: number }>;
  totalScore: number;
  totalMaxScore: number;
  timeSpentSeconds: number;
  details: QuestionAttemptDetail[];
  aiFeedback?: string;
}

export interface TopicStat {
  topic: string;
  subject: SubjectType;
  subSubject?: ScienceSubSubject;
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number; // 0 to 100
  avgTimeSeconds: number;
  trend: 'up' | 'down' | 'stable';
  isInsufficientData: boolean; // true if totalAnswered < 5
}

export interface MistakeEntry {
  questionId: string;
  subject: SubjectType;
  subSubject?: ScienceSubSubject;
  subTopic: string;
  firstWrongAt: number;
  lastWrongAt: number;
  wrongCount: number;
  correctStreak: number; // Removed from notebook when reaches 2
  lastErrorType?: ErrorClassification;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  questionsCount: number;
  examCount: number;
}

export interface AnalyticsSummary {
  goals: UserGoals;
  latestExamScores: Record<SubjectType, number | null>;
  fiveExamAverage: Record<SubjectType, number | null>;
  scoreTrends: Record<SubjectType, 'up' | 'down' | 'stable'>;
  recentScoreHistory: Record<SubjectType, number[]>; // up to 10 recent scores for sparkline
  practiceAccuracy: Record<SubjectType, { accuracy: number; totalAnswered: number }>;
  streakDays: number;
  todayQuestionsAnswered: number;
  totalExamsTaken: number;
}
