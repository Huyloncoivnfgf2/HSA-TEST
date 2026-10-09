import {
  QuestionAnnotationsData,
  GroupPassageAnnotationsData,
  TextAnnotation,
  DrawingStroke,
  ScratchpadPageData,
} from '../types/hsa';
import { userStorage as localStorage } from './userStorage';

const MEMORY_QUESTION_CACHE = new Map<string, QuestionAnnotationsData>();
const MEMORY_GROUP_CACHE = new Map<string, GroupPassageAnnotationsData>();

const STORAGE_PREFIX_Q = 'hsa_annot_q_';
const STORAGE_PREFIX_GRP = 'hsa_annot_grp_';
const STORAGE_PREFIX_GLOBAL_SP = 'hsa_annot_global_sp_';

/**
 * Loads global session scratchpad pages
 */
export function getGlobalScratchpadPages(contextId: string): ScratchpadPageData[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX_GLOBAL_SP + contextId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse global scratchpad:', err);
  }
  return [
    {
      id: `global-sp-${Date.now()}-0`,
      pageNumber: 1,
      strokes: [],
      bgPattern: 'grid',
    },
  ];
}

/**
 * Saves global session scratchpad pages
 */
export function saveGlobalScratchpadPages(contextId: string, pages: ScratchpadPageData[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX_GLOBAL_SP + contextId, JSON.stringify(pages));
  } catch (err) {
    console.warn('Failed to save global scratchpad:', err);
  }
}

/**
 * Normalizes and compresses stroke points: removes redundant consecutive points
 * within a threshold to keep data light and performance fast.
 */
