// Registry of exam systems (Task 9.7). Today the web grades HSA exams; this
// registry describes the section layout of each supported exam system so the
// library can grow to TSA (đánh giá tư duy) and THPT without hard-coding HSA
// assumptions in new code. `questionCount: null` means "theo đề thi cụ thể"
// and must be confirmed against the official structure of that exam year
// before a library exam relies on it.
export type ExamSystemId = 'hsa' | 'tsa' | 'thpt';

export interface ExamSystemSection {
  id: string;
  label: string;
  durationMinutes: number | null;
  questionCount: number | null;
  note?: string;
}

export interface ExamSystem {
  id: ExamSystemId;
  label: string;
  sections: ExamSystemSection[];
}

export const EXAM_SYSTEMS: Record<ExamSystemId, ExamSystem> = {
  hsa: {
    id: 'hsa',
    label: 'HSA — Đánh giá năng lực ĐHQGHN',
    sections: [
      { id: 'dinh_luong', label: 'Tư duy định lượng', durationMinutes: 75, questionCount: 50 },
      { id: 'dinh_tinh', label: 'Tư duy định tính', durationMinutes: 60, questionCount: 50 },
      { id: 'khoa_hoc', label: 'Khoa học', durationMinutes: 60, questionCount: 50 },
    ],
  },
  tsa: {
    id: 'tsa',
    label: 'TSA — Đánh giá tư duy (Bách khoa Hà Nội)',
    sections: [
      { id: 'tsa_toan', label: 'Tư duy Toán học', durationMinutes: 60, questionCount: 40 },
      { id: 'tsa_doc_hieu', label: 'Tư duy Đọc hiểu', durationMinutes: 30, questionCount: 20 },
      { id: 'tsa_khoa_hoc', label: 'Tư duy Khoa học / Giải quyết vấn đề', durationMinutes: 60, questionCount: 40 },
    ],
  },
  thpt: {
    id: 'thpt',
    label: 'THPT — Tốt nghiệp trung học phổ thông',
    sections: [
      { id: 'thpt_toan', label: 'Toán', durationMinutes: 90, questionCount: null },
      { id: 'thpt_van', label: 'Ngữ văn', durationMinutes: 120, questionCount: null, note: 'Môn tự luận — thư viện PDF hiện phù hợp nhất với phần trắc nghiệm/đáp án ngắn.' },
      { id: 'thpt_anh', label: 'Ngoại ngữ (Tiếng Anh)', durationMinutes: 60, questionCount: null },
      { id: 'thpt_ly', label: 'Vật lí (tổ hợp KHTN)', durationMinutes: 50, questionCount: null },
      { id: 'thpt_hoa', label: 'Hóa học (tổ hợp KHTN)', durationMinutes: 50, questionCount: null },
      { id: 'thpt_sinh', label: 'Sinh học (tổ hợp KHTN)', durationMinutes: 50, questionCount: null },
      { id: 'thpt_su', label: 'Lịch sử (tổ hợp KHXH)', durationMinutes: 50, questionCount: null },
      { id: 'thpt_dia', label: 'Địa lí (tổ hợp KHXH)', durationMinutes: 50, questionCount: null },
      { id: 'thpt_gdcd', label: 'Giáo dục công dân (tổ hợp KHXH)', durationMinutes: 50, questionCount: null },
    ],
  },
};

export function getExamSystem(id: ExamSystemId | undefined | null): ExamSystem {
  return (id && EXAM_SYSTEMS[id]) || EXAM_SYSTEMS.hsa;
}

export function getExamSystemSections(id: ExamSystemId | undefined | null): ExamSystemSection[] {
  return getExamSystem(id).sections;
}
