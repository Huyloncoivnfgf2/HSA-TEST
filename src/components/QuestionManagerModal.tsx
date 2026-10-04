import React, { useState } from 'react';
import { Question, SubjectType, SUBJECT_CONFIGS } from '../types/hsa';
import { MathRenderer } from './MathRenderer';
import {
  X,
  Search,
  Filter,
  Trash2,
  Edit3,
  Plus,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface QuestionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onUpdateQuestion: (question: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onResetDefault: () => void;
}

export const QuestionManagerModal: React.FC<QuestionManagerModalProps> = ({
  isOpen,
  onClose,
  questions,
  onUpdateQuestion,
  onDeleteQuestion,
  onResetDefault,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  if (!isOpen) return null;

  const filteredQuestions = questions.filter((q) => {
    const matchesSubject = selectedSubject === 'all' || q.subject === selectedSubject;
    const matchesSearch =
      !searchQuery ||
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.subTopic && q.subTopic.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

  const handleSaveEdit = () => {
    if (!editingQuestion) return;
    onUpdateQuestion(editingQuestion);
    setEditingQuestion(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Quản lý ngân hàng câu hỏi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tổng cộng {questions.length} câu hỏi • Hiển thị {filteredQuestions.length} câu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            {(['all', 'math', 'literature', 'science'] as const).map((sub) => {
              const label =
                sub === 'all'
                  ? 'Tất cả'
                  : sub === 'math'
                  ? 'Toán học'
                  : sub === 'literature'
                  ? 'Ngữ văn'
                  : 'Khoa học';
              const count =
                sub === 'all' ? questions.length : questions.filter((q) => q.subject === sub).length;
              const isSelected = selectedSubject === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm nội dung, công thức..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition shrink-0"
              title="Khôi phục lại đề mẫu ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Không tìm thấy câu hỏi phù hợp</p>
            </div>
          ) : (
            filteredQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {SUBJECT_CONFIGS[q.subject].shortName}
                    </span>
                    {q.subTopic && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        • {q.subTopic}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingQuestion({ ...q })}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Chỉnh sửa câu hỏi"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Xóa câu hỏi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                  <MathRenderer content={q.questionText} />
                </div>

                {/* Options */}
                {q.type === 'multiple-choice' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = Number(q.correctAnswer) === optIdx;
                      const label = ['A', 'B', 'C', 'D'][optIdx] || optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                              : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {label}
                          </span>
                          <div className="flex-1 pt-0.5">
                            <MathRenderer content={opt} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Lời giải:</span>
                    <MathRenderer content={q.explanation} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Sửa câu hỏi #{editingQuestion.id}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">Chủ đề:</label>
                <input
                  type="text"
                  value={editingQuestion.subTopic || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, subTopic: e.target.value })
                  }
                  className="w-full p-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Nội dung câu hỏi (chứa công thức $LaTeX$):
                </label>
                <textarea
                  rows={4}
                  value={editingQuestion.questionText}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                  }
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent mt-1 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Các phương án:</label>
                {editingQuestion.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="edit-correct"
                      checked={Number(editingQuestion.correctAnswer) === i}
                      onChange={() =>
                        setEditingQuestion({ ...editingQuestion, correctAnswer: i })
                      }
                    />
                    <span className="text-xs font-bold text-slate-400">
                      {['A', 'B', 'C', 'D'][i]}.
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...editingQuestion.options];
                        newOpts[i] = e.target.value;
                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                      }}
                      className="flex-1 p-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Lời giải chi tiết:</label>
                <textarea
                  rows={3}
                  value={editingQuestion.explanation || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                  }
                  className="w-full p-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent mt-1 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deletingId}
        title="Xóa câu hỏi?"
        message="Hành động này sẽ xóa vĩnh viễn câu hỏi khỏi ngân hàng câu hỏi trên thiết bị này."
        type="danger"
        confirmText="Xác nhận xóa"
        onConfirm={() => {
          if (deletingId) {
            onDeleteQuestion(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />

      {/* Reset Confirmation */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title="Khôi phục câu hỏi mặc định?"
        message="Ngân hàng câu hỏi sẽ được thiết lập lại về bộ câu hỏi mẫu ban đầu chuẩn HSA ĐHQGHN."
        type="warning"
        confirmText="Khôi phục"
        onConfirm={() => {
          onResetDefault();
          setIsResetConfirmOpen(false);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
