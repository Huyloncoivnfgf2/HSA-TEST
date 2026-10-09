import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  Clock3,
  Flag,
  Menu,
  Pencil,
  Send,
  X,
} from 'lucide-react';
import type {
  ActiveToolType,
  DrawingStroke,
  ScratchpadPageData,
  StrokeWidthType,
} from '../types/hsa';
import type { ExamRecord, MistakeEntry } from '../types/analytics';
import { SUBJECT_CONFIGS } from '../types/hsa';
import {
  isPdfAnswerCorrect,
  parsePdfAnswerKey,
  pdfQuestionNumbers,
  scorePdfAnswers,
  scoreablePdfQuestionCount,
  type PdfAnnotationStroke,
  type PdfAnswerMode,
  type PdfExam,
  type PdfExamAttempt,
  type PdfExamMode,
  type PdfExamScratchpad,
  type PdfExamSession,
} from '../types/pdfExam';
import {
  getExamHistory,
  getMistakeNotebook,
  getUserGoals,
  recordExamResult,
  replacePdfExamResult,
} from '../services/analyticsService';
import {
  loadPdfExamScratchpad,
  loadPdfExams,
  loadPdfExamSession,
  loadPdfPageAnnotations,
  savePdfExam,
  savePdfExamScratchpad,
  savePdfExamSession,
  savePdfExamSessionLocally,
  savePdfPageAnnotations,
} from '../services/indexedDbService';
import { getCloudSolutionUrl, saveCloudAnswerKey, submitCloudExam } from '../services/cloudExamService';
import { ExamToolbar } from './ExamToolbar';
import { ScratchpadDrawer } from './ScratchpadDrawer';

const PdfCanvasViewer = lazy(() =>
  import('./PdfCanvasViewer').then((module) => ({ default: module.PdfCanvasViewer }))
);

interface PdfExamPlayerProps {
  examId: string;
  isAdmin: boolean;
  initialPage?: number;
  onBack: () => void;
  onResultsChanged: (history: ExamRecord[], mistakes: MistakeEntry[]) => void;
}

const emptyPage = (id: string): ScratchpadPageData => ({
  id,
  pageNumber: 1,
  strokes: [],
  bgPattern: 'grid' as const,
});

function formatRemainingTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function createPdfExamRecord(
  exam: PdfExam,
  attempt: PdfExamAttempt,
  answerKey: Record<number, string>,
  acceptedAnswers: Record<number, string[]> = {}
): ExamRecord {
  const startQuestion = exam.startQuestion ?? 1;
  const subjectScore = scorePdfAnswers(
    attempt.answers,
    answerKey,
    exam.questionCount,
    acceptedAnswers,
    attempt.overriddenCorrect,
    startQuestion
  );
  const scoreable = scoreablePdfQuestionCount(answerKey, exam.questionCount, startQuestion);
  const details = Array.from({ length: exam.questionCount }, (_, index) => startQuestion + index)
    .filter((number) => !!answerKey[number])
    .map((number) => {
      const correct = isPdfAnswerCorrect(
        number,
        attempt.answers[number],
        answerKey,
        acceptedAnswers,
        attempt.overriddenCorrect
      ) === true;
      return {
        questionId: `pdf:${exam.id}:${number}`,
        subject: exam.subject,
        subTopic: attempt.chapterLabels?.[number]?.trim() || 'Tổng hợp',
        userAnswer: attempt.answers[number] ?? '',
        correctAnswer: answerKey[number],
        isCorrect: correct,
        timeSpentSeconds: 0,
        errorType: correct ? undefined : attempt.answers[number] ? 'sai kiến thức' as const : 'bỏ trống' as const,
        pdfExamId: exam.id,
        pdfExamTitle: exam.title,
        pdfPageNumber: attempt.questionPages?.[number] ?? 1,
      };
    });
  const zeroScore = { score: 0, maxScore: 0, correct: 0, total: 0 };
  const subjectScores = {
    math: { ...zeroScore },
    literature: { ...zeroScore },
    science: { ...zeroScore },
  };
  subjectScores[exam.subject] = {
    score: subjectScore,
    maxScore: scoreable,
    correct: subjectScore,
    total: scoreable,
  };
  return {
    id: `pdf-${attempt.id}`,
    date: attempt.submittedAt,
    mode: 'single-subject',
    subjectScores,
    totalScore: subjectScore,
    totalMaxScore: scoreable,
    timeSpentSeconds: Math.max(0, Math.round((attempt.submittedAt - (attempt.startedAt ?? attempt.submittedAt)) / 1000)),
    details,
    pdfExamId: exam.id,
    pdfExamTitle: exam.title,
    pdfSubject: exam.subject,
  };
}