export function compressStrokePoints(
  points: { x: number; y: number }[],
  epsilon = 0.0015
): { x: number; y: number }[] {
  if (points.length <= 2) return points;
  const result: { x: number; y: number }[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const distSq = dx * dx + dy * dy;

    if (distSq >= epsilon * epsilon) {
      result.push(curr);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Nén mảng điểm bằng delta encoding (x1-x0, y1-y0) khi lưu vào IndexedDB.
 * Điểm đầu tiên lưu toạ độ tuyệt đối (x0, y0).
 * Các điểm tiếp theo lưu delta (xi - x_{i-1}, yi - y_{i-1}).
 */
export function encodeStrokePointsDelta(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (!points || points.length <= 1) return points || [];
  const encoded: { x: number; y: number }[] = [
    { x: Number(points[0].x.toFixed(5)), y: Number(points[0].y.toFixed(5)) },
  ];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dx = Number((curr.x - prev.x).toFixed(5));
    const dy = Number((curr.y - prev.y).toFixed(5));
    encoded.push({ x: dx, y: dy });
  }
  return encoded;
}

/**
 * Giải nén mảng điểm từ delta encoding trở lại toạ độ tuyệt đối khi đọc từ IndexedDB.
 */
export function decodeStrokePointsDelta(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (!points || points.length <= 1) return points || [];
  const decoded: { x: number; y: number }[] = [{ x: points[0].x, y: points[0].y }];
  let curX = points[0].x;
  let curY = points[0].y;
  for (let i = 1; i < points.length; i++) {
    curX = Number((curX + points[i].x).toFixed(5));
    curY = Number((curY + points[i].y).toFixed(5));
    decoded.push({ x: curX, y: curY });
  }
  return decoded;
}

/**
 * Encode an entire array of strokes to delta format
 */
export function encodeStrokesDelta(strokes: DrawingStroke[]): DrawingStroke[] {
  if (!Array.isArray(strokes)) return [];
  return strokes.map((s) => ({
    ...s,
    points: encodeStrokePointsDelta(s.points),
  }));
}

/**
 * Decode an entire array of strokes from delta format
 */
export function decodeStrokesDelta(strokes: DrawingStroke[]): DrawingStroke[] {
  if (!Array.isArray(strokes)) return [];
  return strokes.map((s) => ({
    ...s,
    points: decodeStrokePointsDelta(s.points),
  }));
}

/**
 * Safely sanitizes text annotations:
 * If the question text length changed or is shorter than an annotation's range,
 * the annotation is either adjusted or gracefully dropped, keeping strokes intact.
 */
export function sanitizeTextAnnotations(
  fullText: string,
  annotations: TextAnnotation[]
): TextAnnotation[] {
  if (!fullText) return [];
  const textLength = fullText.length;

  return annotations.filter((ann) => {
    if (ann.startIndex < 0 || ann.endIndex <= ann.startIndex) return false;
    if (ann.startIndex >= textLength) return false;
    // Cap endIndex if beyond length
    if (ann.endIndex > textLength) {
      ann.endIndex = textLength;
    }
    return true;
  });
}

/**
 * Expands text selection if it cuts across a LaTeX formula ($...$ or $$...$$).
 * This guarantees KaTeX syntax never breaks!
 */
export function expandSelectionToKaTeXBoundaries(
  text: string,
  start: number,
  end: number
): { start: number; end: number } {
  let adjustedStart = start;
  let adjustedEnd = end;

  // Regex to match $...$ or $$...$$ formulas in the text
  const katexRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  let match: RegExpExecArray | null;

  while ((match = katexRegex.exec(text)) !== null) {
    const fStart = match.index;
    const fEnd = match.index + match[0].length;

    // Check if user's range intersects this formula
    const intersects = Math.max(start, fStart) < Math.min(end, fEnd);
    if (intersects) {
      // Expand to cover the entire formula
      adjustedStart = Math.min(adjustedStart, fStart);
      adjustedEnd = Math.max(adjustedEnd, fEnd);
    }
  }

  return { start: adjustedStart, end: adjustedEnd };
}

/**
 * Generates key for question annotation
 */
export function makeQuestionKey(contextId: string, questionId: string): string {
  return `${contextId}_${questionId}`;
}

/**
 * Generates key for group passage annotation
 */
export function makeGroupKey(contextId: string, groupId: string): string {
  return `${contextId}_grp_${groupId}`;
}

/**
 * Loads question annotations from memory cache or localStorage
 */
export function getQuestionAnnotations(
  contextId: string,
  questionId: string
): QuestionAnnotationsData {
  const key = makeQuestionKey(contextId, questionId);

  // 1. Memory cache
  if (MEMORY_QUESTION_CACHE.has(key)) {
    return MEMORY_QUESTION_CACHE.get(key)!;
  }

  // 2. LocalStorage
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX_Q + key);
    if (raw) {
      const parsed = JSON.parse(raw) as QuestionAnnotationsData;
      MEMORY_QUESTION_CACHE.set(key, parsed);
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse question annotations from localStorage:', err);
  }

  // 3. Default empty
  const defaultData: QuestionAnnotationsData = {
    key,
    contextId,
    questionId,
    textAnnotations: [],
    strokes: [],
    scratchpadPages: [
      {
        id: `sp-${Date.now()}-0`,
        pageNumber: 1,
        strokes: [],
        bgPattern: 'blank',
      },
    ],
    currentScratchpadPage: 0,
    updatedAt: Date.now(),
  };

  MEMORY_QUESTION_CACHE.set(key, defaultData);
  return defaultData;
}

/**
 * Saves question annotations
 */
export function saveQuestionAnnotations(data: QuestionAnnotationsData): void {
  const key = data.key || makeQuestionKey(data.contextId, data.questionId);
  data.updatedAt = Date.now();
  MEMORY_QUESTION_CACHE.set(key, data);

  try {
    localStorage.setItem(STORAGE_PREFIX_Q + key, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage full or error saving question annotation:', err);
  }
}

/**
 * Loads group passage annotations
 */
export function getGroupAnnotations(
  contextId: string,
  groupId: string
): GroupPassageAnnotationsData {
  const key = makeGroupKey(contextId, groupId);

  if (MEMORY_GROUP_CACHE.has(key)) {
    return MEMORY_GROUP_CACHE.get(key)!;
  }

  try {
    const raw = localStorage.getItem(STORAGE_PREFIX_GRP + key);
    if (raw) {
      const parsed = JSON.parse(raw) as GroupPassageAnnotationsData;
      MEMORY_GROUP_CACHE.set(key, parsed);
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse group annotations from localStorage:', err);
  }

  const defaultData: GroupPassageAnnotationsData = {
    key,
    contextId,
    groupId,
    textAnnotations: [],
    strokes: [],
    updatedAt: Date.now(),
  };

  MEMORY_GROUP_CACHE.set(key, defaultData);
  return defaultData;
}

/**
 * Saves group passage annotations
 */
export function saveGroupAnnotations(data: GroupPassageAnnotationsData): void {
  const key = data.key || makeGroupKey(data.contextId, data.groupId);
  data.updatedAt = Date.now();
  MEMORY_GROUP_CACHE.set(key, data);

  try {
    localStorage.setItem(STORAGE_PREFIX_GRP + key, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save group annotations to localStorage:', err);
  }
}

/**
 * Exports all annotations for backup
 */
export function exportAllAnnotationsBackup(): {
  questions: Record<string, QuestionAnnotationsData>;
  groups: Record<string, GroupPassageAnnotationsData>;
  globalScratchpads: Record<string, ScratchpadPageData[]>;
} {
  const questions: Record<string, QuestionAnnotationsData> = {};
  const groups: Record<string, GroupPassageAnnotationsData> = {};
  const globalScratchpads: Record<string, ScratchpadPageData[]> = {};

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      if (k.startsWith(STORAGE_PREFIX_Q)) {
        const itemKey = k.slice(STORAGE_PREFIX_Q.length);
        const val = localStorage.getItem(k);
        if (val) {
          questions[itemKey] = JSON.parse(val);
        }
      } else if (k.startsWith(STORAGE_PREFIX_GRP)) {
        const itemKey = k.slice(STORAGE_PREFIX_GRP.length);
        const val = localStorage.getItem(k);
        if (val) {
          groups[itemKey] = JSON.parse(val);
        }
      } else if (k.startsWith(STORAGE_PREFIX_GLOBAL_SP)) {
        const itemKey = k.slice(STORAGE_PREFIX_GLOBAL_SP.length);
        const val = localStorage.getItem(k);
        if (val) {
          globalScratchpads[itemKey] = JSON.parse(val);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to export annotations backup:', err);
  }

  return { questions, groups, globalScratchpads };
}

/**
 * Imports annotations from backup
 */
export function importAnnotationsBackup(backup: {
  questions?: Record<string, QuestionAnnotationsData>;
  groups?: Record<string, GroupPassageAnnotationsData>;
  globalScratchpads?: Record<string, ScratchpadPageData[]>;
}): void {
  if (!backup) return;

  if (backup.questions) {
    Object.entries(backup.questions).forEach(([k, val]) => {
      MEMORY_QUESTION_CACHE.set(k, val);
      try {
        localStorage.setItem(STORAGE_PREFIX_Q + k, JSON.stringify(val));
      } catch (e) {
        // ignore
      }
    });
  }

  if (backup.groups) {
    Object.entries(backup.groups).forEach(([k, val]) => {
      MEMORY_GROUP_CACHE.set(k, val);
      try {
        localStorage.setItem(STORAGE_PREFIX_GRP + k, JSON.stringify(val));
      } catch (e) {
        // ignore
      }
    });
  }

  if (backup.globalScratchpads) {
    Object.entries(backup.globalScratchpads).forEach(([k, val]) => {
      try {
        localStorage.setItem(STORAGE_PREFIX_GLOBAL_SP + k, JSON.stringify(val));
      } catch (e) {
        // ignore
      }
    });
  }
}

/**
 * Ensures questions belonging to the same cluster (groupId) remain strictly
 * consecutive in their original number sequence, even if questions were shuffled.
 */
export function ensureClusterQuestionsConsecutive<T extends { groupId?: string; originalNumber?: number }>(
  items: T[]
): T[] {
  const hasClusters = items.some((item) => item.groupId);
  if (!hasClusters) return items;

  const result: T[] = [];
  const processedGroups = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.groupId) {
      result.push(item);
    } else {
      if (processedGroups.has(item.groupId)) continue;
      processedGroups.add(item.groupId);
      const groupMembers = items
        .filter((q) => q.groupId === item.groupId)
        .sort((a, b) => (a.originalNumber || 0) - (b.originalNumber || 0));
      result.push(...groupMembers);
    }
  }

  return result;
}
