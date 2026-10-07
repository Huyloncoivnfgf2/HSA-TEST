import React, { useState } from 'react';
import { Question, ActiveToolType, TextAnnotation, DrawingStroke } from '../types/hsa';
import { AnnotatedText } from './AnnotatedText';
import { DrawingOverlay } from './DrawingOverlay';
import { Layers, Pin, PinOff, ChevronDown, ChevronUp, Link } from 'lucide-react';

interface ClusterPassageCardProps {
  currentQuestion: Question;
  clusterQuestions: Question[];
  currentClusterIndex: number;
  userAnswers: Record<string, number | string>;
  activeTool: ActiveToolType;
  activeColor: string;
  lineWidth: number;
  groupTextAnnotations: TextAnnotation[];
  groupStrokes: DrawingStroke[];
  onAddGroupAnnotation: (ann: Omit<TextAnnotation, 'id' | 'createdAt'>) => void;
  onRemoveGroupAnnotation: (id: string) => void;
  onAddGroupStroke: (stroke: DrawingStroke) => void;
  onEraseGroupStroke: (strokeId: string) => void;
  onSelectClusterQuestion: (questionIndex: number) => void;
  readOnly?: boolean;
  showAnnotations?: boolean;
  rulerState?: {
    x: number;
    y: number;
    angle: number;
    length: number;
  } | null;
}

export const ClusterPassageCard: React.FC<ClusterPassageCardProps> = ({
  currentQuestion,
  clusterQuestions,
  currentClusterIndex,
  userAnswers,
  activeTool,
  activeColor,
  lineWidth,
  groupTextAnnotations,
  groupStrokes,
  onAddGroupAnnotation,
  onRemoveGroupAnnotation,
  onAddGroupStroke,
  onEraseGroupStroke,
  onSelectClusterQuestion,
  readOnly = false,
  showAnnotations = true,
  rulerState,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(true);
  const [isPinned, setIsPinned] = useState(true);

  if (!currentQuestion.groupContent) return null;

  // Calculate cluster range (e.g. Câu 7 - 10)
  const numbers = clusterQuestions
    .map((q) => q.originalNumber)
    .filter((n): n is number => typeof n === 'number');

  const rangeLabel =
    numbers.length >= 2
      ? `CỤM CÂU ${Math.min(...numbers)}–${Math.max(...numbers)}`
      : `CỤM CÂU HỎI (${clusterQuestions.length} CÂU)`;

  return (
    <div className="relative p-5 sm:p-6 rounded-3xl bg-purple-50/80 dark:bg-purple-950/25 border-2 border-purple-200 dark:border-purple-800/80 space-y-4 md:sticky md:top-36 md:max-h-[calc(100vh-10rem)] md:overflow-y-auto shadow-sm select-text">
      {/* Drawing Overlay on the shared passage */}
      <DrawingOverlay
        strokes={groupStrokes}
        activeTool={activeTool}
        activeColor={activeColor}
        lineWidth={lineWidth}
        readOnly={readOnly}
        showAnnotations={showAnnotations}
        rulerState={rulerState}
        onAddStroke={onAddGroupStroke}
        onEraseStroke={onEraseGroupStroke}
      />

      {/* Header bar with Cluster label, progress dots and pin */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-purple-200/80 dark:border-purple-800/60">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-purple-600 text-white shadow-xs">
            <Link className="w-3.5 h-3.5" />
            <span>{rangeLabel}</span>
          </span>
          <span className="text-xs font-semibold text-purple-900 dark:text-purple-300">
            Câu {currentClusterIndex + 1}/{clusterQuestions.length} trong cụm
          </span>
        </div>

        {/* Progress dots for cluster */}
        <div className="flex items-center gap-1.5">
          {clusterQuestions.map((q, idx) => {
            const isAns = userAnswers[q.id] !== undefined;
            const isCur = idx === currentClusterIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onSelectClusterQuestion(idx)}
                className={`w-3 h-3 rounded-full transition-transform ${
                  isCur
                    ? 'ring-2 ring-purple-600 scale-125 bg-purple-600'
                    : isAns
                    ? 'bg-emerald-500 hover:scale-110'
                    : 'bg-purple-200 dark:bg-purple-900 hover:scale-110'
                }`}
                title={`Câu ${idx + 1} trong cụm (${isAns ? 'Đã làm' : 'Chưa làm'})`}
              />
            );
          })}

          {/* Mobile Collapse & Pin Controls */}
          <div className="md:hidden flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => setIsPinned((prev) => !prev)}
              className={`p-1 rounded-lg text-xs transition ${
                isPinned
                  ? 'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                  : 'text-purple-600'
              }`}
              title={isPinned ? 'Bỏ ghim đoạn chung' : 'Ghim đoạn chung'}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5 fill-purple-700" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsMobileOpen((prev) => !prev)}
              className="p-1 text-purple-600"
            >
              {isMobileOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Cluster Title if any */}
      {currentQuestion.groupTitle && (
        <div className="relative z-20 text-xs font-bold text-purple-800 dark:text-purple-300">
          {currentQuestion.groupTitle}
        </div>
      )}

      {/* Shared Passage Text with Annotation Support */}
      <div
        className={`relative z-20 text-sm leading-relaxed text-slate-800 dark:text-slate-200 ${
          isMobileOpen ? 'block' : isPinned ? 'block max-h-24 overflow-hidden relative' : 'hidden md:block'
        }`}
      >
        <AnnotatedText
          content={currentQuestion.groupContent}
          target="groupContent"
          annotations={groupTextAnnotations}
          activeTool={activeTool}
          activeColor={activeColor}
          onAddAnnotation={onAddGroupAnnotation}
          onRemoveAnnotation={onRemoveGroupAnnotation}
          readOnly={readOnly}
          showAnnotations={showAnnotations}
        />
        {!isMobileOpen && isPinned && (
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-purple-50 dark:from-slate-900 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
};
