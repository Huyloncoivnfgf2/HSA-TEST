import React from 'react';
import { AlertTriangle, BookOpenCheck, CalendarClock, Flame, Play, Sparkles } from 'lucide-react';
import type { SubjectType } from '../types/hsa';
import { SUBJECT_CONFIGS } from '../types/hsa';
import type { GoalRiskAssessment, LearningRecommendation } from '../types/analytics';

interface LearningInsightsProps {
  recommendations: LearningRecommendation[];
  goalRisks: Record<SubjectType, GoalRiskAssessment>;
  onPracticeTopic: (topic: string, subject: SubjectType) => void;
  onOpenMistakes: () => void;
  onStartSubject: (subject: SubjectType) => void;
}

const kindIcon = (kind: LearningRecommendation['kind']) => {
  switch (kind) {
    case 'review-mistakes':
      return <BookOpenCheck className="h-4 w-4" />;
    case 'daily-goal':
      return <CalendarClock className="h-4 w-4" />;
    case 'keep-streak':
      return <Flame className="h-4 w-4" />;
    default:
      return <Play className="h-4 w-4" />;
  }
};

export const LearningInsights: React.FC<LearningInsightsProps> = ({
  recommendations,
  goalRisks,
  onPracticeTopic,
  onOpenMistakes,
  onStartSubject,
}) => {
  const riskSubjects = (Object.keys(goalRisks) as SubjectType[]).filter(
    (subj) => goalRisks[subj].level !== 'achieved'
  );

  return (
    <div className="space-y-6">
    {riskSubjects.length > 0 && (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Cảnh báo mục tiêu & kế hoạch cải thiện</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {riskSubjects.map((subj) => {
            const risk = goalRisks[subj];
            const color = risk.level === 'high'
              ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
              : risk.level === 'medium'
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
            return (
              <article key={subj} className={`rounded-2xl border p-4 ${color}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold">{SUBJECT_CONFIGS[subj].shortName}</h3>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-extrabold dark:bg-slate-900/60">{risk.label}</span>
                </div>
                <p className="mt-2 text-xs leading-5 opacity-90">
                  Mục tiêu {risk.target}đ · hiện tại {risk.referenceScore !== null ? `${risk.referenceScore}đ` : 'chưa có điểm'}
                  {risk.gap !== null && risk.gap > 0 ? ` · còn thiếu ~${risk.gap}đ` : ''}
                  {risk.daysLeft !== null && risk.daysLeft >= 0 ? ` · còn ${risk.daysLeft} ngày` : ''}
                </p>
                <p className="mt-2 text-xs leading-5">{risk.plan}</p>
              </article>
            );
          })}
        </div>
      </section>
    )}

    {recommendations.length > 0 && (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Hoạt động học tiếp theo gợi ý</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {recommendations.map((rec) => (
          <article
            key={rec.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                {kindIcon(rec.kind)}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{rec.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{rec.detail}</p>
              </div>
            </div>
            {rec.kind === 'weak-topic' && rec.subject && rec.topic && (
              <button
                type="button"
                onClick={() => onPracticeTopic(rec.topic!, rec.subject!)}
                className="btn-primary shrink-0 px-3 py-2 text-xs"
              >
                Luyện ngay
              </button>
            )}
            {rec.kind === 'review-mistakes' && (
              <button
                type="button"
                onClick={onOpenMistakes}
                className="btn-primary shrink-0 px-3 py-2 text-xs"
              >
                Mở Sổ lỗi
              </button>
            )}
            {(rec.kind === 'first-test' || rec.kind === 'daily-goal' || rec.kind === 'keep-streak') && rec.subject && (
              <button
                type="button"
                onClick={() => onStartSubject(rec.subject!)}
                className="btn-primary shrink-0 px-3 py-2 text-xs"
              >
                Chọn bài
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
    )}
    </div>
  );
};
