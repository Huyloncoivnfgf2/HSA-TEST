import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Question,
  SubjectType,
  ExamModeType,
  ExamSession,
  QuestionReportReason,
  QuestionEditHistory,
  SUBJECT_CONFIGS,
} from '../types/hsa';
import {
  ErrorClassification,
  QuestionAttemptDetail,
  ExamRecord,
} from '../types/analytics';
import {
  recordExamResult,
  getUserGoals,
  getExamHistory,
} from '../services/analyticsService';
import { fetchExamFeedbackWithAI } from '../services/geminiClient';
import { FSRSReviewReason } from '../services/fsrsService';
import { MathRenderer } from './MathRenderer';
import { ConfirmationModal } from './ConfirmationModal';
import { ReportQuestionModal } from './ReportQuestionModal';
import { QuestionEditModal } from './QuestionEditModal';
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trophy,
  ArrowRight,
  RotateCcw,
  Home,
  Menu,
  X,
  Coffee,
  Play,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  TrendingUp,
  TrendingDown,
  BookX,
  Zap,
  ShieldAlert,
  Edit3,
  Tag,
} from 'lucide-react';

interface ExamModeProps {
  session: ExamSession;
  onUpdateSession: (session: ExamSession) => void;
  onFinishSession: (session: ExamSession) => void;
  onExit: () => void;
  onOpenMistakes?: () => void;
  onUpdateQuestion?: (
    updated: Question,
    regradeHistory: boolean,
    editRecord?: QuestionEditHistory
  ) => void;
  onEnrollFSRS?: (
    questionId: string,
    subject: SubjectType,
    reason: FSRSReviewReason,
    groupId?: string
  ) => void;
}

