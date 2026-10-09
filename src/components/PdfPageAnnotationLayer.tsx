import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveToolType } from '../types/hsa';
import type { PdfAnnotationStroke } from '../types/pdfExam';
import { compressStrokePoints } from '../services/annotationService';

interface RulerState {
  x: number;
  y: number;
  angle: number;
  length: number;
}

interface PdfPageAnnotationLayerProps {
  strokes: PdfAnnotationStroke[];
  activeTool: ActiveToolType;
  activeColor: string;
  lineWidth: number;
  readOnly: boolean;
  showAnnotations: boolean;
  rulerState: RulerState | null;
  coordinateRoot: HTMLElement | null;
  onAddStroke: (stroke: PdfAnnotationStroke) => void;
  onEraseStroke: (strokeId: string) => void;
}

const highlightOpacity = '99';

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: PdfAnnotationStroke,
  width: number,
  height: number
) {
  if (stroke.points.length === 0) return;
  const first = stroke.points[0];
  const last = stroke.points[stroke.points.length - 1];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (stroke.tool === 'highlight') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = `${stroke.color}${highlightOpacity}`;
    ctx.lineWidth = Math.max(12, stroke.lineWidth * 4);
    ctx.beginPath();
    ctx.moveTo(first.x * width, first.y * height);
    for (let index = 1; index < stroke.points.length - 1; index++) {
      const current = stroke.points[index];
      const next = stroke.points[index + 1];
      ctx.quadraticCurveTo(
        current.x * width,
        current.y * height,
        ((current.x + next.x) / 2) * width,
        ((current.y + next.y) / 2) * height
      );
    }
    if (stroke.points.length > 1) ctx.lineTo(last.x * width, last.y * height);
    ctx.stroke();
  } else if (stroke.tool === 'underline') {
    const centerY = (first.y + last.y) / 2 * height;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.beginPath();
    ctx.moveTo(first.x * width, centerY);
    ctx.lineTo(last.x * width, centerY);
    ctx.stroke();
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.beginPath();
    ctx.moveTo(first.x * width, first.y * height);
    if (stroke.points.length === 1) {
      ctx.lineTo(first.x * width + 0.01, first.y * height);
    } else if (stroke.points.length === 2) {
      ctx.lineTo(last.x * width, last.y * height);
    } else {
      for (let index = 1; index < stroke.points.length - 1; index++) {
        const current = stroke.points[index];
        const next = stroke.points[index + 1];
        ctx.quadraticCurveTo(
          current.x * width,
          current.y * height,
          ((current.x + next.x) / 2) * width,
          ((current.y + next.y) / 2) * height
        );
      }
      ctx.lineTo(last.x * width, last.y * height);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function pointToSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
    : 0;
  return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
}

export const PdfPageAnnotationLayer: React.FC<PdfPageAnnotationLayerProps> = ({
  strokes,
  activeTool,
  activeColor,
  lineWidth,
  readOnly,
  showAnnotations,
  rulerState,
  coordinateRoot,
  onAddStroke,
  onEraseStroke,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const pendingRef = useRef<{ x: number; y: number }[]>([]);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const frameRef = useRef<number | null>(null);
  const cursorPointRef = useRef<{ x: number; y: number } | null>(null);
  const [cursorTick, setCursorTick] = useState(0);
  const [stageTick, setStageTick] = useState(0);
  const canDraw = !readOnly && activeTool !== 'pointer';

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(width * dpr);
    const targetHeight = Math.round(height * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!showAnnotations) return;
    for (const stroke of strokes) drawStroke(ctx, stroke, width, height);
    if (drawingRef.current && pointsRef.current.length > 0) {
      drawStroke(ctx, {
        id: 'current',
        tool: activeTool === 'highlight' || activeTool === 'underline' ? activeTool : 'pen',
        color: activeColor,
        lineWidth,
        points: pointsRef.current,
        createdAt: Date.now(),
      }, width, height);
    }
    if (activeTool === 'eraser' && cursorPointRef.current) {
      const radius = 15;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cursorPointRef.current.x * width, cursorPointRef.current.y * height, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }, [activeColor, activeTool, lineWidth, showAnnotations, strokes, cursorTick]);

  useEffect(() => {
    redraw();
  }, [redraw, stageTick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = new ResizeObserver(() => setStageTick((tick) => tick + 1));
    resize.observe(canvas);
    return () => resize.disconnect();
  }, []);

  const getNormalizedPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const root = coordinateRoot;
    if (!canvas || !root) return null;
    const rect = canvas.getBoundingClientRect();
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    if (rulerState) {
      const rootRect = root.getBoundingClientRect();
      const globalX = clientX - rootRect.left;
      const globalY = clientY - rootRect.top;
      const radians = rulerState.angle * Math.PI / 180;
      const dx = globalX - rulerState.x;
      const dy = globalY - rulerState.y;
      const perpendicular = Math.abs(dx * -Math.sin(radians) + dy * Math.cos(radians));
      const along = dx * Math.cos(radians) + dy * Math.sin(radians);
      if (perpendicular < 22 && along >= -10 && along <= rulerState.length + 10) {
        const snappedX = rulerState.x + along * Math.cos(radians);
        const snappedY = rulerState.y + along * Math.sin(radians);
        x = snappedX + rootRect.left - rect.left;
        y = snappedY + rootRect.top - rect.top;
      }
    }
    return {
      x: Math.max(0, Math.min(1, x / rect.width)),
      y: Math.max(0, Math.min(1, y / rect.height)),
    };
  };

  const eraseAt = (point: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const threshold = 18 / Math.min(canvas.clientWidth, canvas.clientHeight);
    for (const stroke of strokes) {
      const hit = stroke.points.some((candidate, index) => {
        const next = stroke.points[index + 1];
        return pointToSegmentDistance(point, candidate, next ?? candidate) <= threshold;
      });
      if (hit) onEraseStroke(stroke.id);
    }
  };

  const flushPointerPoints = () => {
    frameRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas || !drawingRef.current) return;
    const nextPoints = pendingRef.current.splice(0);
    for (const point of nextPoints) {
      const last = pointsRef.current[pointsRef.current.length - 1];
      if (!last || Math.hypot(
        (point.x - last.x) * canvas.clientWidth,
        (point.y - last.y) * canvas.clientHeight
      ) >= 1.5) pointsRef.current.push(point);
    }
    redraw();
  };

  const scheduleDraw = () => {
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(flushPointerPoints);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    const point = getNormalizedPoint(event.clientX, event.clientY);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (activeTool === 'eraser') {
      drawingRef.current = true;
      eraseAt(point);
      return;
    }
    drawingRef.current = true;
    pointsRef.current = [point];
    pendingRef.current = [];
    redraw();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    const point = getNormalizedPoint(event.clientX, event.clientY);
    if (!point) return;
    if (activeTool === 'eraser') {
      cursorPointRef.current = point;
      setCursorTick((tick) => tick + 1);
      if (drawingRef.current) eraseAt(point);
      return;
    }
    if (!drawingRef.current) return;
    pendingRef.current.push(point);
    scheduleDraw();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    flushPointerPoints();
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (activeTool !== 'eraser' && pointsRef.current.length > 0) {
      const points = pointsRef.current;
      const snappedPoints = activeTool === 'underline' && points.length > 1
        ? [{ x: points[0].x, y: (points[0].y + points[points.length - 1].y) / 2 }, {
            x: points[points.length - 1].x,
            y: (points[0].y + points[points.length - 1].y) / 2,
          }]
        : points;
      onAddStroke({
        id: crypto.randomUUID(),
        tool: activeTool === 'highlight' || activeTool === 'underline' ? activeTool : 'pen',
        color: activeColor,
        lineWidth,
        points: compressStrokePoints(snappedPoints),
        createdAt: Date.now(),
      });
    }
    pointsRef.current = [];
    pendingRef.current = [];
    redraw();
  };

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => {
        if (activeTool === 'eraser') {
          cursorPointRef.current = null;
          setCursorTick((tick) => tick + 1);
        }
      }}
      style={{
        touchAction: canDraw ? 'none' : 'auto',
        pointerEvents: canDraw ? 'auto' : 'none',
        cursor: activeTool === 'eraser' ? 'none' : canDraw ? 'crosshair' : 'default',
      }}
      className="absolute inset-0 z-20 h-full w-full"
    />
  );
};
