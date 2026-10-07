import React, { useRef, useMemo, useCallback } from 'react';
import { TextAnnotation, ActiveToolType } from '../types/hsa';
import { MathRenderer } from './MathRenderer';
import { expandSelectionToKaTeXBoundaries } from '../services/annotationService';

interface AnnotatedTextProps {
  content: string;
  target: string; // 'questionText' | 'groupContent' | 'option-0' etc.
  annotations: TextAnnotation[];
  activeTool: ActiveToolType;
  activeColor: string;
  onAddAnnotation: (ann: Omit<TextAnnotation, 'id' | 'createdAt'>) => void;
  onRemoveAnnotation: (id: string) => void;
  className?: string;
  readOnly?: boolean;
  showAnnotations?: boolean;
}

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

  // Filter annotations for this target
  const targetAnnotations = useMemo(() => {
    if (!showAnnotations) return [];
    return annotations.filter((a) => a.target === target);
  }, [annotations, target, showAnnotations]);

  // Handle text selection when tool is highlight or underline
  const handleMouseUp = useCallback(() => {
    if (readOnly) return;
    if (activeTool !== 'highlight' && activeTool !== 'underline') return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    // Calculate start and end offset within textContent of container
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startIndex = preSelectionRange.toString().length;
    const selectedLength = range.toString().length;
    const endIndex = startIndex + selectedLength;

    if (selectedLength <= 0) return;

    // Expand to KaTeX boundaries if needed
    const expanded = expandSelectionToKaTeXBoundaries(content, startIndex, endIndex);

    onAddAnnotation({
      target,
      type: activeTool,
      startIndex: expanded.start,
      endIndex: expanded.end,
      color: activeColor,
    });

    // Clear selection after applying
    selection.removeAllRanges();
  }, [readOnly, activeTool, activeColor, content, target, onAddAnnotation]);

  // If there are no annotations, render directly with MathRenderer
  if (targetAnnotations.length === 0) {
    return (
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        className={`relative ${activeTool === 'highlight' || activeTool === 'underline' ? 'select-text cursor-text' : ''} ${className}`}
      >
        <MathRenderer content={content} />
      </div>
    );
  }

  // Segment the text by annotation boundaries
  // Collect cut points
  const cutPoints = new Set<number>([0, content.length]);
  targetAnnotations.forEach((a) => {
    const s = Math.max(0, Math.min(content.length, a.startIndex));
    const e = Math.max(0, Math.min(content.length, a.endIndex));
    cutPoints.add(s);
    cutPoints.add(e);
  });

  const sortedCuts = Array.from(cutPoints).sort((a, b) => a - b);
  const segments: {
    start: number;
    end: number;
    text: string;
    highlights: TextAnnotation[];
    underlines: TextAnnotation[];
  }[] = [];

  for (let i = 0; i < sortedCuts.length - 1; i++) {
    const s = sortedCuts[i];
    const e = sortedCuts[i + 1];
    if (s >= e) continue;

    const segmentText = content.slice(s, e);
    const matchingHighlights = targetAnnotations.filter(
      (a) => a.type === 'highlight' && a.startIndex <= s && a.endIndex >= e
    );
    const matchingUnderlines = targetAnnotations.filter(
      (a) => a.type === 'underline' && a.startIndex <= s && a.endIndex >= e
    );

    segments.push({
      start: s,
      end: e,
      text: segmentText,
      highlights: matchingHighlights,
      underlines: matchingUnderlines,
    });
  }

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      className={`relative ${activeTool === 'highlight' || activeTool === 'underline' ? 'select-text cursor-text' : ''} ${className}`}
    >
      {segments.map((seg, idx) => {
        const hasHighlight = seg.highlights.length > 0;
        const hasUnderline = seg.underlines.length > 0;
        const highlightColor = hasHighlight ? seg.highlights[0].color : '';
        const underlineColor = hasUnderline ? seg.underlines[0].color : '';

        let highlightStyle = '';
        if (hasHighlight) {
          switch (highlightColor) {
            case '#fef08a': // yellow
              highlightStyle = 'bg-yellow-200/70 dark:bg-yellow-500/30 rounded-xs px-0.5';
              break;
            case '#bbf7d0': // green
              highlightStyle = 'bg-emerald-200/70 dark:bg-emerald-500/30 rounded-xs px-0.5';
              break;
            case '#bfdbfe': // blue
              highlightStyle = 'bg-blue-200/70 dark:bg-blue-500/30 rounded-xs px-0.5';
              break;
            case '#fecdd3': // rose/pink
              highlightStyle = 'bg-rose-200/70 dark:bg-rose-500/30 rounded-xs px-0.5';
              break;
            case '#fed7aa': // orange
              highlightStyle = 'bg-orange-200/70 dark:bg-orange-500/30 rounded-xs px-0.5';
              break;
            case '#e9d5ff': // purple
              highlightStyle = 'bg-purple-200/70 dark:bg-purple-500/30 rounded-xs px-0.5';
              break;
            default:
              highlightStyle = 'bg-yellow-200/70 dark:bg-yellow-500/30 rounded-xs px-0.5';
          }
        }

        let underlineStyle = '';
        if (hasUnderline) {
          switch (underlineColor) {
            case '#ef4444':
              underlineStyle = 'border-b-2 border-rose-500';
              break;
            case '#3b82f6':
              underlineStyle = 'border-b-2 border-blue-500';
              break;
            case '#10b981':
              underlineStyle = 'border-b-2 border-emerald-500';
              break;
            case '#f97316':
              underlineStyle = 'border-b-2 border-orange-500';
              break;
            case '#a855f7':
              underlineStyle = 'border-b-2 border-purple-500';
              break;
            case '#0f172a':
            default:
              underlineStyle = 'border-b-2 border-slate-900 dark:border-slate-100';
          }
        }

        const isEraserTarget = activeTool === 'eraser' && (hasHighlight || hasUnderline);

        return (
          <span
            key={idx}
            onClick={(e) => {
              if (isEraserTarget && !readOnly) {
                e.stopPropagation();
                seg.highlights.forEach((h) => onRemoveAnnotation(h.id));
                seg.underlines.forEach((u) => onRemoveAnnotation(u.id));
              }
            }}
            className={`inline ${highlightStyle} ${underlineStyle} ${isEraserTarget ? 'cursor-pointer hover:opacity-50 ring-1 ring-rose-400' : ''}`}
            title={isEraserTarget ? 'Bấm để xoá đánh dấu này' : undefined}
          >
            <MathRenderer content={seg.text} />
          </span>
        );
      })}
    </div>
  );
};
