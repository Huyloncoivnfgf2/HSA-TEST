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
  rulerState?: { x: number; y: number; angle: number; length: number } | null;
  onAddStroke: (stroke: DrawingStroke) => void;
  onEraseStroke: (strokeId: string) => void;
}

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
    ctx.lineTo(points[1].x * width, points[1].y * height);
    ctx.stroke();
    return;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const cur = points[i];
    const nxt = points[i + 1];
    const midX = ((cur.x + nxt.x) / 2) * width;
    const midY = ((cur.y + nxt.y) / 2) * height;
    ctx.quadraticCurveTo(cur.x * width, cur.y * height, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x * width, last.y * height);
  ctx.stroke();
}

const ERASER_RADIUS = 20; // px

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

  // Eraser cursor position
  const eraserPosRef = useRef<{ x: number; y: number } | null>(null);
  const eraserFrameRef = useRef<number | null>(null);

  const [opacity, setOpacity] = useState<number>(1);
  const prevQuestionIdRef = useRef<string | undefined>(questionId);

  useEffect(() => {
    if (prevQuestionIdRef.current !== questionId) {
      prevQuestionIdRef.current = questionId;
      setOpacity(0);
      const t = setTimeout(() => setOpacity(1), 75);
      return () => clearTimeout(t);
    }
  }, [questionId]);

  const isEraser = activeTool === 'eraser' && !readOnly;
  const isDrawingMode = (activeTool === 'pen' || activeTool === 'eraser') && !readOnly;

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const tw = Math.round(w * dpr);
    const th = Math.round(h * dpr);
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    if (showAnnotations) {
      for (const stroke of strokes) {
        drawSmoothStroke(ctx, stroke.points, w, h, stroke.color, stroke.lineWidth);
      }
      if (isDrawingRef.current && currentPointsRef.current.length > 0) {
        drawSmoothStroke(ctx, currentPointsRef.current, w, h, activeColor, lineWidth);
      }
    }

    // Vẽ vòng tròn cursor tẩy
    if (isEraser && eraserPosRef.current) {
      const { x, y } = eraserPosRef.current;
      ctx.save();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.arc(x, y, ERASER_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [strokes, activeColor, lineWidth, showAnnotations, isEraser]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  useEffect(() => {
    const handleResize = () => redrawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  const snapToRulerIfNeeded = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      if (!rulerState) return { x: rawX, y: rawY };
      const rad = (rulerState.angle * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);
      const dX = rawX - rulerState.x;
      const dY = rawY - rulerState.y;
      const distToLine = Math.abs(dX * -sinA + dY * cosA);
      if (distToLine < 22) {
        const projLen = dX * cosA + dY * sinA;
        if (projLen >= -10 && projLen <= rulerState.length + 10) {
          return { x: rulerState.x + projLen * cosA, y: rulerState.y + projLen * sinA };
        }
      }
      return { x: rawX, y: rawY };
    },
    [rulerState]
  );

  const checkEraseStroke = useCallback(
    (normX: number, normY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const thresholdNorm = ERASER_RADIUS / Math.min(w, h);
      for (const stroke of strokes) {
        for (const pt of stroke.points) {
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

  // Eraser cursor tracking
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      // Cập nhật vị trí cursor tẩy
      if (isEraser) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          eraserPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          if (eraserFrameRef.current === null) {
            eraserFrameRef.current = requestAnimationFrame(() => {
              eraserFrameRef.current = null;
              redrawCanvas();
            });
          }
        }
      }

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

      pendingPointsRef.current.push({ x: normX, y: normY });
      if (animFrameIdRef.current === null) {
        animFrameIdRef.current = requestAnimationFrame(flushPendingPointsAndRender);
      }
    },
    [activeTool, isEraser, snapToRulerIfNeeded, checkEraseStroke, redrawCanvas]
  );

  const flushPendingPointsAndRender = useCallback(() => {
    animFrameIdRef.current = null;
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const pending = pendingPointsRef.current;
    if (pending.length === 0) return;
    pendingPointsRef.current = [];
    for (const pt of pending) {
      const last = currentPointsRef.current[currentPointsRef.current.length - 1];
      if (last) {
        const dx = (pt.x - last.x) * w;
        const dy = (pt.y - last.y) * h;
        if (dx * dx + dy * dy < 4) continue;
      }
      currentPointsRef.current.push(pt);
    }
    redrawCanvas();
  }, [redrawCanvas]);

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
      isDrawingRef.current = true;
      currentPointsRef.current = [{ x: normX, y: normY }];
      pendingPointsRef.current = [];
      canvas.setPointerCapture(e.pointerId);
      redrawCanvas();
    },
    [readOnly, activeTool, snapToRulerIfNeeded, checkEraseStroke, redrawCanvas]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
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
        onAddStroke({
          id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          color: activeColor,
          lineWidth,
          points: compressed,
          createdAt: Date.now(),
        });
        currentPointsRef.current = [];
        pendingPointsRef.current = [];
        redrawCanvas();
      }
    },
    [activeTool, activeColor, lineWidth, onAddStroke, flushPendingPointsAndRender, redrawCanvas]
  );

  // Ẩn cursor tẩy khi rời khỏi canvas
  const handlePointerLeave = useCallback(() => {
    eraserPosRef.current = null;
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    return () => {
      if (animFrameIdRef.current !== null) cancelAnimationFrame(animFrameIdRef.current);
      if (eraserFrameRef.current !== null) cancelAnimationFrame(eraserFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{
        touchAction: isDrawingMode ? 'none' : 'auto',
        pointerEvents: isDrawingMode ? 'auto' : 'none',
        opacity,
        // Ẩn cursor hệ thống khi đang dùng tẩy để hiện cursor tròn custom
        cursor: isEraser ? 'none' : 'inherit',
      }}
      className="absolute inset-0 w-full h-full z-30 transition-opacity duration-150 ease-out"
    />
  );
};

export const DrawingOverlay = memo(DrawingOverlayComponent);
