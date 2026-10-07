import { Question, SubjectType } from '../types/hsa';
import { postProcessQuestion } from './textPostProcessor';

export interface FileData {
  name: string;
  mimeType: string;
  base64: string;
}

export interface ParseOptions {
  autoClassify?: boolean;
  preferredSubject?: SubjectType | 'auto';
  signal?: AbortSignal;
  onProgress?: (status: {
    stage: 'reading' | 'ai_processing' | 'done' | 'error';
    currentFileIndex?: number;
    totalFiles?: number;
    fileName?: string;
    message?: string;
  }) => void;
}

export interface AnswerKeyEntry {
  questionNumber: number;
  answer: string;
  explanation?: string;
}

/**
 * Parses questions from one or more files and/or text with chunking and progress reporting.
 * If one file encounters an error, earlier successfully parsed questions are preserved.
 */
export async function parseQuestionsWithAI(
  options: ParseOptions,
  text?: string,
  files?: FileData[]
): Promise<Question[]> {
  const { autoClassify = true, preferredSubject = 'auto', onProgress } = options;
  const allExtracted: Question[] = [];

  // If both text and files are empty, return empty
  if ((!files || files.length === 0) && (!text || !text.trim())) {
    return [];
  }

  // 1. If text is provided without files, or if files are few
  const fileList = files && files.length > 0 ? files : [];

  if (fileList.length === 0 && text && text.trim()) {
    onProgress?.({
      stage: 'ai_processing',
      message: 'Gemini 3.8 Flash đang phân tích và tự động phân loại các câu hỏi...',
    });

    const res = await callParseEndpoint({
      autoClassify,
      preferredSubject,
      text: text.trim(),
    }, onProgress, options.signal);

    return res;
  }

  // 2. Multiple files processing (batch/chunk per file or 2 files at a time to stay within limits and show progress)
  const totalFiles = fileList.length;

  for (let i = 0; i < totalFiles; i++) {
    const f = fileList[i];
    onProgress?.({
      stage: 'ai_processing',
      currentFileIndex: i + 1,
      totalFiles,
      fileName: f.name,
      message: `Đang xử lý file ${i + 1}/${totalFiles}: "${f.name}"...`,
    });

    try {
      const questionsFromFile = await callParseEndpoint({
        autoClassify,
        preferredSubject,
        files: [f],
        // Only include text for first file if provided
        text: i === 0 && text ? text.trim() : undefined,
      }, onProgress, options.signal);

      if (Array.isArray(questionsFromFile)) {
        allExtracted.push(...questionsFromFile);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn(`Lỗi khi xử lý file "${f.name}":`, err);
      // If we already parsed questions from earlier files, notify user and keep existing
      if (allExtracted.length > 0) {
        onProgress?.({
          stage: 'error',
          currentFileIndex: i + 1,
          totalFiles,
          fileName: f.name,
          message: `Lỗi đọc file "${f.name}", nhưng đã giữ lại ${allExtracted.length} câu đã trích xuất thành công trước đó.`,
        });
      } else {
        throw err;
      }
    }
  }

  onProgress?.({
    stage: 'done',
    message: `Hoàn tất! Đã trích xuất ${allExtracted.length} câu hỏi.`,
  });

  return allExtracted;
}

async function callParseEndpoint(payload: {
  autoClassify?: boolean;
  preferredSubject?: SubjectType | 'auto';
  text?: string;
  files?: FileData[];
}, onProgress?: ParseOptions['onProgress'], signal?: AbortSignal): Promise<Question[]> {
  const response = await fetch('/api/gemini/parse-questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    throw new Error('Không thể trích xuất câu hỏi từ tài liệu');
  }

  const questions = Array.isArray(data.questions) ? data.questions : [];
  return questions.map((q: Question) => postProcessQuestion(q));
}

/**
 * Parse an answer key sheet/table from text or file
 */
export async function parseAnswerKeyWithAI(
  text?: string,
  file?: FileData
): Promise<AnswerKeyEntry[]> {
  const response = await fetch('/api/gemini/parse-answer-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, file }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Không thể phân tích bảng đáp án');
  }

  return data.answerKey as AnswerKeyEntry[];
}

/**
 * Generate 3-5 line authentic AI feedback for an exam attempt
 */
export async function fetchExamFeedbackWithAI(payload: {
  mode: string;
  totalScore: number;
  totalQuestions: number;
  subjectScores: Record<string, { score: number; maxScore: number; correct: number; total: number }>;
  targetTotal?: number;
  weakTopics?: string[];
  strongTopics?: string[];
  errorDistribution?: Record<string, number>;
}): Promise<string> {
  try {
    const response = await fetch('/api/gemini/exam-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Lỗi tạo nhận xét');
    }

    return data.feedback as string;
  } catch (err: any) {
    console.error('Lỗi nhận xét:', err);
    return 'Hãy tiếp tục rèn luyện các chủ đề còn yếu trong sổ lỗi sai để nâng cao điểm số và đạt mục tiêu.';
  }
}

// Helpers
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}
