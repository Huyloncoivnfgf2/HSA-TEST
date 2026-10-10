import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BookOpen,
  Check,
  FilePlus2,
  FileText,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { SUBJECT_CONFIGS } from '../types/hsa';
import {
  getPdfExamReadiness,
  isContentTestAttempt,
  parsePdfAnswerKey,
  type PdfExam,
  type PdfExamMode,
  type PdfExamStatus,
  type PdfSubject,
} from '../types/pdfExam';
import {
  deletePdfExam,
  exportApplicationBackup,
  importApplicationBackup,
  loadPdfExams,
  savePdfExam,
  savePdfExams,
} from '../services/indexedDbService';
import { userStorage as localStorage } from '../services/userStorage';
import {
  deleteCloudExam,
  loadCloudExamLibrary,
  saveCloudAnswerKey,
  updateCloudExamMetadata,
  uploadLocalExams,
} from '../services/cloudExamService';

const PDF_FILE_LIMIT = 30 * 1024 * 1024;

interface NewPdfFile {
  file: File;
  subject: PdfSubject;
  title: string;
  questionCount: number;
  pageStart?: number;
  pageEnd?: number;
  startQuestion: number;
  solutionFile?: File;
}

const examStatusLabels: Record<PdfExamStatus, string> = {
  draft: 'Bản nháp',
  verified: 'Đã xác minh',
  approved: 'Đã duyệt',
  archived: 'Đã lưu trữ',
};

interface PdfExamLibraryProps {
  onStart: (exam: PdfExam, mode: PdfExamMode, options?: { isContentTest?: boolean; attemptId?: string }) => void;
  isAdmin: boolean;
}

const subjects: Array<{ id: PdfSubject; label: string }> = [
  { id: 'math', label: 'Định lượng' },
  { id: 'literature', label: 'Định tính' },
  { id: 'science', label: 'Khoa học' },
];

function guessSubject(fileName: string): PdfSubject {
  const name = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (/\b(VAN|NGU VAN|NGON NGU|NGONNGU|DINH TINH)\b/.test(name)) return 'literature';
  if (/\b(LY|HOA|SINH|SU|DIA|KHOA HOC|KHOAHOC)\b/.test(name)) return 'science';
  return 'math';
}

function cleanTitle(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
}

