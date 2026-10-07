export type SubjectType = 'math' | 'literature' | 'science';

export type ScienceSubSubject = 'Vật lí' | 'Hóa học' | 'Sinh học' | 'Lịch sử' | 'Địa lí';

export type DifficultyLevel = 'dễ' | 'trung bình' | 'khó';

export type QuestionReportReason =
  | 'sai đáp án'
  | 'đề thiếu/sai nội dung'
  | 'công thức hỏng'
  | 'hình lỗi'
  | 'khác';

export type ActiveToolType =
  | 'pointer'
  | 'pen'
  | 'highlight'
  | 'underline'
  | 'eraser'
  | 'ruler';

export type StrokeWidthType = 'thin' | 'medium' | 'thick';

export interface TextAnnotation {
  id: string;
  target: 'questionText' | 'groupContent' | string; // e.g. 'option-0', 'option-1'
  type: 'highlight' | 'underline';
  startIndex: number;
  endIndex: number;
  color: string;
  createdAt: number;
}

export interface DrawingPoint {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
}

export interface DrawingStroke {
  id: string;
  color: string;
  lineWidth: number; // absolute px in reference
  points: DrawingPoint[];
  createdAt: number;
}

export interface ScratchpadPageData {
  id: string;
  pageNumber: number;
  strokes: DrawingStroke[];
  bgPattern?: 'blank' | 'grid' | 'ruled'; // plain, grid/ô li, or ruled/kẻ ngang
}

export interface QuestionAnnotationsData {
  key: string; // `${contextId}_${questionId}`
  contextId: string; // examId or studySessionId
  questionId: string;
  groupId?: string; // if belongs to group
  textAnnotations: TextAnnotation[];
  strokes: DrawingStroke[]; // strokes drawn over question
  scratchpadPages?: ScratchpadPageData[]; // pages of scratchpad (max 10)
  currentScratchpadPage?: number;
  updatedAt: number;
}

// Group passage shared annotations
export interface GroupPassageAnnotationsData {
  key: string; // `${contextId}_group_${groupId}`
  contextId: string;
  groupId: string;
  textAnnotations: TextAnnotation[];
  strokes: DrawingStroke[];
  updatedAt: number;
}

export interface QuestionEditHistory {
  id: string;
  questionId: string;
  timestamp: number;
  oldQuestionText: string;
  newQuestionText: string;
  oldOptions: string[];
  newOptions: string[];
  oldCorrectAnswer: number | string;
  newCorrectAnswer: number | string;
  oldExplanation?: string;
  newExplanation?: string;
  reason?: string;
}

export interface ExamSet {
  id: string;
  title: string; // Tên bộ đề (ví dụ: "Đề thực chiến HSA số 1")
  createdAt: number;
  updatedAt?: number;
  description?: string;
  questionIds: string[];
  sourceFileNames?: string[];
}

export interface Question {
  id: string;
  originalNumber?: number; // Số câu gốc trong đề (ví dụ Câu 1, Câu 2...)
  subject: SubjectType;
  subSubject?: ScienceSubSubject; // Dành riêng cho phân môn Khoa học (Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí)
  subTopic: string; // Chuyên đề / chủ đề chuẩn
  difficulty?: DifficultyLevel; // Mức độ: dễ / trung bình / khó
  questionText: string;
  options: string[]; // Các phương án A, B, C, D (hoặc rỗng nếu là điền khuyết)
  correctAnswer: number | string; // index 0..3 hoặc chuỗi số điền khuyết
  type: 'multiple-choice' | 'fill-in';
  explanation?: string;
  imageUrl?: string;
  source?: string;

  // BỘ ĐỀ (EXAM SET)
  examSetId?: string;
  examSetName?: string;

  // CÂU HỎI CỤM (PASSAGE-BASED / GROUP QUESTIONS)
  groupId?: string; // ID nhóm chung nếu là câu hỏi cụm
  groupTitle?: string; // Ví dụ: "Đọc đoạn trích sau và trả lời các câu hỏi từ 16 đến 20:"
  groupContent?: string; // Nội dung đoạn trích, bảng số liệu, hoặc ngữ cảnh chung

  // CẢNH BÁO CHO AI PARSER
  hasWarning?: boolean; // Đánh dấu cảnh báo vàng nếu AI không chắc chắn
  warningReason?: string; // Lý do cảnh báo (ví dụ: "Chưa có đáp án đúng", "Thiếu lựa chọn")

  // LỊCH SỬ CHỈNH SỬA
  editHistory?: QuestionEditHistory[];
}