export const PdfExamPlayer: React.FC<PdfExamPlayerProps> = ({
  examId,
  isAdmin,
  initialPage,
  onBack,
  onResultsChanged,
}) => {
  const [exam, setExam] = useState<PdfExam | null>(null);
  const [session, setSession] = useState<PdfExamSession | null>(null);
  const [annotations, setAnnotations] = useState<Record<number, PdfAnnotationStroke[]>>({});
  const [scratchpad, setScratchpad] = useState<PdfExamScratchpad | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage ?? 1);
  const [selectedQuestion, setSelectedQuestion] = useState(1);
  const [answerDrawerOpen, setAnswerDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveToolType>('pointer');
  const [activeColor, setActiveColor] = useState('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState<StrokeWidthType>('medium');
  const [isRulerOpen, setIsRulerOpen] = useState(false);
  const [rulerState, setRulerState] = useState<{ x: number; y: number; angle: number; length: number } | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [globalScratchpadMode, setGlobalScratchpadMode] = useState(false);
  const [editingAnswerKey, setEditingAnswerKey] = useState(false);
  const [answerKeyDraft, setAnswerKeyDraft] = useState('');
  const [answerKeyRows, setAnswerKeyRows] = useState<Record<number, string>>({});
  const [appealQuestion, setAppealQuestion] = useState<number | null>(null);
  const savingAnswersTimer = useRef<number | undefined>(undefined);
  const submittingRef = useRef(false);
  const gridQuestionRefs = useRef(new Map<number, HTMLButtonElement>());
  const responseRef = useRef<HTMLDivElement>(null);
  const strokeHistory = useRef(new Map<number, PdfAnnotationStroke[][]>());
  const strokeHistoryIndices = useRef(new Map<number, number>());
  const subject = exam ? SUBJECT_CONFIGS[exam.subject] : null;
  const isEditable = !!session && (!session.submitted || session.mode === 'study');
  const lineWidth = strokeWidth === 'thin' ? 2 : strokeWidth === 'thick' ? 7 : 4;
  const questionNumbers = useMemo(
    () => exam ? pdfQuestionNumbers(exam.questionCount, exam.startQuestion ?? 1) : [],
    [exam?.questionCount, exam?.startQuestion]
  );
  const scratchpadPages = scratchpad
    ? globalScratchpadMode
      ? scratchpad.globalPages
      : scratchpad.questionPages[selectedQuestion] ?? [emptyPage(`pdf-sp-${selectedQuestion}-1`)]
    : [emptyPage('pdf-sp-loading')];
  const scratchpadPageIndex = scratchpad
    ? globalScratchpadMode
      ? scratchpad.currentGlobalPage
      : scratchpad.currentQuestionPages[selectedQuestion] ?? 0
    : 0;

  useEffect(() => {
    let mounted = true;
    Promise.all([
      loadPdfExams(),
      loadPdfExamSession(),
      loadPdfPageAnnotations(examId),
      loadPdfExamScratchpad(examId),
    ]).then(async ([exams, activeSession, savedAnnotations, savedScratchpad]) => {
      if (!mounted) return;
      let foundExam = exams.find((item) => item.id === examId);
      if (!foundExam) {
        setLoadError('Không tìm thấy đề PDF này. Có thể đề đã bị xóa.');
        return;
      }
      const latestAttempt = [...foundExam.attempts]
        .sort((first, second) => second.submittedAt - first.submittedAt)[0];
      const submittedAnswers = activeSession?.examId === examId && activeSession.submitted
        ? activeSession.answers
        : !activeSession ? latestAttempt?.answers : undefined;
      if (submittedAnswers && Object.keys(foundExam.answerKey).length === 0) {
        const result = await submitCloudExam(examId, submittedAnswers);
        foundExam = {
          ...foundExam,
          answerKey: result.answers,
          solutionPath: result.solutionPath ?? undefined,
        };
        await savePdfExam(foundExam);
      }
      setExam(foundExam);
      const annotationsByPage: Record<number, PdfAnnotationStroke[]> = {};
      const history = strokeHistory.current;
      const historyIndexes = strokeHistoryIndices.current;
      for (const page of savedAnnotations) {
        annotationsByPage[page.pageNumber] = page.strokes;
        history.set(page.pageNumber, [page.strokes]);
        historyIndexes.set(page.pageNumber, 0);
      }
      setAnnotations(annotationsByPage);
      setScratchpad(savedScratchpad ?? {
        examId,
        questionPages: {},
        globalPages: [emptyPage(`pdf-global-${examId}-1`)],
        currentQuestionPages: {},
        currentGlobalPage: 0,
      });
      if (activeSession?.examId === examId) {
        const matchingAttempt = activeSession.attemptId
          ? foundExam.attempts.find((attempt) => attempt.id === activeSession.attemptId)
          : [...foundExam.attempts]
              .sort((first, second) => second.submittedAt - first.submittedAt)
              .find((attempt) => attempt.submittedAt === activeSession.submittedAt);
        setSession({
          ...activeSession,
          attemptId: activeSession.attemptId ?? matchingAttempt?.id,
          answerModes: activeSession.answerModes ?? {},
          flaggedQuestions: activeSession.flaggedQuestions ?? {},
          chapterLabels: activeSession.chapterLabels ?? {},
          questionPages: activeSession.questionPages ?? {},
        });
        return;
      }
      const latest = [...foundExam.attempts].sort((a, b) => b.submittedAt - a.submittedAt)[0];
      if (!latest) {
        setLoadError('Không tìm thấy bài làm để xem lại.');
        return;
      }
      setSession({
        id: 'active',
        examId,
        attemptId: latest.id,
        mode: 'review',
        answers: latest.answers,
        answerModes: latest.answerModes ?? {},
        flaggedQuestions: latest.flaggedQuestions ?? {},
        chapterLabels: latest.chapterLabels ?? {},
        questionPages: latest.questionPages ?? {},
        startedAt: latest.submittedAt,
        endsAt: null,
        submitted: true,
        score: latest.score,
        submittedAt: latest.submittedAt,
      });
    }).catch((error: unknown) => {
      console.error('Could not load the PDF exam:', error);
      if (mounted) setLoadError('Không thể mở bài PDF đã lưu.');
    });
    return () => {
      mounted = false;
      if (savingAnswersTimer.current) window.clearTimeout(savingAnswersTimer.current);
    };
  }, [examId]);

  const saveSession = useCallback((nextSession: PdfExamSession) => {
    setSession(nextSession);
    setStorageError(null);
    if (savingAnswersTimer.current) window.clearTimeout(savingAnswersTimer.current);
    try {
      savePdfExamSessionLocally(nextSession);
    } catch (error) {
      console.error('Could not save the PDF exam locally:', error);
      setStorageError('Không thể lưu bài làm vào bộ nhớ trình duyệt.');
    }
    savingAnswersTimer.current = window.setTimeout(() => {
      void savePdfExamSession(nextSession).catch((error: unknown) => {
        console.error('Could not autosave the PDF exam:', error);
        setStorageError('Không thể tự lưu bài làm. Hãy kiểm tra dung lượng lưu trữ của trình duyệt.');
      });
    }, 200);
  }, []);

  const handleResultsUpdated = useCallback(() => {
    onResultsChanged(getExamHistory(), getMistakeNotebook());
  }, [onResultsChanged]);

  const submitExam = useCallback(async (currentSession: PdfExamSession) => {
    if (!exam || currentSession.submitted || submittingRef.current || currentSession.mode === 'review') return;
    if (savingAnswersTimer.current) window.clearTimeout(savingAnswersTimer.current);
    submittingRef.current = true;
    setIsSubmitting(true);
    const submittedAt = Date.now();
    try {
      const submission = await submitCloudExam(exam.id, currentSession.answers);
      const submittedExam = {
        ...exam,
        answerKey: submission.answers,
        solutionPath: submission.solutionPath ?? undefined,
      };
      const attempt: PdfExamAttempt = {
      id: crypto.randomUUID(),
      mode: currentSession.mode,
      isContentTest: currentSession.isContentTest,
      answers: currentSession.answers,
      startedAt: currentSession.startedAt,
      answerModes: currentSession.answerModes,
      flaggedQuestions: currentSession.flaggedQuestions,
      chapterLabels: currentSession.chapterLabels,
      questionPages: currentSession.questionPages,
      score: scorePdfAnswers(
        currentSession.answers,
        submittedExam.answerKey,
        submittedExam.questionCount,
        submittedExam.acceptedAnswers
      ),
      submittedAt,
      };
      const updatedExam: PdfExam = {
      ...submittedExam,
      attempts: [...exam.attempts, attempt],
      bestScore: attempt.isContentTest ? exam.bestScore : Math.max(exam.bestScore ?? 0, attempt.score),
      };
      const submittedSession: PdfExamSession = {
      ...currentSession,
      attemptId: attempt.id,
      submitted: true,
      score: attempt.score,
      submittedAt,
      };
      await savePdfExam(updatedExam);
      await savePdfExamSession(submittedSession);
      setExam(updatedExam);
      setSession(submittedSession);
      if (!attempt.isContentTest) {
        recordExamResult(createPdfExamRecord(updatedExam, attempt, updatedExam.answerKey, updatedExam.acceptedAnswers));
        handleResultsUpdated();
      }
      setStorageError(null);
    } catch (error) {
      console.error('Could not submit the PDF exam:', error);
      setStorageError('Không thể gửi bài lên cloud hoặc lưu kết quả. Bài làm vẫn còn trên màn hình; hãy thử lại khi có mạng.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [exam, handleResultsUpdated]);

  useEffect(() => {
    if (!session || session.submitted || !session.endsAt) return;
    const updateTimer = () => {
      const remaining = session.endsAt! - Date.now();
      setRemainingTime(remaining);
      if (remaining <= 0) void submitExam(session);
    };
    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [session, submitExam]);

  const updateStrokes = useCallback((pageNumber: number, next: PdfAnnotationStroke[]) => {
    setAnnotations((current) => ({ ...current, [pageNumber]: next }));
    const history = strokeHistory.current.get(pageNumber) ?? [annotations[pageNumber] ?? []];
    const historyIndex = strokeHistoryIndices.current.get(pageNumber) ?? history.length - 1;
    const updatedHistory = [...history.slice(0, historyIndex + 1), next];
    strokeHistory.current.set(pageNumber, updatedHistory);
    strokeHistoryIndices.current.set(pageNumber, updatedHistory.length - 1);
    void savePdfPageAnnotations({
      key: `${examId}:${pageNumber}`,
      examId,
      pageNumber,
      strokes: next,
    }).catch((error: unknown) => {
      console.error('Could not save PDF annotations:', error);
      setStorageError('Không thể lưu nét vẽ của trang PDF.');
    });
  }, [annotations, examId]);

  const undoPageStrokes = () => {
    const history = strokeHistory.current.get(currentPage) ?? [];
    const index = strokeHistoryIndices.current.get(currentPage) ?? 0;
    if (index <= 0) return;
    const nextIndex = index - 1;
    strokeHistoryIndices.current.set(currentPage, nextIndex);
    const next = history[nextIndex];
    setAnnotations((current) => ({ ...current, [currentPage]: next }));
    void savePdfPageAnnotations({ key: `${examId}:${currentPage}`, examId, pageNumber: currentPage, strokes: next });
  };

  const redoPageStrokes = () => {
    const history = strokeHistory.current.get(currentPage) ?? [];
    const index = strokeHistoryIndices.current.get(currentPage) ?? 0;
    if (index >= history.length - 1) return;
    const nextIndex = index + 1;
    strokeHistoryIndices.current.set(currentPage, nextIndex);
    const next = history[nextIndex];
    setAnnotations((current) => ({ ...current, [currentPage]: next }));
    void savePdfPageAnnotations({ key: `${examId}:${currentPage}`, examId, pageNumber: currentPage, strokes: next });
  };

  const clearPageStrokes = () => updateStrokes(currentPage, []);

  const persistScratchpad = (next: PdfExamScratchpad) => {
    setScratchpad(next);
    void savePdfExamScratchpad(next).catch((error: unknown) => {
      console.error('Could not save the PDF scratchpad:', error);
      setStorageError('Không thể lưu bảng nháp vào IndexedDB.');
    });
  };

  const selectQuestion = (number: number) => {
    setSelectedQuestion(number);
    responseRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const mappedPage = session?.questionPages[number];
    if (mappedPage) setCurrentPage(mappedPage);
  };

  const onPageChange = useCallback((page: number) => setCurrentPage(page), []);

  const changeAnswer = (value: string) => {
    if (!session || !isEditable) return;
    saveSession({ ...session, answers: { ...session.answers, [selectedQuestion]: value } });
  };

  const changeAnswerMode = (mode: PdfAnswerMode) => {
    if (!session || !isEditable) return;
    saveSession({ ...session, answerModes: { ...session.answerModes, [selectedQuestion]: mode } });
  };

  const toggleFlag = (number: number) => {
    if (!session || !isEditable) return;
    saveSession({
      ...session,
      flaggedQuestions: {
        ...session.flaggedQuestions,
        [number]: !session.flaggedQuestions[number],
      },
    });
  };

  const attachCurrentPage = () => {
    if (!session || !isEditable) return;
    saveSession({ ...session, questionPages: { ...session.questionPages, [selectedQuestion]: currentPage } });
  };

  const updateChapterLabel = (number: number, label: string) => {
    if (!exam || !session?.submitted || !session.attemptId) return;
    const nextSession = { ...session, chapterLabels: { ...session.chapterLabels, [number]: label } };
    const updatedExam = {
      ...exam,
      attempts: exam.attempts.map((attempt) => attempt.id === session.attemptId
        ? { ...attempt, chapterLabels: nextSession.chapterLabels }
        : attempt),
    };
    setExam(updatedExam);
    saveSession(nextSession);
    void savePdfExam(updatedExam).then(() => {
      const attempt = updatedExam.attempts.find((item) => item.id === session.attemptId);
      if (attempt && !attempt.isContentTest) {
        replacePdfExamResult(createPdfExamRecord(updatedExam, attempt, updatedExam.answerKey, updatedExam.acceptedAnswers));
        handleResultsUpdated();
      }
    }).catch((error: unknown) => {
      console.error('Could not save the PDF topic label:', error);
      setStorageError('Không thể lưu chương của câu hỏi.');
    });
  };

  const appealFillAnswer = async (number: number) => {
    if (!exam || !session?.submitted || !session.attemptId || !session.answers[number]) return;
    const variants = exam.acceptedAnswers?.[number] ?? [];
    const answer = session.answers[number].trim();
    if (!variants.some((variant) => variant.trim().toUpperCase() === answer.toUpperCase())) {
      const updatedExam = {
        ...exam,
        acceptedAnswers: {
          ...exam.acceptedAnswers,
          [number]: [...variants, answer],
        },
      };
      const attempts = updatedExam.attempts.map((attempt) => ({
        ...attempt,
        score: scorePdfAnswers(
          attempt.answers,
          updatedExam.answerKey,
          updatedExam.questionCount,
          updatedExam.acceptedAnswers,
          attempt.overriddenCorrect
        ),
      }));
      const regradedExam = {
        ...updatedExam,
        attempts,
        bestScore: attempts.some((attempt) => !attempt.isContentTest) ? Math.max(0, ...attempts.filter((attempt) => !attempt.isContentTest).map((attempt) => attempt.score)) : exam.bestScore,
      };
      const currentAttempt = attempts.find((attempt) => attempt.id === session.attemptId);
      if (!currentAttempt) return;
      const nextSession = { ...session, score: currentAttempt.score };
      try {
        await savePdfExam(regradedExam);
        await savePdfExamSession(nextSession);
        setExam(regradedExam);
        setSession(nextSession);
        const sorted = [...attempts].sort((a, b) => a.submittedAt - b.submittedAt);
        let history = getExamHistory();
        for (const attempt of sorted) {
          if (attempt.isContentTest) continue;
          history = replacePdfExamResult(createPdfExamRecord(
            regradedExam,
            attempt,
            regradedExam.answerKey,
            regradedExam.acceptedAnswers
          ));
        }
        handleResultsUpdated();
      } catch (error) {
        console.error('Could not apply the accepted answer:', error);
        setStorageError('Không thể lưu đáp án được chấp nhận.');
      }
    }
    setAppealQuestion(null);
  };

  const changeScrollLock = async (locked: boolean) => {
    if (!exam) return;
    const updated = { ...exam, scrollLocked: locked };
    setExam(updated);
    try {
      await savePdfExam(updated);
    } catch (error) {
      console.error('Could not save the PDF scroll-lock setting:', error);
      setStorageError('Không thể lưu trạng thái ghim cho đề này.');
    }
  };

  const handleAnswerKeyPaste = (text: string, questionCount: number) => {
    setAnswerKeyDraft(text);
    setAnswerKeyRows(parsePdfAnswerKey(text, questionCount, exam?.startQuestion ?? 1).answers);
  };

  const saveCorrectedAnswerKey = async () => {
    if (!exam || !session?.submitted || !session.attemptId) return;
    const diagnostics = parsePdfAnswerKey(answerKeyDraft, exam.questionCount, exam.startQuestion ?? 1);
    if (diagnostics.duplicates.length > 0) {
      setStorageError(`Câu đáp án bị nhập trùng: ${diagnostics.duplicates.join(', ')}.`);
      return;
    }
    if (!window.confirm('Lưu đáp án mới và chấm lại bài đã nộp?')) return;
    const updatedExam = { ...exam, answerKey: answerKeyRows };
    const attempts = updatedExam.attempts.map((attempt) => ({
      ...attempt,
      score: scorePdfAnswers(
        attempt.answers,
        answerKeyRows,
        exam.questionCount,
        updatedExam.acceptedAnswers,
        attempt.overriddenCorrect,
        exam.startQuestion ?? 1
      ),
    }));
    const regradedExam = {
      ...updatedExam,
      attempts,
      bestScore: attempts.some((attempt) => !attempt.isContentTest) ? Math.max(0, ...attempts.filter((attempt) => !attempt.isContentTest).map((attempt) => attempt.score)) : exam.bestScore,
    };
    const currentAttempt = attempts.find((attempt) => attempt.id === session.attemptId);
    if (!currentAttempt) return;
    const nextSession = { ...session, score: currentAttempt.score };
    try {
      await savePdfExam(regradedExam);
      if (isAdmin) await saveCloudAnswerKey(regradedExam);
      await savePdfExamSession(nextSession);
      setExam(regradedExam);
      setSession(nextSession);
      let history = getExamHistory();
      for (const attempt of [...attempts].sort((a, b) => a.submittedAt - b.submittedAt)) {
        if (attempt.isContentTest) continue;
        history = replacePdfExamResult(createPdfExamRecord(regradedExam, attempt, answerKeyRows, regradedExam.acceptedAnswers));
      }
      handleResultsUpdated();
      setEditingAnswerKey(false);
      setStorageError(null);
    } catch (error) {
      console.error('Could not regrade the PDF exam:', error);
      setStorageError('Không thể lưu đáp án và chấm lại bài.');
    }
  };

  const openSolution = async () => {
    if (!session?.submitted || !exam) return;
    try {
      const url = exam.solutionBlob
        ? URL.createObjectURL(exam.solutionBlob)
        : exam.solutionPath ? await getCloudSolutionUrl(exam.solutionPath) : null;
      if (!url) return;
      window.open(url, '_blank', 'noopener,noreferrer');
      if (exam.solutionBlob) window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error('Could not open the solution file:', error);
      setStorageError('Không thể mở lời giải. Kiểm tra kết nối rồi thử lại.');
    }
  };

  const saveScratchpadPages = (index: number, strokes: DrawingStroke[]) => {
    if (!scratchpad) return;
    const currentPages = globalScratchpadMode
      ? scratchpad.globalPages
      : scratchpad.questionPages[selectedQuestion] ?? [emptyPage(`pdf-sp-${selectedQuestion}-1`)];
    const updatedPages = currentPages.map((page, pageIndex) => pageIndex === index ? { ...page, strokes } : page);
    persistScratchpad(globalScratchpadMode
      ? { ...scratchpad, globalPages: updatedPages }
      : { ...scratchpad, questionPages: { ...scratchpad.questionPages, [selectedQuestion]: updatedPages } });
  };

  const addScratchpadPage = () => {
    if (!scratchpad || scratchpadPages.length >= 10) return;
    const page = emptyPage(`pdf-sp-${globalScratchpadMode ? 'global' : selectedQuestion}-${crypto.randomUUID()}`);
    const nextPages = [...scratchpadPages, { ...page, pageNumber: scratchpadPages.length + 1 }];
    persistScratchpad(globalScratchpadMode
      ? { ...scratchpad, globalPages: nextPages, currentGlobalPage: nextPages.length - 1 }
      : {
          ...scratchpad,
          questionPages: { ...scratchpad.questionPages, [selectedQuestion]: nextPages },
          currentQuestionPages: { ...scratchpad.currentQuestionPages, [selectedQuestion]: nextPages.length - 1 },
        });
  };

  const changeScratchpadPage = (index: number) => {
    if (!scratchpad || index < 0 || index >= scratchpadPages.length) return;
    persistScratchpad(globalScratchpadMode
      ? { ...scratchpad, currentGlobalPage: index }
      : { ...scratchpad, currentQuestionPages: { ...scratchpad.currentQuestionPages, [selectedQuestion]: index } });
  };

  const deleteScratchpadPage = (index: number) => {
    if (!scratchpad || scratchpadPages.length <= 1) return;
    const updatedPages = scratchpadPages.filter((_, pageIndex) => pageIndex !== index);
    const currentIndex = Math.min(scratchpadPageIndex, updatedPages.length - 1);
    persistScratchpad(globalScratchpadMode
      ? { ...scratchpad, globalPages: updatedPages, currentGlobalPage: currentIndex }
      : {
          ...scratchpad,
          questionPages: { ...scratchpad.questionPages, [selectedQuestion]: updatedPages },
          currentQuestionPages: { ...scratchpad.currentQuestionPages, [selectedQuestion]: currentIndex },
        });
  };

  const toggleScratchpadPattern = (index: number) => {
    if (!scratchpad) return;
    const nextPattern = (pattern?: ScratchpadPageData['bgPattern']): ScratchpadPageData['bgPattern'] =>
      pattern === 'grid' ? 'ruled' : pattern === 'ruled' ? 'blank' : 'grid';
    const pages = scratchpadPages.map((page, pageIndex) => pageIndex === index
      ? { ...page, bgPattern: nextPattern(page.bgPattern) }
      : page);
    persistScratchpad(globalScratchpadMode
      ? { ...scratchpad, globalPages: pages }
      : { ...scratchpad, questionPages: { ...scratchpad.questionPages, [selectedQuestion]: pages } });
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{loadError}</p>
        <button type="button" onClick={onBack} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-slate-700">Quay lại thư viện</button>
      </div>
    );
  }
  if (!exam || !session || !subject || !scratchpad) return <p className="p-12 text-center text-sm text-slate-500">Đang mở đề PDF…</p>;

  const submitted = session.submitted;
  const scoreable = scoreablePdfQuestionCount(exam.answerKey, exam.questionCount);
  const unscored = exam.questionCount - scoreable;
  const score = submitted
    ? session.score ?? scorePdfAnswers(session.answers, exam.answerKey, exam.questionCount, exam.acceptedAnswers)
    : 0;
  const goal = getUserGoals()[exam.subject === 'math' ? 'targetMath' : exam.subject === 'literature' ? 'targetLiterature' : 'targetScience'];
  const currentOutcome = submitted
    ? isPdfAnswerCorrect(
        selectedQuestion,
        session.answers[selectedQuestion],
        exam.answerKey,
        exam.acceptedAnswers
      )
    : null;
  const answerPanel = (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div>
          <h2 className="font-extrabold">Phiếu đáp án</h2>
          <p className="text-xs text-slate-500">{Object.values(session.answers).filter((answer) => answer.trim()).length}/{exam.questionCount} câu đã trả lời</p>
        </div>
        <button type="button" aria-label="Đóng phiếu đáp án" onClick={() => setAnswerDrawerOpen(false)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"><X className="h-4 w-4" /></button>
      </div>
      {submitted && (
        <div className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">Điểm: {score}/{scoreable}</div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Đúng 1 điểm/câu{unscored ? ` · ${unscored} câu chưa có đáp án chuẩn, không tính điểm` : ''}</p>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-5">
          {questionNumbers.map((number) => {
            const answer = session.answers[number] ?? '';
            const outcome = submitted
              ? isPdfAnswerCorrect(number, answer, exam.answerKey, exam.acceptedAnswers)
              : null;
            const current = number === selectedQuestion;
            return (
              <button
                key={number}
                ref={(element) => {
                  if (element) gridQuestionRefs.current.set(number, element);
                  else gridQuestionRefs.current.delete(number);
                }}
                type="button"
                onClick={() => selectQuestion(number)}
                className={`relative flex min-h-12 flex-col items-center justify-center rounded-xl border text-xs transition ${
                  outcome === true ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                    outcome === false ? 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300' :
                      submitted && outcome === null ? 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                        current ? 'border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-400 dark:bg-blue-950/50 dark:text-blue-300' :
                          answer ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' :
                            'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className="font-bold">{number}</span>
                <span className="max-w-full truncate px-0.5 text-[10px]">{answer || '—'}</span>
                {session.flaggedQuestions[number] && <Flag className="absolute right-0.5 top-0.5 h-2.5 w-2.5 fill-amber-500 text-amber-600" />}
              </button>
            );
          })}
        </div>
      </div>
      <div ref={responseRef} className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs font-bold">
          <span>Câu {selectedQuestion}</span>
          {!submitted && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => toggleFlag(selectedQuestion)} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${session.flaggedQuestions[selectedQuestion] ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Flag className="h-3.5 w-3.5" /> Cờ</button>
              <button type="button" onClick={attachCurrentPage} className="rounded-lg px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Gắn trang {currentPage}</button>
            </div>
          )}
        </div>
        {!submitted ? (
          <>
            {exam.subject !== 'literature' && (
              <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-[10px] font-bold dark:bg-slate-800">
                {(['choice', 'fill'] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => changeAnswerMode(mode)} className={`rounded-md py-1.5 ${((session.answerModes[selectedQuestion] ?? 'choice') === mode) ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-500'}`}>{mode === 'choice' ? 'Trắc nghiệm' : 'Điền đáp án'}</button>
                ))}
              </div>
            )}
            {(session.answerModes[selectedQuestion] ?? 'choice') === 'choice' || exam.subject === 'literature' ? (
              <div className="grid grid-cols-4 gap-1">
                {['A', 'B', 'C', 'D'].map((answer) => (
                  <button key={answer} type="button" onClick={() => changeAnswer(answer)} className={`rounded-lg border py-2 text-sm font-bold ${session.answers[selectedQuestion] === answer ? 'border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{answer}</button>
                ))}
              </div>
            ) : (
              <label className="block text-[11px] font-semibold text-slate-500">
                Đáp án điền
                <input
                  value={session.answers[selectedQuestion] ?? ''}
                  onChange={(event) => changeAnswer(event.target.value)}
                  placeholder="Nhập đáp án, ví dụ 12,5"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            )}
          </>
        ) : (
          <div className="space-y-2 text-xs">
            <p>Đáp án của tôi: <strong>{session.answers[selectedQuestion] || 'Bỏ trống'}</strong></p>
            {currentOutcome === null
              ? <p className="text-slate-500">Chưa có đáp án chuẩn — không tính điểm.</p>
              : <p>Đáp án đúng: <strong className="text-emerald-700 dark:text-emerald-300">{exam.answerKey[selectedQuestion]}</strong></p>}
            {currentOutcome === false && session.answers[selectedQuestion] &&
              session.answerModes[selectedQuestion] === 'fill' && (
                <button type="button" onClick={() => setAppealQuestion(selectedQuestion)} className="rounded-lg border border-amber-300 px-3 py-1.5 font-bold text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950">Tôi đúng</button>
              )}
            {currentOutcome === false && (
              <label className="block text-[11px] font-semibold text-slate-500">
                Chương / chủ đề
                <input
                  value={session.chapterLabels[selectedQuestion] ?? ''}
                  onChange={(event) => updateChapterLabel(selectedQuestion, event.target.value)}
                  placeholder="Ví dụ: Hàm số"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-normal dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[420px] flex-col">
      <header className="z-40 flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={onBack} aria-label="Quay lại thư viện" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold sm:text-base">{exam.title}</h1>
            <p className="text-[10px] text-slate-500">{subject.shortName} · {session.mode === 'test' ? 'Kiểm tra' : session.mode === 'study' ? 'Ôn tập' : 'Xem lại'}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {session.mode === 'test' && !submitted && (
            <div className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-extrabold tabular-nums ${remainingTime <= 60_000 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Clock3 className="h-3.5 w-3.5" /> {formatRemainingTime(remainingTime)}
            </div>
          )}
          {submitted && (exam.solutionBlob || exam.solutionPath) && (
            <button type="button" onClick={() => void openSolution()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" title="Mở lời giải">
              <BookOpenCheck className="h-4 w-4" /><span className="hidden sm:inline">Lời giải</span>
            </button>
          )}
          {isAdmin && submitted && (
            <button
              type="button"
              onClick={() => {
                setAnswerKeyDraft(Object.entries(exam.answerKey).map(([number, answer]) => `${number}.${answer}`).join(' '));
                setAnswerKeyRows({ ...exam.answerKey });
                setEditingAnswerKey(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950"
            ><Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sửa đáp án đúng</span></button>
          )}
          {!submitted && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (window.confirm('Nộp bài và hiện đáp án đúng?')) void submitExam(session);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            ><Send className="h-3.5 w-3.5" /><span className="hidden sm:inline">Nộp bài</span></button>
          )}
          {submitted && <span className="rounded-lg bg-emerald-100 px-2 py-1.5 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{score}/{scoreable}</span>}
        </div>
      </header>

      <ExamToolbar
        activeTool={activeTool}
        onChangeTool={setActiveTool}
        activeColor={activeColor}
        onChangeColor={setActiveColor}
        strokeWidth={strokeWidth}
        onChangeStrokeWidth={setStrokeWidth}
        isRulerOpen={isRulerOpen}
        onToggleRuler={() => setIsRulerOpen((open) => !open)}
        onUndo={undoPageStrokes}
        onRedo={redoPageStrokes}
        onClear={clearPageStrokes}
        canUndo={(strokeHistoryIndices.current.get(currentPage) ?? 0) > 0}
        canRedo={(strokeHistoryIndices.current.get(currentPage) ?? 0) < (strokeHistory.current.get(currentPage)?.length ?? 1) - 1}
        subject={exam.subject}
        isScratchpadOpen={scratchpadOpen}
        onToggleScratchpad={exam.subject !== 'literature' ? () => setScratchpadOpen((open) => !open) : undefined}
        showAnnotations={showAnnotations}
        onToggleShowAnnotations={() => setShowAnnotations((visible) => !visible)}
        readOnly={!isEditable}
      />

      {storageError && <div role="alert" className="shrink-0 bg-rose-50 px-4 py-1.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{storageError}</div>}

      <div className="relative flex min-h-0 flex-1">
        <div className="h-full min-w-0 flex-1 lg:w-[72%] lg:flex-none">
          <Suspense fallback={<p className="p-8 text-center text-sm text-slate-500">Đang tải trình xem PDF…</p>}>
            <PdfCanvasViewer
              file={exam.pdfBlob}
              scrollLocked={exam.scrollLocked}
              onScrollLockedChange={(locked) => void changeScrollLock(locked)}
              activeTool={activeTool}
              activeColor={activeColor}
              lineWidth={lineWidth}
              readOnly={!isEditable}
              showAnnotations={showAnnotations}
              rulerOpen={isRulerOpen}
              onRulerToggle={() => setIsRulerOpen(false)}
              rulerState={rulerState}
              onRulerStateChange={setRulerState}
              strokesByPage={annotations}
              onAddPageStroke={(pageNumber, stroke) => updateStrokes(pageNumber, [...(annotations[pageNumber] ?? []), stroke])}
              onErasePageStroke={(pageNumber, strokeId) => updateStrokes(pageNumber, (annotations[pageNumber] ?? []).filter((stroke) => stroke.id !== strokeId))}
              onCurrentPageChange={onPageChange}
              requestedPage={currentPage}
              pageStart={exam.pageStart}
              pageEnd={exam.pageEnd}
            />
          </Suspense>
        </div>
        <aside className="hidden h-full w-[28%] min-w-[310px] border-l border-slate-200 lg:block dark:border-slate-800">{answerPanel}</aside>
        {!answerDrawerOpen && (
          <button type="button" onClick={() => setAnswerDrawerOpen(true)} className="fixed bottom-5 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg lg:hidden"><Menu className="h-4 w-4" /> Phiếu đáp án</button>
        )}
        {answerDrawerOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 lg:hidden" onClick={() => setAnswerDrawerOpen(false)}>
            <div className="absolute inset-x-0 bottom-0 h-[82dvh] overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>{answerPanel}</div>
          </div>
        )}
      </div>

      {submitted && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-xs dark:border-emerald-900 dark:bg-emerald-950/30">
          <span className="font-bold text-emerald-800 dark:text-emerald-300">
            Điểm: {score}/{scoreable} · Mục tiêu {goal} · {score >= goal ? 'Đạt mục tiêu' : `Còn thiếu ${goal - score} điểm`}
            {unscored ? ` · ${unscored} câu chưa có đáp án chuẩn, không tính điểm` : ''}
          </span>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900"><BookOpenCheck className="h-3.5 w-3.5" /> Về thư viện</button>
        </div>
      )}

      {exam.subject !== 'literature' && (
        <ScratchpadDrawer
          isOpen={scratchpadOpen}
          onClose={() => setScratchpadOpen(false)}
          isGlobalMode={globalScratchpadMode}
          onToggleGlobalMode={() => setGlobalScratchpadMode((global) => !global)}
          currentQuestionNumber={selectedQuestion}
          pages={scratchpadPages}
          currentPageIndex={scratchpadPageIndex}
          onChangePage={changeScratchpadPage}
          onAddPage={addScratchpadPage}
          onDeletePage={deleteScratchpadPage}
          onSavePageStrokes={saveScratchpadPages}
          onToggleBgPattern={toggleScratchpadPattern}
          readOnly={!isEditable}
        />
      )}

      {editingAnswerKey && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3" role="dialog" aria-modal="true" aria-label="Sửa đáp án và chấm lại">
          <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div><h3 className="font-extrabold">Sửa đáp án đúng và chấm lại</h3><p className="mt-1 text-xs text-slate-500">{exam.title} · thao tác chỉ có sau khi nộp</p></div>
              <button type="button" onClick={() => setEditingAnswerKey(false)} aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <textarea value={answerKeyDraft} onChange={(event) => handleAnswerKeyPaste(event.target.value, exam.questionCount)} rows={4} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="1.A 2.C 3.12,5" />
              {(() => {
                const diagnostics = parsePdfAnswerKey(answerKeyDraft, exam.questionCount, exam.startQuestion ?? 1);
                return <p className="text-xs text-slate-500">Thiếu {diagnostics.missing.length} · trùng {diagnostics.duplicates.join(', ') || 'không'} · ngoài phạm vi {diagnostics.outOfRange.join(', ') || 'không'}</p>;
              })()}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {questionNumbers.map((number) => (
                  <label key={number} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700">
                    <span className="w-8 shrink-0 font-bold">{number}</span>
                    <input aria-label={`Đáp án chuẩn câu ${number}`} value={answerKeyRows[number] ?? ''} onChange={(event) => setAnswerKeyRows((rows) => ({ ...rows, [number]: event.target.value }))} className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800" />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <button type="button" onClick={() => setEditingAnswerKey(false)} className="rounded-lg px-3 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Hủy</button>
              <button type="button" onClick={() => void saveCorrectedAnswerKey()} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Lưu và chấm lại</button>
            </div>
          </div>
        </div>
      )}

      {appealQuestion !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Đề nghị chấp nhận đáp án">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="font-extrabold">Chấp nhận đáp án câu {appealQuestion}?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">Đáp án bạn nhập “{session.answers[appealQuestion]}” sẽ được thêm vào các cách viết đúng và chấm lại.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAppealQuestion(null)} className="rounded-lg px-3 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Hủy</button>
              <button type="button" onClick={() => void appealFillAnswer(appealQuestion)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Chấp nhận và chấm lại</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
