import React from 'react';
import { SubjectType, SUBJECT_CONFIGS } from '../types/hsa';
import { AnalyticsSummary } from '../types/analytics';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ArrowRight,
  BookOpen,
  Award,
  Zap,
} from 'lucide-react';

interface HomeScoreCardsProps {
  analytics: AnalyticsSummary;
  onSelectSubjectAnalytics: (subject: SubjectType) => void;
  onOpenGoalSettings: () => void;
}

export const HomeScoreCards: React.FC<HomeScoreCardsProps> = ({
  analytics,
  onSelectSubjectAnalytics,
  onOpenGoalSettings,
}) => {
  const {
    goals,
    latestExamScores,
    fiveExamAverage,
    scoreTrends,
    recentScoreHistory,
    practiceAccuracy,
  } = analytics;

  const subjectTitles: Record<SubjectType, { title: string; short: string; color: string; bg: string }> = {
    math: {
      title: 'ĐIỂM ĐỊNH LƯỢNG CỦA BẠN',
      short: 'Toán học',
      color: 'text-cyan-400',
      bg: 'bg-cyan-400',
    },
    literature: {
      title: 'ĐIỂM ĐỊNH TÍNH CỦA BẠN',
      short: 'Ngữ văn',
      color: 'text-violet-400',
      bg: 'bg-violet-400',
    },
    science: {
      title: 'ĐIỂM KHOA HỌC CỦA BẠN',
      short: 'Khoa học',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400',
    },
  };

  // Helper to render mini SVG sparkline
  const renderSparkline = (data: number[], target: number, max: number, strokeColor: string) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-10 flex items-center justify-center text-[11px] text-slate-400 italic">
          Chưa có bài thi nào
        </div>
      );
    }

    if (data.length === 1) {
      return (
        <div className="h-10 flex items-center gap-2">
          <div className="text-xs font-bold text-slate-500">Lần 1: {data[0]}đ</div>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full ${strokeColor}`}
              style={{ width: `${Math.min(100, (data[0] / max) * 100)}%` }}
            />
          </div>
        </div>
      );
    }

    const width = 160;
    const height = 40;
    const minVal = Math.min(...data, target) * 0.8;
    const maxVal = Math.max(...data, target, max) * 1.05;
    const range = maxVal - minVal || 1;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * (width - 12) + 6;
        const y = height - ((val - minVal) / range) * (height - 12) - 6;
        return `${x},${y}`;
      })
      .join(' ');

    // Target reference line
    const targetY = height - ((target - minVal) / range) * (height - 12) - 6;

    return (
      <div className="relative w-full h-10 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Target dotted line */}
          <line
            x1="0"
            y1={targetY}
            x2={width}
            y2={targetY}
            stroke="#94a3b8"
            strokeDasharray="2,3"
            strokeWidth="1"
            opacity="0.6"
          />
          {/* Trend polyline */}
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {/* Dots on points */}
          {data.map((val, idx) => {
            const x = (idx / (data.length - 1)) * (width - 12) + 6;
            const y = height - ((val - minVal) / range) * (height - 12) - 6;
            const isLast = idx === data.length - 1;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={isLast ? 3.5 : 2}
                fill={isLast ? 'currentColor' : '#ffffff'}
                stroke="currentColor"
                strokeWidth={isLast ? 1 : 1.5}
              />
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-600" />
            Tiến độ & Điểm số kiểm tra
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Dữ liệu tính từ các bài <strong>Kiểm tra bấm giờ</strong>. Bấm vào từng thẻ để xem phân tích chi tiết.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenGoalSettings}
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <Target className="w-3.5 h-3.5" />
          <span>Chỉnh mục tiêu</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['math', 'literature', 'science'] as SubjectType[]).map((subj) => {
          const cfg = subjectTitles[subj];
          const latest = latestExamScores[subj];
          const avg5 = fiveExamAverage[subj];
          const trend = scoreTrends[subj];
          const history = recentScoreHistory[subj];

          let target = goals.targetMath;
          if (subj === 'literature') target = goals.targetLiterature;
          if (subj === 'science') target = goals.targetScience;

          const practice = practiceAccuracy[subj];

          return (
            <div
              key={subj}
              onClick={() => onSelectSubjectAnalytics(subj)}
              className={`glass-card group relative p-6 border-l-4 ${
                subj === 'math'
                  ? 'border-l-cyan-400'
                  : subj === 'literature'
                  ? 'border-l-violet-500'
                  : 'border-l-emerald-400'
              } hover:glow-cyan hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between`}
            >
              {/* Top Card Label */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-extrabold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    {cfg.title}
                  </span>
                  <div className="flex items-center gap-1">
                    {trend === 'up' ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        <TrendingUp className="w-3 h-3 mr-0.5" /> Tăng
                      </span>
                    ) : trend === 'down' ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                        <TrendingDown className="w-3 h-3 mr-0.5" /> Giảm
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        <Minus className="w-3 h-3 mr-0.5" /> Ổn định
                      </span>
                    )}
                  </div>
                </div>

                {/* Score Big Display */}
                <div className="my-4 flex items-baseline justify-between">
                  <div>
                    <div className="font-display text-4xl font-bold text-white">
                      {latest !== null ? (
                        <>
                          {latest}
                          <span className="text-sm font-semibold text-slate-400 ml-1">
                            /{goals.maxScorePerSubject}
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl text-slate-400 font-normal">Chưa thi</span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">Điểm gần nhất</span>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                      {target} <span className="text-xs font-normal text-slate-400">đ</span>
                    </div>
                    <span className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                      <Target className="w-3 h-3" /> Mục tiêu
                    </span>
                  </div>
                </div>

                {/* Sparkline Chart */}
                <div className={`my-2 ${cfg.color}`}>
                  {renderSparkline(history, target, goals.maxScorePerSubject, cfg.bg)}
                </div>
              </div>

              {/* Bottom Meta & Practice Accuracy */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Trung bình 5 bài gần nhất:</span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {avg5 !== null ? `${avg5} đ` : '--'}
                  </strong>
                </div>

                {practice && practice.totalAnswered > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Độ chính xác ôn tập:
                    </span>
                    <strong className="text-amber-600 dark:text-amber-400">
                      {practice.accuracy}% ({practice.totalAnswered} câu)
                    </strong>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition">
                  <span>Xem phân tích chi tiết</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
