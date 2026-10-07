/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  SubjectType,
  Question,
  ExamSession,
  StudyProgress,
  ExamModeType,
  SUBJECT_CONFIGS,
} from './types/hsa';
import {
  UserGoals,
  ExamRecord,
  MistakeEntry,
  AnalyticsSummary,
} from './types/analytics';
import {
  loadQuestions,
  saveQuestions,
  addQuestionsToBank,
  updateQuestionInBank,
  deleteQuestionFromBank,
  resetQuestionBankToDefault,
  loadExamSession,
  saveExamSession,
  loadStudyProgress,
  saveStudyProgress,
} from './services/storageService';
import {
  getUserGoals,
  saveUserGoals,
  getExamHistory,
  getMistakeNotebook,
  getAnalyticsSummary,
  calculateStreakDays,
  calculateTopicStats,
  getWeakestTopics,
} from './services/analyticsService';
import { Header } from './components/Header';
import { SubjectCard } from './components/SubjectCard';
import { SubjectSelectorModal } from './components/SubjectSelectorModal';
import { StudyMode } from './components/StudyMode';
import { ExamMode } from './components/ExamMode';
import { DataImportModal } from './components/DataImportModal';
import { QuestionManagerModal } from './components/QuestionManagerModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { HomeScoreCards } from './components/HomeScoreCards';
import { SubjectAnalyticsView } from './components/SubjectAnalyticsView';
import { GoalSettingsModal } from './components/GoalSettingsModal';
import { MistakeNotebookModal } from './components/MistakeNotebookModal';
import { ExamHistoryModal } from './components/ExamHistoryModal';
import {
  Play,
  Sparkles,
  BookOpen,
  Clock,
  Cloud,
  CheckCircle,
  Award,
  Zap,
  RotateCcw,
  Target,
  Flame,
  Calendar,
  AlertTriangle,
  ArrowRight,
  BookX,
} from 'lucide-react';

/**
 * Cluster questions so that passage-based questions in the same group are NEVER separated
 */
