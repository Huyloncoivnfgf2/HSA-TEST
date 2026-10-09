import React from 'react';
import type { User } from '@supabase/supabase-js';
import { CalendarDays, Flame, History, Target, Trophy, X } from 'lucide-react';
import type { AnalyticsSummary, ExamRecord } from '../types/analytics';

interface LearnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  isAdmin: boolean;
  analytics: AnalyticsSummary;
  history: ExamRecord[];
  mistakeCount: number;
  streakDays: number;
}

export const LearnerProfileModal: React.FC<LearnerProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  isAdmin,
  analytics,
  history,
  mistakeCount,
  streakDays,
}) => {
  if (!isOpen) return null;

  const recentHistory = [...history]
    .sort((first, second) => second.date - first.date)
    .slice(0, 5);
  const totalAnswered = Object.values(analytics.practiceAccuracy)
    .reduce((sum, item) => sum + item.totalAnswered, 0);
  const weightedCorrect = Object.values(analytics.practiceAccuracy)
    .reduce((sum, item) => sum + (item.accuracy / 100) * item.totalAnswered, 0);
  const overallAccuracy = totalAnswered > 0
    ? Math.round((weightedCorrect / totalAnswered) * 100)
    : 0;
  const displayName = user.user_metadata.full_name ?? user.email ?? 'Người học';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Hồ sơ người học">
      <section className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-extrabold">Hồ sơ người học</h2>
            <p className="mt-1 text-xs text-slate-500">Thông tin tài khoản và hoạt động học gần đây của chính bạn</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </header>

        <div className="space-y-5 overflow-y-auto p-5">
          <div className="flex items-center gap-3">
            {user.user_metadata.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="" className="h-12 w-12 rounded-full" />
              : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{displayName.slice(0, 1).toUpperCase()}</div>}
            <div className="min-w-0">
              <p className="truncate font-bold">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {isAdmin ? 'Owner' : 'Learner'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <Trophy className="mb-2 h-4 w-4 text-amber-500" />
              <p className="text-lg font-extrabold">{analytics.totalExamsTaken}</p>
              <p className="text-[11px] text-slate-500">Bài đã ghi nhận</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <Target className="mb-2 h-4 w-4 text-emerald-500" />
              <p className="text-lg font-extrabold">{overallAccuracy}%</p>
              <p className="text-[11px] text-slate-500">Tỉ lệ đúng luyện tập</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <Flame className="mb-2 h-4 w-4 text-orange-500" />
              <p className="text-lg font-extrabold">{streakDays} ngày</p>
              <p className="text-[11px] text-slate-500">Chuỗi học liên tục</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <History className="mb-2 h-4 w-4 text-rose-500" />
              <p className="text-lg font-extrabold">{mistakeCount}</p>
              <p className="text-[11px] text-slate-500">Câu đang trong Sổ lỗi</p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
            <div className="flex items-center gap-2 font-bold"><CalendarDays className="h-4 w-4 text-indigo-500" /> Mục tiêu hiện tại</div>
            <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
              Tổng mục tiêu: <strong>{analytics.goals.targetTotal} điểm</strong> · Định lượng {analytics.goals.targetMath} · Định tính {analytics.goals.targetLiterature} · Khoa học {analytics.goals.targetScience}
              {analytics.goals.examDate ? <> · Ngày thi: <strong>{analytics.goals.examDate}</strong></> : null}
              <> · Mục tiêu mỗi ngày: <strong>{analytics.goals.dailyQuestionGoal} câu</strong></>
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-extrabold">Hoạt động gần đây</h3>
            {recentHistory.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700">Chưa có hoạt động học thật nào được ghi nhận.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {recentHistory.map((record) => (
                  <li key={record.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{record.pdfExamTitle ? `Đề PDF: ${record.pdfExamTitle}` : 'Bài kiểm tra HSA'}</p>
                      <p className="text-[11px] text-slate-500">{new Date(record.date).toLocaleString('vi-VN')}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {record.totalScore}/{record.totalMaxScore}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
