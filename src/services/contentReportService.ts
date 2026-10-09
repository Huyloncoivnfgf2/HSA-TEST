import { supabase } from './supabaseClient';

export type ContentReportComponent = 'question' | 'answer_key' | 'solution' | 'pdf' | 'other';
export type ContentReportCategory =
  | 'wrong_answer'
  | 'missing_or_wrong_content'
  | 'typo_formula_image'
  | 'wrong_or_missing_solution'
  | 'pdf_error'
  | 'other';
export type ContentReportStatus =
  | 'pending'
  | 'confirmed'
  | 'needs_info'
  | 'rejected'
  | 'resolved'
  | 'duplicate';

export interface ContentReport {
  id: string;
  reporterId: string;
  reporterEmail: string | null;
  examId: string;
  examTitle: string;
  examVersion: number | null;
  questionNumber: number;
  pageNumber: number | null;
  component: ContentReportComponent;
  category: ContentReportCategory;
  description: string;
  status: ContentReportStatus;
  ownerNote: string | null;
  duplicateOf: string | null;
  createdAt: number;
  updatedAt: number;
}

export const contentReportComponents: Array<{ id: ContentReportComponent; label: string }> = [
  { id: 'question', label: 'Câu hỏi / đề bài' },
  { id: 'answer_key', label: 'Đáp án đúng' },
  { id: 'solution', label: 'Lời giải' },
  { id: 'pdf', label: 'File PDF' },
  { id: 'other', label: 'Thành phần khác' },
];

export const contentReportCategories: Array<{ id: ContentReportCategory; label: string }> = [
  { id: 'wrong_answer', label: 'Sai đáp án' },
  { id: 'missing_or_wrong_content', label: 'Đề thiếu hoặc sai nội dung' },
  { id: 'typo_formula_image', label: 'Lỗi chữ, công thức hoặc hình' },
  { id: 'wrong_or_missing_solution', label: 'Lời giải sai hoặc thiếu' },
  { id: 'pdf_error', label: 'File PDF lỗi/mở không đúng' },
  { id: 'other', label: 'Lý do khác' },
];

export const contentReportStatuses: Array<{ id: ContentReportStatus; label: string }> = [
  { id: 'pending', label: 'Chờ xử lý' },
  { id: 'confirmed', label: 'Đã xác nhận lỗi' },
  { id: 'needs_info', label: 'Cần thêm thông tin' },
  { id: 'rejected', label: 'Không phải lỗi' },
  { id: 'resolved', label: 'Đã sửa xong' },
  { id: 'duplicate', label: 'Trùng báo lỗi khác' },
];

type ReportRow = {
  id: string;
  reporter_id: string;
  reporter_email: string | null;
  exam_id: string;
  exam_title: string;
  exam_version: number | null;
  question_number: number;
  page_number: number | null;
  component: ContentReportComponent;
  category: ContentReportCategory;
  description: string;
  status: ContentReportStatus;
  owner_note: string | null;
  duplicate_of: string | null;
  created_at: string;
  updated_at: string;
};

function mapReport(row: ReportRow): ContentReport {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reporterEmail: row.reporter_email,
    examId: row.exam_id,
    examTitle: row.exam_title,
    examVersion: row.exam_version,
    questionNumber: row.question_number,
    pageNumber: row.page_number,
    component: row.component,
    category: row.category,
    description: row.description,
    status: row.status,
    ownerNote: row.owner_note,
    duplicateOf: row.duplicate_of,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

function friendlyReportError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/content_reports|schema cache|relation .* does not exist/i.test(message)) {
    return new Error('Tính năng báo lỗi chưa được bật trên Supabase. Cần chạy lại schema.sql rồi thử lại.');
  }
  if (/23505|duplicate key|unique/i.test(message)) {
    return new Error('Bạn đã có một báo lỗi đang mở cho đúng câu và loại lỗi này. Owner sẽ xử lý báo lỗi đó.');
  }
  return error instanceof Error ? error : new Error('Không thể gửi báo lỗi.');
}

export async function createContentReport(input: {
  examId: string;
  examTitle: string;
  examVersion?: number;
  questionNumber: number;
  pageNumber?: number;
  component: ContentReportComponent;
  category: ContentReportCategory;
  description: string;
}): Promise<void> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình nên chưa gửi được báo lỗi.');
  const description = input.description.trim();
  if (description.length < 10) throw new Error('Hãy mô tả lỗi ít nhất 10 ký tự để Owner có đủ thông tin kiểm tra.');
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) throw new Error('Bạn cần đăng nhập để báo lỗi.');
    const { error } = await supabase.from('content_reports').insert({
      reporter_id: userData.user.id,
      reporter_email: userData.user.email ?? null,
      exam_id: input.examId,
      exam_title: input.examTitle,
      exam_version: input.examVersion ?? null,
      question_number: input.questionNumber,
      page_number: input.pageNumber ?? null,
      component: input.component,
      category: input.category,
      description,
    });
    if (error) throw error;
  } catch (error) {
    throw friendlyReportError(error);
  }
}

export async function listOwnerContentReports(): Promise<ContentReport[]> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw friendlyReportError(error);
  return ((data ?? []) as ReportRow[]).map(mapReport);
}

export async function listMyContentReports(): Promise<ContentReport[]> {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .eq('reporter_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw friendlyReportError(error);
  return ((data ?? []) as ReportRow[]).map(mapReport);
}

export async function updateContentReport(
  report: ContentReport,
  updates: { status: ContentReportStatus; ownerNote: string; duplicateOf?: string | null }
): Promise<void> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { error } = await supabase.from('content_reports').update({
    status: updates.status,
    owner_note: updates.ownerNote.trim() || null,
    duplicate_of: updates.status === 'duplicate' ? updates.duplicateOf ?? report.duplicateOf : report.duplicateOf,
    resolved_at: updates.status === 'resolved' ? new Date().toISOString() : null,
  }).eq('id', report.id);
  if (error) throw friendlyReportError(error);
}

export function reportStatusLabel(status: ContentReportStatus): string {
  return contentReportStatuses.find((item) => item.id === status)?.label ?? status;
}
export function reportCategoryLabel(category: ContentReportCategory): string {
  return contentReportCategories.find((item) => item.id === category)?.label ?? category;
}
export function reportComponentLabel(component: ContentReportComponent): string {
  return contentReportComponents.find((item) => item.id === component)?.label ?? component;
}