export const ExamMode: React.FC<ExamModeProps> = ({
  session,
  onUpdateSession,
  onFinishSession,
  onExit,
  onOpenMistakes,
  onUpdateQuestion,
  onEnrollFSRS,
}) => {
  const {
    mode,
    currentSubject,
    subjectsOrder,
    subjectQuestions,
    userAnswers,
    flaggedQuestions,
    reportedQuestions = {},
    subjectEndTimes,
    isFinished,
    isBreak,
    breakEndTime,
  } = session;

  const questions = subjectQuestions[currentSubject] || [];
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [fillInText, setFillInText] = useState<string>('');
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState<boolean>(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState<boolean>(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState<boolean>(false);
  const [isMobileGroupOpen, setIsMobileGroupOpen] = useState<boolean>(true);
  const [resultFilter, setResultFilter] = useState<'all' | 'wrong' | 'correct' | 'unanswered'>('all');

  // Report & Edit Modal states
  const [reportingQuestion, setReportingQuestion] = useState<Question | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [taggedQuestions, setTaggedQuestions] = useState<Record<string, FSRSReviewReason>>({});
  const hasEnrolledFSRSRef = useRef<boolean>(false);

  // Track time spent per question
  const [questionTimeMap, setQuestionTimeMap] = useState<Record<string, number>>({});
  const lastQuestionChangeTimeRef = useRef<number>(Date.now());
  const hasRecordedResultRef = useRef<boolean>(false);

  // AI Feedback state for result screen
  const [aiFeedbackText, setAiFeedbackText] = useState<string>('');
  const [isLoadingFeedback, setIsLoadingFeedback] = useState<boolean>(false);

  // Exact timestamp-based countdown
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(() => {
    if (isFinished) return 0;
    if (isBreak && breakEndTime) {
      return Math.max(0, Math.floor((breakEndTime - Date.now()) / 1000));
    }
    const endMs = subjectEndTimes[currentSubject] || Date.now();
    return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Track elapsed time per question when currentIndex changes
  useEffect(() => {
    const prevTime = lastQuestionChangeTimeRef.current;
    const now = Date.now();
    const elapsedSec = Math.max(1, Math.round((now - prevTime) / 1000));
    const prevQ = questions[currentIndex];

    if (prevQ) {
      setQuestionTimeMap((prev) => ({
        ...prev,
        [prevQ.id]: (prev[prevQ.id] || 0) + elapsedSec,
      }));
    }
    lastQuestionChangeTimeRef.current = now;
  }, [currentIndex, currentSubject]);

  // Synchronize fill-in text when current question changes
  useEffect(() => {
    const q = questions[currentIndex];
    if (q && q.type === 'fill-in') {
      const existing = userAnswers[q.id];
      setFillInText(existing !== undefined ? String(existing) : '');
    }
  }, [currentIndex, currentSubject]);

  // Main countdown effect based on timestamp
  useEffect(() => {
    if (isFinished) return;

    const tick = () => {
      const now = Date.now();

      if (isBreak && breakEndTime) {
        const remainingBreak = Math.max(0, Math.floor((breakEndTime - now) / 1000));
        setTimeRemainingSeconds(remainingBreak);

        if (remainingBreak <= 0) {
          handleEndBreak();
        }
        return;
      }

      const endMs = subjectEndTimes[currentSubject] || now;
      const remaining = Math.max(0, Math.floor((endMs - now) / 1000));
      setTimeRemainingSeconds(remaining);

      if (remaining <= 0) {
        handleTimeExpired();
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSubject, isBreak, breakEndTime, isFinished, subjectEndTimes]);

  // Handle subject time expired
  const handleTimeExpired = () => {
    if (isFinished) return;

    if (mode === 'single-subject') {
      // Single subject finishes test
      finishExam();
    } else {
      // Full HSA mode: check if there's a next subject
      const currentIdx = subjectsOrder.indexOf(currentSubject);
      if (currentIdx < subjectsOrder.length - 1) {
        // Start 2-minute break (120 seconds)
        const breakEnd = Date.now() + 2 * 60 * 1000;
        const updatedSession: ExamSession = {
          ...session,
          isBreak: true,
          breakEndTime: breakEnd,
        };
        onUpdateSession(updatedSession);
      } else {
        // All 3 subjects completed
        finishExam();
      }
    }
  };

  // Skip or finish the 2-minute rest
  const handleEndBreak = () => {
    const currentIdx = subjectsOrder.indexOf(currentSubject);
    const nextSubject = subjectsOrder[currentIdx + 1];

    if (nextSubject) {
      const durationMin = SUBJECT_CONFIGS[nextSubject].durationMinutes;
      const nextEnd = Date.now() + durationMin * 60 * 1000;

      const updatedSession: ExamSession = {
        ...session,
        currentSubject: nextSubject,
        isBreak: false,
        breakEndTime: undefined,
        subjectEndTimes: {
          ...session.subjectEndTimes,
          [nextSubject]: nextEnd,
        },
      };

      setCurrentIndex(0);
      onUpdateSession(updatedSession);
    } else {
      finishExam();
    }
  };

  const finishExam = () => {
    const finalSession: ExamSession = {
      ...session,
      isFinished: true,
      isBreak: false,
      completedAt: Date.now(),
    };
    onFinishSession(finalSession);
  };

  const handleSelectOption = (optIndex: number) => {
    if (isFinished || isBreak) return;
    const q = questions[currentIndex];
    if (!q) return;

    const newAnswers = { ...userAnswers, [q.id]: optIndex };
    onUpdateSession({
      ...session,
      userAnswers: newAnswers,
    });
  };

  const handleFillInChange = (val: string) => {
    if (isFinished || isBreak) return;
    setFillInText(val);
    const q = questions[currentIndex];
    if (!q) return;

    const newAnswers = { ...userAnswers };
    if (val.trim()) {
      newAnswers[q.id] = val.trim();
    } else {
      delete newAnswers[q.id];
    }

    onUpdateSession({
      ...session,
      userAnswers: newAnswers,
    });
  };

  const toggleFlag = (qId: string) => {
    const newFlags = { ...flaggedQuestions, [qId]: !flaggedQuestions[qId] };
    onUpdateSession({
      ...session,
      flaggedQuestions: newFlags,
    });
  };

  const handleConfirmReport = (reason: QuestionReportReason, note?: string) => {
    if (!reportingQuestion) return;
    const qId = reportingQuestion.id;
    const currentReported = session.reportedQuestions || {};
    const updatedReported = {
      ...currentReported,
      [qId]: { reason, note, reportedAt: Date.now() },
    };
    onUpdateSession({
      ...session,
      reportedQuestions: updatedReported,
    });
    setReportingQuestion(null);
  };

  const handleRemoveReport = (qId: string) => {
    const currentReported = { ...(session.reportedQuestions || {}) };
    delete currentReported[qId];
    onUpdateSession({
      ...session,
      reportedQuestions: currentReported,
    });
  };

  const handleSaveEditedQuestion = (
    updated: Question,
    regradeHistory: boolean,
    editRecord?: QuestionEditHistory
  ) => {
    if (onUpdateQuestion) {
      onUpdateQuestion(updated, regradeHistory, editRecord);
    }

    // Update in this session's subjectQuestions
    const currentSubQs = session.subjectQuestions[updated.subject] || [];
    const updatedSubQs = currentSubQs.map((q) => (q.id === updated.id ? updated : q));
    const newSubjectQuestions = {
      ...session.subjectQuestions,
      [updated.subject]: updatedSubQs,
    };

    // Remove from reported if it was reported
    const currentReported = { ...(session.reportedQuestions || {}) };
    delete currentReported[updated.id];

    onUpdateSession({
      ...session,
      subjectQuestions: newSubjectQuestions,
      reportedQuestions: currentReported,
    });

    if (onEnrollFSRS) {
      onEnrollFSRS(updated.id, updated.subject, 'báo lỗi đã sửa', updated.groupId);
    }

    setEditingQuestion(null);
  };

  const handleTagReason = (q: Question, reason: FSRSReviewReason) => {
    setTaggedQuestions((prev) => ({ ...prev, [q.id]: reason }));
    if (onEnrollFSRS) {
      onEnrollFSRS(q.id, q.subject, reason, q.groupId);
    }
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // ----------------------------------------------------
  // BREAK SCREEN (2-minute rest between subjects)
  // ----------------------------------------------------
  if (isBreak) {
    const currentIdx = subjectsOrder.indexOf(currentSubject);
    const nextSubject = subjectsOrder[currentIdx + 1];
    const nextConfig = nextSubject ? SUBJECT_CONFIGS[nextSubject] : null;

    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-lg p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Coffee className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
              Thời gian nghỉ giữa các phần
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Nghỉ giải lao (2 phút)
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Bạn đã hoàn thành phần thi{' '}
              <strong>{SUBJECT_CONFIGS[currentSubject].shortName}</strong>. Hãy thư giãn mắt và hít
              thở sâu trước khi bắt đầu phần thi kế tiếp.
            </p>
          </div>

          {/* Countdown Clock */}
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-4xl font-extrabold font-mono text-amber-600 dark:text-amber-400 tracking-wider">
              {formatTime(timeRemainingSeconds)}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Tự động chuyển môn khi đồng hồ về 00:00
            </p>
          </div>

          {nextConfig && (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-left text-xs space-y-1">
              <span className="font-semibold text-slate-500">Môn thi tiếp theo:</span>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {nextConfig.title} ({nextConfig.durationMinutes} phút)
              </p>
            </div>
          )}

          <button
            onClick={handleEndBreak}
            className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            <span>Bỏ qua nghỉ • Bắt đầu ngay phần tiếp</span>
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RESULT SCREEN (Exam Finished)
  // ----------------------------------------------------
  if (isFinished) {
    const goals = getUserGoals();
    const history = getExamHistory();
    const previousExam = history.length > 0 ? history[0] : null;

    // Collect all questions of this exam session
    const allSessionQuestions: Question[] = [];
    if (mode === 'single-subject') {
      allSessionQuestions.push(...(subjectQuestions[currentSubject] || []));
    } else {
      subjectsOrder.forEach((sub) => {
        allSessionQuestions.push(...(subjectQuestions[sub] || []));
      });
    }

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnanswered = 0;

    const subjectStats: Record<
      SubjectType,
      { correct: number; total: number; score: number; maxScore: number }
    > = {
      math: { correct: 0, total: 0, score: 0, maxScore: 50 },
      literature: { correct: 0, total: 0, score: 0, maxScore: 50 },
      science: { correct: 0, total: 0, score: 0, maxScore: 50 },
    };

    // Error classification counters
    const errorDistribution: Record<ErrorClassification, number> = {
      'sai kiến thức': 0,
      'làm quá nhanh': 0,
      'hết giờ chưa làm': 0,
      'bỏ trống': 0,
    };

    const details: QuestionAttemptDetail[] = [];
    const topicMistakeCount: Record<string, number> = {};
    const topicSuccessCount: Record<string, number> = {};

    allSessionQuestions.forEach((q) => {
      const userAns = userAnswers[q.id];
      const isReported = !!(reportedQuestions && reportedQuestions[q.id]);
      const isCorrect = !isReported && userAns !== undefined && String(userAns) === String(q.correctAnswer);
      const timeSpent = questionTimeMap[q.id] || 45;

      subjectStats[q.subject].total += 1;

      let errorType: ErrorClassification | undefined = undefined;

      if (isReported) {
        // Requirement 2: Câu đã báo lỗi được tính là BỎ TRỐNG: 0 điểm, tổng điểm tối đa vẫn giữ nguyên.
        totalUnanswered += 1;
        errorType = 'bỏ trống';
        errorDistribution['bỏ trống'] += 1;
      } else if (userAns === undefined) {
        totalUnanswered += 1;
        // If time remaining was 0 at end of this subject
        errorType = timeRemainingSeconds <= 0 ? 'hết giờ chưa làm' : 'bỏ trống';
        errorDistribution[errorType] += 1;
      } else if (isCorrect) {
        totalCorrect += 1;
        subjectStats[q.subject].correct += 1;
        const top = q.subTopic || 'Tổng hợp';
        topicSuccessCount[top] = (topicSuccessCount[top] || 0) + 1;
      } else {
        totalWrong += 1;
        // If answered very fast (< 18 seconds)
        if (timeSpent < 18) {
          errorType = 'làm quá nhanh';
        } else {
          errorType = 'sai kiến thức';
        }
        errorDistribution[errorType] += 1;

        const top = q.subTopic || 'Tổng hợp';
        topicMistakeCount[top] = (topicMistakeCount[top] || 0) + 1;
      }

      details.push({
        questionId: q.id,
        subject: q.subject,
        subSubject: q.subSubject,
        subTopic: q.subTopic || 'Tổng hợp',
        userAnswer: userAns,
        correctAnswer: q.correctAnswer,
        isCorrect,
        timeSpentSeconds: timeSpent,
        errorType,
      });
    });

    const totalQuestions = allSessionQuestions.length;
    // Calculate scaled scores
    (['math', 'literature', 'science'] as SubjectType[]).forEach((s) => {
      const st = subjectStats[s];
      st.score = st.total > 0 ? Math.round((st.correct / st.total) * 50) : 0;
    });

    const calculatedScore =
      mode === 'full-hsa'
        ? subjectStats.math.score + subjectStats.literature.score + subjectStats.science.score
        : totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 50)
        : 0;

    const totalMaxScore = mode === 'full-hsa' ? 150 : 50;

    // Weakest & Strongest topics for AI feedback
    const weakTopics = Object.entries(topicMistakeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);

    const strongTopics = Object.entries(topicSuccessCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);

    // Record results once and fetch Gemini feedback
    useEffect(() => {
      if (hasRecordedResultRef.current) return;
      hasRecordedResultRef.current = true;

      const record: ExamRecord = {
        id: `exam-rec-${Date.now()}`,
        date: Date.now(),
        mode,
        subjectScores: subjectStats,
        totalScore: calculatedScore,
        totalMaxScore,
        timeSpentSeconds: Object.values(questionTimeMap).reduce((a, b) => a + b, 0) || 1200,
        details,
      };

      // Save to analytics service & mistake notebook
      recordExamResult(record);

      // Auto-enroll mistakes & unanswered into FSRS queue
      if (onEnrollFSRS && !hasEnrolledFSRSRef.current) {
        hasEnrolledFSRSRef.current = true;
        details.forEach((d) => {
          if (!d.isCorrect) {
            const parentQ = allSessionQuestions.find((q) => q.id === d.questionId);
            const reason: FSRSReviewReason =
              d.errorType === 'bỏ trống' || d.errorType === 'hết giờ chưa làm'
                ? 'bỏ trống'
                : d.errorType === 'làm quá nhanh'
                ? 'làm vội'
                : 'sai kiến thức';
            onEnrollFSRS(d.questionId, d.subject, reason, parentQ?.groupId);
          }
        });
      }

      // Call Gemini for 3-5 lines authentic evaluation
      setIsLoadingFeedback(true);
      fetchExamFeedbackWithAI({
        mode,
        totalScore: calculatedScore,
        totalQuestions: totalMaxScore,
        subjectScores: subjectStats,
        targetTotal: mode === 'full-hsa' ? goals.targetTotal : goals.targetMath,
        weakTopics,
        strongTopics,
        errorDistribution,
      })
        .then((fb) => {
          setAiFeedbackText(fb);
          record.aiFeedback = fb;
        })
        .catch(() => {
          setAiFeedbackText('Hãy tiếp tục ôn luyện các chuyên đề sai để chuẩn bị tốt cho kỳ thi HSA.');
        })
        .finally(() => {
          setIsLoadingFeedback(false);
        });
    }, []);

    // Filter review questions
    const filteredReviewQuestions = allSessionQuestions.filter((q) => {
      const userAns = userAnswers[q.id];
      const isCorrect = userAns !== undefined && String(userAns) === String(q.correctAnswer);
      if (resultFilter === 'wrong') return userAns !== undefined && !isCorrect;
      if (resultFilter === 'correct') return isCorrect;
      if (resultFilter === 'unanswered') return userAns === undefined;
      return true;
    });

    // Score comparison to previous exam
    const scoreDiffVsPrev = previousExam ? calculatedScore - previousExam.totalScore : null;

    // Score comparison to user goal
    const targetComparison =
      mode === 'full-hsa'
        ? {
            target: goals.targetTotal,
            diff: calculatedScore - goals.targetTotal,
          }
        : {
            target:
              currentSubject === 'math'
                ? goals.targetMath
                : currentSubject === 'literature'
                ? goals.targetLiterature
                : goals.targetScience,
            diff:
              calculatedScore -
              (currentSubject === 'math'
                ? goals.targetMath
                : currentSubject === 'literature'
                ? goals.targetLiterature
                : goals.targetScience),
          };

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Banner summary */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-700 to-slate-900 text-white shadow-xl text-center space-y-6 relative overflow-hidden">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Trophy className="w-8 h-8 text-amber-300" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-white/10 uppercase tracking-wider">
              {mode === 'full-hsa' ? 'Kết quả bài thi chuẩn HSA ĐHQGHN' : 'Kết quả kiểm tra môn'}
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              {calculatedScore}{' '}
              <span className="text-2xl font-normal text-emerald-200">/ {totalMaxScore} điểm</span>
            </h1>

            {/* Target & Previous comparisons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs font-bold text-emerald-200 border border-white/10">
                <Target className="w-3.5 h-3.5" />
                Mục tiêu: {targetComparison.target}đ (
                {targetComparison.diff >= 0
                  ? `Vượt +${targetComparison.diff}đ`
                  : `Thiếu ${Math.abs(targetComparison.diff)}đ`}
                )
              </span>

              {scoreDiffVsPrev !== null && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs font-bold border border-white/10">
                  {scoreDiffVsPrev >= 0 ? (
                    <>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                      <span className="text-emerald-300">+{scoreDiffVsPrev}đ so với lần trước</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
                      <span className="text-rose-300">{scoreDiffVsPrev}đ so với lần trước</span>
                    </>
                  )}
                </span>
              )}
            </div>

            <p className="text-emerald-100 text-sm max-w-md mx-auto pt-1">
              Bạn đã hoàn thành với {totalCorrect}/{totalQuestions} câu chính xác.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="text-2xl font-bold">{totalCorrect}</div>
              <div className="text-xs text-emerald-200">Câu đúng</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="text-2xl font-bold">{totalWrong}</div>
              <div className="text-xs text-emerald-200">Câu sai</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="text-2xl font-bold">{totalUnanswered}</div>
              <div className="text-xs text-emerald-200">Chưa làm</div>
            </div>
          </div>
        </div>

        {/* Gemini AI 3-5 line Assessment Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border-2 border-indigo-500/30 text-white shadow-lg space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Nhận xét chuyên gia khảo thí AI (Gemini 3.8 Flash)
                </h3>
                <p className="text-[11px] text-indigo-300">
                  Đánh giá khách quan 100% dựa trên dữ liệu thi thật vừa làm
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              AI Tutor
            </span>
          </div>

          {isLoadingFeedback ? (
            <div className="py-4 space-y-2 animate-pulse">
              <div className="h-3.5 bg-slate-800 rounded-full w-4/5" />
              <div className="h-3.5 bg-slate-800 rounded-full w-full" />
              <div className="h-3.5 bg-slate-800 rounded-full w-3/4" />
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              {aiFeedbackText ||
                'Hãy rà soát kỹ các câu hỏi trong sổ lỗi sai để khắc phục điểm yếu và nâng cao điểm số.'}
            </div>
          )}
        </div>

        {/* Error Classification Breakdown Pills */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Phân loại lỗi sai bài thi
            </h3>
            <span className="text-xs text-slate-400">
              Tổng {totalWrong + totalUnanswered} lỗi cần khắc phục
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
              <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {errorDistribution['sai kiến thức']}
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Sai kiến thức
              </div>
              <div className="text-[10px] text-slate-400">Cần ôn lại lý thuyết</div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {errorDistribution['làm quá nhanh']}
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Làm quá nhanh
              </div>
              <div className="text-[10px] text-slate-400">Đọc ẩu / dưới 18s</div>
            </div>

            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {errorDistribution['hết giờ chưa làm']}
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Hết giờ chưa làm
              </div>
              <div className="text-[10px] text-slate-400">Thiếu tốc độ làm bài</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <div className="text-lg font-bold text-slate-600 dark:text-slate-300">
                {errorDistribution['bỏ trống']}
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Bỏ trống</div>
              <div className="text-[10px] text-slate-400">Chưa chọn phương án</div>
            </div>
          </div>
        </div>

        {/* Breakdown per subject (if Full HSA) */}
        {mode === 'full-hsa' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['math', 'literature', 'science'] as SubjectType[]).map((subj) => {
              const cfg = SUBJECT_CONFIGS[subj];
              const st = subjectStats[subj];
              const target =
                subj === 'math'
                  ? goals.targetMath
                  : subj === 'literature'
                  ? goals.targetLiterature
                  : goals.targetScience;

              return (
                <div
                  key={subj}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">{cfg.shortName}</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      {st.score} / 50 đ
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>
                      Đúng: <strong>{st.correct}</strong> / {st.total} câu
                    </span>
                    <span className="text-[11px] text-slate-400">Mục tiêu: {target}đ</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${st.total > 0 ? (st.correct / st.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REPORTED QUESTIONS SECTION (CÂU ĐÃ BÁO LỖI TRONG BÀI THI) */}
        {Object.keys(reportedQuestions).length > 0 && (
          <div className="p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500 text-white">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Câu đã báo lỗi trong bài thi ({Object.keys(reportedQuestions).length} câu)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Các câu này được tính là bỏ trống (0 điểm). Bạn có thể sửa câu hỏi, các lựa chọn, đáp án đúng và lời giải rồi bấm "Lưu và chấm lại" để điểm cập nhật.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(reportedQuestions).map(([qId, report]) => {
                const q = allSessionQuestions.find((item) => item.id === qId);
                if (!q) return null;
                return (
                  <div
                    key={qId}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800">
                          {SUBJECT_CONFIGS[q.subject].shortName}
                        </span>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          Lý do: {report.reason}
                        </span>
                        {report.note && (
                          <span className="text-xs text-slate-500">• Ghi chú: {report.note}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                        <MathRenderer content={q.questionText} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingQuestion(q)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa & Chấm lại</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveReport(q.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                      >
                        Bỏ báo lỗi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Review Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Chi tiết bài làm & Lời giải ({filteredReviewQuestions.length} câu)
            </h2>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'wrong', label: `Sai (${totalWrong})` },
                { id: 'correct', label: `Đúng (${totalCorrect})` },
                { id: 'unanswered', label: `Chưa làm (${totalUnanswered})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setResultFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    resultFilter === f.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of reviewed questions */}
          <div className="space-y-4">
            {filteredReviewQuestions.map((q, idx) => {
              const userAns = userAnswers[q.id];
              const isCorrect = userAns !== undefined && String(userAns) === String(q.correctAnswer);
              const isUnanswered = userAns === undefined;
              const timeSpent = questionTimeMap[q.id] || 0;

              // Error classification for this specific question
              let errorTag: ErrorClassification | null = null;
              if (isUnanswered) {
                errorTag = timeRemainingSeconds <= 0 ? 'hết giờ chưa làm' : 'bỏ trống';
              } else if (!isCorrect) {
                errorTag = timeSpent < 18 ? 'làm quá nhanh' : 'sai kiến thức';
              }

              return (
                <div
                  key={q.id}
                  className={`p-6 rounded-3xl border transition-all space-y-4 bg-white dark:bg-slate-900 ${
                    isCorrect
                      ? 'border-emerald-200 dark:border-emerald-950/60'
                      : isUnanswered
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-rose-200 dark:border-rose-950/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800">
                        Câu #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {SUBJECT_CONFIGS[q.subject].shortName}
                      </span>
                      {q.subTopic && (
                        <span className="text-xs text-slate-400">• {q.subTopic}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingQuestion(q)}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition"
                        title="Chỉnh sửa câu hỏi, đáp án, lời giải"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                        <span>Sửa</span>
                      </button>

                      {errorTag && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          {errorTag}
                        </span>
                      )}

                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> Chính xác
                        </span>
                      ) : isUnanswered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
                          <HelpCircle className="w-4 h-4" /> Chưa làm
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                          <XCircle className="w-4 h-4" /> Sai
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Group Content if present */}
                  {q.groupContent && (
                    <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {q.groupTitle || 'Ngữ cảnh / Dữ liệu chung'}:
                      </span>
                      <MathRenderer content={q.groupContent} />
                    </div>
                  )}

                  {/* Question Text */}
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                    <MathRenderer content={q.questionText} />
                  </div>

                  {/* Options */}
                  {q.type === 'multiple-choice' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isThisCorrect = Number(q.correctAnswer) === optIdx;
                        const isThisUserPick = userAns === optIdx;
                        const label = ['A', 'B', 'C', 'D'][optIdx] || optIdx;

                        let badgeStyle =
                          'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300';

                        if (isThisCorrect) {
                          badgeStyle =
                            'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold';
                        } else if (isThisUserPick && !isThisCorrect) {
                          badgeStyle =
                            'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-semibold';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${badgeStyle}`}
                          >
                            <span
                              className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 font-bold ${
                                isThisCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : isThisUserPick && !isThisCorrect
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            >
                              {label}
                            </span>
                            <div className="flex-1 pt-0.5">
                              <MathRenderer content={opt} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Fill-in review */}
                  {q.type === 'fill-in' && (
                    <div className="text-xs space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <div>
                        Đáp án bạn nhập:{' '}
                        <strong className={isCorrect ? 'text-emerald-600' : 'text-rose-600'}>
                          {userAns !== undefined ? String(userAns) : '(Chưa điền)'}
                        </strong>
                      </div>
                      <div>
                        Đáp án đúng: <strong className="text-emerald-600">{q.correctAnswer}</strong>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        Lời giải chi tiết:
                      </span>
                      <MathRenderer content={q.explanation} />
                    </div>
                  )}

                  {/* FSRS Reason Tagging for Mistake/Unanswered */}
                  {!isCorrect && (
                    <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 space-y-2">
                      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                        <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-purple-600" />
                          <span>Gắn nhãn nguyên nhân sai để xếp lịch ôn FSRS (Retention 90%):</span>
                        </span>
                        {taggedQuestions[q.id] && (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            ✓ Đã đưa vào hàng ôn: "{taggedQuestions[q.id]}"
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {(['sai kiến thức', 'lỗi vặt', 'làm vội', 'đọc nhầm đề'] as FSRSReviewReason[]).map(
                          (reason) => {
                            const isSelected = taggedQuestions[q.id] === reason;
                            return (
                              <button
                                key={reason}
                                type="button"
                                onClick={() => handleTagReason(q, reason)}
                                className={`px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 text-slate-700 dark:text-slate-300 hover:bg-purple-100/50'
                                }`}
                              >
                                {reason === 'sai kiến thức' && <span>📚 Sai kiến thức</span>}
                                {reason === 'lỗi vặt' && <span>⚠️ Lỗi vặt</span>}
                                {reason === 'làm vội' && <span>⚡ Làm vội</span>}
                                {reason === 'đọc nhầm đề' && <span>👀 Đọc nhầm đề</span>}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onExit}
            className="flex items-center gap-2 py-3 px-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </button>

          {onOpenMistakes && (totalWrong > 0 || totalUnanswered > 0) && (
            <button
              onClick={onOpenMistakes}
              className="flex items-center gap-2 py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md transition"
            >
              <BookX className="w-4 h-4" />
              <span>Xem các câu sai trong Sổ lỗi ({totalWrong + totalUnanswered})</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ACTIVE EXAM SCREEN
  // ----------------------------------------------------
  const currentQ = questions[currentIndex];
  const isTimeCritical = timeRemainingSeconds < 300; // less than 5 min left

  if (!currentQ) {
    return (
      <div className="p-12 text-center text-slate-500">
        Đang nạp dữ liệu bài thi...
      </div>
    );
  }

  const currentAns = userAnswers[currentQ.id];
  const isCurrentFlagged = flaggedQuestions[currentQ.id];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Sticky Exam Header Bar */}
      <div className="sticky top-16 z-30 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExitConfirmOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Thoát khỏi bài thi"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {SUBJECT_CONFIGS[currentSubject].shortName}
              </span>
              {mode === 'full-hsa' && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  Phần {subjectsOrder.indexOf(currentSubject) + 1}/3
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {mode === 'full-hsa' ? 'Bài thi toàn diện HSA' : 'Kiểm tra môn tự chọn'}
            </p>
          </div>
        </div>

        {/* Countdown Timer Display */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl font-mono text-sm sm:text-base font-bold shadow-xs transition ${
            isTimeCritical
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>{formatTime(timeRemainingSeconds)}</span>
        </div>

        {/* Right action & mobile palette button */}
        <div className="flex items-center gap-2">
          {/* Mobile open palette button */}
          <button
            onClick={() => setIsMobilePaletteOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <Menu className="w-4 h-4 text-emerald-500" />
            <span>
              {currentIndex + 1}/{questions.length}
            </span>
          </button>

          {/* Submit button */}
          <button
            onClick={() => setIsSubmitConfirmOpen(true)}
            className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nộp bài</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Question (Left/Center) + Palette (Right on desktop) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 my-6 items-start">
        {/* Left Column: Current Question / Grouped view */}
        <div className="lg:col-span-3">
          {currentQ.groupContent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Desktop Left / Mobile Top: Shared Passage */}
              <div className="p-6 rounded-3xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 md:sticky md:top-36 md:max-h-[calc(100vh-12rem)] md:overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{currentQ.groupTitle || 'Đoạn trích / Ngữ cảnh chung'}</span>
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
                  <MathRenderer content={currentQ.groupContent} />
                </div>
              </div>

              {/* Right Column: Question Content */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                {/* Question Bar */}
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      Câu {currentIndex + 1}
                    </span>
                    {currentQ.subTopic && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {currentQ.subTopic}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Báo lỗi button */}
                    <button
                      type="button"
                      onClick={() => setReportingQuestion(currentQ)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                        reportedQuestions[currentQ.id]
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Báo lỗi câu hỏi (sai đề, sai đáp án, công thức hỏng)"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      <span>{reportedQuestions[currentQ.id] ? 'Đã báo lỗi' : 'Báo lỗi'}</span>
                    </button>

                    {/* Flag button */}
                    <button
                      type="button"
                      onClick={() => toggleFlag(currentQ.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                        isCurrentFlagged
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-amber-500' : ''}`} />
                      <span>{isCurrentFlagged ? 'Đã đánh dấu' : 'Đánh dấu'}</span>
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                  <MathRenderer content={currentQ.questionText} />
                </div>

                {/* Optional Image */}
                {currentQ.imageUrl && (
                  <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                    <img src={currentQ.imageUrl} alt="Đề thi minh họa" className="w-full h-auto" />
                  </div>
                )}

                {/* Options */}
                {currentQ.type === 'multiple-choice' ? (
                  <div className="space-y-3 pt-2">
                    {currentQ.options.map((option, optIdx) => {
                      const isSelected = currentAns === optIdx;
                      const label = ['A', 'B', 'C', 'D'][optIdx] || optIdx;

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(optIdx)}
                          className={`w-full min-h-[52px] p-4 rounded-2xl border-2 text-left flex items-start gap-3.5 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {label}
                          </span>
                          <div className="flex-1 pt-0.5 text-sm sm:text-base">
                            <MathRenderer content={option} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-slate-500">
                      Nhập kết quả / câu trả lời của bạn:
                    </label>
                    <input
                      type="text"
                      value={fillInText}
                      onChange={(e) => handleFillInChange(e.target.value)}
                      placeholder="Nhập đáp án số hoặc chữ..."
                      className="w-full p-4 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Normal Question Card */
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              {/* Question Bar */}
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    Câu {currentIndex + 1}
                  </span>
                  {currentQ.subTopic && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {currentQ.subTopic}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Báo lỗi button */}
                  <button
                    type="button"
                    onClick={() => setReportingQuestion(currentQ)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                      reportedQuestions[currentQ.id]
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Báo lỗi câu hỏi (sai đề, sai đáp án, công thức hỏng)"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>{reportedQuestions[currentQ.id] ? 'Đã báo lỗi' : 'Báo lỗi'}</span>
                  </button>

                  {/* Flag button */}
                  <button
                    type="button"
                    onClick={() => toggleFlag(currentQ.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                      isCurrentFlagged
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-amber-500' : ''}`} />
                    <span>{isCurrentFlagged ? 'Đã đánh dấu' : 'Đánh dấu'}</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                <MathRenderer content={currentQ.questionText} />
              </div>

              {/* Optional Image */}
              {currentQ.imageUrl && (
                <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <img src={currentQ.imageUrl} alt="Đề thi minh họa" className="w-full h-auto" />
                </div>
              )}

              {/* Multiple Choice Options */}
              {currentQ.type === 'multiple-choice' ? (
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((option, optIdx) => {
                    const isSelected = currentAns === optIdx;
                    const label = ['A', 'B', 'C', 'D'][optIdx] || optIdx;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(optIdx)}
                        className={`w-full min-h-[52px] p-4 rounded-2xl border-2 text-left flex items-start gap-3.5 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {label}
                        </span>
                        <div className="flex-1 pt-0.5 text-sm sm:text-base">
                          <MathRenderer content={option} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Fill-in Question */
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-slate-500">
                    Nhập kết quả / câu trả lời của bạn:
                  </label>
                  <input
                    type="text"
                    value={fillInText}
                    onChange={(e) => handleFillInChange(e.target.value)}
                    placeholder="Nhập đáp án số hoặc chữ..."
                    className="w-full p-4 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Desktop Palette */}
        <div className="hidden lg:block lg:col-span-1 sticky top-36">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Bảng số câu ({questions.length})
              </h3>
            </div>

            {/* Palette legend */}
            <div className="flex flex-col gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-lg bg-emerald-500" />
                <span>Đã chọn đáp án</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent" />
                <span>Chưa làm</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-lg bg-amber-400" />
                <span>Đánh dấu xem lại</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-lg bg-rose-500" />
                <span>Đã báo lỗi</span>
              </div>
            </div>

            {/* Grid of rounded number cells */}
            <div className="max-h-[380px] overflow-y-auto grid grid-cols-5 gap-2 pr-1">
              {questions.map((q, idx) => {
                const isAns = userAnswers[q.id] !== undefined;
                const isCur = currentIndex === idx;
                const isFlag = flaggedQuestions[q.id];
                const isReport = !!(reportedQuestions && reportedQuestions[q.id]);

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl font-bold text-xs relative flex items-center justify-center transition-all ${
                      isCur ? 'ring-2 ring-blue-500 scale-105 z-10' : ''
                    } ${
                      isReport
                        ? 'border-2 border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                        : isAns
                        ? 'bg-emerald-500 text-white font-extrabold shadow-xs'
                        : 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlag && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 shadow-xs" />
                    )}
                    {isReport && (
                      <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-rose-500 shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Navigation Controls */}
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

        <span className="text-xs font-bold text-slate-500 lg:hidden">
          Câu {currentIndex + 1} / {questions.length}
        </span>

        <button
          type="button"
          disabled={currentIndex === questions.length - 1}
          onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-30 disabled:pointer-events-none text-xs sm:text-sm font-semibold shadow-xs transition"
        >
          <span>Câu sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Slide-Over Drawer for Palette */}
      {isMobilePaletteOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-h-[80vh] bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800 space-y-4 flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Bảng số câu ({questions.length})
              </h3>
              <button
                onClick={() => setIsMobilePaletteOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 py-1 flex-wrap">
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
                <span>Đánh dấu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500" />
                <span>Đã báo lỗi</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-5 sm:grid-cols-6 gap-2.5 p-1">
              {questions.map((q, idx) => {
                const isAns = userAnswers[q.id] !== undefined;
                const isCur = currentIndex === idx;
                const isFlag = flaggedQuestions[q.id];
                const isReport = !!(reportedQuestions && reportedQuestions[q.id]);

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsMobilePaletteOpen(false);
                    }}
                    className={`h-11 rounded-xl font-bold text-xs flex flex-col items-center justify-center relative transition ${
                      isCur ? 'ring-2 ring-blue-500 font-extrabold' : ''
                    } ${
                      isReport
                        ? 'border-2 border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                        : isAns
                        ? 'bg-emerald-500 text-white'
                        : 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlag && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                    {isReport && (
                      <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-rose-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsMobilePaletteOpen(false)}
                className="w-full py-2.5 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      <ConfirmationModal
        isOpen={isSubmitConfirmOpen}
        title="Xác nhận nộp bài thi?"
        message={`Bạn đã làm ${
          questions.filter((q) => userAnswers[q.id] !== undefined).length
        }/${questions.length} câu. Bạn có chắc chắn muốn nộp bài sớm không?`}
        confirmText="Nộp bài ngay"
        cancelText="Tiếp tục làm"
        onConfirm={() => {
          setIsSubmitConfirmOpen(false);
          handleTimeExpired();
        }}
        onCancel={() => setIsSubmitConfirmOpen(false)}
      />

      {/* Exit Confirmation Modal */}
      <ConfirmationModal
        isOpen={isExitConfirmOpen}
        title="Dừng bài thi và quay lại?"
        message="Trạng thái bài thi hiện tại sẽ bị hủy và bạn sẽ quay về màn hình chính. Bạn có chắc chắn không?"
        type="danger"
        confirmText="Rời khỏi"
        cancelText="Ở lại làm tiếp"
        onConfirm={() => {
          setIsExitConfirmOpen(false);
          onExit();
        }}
        onCancel={() => setIsExitConfirmOpen(false)}
      />

      {/* Report Question Modal */}
      <ReportQuestionModal
        isOpen={!!reportingQuestion}
        onClose={() => setReportingQuestion(null)}
        question={reportingQuestion}
        currentIndex={
          reportingQuestion ? questions.findIndex((q) => q.id === reportingQuestion.id) : 0
        }
        onConfirmReport={handleConfirmReport}
      />

      {/* Question Edit Modal */}
      <QuestionEditModal
        isOpen={!!editingQuestion}
        onClose={() => setEditingQuestion(null)}
        question={editingQuestion}
        onSaveQuestion={handleSaveEditedQuestion}
      />
    </div>
  );
};
