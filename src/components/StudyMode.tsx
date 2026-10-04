import React, { useState, useEffect } from 'react';
import {
  Question,
  SubjectType,
  SUBJECT_CONFIGS,
  StudyProgress,
  QuestionEditHistory,
} from '../types/hsa';
import { updateMistakeRecord, incrementDailyActivity } from '../services/analyticsService';
import { MathRenderer } from './MathRenderer';
import { QuestionEditModal } from './QuestionEditModal';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  XCircle,
  HelpCircle,
  LayoutGrid,
  X,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Target,
  Edit3,
} from 'lucide-react';

interface StudyModeProps {
  initialSubject: SubjectType;
  questions: Question[];
  onBack: () => void;
  progress: StudyProgress;
  onUpdateProgress: (newProgress: StudyProgress) => void;
  customQuestions?: Question[];
  studyTitle?: string;
  onUpdateQuestion?: (
    updated: Question,
    regradeHistory: boolean,
    editRecord?: QuestionEditHistory
  ) => void;
}

export const StudyMode: React.FC<StudyModeProps> = ({
  initialSubject,
  questions,
  onBack,
  progress,
  onUpdateProgress,
  customQuestions,
  studyTitle,
  onUpdateQuestion,
}) => {
  const [currentSubject, setCurrentSubject] = useState<SubjectType>(initialSubject);
  const subjectQuestions = customQuestions && customQuestions.length > 0
    ? customQuestions
    : questions.filter((q) => q.subject === currentSubject);

  // Restore last index from progress or start at 0
  const savedIndex = progress.lastQuestionIndex[currentSubject] || 0;
  const initialIndex = !customQuestions && savedIndex < subjectQuestions.length ? savedIndex : 0;
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | string>>(
    progress.answeredQuestions || {}
  );
  const [fillInInput, setFillInInput] = useState<string>('');
  const [isGridOpen, setIsGridOpen] = useState<boolean>(false);
  const [isMobileGroupOpen, setIsMobileGroupOpen] = useState<boolean>(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const currentQuestion: Question | undefined = subjectQuestions[currentIndex];

  useEffect(() => {
    // When subject changes, set index
    if (!customQuestions) {
      const idx = progress.lastQuestionIndex[currentSubject] || 0;
      setCurrentIndex(idx < subjectQuestions.length ? idx : 0);
    }
  }, [currentSubject, customQuestions]);

  useEffect(() => {
    // Save last index to progress
    if (!customQuestions) {
      const updated = {
        ...progress,
        lastSubject: currentSubject,
        lastQuestionIndex: {
          ...progress.lastQuestionIndex,
          [currentSubject]: currentIndex,
        },
      };
      onUpdateProgress(updated);
    }
  }, [currentIndex, currentSubject, customQuestions]);

  if (!currentQuestion || subjectQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Chưa có câu hỏi cho phần này
        </h3>
        <p className="text-sm text-slate-500">
          Vui lòng nhập thêm câu hỏi từ tài liệu hoặc khôi phục lại đề mẫu ban đầu.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm"
        >
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  const currentAnswer = selectedAnswers[currentQuestion.id];
  const hasAnswered = currentAnswer !== undefined;
  const isBookmarked = progress.bookmarkedQuestionIds.includes(currentQuestion.id);

  const handleSelectOption = (optIndex: number) => {
    if (hasAnswered) return; // Answer locked once picked
    const newAnswers = { ...selectedAnswers, [currentQuestion.id]: optIndex };
    setSelectedAnswers(newAnswers);

    onUpdateProgress({
      ...progress,
      answeredQuestions: newAnswers,
    });

    // Update mistake notebook and daily activity
    const isCorrect = Number(currentQuestion.correctAnswer) === optIndex;
    updateMistakeRecord(
      currentQuestion.id,
      currentQuestion.subject,
      currentQuestion.subSubject,
      currentQuestion.subTopic,
      isCorrect,
      isCorrect ? undefined : 'sai kiến thức'
    );
    incrementDailyActivity(1, 0);
  };

  const handleFillInSubmit = () => {
    if (!fillInInput.trim() || hasAnswered) return;
    const newAnswers = { ...selectedAnswers, [currentQuestion.id]: fillInInput.trim() };
    setSelectedAnswers(newAnswers);

    onUpdateProgress({
      ...progress,
      answeredQuestions: newAnswers,
    });

    const isCorrect = String(fillInInput.trim()) === String(currentQuestion.correctAnswer);
    updateMistakeRecord(
      currentQuestion.id,
      currentQuestion.subject,
      currentQuestion.subSubject,
      currentQuestion.subTopic,
      isCorrect,
      isCorrect ? undefined : 'sai kiến thức'
    );
    incrementDailyActivity(1, 0);
  };

  const toggleBookmark = () => {
    const isMarked = progress.bookmarkedQuestionIds.includes(currentQuestion.id);
    const newBookmarks = isMarked
      ? progress.bookmarkedQuestionIds.filter((id) => id !== currentQuestion.id)
      : [...progress.bookmarkedQuestionIds, currentQuestion.id];

    onUpdateProgress({
      ...progress,
      bookmarkedQuestionIds: newBookmarks,
    });
  };

  const handleResetSubjectProgress = () => {
    const newAnswers = { ...selectedAnswers };
    subjectQuestions.forEach((q) => {
      delete newAnswers[q.id];
    });
    setSelectedAnswers(newAnswers);
    onUpdateProgress({
      ...progress,
      answeredQuestions: newAnswers,
      lastQuestionIndex: {
        ...progress.lastQuestionIndex,
        [currentSubject]: 0,
      },
    });
    setCurrentIndex(0);
  };

  const answeredCount = subjectQuestions.filter((q) => selectedAnswers[q.id] !== undefined).length;
  const correctCount = subjectQuestions.filter((q) => {
    const ans = selectedAnswers[q.id];
    if (ans === undefined) return false;
    return String(ans) === String(q.correctAnswer);
  }).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Top Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Trang chủ</span>
          </button>

          {/* Subject Pills or Custom Study Title */}
          {studyTitle ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{studyTitle}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
              {(['math', 'literature', 'science'] as SubjectType[]).map((subj) => (
                <button
                  key={subj}
                  onClick={() => setCurrentSubject(subj)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    currentSubject === subj
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {SUBJECT_CONFIGS[subj].shortName}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {currentQuestion && (
              <button
                type="button"
                onClick={() => setEditingQuestion(currentQuestion)}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                title="Sửa câu hỏi, lựa chọn, đáp án đúng và lời giải với xem trước KaTeX"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                <span>Sửa</span>
              </button>
            )}

            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-xl border transition ${
                isBookmarked
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'
              }`}
              title={isBookmarked ? 'Bỏ lưu câu hỏi' : 'Lưu câu hỏi để xem lại'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
            </button>

            <button
              onClick={() => setIsGridOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Bảng số câu"
            >
              <LayoutGrid className="w-4 h-4 text-emerald-500" />
              <span className="font-mono">
                {currentIndex + 1}/{subjectQuestions.length}
              </span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Tiến độ ôn tập: <strong className="text-slate-900 dark:text-slate-100">{answeredCount}/{subjectQuestions.length}</strong> câu
            </span>
            {answeredCount > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Đúng: {correctCount}/{answeredCount} ({Math.round((correctCount / answeredCount) * 100)}%)
              </span>
            )}
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(answeredCount / subjectQuestions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="my-6">
        {currentQuestion.groupContent ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Desktop Left Column / Mobile Top Accordion: Shared Passage */}
            <div className="p-6 rounded-3xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 md:sticky md:top-24 md:max-h-[calc(100vh-10rem)] md:overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{currentQuestion.groupTitle || 'Đoạn trích / Dữ liệu chung'}</span>
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

              <div className={`${isMobileGroupOpen ? 'block' : 'hidden md:block'} text-sm leading-relaxed text-slate-800 dark:text-slate-200`}>
                <MathRenderer content={currentQuestion.groupContent} />
              </div>
            </div>

            {/* Right Column: Question Content */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              {/* Header of question */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Câu {currentIndex + 1}
                  </span>
                  {currentQuestion.subTopic && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {currentQuestion.subTopic}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">Chế độ Ôn tập</span>
              </div>

              {/* Question Text with KaTeX */}
              <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                <MathRenderer content={currentQuestion.questionText} />
              </div>

              {/* Optional Image */}
              {currentQuestion.imageUrl && (
                <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <img src={currentQuestion.imageUrl} alt="Hình minh họa" className="w-full h-auto" />
                </div>
              )}

              {/* Options */}
              {currentQuestion.type === 'multiple-choice' ? (
                <div className="space-y-3 pt-2">
                  {currentQuestion.options.map((option, optIdx) => {
                    const label = ['A', 'B', 'C', 'D'][optIdx] || optIdx;
                    const isSelected = currentAnswer === optIdx;
                    const isCorrect = Number(currentQuestion.correctAnswer) === optIdx;

                    let stateClasses =
                      'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200';

                    if (hasAnswered) {
                      if (isCorrect) {
                        stateClasses =
                          'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20';
                      } else if (isSelected && !isCorrect) {
                        stateClasses =
                          'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20';
                      } else {
                        stateClasses =
                          'border-slate-200 dark:border-slate-800 opacity-60 text-slate-400 dark:text-slate-500';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={hasAnswered}
                        onClick={() => handleSelectOption(optIdx)}
                        className={`w-full min-h-[52px] p-4 rounded-2xl border-2 text-left flex items-start gap-3.5 transition-all duration-200 cursor-pointer ${stateClasses}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                            hasAnswered && isCorrect
                              ? 'bg-emerald-600 text-white'
                              : hasAnswered && isSelected && !isCorrect
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {hasAnswered && isCorrect ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : hasAnswered && isSelected && !isCorrect ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            label
                          )}
                        </span>
                        <div className="flex-1 pt-0.5 text-sm sm:text-base">
                          <MathRenderer content={option} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-slate-500">
                    Nhập câu trả lời / số kết quả:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled={hasAnswered}
                      value={hasAnswered ? String(currentAnswer) : fillInInput}
                      onChange={(e) => setFillInInput(e.target.value)}
                      placeholder="Điền đáp án..."
                      className="flex-1 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 font-mono text-sm"
                    />
                    {!hasAnswered && (
                      <button
                        onClick={handleFillInSubmit}
                        className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm"
                      >
                        Kiểm tra
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Explanation Section */}
              {hasAnswered && (
                <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Đáp án đúng:{' '}
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {currentQuestion.type === 'multiple-choice'
                          ? `${['A', 'B', 'C', 'D'][Number(currentQuestion.correctAnswer)] || currentQuestion.correctAnswer}`
                          : currentQuestion.correctAnswer}
                      </span>
                    </h4>
                  </div>

                  {currentQuestion.explanation ? (
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-700/50 pt-3">
                      <MathRenderer content={currentQuestion.explanation} />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Chưa có lời giải chi tiết cho câu này.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Normal Single Question Card */
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {/* Header of question */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Câu {currentIndex + 1}
                </span>
                {currentQuestion.subTopic && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {currentQuestion.subTopic}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">Chế độ Ôn tập</span>
            </div>

            {/* Question Text with KaTeX */}
            <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
              <MathRenderer content={currentQuestion.questionText} />
            </div>

            {/* Optional Image */}
            {currentQuestion.imageUrl && (
              <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <img src={currentQuestion.imageUrl} alt="Hình minh họa" className="w-full h-auto" />
              </div>
            )}

            {/* Options */}
            {currentQuestion.type === 'multiple-choice' ? (
              <div className="space-y-3 pt-2">
                {currentQuestion.options.map((option, optIdx) => {
                  const label = ['A', 'B', 'C', 'D'][optIdx] || optIdx;
                  const isSelected = currentAnswer === optIdx;
                  const isCorrect = Number(currentQuestion.correctAnswer) === optIdx;

                  let stateClasses =
                    'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200';

                  if (hasAnswered) {
                    if (isCorrect) {
                      stateClasses =
                        'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20';
                    } else if (isSelected && !isCorrect) {
                      stateClasses =
                        'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20';
                    } else {
                      stateClasses =
                        'border-slate-200 dark:border-slate-800 opacity-60 text-slate-400 dark:text-slate-500';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={hasAnswered}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full min-h-[52px] p-4 rounded-2xl border-2 text-left flex items-start gap-3.5 transition-all duration-200 cursor-pointer ${stateClasses}`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                          hasAnswered && isCorrect
                            ? 'bg-emerald-600 text-white'
                            : hasAnswered && isSelected && !isCorrect
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {hasAnswered && isCorrect ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : hasAnswered && isSelected && !isCorrect ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          label
                        )}
                      </span>
                      <div className="flex-1 pt-0.5 text-sm sm:text-base">
                        <MathRenderer content={option} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold text-slate-500">
                  Nhập câu trả lời / số kết quả:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    disabled={hasAnswered}
                    value={hasAnswered ? String(currentAnswer) : fillInInput}
                    onChange={(e) => setFillInInput(e.target.value)}
                    placeholder="Điền đáp án..."
                    className="flex-1 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 font-mono text-sm"
                  />
                  {!hasAnswered && (
                    <button
                      onClick={handleFillInSubmit}
                      className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm"
                    >
                      Kiểm tra
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Explanation Section */}
            {hasAnswered && (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Đáp án đúng:{' '}
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {currentQuestion.type === 'multiple-choice'
                        ? `${['A', 'B', 'C', 'D'][Number(currentQuestion.correctAnswer)] || currentQuestion.correctAnswer}`
                        : currentQuestion.correctAnswer}
                    </span>
                  </h4>
                </div>

                {currentQuestion.explanation ? (
                  <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-700/50 pt-3">
                    <MathRenderer content={currentQuestion.explanation} />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa có lời giải chi tiết cho câu này.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation Buttons */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-lg">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-xs sm:text-sm font-semibold transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Câu trước</span>
        </button>

        <button
          type="button"
          onClick={() => setIsGridOpen(true)}
          className="sm:hidden p-2 text-xs font-bold text-slate-600 dark:text-slate-300"
        >
          {currentIndex + 1}/{subjectQuestions.length}
        </button>

        <button
          type="button"
          disabled={currentIndex === subjectQuestions.length - 1}
          onClick={() => setCurrentIndex((prev) => Math.min(subjectQuestions.length - 1, prev + 1))}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30 disabled:pointer-events-none text-xs sm:text-sm font-semibold shadow-xs transition"
        >
          <span>Câu sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Question Selector Palette (Modal) */}
      {isGridOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Danh sách câu hỏi ({subjectQuestions.length})
              </h3>
              <button
                onClick={() => setIsGridOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 py-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span>Đã làm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md border border-slate-300 dark:border-slate-700" />
                <span>Chưa làm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-400" />
                <span>Đã lưu</span>
              </div>
            </div>

            {/* Grid of buttons */}
            <div className="flex-1 overflow-y-auto grid grid-cols-5 sm:grid-cols-6 gap-2.5 p-1">
              {subjectQuestions.map((q, idx) => {
                const isAnswered = selectedAnswers[q.id] !== undefined;
                const isCurrent = currentIndex === idx;
                const isMarked = progress.bookmarkedQuestionIds.includes(q.id);

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsGridOpen(false);
                    }}
                    className={`h-11 rounded-xl font-bold text-xs flex flex-col items-center justify-center relative transition ${
                      isCurrent
                        ? 'ring-2 ring-emerald-500 font-extrabold'
                        : ''
                    } ${
                      isAnswered
                        ? 'bg-emerald-500 text-white'
                        : 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isMarked && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button
                onClick={handleResetSubjectProgress}
                className="text-xs text-rose-500 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Làm lại từ đầu
              </button>
              <button
                onClick={() => setIsGridOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Edit Modal */}
      <QuestionEditModal
        isOpen={!!editingQuestion}
        onClose={() => setEditingQuestion(null)}
        question={editingQuestion}
        onSaveQuestion={(updated, regradeHistory, editRecord) => {
          if (onUpdateQuestion) {
            onUpdateQuestion(updated, regradeHistory, editRecord);
          }
          setEditingQuestion(null);
        }}
      />
    </div>
  );
};
