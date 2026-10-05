import React, { useState } from 'react';
import { Question, QuestionEditHistory } from '../types/hsa';
import { MathRenderer } from './MathRenderer';
import {
  X,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  Edit3,
  History,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface QuestionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  onSaveQuestion: (
    updatedQuestion: Question,
    regradeHistory: boolean,
    editRecord?: QuestionEditHistory
  ) => void;
}

export const QuestionEditModal: React.FC<QuestionEditModalProps> = ({
  isOpen,
  onClose,
  question,
  onSaveQuestion,
}) => {
  if (!isOpen || !question) return null;

  const [questionText, setQuestionText] = useState<string>(question.questionText);
  const [options, setOptions] = useState<string[]>([...question.options]);
  const [correctAnswer, setCorrectAnswer] = useState<number | string>(question.correctAnswer);
  const [explanation, setExplanation] = useState<string>(question.explanation || '');
  const [subTopic, setSubTopic] = useState<string>(question.subTopic || '');
  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');
  const [editReason, setEditReason] = useState<string>('');

  const [previewField, setPreviewField] = useState<'text' | 'explanation' | null>(null);

  // History list from question
  const historyList = question.editHistory || [];

  const handleOptionChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleSave = () => {
    const isAnswerChanged = String(correctAnswer) !== String(question.correctAnswer);

    let shouldRegradeHistory = false;
    if (isAnswerChanged) {
      shouldRegradeHistory = window.confirm(
        'Bạn đã thay đổi đáp án đúng của câu hỏi này. Bạn có muốn tự động chấm lại tất cả các bài thi trước đây có câu này để cập nhật điểm và thống kê không?'
      );
    }

    const editRecord: QuestionEditHistory = {
      id: `edit-${Date.now()}`,
      questionId: question.id,
      timestamp: Date.now(),
      oldQuestionText: question.questionText,
      newQuestionText: questionText,
      oldOptions: question.options,
      newOptions: options,
      oldCorrectAnswer: question.correctAnswer,
      newCorrectAnswer: correctAnswer,
      oldExplanation: question.explanation,
      newExplanation: explanation,
      reason: editReason || 'Chỉnh sửa nội dung',
    };

    const updated: Question = {
      ...question,
      questionText,
      options,
      correctAnswer,
      explanation,
      subTopic,
      editHistory: [editRecord, ...(question.editHistory || [])],
      hasWarning: false,
      warningReason: undefined,
    };

    onSaveQuestion(updated, shouldRegradeHistory, editRecord);
    onClose();
  };

  const handleUndoRevision = (rev: QuestionEditHistory) => {
    if (confirm('Bạn có chắc muốn khôi phục về phiên bản này không?')) {
      setQuestionText(rev.oldQuestionText);
      setOptions([...rev.oldOptions]);
      setCorrectAnswer(rev.oldCorrectAnswer);
      setExplanation(rev.oldExplanation || '');
      setActiveTab('edit');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Chỉnh sửa câu hỏi & Lời giải
              </h2>
              <p className="text-xs text-slate-500">
                Hỗ trợ xem trước công thức toán KaTeX • Lưu lịch sử sửa đổi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'edit'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Nội dung câu hỏi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử chỉnh sửa ({historyList.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === 'edit' ? (
            <>
              {/* Question Type Selection */}
              {question.subject !== 'literature' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Dạng câu hỏi:
                  </label>
                  <select
                    value={question.type}
                    onChange={(e) => {
                      // Note: This needs careful handling of state updates for options/correctAnswer
                      // which are outside this simplified edit
                      console.log('Type changed', e.target.value);
                    }}
                    className="w-full p-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="multiple-choice">Trắc nghiệm</option>
                    <option value="fill-in">Điền đáp án</option>
                  </select>
                </div>
              )}
              {question.subject === 'literature' && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  ⚠️ Câu hỏi Định tính (Ngữ văn) bắt buộc là dạng Trắc nghiệm.
                </div>
              )}

              {/* Question Text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nội dung câu hỏi:
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewField((prev) => (prev === 'text' ? null : 'text'))
                    }
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{previewField === 'text' ? 'Ẩn xem trước' : 'Xem trước KaTeX'}</span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 font-sans focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />

                {previewField === 'text' && (
                  <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 animate-in fade-in">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Xem trước hiển thị KaTeX:
                    </span>
                    <MathRenderer content={questionText} />
                  </div>
                )}
              </div>

              {/* Options */}
              {question.type === 'multiple-choice' ? (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Các phương án & Chọn đáp án đúng:
                  </label>

                  <div className="space-y-2.5">
                    {options.map((opt, optIdx) => {
                      const isCorrect = Number(correctAnswer) === optIdx;
                      const label = ['A', 'B', 'C', 'D'][optIdx] || optIdx;

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-2xl border flex items-center gap-3 transition ${
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setCorrectAnswer(optIdx)}
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition ${
                              isCorrect
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                            title="Chọn làm đáp án đúng"
                          >
                            {label}
                          </button>

                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                            className="flex-1 p-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-slate-100 focus:outline-hidden"
                            placeholder={`Nội dung phương án ${label}...`}
                          />

                          {isCorrect && (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                              Đáp án đúng
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Đáp án đúng (Điền khuyết / Số):
                  </label>
                  <input
                    type="text"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    placeholder="Nhập giá trị đáp án đúng..."
                  />
                </div>
              )}

              {/* Explanation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Lời giải chi tiết:
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewField((prev) => (prev === 'explanation' ? null : 'explanation'))
                    }
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{previewField === 'explanation' ? 'Ẩn xem trước' : 'Xem trước KaTeX'}</span>
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Nhập phương pháp và lời giải chi tiết..."
                  className="w-full p-3 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 font-sans focus:outline-hidden"
                />

                {previewField === 'explanation' && (
                  <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    <MathRenderer content={explanation || '(Chưa có lời giải)'} />
                  </div>
                )}
              </div>

              {/* Reason for edit note */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">
                  Lý do chỉnh sửa (lưu vào lịch sử):
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ví dụ: Sửa lỗi chính tả phương án C, cập nhật đáp án đúng..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>
            </>
          ) : (
            /* History Tab */
            <div className="space-y-4">
              {historyList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Câu hỏi này chưa có lần chỉnh sửa nào trước đó.
                </div>
              ) : (
                historyList.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {new Date(rev.timestamp).toLocaleString('vi-VN')}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndoRevision(rev)}
                        className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hoàn tác về bản này</span>
                      </button>
                    </div>

                    {rev.reason && (
                      <p className="text-xs text-slate-500 italic">Ghi chú: {rev.reason}</p>
                    )}

                    <div className="text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <strong>Nội dung trước khi sửa:</strong>
                      <div className="mt-1 line-clamp-2">{rev.oldQuestionText}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-[11px] text-slate-400">
            Chỉ chỉnh sửa khi bài thi đã nộp, không can thiệp trong lúc đang làm bài.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
