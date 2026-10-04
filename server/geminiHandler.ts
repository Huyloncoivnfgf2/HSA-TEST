import { GoogleGenAI, Type } from '@google/genai';
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

export async function parseQuestionsWithGemini(payload: ParseRequestPayload) {
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

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: contents.length === 1 ? contents[0].text : { parts: contents },
    config: {
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
  });

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

  const response = await ai.models.generateContent({
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
  });

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
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Bạn là chuyên gia tư vấn khảo thí HSA ĐHQGHN nghiêm túc, sâu sát và động viên thí sinh.',
        temperature: 0.2,
      },
    });

    return response.text?.trim() || 'Hãy tiếp tục rà soát các chủ đề còn yếu để nâng cao điểm số.';
  } catch (err) {
    console.error('Lỗi tạo nhận xét AI:', err);
    return 'Hãy tiếp tục rà soát các chủ đề còn yếu trong sổ lỗi sai để nâng cao điểm số.';
  }
}

