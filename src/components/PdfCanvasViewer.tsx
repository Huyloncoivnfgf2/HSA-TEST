import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  LockKeyholeOpen,
  Minus,
  Plus,
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ActiveToolType } from '../types/hsa';
import type { PdfAnnotationStroke } from '../types/pdfExam';
import { PdfPageAnnotationLayer } from './PdfPageAnnotationLayer';
import { FloatingRuler } from './FloatingRuler';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfCanvasViewerProps {
  file: Blob;
  scrollLocked: boolean;
  onScrollLockedChange: (locked: boolean) => void;
  initialZoom?: number;
  onZoomChange?: (zoom: number) => void;
  activeTool?: ActiveToolType;
  activeColor?: string;
  lineWidth?: number;
  readOnly?: boolean;
  showAnnotations?: boolean;
  onUndo?: () => void;
  rulerOpen?: boolean;
  onRulerToggle?: () => void;
  rulerState?: { x: number; y: number; angle: number; length: number } | null;
  onRulerStateChange?: (state: { x: number; y: number; angle: number; length: number } | null) => void;
  strokesByPage?: Record<number, PdfAnnotationStroke[]>;
  onAddPageStroke?: (pageNumber: number, stroke: PdfAnnotationStroke) => void;
  onErasePageStroke?: (pageNumber: number, strokeId: string) => void;
  onCurrentPageChange?: (pageNumber: number) => void;
  requestedPage?: number;
  pageStart?: number;
  pageEnd?: number;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  file,
  scrollLocked,
  onScrollLockedChange,
  initialZoom = 100,
  onZoomChange,
  activeTool = 'pointer',
  activeColor = '#0f172a',
  lineWidth = 4,
  readOnly = false,
  showAnnotations = true,
  onUndo,
  rulerOpen = false,
  onRulerToggle,
  rulerState = null,
  onRulerStateChange,
  strokesByPage = {},
  onAddPageStroke,
  onErasePageStroke,
  onCurrentPageChange,
  requestedPage,
  pageStart,
  pageEnd,
}) => {
  const [document, setDocument] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoom, setZoom] = useState(initialZoom);
  const [containerWidth, setContainerWidth] = useState(0);
  const [baseAspectRatio, setBaseAspectRatio] = useState(1 / 1.414);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const canvases = useRef(new Map<number, HTMLCanvasElement>());
  const renderTasks = useRef(new Map<number, pdfjs.RenderTask>());
  const zoomAnchor = useRef<{ page: number; verticalRatio: number } | null>(null);
  const touchPinch = useRef<{ distance: number; zoom: number } | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: pdfjs.PDFDocumentProxy | null = null;
    setDocument(null);
    setPageCount(0);
    setCurrentPage(1);
    setLoadError(null);

    let loadingTask: pdfjs.PDFDocumentLoadingTask | null = null;
    file.arrayBuffer().then((data) => {
      if (cancelled) return null;
      loadingTask = pdfjs.getDocument({ data });
      return loadingTask.promise;
    }).then(async (pdf) => {
      if (!pdf) return;
      loaded = pdf;
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      if (cancelled) {
        await pdf.destroy();
        return;
      }
      setBaseAspectRatio(viewport.width / viewport.height);
      setPageCount(pdf.numPages);
      setCurrentPage(Math.max(1, Math.floor(pageStart ?? 1)));
      setDocument(pdf);
    }).catch((error: unknown) => {
      if (!cancelled) {
        console.error('Could not open PDF:', error);
        setLoadError('Không thể mở tệp PDF. Vui lòng kiểm tra tệp và thử lại.');
      }
    });

    return () => {
      cancelled = true;
      renderTasks.current.forEach((task) => task.cancel());
      renderTasks.current.clear();
      if (loaded) void loaded.destroy();
      else if (loadingTask) void loadingTask.destroy();
    };
  }, [file]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const resize = new ResizeObserver(() => setContainerWidth(scroller.clientWidth - 32));
    resize.observe(scroller);
    setContainerWidth(scroller.clientWidth - 32);
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !pageCount) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => {
          const rootCenter = root.getBoundingClientRect().top + root.clientHeight / 2;
          return Math.abs(a.boundingClientRect.top - rootCenter) -
            Math.abs(b.boundingClientRect.top - rootCenter);
        })[0];
      if (visible) {
        const page = Number((visible.target as HTMLElement).dataset.page);
        setCurrentPage(page);
        onCurrentPageChange?.(page);
      }
    }, { root, rootMargin: '100px 0px', threshold: 0.05 });
    pageRefs.current.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [document, pageCount, zoom, containerWidth, onCurrentPageChange]);

  useEffect(() => setPageInput(String(currentPage)), [currentPage]);

  useEffect(() => {
    if (!document || !containerWidth) return;
    let cancelled = false;
    renderTasks.current.forEach((task) => task.cancel());
    renderTasks.current.clear();

    const visiblePages = new Set([currentPage - 1, currentPage, currentPage + 1]);
    canvases.current.forEach((canvas, pageNumber) => {
      if (!visiblePages.has(pageNumber)) {
        canvas.width = 0;
        canvas.height = 0;
      }
    });

    const renderNearbyPages = async () => {
      for (const pageNumber of visiblePages) {
        if (pageNumber < 1 || pageNumber > pageCount || cancelled) continue;
        const canvas = canvases.current.get(pageNumber);
        if (!canvas) continue;
        try {
          const page = await document.getPage(pageNumber);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const cssWidth = Math.max(1, containerWidth * zoom / 100);
          const scale = cssWidth / base.width;
          const viewport = page.getViewport({ scale });
          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas 2D context is not available');
          const task = page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
          });
          renderTasks.current.set(pageNumber, task);
          await task.promise;
          renderTasks.current.delete(pageNumber);
        } catch (error) {
          if (!(error instanceof Error && error.name === 'RenderingCancelledException')) {
            console.error(`Could not render PDF page ${pageNumber}:`, error);
            if (!cancelled) setLoadError('Không thể hiển thị một trang PDF.');
          }
        }
      }
    };
    void renderNearbyPages();
    return () => {
      cancelled = true;
      renderTasks.current.forEach((task) => task.cancel());
      renderTasks.current.clear();
    };
  }, [document, currentPage, pageCount, containerWidth, zoom]);

  useLayoutEffect(() => {
    const anchor = zoomAnchor.current;
    const root = scrollRef.current;
    if (!anchor || !root) return;
    const page = pageRefs.current.get(anchor.page);
    if (page) {
      const pageTop = root.scrollTop + page.getBoundingClientRect().top - root.getBoundingClientRect().top;
      root.scrollTop = pageTop + page.offsetHeight * anchor.verticalRatio - root.clientHeight / 2;
    }
    zoomAnchor.current = null;
  }, [zoom]);

  const setZoomPreservingPosition = useCallback((next: number) => {
    const root = scrollRef.current;
    if (root) {
      const page = pageRefs.current.get(currentPage);
      if (page) {
        const pageTop = root.scrollTop + page.getBoundingClientRect().top - root.getBoundingClientRect().top;
        const viewCenter = root.scrollTop + root.clientHeight / 2;
        zoomAnchor.current = {
          page: currentPage,
          verticalRatio: Math.max(0, Math.min(1, (viewCenter - pageTop) / page.offsetHeight)),
        };
      }
    }
    const nextZoom = Math.max(50, Math.min(300, Math.round(next / 10) * 10));
    setZoom(nextZoom);
    onZoomChange?.(nextZoom);
  }, [currentPage, onZoomChange]);

  const firstVisiblePage = Math.max(1, Math.floor(pageStart ?? 1));
  const lastVisiblePage = Math.max(firstVisiblePage, Math.min(pageCount || firstVisiblePage, Math.floor(pageEnd ?? pageCount ?? firstVisiblePage)));

  const goToPage = useCallback((page: number) => {
    const safePage = Math.max(firstVisiblePage, Math.min(lastVisiblePage, Math.floor(page)));
    const element = pageRefs.current.get(safePage);
    if (element && scrollRef.current) {
      scrollRef.current.scrollTop += element.getBoundingClientRect().top - scrollRef.current.getBoundingClientRect().top;
      setCurrentPage(safePage);
      setPageInput(String(safePage));
    }
  }, [firstVisiblePage, lastVisiblePage, onCurrentPageChange]);

  useEffect(() => {
    if (requestedPage && requestedPage !== currentPage) goToPage(requestedPage);
  }, [requestedPage, currentPage, goToPage]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const [first, second] = Array.from(event.touches);
        touchPinch.current = {
          distance: Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY),
          zoom,
        };
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && touchPinch.current) {
        event.preventDefault();
        const [first, second] = Array.from(event.touches);
        const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
        setZoomPreservingPosition(touchPinch.current.zoom * distance / touchPinch.current.distance);
      } else if (scrollLocked) {
        event.preventDefault();
      }
    };
    const onTouchEnd = () => {
      touchPinch.current = null;
    };
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    root.addEventListener('touchend', onTouchEnd, { passive: true });
    root.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('touchend', onTouchEnd);
      root.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [scrollLocked, setZoomPreservingPosition, zoom]);

  const pageNumbers = useMemo(
    () => Array.from({ length: Math.max(0, lastVisiblePage - firstVisiblePage + 1) }, (_, index) => firstVisiblePage + index),
    [firstVisiblePage, lastVisiblePage]
  );

  return (
    <section className="relative flex h-full min-h-0 flex-col bg-slate-200 dark:bg-slate-950">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= firstVisiblePage} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" aria-label="Trang trước"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-xs font-semibold">Trang</span>
          <input
            aria-label="Số trang"
            type="number"
            min={firstVisiblePage}
            max={lastVisiblePage}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onBlur={() => goToPage(Number(pageInput) || currentPage)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') goToPage(Number(pageInput) || currentPage);
            }}
            className="w-14 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-center text-xs dark:border-slate-700 dark:bg-slate-800"
          />
          <span className="text-xs font-semibold">/{pageCount || 0}</span>
          <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= lastVisiblePage} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" aria-label="Trang sau"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setZoomPreservingPosition(zoom - 10)} disabled={zoom <= 50} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" aria-label="Thu nhỏ"><Minus className="h-4 w-4" /></button>
          <span className="w-12 text-center text-xs font-bold">{zoom}%</span>
          <button type="button" onClick={() => setZoomPreservingPosition(zoom + 10)} disabled={zoom >= 300} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" aria-label="Phóng to"><Plus className="h-4 w-4" /></button>
          <button
            type="button"
            onClick={() => onScrollLockedChange(!scrollLocked)}
            className={`ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold ${scrollLocked ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            aria-label={scrollLocked ? 'Mở khóa cuộn PDF' : 'Khóa cuộn PDF'}
            title={scrollLocked ? 'Mở khóa cuộn' : 'Khóa cuộn'}
          >
            {scrollLocked ? <LockKeyhole className="h-4 w-4" /> : <LockKeyholeOpen className="h-4 w-4" />}
            <span className="hidden sm:inline">Ghim</span>
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-4"
        onWheel={(event) => {
          if (event.ctrlKey) {
            event.preventDefault();
            setZoomPreservingPosition(zoom + (event.deltaY < 0 ? 10 : -10));
          } else if (scrollLocked) {
            event.preventDefault();
          }
        }}
      >
        {loadError && <div className="mx-auto max-w-lg rounded-xl bg-rose-100 p-4 text-sm text-rose-800">{loadError}</div>}
        {!document && !loadError && <p className="py-10 text-center text-sm text-slate-500">Đang mở PDF…</p>}
        {document && (
          <div className="flex flex-col items-start gap-4">
            {pageNumbers.map((pageNumber) => (
              <div
                key={pageNumber}
                ref={(element) => {
                  if (element) pageRefs.current.set(pageNumber, element);
                  else pageRefs.current.delete(pageNumber);
                }}
                data-page={pageNumber}
                className="relative mx-auto shrink-0 bg-white shadow-lg"
                style={{
                  width: Math.max(1, containerWidth * zoom / 100),
                  aspectRatio: `${baseAspectRatio}`,
                }}
              >
                <canvas
                  ref={(element) => {
                    if (element) canvases.current.set(pageNumber, element);
                    else canvases.current.delete(pageNumber);
                  }}
                  className="block"
                />
                {Math.abs(pageNumber - currentPage) <= 1 && (
                  <PdfPageAnnotationLayer
                    strokes={strokesByPage[pageNumber] ?? []}
                    activeTool={activeTool}
                    activeColor={activeColor}
                    lineWidth={lineWidth}
                    readOnly={readOnly}
                    showAnnotations={showAnnotations}
                    rulerState={rulerState ?? null}
                    coordinateRoot={viewerRef.current}
                    onAddStroke={(stroke) => onAddPageStroke?.(pageNumber, stroke)}
                    onEraseStroke={(strokeId) => onErasePageStroke?.(pageNumber, strokeId)}
                  />
                )}
                <span className="absolute bottom-1 right-2 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-500">{pageNumber}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div ref={viewerRef} className="pointer-events-none absolute inset-0 z-30 relative">
        {rulerOpen && !readOnly && (
          <div className="pointer-events-auto absolute inset-0">
            <FloatingRuler
              isOpen
              onClose={() => onRulerToggle?.()}
              containerRef={viewerRef}
              onRulerStateChange={(state) => onRulerStateChange?.(state)}
            />
          </div>
        )}
      </div>
    </section>
  );
};