function clusterQuestionsPreservingGroups(qs: Question[]): Question[] {
  const groupsMap = new Map<string, Question[]>();
  const units: Array<{ isGroup: boolean; questions: Question[] }> = [];
  const seenGroupIds = new Set<string>();

  qs.forEach((q) => {
    if (q.groupId) {
      if (!groupsMap.has(q.groupId)) {
        groupsMap.set(q.groupId, []);
      }
      groupsMap.get(q.groupId)!.push(q);
    }
  });

  qs.forEach((q) => {
    if (!q.groupId) {
      units.push({ isGroup: false, questions: [q] });
    } else {
      if (!seenGroupIds.has(q.groupId)) {
        seenGroupIds.add(q.groupId);
        units.push({ isGroup: true, questions: groupsMap.get(q.groupId)! });
      }
    }
  });

  return units.flatMap((u) => u.questions);
}

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('hsa_theme_mode');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('hsa_theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('hsa_theme_mode', 'light');
    }
  }, [darkMode]);

  // Data states
  const [questions, setQuestions] = useState<Question[]>(() => loadQuestions());
  const [studyProgress, setStudyProgress] = useState<StudyProgress>(() => loadStudyProgress());
  const [examSession, setExamSession] = useState<ExamSession | null>(() => loadExamSession());

  // Analytics & Goals states
  const [userGoals, setUserGoals] = useState<UserGoals>(() => getUserGoals());
  const [examHistory, setExamHistory] = useState<ExamRecord[]>(() => getExamHistory());
  const [mistakes, setMistakes] = useState<MistakeEntry[]>(() => getMistakeNotebook());

  // Navigation view
  const [view, setView] = useState<'home' | 'study' | 'exam' | 'analytics'>(() => {
    const active = loadExamSession();
    if (active && !active.isFinished) return 'exam';
    return 'home';
  });

  const [activeStudySubject, setActiveStudySubject] = useState<SubjectType>('math');
  const [selectedAnalyticsSubject, setSelectedAnalyticsSubject] = useState<SubjectType>('math');

  // Custom Study session (e.g. practicing specific topic or mistake notebook)
  const [customStudyQuestions, setCustomStudyQuestions] = useState<Question[] | undefined>(undefined);
  const [customStudyTitle, setCustomStudyTitle] = useState<string | undefined>(undefined);

  // Modal dialog states
  const [subjectModalSubject, setSubjectModalSubject] = useState<SubjectType | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState<boolean>(false);
  const [isMistakesModalOpen, setIsMistakesModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Refresh analytics summary
  const analytics = useMemo(() => {
    return getAnalyticsSummary(studyProgress);
  }, [examHistory, userGoals, studyProgress, mistakes]);

  const streakDays = useMemo(() => calculateStreakDays(), [examHistory, studyProgress]);

  // Sync exam session changes to localStorage
  const handleUpdateExamSession = (session: ExamSession) => {
    setExamSession(session);
    saveExamSession(session);
  };

  const handleFinishExamSession = (session: ExamSession) => {
    setExamSession(session);
    saveExamSession(session);
    // Refresh history & mistakes in memory
    setExamHistory(getExamHistory());
    setMistakes(getMistakeNotebook());
  };

  const handleExitExam = () => {
    setExamSession(null);
    saveExamSession(null);
    setView('home');
  };

  // Sync study progress
  const handleUpdateStudyProgress = (newProgress: StudyProgress) => {
    setStudyProgress(newProgress);
    saveStudyProgress(newProgress);
    setMistakes(getMistakeNotebook());
  };

  // Add questions from AI or JSON
  const handleSaveImportedQuestions = (newQuestions: Question[]) => {
    const updated = addQuestionsToBank(newQuestions);
    setQuestions(updated);
  };

  // Question bank updates
  const handleUpdateQuestion = (updated: Question) => {
    const next = updateQuestionInBank(updated);
    setQuestions(next);
  };

  const handleDeleteQuestion = (id: string) => {
    const next = deleteQuestionFromBank(id);
    setQuestions(next);
  };

  const handleResetQuestions = () => {
    const next = resetQuestionBankToDefault();
    setQuestions(next);
  };

  // Goal updates
  const handleSaveGoals = (newGoals: UserGoals) => {
    setUserGoals(newGoals);
    saveUserGoals(newGoals);
  };

  // Start Exam helper with atomic group clustering
  const startExam = (mode: ExamModeType, singleSubject?: SubjectType) => {
    const subjectList: SubjectType[] =
      mode === 'single-subject' && singleSubject
        ? [singleSubject]
        : ['math', 'literature', 'science'];

    const firstSubj = subjectList[0];
    const durationMin = SUBJECT_CONFIGS[firstSubj].durationMinutes;
    const now = Date.now();

    // Map questions per subject with guaranteed group cluster integrity
    const subjectQuestionsMap: Record<SubjectType, Question[]> = {
      math: clusterQuestionsPreservingGroups(questions.filter((q) => q.subject === 'math')),
      literature: clusterQuestionsPreservingGroups(
        questions.filter((q) => q.subject === 'literature')
      ),
      science: clusterQuestionsPreservingGroups(questions.filter((q) => q.subject === 'science')),
    };

    const newSession: ExamSession = {
      id: `exam-${now}`,
      mode,
      currentSubject: firstSubj,
      subjectsOrder: subjectList,
      subjectQuestions: subjectQuestionsMap,
      userAnswers: {},
      flaggedQuestions: {},
      subjectEndTimes: {
        math: firstSubj === 'math' ? now + durationMin * 60 * 1000 : 0,
        literature: firstSubj === 'literature' ? now + durationMin * 60 * 1000 : 0,
        science: firstSubj === 'science' ? now + durationMin * 60 * 1000 : 0,
      },
      isFinished: false,
      isBreak: false,
      startedAt: now,
    };

    setExamSession(newSession);
    saveExamSession(newSession);
    setView('exam');
  };

  // Handle choice from SubjectSelectorModal
  const handleSelectModeForSubject = (modeChoice: 'study' | 'exam', subject: SubjectType) => {
    setSubjectModalSubject(null);
    if (modeChoice === 'study') {
      setActiveStudySubject(subject);
      setCustomStudyQuestions(undefined);
      setCustomStudyTitle(undefined);
      setView('study');
    } else {
      startExam('single-subject', subject);
    }
  };

  // Launch practice for a specific topic (prioritizing wrong questions)
  const handlePracticeTopic = (topic: string, subject: SubjectType) => {
    const topicQuestions = questions.filter(
      (q) => q.subject === subject && (q.subTopic === topic || (!q.subTopic && topic === 'Tổng hợp'))
    );

    // Prioritize questions in mistake notebook
    const mistakeIds = new Set(mistakes.map((m) => m.questionId));
    const sorted = [...topicQuestions].sort((a, b) => {
      const aIsWrong = mistakeIds.has(a.id) ? 1 : 0;
      const bIsWrong = mistakeIds.has(b.id) ? 1 : 0;
      return bIsWrong - aIsWrong;
    });

    setActiveStudySubject(subject);
    setCustomStudyQuestions(sorted);
    setCustomStudyTitle(`Chuyên đề: ${topic} (${sorted.length} câu)`);
    setView('study');
  };

  // Launch practice for mistake notebook
  const handleStartMistakePractice = (mistakeQuestions: Question[]) => {
    if (mistakeQuestions.length === 0) return;
    setCustomStudyQuestions(mistakeQuestions);
    setCustomStudyTitle(`Sổ lỗi sai: ${mistakeQuestions.length} câu`);
    setView('study');
  };

  // Daily weakest topic calculation for recommendation
  const dailyWeakRecommendation = useMemo(() => {
    // Check all subjects for weakest topic with sufficient data or mistake count
    const candidates: Array<{
      subject: SubjectType;
      topic: string;
      accuracy: number;
      wrongCount: number;
      totalAnswered: number;
    }> = [];

    (['math', 'literature', 'science'] as SubjectType[]).forEach((sub) => {
      const weak = getWeakestTopics(sub);
      weak.forEach((w) => {
        candidates.push({
          subject: sub,
          topic: w.topic,
          accuracy: w.accuracy,
          wrongCount: w.wrongCount,
          totalAnswered: w.totalAnswered,
        });
      });
    });

    if (candidates.length > 0) {
      // Sort by lowest accuracy and highest wrong count
      candidates.sort((a, b) => a.accuracy - b.accuracy || b.wrongCount - a.wrongCount);
      return candidates[0];
    }

    // Fallback: check mistake notebook
    if (mistakes.length > 0) {
      const m = mistakes[0];
      return {
        subject: m.subject,
        topic: m.subTopic || 'Tổng hợp',
        accuracy: 0,
        wrongCount: m.wrongCount,
        totalAnswered: m.wrongCount,
      };
    }

    return null;
  }, [examHistory, mistakes]);

  // Days left to exam countdown
  const daysLeft = useMemo(() => {
    if (!userGoals.examDate) return null;
    const target = new Date(userGoals.examDate).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [userGoals.examDate]);

  // Target total comparison
  const latestTotalScore = useMemo(() => {
    if (examHistory.length === 0) return null;
    return examHistory[0].totalScore;
  }, [examHistory]);

  const scoreGap = latestTotalScore !== null ? userGoals.targetTotal - latestTotalScore : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Header bar */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenManager={() => setIsManagerModalOpen(true)}
        onOpenDrive={() => setIsDriveModalOpen(true)}
        onOpenMistakes={() => setIsMistakesModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenGoals={() => setIsGoalsModalOpen(true)}
        onGoHome={() => setView('home')}
        currentView={view}
        questionCount={questions.length}
        mistakeCount={mistakes.length}
        streakDays={streakDays}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* VIEW 1: STUDY MODE */}
        {view === 'study' && (
          <StudyMode
            initialSubject={activeStudySubject}
            questions={questions}
            onBack={() => setView('home')}
            progress={studyProgress}
            onUpdateProgress={handleUpdateStudyProgress}
            customQuestions={customStudyQuestions}
            studyTitle={customStudyTitle}
          />
        )}

        {/* VIEW 2: EXAM MODE */}
        {view === 'exam' && examSession && (
          <ExamMode
            session={examSession}
            onUpdateSession={handleUpdateExamSession}
            onFinishSession={handleFinishExamSession}
            onExit={handleExitExam}
            onOpenMistakes={() => setIsMistakesModalOpen(true)}
          />
        )}

        {/* VIEW 3: DETAILED SUBJECT ANALYTICS */}
        {view === 'analytics' && (
          <SubjectAnalyticsView
            subject={selectedAnalyticsSubject}
            goals={userGoals}
            questions={questions}
            onBack={() => setView('home')}
            onPracticeTopic={handlePracticeTopic}
          />
        )}

        {/* VIEW 4: HOME DASHBOARD */}
        {view === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
            {/* Active Exam Resume Banner if available */}
            {examSession && !examSession.isFinished && (
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400 dark:border-amber-600 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500 text-white">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Bạn có bài thi đang diễn ra!
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Môn {SUBJECT_CONFIGS[examSession.currentSubject].shortName} • Đồng hồ vẫn
                      đang đếm ngược chuẩn xác.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setView('exam')}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition"
                  >
                    Tiếp tục làm bài
                  </button>
                  <button
                    onClick={handleExitExam}
                    className="px-3 py-2.5 text-xs text-slate-500 hover:text-rose-600 transition"
                  >
                    Hủy bài thi
                  </button>
                </div>
              </div>
            )}

            {/* Target & Countdown Progress Bar Banner */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Target className="w-7 h-7" />
                </div>
                <div className="space-y-1.5 flex-1 max-w-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tiến độ mục tiêu HSA: {userGoals.targetTotal} điểm
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      {latestTotalScore !== null ? `${latestTotalScore} / ${userGoals.targetTotal}đ` : 'Chưa có điểm'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          latestTotalScore !== null
                            ? Math.min(100, (latestTotalScore / userGoals.targetTotal) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {scoreGap !== null ? (
                      scoreGap > 0 ? (
                        <>Còn thiếu <strong className="text-amber-600 dark:text-amber-400">{scoreGap} điểm</strong> để chạm mốc mục tiêu.</>
                      ) : (
                        <span className="text-emerald-600 font-bold">🎉 Đã đạt hoặc vượt mục tiêu xuất sắc!</span>
                      )
                    ) : (
                      'Hãy làm 1 bài kiểm tra để bắt đầu theo dõi khoảng cách mục tiêu.'
                    )}
                  </p>
                </div>
              </div>

              {/* Right: Days left & Streak */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
                {daysLeft !== null && (
                  <div className="text-left sm:text-right px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Ngày thi HSA
                    </div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      Còn {daysLeft} ngày
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsGoalsModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                >
                  Cài đặt mục tiêu
                </button>
              </div>
            </div>

            {/* Daily Weakest Topic Recommendation Card */}
            {dailyWeakRecommendation && (
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-500 text-white shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300">
                        Chuyên đề cần học nhất hôm nay
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {SUBJECT_CONFIGS[dailyWeakRecommendation.subject].shortName}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {dailyWeakRecommendation.topic}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Đã sai {dailyWeakRecommendation.wrongCount} câu trong bài kiểm tra • Ôn lại ngay để cải thiện điểm số
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handlePracticeTopic(dailyWeakRecommendation.topic, dailyWeakRecommendation.subject)
                  }
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Luyện ngay chuyên đề này</span>
                </button>
              </div>
            )}

            {/* Hero Section */}
            <div className="glass-card relative rounded-3xl text-white p-8 sm:p-12 overflow-hidden shadow-2xl border border-white/10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl opacity-20 pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl opacity-20 pointer-events-none" />

              <div className="relative z-10 max-w-3xl space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kỳ thi Đánh giá năng lực HSA • ĐHQGHN</span>
                </div>

                <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                  Luyện Thi <span className="gradient-text">HSA</span> Chuẩn Cấu Trúc ĐHQGHN
                </h1>

                <p className="text-lg text-[#8892aa] max-w-xl leading-relaxed">
                  Hệ thống ôn tập và thi thử trực tuyến toàn diện: Tư duy định lượng (Toán), Tư duy
                  định tính (Ngữ văn), và Khoa học. Tích hợp AI bóc tách đề từ PDF/Ảnh, hiển thị công
                  thức KaTeX, câu hỏi cụm đoạn trích và phân tích tiến độ thông minh.
                </p>

                {/* Primary CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => startExam('full-hsa')}
                    className="flex items-center gap-2.5 py-3.5 px-6 rounded-xl bg-[#00e5ff] hover:bg-cyan-300 text-[#060d1f] font-semibold text-sm shadow-lg shadow-cyan-500/25 transition cursor-pointer hover:scale-102"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Thi thử toàn bộ (Toán → Văn → Khoa học)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 py-3.5 px-5 rounded-xl bg-transparent hover:bg-white/5 text-white font-semibold text-sm backdrop-blur-xs border border-white/15 transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                    <span>Tải file đề thi (AI tách câu hỏi)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* THREE BIG SCORE CARDS ON HOMEPAGE */}
            <HomeScoreCards
              analytics={analytics}
              onSelectSubjectAnalytics={(sub) => {
                setSelectedAnalyticsSubject(sub);
                setView('analytics');
              }}
              onOpenGoalSettings={() => setIsGoalsModalOpen(true)}
            />

            {/* Section 2: Choose Subject (3 Cards) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Chọn môn ôn luyện
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Bấm vào từng môn để chọn chế độ <strong>Ôn tập có lời giải</strong> hoặc{' '}
                    <strong>Kiểm tra bấm giờ</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsManagerModalOpen(true)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline hidden sm:block"
                >
                  Xem tất cả {questions.length} câu hỏi →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(['math', 'literature', 'science'] as SubjectType[]).map((subj) => {
                  const count = questions.filter((q) => q.subject === subj).length;
                  const answeredInSubj = questions
                    .filter((q) => q.subject === subj)
                    .filter((q) => studyProgress.answeredQuestions[q.id] !== undefined).length;

                  return (
                    <SubjectCard
                      key={subj}
                      subject={subj}
                      questionCount={count}
                      studiedCount={answeredInSubj}
                      onClick={() => setSubjectModalSubject(subj)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Section 3: Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="p-2.5 w-fit rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Nhập đề tự phân loại AI
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tải nhiều file PDF, Word, ảnh. Gemini tự động gán vào 3 phần, 5 phân môn Khoa học,
                  chuẩn hoá chuyên đề và câu hỏi cụm.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="p-2.5 w-fit rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Hiển thị công thức KaTeX
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Công thức tích phân, đạo hàm, hình học không gian Oxyz được hiển thị sắc nét, chuẩn
                  xác trên mọi kích thước màn hình điện thoại.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Đồng hồ tính mốc thời gian
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Không bị đứng hoặc sai giờ khi tắt màn hình điện thoại, tải lại trang hay chuyển
                  ứng dụng. Tự động nộp bài và chuyển môn chuẩn xác.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="p-2.5 w-fit rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <BookX className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Sổ lỗi sai thông minh
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tự động gom câu sai trong bài thi. Tự gỡ khỏi sổ khi bạn ôn và làm đúng 2 lần liên
                  tiếp. Gợi ý bài học khắc phục điểm yếu.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 HSA Prep • Luyện thi Đánh giá năng lực ĐHQGHN</p>
          <p className="text-[11px]">
            Toán (75 phút) • Ngữ văn (60 phút) • Khoa học (60 phút) • KaTeX & Gemini AI
          </p>
        </div>
      </footer>

      {/* Subject Mode Selector Modal ("Ôn tập" hoặc "Kiểm tra") */}
      <SubjectSelectorModal
        subject={subjectModalSubject}
        questionCount={
          subjectModalSubject
            ? questions.filter((q) => q.subject === subjectModalSubject).length
            : 0
        }
        isOpen={!!subjectModalSubject}
        onClose={() => setSubjectModalSubject(null)}
        onSelectMode={handleSelectModeForSubject}
      />

      {/* Data Import Modal (AI extraction & JSON backup) */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSaveQuestions={handleSaveImportedQuestions}
        currentQuestions={questions}
      />

      {/* Question Bank Manager Modal */}
      <QuestionManagerModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        questions={questions}
        onUpdateQuestion={handleUpdateQuestion}
        onDeleteQuestion={handleDeleteQuestion}
        onResetDefault={handleResetQuestions}
      />

      {/* Google Drive Integration Modal */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        questions={questions}
        onImportQuestions={handleSaveImportedQuestions}
      />

      {/* Goal Settings Modal */}
      <GoalSettingsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        goals={userGoals}
        onSaveGoals={handleSaveGoals}
      />

      {/* Mistake Notebook Modal */}
      <MistakeNotebookModal
        isOpen={isMistakesModalOpen}
        onClose={() => setIsMistakesModalOpen(false)}
        mistakes={mistakes}
        questions={questions}
        onStartMistakePractice={handleStartMistakePractice}
        onRefreshMistakes={() => setMistakes(getMistakeNotebook())}
      />

      {/* Exam History Modal */}
      <ExamHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={examHistory}
        onReviewExamRecord={(rec) => {
          // You can inspect history record
        }}
      />
    </div>
  );
}
