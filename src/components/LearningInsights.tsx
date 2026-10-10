import React from 'react';
import { BookOpenCheck, CalendarClock, Flame, Play, Sparkles } from 'lucide-react';
import type { SubjectType } from '../types/hsa';
import type { LearningRecommendation } from '../types/analytics';

interface LearningInsightsProps {
  recommendations: LearningRecommendation[];
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
  onPracticeTopic,
  onOpenMistakes,
  onStartSubject,
}) => {
  if (!recommendations.length) return null;

  return (
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
                className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Luyện ngay
              </button>
            )}
            {rec.kind === 'review-mistakes' && (
              <button
                type="button"
                onClick={onOpenMistakes}
                className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Mở Sổ lỗi
              </button>
            )}
            {(rec.kind === 'first-test' || rec.kind === 'daily-goal' || rec.kind === 'keep-streak') && rec.subject && (
              <button
                type="button"
                onClick={() => onStartSubject(rec.subject!)}
                className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Chọn bài
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};
