import React, { useRef, useEffect, useCallback, useState, memo } from 'react';
import { DrawingStroke, ActiveToolType, DrawingPoint } from '../types/hsa';
import { compressStrokePoints } from '../services/annotationService';

interface DrawingOverlayProps {
  questionId?: string;
  strokes: DrawingStroke[];
  activeTool: ActiveToolType;
  activeColor: string;
  lineWidth: number;
  readOnly?: boolean;
  showAnnotations?: boolean;
  rulerState?: {
    x: number;
    y: number;
    angle: number;
    length: number;
  } | null;
  onAddStroke: (stroke: DrawingStroke) => void;
  onEraseStroke: (strokeId: string) => void;
}

/**
 * Draws a stroke with quadratic curve smoothing (quadraticCurveTo) for silky natural lines
 */
function drawSmoothStroke(
  ctx: CanvasRenderingContext2D,
  points: DrawingPoint[],
  width: number,
  height: number,
  color: string,
  lineWidth: number
) {
  if (!points || points.length === 0) return;

  if (points.length === 1) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(points[0].x * width, points[0].y * height, Math.max(1, lineWidth / 2), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const p0 = points[0];
  ctx.moveTo(p0.x * width, p0.y * height);

  if (points.length === 2) {
    const p1 = points[1];
    ctx.lineTo(p1.x * width, p1.y * height);
    ctx.stroke();
    return;
  }

  // Quadratic curve smoothing with midpoints for beautiful fluid strokes
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = ((current.x + next.x) / 2) * width;
    const midY = ((current.y + next.y) / 2) * height;
    ctx.quadraticCurveTo(current.x * width, current.y * height, midX, midY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x * width, last.y * height);
  ctx.stroke();
}

const DrawingOverlayComponent: React.FC<DrawingOverlayProps> = ({
  questionId,
  strokes,
  activeTool,
  activeColor,
  lineWidth,
  readOnly = false,
  showAnnotations = true,
  rulerState,
  onAddStroke,
  onEraseStroke,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<DrawingPoint[]>([]);
  const pendingPointsRef = useRef<DrawingPoint[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Smooth 150ms opacity transition when switching questions
  const [opacity, setOpacity] = useState<number>(1);
  const prevQuestionIdRef = useRef<string | undefined>(questionId);

  useEffect(() => {
    if (prevQuestionIdRef.current !== questionId) {
      prevQuestionIdRef.current = questionId;
      // Start 150ms transition
      setOpacity(0);
      const timer = setTimeout(() => {
        setOpacity(1);
      }, 75);
      return () => clearTimeout(timer);
    }
  }, [questionId]);

  // Redraw all strokes on canvas using high DPI and quadraticCurveTo
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    // devicePixelRatio scaling to ensure crisp strokes on Retina & mobile screens
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (showAnnotations) {
      // 1. Draw existing strokes with quadraticCurveTo smoothing
      for (let i = 0; i < strokes.length; i++) {
        const stroke = strokes[i];
        drawSmoothStroke(ctx, stroke.points, width, height, stroke.color, stroke.lineWidth);
      }

      // 2. Draw in-progress stroke with quadraticCurveTo smoothing
      if (isDrawingRef.current && currentPointsRef.current.length > 0) {
        drawSmoothStroke(ctx, currentPointsRef.current, width, height, activeColor, lineWidth);
      }
    }

    ctx.restore();
  }, [strokes, activeColor, lineWidth, showAnnotations]);

  // Redraw when strokes or settings change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => redrawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  // Snap point to ruler edge if near
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

  // Stroke-based eraser
  const checkEraseStroke = useCallback(
    (normX: number, normY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const thresholdNorm = 14 / Math.min(width, height);

      for (let s = 0; s < strokes.length; s++) {
        const stroke = strokes[s];
        for (let p = 0; p < stroke.points.length; p++) {
          const pt = stroke.points[p];
          const dx = pt.x - normX;
          const dy = pt.y - normY;
          if (dx * dx + dy * dy <= thresholdNorm * thresholdNorm) {
            onEraseStroke(stroke.id);
            return;
          }
        }
      }
    },
    [strokes, onEraseStroke]
  );

  // Pointer Down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (readOnly) return;
      if (activeTool !== 'pen' && activeTool !== 'eraser') return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const snapped = snapToRulerIfNeeded(e.clientX, e.clientY, rect);

      const normX = Math.max(0, Math.min(1, snapped.x / rect.width));
      const normY = Math.max(0, Math.min(1, snapped.y / rect.height));

      if (activeTool === 'eraser') {
        checkEraseStroke(normX, normY);
        isDrawingRef.current = true;
        return;
      }

      // Pen
      isDrawingRef.current = true;
      currentPointsRef.current = [{ x: normX, y: normY }];
      pendingPointsRef.current = [];
      canvas.setPointerCapture(e.pointerId);
      redrawCanvas();
    },
    [readOnly, activeTool, snapToRulerIfNeeded, checkEraseStroke, redrawCanvas]
  );

  // Batch process accumulated points in requestAnimationFrame (~16ms)
  const flushPendingPointsAndRender = useCallback(() => {
    animFrameIdRef.current = null;
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    const pending = pendingPointsRef.current;
    if (pending.length === 0) return;
    pendingPointsRef.current = [];

    // Filter points: if distance to previous point < 2px, discard to reduce memory & enhance speed
    for (let i = 0; i < pending.length; i++) {
      const pt = pending[i];
      const last = currentPointsRef.current[currentPointsRef.current.length - 1];
      if (last) {
        const dx = (pt.x - last.x) * width;
        const dy = (pt.y - last.y) * height;
        if (dx * dx + dy * dy < 4) {
          // Distance < 2px: skip
          continue;
        }
      }
      currentPointsRef.current.push(pt);
    }

    redrawCanvas();
  }, [redrawCanvas]);

  // Pointer Move (batched over ~16ms using requestAnimationFrame)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const snapped = snapToRulerIfNeeded(e.clientX, e.clientY, rect);

      const normX = Math.max(0, Math.min(1, snapped.x / rect.width));
      const normY = Math.max(0, Math.min(1, snapped.y / rect.height));

      if (activeTool === 'eraser') {
        checkEraseStroke(normX, normY);
        return;
      }

      // Buffer point for next animation frame
      pendingPointsRef.current.push({ x: normX, y: normY });

      if (animFrameIdRef.current === null) {
        animFrameIdRef.current = requestAnimationFrame(flushPendingPointsAndRender);
      }
    },
    [activeTool, snapToRulerIfNeeded, checkEraseStroke, flushPendingPointsAndRender]
  );

  // Pointer Up
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      // Cancel any pending animation frame and flush remaining points
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      flushPendingPointsAndRender();

      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }

      if (activeTool === 'pen' && currentPointsRef.current.length > 0) {
        const compressed = compressStrokePoints(currentPointsRef.current);
        const newStroke: DrawingStroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          color: activeColor,
          lineWidth,
          points: compressed,
          createdAt: Date.now(),
        };
        onAddStroke(newStroke);
        currentPointsRef.current = [];
        pendingPointsRef.current = [];
        redrawCanvas();
      }
    },
    [activeTool, activeColor, lineWidth, onAddStroke, flushPendingPointsAndRender, redrawCanvas]
  );

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  const isDrawingMode = (activeTool === 'pen' || activeTool === 'eraser') && !readOnly;

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        touchAction: isDrawingMode ? 'none' : 'auto',
        pointerEvents: isDrawingMode ? 'auto' : 'none',
        opacity,
      }}
      className="absolute inset-0 w-full h-full z-30 transition-opacity duration-150 ease-out"
    />
  );
};

export const DrawingOverlay = memo(DrawingOverlayComponent);
