import { GoogleGenAI, Type } from '@google/genai';
import { createHash } from 'node:crypto';
import { PDFParse } from 'pdf-parse';
import { SubjectType, ScienceSubSubject, DifficultyLevel, STANDARD_TOPICS } from '../src/types/hsa';

export interface FileItemPayload {
  name: string;
  mimeType: string;
  base64: string;
}

export interface ParseRequestPayload {
  autoClassify?: boolean;
  preferredSubject?: SubjectType | 'auto';
  text?: string;
  files?: FileItemPayload[];
  // Backwards compatibility for single file
  file?: FileItemPayload;
}

export interface AnswerKeyParsePayload {
  text?: string;
  file?: FileItemPayload;
}

const GEMINI_MAX_RETRIES = 4;
const GEMINI_RETRY_DELAYS_MS = [3000, 6000, 12000, 24000] as const;

function isRetryableGeminiError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, status, statusCode } = error as {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  const isRetryableCode = (value: unknown) => value === 503 || value === 429 || value === '503' || value === '429';
  return isRetryableCode(code)
    || isRetryableCode(statusCode)
    || isRetryableCode(status)
    || status === 'UNAVAILABLE';
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Đã hủy xử lý tài liệu.'));
      return;
    }

    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    };
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);
    const onAbort = () => {
      cleanup();
      reject(new Error('Đã hủy xử lý tài liệu.'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

interface GeminiRetryOptions {
  signal?: AbortSignal;
  onRetry?: (retryNumber: number, delayMs: number) => void | Promise<void>;
  wait?: (delayMs: number) => Promise<void>;
}

async function retryGeminiCall<T>(
  operation: () => Promise<T>,
  options: GeminiRetryOptions = {}
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (options.signal?.aborted || !isRetryableGeminiError(error) || attempt >= GEMINI_MAX_RETRIES) {
        throw error;
      }

      const delayMs = GEMINI_RETRY_DELAYS_MS[attempt] + Math.random() * 1000;
      await options.onRetry?.(attempt + 1, delayMs);
      await (options.wait || ((delay) => waitForRetry(delay, options.signal)))(delayMs);
    }
  }
}

async function parseRawQuestionsWithGemini(
  payload: ParseRequestPayload,
  signal?: AbortSignal,
  onRetry?: GeminiRetryOptions['onRetry'],
  wait?: GeminiRetryOptions['wait']
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong hệ thống.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const standardTopicsStr = `DANH SÁCH CHỦ ĐỀ CHUẨN (BẮT BUỘC DÙNG TÊN TRONG DANH SÁCH NÀY, KHÔNG TỰ TẠO TÊN MỚI NẾU ĐÃ CÓ TÊN TƯƠNG ĐƯƠNG):
- Phần Toán (dinh_luong): ${STANDARD_TOPICS.math.join(', ')}
- Phần Ngữ văn (dinh_tinh): ${STANDARD_TOPICS.literature.join(', ')}
- Phần Khoa học (khoa_hoc): ${STANDARD_TOPICS.science.join(', ')}`;

  const systemInstruction = `Bạn là chuyên gia khảo thí và biên soạn đề thi Đánh giá năng lực Đại học Quốc gia Hà Nội (HSA - ĐHQGHN).
Nhiệm vụ của bạn là đọc toàn bộ tài liệu (có thể chứa 1 phần hoặc cả 3 phần thi HSA) và bóc tách từng câu hỏi một cách chuẩn xác nhất.

1. PHÂN LOẠI 3 PHẦN THI CHUẨN HSA:
Mỗi câu hỏi BẮT BUỘC gán vào 1 trong 3 phần:
- "dinh_luong" (Tư duy định lượng - Toán học): Đại số, giải tích, hình học, số phức, xác suất, logic số học.
- "dinh_tinh" (Tư duy định tính - Ngữ văn, Tiếng Việt): Đọc hiểu văn bản, tác phẩm văn học, từ ngữ, ngữ pháp, phong cách ngôn ngữ.
- "khoa_hoc" (Khoa học tự nhiên & xã hội): Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí.
Dựa vào tiêu đề phần trong đề (ví dụ "Phần 1: Tư duy định lượng") nếu có; nếu không có tiêu đề thì dựa vào nội dung câu hỏi để tự động phân loại.

2. PHÂN MÔN KHOA HỌC:
Nếu câu hỏi thuộc phần "khoa_hoc", BẮT BUỘC gán trường "subSubject" là một trong 5 môn:
"Vật lí", "Hóa học", "Sinh học", "Lịch sử", "Địa lí".

3. CHỦ ĐỀ VÀ ĐỘ KHÓ:
- "chu_de": Khớp với danh sách chủ đề chuẩn dưới đây. Không tạo tên mới tùy tiện.
${standardTopicsStr}
- "do_kho": Đánh giá độ khó của câu: "dễ", "trung bình", hoặc "khó".

4. NHẬN DIỆN CÂU HỎI CỤM (RẤT QUAN TRỌNG):
- Tìm các dạng câu hỏi chùm có ngữ cảnh chung: "Đọc đoạn trích sau và trả lời các câu hỏi từ X đến Y", hoặc "Dựa vào bảng số liệu/thông tin sau trả lời câu hỏi X-Y".
- Khi gặp câu hỏi cụm, BẮT BUỘC:
  + Gán "groupId": chuỗi mã định danh duy nhất của cụm (ví dụ "group-1", "group-2").
  + Gán "groupTitle": tiêu đề chỉ dẫn (ví dụ: "Dựa vào đoạn trích sau trả lời từ câu 16 đến câu 20:").
  + Gán "groupContent": toàn bộ nội dung đoạn văn, bảng số liệu, hoặc thông tin chung.
  + Các câu hỏi con thuộc nhóm vẫn có nội dung câu hỏi riêng, 4 phương án, đáp án và lời giải riêng nhưng có cùng "groupId" và cùng "groupContent".

5. CÔNG THỨC TOÁN & KÝ HIỆU:
- BẮT BUỘC bọc TẤT CẢ các công thức toán, phương trình, số mũ, phân số, ký hiệu trong $...$ (inline) hoặc $$...$$ (riêng dòng) để KaTeX hiển thị đẹp. Ví dụ: $f(x) = x^2 - 4x + 3$, $\\int_0^1 xdx$, $\\vec{n} = (1; 2; 3)$, $H_2SO_4$.

6. ĐÁP ÁN VÀ CẢNH BÁO:
- options: Danh sách các lựa chọn (thường là 4 phương án A, B, C, D). Bỏ tiền tố "A.", "B." nhưng giữ nguyên công thức LaTeX.
- correctAnswer: Ghi "0" cho A, "1" cho B, "2" cho C, "3" cho D. Nếu là câu điền khuyết thì ghi giá trị số.
- Nếu câu hỏi trong đề gốc KHÔNG CÓ đáp án sẵn, hoặc AI chưa chắc chắn 100%, hãy đặt "hasWarning": true và ghi rõ "warningReason" (ví dụ: "Đề gốc không kèm đáp án", "Thiếu phương án D").`;

  // Collect contents
  const contents: any[] = [];

  // Support both files array and single file
  const allFiles: FileItemPayload[] = [];
  if (payload.files && payload.files.length > 0) {
    allFiles.push(...payload.files);
  } else if (payload.file && payload.file.base64) {
    allFiles.push(payload.file);
  }

  for (const f of allFiles) {
    if (f.base64) {
      contents.push({
        inlineData: {
          mimeType: f.mimeType || 'application/pdf',
          data: f.base64,
        },
      });
    }
  }

  let promptText = `Hãy đọc kỹ tài liệu đề thi HSA và trích xuất TOÀN BỘ câu hỏi thành danh sách JSON chuẩn theo đúng hướng dẫn.`;
  if (payload.text && payload.text.trim()) {
    promptText += `\n\nNội dung văn bản cung cấp:\n${payload.text.trim()}`;
  }

  contents.push({ text: promptText });

  const response = await retryGeminiCall(
    () => ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents.length === 1 ? contents[0].text : { parts: contents },
      config: {
        abortSignal: signal,
        systemInstruction,
        temperature: 0.15,
        responseMimeType: 'application/json',
        responseSchema: {
        type: Type.ARRAY,
        description: 'Danh sách các câu hỏi đề thi HSA được trích xuất',
        items: {
          type: Type.OBJECT,
          properties: {
            originalNumber: {
              type: Type.INTEGER,
              description: 'Số thứ tự câu trong đề thi gốc (ví dụ 1, 2, 3...)',
            },
            part: {
              type: Type.STRING,
              description: 'Một trong 3 phần: "dinh_luong", "dinh_tinh", "khoa_hoc"',
            },
            subSubject: {
              type: Type.STRING,
              description: 'Nếu là khoa_hoc thì ghi: "Vật lí", "Hóa học", "Sinh học", "Lịch sử", "Địa lí"',
            },
            chu_de: {
              type: Type.STRING,
              description: 'Tên chuyên đề chuẩn theo danh sách',
            },
            do_kho: {
              type: Type.STRING,
              description: '"dễ", "trung bình", hoặc "khó"',
            },
            groupId: {
              type: Type.STRING,
              description: 'Mã nhóm nếu là câu hỏi cụm có chung ngữ cảnh/đoạn trích (ví dụ "group-1")',
            },
            groupTitle: {
              type: Type.STRING,
              description: 'Tiêu đề nhóm dẫn (ví dụ: "Dựa vào thông tin sau trả lời câu 21 - 25:")',
            },
            groupContent: {
              type: Type.STRING,
              description: 'Nội dung đoạn trích/dữ liệu/bảng số liệu chung của cụm câu hỏi',
            },
            questionText: {
              type: Type.STRING,
              description: 'Nội dung câu hỏi cụ thể kèm cú pháp LaTeX $...$',
            },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Danh sách các lựa chọn A, B, C, D',
            },
            correctAnswer: {
              type: Type.STRING,
              description: 'Index đáp án đúng ("0", "1", "2", "3") hoặc giá trị điền khuyết',
            },
            type: {
              type: Type.STRING,
              description: '"multiple-choice" hoặc "fill-in"',
            },
            explanation: {
              type: Type.STRING,
              description: 'Lời giải chi tiết từng bước, kèm công thức LaTeX',
            },
            hasWarning: {
              type: Type.BOOLEAN,
              description: 'True nếu thiếu đáp án, thiếu phương án, hoặc AI không chắc chắn',
            },
            warningReason: {
              type: Type.STRING,
              description: 'Mô tả lý do cảnh báo nếu có',
            },
          },
          required: ['questionText', 'part', 'chu_de', 'options'],
        },
        },
      },
    }),
    { signal, onRetry, wait }
  );

  const text = response.text || '[]';
  const parsed = JSON.parse(text);

  return parsed.map((item: any, idx: number) => {
    // Map part to subject
    let subject: SubjectType = 'math';
    if (item.part === 'dinh_tinh') {
      subject = 'literature';
    } else if (item.part === 'khoa_hoc') {
      subject = 'science';
    } else if (item.part === 'dinh_luong') {
      subject = 'math';
    } else if (payload.preferredSubject && payload.preferredSubject !== 'auto') {
      subject = payload.preferredSubject;
    }

    // Determine correct answer
    let correctAns: number | string = 0;
    let hasWarning = Boolean(item.hasWarning);
    let warningReason = item.warningReason || '';

    if (item.type === 'fill-in') {
      correctAns = String(item.correctAnswer ?? '');
      if (!correctAns) {
        hasWarning = true;
        warningReason = warningReason || 'Chưa xác định được đáp án điền khuyết';
      }
    } else {
      if (item.correctAnswer !== undefined && item.correctAnswer !== null && item.correctAnswer !== '') {
        const parsedNum = parseInt(item.correctAnswer, 10);
        correctAns = isNaN(parsedNum) ? 0 : parsedNum;
      } else {
        correctAns = 0;
        hasWarning = true;
        warningReason = warningReason || 'Đề bài chưa có đáp án đúng được xác định';
      }
    }

    const optionsList = Array.isArray(item.options) ? item.options : [];
    if (item.type !== 'fill-in' && optionsList.length < 2) {
      hasWarning = true;
      warningReason = warningReason || 'Số lượng phương án lựa chọn không đầy đủ';
    }

    let subSubject: ScienceSubSubject | undefined = undefined;
    if (subject === 'science') {
      const validSubSubjects: ScienceSubSubject[] = ['Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí'];
      if (validSubSubjects.includes(item.subSubject)) {
        subSubject = item.subSubject;
      } else {
        // Fallback deduce from chu_de or question
        const chuDeLower = (item.chu_de || '').toLowerCase();
        if (chuDeLower.includes('vật lí') || chuDeLower.includes('điện') || chuDeLower.includes('sóng') || chuDeLower.includes('quang')) {
          subSubject = 'Vật lí';
        } else if (chuDeLower.includes('hóa') || chuDeLower.includes('este') || chuDeLower.includes('kim loại')) {
          subSubject = 'Hóa học';
        } else if (chuDeLower.includes('sinh') || chuDeLower.includes('di truyền') || chuDeLower.includes('tế bào')) {
          subSubject = 'Sinh học';
        } else if (chuDeLower.includes('sử') || chuDeLower.includes('chiến tranh') || chuDeLower.includes('cách mạng')) {
          subSubject = 'Lịch sử';
        } else {
          subSubject = 'Địa lí';
        }
      }
    }

    const difficulty: DifficultyLevel = ['dễ', 'trung bình', 'khó'].includes(item.do_kho)
      ? item.do_kho
      : 'trung bình';

    return {
      id: `ai-parsed-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      originalNumber: item.originalNumber ?? idx + 1,
      subject,
      subSubject,
      subTopic: item.chu_de || 'Tổng hợp',
      difficulty,
      questionText: item.questionText || '',
      options: optionsList,
      correctAnswer: correctAns,
      type: item.type === 'fill-in' ? 'fill-in' : 'multiple-choice',
      explanation: item.explanation || '',
      groupId: item.groupId || undefined,
      groupTitle: item.groupTitle || undefined,
      groupContent: item.groupContent || undefined,
      hasWarning,
      warningReason: hasWarning ? warningReason : undefined,
    };
  });
}

export interface ParseChunkEvent {
  chunk: number;
  total: number;
  questions: Awaited<ReturnType<typeof parseRawQuestionsWithGemini>>;
  done: false;
  error?: string;
  retryMessage?: string;
  startPage?: number;
  endPage?: number;
  pageCount?: number;
}

interface PdfParseOptions {
  onChunk?: (event: ParseChunkEvent | { done: true; total_questions: number; total: number }) => void | Promise<void>;
  signal?: AbortSignal;
  retryChunk?: number;
}

const PDF_MAX_BYTES = 20 * 1024 * 1024;
const PDF_CHUNK_PAGES = 5;
const PDF_CHUNK_CONCURRENCY = 1;
const PDF_CHUNK_TIMEOUT_MS = 120_000;
const pdfQuestionCache = new Map<string, {
  pageCount: number;
  pageTexts: string[];
  chunks: Array<ParseChunkEvent['questions'] | undefined>;
}>();

function getPdfFiles(payload: ParseRequestPayload): FileItemPayload[] {
  const files = payload.files?.length ? payload.files : payload.file ? [payload.file] : [];
  return files.filter((file) => file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
}

async function extractPdfPages(buffer: Buffer): Promise<string[]> {
  const parser = new PDFParse({ data: Uint8Array.from(buffer) });
  try {
    const result = await parser.getText({ pageJoiner: '' });
    return Array.from({ length: result.total }, (_, index) => result.getPageText(index + 1).trim());
  } finally {
    await parser.destroy();
  }
}

async function renderPdfPages(buffer: Buffer, startPage: number, endPage: number) {
  const parser = new PDFParse({ data: Uint8Array.from(buffer) });
  try {
    const result = await parser.getScreenshot({
      partial: Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index),
      imageDataUrl: true,
      imageBuffer: false,
      scale: 1.5,
    });
    return result.pages.map((page) => ({
      name: `page-${page.pageNumber}.png`,
      mimeType: 'image/png',
      base64: page.dataUrl.replace(/^data:image\/png;base64,/, ''),
    }));
  } finally {
    await parser.destroy();
  }
}

function withChunkTimeout<T>(
  operation: (signal: AbortSignal, pauseTimeout: () => () => void) => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    let remaining = PDF_CHUNK_TIMEOUT_MS;
    let startedAt = Date.now();
    let timeout: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    };
    const finish = <TResult>(callback: (value: TResult) => void, value: TResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const onTimeout = () => {
      controller.abort();
      finish(reject, new Error('Chunk vượt quá thời gian xử lý 120 giây.'));
    };
    const scheduleTimeout = () => {
      startedAt = Date.now();
      timeout = setTimeout(onTimeout, remaining);
    };
    const onAbort = () => {
      controller.abort();
      finish(reject, new Error('Đã hủy xử lý tài liệu.'));
    };
    const pauseTimeout = () => {
      if (settled) return () => {};
      clearTimeout(timeout);
      remaining -= Date.now() - startedAt;
      if (remaining <= 0) {
        onTimeout();
        return () => {};
      }
      let resumed = false;
      return () => {
        if (resumed) return;
        resumed = true;
        if (settled || signal?.aborted) return;
        if (remaining <= 0) {
          onTimeout();
          return;
        }
        scheduleTimeout();
      };
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    scheduleTimeout();
    operation(controller.signal, pauseTimeout).then(
      (result) => finish(resolve, result),
      (error) => finish(reject, error)
    );
  });
}

async function parsePdfQuestionsWithGemini(
  payload: ParseRequestPayload,
  options: PdfParseOptions
) {
  const file = getPdfFiles(payload)[0];
  if (!file) return parseRawQuestionsWithGemini(payload);

  const buffer = Buffer.from(file.base64, 'base64');
  if (buffer.length > PDF_MAX_BYTES) {
    throw new Error('Tệp PDF vượt quá giới hạn 20 MB. Vui lòng chọn tệp nhỏ hơn.');
  }

  const cacheKey = createHash('md5').update(buffer).digest('hex');
  let cached = pdfQuestionCache.get(cacheKey);

  if (!cached) {
    const pageTexts = await extractPdfPages(buffer);
    if (pageTexts.length === 0) {
      throw new Error('Không đọc được trang nào từ tệp PDF.');
    }
    cached = {
      pageCount: pageTexts.length,
      pageTexts,
      chunks: Array.from({ length: Math.ceil(pageTexts.length / PDF_CHUNK_PAGES) }),
    };
    pdfQuestionCache.set(cacheKey, cached);
  }

  const total = cached.chunks.length;
  const selectedChunks = options.retryChunk !== undefined
    ? [options.retryChunk - 1]
    : cached.chunks.map((_, index) => index).filter((index) => !cached?.chunks[index]);

  await options.onChunk?.({
    chunk: 0,
    total,
    questions: [],
    done: false,
    pageCount: cached.pageCount,
  });

  if (options.retryChunk !== undefined && (options.retryChunk < 1 || options.retryChunk > total)) {
    throw new Error('Số chunk cần thử lại không hợp lệ.');
  }

  if (options.retryChunk === undefined) {
    for (let index = 0; index < cached.chunks.length; index += 1) {
      const questions = cached.chunks[index];
      if (!questions) continue;
      const startPage = index * PDF_CHUNK_PAGES;
      await options.onChunk?.({
        chunk: index + 1,
        total,
        questions,
        done: false,
        startPage: startPage + 1,
        endPage: Math.min(startPage + PDF_CHUNK_PAGES, cached.pageCount),
      });
    }
  }

  for (let offset = 0; offset < selectedChunks.length; offset += PDF_CHUNK_CONCURRENCY) {
    if (options.signal?.aborted) throw new Error('Đã hủy xử lý tài liệu.');
    const batch = selectedChunks.slice(offset, offset + PDF_CHUNK_CONCURRENCY);
    const pending = batch.map(async (chunkIndex) => {
      const startPage = chunkIndex * PDF_CHUNK_PAGES;
      const endPage = Math.min(startPage + PDF_CHUNK_PAGES, cached!.pageCount);
      const chunkText = cached!.pageTexts.slice(startPage, endPage);
      const hasTextLayer = chunkText.every((pageText) => pageText.length > 0);
      const questions = await withChunkTimeout(
        async (signal, pauseTimeout) => {
          const chunkPayload: ParseRequestPayload = hasTextLayer
            ? {
                ...payload,
                files: undefined,
                file: undefined,
                text: `${payload.text?.trim() ? `${payload.text.trim()}\n\n` : ''}Nội dung PDF trang ${startPage + 1}-${endPage}:\n${chunkText.join('\n\n')}`,
              }
            : {
                ...payload,
                files: await renderPdfPages(buffer, startPage + 1, endPage),
                file: undefined,
                text: `Chỉ trích xuất câu hỏi nằm trong các trang ${startPage + 1}-${endPage} của tài liệu PDF này.${payload.text?.trim() ? `\n\n${payload.text.trim()}` : ''}`,
              };
          return parseRawQuestionsWithGemini(
            chunkPayload,
            signal,
            (retryNumber, delayMs) => options.onChunk?.({
              chunk: chunkIndex + 1,
              total,
              questions: [],
              done: false,
              retryMessage: `Google đang bận, thử lại lần ${retryNumber}/${GEMINI_MAX_RETRIES} sau ${(delayMs / 1000).toFixed(1)} giây...`,
              startPage: startPage + 1,
              endPage,
            }),
            async (delayMs) => {
              const resumeTimeout = pauseTimeout();
              try {
                await waitForRetry(delayMs, signal);
              } finally {
                resumeTimeout();
              }
            }
          );
        },
        options.signal
      );
      cached!.chunks[chunkIndex] = questions;
      await options.onChunk?.({
        chunk: chunkIndex + 1,
        total,
        questions,
        done: false,
        startPage: startPage + 1,
        endPage,
      });
    });

    const results = await Promise.allSettled(pending);
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      if (result.status === 'rejected') {
        const chunkIndex = batch[index];
        const startPage = chunkIndex * PDF_CHUNK_PAGES;
        await options.onChunk?.({
          chunk: chunkIndex + 1,
          total,
          questions: [],
          done: false,
          error: result.reason instanceof Error ? result.reason.message : 'Lỗi xử lý chunk.',
          startPage: startPage + 1,
          endPage: Math.min(startPage + PDF_CHUNK_PAGES, cached.pageCount),
        });
      }
    }
  }

  const allQuestions = cached.chunks.flatMap((questions) => questions || []);
  await options.onChunk?.({ done: true, total_questions: allQuestions.length, total });

  if (pdfQuestionCache.size > 20) {
    const oldestKey = pdfQuestionCache.keys().next().value;
    if (oldestKey) pdfQuestionCache.delete(oldestKey);
  }
  return allQuestions;
}

export async function parseQuestionsWithGemini(
  payload: ParseRequestPayload,
  options: PdfParseOptions = {}
) {
  const allFiles = payload.files?.length ? payload.files : payload.file ? [payload.file] : [];
  if (allFiles.some((file) => Buffer.byteLength(file.base64, 'base64') > PDF_MAX_BYTES)) {
    throw new Error('Tệp vượt quá giới hạn 20 MB. Vui lòng chọn tệp nhỏ hơn.');
  }
  const pdfFiles = getPdfFiles(payload);
  if (pdfFiles.length > 0) {
    return parsePdfQuestionsWithGemini(payload, options);
  }
  const questions = await parseRawQuestionsWithGemini(
    payload,
    options.signal,
    (retryNumber, delayMs) => options.onChunk?.({
      chunk: 1,
      total: 1,
      questions: [],
      done: false,
      retryMessage: `Google đang bận, thử lại lần ${retryNumber}/${GEMINI_MAX_RETRIES} sau ${(delayMs / 1000).toFixed(1)} giây...`,
    })
  );
  await options.onChunk?.({ chunk: 1, total: 1, questions, done: false });
  await options.onChunk?.({ done: true, total_questions: questions.length, total: 1 });
  return questions;
}

// ==========================================
// PARSE STANDALONE ANSWER KEY SHEET
// ==========================================
export async function parseAnswerKeyWithGemini(payload: AnswerKeyParsePayload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong hệ thống.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = `Bạn là trợ lý khảo thí. Nhiệm vụ của bạn là đọc bảng đáp án (dạng text hoặc file/ảnh bảng đáp án) và trích xuất thành danh sách:
- questionNumber: Số thứ tự câu (1, 2, 3...)
- answer: Chữ cái đáp án ("A", "B", "C", "D") hoặc giá trị số nếu là câu điền khuyết
- explanation: Lời giải nếu có trong bảng.`;

  const contents: any[] = [];
  if (payload.file && payload.file.base64) {
    contents.push({
      inlineData: {
        mimeType: payload.file.mimeType || 'application/pdf',
        data: payload.file.base64,
      },
    });
  }

  let prompt = 'Hãy đọc và trích xuất toàn bộ bảng đáp án sau thành danh sách JSON.';
  if (payload.text) {
    prompt += `\n\nNội dung bảng đáp án:\n${payload.text}`;
  }
  contents.push({ text: prompt });

  const response = await retryGeminiCall(() => ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: contents.length === 1 ? contents[0].text : { parts: contents },
    config: {
      systemInstruction,
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        description: 'Bảng đáp án các câu',
        items: {
          type: Type.OBJECT,
          properties: {
            questionNumber: { type: Type.INTEGER, description: 'Số câu (1, 2, 3...)' },
            answer: { type: Type.STRING, description: 'Đáp án: A, B, C, D hoặc giá trị điền khuyết' },
            explanation: { type: Type.STRING, description: 'Lời giải vắn tắt nếu có' },
          },
          required: ['questionNumber', 'answer'],
        },
      },
    },
  }));

  const text = response.text || '[]';
  return JSON.parse(text) as Array<{
    questionNumber: number;
    answer: string;
    explanation?: string;
  }>;
}

// ==========================================
// GENERATE 3-5 LINE EXAM FEEDBACK
// ==========================================
export interface ExamFeedbackPayload {
  mode: string;
  totalScore: number;
  totalQuestions: number;
  subjectScores: Record<string, { score: number; maxScore: number; correct: number; total: number }>;
  targetTotal?: number;
  weakTopics?: string[];
  strongTopics?: string[];
  errorDistribution?: Record<string, number>;
}

export async function generateExamFeedbackWithGemini(payload: ExamFeedbackPayload): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return 'Luyện tập chăm chỉ và tập trung vào các câu sai để cải thiện điểm số trong lần thi tiếp theo.';
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `Dưới đây là DỮ LIỆU THỰC TẾ kết quả bài thi ĐGNL HSA của thí sinh:
- Tổng điểm đạt được: ${payload.totalScore}/${payload.totalQuestions} điểm. ${payload.targetTotal ? `(Mục tiêu đặt ra: ${payload.targetTotal} điểm)` : ''}
- Chi tiết từng phần:
${Object.entries(payload.subjectScores)
  .map(([k, v]) => `  + ${k}: ${v.score}/${v.total} câu đúng`)
  .join('\n')}
- Các chủ đề làm sai nhiều nhất: ${payload.weakTopics?.join(', ') || 'Không có chủ đề nổi trội'}
- Các chủ đề làm tốt nhất: ${payload.strongTopics?.join(', ') || 'Chưa xác định'}
- Phân loại lỗi sai: ${JSON.stringify(payload.errorDistribution || {})}

YÊU CẦU QUAN TRỌNG:
Viết một nhận xét ngắn gọn, sắc bén đúng từ 3 đến 5 dòng bao gồm:
1. Điểm mạnh: Phần/môn làm tốt nhất và tỷ lệ đạt được.
2. Điểm yếu cụ thể: Chủ đề bị mất điểm nhiều nhất và nguyên nhân lỗi (nếu có lỗi làm quá nhanh hoặc hết giờ).
3. Lời khuyên cụ thể việc cần làm ngay để bù đắp điểm số.
TUYỆT ĐỐI CHỈ DỰA TRÊN DỮ LIỆU THẬT TRÊN, KHÔNG TỰ BỊA ĐẶT THÊM SỐ LIỆU!`;

  try {
    const response = await retryGeminiCall(() => ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Bạn là chuyên gia tư vấn khảo thí HSA ĐHQGHN nghiêm túc, sâu sát và động viên thí sinh.',
        temperature: 0.2,
      },
    }));

    return response.text?.trim() || 'Hãy tiếp tục rà soát các chủ đề còn yếu để nâng cao điểm số.';
  } catch (err) {
    console.error('Lỗi tạo nhận xét AI:', err);
    return 'Hãy tiếp tục rà soát các chủ đề còn yếu trong sổ lỗi sai để nâng cao điểm số.';
  }
}
