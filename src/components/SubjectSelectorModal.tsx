import React from 'react';
import { SubjectType, SUBJECT_CONFIGS } from '../types/hsa';
import { BookOpen, Clock, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface SubjectSelectorModalProps {
  subject: SubjectType | null;
  questionCount: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'study' | 'exam', subject: SubjectType) => void;
}

export const SubjectSelectorModal: React.FC<SubjectSelectorModalProps> = ({
  subject,
  questionCount,
  isOpen,
  onClose,
  onSelectMode,
}) => {
  if (!isOpen || !subject) return null;

  const config = SUBJECT_CONFIGS[subject];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ĐHQGHN • HSA Prep</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {config.shortName}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            {config.title} • Ngân hàng hiện có <span className="font-semibold text-emerald-600 dark:text-emerald-400">{questionCount} câu hỏi</span>
          </p>
        </div>

        {/* Mode Options */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Practice Mode */}
          <button
            onClick={() => onSelectMode('study', subject)}
            className="group flex flex-col items-start p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-800/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-left transition-all duration-200 shadow-xs hover:shadow-md"
          >
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
              Ôn tập
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Không giới hạn thời gian. Xem ngay đáp án và lời giải chi tiết sau mỗi câu.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Ghi nhớ tiến độ</span>
            </div>
          </button>

          {/* Exam Mode */}
          <button
            onClick={() => onSelectMode('exam', subject)}
            className="group flex flex-col items-start p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 text-left transition-all duration-200 shadow-xs hover:shadow-md"
          >
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
              Kiểm tra
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Thời gian {config.durationMinutes} phút. Bấm giờ đếm ngược, bảng số câu, nộp bài tính điểm.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4 mr-1.5" />
              <span>Chuẩn cấu trúc thi</span>
            </div>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Bạn cũng có thể chọn chế độ <strong>Kiểm tra toàn bộ 3 môn</strong> ở trang chủ.
          </p>
        </div>
      </div>
    </div>
  );
};
