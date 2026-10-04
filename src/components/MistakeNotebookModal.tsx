import React, { useState } from 'react';
import { Question, SubjectType, SUBJECT_CONFIGS } from '../types/hsa';
import { MistakeEntry } from '../types/analytics';
import { MathRenderer } from './MathRenderer';
import {
  X,
  BookX,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { removeMistakeManually } from '../services/analyticsService';

interface MistakeNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  mistakes: MistakeEntry[];
  questions: Question[];
  onStartMistakePractice: (mistakeQuestions: Question[]) => void;
  onRefreshMistakes: () => void;
}

export const MistakeNotebookModal: React.FC<MistakeNotebookModalProps> = ({
  isOpen,
  onClose,
  mistakes,
  questions,
  onStartMistakePractice,
  onRefreshMistakes,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | 'all'>('all');

  if (!isOpen) return null;

  // Map mistake entries to actual question objects
  const mistakeQuestionMap = new Map(questions.map((q) => [q.id, q]));

  const enrichedMistakes = mistakes
    .map((m) => ({
      entry: m,
      question: mistakeQuestionMap.get(m.questionId),
    }))
    .filter((item): item is { entry: MistakeEntry; question: Question } => item.question !== undefined);

  const filtered = enrichedMistakes.filter(
    (item) => selectedSubject === 'all' || item.question.subject === selectedSubject
  );

  const handleStartPractice = () => {
    const listToPractice = filtered.map((item) => item.question);
    if (listToPractice.length === 0) return;
    onStartMistakePractice(listToPractice);
    onClose();
  };

  const handleRemoveOne = (qId: string) => {
    removeMistakeManually(qId);
    onRefreshMistakes();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <BookX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Sổ lỗi sai ({mistakes.length} câu)
              </h2>
              <p className="text-xs text-slate-500">
                Tự động gom câu làm sai • Tự gỡ khỏi sổ khi làm đúng 2 lần liên tiếp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar & Subject Tabs */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'math', 'literature', 'science'] as const).map((sub) => {
              const label =
                sub === 'all'
                  ? 'Tất cả'
                  : sub === 'math'
                  ? 'Toán'
                  : sub === 'literature'
                  ? 'Ngữ văn'
                  : 'Khoa học';
              const count =
                sub === 'all'
                  ? enrichedMistakes.length
                  : enrichedMistakes.filter((m) => m.question.subject === sub).length;

              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    selectedSubject === sub
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {filtered.length > 0 && (
            <button
              type="button"
              onClick={handleStartPractice}
              className="flex items-center gap-2 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Ôn lại {filtered.length} câu này ngay</span>
            </button>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-70" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Sổ lỗi sai đang trống!
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Khi bạn làm sai câu hỏi trong chế độ kiểm tra hoặc ôn tập, câu hỏi sẽ tự động được lưu vào đây để bạn rèn luyện lại.
              </p>
            </div>
          ) : (
            filtered.map(({ entry, question }, idx) => (
              <div
                key={entry.questionId}
                className="p-5 rounded-2xl border border-rose-200 dark:border-rose-950/60 bg-white dark:bg-slate-900 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      {SUBJECT_CONFIGS[question.subject].shortName}
                    </span>
                    {question.subTopic && (
                      <span className="text-xs text-slate-500">• {question.subTopic}</span>
                    )}

                    {/* Streak badge */}
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      Đúng liên tiếp: {entry.correctStreak}/2 lần
                    </span>

                    {entry.lastErrorType && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        {entry.lastErrorType}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveOne(entry.questionId)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    title="Gỡ khỏi sổ lỗi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Question Text */}
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                  <MathRenderer content={question.questionText} />
                </div>

                {/* Options */}
                {question.type === 'multiple-choice' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {question.options.map((opt, optIdx) => {
                      const isCorrect = Number(question.correctAnswer) === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-xl border text-xs flex items-start gap-2 ${
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          >
                            {['A', 'B', 'C', 'D'][optIdx] || optIdx}
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
                {question.explanation && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Lời giải:</span>
                    <MathRenderer content={question.explanation} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-xs text-slate-400">
            Mỗi lần bạn ôn và trả lời đúng 2 lần liên tiếp, câu hỏi sẽ tự biến mất khỏi sổ lỗi.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
