import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DrawingStroke,
  ScratchpadPageData,
  ActiveToolType,
  StrokeWidthType,
} from '../types/hsa';
import { compressStrokePoints } from '../services/annotationService';
import { PEN_COLORS } from './ExamToolbar';
import { FloatingRuler } from './FloatingRuler';
import {
  Pen,
  Eraser,
  Ruler,
  Undo2,
  Redo2,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Grid,
  AlignJustify,
  Square,
  X,
  Maximize2,
  Minimize2,
  BookOpen,
  Layers,
} from 'lucide-react';

interface ScratchpadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // Per-question or Global mode toggle
  isGlobalMode?: boolean;
  onToggleGlobalMode?: () => void;
  currentQuestionNumber?: number;
  // Pages
  pages: ScratchpadPageData[];
  currentPageIndex: number;
  onChangePage: (pageIndex: number) => void;
  onAddPage: () => void;
  onDeletePage?: (pageIndex: number) => void;
  onSavePageStrokes: (pageIndex: number, strokes: DrawingStroke[]) => void;
  onToggleBgPattern: (pageIndex: number) => void;
  readOnly?: boolean;
}

export const ScratchpadDrawer: React.FC<ScratchpadDrawerProps> = ({
  isOpen,
  onClose,
  isGlobalMode = false,
  onToggleGlobalMode,
  currentQuestionNumber,
  pages,
  currentPageIndex,
  onChangePage,
  onAddPage,
  onDeletePage,
  onSavePageStrokes,
  onToggleBgPattern,
  readOnly = false,
}) => {
  const [activeTool, setActiveTool] = useState<ActiveToolType>('pen');
  const [activeColor, setActiveColor] = useState<string>('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState<StrokeWidthType>('medium');
  const [isRulerOpen, setIsRulerOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [rulerState, setRulerState] = useState<{
    x: number;
    y: number;
    angle: number;
    length: number;
  } | null>(null);

  // Dynamic canvas height (auto-expanding)
  const [canvasHeight, setCanvasHeight] = useState<number>(550);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const pendingPointsRef = useRef<{ x: number; y: number }[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Undo / Redo history stack for current page
  const [history, setHistory] = useState<DrawingStroke[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const currentPage = pages[currentPageIndex] || {
    id: 'default',
    pageNumber: 1,
    strokes: [],
    bgPattern: 'grid',
  };
  const strokes = currentPage.strokes || [];
  const bgPattern = currentPage.bgPattern || 'grid';

  const lineWidth = strokeWidth === 'thin' ? 2 : strokeWidth === 'thick' ? 7 : 4;

  // Initialize history when page changes
  useEffect(() => {
    setHistory([strokes]);
    setHistoryIndex(0);
    // Reset canvas height to standard on new page
    setCanvasHeight(550);
  }, [currentPage.id]);

  // Update static background and strokes on OffscreenCanvas buffer
  const updateOffscreenBuffer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvasHeight;
    if (width === 0 || height === 0) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);

    let offscreen = offscreenCanvasRef.current;
    if (!offscreen || offscreen.width !== targetW || offscreen.height !== targetH) {
      if (typeof OffscreenCanvas !== 'undefined') {
        try {
          offscreen = new OffscreenCanvas(targetW, targetH);
        } catch {
          offscreen = document.createElement('canvas');
          offscreen.width = targetW;
          offscreen.height = targetH;
        }
      } else {
        offscreen = document.createElement('canvas');
        offscreen.width = targetW;
        offscreen.height = targetH;
      }
      offscreenCanvasRef.current = offscreen;
    }

    const offCtx = offscreen.getContext('2d') as (CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null);
    if (!offCtx) return;

    offCtx.save();
    offCtx.scale(dpr, dpr);
    offCtx.clearRect(0, 0, width, height);

    // 1. Draw Grid background if pattern is grid
    if (bgPattern === 'grid') {
      offCtx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      offCtx.lineWidth = 1;
      const gridSize = 25; // 25px grid (ô vuông / ô li)

      offCtx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        offCtx.moveTo(x, 0);
        offCtx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        offCtx.moveTo(0, y);
        offCtx.lineTo(width, y);
      }
      offCtx.stroke();
    } else if (bgPattern === 'ruled') {
      // 2. Draw Ruled lines (kẻ ngang cách dòng 30px)
      offCtx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      offCtx.lineWidth = 1;
      const lineSpacing = 30;

      offCtx.beginPath();
      for (let y = lineSpacing; y <= height; y += lineSpacing) {
        offCtx.moveTo(0, y);
        offCtx.lineTo(width, y);
      }
      offCtx.stroke();
    }

    // 3. Draw stored strokes with quadraticCurveTo smoothing
    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];
      if (!stroke.points || stroke.points.length === 0) continue;

      if (stroke.points.length === 1) {
        offCtx.fillStyle = stroke.color;
        offCtx.beginPath();
        offCtx.arc(stroke.points[0].x * width, stroke.points[0].y * height, Math.max(1, stroke.lineWidth / 2), 0, Math.PI * 2);
        offCtx.fill();
        continue;
      }

      offCtx.beginPath();
      offCtx.strokeStyle = stroke.color;
      offCtx.lineWidth = stroke.lineWidth;
      offCtx.lineCap = 'round';
      offCtx.lineJoin = 'round';

      const p0 = stroke.points[0];
      offCtx.moveTo(p0.x * width, p0.y * height);

      if (stroke.points.length === 2) {
        offCtx.lineTo(stroke.points[1].x * width, stroke.points[1].y * height);
        offCtx.stroke();
        continue;
      }

      for (let j = 1; j < stroke.points.length - 1; j++) {
        const cur = stroke.points[j];
        const nxt = stroke.points[j + 1];
        const midX = ((cur.x + nxt.x) / 2) * width;
        const midY = ((cur.y + nxt.y) / 2) * height;
        offCtx.quadraticCurveTo(cur.x * width, cur.y * height, midX, midY);
      }

      const pLast = stroke.points[stroke.points.length - 1];
      offCtx.lineTo(pLast.x * width, pLast.y * height);
      offCtx.stroke();
    }

    offCtx.restore();
  }, [strokes, bgPattern, canvasHeight]);

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvasHeight;
    if (width === 0 || height === 0) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      updateOffscreenBuffer();
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Blit from OffscreenCanvas
    if (offscreenCanvasRef.current) {
      ctx.drawImage(offscreenCanvasRef.current, 0, 0, width, height);
    }

    // Draw in-progress stroke with quadraticCurveTo smoothing
    if (isDrawingRef.current && currentPointsRef.current.length > 0) {
      const pts = currentPointsRef.current;
      if (pts.length === 1) {
        ctx.fillStyle = activeColor;
        ctx.beginPath();
        ctx.arc(pts[0].x * width, pts[0].y * height, Math.max(1, lineWidth / 2), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(pts[0].x * width, pts[0].y * height);

        if (pts.length === 2) {
          ctx.lineTo(pts[1].x * width, pts[1].y * height);
        } else {
          for (let i = 1; i < pts.length - 1; i++) {
            const cur = pts[i];
            const nxt = pts[i + 1];
            const midX = ((cur.x + nxt.x) / 2) * width;
            const midY = ((cur.y + nxt.y) / 2) * height;
            ctx.quadraticCurveTo(cur.x * width, cur.y * height, midX, midY);
          }
          ctx.lineTo(pts[pts.length - 1].x * width, pts[pts.length - 1].y * height);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [canvasHeight, updateOffscreenBuffer, activeColor, lineWidth]);

  useEffect(() => {
    updateOffscreenBuffer();
    redraw();
  }, [updateOffscreenBuffer, redraw]);

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      updateOffscreenBuffer();
      redraw();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateOffscreenBuffer, redraw]);

  // Clean up animFrame
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Ruler snapping
  const snapToRulerIfNeeded = useCallback(
    (clientX: number, clientY: number, canvasRect: DOMRect): { x: number; y: number } => {
      const rawX = clientX - canvasRect.left;
      const rawY = clientY - canvasRect.top;

      if (!rulerState) return { x: rawX, y: rawY };

      const rad = (rulerState.angle * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      const pX = rulerState.x;
      const pY = rulerState.y;

      const dX = rawX - pX;
      const dY = rawY - pY;
      const distToLine = Math.abs(dX * -sinA + dY * cosA);

      if (distToLine < 22) {
        const projLen = dX * cosA + dY * sinA;
        if (projLen >= -10 && projLen <= rulerState.length + 10) {
          return {
            x: pX + projLen * cosA,
            y: pY + projLen * sinA,
          };
        }
      }

      return { x: rawX, y: rawY };
    },
    [rulerState]
  );

  // Stroke erasure on sweep
  const checkErase = useCallback(
    (normX: number, normY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvasHeight;
      const thresholdNorm = 14 / Math.min(width, height);

      const remaining = strokes.filter((st) => {
        const hit = st.points.some((p) => {
          const dx = p.x - normX;
          const dy = p.y - normY;
          return dx * dx + dy * dy <= thresholdNorm * thresholdNorm;
        });
        return !hit;
      });

      if (remaining.length !== strokes.length) {
        onSavePageStrokes(currentPageIndex, remaining);
        // Record history
        const newHist = history.slice(0, historyIndex + 1);
        newHist.push(remaining);
        setHistory(newHist);
        setHistoryIndex(newHist.length - 1);
      }
    },
    [strokes, canvasHeight, currentPageIndex, onSavePageStrokes, history, historyIndex]
  );

  // Flush batched points in ~16ms animation frame
  const flushBatchedPoints = useCallback(() => {
    animFrameIdRef.current = null;
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvasHeight;
    if (width === 0 || height === 0) return;

    const pending = pendingPointsRef.current;
    if (pending.length === 0) return;
    pendingPointsRef.current = [];

    // Discard points with distance < 2px
    for (let i = 0; i < pending.length; i++) {
      const pt = pending[i];
      const last = currentPointsRef.current[currentPointsRef.current.length - 1];
      if (last) {
        const dx = (pt.x - last.x) * width;
        const dy = (pt.y - last.y) * height;
        if (dx * dx + dy * dy < 4) {
          continue;
        }
      }
      currentPointsRef.current.push(pt);
    }

    redraw();
  }, [canvasHeight, redraw]);

  // Pointer events
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const snapped = snapToRulerIfNeeded(e.clientX, e.clientY, rect);
    const normX = Math.max(0, Math.min(1, snapped.x / rect.width));
    const normY = Math.max(0, Math.min(1, snapped.y / canvasHeight));

    if (activeTool === 'eraser') {
      checkErase(normX, normY);
      isDrawingRef.current = true;
      return;
    }

    isDrawingRef.current = true;
    currentPointsRef.current = [{ x: normX, y: normY }];
    pendingPointsRef.current = [];
    canvas.setPointerCapture(e.pointerId);
    redraw();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const snapped = snapToRulerIfNeeded(e.clientX, e.clientY, rect);
    const normX = Math.max(0, Math.min(1, snapped.x / rect.width));
    const normY = Math.max(0, Math.min(1, snapped.y / canvasHeight));

    if (activeTool === 'eraser') {
      checkErase(normX, normY);
      return;
    }

    pendingPointsRef.current.push({ x: normX, y: normY });

    // Auto-expand height if drawn within 60px of the bottom edge!
    if (snapped.y > canvasHeight - 60 && canvasHeight < 3200) {
      setCanvasHeight((prev) => Math.min(3200, prev + 250));
    }

    if (animFrameIdRef.current === null) {
      animFrameIdRef.current = requestAnimationFrame(flushBatchedPoints);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    flushBatchedPoints();

    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (activeTool === 'pen' && currentPointsRef.current.length > 0) {
      const compressed = compressStrokePoints(currentPointsRef.current);
      const newStroke: DrawingStroke = {
        id: `sp-st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        color: activeColor,
        lineWidth,
        points: compressed,
        createdAt: Date.now(),
      };

      const updatedStrokes = [...strokes, newStroke];
      onSavePageStrokes(currentPageIndex, updatedStrokes);

      // Add to history
      const newHist = history.slice(0, historyIndex + 1);
      newHist.push(updatedStrokes);
      setHistory(newHist);
      setHistoryIndex(newHist.length - 1);

      currentPointsRef.current = [];
      pendingPointsRef.current = [];
      updateOffscreenBuffer();
      redraw();
    }
  };


  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onSavePageStrokes(currentPageIndex, prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onSavePageStrokes(currentPageIndex, next);
    }
  };

  const handleClear = () => {
    if (window.confirm('Xoá tất cả nét trên trang nháp này?')) {
      onSavePageStrokes(currentPageIndex, []);
      const newHist = history.slice(0, historyIndex + 1);
      newHist.push([]);
      setHistory(newHist);
      setHistoryIndex(newHist.length - 1);
    }
  };

  const handleDeleteCurrentPage = () => {
    if (pages.length <= 1) return;
    if (window.confirm(`Bạn có chắc muốn xoá Trang ${currentPageIndex + 1}?`)) {
      if (onDeletePage) {
        onDeletePage(currentPageIndex);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 transition-all duration-300 ease-out flex flex-col bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 shadow-2xl overflow-hidden ${
        isFullscreen
          ? 'inset-2 sm:inset-4 rounded-3xl'
          : 'bottom-0 left-0 right-0 sm:left-auto sm:right-0 sm:top-16 sm:bottom-4 sm:w-[580px] lg:w-[650px] h-[75vh] sm:h-auto rounded-t-3xl sm:rounded-l-3xl sm:rounded-r-none'
      }`}
    >
      {/* Scratchpad Header Toolbar */}
      <div className="flex flex-col gap-2 px-4 py-2.5 bg-purple-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-purple-200 dark:border-purple-900/60 z-20 select-none">
        {/* Top Header Row: Title, Mode toggle (Nháp câu này / Nháp chung), Screen toggle, Close */}
        <div className="flex items-center justify-between gap-2">
          {/* Mode switch */}
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded-lg bg-purple-600 text-white shadow-xs">
              <BookOpen className="w-3.5 h-3.5" />
            </span>

            {onToggleGlobalMode ? (
              <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-purple-200 dark:border-purple-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => isGlobalMode && onToggleGlobalMode()}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    !isGlobalMode
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-purple-600'
                  }`}
                  title="Nháp gắn riêng với câu hỏi hiện tại"
                >
                  {typeof currentQuestionNumber === 'number'
                    ? `Nháp câu ${currentQuestionNumber}`
                    : 'Nháp câu này'}
                </button>
                <button
                  type="button"
                  onClick={() => !isGlobalMode && onToggleGlobalMode()}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    isGlobalMode
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-purple-600'
                  }`}
                  title="Nháp chung cho toàn bộ bài thi / phần thi"
                >
                  Nháp chung
                </button>
              </div>
            ) : (
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                Bảng nháp điện tử
              </span>
            )}
          </div>

          {/* Right Window Controls: Fullscreen toggle & Close */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-slate-700 dark:text-slate-300 hover:bg-purple-100 transition"
              title={isFullscreen ? 'Thu nhỏ bảng nháp' : 'Mở toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 hover:bg-rose-500 hover:text-white text-slate-700 dark:text-slate-300 transition"
              title="Đóng bảng nháp (nội dung luôn tự lưu)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Second Row: Drawing tools, Colors, Pages, Undo/Redo */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-purple-100 dark:border-purple-950/60">
          {/* Tool buttons: Pen, Eraser, Ruler */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-xs border border-purple-100 dark:border-purple-900/40">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setActiveTool('pen')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                activeTool === 'pen'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Bút vẽ"
            >
              <Pen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bút</span>
            </button>

            <button
              type="button"
              disabled={readOnly}
              onClick={() => setActiveTool('eraser')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                activeTool === 'eraser'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Tẩy nét nháp"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tẩy</span>
            </button>

            <button
              type="button"
              disabled={readOnly}
              onClick={() => setIsRulerOpen((prev) => !prev)}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                isRulerOpen
                  ? 'bg-amber-200 dark:bg-amber-950 text-amber-800 dark:text-amber-200 ring-1 ring-amber-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Thước kẻ"
            >
              <Ruler className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color palette swatches */}
          {activeTool === 'pen' && !readOnly && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 px-1.5 rounded-xl border border-purple-100 dark:border-purple-900/40">
              {PEN_COLORS.map((c) => {
                const isSel = activeColor === c.hex;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      isSel ? 'ring-2 ring-purple-500 scale-125 z-10' : 'opacity-80 hover:scale-110'
                    }`}
                    title={c.label}
                  />
                );
              })}
            </div>
          )}

          {/* Stroke thickness (Mỏng, Vừa, Đậm) */}
          {activeTool === 'pen' && !readOnly && (
            <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-purple-100 dark:border-purple-900/40">
              {[
                { id: 'thin' as StrokeWidthType, label: 'Mỏng' },
                { id: 'medium' as StrokeWidthType, label: 'Vừa' },
                { id: 'thick' as StrokeWidthType, label: 'Đậm' },
              ].map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setStrokeWidth(w.id)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    strokeWidth === w.id
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          )}

          {/* Background Toggle (Grid / Ruled / Blank) */}
          <button
            type="button"
            onClick={() => onToggleBgPattern(currentPageIndex)}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-purple-100 dark:border-purple-900/40 text-xs font-semibold hover:bg-purple-50 transition"
            title="Đổi kiểu nền: Ô vuông (grid), Kẻ ngang (ruled), Trơn (blank)"
          >
            {bgPattern === 'grid' ? (
              <Grid className="w-3.5 h-3.5 text-purple-600" />
            ) : bgPattern === 'ruled' ? (
              <AlignJustify className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="text-[11px]">
              {bgPattern === 'grid' ? 'Ô vuông' : bgPattern === 'ruled' ? 'Kẻ ngang' : 'Trơn'}
            </span>
          </button>

          {/* Multi-page controller */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-purple-100 dark:border-purple-900/40 text-xs">
            <button
              type="button"
              disabled={currentPageIndex === 0}
              onClick={() => onChangePage(currentPageIndex - 1)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
              title="Trang nháp trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="font-mono font-bold text-purple-700 dark:text-purple-300 px-1 text-[11px]">
              Trang {currentPageIndex + 1}/{pages.length}
            </span>

            <button
              type="button"
              disabled={currentPageIndex >= pages.length - 1}
              onClick={() => onChangePage(currentPageIndex + 1)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
              title="Trang nháp sau"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Add page */}
            {pages.length < 10 && !readOnly && (
              <button
                type="button"
                onClick={onAddPage}
                className="ml-1 px-1.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center gap-0.5"
                title="Thêm trang nháp mới"
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">Thêm</span>
              </button>
            )}

            {/* Delete current page */}
            {pages.length > 1 && !readOnly && onDeletePage && (
              <button
                type="button"
                onClick={handleDeleteCurrentPage}
                className="ml-0.5 p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                title="Xoá trang này"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Undo / Redo / Clear page */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={historyIndex <= 0 || readOnly}
              onClick={handleUndo}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20"
              title="Hoàn tác nét vẽ"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={historyIndex >= history.length - 1 || readOnly}
              onClick={handleRedo}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20"
              title="Làm lại nét vẽ"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={strokes.length === 0 || readOnly}
              onClick={handleClear}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-20"
              title="Xoá hết trang này"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Drawing Area (Scrollable, expandable height) */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden bg-white/70 dark:bg-slate-900/70 cursor-crosshair">
        {/* Floating Ruler */}
        <FloatingRuler
          isOpen={isRulerOpen}
          onClose={() => setIsRulerOpen(false)}
          containerRef={containerRef}
          onRulerStateChange={(st) => setRulerState(st)}
        />

        <canvas
          ref={canvasRef}
          style={{
            height: `${canvasHeight}px`,
            touchAction: 'none',
          }}
          className="w-full block"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      {/* Footer bar */}
      <div className="px-4 py-1.5 bg-purple-50/60 dark:bg-slate-900/60 border-t border-purple-100 dark:border-purple-900/40 flex items-center justify-between text-[10px] text-slate-500 select-none">
        <span>
          {isGlobalMode ? 'Nháp chung (dùng cho cả bài thi)' : `Nháp riêng của câu ${currentQuestionNumber || ''}`} • Tự lưu khi vẽ
        </span>
        <span>Kéo vẽ gần đáy để kéo dài ({canvasHeight}px)</span>
      </div>
    </div>
  );
};
