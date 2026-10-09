import React, { useEffect, useMemo, useState } from 'react';
import { Flag, X } from 'lucide-react';
import {
  contentReportStatuses,
  listOwnerContentReports,
  reportCategoryLabel,
  reportComponentLabel,
  updateContentReport,
  type ContentReport,
  type ContentReportStatus,
} from '../services/contentReportService';

interface ContentReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContentReportsModal: React.FC<ContentReportsModalProps> = ({ isOpen, onClose }) => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | ContentReportStatus>('pending');
  const [drafts, setDrafts] = useState<Record<string, { status: ContentReportStatus; ownerNote: string; duplicateOf: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = async () => {
    try {
      const loaded = await listOwnerContentReports();
      setReports(loaded);
      setDrafts(Object.fromEntries(loaded.map((report) => [report.id, {
        status: report.status,
        ownerNote: report.ownerNote ?? '',
        duplicateOf: report.duplicateOf ?? '',
      }])));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải hàng đợi báo lỗi.');
    }
  };

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen]);

  const visibleReports = useMemo(
    () => statusFilter === 'all' ? reports : reports.filter((report) => report.status === statusFilter),
    [reports, statusFilter]
  );

  if (!isOpen) return null;

  const save = async (report: ContentReport) => {
    const draft = drafts[report.id] ?? { status: report.status, ownerNote: report.ownerNote ?? '', duplicateOf: report.duplicateOf ?? '' };
    try {
      await updateContentReport(report, {
        status: draft.status,
        ownerNote: draft.ownerNote,
        duplicateOf: draft.duplicateOf || null,
      });
      setSavedId(report.id);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể cập nhật báo lỗi.');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Hàng đợi báo lỗi nội dung">
      <section className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="flex items-center gap-2 font-extrabold"><Flag className="h-4 w-4 text-amber-600" /> Hàng đợi báo lỗi nội dung</h2>
            <p className="mt-1 text-xs text-slate-500">Chỉ Owner xem và xử lý danh sách này.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-4 overflow-y-auto p-5">
          <label className="block max-w-xs space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
            Lọc trạng thái
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-800">
              <option value="all">Tất cả</option>
              {contentReportStatuses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
          {visibleReports.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">Chưa có báo lỗi ở trạng thái này.</p>
          ) : visibleReports.map((report) => {
            const draft = drafts[report.id] ?? { status: report.status, ownerNote: report.ownerNote ?? '', duplicateOf: report.duplicateOf ?? '' };
            const duplicateCandidates = reports.filter((item) => item.id !== report.id && item.examId === report.examId && item.questionNumber === report.questionNumber);
            return (
              <article key={report.id} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold">{report.examTitle} · Câu {report.questionNumber}</h3>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      {reportComponentLabel(report.component)} · {reportCategoryLabel(report.category)}
                      {report.examVersion ? ` · v${report.examVersion}` : ''}
                      {report.pageNumber ? ` · Trang ${report.pageNumber}` : ''}
                      {' '}· {new Date(report.createdAt).toLocaleString('vi-VN')}
                      {report.reporterEmail ? ` · ${report.reporterEmail}` : ''}
                    </p>
                  </div>
                  {savedId === report.id && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Đã lưu</span>}
                </div>
                <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 dark:bg-slate-800/70">{report.description}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                    Trạng thái xử lý
                    <select value={draft.status} onChange={(event) => setDrafts((current) => ({ ...current, [report.id]: { ...draft, status: event.target.value as ContentReportStatus } }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-800">
                      {contentReportStatuses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </label>
                  {draft.status === 'duplicate' && (
                    <label className="block space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                      Trùng với báo lỗi gốc
                      <select value={draft.duplicateOf} onChange={(event) => setDrafts((current) => ({ ...current, [report.id]: { ...draft, duplicateOf: event.target.value } }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-800">
                        <option value="">Chưa chọn</option>
                        {duplicateCandidates.map((item) => <option key={item.id} value={item.id}>{reportCategoryLabel(item.category)} · {new Date(item.createdAt).toLocaleString('vi-VN')}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                <label className="block space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                  Phản hồi cho người báo
                  <textarea value={draft.ownerNote} onChange={(event) => setDrafts((current) => ({ ...current, [report.id]: { ...draft, ownerNote: event.target.value } }))} rows={2} placeholder="Ví dụ: Đã sửa đáp án ở phiên bản mới / Cần bạn nói rõ bạn thấy sai ở đâu" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-800" />
                </label>
                <div className="flex justify-end">
                  <button type="button" onClick={() => void save(report)} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 dark:bg-slate-700">Lưu xử lý</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
