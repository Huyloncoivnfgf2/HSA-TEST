import React, { useState, useEffect } from 'react';
import {
  ActiveToolType,
  StrokeWidthType,
  SubjectType,
} from '../types/hsa';
import {
  MousePointer,
  Pen,
  Highlighter,
  Underline as UnderlineIcon,
  Eraser,
  Ruler,
  Undo2,
  Redo2,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Edit,
  Palette,
} from 'lucide-react';

interface ExamToolbarProps {
  activeTool: ActiveToolType;
  onChangeTool: (tool: ActiveToolType) => void;
  activeColor: string;
  onChangeColor: (color: string) => void;
  strokeWidth: StrokeWidthType;
  onChangeStrokeWidth: (w: StrokeWidthType) => void;
  isRulerOpen: boolean;
  onToggleRuler: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Scratchpad toggle (only for Math & Science)
  subject: SubjectType;
  isScratchpadOpen?: boolean;
  onToggleScratchpad?: () => void;
  // Show / Hide notes toggle
  showAnnotations: boolean;
  onToggleShowAnnotations: () => void;
  readOnly?: boolean;
}

export const PEN_COLORS = [
  { id: 'black', hex: '#0f172a', label: 'Đen' },
  { id: 'red', hex: '#ef4444', label: 'Đỏ' },
  { id: 'blue', hex: '#3b82f6', label: 'Xanh dương' },
  { id: 'green', hex: '#10b981', label: 'Xanh lá' },
  { id: 'orange', hex: '#f97316', label: 'Cam' },
  { id: 'purple', hex: '#a855f7', label: 'Tím' },
];

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', hex: '#fef08a', label: 'Vàng' },
  { id: 'green', hex: '#bbf7d0', label: 'Xanh lá' },
  { id: 'blue', hex: '#bfdbfe', label: 'Xanh dương' },
  { id: 'pink', hex: '#fecdd3', label: 'Hồng' },
  { id: 'orange', hex: '#fed7aa', label: 'Cam' },
  { id: 'purple', hex: '#e9d5ff', label: 'Tím' },
];