export const PdfExamLibrary: React.FC<PdfExamLibraryProps> = ({ onStart, isAdmin }) => {
  const [exams, setExams] = useState<PdfExam[]>([]);
  const [activeSubject, setActiveSubject] = useState<PdfSubject>('math');
  const [newFiles, setNewFiles] = useState<NewPdfFile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingPageStart, setEditingPageStart] = useState('');
  const [editingPageEnd, setEditingPageEnd] = useState('');
  const [editingStartQuestion, setEditingStartQuestion] = useState('1');
  const [editingStatus, setEditingStatus] = useState<PdfExamStatus>('draft');
  const [answerKeyExam, setAnswerKeyExam] = useState<PdfExam | null>(null);
  const [answerKeyDraft, setAnswerKeyDraft] = useState('');
  const [answerKeyRows, setAnswerKeyRows] = useState<Record<number, string>>({});
  const [modeExam, setModeExam] = useState<PdfExam | null>(null);
  const [contentTest, setContentTest] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({});
  const [showBackupReminder, setShowBackupReminder] = useState(() => {
    const lastBackup = Number(localStorage.getItem('hsa_pdf_backup_reminder_v1') ?? 0);
    return !lastBackup || Date.now() - lastBackup > 7 * 24 * 60 * 60 * 1000;
  });
  const pdfInput = useRef<HTMLInputElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);

  const reloadExams = async () => {
    try {
      setExams(await loadCloudExamLibrary(isAdmin));
      setError(null);
    } catch (loadError) {
      console.error('Could not load cloud exams:', loadError);
      setExams(await loadPdfExams());
      setError('Không thể tải thư viện cloud; đang hiển thị đề đã lưu trên thiết bị.');
    }
  };

  useEffect(() => {
    let mounted = true;
    void reloadExams().catch((loadError: unknown) => {
      console.error('Could not load the PDF exam library:', loadError);
      if (mounted) setError('Không thể đọc thư viện PDF cloud.');
    });
    return () => { mounted = false; };
  }, [isAdmin]);

  const visibleExams = useMemo(
    () => exams
      .filter((exam) => exam.subject === activeSubject)
      .filter((exam) => isAdmin || (exam.status ?? 'approved') === 'approved')
      .sort((a, b) => b.createdAt - a.createdAt),
    [activeSubject, exams, isAdmin]
  );

  const addSelectedFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    const tooLarge = files.find((file) => file.size > PDF_FILE_LIMIT);
    const invalid = files.find((file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
    if (tooLarge) {
      setError(`Tệp "${tooLarge.name}" vượt quá giới hạn 30 MB.`);
      return;
    }
    if (invalid) {
      setError(`"${invalid.name}" không phải tệp PDF.`);
      return;
    }
    setError(null);
    setNewFiles((current) => [
      ...current,
      ...files.map((file) => ({
        file,
        subject: guessSubject(file.name),
        title: cleanTitle(file.name),
        questionCount: 50,
        startQuestion: 1,
      })),
    ]);
  };

  const handleAnswerKeyPaste = (text: string, exam: PdfExam) => {
    setAnswerKeyDraft(text);
    const result = parsePdfAnswerKey(text, exam.questionCount, exam.startQuestion ?? 1);
    setAnswerKeyRows(result.answers);
  };

  const saveAnswerKey = async () => {
    if (!answerKeyExam) return;
    const result = parsePdfAnswerKey(answerKeyDraft, answerKeyExam.questionCount, answerKeyExam.startQuestion ?? 1);
    if (result.duplicates.length > 0) {
      setError(`Câu bị nhập trùng: ${result.duplicates.join(', ')}. Sửa chuỗi hoặc chỉnh đáp án trong bảng xem trước.`);
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const updatedExam = { ...answerKeyExam, answerKey: answerKeyRows };
      await savePdfExam(updatedExam);
      if (updatedExam.updatedAt) {
        await saveCloudAnswerKey(updatedExam, { previousAnswerKey: answerKeyExam.answerKey });
      } else {
        await uploadLocalExams([updatedExam], () => undefined);
      }
      await reloadExams();
      setAnswerKeyExam(null);
      setAnswerKeyDraft('');
      setAnswerKeyRows({});
    } catch (saveError) {
      console.error('Could not save the PDF answer key:', saveError);
      setError('Không thể lưu đáp án chuẩn.');
    } finally {
      setIsBusy(false);
    }
  };

  const updateNewFile = (index: number, update: Partial<NewPdfFile>) => {
    setNewFiles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
  };

  const saveNewFiles = async () => {
    const invalidFile = newFiles.find((item) => item.file.size > PDF_FILE_LIMIT);
    const invalidSolution = newFiles.find((item) => item.solutionFile && (
      item.solutionFile.size > PDF_FILE_LIMIT ||
      !(item.solutionFile.type.startsWith('image/') || item.solutionFile.type === 'application/pdf' ||
        /\.(pdf|png|jpe?g|webp|gif)$/i.test(item.solutionFile.name))
    ));
    if (invalidFile) return setError(`Tệp "${invalidFile.file.name}" vượt quá giới hạn 30 MB.`);
    if (invalidSolution) return setError('Lời giải phải là PDF hoặc ảnh và không vượt quá 30 MB.');
    if (newFiles.some((item) => !item.title.trim() || !Number.isSafeInteger(item.questionCount) || item.questionCount < 1 || item.questionCount > 5000)) {
      return setError('Tên đề không được để trống; số câu phải từ 1 đến 5000.');
    }
    if (newFiles.some((item) => !Number.isSafeInteger(item.startQuestion) || item.startQuestion < 1)) {
      return setError('Số câu bắt đầu phải từ 1 trở lên.');
    }
    if (newFiles.some((item) => (item.pageStart !== undefined && item.pageStart < 1) || (item.pageEnd !== undefined && item.pageEnd < (item.pageStart ?? 1)))) {
      return setError('Khoảng trang chưa hợp lệ: trang kết thúc phải lớn hơn hoặc bằng trang bắt đầu.');
    }

    setIsBusy(true);
    setError(null);
    try {
      const created: PdfExam[] = newFiles.map((item) => ({
        id: crypto.randomUUID(),
        title: item.title.trim(),
        subject: item.subject,
        createdAt: Date.now(),
        questionCount: item.questionCount,
        pdfFileName: item.file.name,
        originalFileName: item.file.name,
        pageStart: item.pageStart,
        pageEnd: item.pageEnd,
        startQuestion: item.startQuestion,
        status: 'draft',
        version: 1,
        pdfBlob: item.file,
        solutionFileName: item.solutionFile?.name,
        solutionBlob: item.solutionFile,
        answerKey: {},
        attempts: [],
        scrollLocked: false,
      }));
      await savePdfExams(created);
      setNewFiles([]);
      setIsAdding(false);
      if (pdfInput.current) pdfInput.current.value = '';
      try {
        await uploadLocalExams(created, (examId, state, message) => {
          setUploadProgress((current) => ({
            ...current,
            [examId]: state === 'done' ? 'Đã tải lên' : state === 'uploading' ? 'Đang tải…' : `Lỗi: ${message ?? 'không xác định'}`,
          }));
        });
      } catch (uploadError) {
        console.error('Could not publish newly added PDF exams:', uploadError);
        setError('Đề đã được lưu trên máy nhưng chưa tải lên cloud. Hãy thử lại bằng nút đẩy đề.');
      }
      await reloadExams();
    } catch (saveError) {
      console.error('Could not save PDF exams:', saveError);
      setError('Không thể lưu đề PDF. Hãy kiểm tra dung lượng lưu trữ khả dụng rồi thử lại.');
    } finally {
      setIsBusy(false);
    }
  };

  const beginEdit = (exam: PdfExam) => {
    setEditingExamId(exam.id);
    setEditingTitle(exam.title);
    setEditingPageStart(exam.pageStart ? String(exam.pageStart) : '');
    setEditingPageEnd(exam.pageEnd ? String(exam.pageEnd) : '');
    setEditingStartQuestion(String(exam.startQuestion ?? 1));
    setEditingStatus(exam.status ?? 'approved');
    setError(null);
  };

  const saveEdit = async (exam: PdfExam) => {
    if (!editingTitle.trim()) return setError('Tên đề không được để trống.');
    const pageStart = editingPageStart ? Number(editingPageStart) : undefined;
    const pageEnd = editingPageEnd ? Number(editingPageEnd) : undefined;
    const startQuestion = Number(editingStartQuestion);
    if ((pageStart !== undefined && (!Number.isSafeInteger(pageStart) || pageStart < 1)) ||
      (pageEnd !== undefined && (!Number.isSafeInteger(pageEnd) || pageEnd < (pageStart ?? 1))) ||
      !Number.isSafeInteger(startQuestion) || startQuestion < 1) {
      return setError('Khoảng trang hoặc số câu bắt đầu chưa hợp lệ.');
    }
    setIsBusy(true);
    try {
      const updated: PdfExam = {
        ...exam,
        title: editingTitle.trim(),
        pageStart,
        pageEnd,
        startQuestion,
        status: editingStatus,
      };
      await savePdfExam(updated);
      if (updated.updatedAt) await updateCloudExamMetadata(updated, exam);
      await reloadExams();
      setEditingExamId(null);
      setError(null);
    } catch (saveError) {
      console.error('Could not update the PDF exam:', saveError);
      setError('Không thể cập nhật đề PDF.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (exam: PdfExam) => {
    const message = exam.updatedAt
      ? `Lưu trữ đề "${exam.title}"? Đề sẽ ẩn khỏi thư viện; bài nộp trên cloud không bị xóa dây chuyền.`
      : `Xóa đề "${exam.title}" khỏi thiết bị này?`;
    if (!window.confirm(message)) return;
    try {
      if (exam.updatedAt) await deleteCloudExam(exam.id);
      else await deletePdfExam(exam.id);
      await reloadExams();
    } catch (deleteError) {
      console.error('Could not delete the PDF exam:', deleteError);
      setError('Không thể xóa đề PDF.');
    }
  };

  const handleUploadLocalExams = async () => {
    setIsBusy(true);
    setUploadProgress({});
    setError(null);
    try {
      const localExams = await loadPdfExams();
      const pendingExams = localExams.filter((exam) => !exam.updatedAt);
      await uploadLocalExams(pendingExams, (examId, state, message) => {
        setUploadProgress((current) => ({
          ...current,
          [examId]: state === 'done' ? 'Đã tải lên' : state === 'uploading' ? 'Đang tải…' : `Lỗi: ${message ?? 'không xác định'}`,
        }));
      });
      await reloadExams();
    } catch (uploadError) {
      console.error('Could not upload local PDF exams:', uploadError);
      setError('Không thể đẩy đề lên cloud.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleBackup = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const backup = await exportApplicationBackup();
      const url = URL.createObjectURL(backup);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `hsa-sao-luu-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      localStorage.setItem('hsa_pdf_backup_reminder_v1', String(Date.now()));
      setShowBackupReminder(false);
    } catch (backupError) {
      console.error('Could not create the application backup:', backupError);
      setError('Không thể tạo tệp sao lưu. Vui lòng thử lại.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRestore = async (file: File | undefined) => {
    if (!file) return;
    if (!window.confirm('Khôi phục sẽ thay thế dữ liệu hiện có trên thiết bị này. Bạn có muốn tiếp tục?')) {
      if (backupInput.current) backupInput.current.value = '';
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      await importApplicationBackup(file);
      await reloadExams();
      window.alert('Đã khôi phục dữ liệu và các tệp PDF.');
    } catch (restoreError) {
      console.error('Could not restore the application backup:', restoreError);
      setError(restoreError instanceof Error ? restoreError.message : 'Không thể khôi phục bản sao lưu.');
    } finally {
      setIsBusy(false);
      if (backupInput.current) backupInput.current.value = '';
    }
  };

  return (
    <section className="space-y-5" aria-label="Thư viện đề PDF">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <FileText className="h-5 w-5" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Thư viện đề PDF</span>
          </div>
          <h2 className="text-2xl font-extrabold">Chọn phần thi</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Đề được lưu cục bộ và tải từ thư viện cloud.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleBackup} disabled={isBusy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
            <Archive className="h-4 w-4" /> Sao lưu
          </button>
          <button type="button" onClick={() => backupInput.current?.click()} disabled={isBusy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
            <RotateCcw className="h-4 w-4" /> Khôi phục
          </button>
          <input ref={backupInput} type="file" accept=".json,application/json" className="hidden" onChange={(event) => void handleRestore(event.target.files?.[0])} />
          {isAdmin && <button type="button" onClick={() => void handleUploadLocalExams()} disabled={isBusy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><Upload className="h-4 w-4" /> Đẩy đề trên máy này lên cloud</button>}
        </div>
      </div>

      {showBackupReminder && (
        <div className="flex flex-col justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 sm:flex-row sm:items-center">
          <span>Nhắc bạn sao lưu định kỳ để giữ an toàn đề PDF và dữ liệu làm bài trên thiết bị.</span>
          <button type="button" onClick={() => void handleBackup()} disabled={isBusy} className="shrink-0 font-extrabold underline">Sao lưu ngay</button>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {subjects.map(({ id, label }) => {
          const selected = activeSubject === id;
          const config = SUBJECT_CONFIGS[id];
          const count = exams.filter((exam) => exam.subject === id).length;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSubject(id)}
              className={`rounded-2xl border p-4 text-left transition ${selected ? `${config.bgColor} ${config.borderColor} shadow-sm` : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'}`}
            >
              <span className={`block text-base font-extrabold ${config.color}`}>{label}</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{count} đề PDF</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{subjects.find((subject) => subject.id === activeSubject)?.label}</h3>
        {isAdmin && <button
          type="button"
          onClick={() => { setIsAdding(!isAdding); setError(null); }}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
        >
          {isAdding ? <X className="h-4 w-4" /> : <FilePlus2 className="h-4 w-4" />}
          {isAdding ? 'Đóng' : 'Thêm đề'}
        </button>}
      </div>

      {Object.entries(uploadProgress).length > 0 && (
        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900">
          {Object.entries(uploadProgress).map(([examId, progress]) => (
            <p key={examId}>{exams.find((exam) => exam.id === examId)?.title ?? examId}: {progress}</p>
          ))}
        </div>
      )}

      {isAdmin && isAdding && (
        <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div>
            <input
              ref={pdfInput}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(event) => { addSelectedFiles(event.target.files); event.target.value = ''; }}
            />
            <button type="button" onClick={() => pdfInput.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-white px-4 py-5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300">
              <Upload className="h-5 w-5" /> Chọn một hoặc nhiều file PDF (tối đa 30 MB/file)
            </button>
          </div>
          {newFiles.map((item, index) => (
            <article key={`${item.file.name}-${index}`} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{item.file.name}</p>
                  <p className="text-xs text-slate-500">{(item.file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button type="button" aria-label="Bỏ tệp PDF" onClick={() => setNewFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Phần thi
                  <div className="grid grid-cols-3 gap-1">
                    {subjects.map((subject) => (
                      <button key={subject.id} type="button" onClick={() => updateNewFile(index, { subject: subject.id })} className={`rounded-lg border px-2 py-2 text-xs font-bold ${item.subject === subject.id ? 'border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700'}`}>{subject.label}</button>
                    ))}
                  </div>
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Tên đề
                  <input value={item.title} onChange={(event) => updateNewFile(index, { title: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-800" />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Số câu
                  <input type="number" min={1} max={5000} value={item.questionCount} onChange={(event) => updateNewFile(index, { questionCount: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Trang bắt đầu trong PDF (đề gộp)
                  <input type="number" min={1} value={item.pageStart ?? ''} onChange={(event) => updateNewFile(index, { pageStart: event.target.value ? Number(event.target.value) : undefined })} placeholder="Để trống nếu đề riêng" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Trang kết thúc trong PDF (đề gộp)
                  <input type="number" min={1} value={item.pageEnd ?? ''} onChange={(event) => updateNewFile(index, { pageEnd: event.target.value ? Number(event.target.value) : undefined })} placeholder="Để trống nếu đề riêng" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Số câu bắt đầu
                  <input type="number" min={1} value={item.startQuestion} onChange={(event) => updateNewFile(index, { startQuestion: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Lời giải (PDF hoặc ảnh, không bắt buộc)
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(event) => updateNewFile(index, { solutionFile: event.target.files?.[0] })}
                    className="block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1.5 dark:file:bg-slate-800"
                  />
                  {item.solutionFile && <span className="block truncate text-emerald-700 dark:text-emerald-400">{item.solutionFile.name}</span>}
                </label>
              </div>
            </article>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Gợi ý phân loại: Toán/Định lượng, Văn/Ngôn ngữ/Định tính, hoặc Lý/Hóa/Sinh/Sử/Địa/Khoa học.</p>
            <button type="button" onClick={() => void saveNewFiles()} disabled={isBusy || newFiles.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              <Check className="h-4 w-4" /> Lưu {newFiles.length ? `${newFiles.length} đề` : 'đề'}
            </button>
          </div>
        </div>
      )}

      {visibleExams.length === 0 && !isAdding ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <FileText className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Chưa có đề PDF ở phần này</p>
          <p className="mt-1 text-xs text-slate-500">Thêm đề để lưu trữ và làm bài ngay trên thiết bị.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleExams.map((exam) => (
            <article key={exam.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {editingExamId === exam.id ? (
                <div className="space-y-3">
                  <label className="block space-y-1 text-xs font-semibold">Tên đề
                    <input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <label className="block space-y-1 text-xs font-semibold">Trang bắt đầu
                      <input type="number" min={1} value={editingPageStart} onChange={(event) => setEditingPageStart(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold">Trang kết thúc
                      <input type="number" min={1} value={editingPageEnd} onChange={(event) => setEditingPageEnd(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold">Câu bắt đầu
                      <input type="number" min={1} value={editingStartQuestion} onChange={(event) => setEditingStartQuestion(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold">Trạng thái đề
                      <select value={editingStatus} onChange={(event) => setEditingStatus(event.target.value as PdfExamStatus)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                        <option value="draft">Bản nháp</option>
                        <option value="verified">Đã xác minh</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="archived">Đã lưu trữ</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void saveEdit(exam)} disabled={isBusy} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Lưu thay đổi</button>
                    <button type="button" onClick={() => setEditingExamId(null)} className="rounded-lg px-3 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Hủy</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="min-w-0">
                    <h4 className="truncate text-base font-bold">{exam.title}</h4>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>Thêm ngày {new Date(exam.createdAt).toLocaleDateString('vi-VN')}</span>
                      <span>{exam.questionCount} câu</span>
                      <span>{examStatusLabels[exam.status ?? 'approved']}</span>
                      {isAdmin && <span>Đáp án: {getPdfExamReadiness(exam).answeredCount}/{exam.questionCount}</span>}
                      {exam.pageStart && <span>Trang {exam.pageStart}{exam.pageEnd ? `–${exam.pageEnd}` : ''}</span>}
                      {(exam.startQuestion ?? 1) > 1 && <span>Từ câu {exam.startQuestion}</span>}
                      {exam.version && <span>v{exam.version}</span>}
                      <span>Điểm cao nhất: {exam.bestScore === undefined ? '—' : `${exam.bestScore}/${exam.questionCount}`}</span>
                      {isAdmin && (() => {
                        const testAttempts = (exam.attempts ?? []).filter(isContentTestAttempt);
                        if (!testAttempts.length) return null;
                        const evaluated = testAttempts.filter((attempt) => attempt.contentTestEvaluation).length;
                        return <span>Kiểm thử nội dung: {testAttempts.length} lượt · đã đánh giá {evaluated}/{testAttempts.length}</span>;
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => { setContentTest(false); setModeExam(exam); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Play className="h-3.5 w-3.5" /> Làm bài</button>
                    <button type="button" onClick={() => onStart(exam, 'review')} disabled={!exam.attempts?.length} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"><BookOpen className="h-3.5 w-3.5" /> Xem lại</button>
                    {isAdmin && (() => {
                      const latestTestAttempt = [...(exam.attempts ?? [])].filter(isContentTestAttempt).sort((a, b) => b.submittedAt - a.submittedAt)[0];
                      if (!latestTestAttempt) return null;
                      return <button type="button" onClick={() => onStart(exam, 'review', { isContentTest: true, attemptId: latestTestAttempt.id })} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950">Lượt kiểm thử gần nhất</button>;
                    })()}
                    {isAdmin && !exam.attempts?.length && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnswerKeyExam(exam);
                          setAnswerKeyDraft('');
                          setAnswerKeyRows({});
                          setError(null);
                        }}
                        className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
                      >Nhập đáp án đúng</button>
                    )}
                    {isAdmin && <button type="button" aria-label="Đổi tên đề" onClick={() => beginEdit(exam)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>}
                    {isAdmin && <button type="button" aria-label="Xóa đề" onClick={() => void handleDelete(exam)} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {modeExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Chọn chế độ làm bài">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-extrabold">Làm bài: {modeExam.title}</h3><p className="mt-1 text-xs text-slate-500">Đáp án chuẩn chỉ hiện sau khi nộp bài.</p></div>
              <button type="button" onClick={() => setModeExam(null)} aria-label="Đóng" className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            {(() => {
              const readiness = getPdfExamReadiness(modeExam, { requireAnswerKey: isAdmin });
              return readiness.readyForNewAttempt ? (
                <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Đề đã đủ điều kiện cho lượt thi mới.</div>
              ) : (
                <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <p className="font-bold">Chưa đủ điều kiện cho lượt thi mới:</p>
                  <ul className="mt-1 list-disc pl-4">{readiness.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                  {isAdmin && <p className="mt-1">Owner vẫn có thể bật Kiểm thử nội dung để kiểm tra đề.</p>}
                </div>
              );
            })()}
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-slate-600 dark:text-slate-300">Chế độ của lượt này</legend>
              <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs ${!contentTest ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                <input type="radio" name="pdf-attempt-kind" checked={!contentTest} onChange={() => setContentTest(false)} className="mt-0.5" />
                <span><strong>Luyện tập thật</strong> — lượt này tính vào điểm cao nhất, lịch sử, Sổ lỗi và ôn tập FSRS như bình thường.</span>
              </label>
              <label className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${isAdmin && contentTest ? 'border-amber-400 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                <input type="radio" name="pdf-attempt-kind" checked={contentTest} disabled={!isAdmin} onChange={() => setContentTest(true)} className="mt-0.5" />
                <span><strong>Kiểm thử nội dung</strong> — chỉ Owner dùng để kiểm tra đề/đáp án; không tính vào điểm cao nhất, lịch sử, Sổ lỗi hay ôn tập FSRS.{!isAdmin && ' Tài khoản người học không dùng chế độ này.'}</span>
              </label>
            </fieldset>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" disabled={!contentTest && !getPdfExamReadiness(modeExam, { requireAnswerKey: isAdmin }).readyForNewAttempt} onClick={() => { setModeExam(null); onStart(modeExam, 'test', { isContentTest: contentTest }); }} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40">Kiểm tra · {SUBJECT_CONFIGS[modeExam.subject].durationMinutes} phút</button>
              <button type="button" disabled={!contentTest && !getPdfExamReadiness(modeExam, { requireAnswerKey: isAdmin }).readyForNewAttempt} onClick={() => { setModeExam(null); onStart(modeExam, 'study', { isContentTest: contentTest }); }} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800">Ôn tập · không giới hạn giờ</button>
            </div>
          </div>
        </div>
      )}

      {answerKeyExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3" role="dialog" aria-modal="true" aria-label="Nhập đáp án đúng">
          <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold">Nhập đáp án đúng</h3>
                <p className="mt-1 text-xs text-slate-500">{answerKeyExam.title} · chưa nhập sẽ không tính điểm</p>
              </div>
              <button type="button" aria-label="Đóng" onClick={() => setAnswerKeyExam(null)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              <label className="block space-y-1 text-xs font-bold">
                Dán chuỗi đáp án
                <textarea
                  value={answerKeyDraft}
                  onChange={(event) => handleAnswerKeyPaste(event.target.value, answerKeyExam)}
                  rows={4}
                  placeholder={'1.A 2.C 3.12,5\nhoặc 1-A, 2-C'}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              {(() => {
                const diagnostics = parsePdfAnswerKey(answerKeyDraft, answerKeyExam.questionCount, answerKeyExam.startQuestion ?? 1);
                return (
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Đã nhận {Object.keys(answerKeyRows).length}</span>
                    <span className={`rounded-lg px-2 py-1 font-semibold ${diagnostics.missing.length ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>Thiếu: {diagnostics.missing.length ? diagnostics.missing.join(', ') : 'không'}</span>
                    <span className={`rounded-lg px-2 py-1 font-semibold ${diagnostics.duplicates.length ? 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>Trùng: {diagnostics.duplicates.length ? diagnostics.duplicates.join(', ') : 'không'}</span>
                    <span className={`rounded-lg px-2 py-1 font-semibold ${diagnostics.outOfRange.length ? 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>Ngoài phạm vi: {diagnostics.outOfRange.length ? diagnostics.outOfRange.join(', ') : 'không'}</span>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: answerKeyExam.questionCount }, (_, index) => (answerKeyExam.startQuestion ?? 1) + index).map((number) => (
                  <label key={number} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${answerKeyRows[number] ? 'border-emerald-200 dark:border-emerald-900' : 'border-slate-200 dark:border-slate-700'}`}>
                    <span className="w-8 shrink-0 font-bold">Câu {number}</span>
                    <input
                      value={answerKeyRows[number] ?? ''}
                      onChange={(event) => setAnswerKeyRows((current) => ({
                        ...current,
                        [number]: event.target.value.trim(),
                      }))}
                      aria-label={`Đáp án chuẩn câu ${number}`}
                      className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <span className="text-xs text-slate-500">Có thể để trống đáp án của câu chưa có khóa chấm.</span>
              <button type="button" onClick={() => void saveAnswerKey()} disabled={isBusy} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Lưu đáp án</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
