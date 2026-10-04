import React, { useState } from 'react';
import { Rating } from 'ts-fsrs';
import { Question, SUBJECT_CONFIGS } from '../types/hsa';
import {
  FSRSCardData,
  processFSRSReview,
  calculateFSRSStats,
  groupDueQuestionsForReview,
} from '../services/fsrsService';
import { MathRenderer } from './MathRenderer';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Brain,
  Award,
  Clock,
} from 'lucide-react';

interface FSRSReviewSessionProps {
  cards: FSRSCardData[];
  questions: Question[];
  onBack: () => void;
  onUpdateCards: (updatedCards: FSRSCardData[]) => void;
}

export const FSRSReviewSession: React.FC<FSRSReviewSessionProps> = ({
  cards,
  questions,
  onBack,
  onUpdateCards,
}) => {
  const [allCards, setAllCards] = useState<FSRSCardData[]>(cards);
  const now = new Date();

  // Group due cards by group or single
  const dueUnits = groupDueQuestionsForReview(
    allCards.filter((c) => new Date(c.card.due).getTime() <= now.getTime()),
    questions
  );

  const [currentUnitIndex, setCurrentUnitIndex] = useState<number>(0);
  const [currentSubQuestionIndex, setCurrentSubQuestionIndex] = useState<number>(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | string | null>(null);
  const [isMobileGroupOpen, setIsMobileGroupOpen] = useState<boolean>(true);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [reviewedInSessionCount, setReviewedInSessionCount] = useState<number>(0);

  const stats = calculateFSRSStats(allCards, now);

  const currentUnit = dueUnits[currentUnitIndex];
  const currentQuestion = currentUnit?.questions[currentSubQuestionIndex];
  const currentCard = currentUnit?.cards[currentSubQuestionIndex];

  const handleRate = (rating: Rating) => {
    if (!currentCard || !currentQuestion) return;

    const updatedCard = processFSRSReview(currentCard, rating, new Date());
    const nextAllCards = allCards.map((c) =>
      c.questionId === updatedCard.questionId ? updatedCard : c
    );

    setAllCards(nextAllCards);
    onUpdateCards(nextAllCards);
    setReviewedInSessionCount((prev) => prev + 1);

    // Advance to next question in group or next unit
    if (currentSubQuestionIndex < currentUnit.questions.length - 1) {
      setCurrentSubQuestionIndex((prev) => prev + 1);
      setIsAnswerRevealed(false);
      setSelectedAnswer(null);
    } else if (currentUnitIndex < dueUnits.length - 1) {
      setCurrentUnitIndex((prev) => prev + 1);
      setCurrentSubQuestionIndex(0);
      setIsAnswerRevealed(false);
      setSelectedAnswer(null);
    } else {
      setSessionCompleted(true);
    }
  };

  // Completion screen
  if (sessionCompleted || dueUnits.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-in fade-in">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg">
          <Award className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {reviewedInSessionCount > 0
              ? 'Hoàn thành phiên ôn tập FSRS!'
              : 'Không có câu hỏi nào đến hạn hôm nay!'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {reviewedInSessionCount > 0
              ? `Bạn đã hoàn thành xuất sắc ${reviewedInSessionCount} lượt ôn tập. Thuật toán FSRS đã tự động tính toán thời điểm lặp lại tối ưu cho từng câu.`
              : 'Trí nhớ của bạn đang ở trạng thái tốt. Thuật toán FSRS sẽ tự động nhắc nhở khi đến chu kỳ ôn tiếp theo.'}
          </p>
        </div>

        {/* FSRS Stats Cards */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-400">Đến hạn hôm nay</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              0 câu
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-400">7 ngày tới</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {stats.dueNext7DaysCount} câu
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-400">Mục tiêu nhớ</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              90%
            </div>
          </div>
        </div>

        <button
          onClick={onBack}
          className="mt-4 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition"
        >
          Quay về trang chủ
        </button>
      </div>
    );
  }

  const isCorrect =
    selectedAnswer !== null && String(selectedAnswer) === String(currentQuestion.correctAnswer);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Top Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Ôn tập ngắt quãng FSRS
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500/10 text-purple-700 dark:text-purple-300">
                  Target 90%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Câu {currentUnitIndex + 1}/{dueUnits.length} • Lặp lại {currentCard?.card.reps || 0} lần
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-400 block">Đến hạn hôm nay</span>
              <strong className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {dueUnits.length - currentUnitIndex} câu
              </strong>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${((currentUnitIndex + 1) / dueUnits.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Review Card */}
      <div className="my-6">
        {currentUnit.groupContent ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Desktop Left / Mobile Accordion: Shared Passage */}
            <div className="p-6 rounded-3xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 md:sticky md:top-24 md:max-h-[calc(100vh-10rem)] md:overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{currentUnit.groupTitle || 'Đoạn trích chung cho cả cụm'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileGroupOpen((prev) => !prev)}
                  className="md:hidden text-xs text-purple-600 font-semibold flex items-center gap-1"
                >
                  {isMobileGroupOpen ? (
                    <>Thu gọn <ChevronUp className="w-3.5 h-3.5" /></>
                  ) : (
                    <>Mở rộng <ChevronDown className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>

              <div className={`${isMobileGroupOpen ? 'block' : 'hidden md:block'} text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200`}>
                <MathRenderer content={currentUnit.groupContent} />
              </div>
            </div>

            {/* Question column */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              {renderQuestionBody()}
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 max-w-3xl mx-auto">
            {renderQuestionBody()}
          </div>
        )}
      </div>

      {/* Bottom Rating Bar (Once revealed) */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
        {!isAnswerRevealed ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Hãy suy nghĩ hoặc chọn đáp án, sau đó bấm xem đáp án để tự chấm điểm FSRS.
            </span>
            <button
              onClick={() => setIsAnswerRevealed(true)}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition"
            >
              Hiện đáp án & lời giải
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold">Đánh giá mức độ ghi nhớ của bạn (FSRS):</span>
              <span>Lần ôn thứ {((currentCard?.card.reps || 0) + 1)}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => handleRate(Rating.Again)}
                className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900/60 text-xs transition"
              >
                <div className="text-sm font-extrabold">🔴 Quên</div>
                <div className="text-[10px] text-rose-500 font-normal mt-0.5">Ôn lại sớm</div>
              </button>

              <button
                onClick={() => handleRate(Rating.Hard)}
                className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-900/60 text-xs transition"
              >
                <div className="text-sm font-extrabold">🟠 Khó</div>
                <div className="text-[10px] text-amber-600 font-normal mt-0.5">Nhớ chưa chắc</div>
              </button>

              <button
                onClick={() => handleRate(Rating.Good)}
                className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900/60 text-xs transition"
              >
                <div className="text-sm font-extrabold">🟢 Được</div>
                <div className="text-[10px] text-emerald-600 font-normal mt-0.5">Đúng chuẩn</div>
              </button>

              <button
                onClick={() => handleRate(Rating.Easy)}
                className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900/60 text-xs transition"
              >
                <div className="text-sm font-extrabold">🔵 Dễ</div>
                <div className="text-[10px] text-blue-600 font-normal mt-0.5">Thuộc lòng</div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function renderQuestionBody() {
    if (!currentQuestion) return null;

    return (
      <>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800">
              Câu #{currentSubQuestionIndex + 1}/{currentUnit.questions.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300">
              {SUBJECT_CONFIGS[currentQuestion.subject].shortName}
            </span>
            {currentQuestion.subTopic && (
              <span className="text-xs text-slate-400">• {currentQuestion.subTopic}</span>
            )}
          </div>

          <span className="text-[11px] text-slate-400">
            Lý do đưa vào: {currentCard?.addedReason || 'sai kiến thức'}
          </span>
        </div>

        {/* Question Text */}
        <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
          <MathRenderer content={currentQuestion.questionText} />
        </div>

        {/* Options */}
        {currentQuestion.type === 'multiple-choice' ? (
          <div className="space-y-2.5 pt-2">
            {currentQuestion.options.map((opt, optIdx) => {
              const label = ['A', 'B', 'C', 'D'][optIdx] || optIdx;
              const isSelected = selectedAnswer === optIdx;
              const isOptCorrect = Number(currentQuestion.correctAnswer) === optIdx;

              let style =
                'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200';

              if (isAnswerRevealed) {
                if (isOptCorrect) {
                  style =
                    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold ring-2 ring-emerald-500/20';
                } else if (isSelected && !isOptCorrect) {
                  style =
                    'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-semibold';
                }
              } else if (isSelected) {
                style =
                  'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 ring-2 ring-purple-500/20';
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => setSelectedAnswer(optIdx)}
                  className={`w-full min-h-[48px] p-3 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${style}`}
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {label}
                  </span>
                  <div className="flex-1 text-xs sm:text-sm">
                    <MathRenderer content={opt} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            <input
              type="text"
              placeholder="Nhập câu trả lời..."
              value={selectedAnswer ? String(selectedAnswer) : ''}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
        )}

        {/* Explanation & Revealed Answer */}
        {isAnswerRevealed && (
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2 animate-in fade-in">
            <div className="text-xs font-bold text-purple-700 dark:text-purple-300">
              Đáp án đúng:{' '}
              {currentQuestion.type === 'multiple-choice'
                ? ['A', 'B', 'C', 'D'][Number(currentQuestion.correctAnswer)] ||
                  currentQuestion.correctAnswer
                : currentQuestion.correctAnswer}
            </div>

            {currentQuestion.explanation && (
              <div className="text-xs text-slate-700 dark:text-slate-300 pt-1 border-t border-purple-200/60 dark:border-purple-900/40">
                <span className="font-bold block mb-1">Lời giải:</span>
                <MathRenderer content={currentQuestion.explanation} />
              </div>
            )}
          </div>
        )}
      </>
    );
  }
};
