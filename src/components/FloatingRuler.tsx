import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCw, Pin, PinOff } from 'lucide-react';

interface FloatingRulerProps {
  isOpen: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRulerStateChange?: (state: {
    x: number;
    y: number;
    angle: number; // in degrees
    length: number;
  }) => void;
}

export const FloatingRuler: React.FC<FloatingRulerProps> = ({
  isOpen,
  onClose,
  containerRef,
  onRulerStateChange,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 80, y: 120 });
  const [angle, setAngle] = useState<number>(0); // degrees
  const [length] = useState<number>(340); // 340px ruler
  const [isPinned, setIsPinned] = useState<boolean>(false); // Ghim cố định không cho trượt khi vẽ

  const isDraggingRef = useRef<boolean>(false);
  const isRotatingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialAngleRef = useRef<number>(0);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Notify parent of position & angle changes
  useEffect(() => {
    if (isOpen && onRulerStateChange) {
      onRulerStateChange({
        x: position.x,
        y: position.y,
        angle,
        length,
      });
    }
  }, [isOpen, position, angle, length, onRulerStateChange]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isPinned) return; // Locked: do not drag!
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY };
    initialPosRef.current = { ...position };

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const cX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const cY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
      const dx = cX - dragStartRef.current.x;
      const dy = cY - dragStartRef.current.y;

      setPosition({
        x: initialPosRef.current.x + dx,
        y: initialPosRef.current.y + dy,
      });
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  }, [position, isPinned]);

  const handleRotateStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isPinned) return; // Locked
    e.stopPropagation();
    isRotatingRef.current = true;

    // Calculate center of ruler
    const rect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect();
    if (rect) {
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startAngleRad = Math.atan2(clientY - centerRef.current.y, clientX - centerRef.current.x);
    initialAngleRef.current = angle - (startAngleRad * 180) / Math.PI;

    const handleRotateMove = (ev: MouseEvent | TouchEvent) => {
      if (!isRotatingRef.current) return;
      const cX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const cY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
      const curAngleRad = Math.atan2(cY - centerRef.current.y, cX - centerRef.current.x);
      const newDeg = (curAngleRad * 180) / Math.PI + initialAngleRef.current;
      setAngle(Math.round(newDeg) % 360);
    };

    const handleRotateEnd = () => {
      isRotatingRef.current = false;
      window.removeEventListener('mousemove', handleRotateMove);
      window.removeEventListener('mouseup', handleRotateEnd);
      window.removeEventListener('touchmove', handleRotateMove);
      window.removeEventListener('touchend', handleRotateEnd);
    };

    window.addEventListener('mousemove', handleRotateMove);
    window.addEventListener('mouseup', handleRotateEnd);
    window.addEventListener('touchmove', handleRotateMove);
    window.addEventListener('touchend', handleRotateEnd);
  }, [angle, isPinned]);

  if (!isOpen) return null;

  // 1. Generate cm/mm tick marks for top edge (25px per cm unit)
  const cmCount = Math.floor(length / 25);
  const cmTicks: React.ReactNode[] = [];
  for (let i = 0; i <= cmCount; i++) {
    const xPos = i * 25 + 10;
    cmTicks.push(
      <div
        key={`cm-${i}`}
        className="absolute top-0 flex flex-col items-center pointer-events-none"
        style={{ left: `${xPos}px` }}
      >
        <div className="w-[1px] h-3.5 bg-slate-700 dark:bg-slate-300" />
        <span className="text-[8px] font-mono font-bold text-slate-700 dark:text-slate-300 select-none">
          {i}
        </span>
      </div>
    );
    if (i < cmCount) {
      cmTicks.push(
        <div
          key={`half-${i}`}
          className="absolute top-0 pointer-events-none"
          style={{ left: `${xPos + 12.5}px` }}
        >
          <div className="w-[1px] h-2 bg-slate-500/80 dark:bg-slate-400/80" />
        </div>
      );
    }
  }

  // 2. Generate pixel tick marks for bottom edge (every 50px marked, 10px ticks)
  const pxTicks: React.ReactNode[] = [];
  for (let px = 0; px <= length - 20; px += 10) {
    const xPos = px + 10;
    const isMajor = px % 50 === 0;
    pxTicks.push(
      <div
        key={`px-${px}`}
        className="absolute bottom-0 flex flex-col-reverse items-center pointer-events-none"
        style={{ left: `${xPos}px` }}
      >
        <div className={`w-[1px] ${isMajor ? 'h-3 bg-amber-700 dark:bg-amber-300' : 'h-1.5 bg-amber-500/60'}`} />
        {isMajor && (
          <span className="text-[7px] font-mono font-semibold text-amber-800 dark:text-amber-300 select-none mb-0.5">
            {px}
          </span>
        )}
      </div>
    );
  }

  const normalizedAngle = ((angle % 360) + 360) % 360;

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${length}px`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'center center',
      }}
      className={`absolute z-30 h-16 rounded-xl bg-amber-50/85 dark:bg-slate-800/90 backdrop-blur-md border ${
        isPinned
          ? 'border-purple-500 ring-2 ring-purple-500/30'
          : 'border-amber-300 dark:border-slate-600'
      } shadow-2xl select-none flex items-center justify-between px-3 ${
        isPinned ? 'cursor-default' : 'cursor-move'
      }`}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      {/* Top Edge: CM / MM Scale */}
      <div className="absolute top-0 left-0 right-0 h-6 overflow-hidden pointer-events-none">
        {cmTicks}
        <span className="absolute top-0.5 right-2 text-[7px] font-bold text-slate-500">cm</span>
      </div>

      {/* Bottom Edge: Pixel Scale */}
      <div className="absolute bottom-0 left-0 right-0 h-5 overflow-hidden pointer-events-none">
        {pxTicks}
        <span className="absolute bottom-0.5 right-2 text-[7px] font-bold text-amber-700 dark:text-amber-400">px</span>
      </div>

      {/* Middle Controls: Pin toggle, Quick Angles, Rotate knob, Close */}
      <div className="relative z-10 mx-auto flex items-center gap-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-amber-200/60 dark:border-slate-700">
        {/* Pin / Lock toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsPinned((p) => !p);
          }}
          className={`p-1 rounded-md text-[10px] font-bold flex items-center gap-0.5 transition ${
            isPinned
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title={isPinned ? 'Đang ghim thước cố định (Click để mở)' : 'Ghim cố định để vẽ không trượt thước'}
        >
          {isPinned ? <Pin className="w-3 h-3 fill-current" /> : <PinOff className="w-3 h-3" />}
        </button>

        {/* Quick Angle Buttons: 0°, 45°, 90° */}
        <div className="flex items-center gap-0.5">
          {[0, 45, 90].map((deg) => (
            <button
              key={deg}
              type="button"
              disabled={isPinned}
              onClick={(e) => {
                e.stopPropagation();
                setAngle(deg);
              }}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition disabled:opacity-40 ${
                normalizedAngle === deg
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-slate-800'
              }`}
              title={`Xoay ${deg}°`}
            >
              {deg}°
            </button>
          ))}
        </div>

        {/* Angle Display */}
        <span className="text-[10px] font-mono font-bold text-amber-900 dark:text-amber-300 px-1">
          {normalizedAngle}°
        </span>

        {/* Free rotation knob */}
        <button
          type="button"
          disabled={isPinned}
          onMouseDown={handleRotateStart}
          onTouchStart={handleRotateStart}
          className="p-1 rounded-md bg-amber-200/80 dark:bg-slate-700 hover:bg-amber-300 text-amber-900 dark:text-amber-200 cursor-grab active:cursor-grabbing disabled:opacity-40 transition"
          title="Kéo tự do để xoay góc bất kỳ"
        >
          <RotateCw className="w-3 h-3" />
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 rounded-md text-slate-500 hover:bg-rose-500 hover:text-white transition"
          title="Đóng thước"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

