import React, { useState } from 'react';
import { Flag, Send, X } from 'lucide-react';
import type { PdfExam } from '../types/pdfExam';
import {
  contentReportCategories,
  contentReportComponents,
  createContentReport,
  type ContentReportCategory,
  type ContentReportComponent,
} from '../services/contentReportService';

interface PdfContentReportModalProps {
  exam: PdfExam;
  questionNumber: number;
  pageNumber: number;
  examVersion?: number;
  onClose: () => void;
}

export const PdfContentReportModal: React.FC<PdfContentReportModalProps> = ({
  exam,
  questionNumber,
  pageNumber,
  examVersion,
  onClose,
}) => {
  const [component, setComponent] = useState<ContentReportComponent>('question');
  const [category, setCategory] = useState<ContentReportCategory>('missing_or_wrong_content');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSending(true);
    try {
      await createContentReport({
        examId: exam.id,
        examTitle: exam.title,
        examVersion,
        questionNumber,
        pageNumber,
        component,
        category,
        description,
      });
      setSent(true);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Không thể gửi báo lỗi.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Báo lỗi nội dung">
      <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-extrabold"><Flag className="h-4 w-4 text-amber-600" /> Báo lỗi nội dung</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {exam.title} · Câu {questionNumber} · Trang {pageNumber}
              {examVersion ? ` · Phiên bản đề v${examVersion}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        {sent ? (
          <div className="mt-5 space-y-4">
            <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Đã gửi báo lỗi. Owner sẽ kiểm tra và phản hồi trong Hồ sơ của bạn.</p>
            <div className="flex justify-end"><button type="button" onClick={onClose} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white dark:bg-slate-700">Đóng</button></div>
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
            <label className="block space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
              Thành phần bị lỗi
              <select value={component} onChange={(event) => setComponent(event.target.value as ContentReportComponent)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-normal dark:border-slate-700 dark:bg-slate-800 sm:text-sm">
                {contentReportComponents.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
              Loại lỗi
              <select value={category} onChange={(event) => setCategory(event.target.value as ContentReportCategory)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-normal dark:border-slate-700 dark:bg-slate-800 sm:text-sm">
                {contentReportCategories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
              Lý do / bằng chứng
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Mô tả cụ thể lỗi bạn thấy, ví dụ đáp án đúng phải là... vì..." className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-normal dark:border-slate-700 dark:bg-slate-800 sm:text-sm" />
              <span className="text-[11px] font-normal text-slate-500">Cần ít nhất 10 ký tự để Owner có đủ thông tin kiểm tra.</span>
            </label>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Hủy</button>
              <button type="submit" disabled={isSending || description.trim().length < 10} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-40"><Send className="h-3.5 w-3.5" /> Gửi báo lỗi</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