// Danh sách các chuyên đề chuẩn HSA để thống nhất tên gọi
export const STANDARD_TOPICS: Record<SubjectType, string[]> = {
  math: [
    'Hàm số & Đạo hàm',
    'Mũ & Logarit',
    'Nguyên hàm & Tích phân',
    'Số phức',
    'Hình học không gian Oxyz',
    'Khối đa diện & Thể tích',
    'Lượng giác',
    'Dãy số & Cấp số cộng/nhân',
    'Tổ hợp & Xác suất',
    'Thống kê & Biểu đồ số liệu',
    'Bất đẳng thức & Logic số học',
  ],
  literature: [
    'Đọc hiểu văn bản văn học',
    'Đọc hiểu văn bản thông tin',
    'Đọc hiểu văn bản nghị luận',
    'Biện pháp tu từ & Phong cách',
    'Ngữ pháp & Lỗi diễn đạt',
    'Từ ngữ & Ngữ nghĩa',
    'Văn học hiện đại Việt Nam',
    'Văn học trung đại & Dân gian',
  ],
  science: [
    'Vật lí - Dao động & Sóng',
    'Vật lí - Điện xoay chiều',
    'Vật lí - Quang học & Lượng tử',
    'Vật lí - Hạt nhân & Nhiệt học',
    'Hóa học - Este & Lipit',
    'Hóa học - Cacbohiđrat & Polime',
    'Hóa học - Kim loại & Ăn mòn',
    'Hóa học - Vô cơ & Điện phân',
    'Sinh học - Di truyền & Biến dị',
    'Sinh học - Tiến hóa & Sinh thái',
    'Sinh học - Tế bào & Cơ thể',
    'Lịch sử - Kháng chiến 1945-1975',
    'Lịch sử - Việt Nam cận đại',
    'Lịch sử - Lịch sử thế giới',
    'Địa lí - Địa lí tự nhiên',
    'Địa lí - Địa lí kinh tế - xã hội',
    'Địa lí - Vùng kinh tế trọng điểm',
  ],
};

export interface SubjectInfo {
  id: SubjectType;
  title: string;
  shortName: string;
  description: string;
  durationMinutes: number; // 75 for math, 60 for lit, 60 for sci
  totalQuestions: number; // 50 questions standard HSA
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export const SUBJECT_CONFIGS: Record<SubjectType, SubjectInfo> = {
  math: {
    id: 'math',
    title: 'Phần 1: Tư duy định lượng (Toán học)',
    shortName: 'Toán học',
    description: 'Bao gồm Đại số, Giải tích, Hình học, Xác suất thống kê và Tư duy logic số học.',
    durationMinutes: 75,
    totalQuestions: 50,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: 'Calculator',
  },
  literature: {
    id: 'literature',
    title: 'Phần 2: Tư duy định tính (Ngữ văn - Tiếng Việt)',
    shortName: 'Ngữ văn',
    description: 'Đọc hiểu văn bản văn học, nghị luận, báo chí, kiến thức tiếng Việt và phân tích ngữ cảnh.',
    durationMinutes: 60,
    totalQuestions: 50,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: 'BookOpen',
  },
  science: {
    id: 'science',
    title: 'Phần 3: Khoa học (Tự nhiên & Xã hội)',
    shortName: 'Khoa học',
    description: 'Kiến thức tổng hợp Vật lí, Hóa học, Sinh học, Lịch sử và Địa lí.',
    durationMinutes: 60,
    totalQuestions: 50,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: 'Atom',
  },
};

export type ExamModeType = 'single-subject' | 'full-hsa';

export interface ExamSession {
  id: string;
  mode: ExamModeType;
  examSetId?: string;
  examSetName?: string;
  currentSubject: SubjectType;
  subjectsOrder: SubjectType[];
  subjectQuestions: Record<SubjectType, Question[]>;
  userAnswers: Record<string, number | string>; // questionId -> answer
  flaggedQuestions: Record<string, boolean>; // questionId -> isFlagged
  reportedQuestions?: Record<
    string,
    { reason: QuestionReportReason; note?: string; reportedAt: number }
  >; // questionId -> report details
  subjectEndTimes: Record<SubjectType, number>; // exact timestamp ms when current subject ends
  isFinished: boolean;
  isBreak: boolean; // 2 min rest period between subjects in full mode
  breakEndTime?: number; // timestamp ms
  startedAt: number;
  completedAt?: number;
  autoSubmittedOnExpiry?: boolean;
}

export interface StudyProgress {
  answeredQuestions: Record<string, number | string>;
  lastSubject: SubjectType;
  lastQuestionIndex: Record<SubjectType, number>;
  bookmarkedQuestionIds: string[];
}
