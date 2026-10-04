import React, { useState } from 'react';
import { Question, QuestionReportReason } from '../types/hsa';
import { AlertTriangle, X, Send, ShieldAlert } from 'lucide-react';

interface ReportQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  currentIndex: number;
  onConfirmReport: (reason: QuestionReportReason, note?: string) => void;
}

export const ReportQuestionModal: React.FC<ReportQuestionModalProps> = ({
  isOpen,
  onClose,
  question,
  currentIndex,
  onConfirmReport,
}) => {
  const [selectedReason, setSelectedReason] = useState<QuestionReportReason>('sai đáp án');
  const [note, setNote] = useState<string>('');

  if (!isOpen || !question) return null;

  const reasonsList: Array<{ id: QuestionReportReason; label: string; desc: string }> = [
    { id: 'sai đáp án', label: 'Sai đáp án', desc: 'Đáp án cung cấp không đúng với phương pháp chuẩn' },
    { id: 'đề thiếu/sai nội dung', label: 'Đề thiếu hoặc sai nội dung', desc: 'Thiếu dữ kiện, thiếu phương án, hoặc sai đề' },
    { id: 'công thức hỏng', label: 'Công thức toán học bị hỏng', desc: 'Ký hiệu LaTeX hiển thị sai hoặc không đọc được' },
    { id: 'hình lỗi', label: 'Hình ảnh / Biểu đồ lỗi', desc: 'Hình bị mờ, không tải được hoặc thiếu đồ thị' },
    { id: 'khác', label: 'Lý do khác', desc: 'Các vấn đề phát sinh khác' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReport(selectedReason, note.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Báo lỗi câu hỏi #{currentIndex + 1}
              </h2>
              <p className="text-xs text-slate-500">
                Câu này sẽ được tính là bỏ trống (0 điểm) và đưa vào danh sách sửa sau khi nộp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chọn lý do báo lỗi:
            </label>

            <div className="space-y-1.5">
              {reasonsList.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    selectedReason === r.id
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.id}
                    checked={selectedReason === r.id}
                    onChange={() => setSelectedReason(r.id)}
                    className="mt-1 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {r.label}
                    </div>
                    <div className="text-[11px] text-slate-500">{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Mô tả chi tiết (tuỳ chọn):
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú cụ thể để bạn sửa lại sau khi nộp bài..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Xác nhận báo lỗi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
