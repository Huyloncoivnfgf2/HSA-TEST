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
import {
  listExamCorrections,
  regradeDecisionLabel,
  updateExamCorrectionDecision,
  type ExamCorrection,
  type RegradeDecision,
} from '../services/examCorrectionService';

interface ContentReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContentReportsModal: React.FC<ContentReportsModalProps> = ({ isOpen, onClose }) => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [corrections, setCorrections] = useState<ExamCorrection[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | ContentReportStatus>('pending');
  const [drafts, setDrafts] = useState<Record<string, { status: ContentReportStatus; ownerNote: string; duplicateOf: string }>>({});
  const [correctionDrafts, setCorrectionDrafts] = useState<Record<string, Exclude<RegradeDecision, 'pending'>>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedCorrectionId, setSavedCorrectionId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [loaded, loadedCorrections] = await Promise.all([
        listOwnerContentReports(),
        listExamCorrections().catch((correctionError: unknown) => {
          console.warn('Could not load exam corrections:', correctionError);
          return [] as ExamCorrection[];
        }),
      ]);
      setReports(loaded);
      setCorrections(loadedCorrections);
      setDrafts(Object.fromEntries(loaded.map((report) => [report.id, {
        status: report.status,
        ownerNote: report.ownerNote ?? '',
        duplicateOf: report.duplicateOf ?? '',
      }])));
      setCorrectionDrafts(Object.fromEntries(loadedCorrections.map((correction) => [
        correction.id,
        correction.regradeDecision === 'requested' ? 'requested' : 'not_requested',
      ])));
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
      const result = await updateContentReport(report, {
        status: draft.status,
        ownerNote: draft.ownerNote,
        duplicateOf: draft.duplicateOf || null,
      });
      setSavedId(report.id);
      setNotice(result.notificationSent
        ? 'Đã lưu xử lý và gửi thông báo riêng cho người báo.'
        : 'Đã lưu xử lý, nhưng chưa gửi được thông báo riêng. Kiểm tra schema Supabase rồi thử lưu lại khi cần.');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể cập nhật báo lỗi.');
    }
  };

  const saveCorrectionDecision = async (correction: ExamCorrection) => {
    const decision = correctionDrafts[correction.id] ?? 'not_requested';
    try {
      await updateExamCorrectionDecision(correction, decision);
      setSavedCorrectionId(correction.id);
      setNotice(decision === 'requested'
        ? 'Đã ghi quyết định chấm lại. Người học sẽ được áp dụng khi mở lại lượt làm của đề này.'
        : 'Đã ghi quyết định chỉ áp dụng cho lượt mới; lượt đã nộp giữ nguyên điểm.');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu quyết định chấm lại.');
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
          {notice && <p className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</p>}

          <section aria-label="Sửa lỗi và quyết định chấm lại" className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
            <div>
              <h3 className="text-sm font-extrabold">Sửa lỗi và quyết định chấm lại</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                Mỗi bản sửa đáp án tạo một phiên bản mới. Lượt đã nộp chỉ đổi điểm khi Owner chọn chấm lại; quyết định này không gửi thông báo hàng loạt.
              </p>
            </div>
            {corrections.length === 0 ? (
              <p className="rounded-xl border border-dashed border-indigo-200 bg-white/60 p-4 text-center text-xs text-slate-500 dark:border-indigo-900 dark:bg-slate-900/40">Chưa có bản sửa nội dung nào được ghi nhận.</p>
            ) : corrections.map((correction) => {
              const decision = correctionDrafts[correction.id] ?? 'not_requested';
              return (
                <article key={correction.id} className="space-y-3 rounded-xl border border-indigo-100 bg-white p-4 dark:border-indigo-900 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold">{correction.examTitle} · v{correction.fromVersion} → v{correction.toVersion}</h4>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        {correction.changeType === 'answer_key' ? 'Sửa đáp án' : correction.changeType === 'question_range' ? 'Sửa khoảng câu' : 'Sửa thông tin đề'}
                        {correction.changedQuestions.length ? ` · Câu ${correction.changedQuestions.join(', ')}` : ''}
                        {' '}· {new Date(correction.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{regradeDecisionLabel(correction.regradeDecision)}</span>
                  </div>
                  <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                    Ảnh hưởng ước tính trên cloud: {correction.affectedSubmissionCount ?? 'chưa có số liệu'} bài nộp · {correction.affectedLearnerCount ?? 'chưa có số liệu'} người học · {correction.potentiallyChangedCount ?? 'chưa có số liệu'} bài có thể đổi kết quả ở các câu đã sửa.
                    {typeof correction.impactDetails.earliestSubmissionAt === 'string' && typeof correction.impactDetails.latestSubmissionAt === 'string' && (
                      <> Khoảng bài nộp đã có: {new Date(correction.impactDetails.earliestSubmissionAt).toLocaleDateString('vi-VN')} – {new Date(correction.impactDetails.latestSubmissionAt).toLocaleDateString('vi-VN')}.</>
                    )}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="block space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                      Quyết định của Owner
                      <select value={decision} onChange={(event) => setCorrectionDrafts((current) => ({ ...current, [correction.id]: event.target.value as Exclude<RegradeDecision, 'pending'> }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-800">
                        <option value="not_requested">Chỉ áp dụng cho lượt mới</option>
                        <option value="requested">Chấm lại các lượt đã nộp</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => void saveCorrectionDecision(correction)} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                      {savedCorrectionId === correction.id ? 'Đã lưu quyết định' : 'Lưu quyết định'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

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
