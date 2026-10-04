import React, { useState } from 'react';
import { ExamSet, Question, SubjectType, SUBJECT_CONFIGS } from '../types/hsa';
import { MathRenderer } from './MathRenderer';
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Edit2,
  Trash2,
  ShieldCheck,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';

interface ExamSetStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  examSet: ExamSet | null;
  questions: Question[];
  onStartExam: (examSet: ExamSet, mode: 'full-hsa' | 'single-subject', subject?: SubjectType) => void;
  onRenameExamSet: (setId: string, newTitle: string) => void;
  onDeleteExamSet: (setId: string) => void;
}

export const ExamSetStatusModal: React.FC<ExamSetStatusModalProps> = ({
  isOpen,
  onClose,
  examSet,
  questions,
  onStartExam,
  onRenameExamSet,
  onDeleteExamSet,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleInput, setTitleInput] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'warning' | 'ok'>('all');

  if (!isOpen || !examSet) return null;

  const setQuestions = questions.filter(
    (q) => q.examSetId === examSet.id || examSet.questionIds.includes(q.id)
  );

  const mathCount = setQuestions.filter((q) => q.subject === 'math').length;
  const litCount = setQuestions.filter((q) => q.subject === 'literature').length;
  const sciCount = setQuestions.filter((q) => q.subject === 'science').length;

  // Question validation detector
  const analyzedQuestions = setQuestions.map((q, idx) => {
    const issues: string[] = [];

    // 1. Missing options
    if (q.type === 'multiple-choice' && (!q.options || q.options.length < 4)) {
      issues.push(`Thiếu phương án (chỉ có ${q.options ? q.options.length : 0}/4)`);
    }

    // 2. Missing answer
    if (
      q.correctAnswer === undefined ||
      q.correctAnswer === null ||
      q.correctAnswer === '' ||
      (q.type === 'multiple-choice' && Number(q.correctAnswer) < 0)
    ) {
      issues.push('Chưa có đáp án đúng');
    }

    // 3. Formula syntax checks (odd number of $)
    const text = (q.questionText || '') + (q.options ? q.options.join(' ') : '');
    const dollarCount = (text.match(/\$/g) || []).length;
    if (dollarCount % 2 !== 0) {
      issues.push('Công thức KaTeX có thể sai (chưa đóng ngoặc $) ');
    }

    // 4. Warning from AI parser
    if (q.hasWarning && q.warningReason && !issues.includes(q.warningReason)) {
      issues.push(q.warningReason);
    }

    const hasIssues = issues.length > 0;

    return {
      question: q,
      index: idx + 1,
      hasIssues,
      issues,
    };
  });

  const warningCount = analyzedQuestions.filter((a) => a.hasIssues).length;
  const okCount = analyzedQuestions.length - warningCount;

  const filteredQuestions = analyzedQuestions.filter((a) => {
    if (statusFilter === 'warning') return a.hasIssues;
    if (statusFilter === 'ok') return !a.hasIssues;
    return true;
  });

  const handleSaveTitle = () => {
    if (titleInput.trim()) {
      onRenameExamSet(examSet.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      className="px-2.5 py-1 text-base font-bold rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTitle}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                    >
                      Lưu
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {examSet.title}
                    </h2>
                    <button
                      onClick={() => {
                        setTitleInput(examSet.title);
                        setIsEditingTitle(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                      title="Đổi tên bộ đề"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Tình trạng bộ đề • Kiểm tra tính toàn vẹn câu hỏi trước khi thi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm(`Bạn có chắc chắn muốn xoá bộ đề "${examSet.title}"?`)) {
                  onDeleteExamSet(examSet.id);
                  onClose();
                }
              }}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
              title="Xoá bộ đề này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security / Confidentiality Notice */}
        <div className="px-6 py-2.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              <strong>Bảo mật đề thi:</strong> Đáp án đúng và lời giải được ẩn hoàn toàn trước khi nộp bài để đảm bảo tính khách quan.
            </span>
          </div>
          <span className="font-extrabold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300">
            HSA Exam Mode
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500">Tổng số câu hỏi</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {setQuestions.length} câu
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Toán: {mathCount} • Văn: {litCount} • KHTN: {sciCount}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <div className="text-xs text-emerald-700 dark:text-emerald-300">Trạng thái ổn định</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {okCount} câu
            </div>
            <div className="text-[11px] text-emerald-600/70 mt-0.5">Sẵn sàng đưa vào bài thi</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
            <div className="text-xs text-amber-700 dark:text-amber-300">Cảnh báo / Cần xem xét</div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {warningCount} câu
            </div>
            <div className="text-[11px] text-amber-600/70 mt-0.5">Thiếu lựa chọn hoặc cú pháp</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 flex flex-col justify-between">
            <div className="text-xs text-purple-700 dark:text-purple-300">Làm bài ngay</div>
            <button
              onClick={() => {
                onStartExam(examSet, 'full-hsa');
                onClose();
              }}
              className="mt-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Bắt đầu thi</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                statusFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Tất cả ({analyzedQuestions.length})
            </button>
            <button
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                statusFilter === 'warning'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
              }`}
            >
              Có vấn đề ({warningCount})
            </button>
            <button
              onClick={() => setStatusFilter('ok')}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                statusFilter === 'ok'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              Ổn định ({okCount})
            </button>
          </div>
        </div>

        {/* Question Status List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredQuestions.map(({ question: q, index, hasIssues, issues }) => (
            <div
              key={q.id}
              className={`p-4 rounded-2xl border transition-all space-y-2 bg-white dark:bg-slate-900 ${
                hasIssues
                  ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800">
                    Câu #{index}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {SUBJECT_CONFIGS[q.subject].shortName}
                  </span>
                  {q.subTopic && (
                    <span className="text-xs text-slate-400">• {q.subTopic}</span>
                  )}
                  {q.groupId && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Cụm câu
                    </span>
                  )}
                </div>

                <div>
                  {hasIssues ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-900/40">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Cảnh báo: {issues.join('; ')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/40">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ổn định
                    </span>
                  )}
                </div>
              </div>

              {/* Group Context if applicable */}
              {q.groupContent && (
                <div className="p-3 rounded-xl bg-purple-500/5 text-xs text-slate-600 dark:text-slate-300 border border-purple-500/15">
                  <span className="font-bold text-purple-600 dark:text-purple-400 block mb-1">
                    {q.groupTitle || 'Đoạn trích dẫn / Dữ liệu chung'}:
                  </span>
                  <MathRenderer content={q.groupContent} />
                </div>
              )}

              {/* Question Text */}
              <div className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                <MathRenderer content={q.questionText} />
              </div>

              {/* Choices (Notice: NO ANSWERS SHOWN HERE - STRICTLY PROTECTED BEFORE EXAM) */}
              {q.type === 'multiple-choice' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-500">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20"
                    >
                      <span className="font-bold mr-1">
                        {['A', 'B', 'C', 'D'][optIdx] || optIdx}:
                      </span>
                      <MathRenderer content={opt} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-xs text-slate-500">
            Bạn có thể bắt đầu thi toàn bộ 3 phần hoặc chọn thi từng môn riêng biệt.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                onStartExam(examSet, 'full-hsa');
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Vào thi bộ đề này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
