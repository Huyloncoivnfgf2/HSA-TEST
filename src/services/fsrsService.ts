import {
  fsrs,
  generatorParameters,
  Rating,
  Card,
  createEmptyCard,
  State,
} from 'ts-fsrs';
import { SubjectType, Question } from '../types/hsa';

/**
 * FIXED request_retention = 0.9 as strictly requested.
 * There is NO UI option to change this value.
 */
const RETENTION_RATE = 0.9;
export const fsrsScheduler = fsrs(
  generatorParameters({
    request_retention: RETENTION_RATE,
  })
);

export type FSRSReviewReason =
  | 'sai kiến thức'
  | 'lỗi vặt'
  | 'làm vội'
  | 'đọc nhầm đề'
  | 'bỏ trống'
  | 'báo lỗi đã sửa'
  | 'manual';

export interface FSRSCardData {
  questionId: string;
  card: Card;
  subject: SubjectType;
  groupId?: string;
  addedReason: FSRSReviewReason;
  addedAt: number;
  lastRating?: Rating;
  lastReviewedAt?: number;
}

export interface FSRSStats {
  dueTodayCount: number;
  dueNext7DaysCount: number;
  totalCards: number;
  repsTotal: number;
  retentionRatePercent: number; // 90%
}

/**
 * Creates or retrieves a Card for a given question
 */
export function createFSRSCard(
  questionId: string,
  subject: SubjectType,
  reason: FSRSReviewReason = 'sai kiến thức',
  groupId?: string
): FSRSCardData {
  const card = createEmptyCard(new Date());
  return {
    questionId,
    card,
    subject,
    groupId,
    addedReason: reason,
    addedAt: Date.now(),
  };
}

/**
 * Adds a question to FSRS cards or updates its reason if it already exists
 */
export function addOrUpdateFSRSCard(
  cards: FSRSCardData[],
  questionId: string,
  subject: SubjectType,
  reason: FSRSReviewReason = 'sai kiến thức',
  groupId?: string
): FSRSCardData[] {
  const existingIndex = cards.findIndex((c) => c.questionId === questionId);
  if (existingIndex >= 0) {
    const existing = cards[existingIndex];
    const updated: FSRSCardData = {
      ...existing,
      addedReason: reason,
    };
    const next = [...cards];
    next[existingIndex] = updated;
    return next;
  }
  const newCard = createFSRSCard(questionId, subject, reason, groupId);
  return [newCard, ...cards];
}

/**
 * Deserializes card stored in JSON / DB (ensuring Dates are actual Date objects)
 */
export function normalizeCard(card: Card): Card {
  return {
    ...card,
    due: new Date(card.due),
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

/**
 * Rates a card using FSRS algorithm and returns the updated FSRSCardData
 */
export function processFSRSReview(
  cardData: FSRSCardData,
  rating: Rating,
  reviewDate: Date = new Date()
): FSRSCardData {
  const normalized = normalizeCard(cardData.card);
  const schedulingCards = fsrsScheduler.repeat(normalized, reviewDate);
  const updatedItem = schedulingCards[rating];

  return {
    ...cardData,
    card: updatedItem.card,
    lastRating: rating,
    lastReviewedAt: reviewDate.getTime(),
  };
}

/**
 * Returns cards that are due for review (due date <= now)
 */
export function getDueCards(cards: FSRSCardData[], now: Date = new Date()): FSRSCardData[] {
  const nowTime = now.getTime();
  return cards.filter((c) => {
    const dueTime = new Date(c.card.due).getTime();
    return dueTime <= nowTime;
  });
}

/**
 * Groups due cards so that questions with the same groupId are kept together in one review session
 */
export function groupDueQuestionsForReview(
  dueCards: FSRSCardData[],
  allQuestions: Question[]
): Array<{
  groupId?: string;
  groupTitle?: string;
  groupContent?: string;
  cards: FSRSCardData[];
  questions: Question[];
}> {
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));
  const groupUnitsMap = new Map<
    string,
    {
      groupTitle?: string;
      groupContent?: string;
      cards: FSRSCardData[];
      questions: Question[];
    }
  >();
  const singleUnits: Array<{
    cards: FSRSCardData[];
    questions: Question[];
  }> = [];

  const processedQuestionIds = new Set<string>();

  for (const cardData of dueCards) {
    if (processedQuestionIds.has(cardData.questionId)) continue;
    const q = questionMap.get(cardData.questionId);
    if (!q) continue;

    if (q.groupId) {
      // Find all sibling questions in this group
      if (!groupUnitsMap.has(q.groupId)) {
        const siblingQuestions = allQuestions.filter((sibling) => sibling.groupId === q.groupId);
        const siblingCards = siblingQuestions.map((sq) => {
          const existingCard = dueCards.find((c) => c.questionId === sq.id);
          return existingCard || createFSRSCard(sq.id, sq.subject, 'sai kiến thức', sq.groupId);
        });

        siblingQuestions.forEach((sq) => processedQuestionIds.add(sq.id));

        groupUnitsMap.set(q.groupId, {
          groupTitle: q.groupTitle,
          groupContent: q.groupContent,
          cards: siblingCards,
          questions: siblingQuestions,
        });
      }
    } else {
      processedQuestionIds.add(q.id);
      singleUnits.push({
        cards: [cardData],
        questions: [q],
      });
    }
  }

  const result: Array<{
    groupId?: string;
    groupTitle?: string;
    groupContent?: string;
    cards: FSRSCardData[];
    questions: Question[];
  }> = [];

  groupUnitsMap.forEach((val, groupId) => {
    result.push({
      groupId,
      groupTitle: val.groupTitle,
      groupContent: val.groupContent,
      cards: val.cards,
      questions: val.questions,
    });
  });

  singleUnits.forEach((val) => {
    result.push({
      cards: val.cards,
      questions: val.questions,
    });
  });

  return result;
}

/**
 * Calculates FSRS statistics: cards due today, next 7 days, retention rate, etc.
 */
export function calculateFSRSStats(cards: FSRSCardData[], now: Date = new Date()): FSRSStats {
  const nowTime = now.getTime();
  const endOfToday = new Date(now).setHours(23, 59, 59, 999);
  const sevenDaysLater = nowTime + 7 * 24 * 60 * 60 * 1000;

  let dueTodayCount = 0;
  let dueNext7DaysCount = 0;
  let repsTotal = 0;

  for (const c of cards) {
    const dueTime = new Date(c.card.due).getTime();
    if (dueTime <= endOfToday) {
      dueTodayCount++;
    }
    if (dueTime <= sevenDaysLater) {
      dueNext7DaysCount++;
    }
    repsTotal += c.card.reps || 0;
  }

  return {
    dueTodayCount,
    dueNext7DaysCount,
    totalCards: cards.length,
    repsTotal,
    retentionRatePercent: Math.round(RETENTION_RATE * 100), // 90%
  };
}