export const ExamToolbar: React.FC<ExamToolbarProps> = ({
  activeTool,
  onChangeTool,
  activeColor,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  isRulerOpen,
  onToggleRuler,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  subject,
  isScratchpadOpen = false,
  onToggleScratchpad,
  showAnnotations,
  onToggleShowAnnotations,
  readOnly = false,
}) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);

  // Keyboard shortcuts (V, P, H, U, E, R, Ctrl+Z, Ctrl+Shift+Z)
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onUndo();
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.shiftKey && e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        onRedo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          onChangeTool('pointer');
          break;
        case 'p':
          onChangeTool(activeTool === 'pen' ? 'pointer' : 'pen');
          break;
        case 'h':
          onChangeTool(activeTool === 'highlight' ? 'pointer' : 'highlight');
          break;
        case 'u':
          onChangeTool(activeTool === 'underline' ? 'pointer' : 'underline');
          break;
        case 'e':
          onChangeTool(activeTool === 'eraser' ? 'pointer' : 'eraser');
          break;
        case 'r':
          onToggleRuler();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, activeTool, onChangeTool, onToggleRuler, onUndo, onRedo]);

  // Click handler for tools: clicking active tool resets to 'pointer'
  const handleToolClick = (tool: ActiveToolType) => {
    if (activeTool === tool) {
      onChangeTool('pointer');
    } else {
      onChangeTool(tool);
    }
  };

  const isMathOrScience = subject === 'math' || subject === 'science';
  const colorsList = activeTool === 'highlight' ? HIGHLIGHT_COLORS : PEN_COLORS;

  return (
    <>
      {/* ============================================================== */}
      {/* DESKTOP TOOLBAR (Horizontal pill bar neatly placed above question) */}
      {/* ============================================================== */}
      <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-2 px-3 backdrop-blur-xl shadow-md mb-4 select-none">
        {/* Left: Tools Group */}
        <div className="flex items-center gap-1">
          {/* Con trỏ (Pointer) */}
          <button
            type="button"
            onClick={() => onChangeTool('pointer')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTool === 'pointer'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Con trỏ [V] - Mặc định"
          >
            <MousePointer className="w-4 h-4" />
            <span className="text-xs">Con trỏ</span>
          </button>

          {/* Bút vẽ (Pen) */}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleToolClick('pen')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 ${
              activeTool === 'pen'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Bút vẽ [P] - Vẽ tự do lên câu hỏi"
          >
            <Pen className="w-4 h-4" />
            <span className="text-xs">Bút vẽ</span>
          </button>

          {/* Highlight */}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleToolClick('highlight')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 ${
              activeTool === 'highlight'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Highlight [H] - Tô sáng đoạn văn bản"
          >
            <Highlighter className="w-4 h-4" />
            <span className="text-xs">Highlight</span>
          </button>

          {/* Gạch chân (Underline) */}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleToolClick('underline')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 ${
              activeTool === 'underline'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Gạch chân [U] - Gạch chân văn bản"
          >
            <UnderlineIcon className="w-4 h-4" />
            <span className="text-xs">Gạch chân</span>
          </button>

          {/* Tẩy (Eraser) */}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleToolClick('eraser')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 ${
              activeTool === 'eraser'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Tẩy [E] - Xoá nét hoặc click xoá gạch chân/highlight"
          >
            <Eraser className="w-4 h-4" />
            <span className="text-xs">Tẩy</span>
          </button>

          {/* Thước (Ruler) */}
          <button
            type="button"
            disabled={readOnly}
            onClick={onToggleRuler}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 ${
              isRulerOpen
                ? 'bg-amber-100 dark:bg-amber-950/60 border border-amber-400 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Thước [R] - Kéo xoay và bám thẳng nét bút"
          >
            <Ruler className="w-4 h-4" />
            <span className="text-xs">Thước</span>
          </button>
        </div>

        {/* Center: Color Swatches & Stroke Width (if drawing/annotating) */}
        {!readOnly && (activeTool === 'pen' || activeTool === 'highlight' || activeTool === 'underline') && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-in fade-in duration-150">
            {/* Color Swatches */}
            <div className="flex items-center gap-1">
              {colorsList.map((c) => {
                const isSelected = activeColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onChangeColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      isSelected
                        ? 'ring-2 ring-blue-500 scale-125 z-10 shadow-xs'
                        : 'hover:scale-110 opacity-80'
                    }`}
                    title={c.label}
                  />
                );
              })}
            </div>

            {/* Thickness selector (only for pen) */}
            {activeTool === 'pen' && (
              <div className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-700 pl-2">
                {[
                  { id: 'thin' as StrokeWidthType, px: 2, label: 'Mỏng' },
                  { id: 'medium' as StrokeWidthType, px: 4, label: 'Vừa' },
                  { id: 'thick' as StrokeWidthType, px: 7, label: 'Đậm' },
                ].map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onChangeStrokeWidth(w.id)}
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition ${
                      strokeWidth === w.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title={`Độ đậm ${w.label}`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right: Undo / Redo / Clear / Scratchpad toggle / Visibility */}
        <div className="flex items-center gap-1.5">
          {/* Undo */}
          <button
            type="button"
            disabled={!canUndo || readOnly}
            onClick={onUndo}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Hoàn tác [Ctrl+Z]"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* Redo */}
          <button
            type="button"
            disabled={!canRedo || readOnly}
            onClick={onRedo}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Làm lại [Ctrl+Shift+Z]"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Clear all for current question */}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              if (window.confirm('Xoá tất cả nét vẽ và đánh dấu của câu hỏi hiện tại?')) {
                onClear();
              }
            }}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-30 disabled:pointer-events-none"
            title="Xoá hết ghi chú câu hiện tại"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:border-slate-800 mx-1" />

          {/* Show / Hide Annotations */}
          <button
            type="button"
            onClick={onToggleShowAnnotations}
            className={`p-1.5 rounded-lg transition ${
              showAnnotations
                ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                : 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 font-semibold'
            }`}
            title={showAnnotations ? 'Ẩn ghi chú' : 'Hiện ghi chú'}
          >
            {showAnnotations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Scratchpad Toggle Button (Available for all exam sections) */}
          {onToggleScratchpad && (
            <button
              type="button"
              disabled={readOnly}
              onClick={onToggleScratchpad}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition disabled:opacity-40 ${
                isScratchpadOpen
                  ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-500/30'
                  : 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
              }`}
              title="Bật / Tắt bảng nháp điện tử"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{isScratchpadOpen ? 'Đóng nháp' : 'Bảng nháp'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE TOOLBAR (Collapsible horizontal bar at the bottom) */}
      {/* ============================================================== */}
      <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 select-none">
        <div className="rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all">
          {/* Header row with collapse toggle */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span>Công cụ làm bài</span>
              {activeTool !== 'pointer' && (
                <span className="px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold uppercase">
                  {activeTool}
                </span>
              )}
            </span>

            <div className="flex items-center gap-1">
              {/* Scratchpad toggle */}
              {onToggleScratchpad && !readOnly && (
                <button
                  type="button"
                  onClick={onToggleScratchpad}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    isScratchpadOpen
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                  }`}
                >
                  {isScratchpadOpen ? 'Đóng nháp' : 'Bảng nháp'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsMobileCollapsed((prev) => !prev)}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {isMobileCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {!isMobileCollapsed && (
            <div className="p-2 space-y-2">
              {/* Tool icons row */}
              <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => onChangeTool('pointer')}
                  className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 shrink-0 ${
                    activeTool === 'pointer'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <MousePointer className="w-4 h-4" />
                  <span className="text-[9px]">Trỏ</span>
                </button>

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleToolClick('pen')}
                  className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 shrink-0 ${
                    activeTool === 'pen'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Pen className="w-4 h-4" />
                  <span className="text-[9px]">Bút</span>
                </button>

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleToolClick('highlight')}
                  className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 shrink-0 ${
                    activeTool === 'highlight'
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Highlighter className="w-4 h-4" />
                  <span className="text-[9px]">Highl.</span>
                </button>

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleToolClick('underline')}
                  className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 shrink-0 ${
                    activeTool === 'underline'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <UnderlineIcon className="w-4 h-4" />
                  <span className="text-[9px]">Gạch</span>
                </button>

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleToolClick('eraser')}
                  className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 shrink-0 ${
                    activeTool === 'eraser'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Eraser className="w-4 h-4" />
                  <span className="text-[9px]">Tẩy</span>
                </button>

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={onToggleRuler}
                  className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 shrink-0 ${
                    isRulerOpen
                      ? 'bg-amber-200 dark:bg-amber-950 text-amber-800 dark:text-amber-200 ring-1 ring-amber-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Ruler className="w-4 h-4" />
                  <span className="text-[9px]">Thước</span>
                </button>

                <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 shrink-0 mx-1" />

                <button
                  type="button"
                  disabled={!canUndo || readOnly}
                  onClick={onUndo}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-400 disabled:opacity-20 shrink-0"
                >
                  <Undo2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={!canRedo || readOnly}
                  onClick={onRedo}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-400 disabled:opacity-20 shrink-0"
                >
                  <Redo2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={onClear}
                  className="p-2 rounded-xl text-rose-500 disabled:opacity-20 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Color swatches in mobile if pen or highlight */}
              {!readOnly && (activeTool === 'pen' || activeTool === 'highlight' || activeTool === 'underline') && (
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {colorsList.map((c) => {
                      const isSelected = activeColor.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onChangeColor(c.hex)}
                          style={{ backgroundColor: c.hex }}
                          className={`w-6 h-6 rounded-full ${
                            isSelected ? 'ring-2 ring-blue-500 scale-110' : 'opacity-80'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {activeTool === 'pen' && (
                    <div className="flex items-center gap-1">
                      {[
                        { id: 'thin' as StrokeWidthType, label: 'Mỏng' },
                        { id: 'medium' as StrokeWidthType, label: 'Vừa' },
                        { id: 'thick' as StrokeWidthType, label: 'Đậm' },
                      ].map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onChangeStrokeWidth(w.id)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            strokeWidth === w.id
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-500 bg-slate-100 dark:bg-slate-800'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
