import { SubjectType, Question } from '../types/hsa';
import {
  UserGoals,
  DEFAULT_GOALS,
  ExamRecord,
  MistakeEntry,
  TopicStat,
  AnalyticsSummary,
  DailyActivity,
  ErrorClassification,
} from '../types/analytics';
import { userStorage as localStorage } from './userStorage';

const STORAGE_KEYS = {
  GOALS: 'hsa_user_goals_v2',
  EXAM_HISTORY: 'hsa_exam_history_v2',
  MISTAKES: 'hsa_mistakes_notebook_v2',
  DAILY_ACTIVITIES: 'hsa_daily_activities_v2',
};

// ==================== GOALS ====================
export function getUserGoals(): UserGoals {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (!raw) return DEFAULT_GOALS;
    return { ...DEFAULT_GOALS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load user goals:', err);
    return DEFAULT_GOALS;
  }
}

export function saveUserGoals(goals: UserGoals): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  } catch (err) {
    console.error('Failed to save user goals:', err);
  }
}

// ==================== EXAM HISTORY ====================
export function getExamHistory(): ExamRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw) as ExamRecord[];
  } catch (err) {
    console.error('Failed to load exam history:', err);
    return [];
  }
}

export function saveExamHistory(history: ExamRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save exam history:', err);
  }
}

export function recordExamResult(record: ExamRecord): ExamRecord[] {
  const history = getExamHistory();
  const updated = [record, ...history];
  saveExamHistory(updated);

  // Update daily activity
  incrementDailyActivity(record.details.length, 1);

  // Automatically update mistake notebook for all questions in this exam
  record.details.forEach((detail) => {
    updateMistakeRecord(
      detail.questionId,
      detail.subject,
      detail.subSubject,
      detail.subTopic,
      detail.isCorrect,
      detail.errorType,
      detail.pdfExamId
        ? {
            pdfExamId: detail.pdfExamId,
            pdfExamTitle: detail.pdfExamTitle ?? '',
            pdfPageNumber: detail.pdfPageNumber ?? 1,
          }
        : undefined
    );
  });

  return updated;
}

export function replacePdfExamResult(record: ExamRecord): ExamRecord[] {
  if (!record.pdfExamId) throw new Error('A PDF exam id is required to update a PDF result.');
  const history = getExamHistory();
  const updated = [record, ...history.filter((item) => item.id !== record.id)];
  saveExamHistory(updated);

  saveMistakeNotebook(getMistakeNotebook().filter((entry) => entry.pdfExamId !== record.pdfExamId));
  updated
    .filter((item) => item.pdfExamId === record.pdfExamId)
    .sort((first, second) => first.date - second.date)
    .forEach((examRecord) => {
      examRecord.details.forEach((detail) => {
        updateMistakeRecord(
          detail.questionId,
          detail.subject,
          detail.subSubject,
          detail.subTopic,
          detail.isCorrect,
          detail.errorType,
          {
            pdfExamId: record.pdfExamId!,
            pdfExamTitle: record.pdfExamTitle ?? '',
            pdfPageNumber: detail.pdfPageNumber ?? 1,
          }
        );
      });
  });
  return updated;
}

// ==================== MISTAKE NOTEBOOK ====================
export function getMistakeNotebook(): MistakeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MISTAKES);
    if (!raw) return [];
    return JSON.parse(raw) as MistakeEntry[];
  } catch (err) {
    console.error('Failed to load mistake notebook:', err);
    return [];
  }
}

export function saveMistakeNotebook(notebook: MistakeEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(notebook));
  } catch (err) {
    console.error('Failed to save mistake notebook:', err);
  }
}

/**
 * Updates a question in the mistake notebook:
 * - If incorrect: add or increment wrong count, reset correct streak to 0.
 * - If correct: increment correct streak.
 *   AUTOMATICALLY REMOVE from notebook when correctStreak reaches 2!
 */
