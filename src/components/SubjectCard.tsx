import React from 'react';
import { SubjectType, SUBJECT_CONFIGS } from '../types/hsa';
import { Calculator, BookOpen, Atom, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

interface SubjectCardProps {
  subject: SubjectType;
  questionCount: number;
  studiedCount?: number;
  onClick: () => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  questionCount,
  studiedCount = 0,
  onClick,
}) => {
  const config = SUBJECT_CONFIGS[subject];

  const getIcon = () => {
    switch (subject) {
      case 'math':
        return <Calculator className="w-7 h-7 text-blue-600 dark:text-blue-400" />;
      case 'literature':
        return <BookOpen className="w-7 h-7 text-amber-600 dark:text-amber-400" />;
      case 'science':
        return <Atom className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Background soft glow on hover */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 group-hover:bg-emerald-500/10 rounded-full blur-2xl transition duration-300 pointer-events-none" />

      <div>
        {/* Top Icon & Badge */}
        <div className="flex items-center justify-between">
          <div className={`p-3.5 rounded-2xl ${config.bgColor} group-hover:scale-105 transition`}>
            {getIcon()}
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{config.durationMinutes} phút</span>
          </span>
        </div>

        {/* Title & Info */}
        <div className="mt-5 space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
            {config.shortName}
          </h3>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {config.title.split(':')[0]}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {config.description}
          </p>
        </div>
      </div>

      {/* Bottom stats & CTA */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block" />
            <span>{questionCount} câu hỏi</span>
          </div>
          {studiedCount > 0 && (
            <span className="text-[11px] text-slate-400">
              • Đã ôn {studiedCount}
            </span>
          )}
        </div>

        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-slate-400 transition">
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
        </div>
      </div>
    </div>
  );
};
