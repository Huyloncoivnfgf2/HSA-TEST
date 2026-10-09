import { Question, ExamSession, StudyProgress, SubjectType } from '../types/hsa';
import { INITIAL_QUESTIONS } from '../data/sampleQuestions';
import { userStorage as localStorage } from './userStorage';

const STORAGE_KEYS = {
  QUESTIONS: 'hsa_question_bank_v1',
  EXAM_SESSION: 'hsa_active_exam_session_v1',
  STUDY_PROGRESS: 'hsa_study_progress_v1',
  THEME: 'hsa_theme_mode',
};

// ================= QUESTION BANK =================
export function loadQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (!raw) {
      // Seed with initial questions
      saveQuestions(INITIAL_QUESTIONS);
      return INITIAL_QUESTIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_QUESTIONS;
  } catch (err) {
    console.error('Failed to load questions from storage:', err);
    return INITIAL_QUESTIONS;
  }
}

export function saveQuestions(questions: Question[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
  } catch (err) {
    console.error('Failed to save questions to storage:', err);
  }
}

export function addQuestionsToBank(newQuestions: Question[]): Question[] {
  const current = loadQuestions();
  // Filter out any duplicate IDs
  const currentIds = new Set(current.map(q => q.id));
  const uniqueNew = newQuestions.map(q => {
    if (currentIds.has(q.id)) {
      return { ...q, id: `${q.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
    }
    return q;
  });
  const updated = [...current, ...uniqueNew];
  saveQuestions(updated);
  return updated;
}

export function deleteQuestionFromBank(questionId: string): Question[] {
  const current = loadQuestions();
  const updated = current.filter(q => q.id !== questionId);
  saveQuestions(updated);
  return updated;
}

export function updateQuestionInBank(updatedQuestion: Question): Question[] {
  const current = loadQuestions();
  const updated = current.map(q => q.id === updatedQuestion.id ? updatedQuestion : q);
  saveQuestions(updated);
  return updated;
}

export function resetQuestionBankToDefault(): Question[] {
  saveQuestions(INITIAL_QUESTIONS);
  return INITIAL_QUESTIONS;
}

// ================= EXAM SESSION PERSISTENCE =================
export function loadExamSession(): ExamSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAM_SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as ExamSession;
  } catch (err) {
    console.error('Failed to load exam session:', err);
    return null;
  }
}

export function saveExamSession(session: ExamSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(STORAGE_KEYS.EXAM_SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.EXAM_SESSION, JSON.stringify(session));
    }
  } catch (err) {
    console.error('Failed to save exam session:', err);
  }
}

// ================= STUDY PROGRESS =================
const DEFAULT_STUDY_PROGRESS: StudyProgress = {
  answeredQuestions: {},
  lastSubject: 'math',
  lastQuestionIndex: {
    math: 0,
    literature: 0,
    science: 0,
  },
  bookmarkedQuestionIds: [],
};

export function loadStudyProgress(): StudyProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDY_PROGRESS);
    if (!raw) return DEFAULT_STUDY_PROGRESS;
    return { ...DEFAULT_STUDY_PROGRESS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load study progress:', err);
    return DEFAULT_STUDY_PROGRESS;
  }
}

export function saveStudyProgress(progress: StudyProgress): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDY_PROGRESS, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save study progress:', err);
  }
}

// ================= EXPORT & IMPORT =================
export function exportQuestionsToJson(questions?: Question[]): void {
  const data = questions || loadQuestions();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `de-thi-hsa-dhqghn-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateQuestionsJson(data: unknown): Question[] | null {
  if (!Array.isArray(data)) return null;
  const validQuestions: Question[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (
      item &&
      typeof item.questionText === 'string' &&
      item.questionText.trim().length > 0 &&
      Array.isArray(item.options) &&
      (typeof item.correctAnswer === 'number' || typeof item.correctAnswer === 'string')
    ) {
      const subject: SubjectType = ['math', 'literature', 'science'].includes(item.subject)
        ? item.subject
        : 'math';
      
      validQuestions.push({
        id: item.id || `imported-${Date.now()}-${i}`,
        originalNumber: item.originalNumber,
        subject,
        subSubject: item.subSubject,
        subTopic: item.subTopic || 'Tổng hợp',
        difficulty: item.difficulty,
        questionText: item.questionText,
        options: item.options.map(String),
        correctAnswer: item.correctAnswer,
        type: item.type === 'fill-in' ? 'fill-in' : 'multiple-choice',
        explanation: item.explanation || '',
        imageUrl: item.imageUrl || undefined,
        groupId: item.groupId,
        groupTitle: item.groupTitle,
        groupContent: item.groupContent,
      });
    }
  }

  return validQuestions.length > 0 ? validQuestions : null;
}

/**
 * Xáo trộn đề thi nhưng GIỮ NGUYÊN các câu hỏi thuộc cùng một cụm nhóm
 * (câu hỏi đọc hiểu / bảng số liệu) nằm cạnh nhau và theo đúng thứ tự nội bộ của cụm.
 */
export function shuffleQuestionsPreservingGroups(questions: Question[]): Question[] {
  const chunks: Question[][] = [];
  let currentGroup: Question[] = [];
  let currentGroupId: string | undefined = undefined;

  for (const q of questions) {
    if (q.groupId) {
      if (q.groupId === currentGroupId) {
        currentGroup.push(q);
      } else {
        if (currentGroup.length > 0) {
          chunks.push(currentGroup);
        }
        currentGroup = [q];
        currentGroupId = q.groupId;
      }
    } else {
      if (currentGroup.length > 0) {
        chunks.push(currentGroup);
        currentGroup = [];
        currentGroupId = undefined;
      }
      chunks.push([q]);
    }
  }

  if (currentGroup.length > 0) {
    chunks.push(currentGroup);
  }

  // Shuffle chunks
  for (let i = chunks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chunks[i], chunks[j]] = [chunks[j], chunks[i]];
  }

  return chunks.flat();
}