export function updateMistakeRecord(
  questionId: string,
  subject: SubjectType,
  subSubject: any,
  subTopic: string,
  isCorrect: boolean,
  errorType?: ErrorClassification,
  pdfReference?: { pdfExamId: string; pdfExamTitle: string; pdfPageNumber: number }
): MistakeEntry[] {
  const notebook = getMistakeNotebook();
  const existingIndex = notebook.findIndex((m) => m.questionId === questionId);
  const now = Date.now();

  let updatedNotebook: MistakeEntry[] = [...notebook];

  if (!isCorrect) {
    // Wrong answer
    if (existingIndex >= 0) {
      updatedNotebook[existingIndex] = {
        ...updatedNotebook[existingIndex],
        wrongCount: updatedNotebook[existingIndex].wrongCount + 1,
        lastWrongAt: now,
        correctStreak: 0,
        lastErrorType: errorType || updatedNotebook[existingIndex].lastErrorType,
        ...(pdfReference ?? {}),
      };
    } else {
      updatedNotebook.push({
        questionId,
        subject,
        subSubject,
        subTopic: subTopic || 'Tổng hợp',
        firstWrongAt: now,
        lastWrongAt: now,
        wrongCount: 1,
        correctStreak: 0,
        lastErrorType: errorType || 'sai kiến thức',
        ...(pdfReference ?? {}),
      });
    }
  } else {
    // Correct answer
    if (existingIndex >= 0) {
      const newStreak = updatedNotebook[existingIndex].correctStreak + 1;
      if (newStreak >= 2) {
        // Mastered! Remove from mistake notebook
        updatedNotebook = updatedNotebook.filter((m) => m.questionId !== questionId);
      } else {
        updatedNotebook[existingIndex] = {
          ...updatedNotebook[existingIndex],
          correctStreak: newStreak,
        };
      }
    }
  }

  saveMistakeNotebook(updatedNotebook);
  return updatedNotebook;
}

export function removeMistakeManually(questionId: string): MistakeEntry[] {
  const notebook = getMistakeNotebook().filter((m) => m.questionId !== questionId);
  saveMistakeNotebook(notebook);
  return notebook;
}

// ==================== DAILY ACTIVITY & STREAKS ====================
export function getDailyActivities(): Record<string, DailyActivity> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_ACTIVITIES);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load daily activities:', err);
    return {};
  }
}

export function incrementDailyActivity(questionsCount: number, examCount: number = 0): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const activities = getDailyActivities();
    const current = activities[today] || { date: today, questionsCount: 0, examCount: 0 };

    activities[today] = {
      date: today,
      questionsCount: current.questionsCount + questionsCount,
      examCount: current.examCount + examCount,
    };

    localStorage.setItem(STORAGE_KEYS.DAILY_ACTIVITIES, JSON.stringify(activities));
  } catch (err) {
    console.error('Failed to increment daily activity:', err);
  }
}

