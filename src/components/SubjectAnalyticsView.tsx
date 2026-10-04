import React, { useState } from 'react';
import { SubjectType, ScienceSubSubject, Question, SUBJECT_CONFIGS } from '../types/hsa';
import { UserGoals, TopicStat } from '../types/analytics';
import { calculateTopicStats, getWeakestTopics } from '../services/analyticsService';
import {
  ArrowLeft,
  Target,
  AlertTriangle,
  Play,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Clock,
  BookOpen,
  Sparkles,
  Info,
  Filter,
} from 'lucide-react';

interface SubjectAnalyticsViewProps {
  subject: SubjectType;
  goals: UserGoals;
  questions: Question[];
  onBack: () => void;
  onPracticeTopic: (topic: string, subject: SubjectType) => void;
}

export const SubjectAnalyticsView: React.FC<SubjectAnalyticsViewProps> = ({
  subject,
  goals,
  questions,
  onBack,
  onPracticeTopic,
}) => {
  const config = SUBJECT_CONFIGS[subject];
  const topicStats = calculateTopicStats(subject);
  const weakestTopics = getWeakestTopics(subject);

  // SubSubject filter for Science
  const [selectedSubSubject, setSelectedSubSubject] = useState<ScienceSubSubject | 'all'>('all');

  let targetScore = goals.targetMath;
  if (subject === 'literature') targetScore = goals.targetLiterature;
  if (subject === 'science') targetScore = goals.targetScience;

  // Calculate overall metrics for this subject
  const totalAttempted = topicStats.reduce((acc, t) => acc + t.totalAnswered, 0);
  const totalCorrect = topicStats.reduce((acc, t) => acc + t.correctCount, 0);
  const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // Estimation: points needed to hit target
  const currentEstScore = Math.round((overallAccuracy / 100) * goals.maxScorePerSubject);
  const scoreGap = Math.max(0, targetScore - currentEstScore);

  // Filter topics for science
  const displayedTopicStats = topicStats.filter((t) => {
    if (subject !== 'science' || selectedSubSubject === 'all') return true;
    return t.subSubject === selectedSubSubject;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Phân tích chuyên sâu: {config.shortName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                HSA
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Đánh giá chi tiết tỉ lệ đúng, thời gian làm bài và chiến lược cải thiện điểm
            </p>
          </div>
        </div>

        {/* Target Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <Target className="w-5 h-5 text-emerald-600" />
          <div className="text-xs">
            <span className="text-slate-400 block">Mục tiêu:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
              {targetScore} / {goals.maxScorePerSubject} điểm
            </strong>
          </div>
        </div>
      </div>

      {/* Goal Estimation Insight Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white shadow-xl space-y-4 border border-emerald-800/40">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Ước tính lộ trình đạt mục tiêu</span>
        </div>

        <div className="text-base sm:text-lg font-medium leading-relaxed max-w-3xl">
          {scoreGap > 0 ? (
            <>
              Để đạt mục tiêu <strong className="text-emerald-300">{targetScore} điểm</strong> môn {config.shortName}, bạn cần tăng thêm ít nhất <strong className="text-amber-300">+{scoreGap} câu đúng</strong> trong bài thi.
              {weakestTopics.length > 0 && (
                <>
                  {' '}Hãy ưu tiên khắc phục các chuyên đề:{' '}
                  <span className="underline decoration-emerald-400 underline-offset-4 font-semibold text-emerald-200">
                    {weakestTopics.slice(0, 3).map((w) => w.topic).join(', ')}
                  </span>.
                </>
              )}
            </>
          ) : (
            <>
              Tuyệt vời! Hiệu suất hiện tại của bạn đã đạt hoặc vượt mục tiêu{' '}
              <strong className="text-emerald-300">{targetScore} điểm</strong>. Hãy duy trì luyện tập đều đặn để giữ vững phong độ!
            </>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-white/10">
            <div className="text-slate-300">Đã làm kiểm tra</div>
            <div className="text-lg font-bold mt-0.5">{totalAttempted} câu</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/10">
            <div className="text-slate-300">Độ chính xác chung</div>
            <div className="text-lg font-bold mt-0.5 text-emerald-300">{overallAccuracy}%</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/10">
            <div className="text-slate-300">Điểm ước lượng</div>
            <div className="text-lg font-bold mt-0.5">{currentEstScore} đ</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/10">
            <div className="text-slate-300">Khoảng cách mục tiêu</div>
            <div className="text-lg font-bold mt-0.5 text-amber-300">
              {scoreGap > 0 ? `Thiếu ${scoreGap} đ` : 'Đã đạt'}
            </div>
          </div>
        </div>
      </div>

      {/* Weakest Topics (Cần khắc phục) Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Chuyên đề cần khắc phục ưu tiên
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            (Chỉ kết luận khi đã làm tối thiểu 5 câu kiểm tra)
          </span>
        </div>

        {weakestTopics.length === 0 ? (
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs sm:text-sm text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            Không có chủ đề nào bị yếu (&lt;75% với trên 5 câu đã làm) hoặc chưa đủ dữ liệu kiểm tra.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weakestTopics.slice(0, 4).map((weak, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-950/60 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      Mức độ ưu tiên #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      Đúng {weak.accuracy}%
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {weak.topic}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Đã làm {weak.totalAnswered} câu • Sai {weak.wrongCount} câu • Thời gian trung bình: {weak.avgTimeSeconds}s/câu
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onPracticeTopic(weak.topic, subject)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Luyện riêng chủ đề này (ưu tiên câu sai)</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Science SubSubject Tabs (if science) */}
      {subject === 'science' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Phân môn:
          </span>
          {(['all', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí'] as const).map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubSubject(sub)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedSubSubject === sub
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {sub === 'all' ? 'Tất cả 5 môn' : sub}
            </button>
          ))}
        </div>
      )}

      {/* Full Topic Performance Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          Bảng chi tiết theo từng chuyên đề ({displayedTopicStats.length})
        </h2>

        {displayedTopicStats.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
            Chưa có dữ liệu bài thi kiểm tra cho phần này. Hãy hoàn thành ít nhất 1 bài kiểm tra để xem số liệu phân tích.
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Chuyên đề</th>
                    <th className="py-3.5 px-3 text-center">Đã làm</th>
                    <th className="py-3.5 px-3 text-center">Tỉ lệ đúng</th>
                    <th className="py-3.5 px-3 text-center">Thời gian TB</th>
                    <th className="py-3.5 px-3 text-center">Xu hướng</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedTopicStats.map((item, idx) => {
                    // Badge color rules: red (<50%), yellow (50-75%), green (>75%)
                    let badgeClass = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300';
                    if (item.accuracy < 50) {
                      badgeClass = 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300';
                    } else if (item.accuracy <= 75) {
                      badgeClass = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300';
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-4 px-4 sm:px-6 font-semibold text-slate-900 dark:text-slate-100">
                          <div>
                            <span>{item.topic}</span>
                            {item.subSubject && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {item.subSubject}
                              </span>
                            )}
                          </div>
                          {item.isInsufficientData && (
                            <span className="text-[10px] text-slate-400 italic block mt-0.5">
                              (Chưa đủ dữ liệu: {item.totalAnswered}/5 câu)
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                          {item.totalAnswered}
                        </td>

                        <td className="py-4 px-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-xl font-extrabold ${badgeClass}`}>
                            {item.accuracy}%
                          </span>
                        </td>

                        <td className="py-4 px-3 text-center text-slate-500">
                          {item.avgTimeSeconds}s / câu
                        </td>

                        <td className="py-4 px-3 text-center">
                          {item.trend === 'up' ? (
                            <span className="inline-flex items-center text-emerald-600 font-bold">
                              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Tăng
                            </span>
                          ) : item.trend === 'down' ? (
                            <span className="inline-flex items-center text-rose-600 font-bold">
                              <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> Giảm
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-slate-400">
                              <Minus className="w-3.5 h-3.5 mr-0.5" /> Ổn định
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onPracticeTopic(item.topic, subject)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold text-[11px] transition"
                          >
                            <Play className="w-3 h-3" />
                            <span>Luyện chủ đề</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
