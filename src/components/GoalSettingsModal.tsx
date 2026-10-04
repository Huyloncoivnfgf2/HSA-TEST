import React, { useState } from 'react';
import { UserGoals } from '../types/analytics';
import {
  X,
  Target,
  Calendar,
  Save,
  Sliders,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface GoalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: UserGoals;
  onSaveGoals: (goals: UserGoals) => void;
}

export const GoalSettingsModal: React.FC<GoalSettingsModalProps> = ({
  isOpen,
  onClose,
  goals,
  onSaveGoals,
}) => {
  const [targetMath, setTargetMath] = useState<number>(goals.targetMath);
  const [targetLiterature, setTargetLiterature] = useState<number>(goals.targetLiterature);
  const [targetScience, setTargetScience] = useState<number>(goals.targetScience);
  const [examDate, setExamDate] = useState<string>(
    goals.examDate || new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [maxScorePerSubject, setMaxScorePerSubject] = useState<number>(
    goals.maxScorePerSubject || 50
  );
  const [scaleFactor, setScaleFactor] = useState<number>(goals.scaleFactor || 1);
  const [dailyQuestionGoal, setDailyQuestionGoal] = useState<number>(
    goals.dailyQuestionGoal || 20
  );

  if (!isOpen) return null;

  const targetTotal = targetMath + targetLiterature + targetScience;

  // Days left calculation
  const calculateDaysLeft = () => {
    if (!examDate) return null;
    const targetTime = new Date(examDate).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((targetTime - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const daysLeft = calculateDaysLeft();

  const handleSave = () => {
    onSaveGoals({
      targetMath,
      targetLiterature,
      targetScience,
      targetTotal,
      examDate,
      maxScorePerSubject,
      scaleFactor,
      dailyQuestionGoal,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Thiết lập mục tiêu & Cài đặt
              </h2>
              <p className="text-xs text-slate-500">Mục tiêu điểm số và ngày đếm ngược kỳ thi HSA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exam Date Countdown */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Ngày thi dự kiến
              </span>
            </div>
            {daysLeft !== null && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-xs">
                Còn {daysLeft} ngày
              </span>
            )}
          </div>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Target Scores */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Mục tiêu điểm số từng phần (Thang 150)
          </h4>

          <div className="grid grid-cols-3 gap-3">
            {/* Math */}
            <div className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-1">
              <label className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                Toán học
              </label>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  min={0}
                  max={maxScorePerSubject}
                  value={targetMath}
                  onChange={(e) => setTargetMath(Math.min(maxScorePerSubject, Math.max(0, Number(e.target.value))))}
                  className="w-full p-1.5 text-base font-extrabold text-blue-600 dark:text-blue-400 bg-transparent border-b border-blue-300 dark:border-blue-700 focus:outline-hidden"
                />
                <span className="text-xs text-slate-400">/{maxScorePerSubject}</span>
              </div>
            </div>

            {/* Literature */}
            <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-1">
              <label className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                Ngữ văn
              </label>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  min={0}
                  max={maxScorePerSubject}
                  value={targetLiterature}
                  onChange={(e) => setTargetLiterature(Math.min(maxScorePerSubject, Math.max(0, Number(e.target.value))))}
                  className="w-full p-1.5 text-base font-extrabold text-amber-600 dark:text-amber-400 bg-transparent border-b border-amber-300 dark:border-amber-700 focus:outline-hidden"
                />
                <span className="text-xs text-slate-400">/{maxScorePerSubject}</span>
              </div>
            </div>

            {/* Science */}
            <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-1">
              <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                Khoa học
              </label>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  min={0}
                  max={maxScorePerSubject}
                  value={targetScience}
                  onChange={(e) => setTargetScience(Math.min(maxScorePerSubject, Math.max(0, Number(e.target.value))))}
                  className="w-full p-1.5 text-base font-extrabold text-emerald-600 dark:text-emerald-400 bg-transparent border-b border-emerald-300 dark:border-emerald-700 focus:outline-hidden"
                />
                <span className="text-xs text-slate-400">/{maxScorePerSubject}</span>
              </div>
            </div>
          </div>

          {/* Total Goal Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Tổng mục tiêu bài thi:
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {targetTotal} / {maxScorePerSubject * 3} điểm
            </span>
          </div>
        </div>

        {/* Daily Goal & Scoring Scale Settings */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            Tùy biến thang điểm & Thói quen học
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-500 font-semibold block mb-1">
                Mục tiêu số câu mỗi ngày:
              </label>
              <input
                type="number"
                min={5}
                max={200}
                value={dailyQuestionGoal}
                onChange={(e) => setDailyQuestionGoal(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="text-slate-500 font-semibold block mb-1">
                Điểm tối đa mỗi phần:
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={maxScorePerSubject}
                onChange={(e) => setMaxScorePerSubject(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <Save className="w-4 h-4" />
            <span>Lưu mục tiêu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