export function calculateStreakDays(): number {
  const activities = getDailyActivities();
  let streak = 0;
  const now = new Date();

  // Check today first
  const todayStr = now.toISOString().slice(0, 10);
  const hadToday = (activities[todayStr]?.questionsCount || 0) > 0;

  // Start from today or yesterday
  let checkDate = new Date(now);
  if (!hadToday) {
    // Check if yesterday had activity
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    const act = activities[dateStr];
    if (act && act.questionsCount > 0) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ==================== ANALYTICS & STATS ENGINE ====================
export function calculateTopicStats(subject: SubjectType): TopicStat[] {
  const history = getExamHistory();
  const topicMap = new Map<
    string,
    {
      subject: SubjectType;
      subSubject?: any;
      total: number;
      correct: number;
      wrong: number;
      totalTime: number;
      recentIsCorrect: boolean[];
    }
  >();

  // Iterate over exam history chronologically (oldest to newest)
  const sortedHistory = [...history].reverse();

  sortedHistory.forEach((exam) => {
    exam.details.forEach((det) => {
      if (det.subject === subject) {
        const key = det.subTopic || 'Tổng hợp';
        const entry = topicMap.get(key) || {
          subject,
          subSubject: det.subSubject,
          total: 0,
          correct: 0,
          wrong: 0,
          totalTime: 0,
          recentIsCorrect: [],
        };

        entry.total += 1;
        if (det.isCorrect) {
          entry.correct += 1;
        } else {
          entry.wrong += 1;
        }
        entry.totalTime += det.timeSpentSeconds || 60;
        entry.recentIsCorrect.push(det.isCorrect);

        topicMap.set(key, entry);
      }
    });
  });

  const result: TopicStat[] = [];
  topicMap.forEach((val, topic) => {
    const accuracy = val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0;
    const avgTimeSeconds = val.total > 0 ? Math.round(val.totalTime / val.total) : 60;

    // Trend calculation
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (val.recentIsCorrect.length >= 6) {
      const half = Math.floor(val.recentIsCorrect.length / 2);
      const firstHalf = val.recentIsCorrect.slice(0, half).filter(Boolean).length / half;
      const secondHalf = val.recentIsCorrect.slice(half).filter(Boolean).length / (val.recentIsCorrect.length - half);
      if (secondHalf > firstHalf + 0.15) trend = 'up';
      else if (secondHalf < firstHalf - 0.15) trend = 'down';
    }

    result.push({
      topic,
      subject: val.subject,
      subSubject: val.subSubject,
      totalAnswered: val.total,
      correctCount: val.correct,
      wrongCount: val.wrong,
      accuracy,
      avgTimeSeconds,
      trend,
      isInsufficientData: val.total < 5,
    });
  });

  // Sort by lowest accuracy first, with insufficient data last
  return result.sort((a, b) => {
    if (a.isInsufficientData && !b.isInsufficientData) return 1;
    if (!a.isInsufficientData && b.isInsufficientData) return -1;
    return a.accuracy - b.accuracy;
  });
}

export function getWeakestTopics(subject: SubjectType): TopicStat[] {
  const stats = calculateTopicStats(subject);
  // Filter only topics with sufficient data (>= 5 questions) and accuracy < 75%.
  // The generic 'Tổng hợp' bucket is not a real topic, so it never becomes a
  // "weakest topic" recommendation (Task 8.2).
  return stats.filter((s) => !s.isInsufficientData && s.accuracy < 75 && s.topic !== 'Tổng hợp');
}

export interface ClassificationCoverage {
  totalQuestions: number;
  classifiedQuestions: number;
  coveragePct: number;
  classifiedTopicCount: number;
}

// How much of the recorded data actually carries a topic label. PDF attempts
// only have a label when one was assigned per question, so topic conclusions
// must be gated on this coverage (Task 8.2).
export function calculateClassificationCoverage(subject: SubjectType): ClassificationCoverage {
  const history = getExamHistory();
  let total = 0;
  let classified = 0;
  const topics = new Set<string>();
  history.forEach((exam) => {
    exam.details.forEach((det) => {
      if (det.subject !== subject) return;
      total += 1;
      const label = (det.subTopic ?? '').trim();
      if (label && label !== 'Tổng hợp') {
        classified += 1;
        topics.add(label);
      }
    });
  });
  return {
    totalQuestions: total,
    classifiedQuestions: classified,
    coveragePct: total > 0 ? Math.round((classified / total) * 100) : 0,
    classifiedTopicCount: topics.size,
  };
}

export function getAnalyticsSummary(practiceProgress?: any): AnalyticsSummary {
  const goals = getUserGoals();
  const history = getExamHistory();
  const streakDays = calculateStreakDays();

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAct = getDailyActivities()[todayStr];
  const todayQuestionsAnswered = todayAct ? todayAct.questionsCount : 0;

  const latestScores: Record<SubjectType, number | null> = {
    math: null,
    literature: null,
    science: null,
  };

  const fiveExamAvg: Record<SubjectType, number | null> = {
    math: null,
    literature: null,
    science: null,
  };

  const scoreTrends: Record<SubjectType, 'up' | 'down' | 'stable'> = {
    math: 'stable',
    literature: 'stable',
    science: 'stable',
  };

  const recentHistory: Record<SubjectType, number[]> = {
    math: [],
    literature: [],
    science: [],
  };

  const recentEntries: AnalyticsSummary['recentScoreEntries'] = {
    math: [],
    literature: [],
    science: [],
  };

  (['math', 'literature', 'science'] as SubjectType[]).forEach((subj) => {
    // Filter exams containing this subject, newest first as stored, then
    // sort defensively by date so a regraded older record cannot masquerade
    // as the latest result (Task 8.8).
    const subjectRecords = history
      .filter((h) => h.subjectScores && h.subjectScores[subj] && (
        !h.pdfExamId || h.pdfSubject === subj
      ))
      .sort((a, b) => b.date - a.date);
    const subjectExams = subjectRecords.map((h) => h.subjectScores[subj].score);

    if (subjectExams.length > 0) {
      latestScores[subj] = subjectExams[0]; // most recent
      recentHistory[subj] = [...subjectExams].reverse().slice(-8); // chronological last 8 for sparkline
      recentEntries[subj] = subjectRecords
        .slice(0, 8)
        .map((h) => ({
          score: h.subjectScores[subj].score,
          maxScore: h.subjectScores[subj].maxScore,
          date: h.date,
        }))
        .reverse();

      // 5-exam average
      const last5 = subjectExams.slice(0, 5);
      const avg = last5.reduce((a, b) => a + b, 0) / last5.length;
      fiveExamAvg[subj] = Math.round(avg * 10) / 10;

      // Trend: with at least 4 exams compare the newest 3 against the
      // previous 3 so one odd exam does not flip the trend; otherwise fall
      // back to latest versus previous.
      if (subjectExams.length >= 4) {
        const newestAvg = subjectExams.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const previousAvg = subjectExams.slice(3, 6).reduce((a, b) => a + b, 0) / Math.min(3, subjectExams.length - 3);
        const diff = newestAvg - previousAvg;
        if (diff > 1.5) scoreTrends[subj] = 'up';
        else if (diff < -1.5) scoreTrends[subj] = 'down';
        else scoreTrends[subj] = 'stable';
      } else if (subjectExams.length >= 2) {
        const diff = subjectExams[0] - subjectExams[1];
        if (diff > 1.5) scoreTrends[subj] = 'up';
        else if (diff < -1.5) scoreTrends[subj] = 'down';
        else scoreTrends[subj] = 'stable';
      }
    }
  });

  // Practice mode accuracy (separate from exam score)
  const practiceAccuracy: Record<SubjectType, { accuracy: number; totalAnswered: number }> = {
    math: { accuracy: 0, totalAnswered: 0 },
    literature: { accuracy: 0, totalAnswered: 0 },
    science: { accuracy: 0, totalAnswered: 0 },
  };

  return {
    goals,
    latestExamScores: latestScores,
    fiveExamAverage: fiveExamAvg,
    scoreTrends,
    recentScoreHistory: recentHistory,
    recentScoreEntries: recentEntries,
    practiceAccuracy,
    streakDays,
    todayQuestionsAnswered,
    totalExamsTaken: history.length,
  };
}

// ==================== FULL BACKUP EXPORT / IMPORT ====================
export function exportFullAppBackup(): void {
  const backup = {
    version: '2.0-hsa-full',
    exportedAt: new Date().toISOString(),
    goals: getUserGoals(),
    examHistory: getExamHistory(),
    mistakeNotebook: getMistakeNotebook(),
    dailyActivities: getDailyActivities(),
    questions: JSON.parse(localStorage.getItem('hsa_question_bank_v1') || '[]'),
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `HSA_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFullAppBackup(jsonData: any): boolean {
  try {
    if (jsonData.goals) saveUserGoals(jsonData.goals);
    if (Array.isArray(jsonData.examHistory)) saveExamHistory(jsonData.examHistory);
    if (Array.isArray(jsonData.mistakeNotebook)) saveMistakeNotebook(jsonData.mistakeNotebook);
    if (jsonData.dailyActivities) localStorage.setItem(STORAGE_KEYS.DAILY_ACTIVITIES, JSON.stringify(jsonData.dailyActivities));
    if (Array.isArray(jsonData.questions)) localStorage.setItem('hsa_question_bank_v1', JSON.stringify(jsonData.questions));
    return true;
  } catch (err) {
    console.error('Failed to import full backup:', err);
    return false;
  }
}

/**
 * Regrades past exams when the correct answer of a question is modified
 */
export function regradeExamHistoryWithQuestion(updatedQuestion: Question): ExamRecord[] {
  const history = getExamHistory();
  const newAnswer = updatedQuestion.correctAnswer;
  let modified = false;

  const updatedHistory = history.map((record) => {
    let recordChanged = false;
    const newDetails = record.details.map((det) => {
      if (det.questionId === updatedQuestion.id) {
        const isNowCorrect =
          det.userAnswer !== undefined && String(det.userAnswer) === String(newAnswer);
        if (isNowCorrect !== det.isCorrect || String(det.correctAnswer) !== String(newAnswer)) {
          recordChanged = true;
          modified = true;
          return {
            ...det,
            correctAnswer: newAnswer,
            isCorrect: isNowCorrect,
            errorType: isNowCorrect ? undefined : det.errorType,
          };
        }
      }
      return det;
    });

    if (!recordChanged) return record;

    // Recalculate subjectScores and totalScore
    const subjectScores = { ...record.subjectScores };
    let totalScore = 0;

    (['math', 'literature', 'science'] as SubjectType[]).forEach((sub) => {
      const subDetails = newDetails.filter((d) => d.subject === sub);
      if (subDetails.length > 0) {
        const correctCount = subDetails.filter((d) => d.isCorrect).length;
        subjectScores[sub] = {
          ...subjectScores[sub],
          correct: correctCount,
          score: correctCount,
        };
        totalScore += correctCount;
      }
    });

    return {
      ...record,
      details: newDetails,
      subjectScores,
      totalScore,
    };
  });

  if (modified) {
    saveExamHistory(updatedHistory);
  }

  return updatedHistory;
}
