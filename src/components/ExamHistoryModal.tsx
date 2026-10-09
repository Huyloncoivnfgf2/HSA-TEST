import React, { useState } from 'react';
import { ExamRecord } from '../types/analytics';
import { SUBJECT_CONFIGS, SubjectType } from '../types/hsa';
import {
  X,
  History,
  Calendar,
  Clock,
  Trophy,
  ArrowRight,
  Sparkles,
  Eye,
} from 'lucide-react';

interface ExamHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ExamRecord[];
  onReviewExamRecord: (record: ExamRecord) => void;
}

export const ExamHistoryModal: React.FC<ExamHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onReviewExamRecord,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Lịch sử kiểm tra ({history.length} bài)
              </h2>
              <p className="text-xs text-slate-500">
                Lưu lại toàn bộ các lần thi thử, điểm số và nhận xét đánh giá của AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Trophy className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-sm font-semibold">Chưa có bài thi nào được ghi nhận</p>
              <p className="text-xs max-w-sm mx-auto">
                Hãy bắt đầu làm bài trong chế độ "Kiểm tra" để hệ thống tính điểm và lưu lại lịch sử.
              </p>
            </div>
          ) : (
            history.map((rec) => {
              const dateStr = new Date(rec.date).toLocaleString('vi-VN');
              const minutes = Math.round(rec.timeSpentSeconds / 60);

              return (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                        {rec.pdfExamTitle
                          ? `Đề PDF: ${rec.pdfExamTitle}`
                          : rec.mode === 'full-hsa' ? 'Thi toàn bộ HSA (3 phần)' : 'Kiểm tra môn tự chọn'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {dateStr}
                      </span>
                    </div>

                    {/* Breakdown pill tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      {Object.entries(rec.subjectScores).map(([sub, scoreObj]) => (
                        <span
                          key={sub}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]"
                        >
                          {SUBJECT_CONFIGS[sub as SubjectType]?.shortName || sub}:{' '}
                          <strong>
                            {scoreObj.score}/{scoreObj.maxScore}đ
                          </strong>
                        </span>
                      ))}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {minutes} phút
                      </span>
                    </div>

                    {rec.aiFeedback && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1 mt-1">
                        AI: "{rec.aiFeedback}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        {rec.totalScore}
                        <span className="text-xs font-normal text-slate-400 ml-1">
                          /{rec.totalMaxScore}đ
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">Tổng điểm</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onReviewExamRecord(rec);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 text-xs font-bold rounded-xl transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem lại</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
