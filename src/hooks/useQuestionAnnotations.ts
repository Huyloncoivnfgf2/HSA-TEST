import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveToolType,
  StrokeWidthType,
  TextAnnotation,
  DrawingStroke,
  ScratchpadPageData,
  QuestionAnnotationsData,
  GroupPassageAnnotationsData,
} from '../types/hsa';
import {
  getQuestionAnnotations,
  saveQuestionAnnotations,
  getGroupAnnotations,
  saveGroupAnnotations,
  sanitizeTextAnnotations,
  getGlobalScratchpadPages,
  saveGlobalScratchpadPages,
} from '../services/annotationService';
import {
  saveQuestionAnnotationIDB,
  loadQuestionAnnotationIDB,
  saveGroupAnnotationIDB,
  loadGroupAnnotationIDB,
} from '../services/indexedDbService';

interface UseQuestionAnnotationsProps {
  contextId: string; // session.id or 'study_math'
  currentQuestionId?: string;
  groupId?: string;
  fullQuestionText?: string;
}

export function useQuestionAnnotations({
  contextId,
  currentQuestionId,
  groupId,
  fullQuestionText = '',
}: UseQuestionAnnotationsProps) {
  // Global tool settings
  const [activeTool, setActiveTool] = useState<ActiveToolType>('pointer');
  const [activeColor, setActiveColor] = useState<string>('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState<StrokeWidthType>('medium');
  const [isRulerOpen, setIsRulerOpen] = useState<boolean>(false);
  const [rulerState, setRulerState] = useState<{
    x: number;
    y: number;
    angle: number;
    length: number;
  } | null>(null);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState<boolean>(false);

  // Per-question state
  const [questionData, setQuestionData] = useState<QuestionAnnotationsData>(() =>
    currentQuestionId
      ? getQuestionAnnotations(contextId, currentQuestionId)
      : {
          key: '',
          contextId,
          questionId: '',
          textAnnotations: [],
          strokes: [],
          scratchpadPages: [{ id: 'p0', pageNumber: 1, strokes: [], bgPattern: 'blank' }],
          currentScratchpadPage: 0,
          updatedAt: Date.now(),
        }
  );

  // Group passage state
  const [groupData, setGroupData] = useState<GroupPassageAnnotationsData>(() =>
    groupId
      ? getGroupAnnotations(contextId, groupId)
      : {
          key: '',
          contextId,
          groupId: '',
          textAnnotations: [],
          strokes: [],
          updatedAt: Date.now(),
        }
  );

  // Undo / Redo stacks for current question
  const undoStackRef = useRef<DrawingStroke[][]>([]);
  const redoStackRef = useRef<DrawingStroke[][]>([]);
  const [, setHistoryTick] = useState<number>(0);

  // Scratchpad status map for all questions in this session
  const [scratchpadStatusMap, setScratchpadStatusMap] = useState<Record<string, boolean>>({});

  // Global scratchpad state (common for entire test session)
  const [isGlobalScratchpadMode, setIsGlobalScratchpadMode] = useState<boolean>(false);
  const [globalScratchpadPages, setGlobalScratchpadPages] = useState<ScratchpadPageData[]>(() =>
    getGlobalScratchpadPages(contextId)
  );
  const [currentGlobalPage, setCurrentGlobalPage] = useState<number>(0);

  // Convert strokeWidth to pixels
  const lineWidth = strokeWidth === 'thin' ? 2 : strokeWidth === 'thick' ? 7 : 4;

  // Load question data when questionId changes
  useEffect(() => {
    if (!currentQuestionId) return;

    // Load from memory/localStorage first
    const data = getQuestionAnnotations(contextId, currentQuestionId);
    // Sanitize text annotations against current questionText
    if (fullQuestionText) {
      data.textAnnotations = sanitizeTextAnnotations(fullQuestionText, data.textAnnotations);
    }
    setQuestionData(data);

    // Reset undo/redo stacks for new question
    undoStackRef.current = [data.strokes || []];
    redoStackRef.current = [];
    setHistoryTick((t) => t + 1);

    // Also attempt loading from IndexedDB in background
    loadQuestionAnnotationIDB(data.key).then((idbData) => {
      if (idbData && idbData.updatedAt > data.updatedAt) {
        if (fullQuestionText) {
          idbData.textAnnotations = sanitizeTextAnnotations(
            fullQuestionText,
            idbData.textAnnotations
          );
        }
        setQuestionData(idbData);
        saveQuestionAnnotations(idbData);
      }
    });
  }, [contextId, currentQuestionId, fullQuestionText]);

  // Load group data when groupId changes
  useEffect(() => {
    if (!groupId) return;
    const gData = getGroupAnnotations(contextId, groupId);
    setGroupData(gData);

    loadGroupAnnotationIDB(gData.key).then((idbData) => {
      if (idbData && idbData.updatedAt > gData.updatedAt) {
        setGroupData(idbData);
        saveGroupAnnotations(idbData);
      }
    });
  }, [contextId, groupId]);

  // Helper to persist question data
  const persistQuestionData = useCallback(
    (updated: QuestionAnnotationsData) => {
      setQuestionData(updated);
      saveQuestionAnnotations(updated);
      saveQuestionAnnotationIDB(updated);

      // Check if has scratchpad notes
      const hasNotes = (updated.scratchpadPages || []).some(
        (p) => p.strokes && p.strokes.length > 0
      );
      setScratchpadStatusMap((prev) => ({
        ...prev,
        [updated.questionId]: hasNotes,
      }));
    },
    []
  );

  // Helper to persist group data
  const persistGroupData = useCallback((updated: GroupPassageAnnotationsData) => {
    setGroupData(updated);
    saveGroupAnnotations(updated);
    saveGroupAnnotationIDB(updated);
  }, []);

  // ================= TEXT ANNOTATIONS =================
  const addTextAnnotation = useCallback(
    (ann: Omit<TextAnnotation, 'id' | 'createdAt'>) => {
      if (!currentQuestionId) return;
      const newAnn: TextAnnotation = {
        ...ann,
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
      };

      const updated = {
        ...questionData,
        textAnnotations: [...questionData.textAnnotations, newAnn],
      };
      persistQuestionData(updated);
    },
    [currentQuestionId, questionData, persistQuestionData]
  );

  const removeTextAnnotation = useCallback(
    (annId: string) => {
      const updated = {
        ...questionData,
        textAnnotations: questionData.textAnnotations.filter((a) => a.id !== annId),
      };
      persistQuestionData(updated);
    },
    [questionData, persistQuestionData]
  );

  // ================= QUESTION DRAWING STROKES =================
  const addStroke = useCallback(
    (stroke: DrawingStroke) => {
      const currentStrokes = questionData.strokes || [];
      const updatedStrokes = [...currentStrokes, stroke];

      undoStackRef.current.push(updatedStrokes);
      redoStackRef.current = [];
      setHistoryTick((t) => t + 1);

      const updated = {
        ...questionData,
        strokes: updatedStrokes,
      };
      persistQuestionData(updated);
    },
    [questionData, persistQuestionData]
  );

  const eraseStroke = useCallback(
    (strokeId: string) => {
      const currentStrokes = questionData.strokes || [];
      const updatedStrokes = currentStrokes.filter((s) => s.id !== strokeId);

      if (updatedStrokes.length !== currentStrokes.length) {
        undoStackRef.current.push(updatedStrokes);
        redoStackRef.current = [];
        setHistoryTick((t) => t + 1);

        const updated = {
          ...questionData,
          strokes: updatedStrokes,
        };
        persistQuestionData(updated);
      }
    },
    [questionData, persistQuestionData]
  );

  // Undo / Redo for Question Strokes
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length > 1) {
      const current = undoStackRef.current.pop()!;
      redoStackRef.current.push(current);
      const prev = undoStackRef.current[undoStackRef.current.length - 1];

      setHistoryTick((t) => t + 1);
      const updated = {
        ...questionData,
        strokes: prev,
      };
      persistQuestionData(updated);
    }
  }, [questionData, persistQuestionData]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length > 0) {
      const next = redoStackRef.current.pop()!;
      undoStackRef.current.push(next);

      setHistoryTick((t) => t + 1);
      const updated = {
        ...questionData,
        strokes: next,
      };
      persistQuestionData(updated);
    }
  }, [questionData, persistQuestionData]);

  const handleClearAll = useCallback(() => {
    undoStackRef.current.push([]);
    redoStackRef.current = [];
    setHistoryTick((t) => t + 1);

    const updated = {
      ...questionData,
      textAnnotations: [],
      strokes: [],
    };
    persistQuestionData(updated);
  }, [questionData, persistQuestionData]);

  // ================= GROUP PASSAGE ANNOTATIONS =================
  const addGroupAnnotation = useCallback(
    (ann: Omit<TextAnnotation, 'id' | 'createdAt'>) => {
      if (!groupId) return;
      const newAnn: TextAnnotation = {
        ...ann,
        id: `grp-ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
      };
      const updated = {
        ...groupData,
        textAnnotations: [...groupData.textAnnotations, newAnn],
      };
      persistGroupData(updated);
    },
    [groupId, groupData, persistGroupData]
  );

  const removeGroupAnnotation = useCallback(
    (annId: string) => {
      const updated = {
        ...groupData,
        textAnnotations: groupData.textAnnotations.filter((a) => a.id !== annId),
      };
      persistGroupData(updated);
    },
    [groupData, persistGroupData]
  );

  const addGroupStroke = useCallback(
    (stroke: DrawingStroke) => {
      const updated = {
        ...groupData,
        strokes: [...groupData.strokes, stroke],
      };
      persistGroupData(updated);
    },
    [groupData, persistGroupData]
  );

  const eraseGroupStroke = useCallback(
    (strokeId: string) => {
      const updated = {
        ...groupData,
        strokes: groupData.strokes.filter((s) => s.id !== strokeId),
      };
      persistGroupData(updated);
    },
    [groupData, persistGroupData]
  );

  // ================= SCRATCHPAD PAGES =================
  const questionScratchpadPages = questionData.scratchpadPages || [
    { id: 'p0', pageNumber: 1, strokes: [], bgPattern: 'grid' },
  ];
  const currentQuestionScratchpadPage = questionData.currentScratchpadPage || 0;

  // Active pages depending on mode:
  const activeScratchpadPages = isGlobalScratchpadMode
    ? globalScratchpadPages
    : questionScratchpadPages;
  const activeScratchpadPage = isGlobalScratchpadMode
    ? currentGlobalPage
    : currentQuestionScratchpadPage;

  const handleAddScratchpadPage = useCallback(() => {
    if (isGlobalScratchpadMode) {
      if (globalScratchpadPages.length >= 10) return;
      const newPage: ScratchpadPageData = {
        id: `gsp-${Date.now()}-${globalScratchpadPages.length}`,
        pageNumber: globalScratchpadPages.length + 1,
        strokes: [],
        bgPattern: 'grid',
      };
      const updated = [...globalScratchpadPages, newPage];
      setGlobalScratchpadPages(updated);
      setCurrentGlobalPage(updated.length - 1);
      saveGlobalScratchpadPages(contextId, updated);
    } else {
      if (questionScratchpadPages.length >= 10) return;
      const newPage: ScratchpadPageData = {
        id: `sp-${Date.now()}-${questionScratchpadPages.length}`,
        pageNumber: questionScratchpadPages.length + 1,
        strokes: [],
        bgPattern: 'grid',
      };
      const updatedPages = [...questionScratchpadPages, newPage];
      const updated = {
        ...questionData,
        scratchpadPages: updatedPages,
        currentScratchpadPage: updatedPages.length - 1,
      };
      persistQuestionData(updated);
    }
  }, [
    isGlobalScratchpadMode,
    globalScratchpadPages,
    questionScratchpadPages,
    questionData,
    contextId,
    persistQuestionData,
  ]);

  const handleChangeScratchpadPage = useCallback(
    (pageIndex: number) => {
      if (isGlobalScratchpadMode) {
        if (pageIndex < 0 || pageIndex >= globalScratchpadPages.length) return;
        setCurrentGlobalPage(pageIndex);
      } else {
        if (pageIndex < 0 || pageIndex >= questionScratchpadPages.length) return;
        const updated = {
          ...questionData,
          currentScratchpadPage: pageIndex,
        };
        persistQuestionData(updated);
      }
    },
    [isGlobalScratchpadMode, globalScratchpadPages.length, questionScratchpadPages.length, questionData, persistQuestionData]
  );

  const handleDeleteScratchpadPage = useCallback(
    (pageIndex: number) => {
      if (isGlobalScratchpadMode) {
        if (globalScratchpadPages.length <= 1) return;
        const updated = globalScratchpadPages.filter((_, idx) => idx !== pageIndex);
        const newIdx = Math.min(currentGlobalPage, updated.length - 1);
        setGlobalScratchpadPages(updated);
        setCurrentGlobalPage(newIdx);
        saveGlobalScratchpadPages(contextId, updated);
      } else {
        if (questionScratchpadPages.length <= 1) return;
        const updatedPages = questionScratchpadPages.filter((_, idx) => idx !== pageIndex);
        const newIdx = Math.min(currentQuestionScratchpadPage, updatedPages.length - 1);
        const updated = {
          ...questionData,
          scratchpadPages: updatedPages,
          currentScratchpadPage: newIdx,
        };
        persistQuestionData(updated);
      }
    },
    [
      isGlobalScratchpadMode,
      globalScratchpadPages,
      currentGlobalPage,
      questionScratchpadPages,
      currentQuestionScratchpadPage,
      questionData,
      contextId,
      persistQuestionData,
    ]
  );

  const handleSaveScratchpadPageStrokes = useCallback(
    (pageIndex: number, newStrokes: DrawingStroke[]) => {
      if (isGlobalScratchpadMode) {
        const updated = globalScratchpadPages.map((p, idx) =>
          idx === pageIndex ? { ...p, strokes: newStrokes } : p
        );
        setGlobalScratchpadPages(updated);
        saveGlobalScratchpadPages(contextId, updated);
      } else {
        const updatedPages = questionScratchpadPages.map((p, idx) =>
          idx === pageIndex ? { ...p, strokes: newStrokes } : p
        );
        const updated = {
          ...questionData,
          scratchpadPages: updatedPages,
        };
        persistQuestionData(updated);
      }
    },
    [isGlobalScratchpadMode, globalScratchpadPages, questionScratchpadPages, questionData, contextId, persistQuestionData]
  );

  // Cycle background pattern: 'grid' -> 'ruled' -> 'blank' -> 'grid'
  const handleToggleBgPattern = useCallback(
    (pageIndex: number) => {
      const cyclePattern = (curr?: 'blank' | 'grid' | 'ruled'): 'blank' | 'grid' | 'ruled' => {
        if (curr === 'grid') return 'ruled';
        if (curr === 'ruled') return 'blank';
        return 'grid';
      };

      if (isGlobalScratchpadMode) {
        const updated = globalScratchpadPages.map((p, idx) =>
          idx === pageIndex ? { ...p, bgPattern: cyclePattern(p.bgPattern) } : p
        );
        setGlobalScratchpadPages(updated);
        saveGlobalScratchpadPages(contextId, updated);
      } else {
        const updatedPages = questionScratchpadPages.map((p, idx) =>
          idx === pageIndex ? { ...p, bgPattern: cyclePattern(p.bgPattern) } : p
        );
        const updated = {
          ...questionData,
          scratchpadPages: updatedPages,
        };
        persistQuestionData(updated);
      }
    },
    [isGlobalScratchpadMode, globalScratchpadPages, questionScratchpadPages, questionData, contextId, persistQuestionData]
  );

  return {
    // Tool settings
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    strokeWidth,
    setStrokeWidth,
    lineWidth,
    isRulerOpen,
    setIsRulerOpen,
    rulerState,
    setRulerState,
    showAnnotations,
    setShowAnnotations,
    isScratchpadOpen,
    setIsScratchpadOpen,

    // Question annotations
    textAnnotations: questionData.textAnnotations || [],
    strokes: questionData.strokes || [],
    addTextAnnotation,
    removeTextAnnotation,
    addStroke,
    eraseStroke,
    handleUndo,
    handleRedo,
    handleClearAll,
    canUndo: undoStackRef.current.length > 1,
    canRedo: redoStackRef.current.length > 0,

    // Group annotations
    groupTextAnnotations: groupData.textAnnotations || [],
    groupStrokes: groupData.strokes || [],
    addGroupAnnotation,
    removeGroupAnnotation,
    addGroupStroke,
    eraseGroupStroke,

    // Scratchpad
    isGlobalScratchpadMode,
    setIsGlobalScratchpadMode,
    scratchpadPages: activeScratchpadPages,
    currentScratchpadPage: activeScratchpadPage,
    handleAddScratchpadPage,
    handleChangeScratchpadPage,
    handleDeleteScratchpadPage,
    handleSaveScratchpadPageStrokes,
    handleToggleBgPattern,
    scratchpadStatusMap,
  };
}
