import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { TextAnnotation, ActiveToolType } from '../types/hsa';
import { MathRenderer } from './MathRenderer';
import { expandSelectionToKaTeXBoundaries } from '../services/annotationService';

interface AnnotatedTextProps {
  content: string;
  target: string;
  annotations: TextAnnotation[];
  activeTool: ActiveToolType;
  activeColor: string;
  onAddAnnotation: (ann: Omit<TextAnnotation, 'id' | 'createdAt'>) => void;
  onRemoveAnnotation: (id: string) => void;
  className?: string;
  readOnly?: boolean;
  showAnnotations?: boolean;
}

// Canvas overlay để vẽ highlight/gạch chân mà không động vào DOM
const AnnotationCanvas: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
  annotations: TextAnnotation[];
  activeTool: ActiveToolType;
  show: boolean;
}> = ({ containerRef, annotations, activeTool, show }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !show) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (annotations.length === 0) return;

    // Lấy tất cả text nodes trong container, bỏ qua vùng KaTeX
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Bỏ qua text nodes bên trong KaTeX
          let parent = node.parentElement;
          while (parent && parent !== container) {
            if (
              parent.classList.contains('katex') ||
              parent.classList.contains('katex-html') ||
              parent.classList.contains('katex-mathml')
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    // Build danh sách text nodes với offset tích luỹ
    const textNodes: { node: Text; start: number; end: number }[] = [];
    let offset = 0;
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const len = node.textContent?.length || 0;
      textNodes.push({ node, start: offset, end: offset + len });
      offset += len;
    }

    const containerRect = container.getBoundingClientRect();

    annotations.forEach((ann) => {
      const color = ann.color || '#fef08a';
      const isHighlight = ann.type === 'highlight';
      const isUnderline = ann.type === 'underline';

      // Tìm range từ startIndex/endIndex
      let startNode: Text | null = null;
      let startOffset = 0;
      let endNode: Text | null = null;
      let endOffset = 0;

      for (const tn of textNodes) {
        if (startNode === null && ann.startIndex >= tn.start && ann.startIndex <= tn.end) {
          startNode = tn.node;
          startOffset = ann.startIndex - tn.start;
        }
        if (ann.endIndex >= tn.start && ann.endIndex <= tn.end) {
          endNode = tn.node;
          endOffset = ann.endIndex - tn.start;
        }
      }

      if (!startNode || !endNode) return;

      try {
        const range = document.createRange();
        range.setStart(startNode, Math.min(startOffset, startNode.length));
        range.setEnd(endNode, Math.min(endOffset, endNode.length));

        const rects = Array.from(range.getClientRects());
        rects.forEach((r) => {
          const x = r.left - containerRect.left;
          const y = r.top - containerRect.top;
          const rw = r.width;
          const rh = r.height;

          if (isHighlight) {
            // Parse màu và set alpha
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, rw, rh);
            ctx.restore();
          } else if (isUnderline) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y + rh - 1);
            ctx.lineTo(x + rw, y + rh - 1);
            ctx.stroke();
            ctx.restore();
          }
        });
      } catch {
        // Bỏ qua nếu range lỗi (DOM thay đổi)
      }
    });
  }, [annotations, containerRef, show]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const observer = new ResizeObserver(() => redraw());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, redraw]);

  if (!show) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ left: 0, top: 0 }}
    />
  );
};

export const AnnotatedText: React.FC<AnnotatedTextProps> = ({
  content,
  target,
  annotations,
  activeTool,
  activeColor,
  onAddAnnotation,
  onRemoveAnnotation,
  className = '',
  readOnly = false,
  showAnnotations = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const targetAnnotations = useMemo(() => {
    if (!showAnnotations) return [];
    return annotations.filter((a) => a.target === target);
  }, [annotations, target, showAnnotations]);

  const handleMouseUp = useCallback(() => {
    if (readOnly) return;
    if (activeTool !== 'highlight' && activeTool !== 'underline') return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startIndex = preSelectionRange.toString().length;
    const selectedLength = range.toString().length;
    const endIndex = startIndex + selectedLength;

    if (selectedLength <= 0) return;

    const expanded = expandSelectionToKaTeXBoundaries(content, startIndex, endIndex);

    onAddAnnotation({
      target,
      type: activeTool,
      startIndex: expanded.start,
      endIndex: expanded.end,
      color: activeColor,
    });

    selection.removeAllRanges();
  }, [readOnly, activeTool, activeColor, content, target, onAddAnnotation]);

  // Eraser: click vào annotation để xoá
  const handleClick = useCallback(() => {
    if (readOnly || activeTool !== 'eraser') return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    const preRange = range.cloneRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    const clickIndex = preRange.toString().length;

    // Xoá annotation bao phủ vị trí click
    targetAnnotations
      .filter((a) => a.startIndex <= clickIndex && a.endIndex >= clickIndex)
      .forEach((a) => onRemoveAnnotation(a.id));
  }, [readOnly, activeTool, targetAnnotations, onRemoveAnnotation]);

  const isInteractive = (activeTool === 'highlight' || activeTool === 'underline') && !readOnly;
  const isEraser = activeTool === 'eraser' && !readOnly && targetAnnotations.length > 0;

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onClick={handleClick}
      className={`relative ${isInteractive ? 'select-text cursor-text' : ''} ${isEraser ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Nội dung gốc — KHÔNG bao giờ bị wrap hay tách */}
      <MathRenderer content={content} />

      {/* Canvas overlay vẽ highlight/gạch chân, không chạm DOM */}
      <AnnotationCanvas
        containerRef={containerRef}
        annotations={targetAnnotations}
        activeTool={activeTool}
        show={showAnnotations}
      />
    </div>
  );
};
