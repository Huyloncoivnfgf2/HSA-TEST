import React, { useState, useRef } from 'react';
import {
  SubjectType,
  ScienceSubSubject,
  DifficultyLevel,
  Question,
  ExamSet,
  SUBJECT_CONFIGS,
  STANDARD_TOPICS,
} from '../types/hsa';
import {
  parseQuestionsWithAI,
  parseAnswerKeyWithAI,
  fileToBase64,
  fileToText,
  FileData,
  AnswerKeyEntry,
} from '../services/geminiClient';
import { MathRenderer } from './MathRenderer';
import {
  X,
  Upload,
  Sparkles,
  FileText,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Download,
  CheckCircle2,
  Eye,
  FileJson,
  Layers,
  CopyCheck,
  Key,
  FolderPlus,
  HelpCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { exportQuestionsToJson, validateQuestionsJson } from '../services/storageService';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveQuestions: (newQuestions: Question[], examSet?: ExamSet) => void;
  currentQuestions: Question[];
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onSaveQuestions,
  currentQuestions,
}) => {
  // Input settings
  const [autoClassify, setAutoClassify] = useState<boolean>(true);
  const [forcedSubject, setForcedSubject] = useState<SubjectType>('math');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [examSetTitle, setExamSetTitle] = useState<string>('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review stage
  const [previewQuestions, setPreviewQuestions] = useState<Question[] | null>(null);
  const [previewMode, setPreviewMode] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'import' | 'json' | 'answer-key'>('import');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'math' | 'literature' | 'science' | 'warning' | 'duplicate'>('all');

  // Answer Key Matching State
  const [answerKeyText, setAnswerKeyText] = useState<string>('');
  const [isMatchingKey, setIsMatchingKey] = useState<boolean>(false);
  const [matchReport, setMatchReport] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerKeyFileRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Duplicate checker helper
  const isDuplicateOfExisting = (newText: string): Question | undefined => {
    const norm = normalizeForComparison(newText);
    if (!norm) return undefined;
    return currentQuestions.find((q) => {
      const qNorm = normalizeForComparison(q.questionText);
      return qNorm === norm || (qNorm.length > 20 && (qNorm.includes(norm) || norm.includes(qNorm)));
    });
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setErrorMessage(null);
      if (!examSetTitle && newFiles.length > 0) {
        const cleanName = newFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setExamSetTitle(cleanName);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Main AI Extraction Handler
  const handleExtractWithAI = async () => {
    if (selectedFiles.length === 0 && !rawText.trim()) {
      setErrorMessage('Vui lòng chọn ít nhất một tệp (PDF, DOCX, TXT, ảnh) hoặc dán nội dung đề thi.');
      return;
    }

    if (!examSetTitle) {
      if (selectedFiles.length > 0) {
        const cleanName = selectedFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setExamSetTitle(cleanName);
      } else {
        setExamSetTitle(`Đề thực chiến HSA số ${new Date().toLocaleDateString('vi-VN')}`);
      }
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressPercent(10);
    setProgressStatus('Đang đọc và chuyển đổi tài liệu...');

    try {
      const fileDataList: FileData[] = [];
      let combinedText = rawText.trim();

      // Read all selected files
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'txt') {
          const txt = await fileToText(file);
          combinedText = combinedText ? `${combinedText}\n\n${txt}` : txt;
        } else {
          const base64 = await fileToBase64(file);
          fileDataList.push({
            name: file.name,
            mimeType: file.type || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
            base64,
          });
        }
      }

      setProgressPercent(30);

      const extracted = await parseQuestionsWithAI(
        {
          autoClassify,
          preferredSubject: autoClassify ? 'auto' : forcedSubject,
          onProgress: (status) => {
            if (status.message) setProgressStatus(status.message);
            if (status.currentFileIndex && status.totalFiles) {
              const pct = 30 + Math.floor((status.currentFileIndex / status.totalFiles) * 60);
              setProgressPercent(pct);
            }
          },
        },
        combinedText,
        fileDataList
      );

      if (!extracted || extracted.length === 0) {
        throw new Error('AI không tìm thấy câu hỏi hợp lệ trong nội dung được cung cấp.');
      }

      // Mark duplicate candidates
      const checkedQuestions = extracted.map((q) => {
        const dup = isDuplicateOfExisting(q.questionText);
        if (dup) {
          return {
            ...q,
            hasWarning: true,
            warningReason: q.warningReason
              ? `${q.warningReason} • Câu hỏi có thể bị trùng với đề đã có`
              : 'Câu hỏi có thể bị trùng với câu đã có trong ngân hàng',
          };
        }
        return q;
      });

      // Expand all groups by default
      const groupsMap: Record<string, boolean> = {};
      checkedQuestions.forEach((q) => {
        if (q.groupId) groupsMap[q.groupId] = true;
      });
      setExpandedGroups(groupsMap);

      setProgressPercent(100);
      setPreviewQuestions(checkedQuestions);
    } catch (err: any) {
      console.error('Lỗi trích xuất đề thi:', err);
      setErrorMessage(err.message || 'Đã xảy ra lỗi trong quá trình xử lý với AI.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Answer Key Matching Handler
  const handleMatchAnswerKey = async () => {
    if (!answerKeyText.trim()) {
      setErrorMessage('Vui lòng dán nội dung bảng đáp án (ví dụ: 1-A, 2-B, 3-C...)');
      return;
    }

    if (!previewQuestions || previewQuestions.length === 0) {
      setErrorMessage('Chưa có danh sách câu hỏi nào trong màn hình xem trước để ghép đáp án.');
      return;
    }

    setIsMatchingKey(true);
    setErrorMessage(null);
    setMatchReport(null);

    try {
      const keys = await parseAnswerKeyWithAI(answerKeyText.trim());
      if (!keys || keys.length === 0) {
        throw new Error('Không nhận diện được đáp án nào trong bảng.');
      }

      // Map keys to question list
      const keyMap = new Map<number, AnswerKeyEntry>();
      keys.forEach((k) => keyMap.set(k.questionNumber, k));

      let matchedCount = 0;
      const updated = previewQuestions.map((q, idx) => {
        const qNum = q.originalNumber ?? idx + 1;
        const entry = keyMap.get(qNum);

        if (entry) {
          matchedCount += 1;
          const letter = entry.answer.trim().toUpperCase();
          const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
          let newAns: number | string = q.correctAnswer;

          if (letterMap[letter] !== undefined) {
            newAns = letterMap[letter];
          } else if (entry.answer) {
            newAns = entry.answer;
          }

          return {
            ...q,
            correctAnswer: newAns,
            explanation: entry.explanation ? `${q.explanation || ''}\n${entry.explanation}`.trim() : q.explanation,
            hasWarning: false,
            warningReason: undefined,
          };
        }
        return q;
      });

      setPreviewQuestions(updated);
      setMatchReport(`Đã ghép thành công đáp án cho ${matchedCount}/${previewQuestions.length} câu hỏi theo số thứ tự!`);
      setAnswerKeyText('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi đọc và ghép bảng đáp án.');
    } finally {
      setIsMatchingKey(false);
    }
  };

  // Field update helpers
  const handleUpdateQuestion = (index: number, updated: Partial<Question>) => {
    if (!previewQuestions) return;
    const next = [...previewQuestions];
    next[index] = { ...next[index], ...updated };
    setPreviewQuestions(next);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, value: string) => {
    if (!previewQuestions) return;
    const next = [...previewQuestions];
    const newOptions = [...next[qIndex].options];
    newOptions[optIndex] = value;
    next[qIndex] = { ...next[qIndex], options: newOptions };
    setPreviewQuestions(next);
  };

  const handleDeleteQuestion = (index: number) => {
    if (!previewQuestions) return;
    const next = previewQuestions.filter((_, idx) => idx !== index);
    setPreviewQuestions(next);
  };

  // Group helpers
  const handleUngroupQuestion = (index: number) => {
    if (!previewQuestions) return;
    const next = [...previewQuestions];
    next[index] = {
      ...next[index],
      groupId: undefined,
      groupTitle: undefined,
      groupContent: undefined,
    };
    setPreviewQuestions(next);
  };

  const handleUpdateGroupContent = (groupId: string, newContent: string) => {
    if (!previewQuestions) return;
    const next = previewQuestions.map((q) => (q.groupId === groupId ? { ...q, groupContent: newContent } : q));
    setPreviewQuestions(next);
  };

  const handleUpdateGroupTitle = (groupId: string, newTitle: string) => {
    if (!previewQuestions) return;
    const next = previewQuestions.map((q) => (q.groupId === groupId ? { ...q, groupTitle: newTitle } : q));
    setPreviewQuestions(next);
  };

  const handleAddNewQuestion = () => {
    if (!previewQuestions) return;
    const newQ: Question = {
      id: `manual-${Date.now()}`,
      originalNumber: previewQuestions.length + 1,
      subject: 'math',
      subTopic: 'Hàm số & Đạo hàm',
      difficulty: 'trung bình',
      questionText: 'Nội dung câu hỏi mới...',
      options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
      correctAnswer: 0,
      type: 'multiple-choice',
      explanation: 'Lời giải chi tiết...',
    };
    setPreviewQuestions([...previewQuestions, newQ]);
  };

  const handleSkipDuplicates = () => {
    if (!previewQuestions) return;
    const filtered = previewQuestions.filter((q) => !isDuplicateOfExisting(q.questionText));
    setPreviewQuestions(filtered);
  };

  const handleConfirmSave = () => {
    if (!previewQuestions || previewQuestions.length === 0) return;

    const setId = `set-${Date.now()}`;
    const finalTitle =
      examSetTitle.trim() || `Đề thực chiến HSA - ${new Date().toLocaleDateString('vi-VN')}`;

    const questionsWithSet: Question[] = previewQuestions.map((q) => ({
      ...q,
      examSetId: setId,
      examSetName: finalTitle,
    }));

    const newSet: ExamSet = {
      id: setId,
      title: finalTitle,
      createdAt: Date.now(),
      questionIds: questionsWithSet.map((q) => q.id),
      sourceFileNames: selectedFiles.map((f) => f.name),
    };

    onSaveQuestions(questionsWithSet, newSet);
    setPreviewQuestions(null);
    onClose();
  };

  // Filtered review questions
  const filteredReviewQuestions = previewQuestions
    ? previewQuestions.filter((q) => {
        if (reviewFilter === 'all') return true;
        if (reviewFilter === 'math') return q.subject === 'math';
        if (reviewFilter === 'literature') return q.subject === 'literature';
        if (reviewFilter === 'science') return q.subject === 'science';
        if (reviewFilter === 'warning') return q.hasWarning;
        if (reviewFilter === 'duplicate') return isDuplicateOfExisting(q.questionText) !== undefined;
        return true;
      })
    : [];

  // Summary counts
  const totalCount = previewQuestions ? previewQuestions.length : 0;
  const mathCount = previewQuestions ? previewQuestions.filter((q) => q.subject === 'math').length : 0;
  const litCount = previewQuestions ? previewQuestions.filter((q) => q.subject === 'literature').length : 0;
  const sciCount = previewQuestions ? previewQuestions.filter((q) => q.subject === 'science').length : 0;
  const warningCount = previewQuestions ? previewQuestions.filter((q) => q.hasWarning).length : 0;
  const duplicateCount = previewQuestions
    ? previewQuestions.filter((q) => isDuplicateOfExisting(q.questionText) !== undefined).length
    : 0;

  // Distinct groups count
  const groupIds = new Set(previewQuestions?.filter((q) => q.groupId).map((q) => q.groupId));
  const groupsCount = groupIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {previewQuestions ? 'Kiểm tra & Chuẩn hóa đề thi trước khi lưu' : 'Nhập đề thi AI thông minh (Đa file & Tự phân loại)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {previewQuestions
                  ? `${totalCount} câu hỏi • ${groupsCount} cụm nhóm câu • ${warningCount} câu cần lưu ý`
                  : 'Tự động phân loại 3 phần HSA, nhận diện câu hỏi cụm và gán chủ đề chuẩn'}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {matchReport && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{matchReport}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD & EXTRACTION INPUT SCREEN */}
          {!previewQuestions && (
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 max-w-md">
                <button
                  type="button"
                  onClick={() => setActiveTab('import')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'import'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Trích xuất đề (AI)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('json')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'json'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <FileJson className="w-4 h-4 text-blue-500" />
                  <span>Xuất / Nhập JSON</span>
                </button>
              </div>

              {activeTab === 'import' ? (
                <div className="space-y-6">
                  {/* Auto-classify Switch & Subject option */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Tự động phân loại 3 phần thi
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Mặc định
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Gemini tự đọc tiêu đề hoặc nội dung câu hỏi để xếp vào: Tư duy định lượng (Toán), Tư duy định tính (Ngữ văn), Khoa học (Lý, Hóa, Sinh, Sử, Địa).
                        </p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={autoClassify}
                          onChange={(e) => setAutoClassify(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {!autoClassify && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                          Gán tất cả câu hỏi nhập vào môn cụ thể:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['math', 'literature', 'science'] as SubjectType[]).map((subj) => (
                            <button
                              key={subj}
                              type="button"
                              onClick={() => setForcedSubject(subj)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                                forcedSubject === subj
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {SUBJECT_CONFIGS[subj].shortName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Multi-file Upload Area */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>Tải lên tệp đề thi (cho phép tải nhiều tệp cùng lúc):</span>
                      <span className="text-xs font-normal text-slate-400">PDF, DOCX, TXT, Ảnh chụp đề</span>
                    </label>

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/20 transition group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.docx,.doc,.txt,image/*"
                        className="hidden"
                        onChange={handleFilesSelected}
                      />
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 shadow-xs group-hover:scale-105 transition text-emerald-600 dark:text-emerald-400">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                        Bấm để chọn hoặc kéo thả nhiều tệp đề thi vào đây
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Hỗ trợ nạp cả đề thi hoàn chỉnh chứa cả 3 phần hoặc các file đề riêng rẽ
                      </p>
                    </div>

                    {/* Selected files list */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="text-xs font-semibold text-slate-500">
                          Đã chọn {selectedFiles.length} tệp:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedFiles.map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="font-medium truncate">{file.name}</span>
                                <span className="text-slate-400 shrink-0">
                                  ({(file.size / 1024).toFixed(0)} KB)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFile(idx);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-500 rounded-md"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Textarea for pasted text */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>Hoặc dán trực tiếp nội dung đề thi vào đây:</span>
                      <span className="text-xs text-slate-400 font-normal">Hỗ trợ nhận diện câu hỏi cụm & KaTeX</span>
                    </label>
                    <textarea
                      rows={4}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Dán nội dung đề thi vào đây... Ví dụ:
Phần 1: Tư duy định lượng
Câu 1: Cho hàm số y = f(x)...
A. 1   B. 2   C. 3   D. 4

Dựa vào đoạn trích sau trả lời từ câu 16 đến 18:
(Đoạn văn chung)...
Câu 16: ...
Câu 17: ..."
                      className="w-full p-4 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Progress indicator during AI parsing */}
                  {isProcessing && (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                        <span className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          {progressStatus || 'Đang xử lý tài liệu...'}
                        </span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-emerald-200 dark:bg-emerald-900 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Nếu tài liệu dài hoặc nhiều file, quá trình xử lý diễn ra theo từng phần và lưu kết quả an toàn.
                      </p>
                    </div>
                  )}

                  {/* Extract Button */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleExtractWithAI}
                    className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Tách câu hỏi & Tự động phân loại (Gemini 3.8 Flash)</span>
                  </button>
                </div>
              ) : (
                /* JSON Backup tab */
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Download className="w-5 h-5 text-emerald-600" />
                      Sao lưu ngân hàng câu hỏi hiện tại
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Tải về tệp JSON chứa toàn bộ {currentQuestions.length} câu hỏi hiện có trong
                      ngân hàng để lưu trữ offline.
                    </p>
                    <button
                      type="button"
                      onClick={() => exportQuestionsToJson(currentQuestions)}
                      className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Tải về tệp JSON (.json)
                    </button>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Upload className="w-5 h-5 text-blue-600" />
                      Nhập đề thi từ tệp JSON sao lưu
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Tải lên tệp JSON đã sao lưu từ trước để xem lại hoặc nạp vào ngân hàng.
                    </p>
                    <input
                      ref={jsonInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            try {
                              const json = JSON.parse(ev.target?.result as string);
                              const validated = validateQuestionsJson(json);
                              if (validated) {
                                setPreviewQuestions(validated);
                              } else {
                                setErrorMessage('Tệp JSON không đúng cấu trúc đề thi HSA.');
                              }
                            } catch {
                              setErrorMessage('Lỗi đọc tệp JSON.');
                            }
                          };
                          reader.readAsText(e.target.files[0]);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => jsonInputRef.current?.click()}
                      className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      Chọn tệp JSON để nhập
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PRE-SAVE REVIEW SCREEN WITH EDITING, GROUPING, AND ANSWER KEY MATCHING */}
          {previewQuestions && (
            <div className="space-y-6">
              {/* Tên bộ đề (Exam Set Name) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Tên bộ đề:</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Tự gợi ý từ tiêu đề tệp • Bạn có thể chỉnh sửa, đổi tên hoặc xoá sau này
                  </span>
                </div>
                <input
                  type="text"
                  value={examSetTitle}
                  onChange={(e) => setExamSetTitle(e.target.value)}
                  placeholder="Ví dụ: Đề thực chiến HSA số 1..."
                  className="w-full p-3 text-sm font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Review Filter & Summary Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      Tổng số: {totalCount} câu hỏi
                    </span>
                    {groupsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        {groupsCount} cụm nhóm câu
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {duplicateCount > 0 && (
                      <button
                        type="button"
                        onClick={handleSkipDuplicates}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition flex items-center gap-1.5"
                      >
                        <CopyCheck className="w-3.5 h-3.5" />
                        <span>Bỏ qua {duplicateCount} câu trùng</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddNewQuestion}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm câu hỏi mới</span>
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: `Tất cả (${totalCount})` },
                    { id: 'math', label: `Định lượng - Toán (${mathCount})` },
                    { id: 'literature', label: `Định tính - Văn (${litCount})` },
                    { id: 'science', label: `Khoa học (${sciCount})` },
                    ...(warningCount > 0
                      ? [{ id: 'warning', label: `Cần chú ý (${warningCount})`, isWarn: true }]
                      : []),
                    ...(duplicateCount > 0
                      ? [{ id: 'duplicate', label: `Nghi trùng (${duplicateCount})` }]
                      : []),
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setReviewFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                        reviewFilter === f.id
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Answer Key Matching Accordion Box */}
              <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      Ghép bảng đáp án vào danh sách câu hỏi này
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">Khớp theo số thứ tự câu</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={answerKeyText}
                    onChange={(e) => setAnswerKeyText(e.target.value)}
                    placeholder="Dán chuỗi đáp án (ví dụ: 1-A, 2-C, 3-D, 4-B... hoặc bảng đáp án)"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono"
                  />
                  <button
                    type="button"
                    disabled={isMatchingKey}
                    onClick={handleMatchAnswerKey}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shrink-0 transition"
                  >
                    {isMatchingKey ? 'Đang ghép...' : 'Ghép đáp án'}
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-5">
                {filteredReviewQuestions.map((q, qIndex) => {
                  const globalIndex = previewQuestions.findIndex((item) => item.id === q.id);
                  const isPreview = previewMode[q.id];
                  const isDup = isDuplicateOfExisting(q.questionText);
                  const isGrouped = !!q.groupId;

                  return (
                    <div
                      key={q.id || qIndex}
                      className={`p-5 rounded-2xl border transition-all space-y-4 bg-white dark:bg-slate-900 ${
                        q.hasWarning
                          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/10'
                          : isDup
                          ? 'border-orange-300 dark:border-orange-700 bg-orange-50/20'
                          : 'border-slate-200 dark:border-slate-800 shadow-xs'
                      }`}
                    >
                      {/* Top Bar for this question */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            Câu #{q.originalNumber ?? globalIndex + 1}
                          </span>

                          {/* Subject Selector */}
                          <select
                            value={q.subject}
                            onChange={(e) =>
                              handleUpdateQuestion(globalIndex, {
                                subject: e.target.value as SubjectType,
                                subTopic: STANDARD_TOPICS[e.target.value as SubjectType][0] || 'Tổng hợp',
                              })
                            }
                            className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          >
                            <option value="math">Định lượng (Toán)</option>
                            <option value="literature">Định tính (Văn)</option>
                            <option value="science">Khoa học</option>
                          </select>

                          {/* Science SubSubject (if subject is science) */}
                          {q.subject === 'science' && (
                            <select
                              value={q.subSubject || 'Vật lí'}
                              onChange={(e) =>
                                handleUpdateQuestion(globalIndex, {
                                  subSubject: e.target.value as ScienceSubSubject,
                                })
                              }
                              className="px-2 py-1 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                            >
                              <option value="Vật lí">Vật lí</option>
                              <option value="Hóa học">Hóa học</option>
                              <option value="Sinh học">Sinh học</option>
                              <option value="Lịch sử">Lịch sử</option>
                              <option value="Địa lí">Địa lí</option>
                            </select>
                          )}

                          {/* Standard Topic Dropdown */}
                          <select
                            value={q.subTopic}
                            onChange={(e) =>
                              handleUpdateQuestion(globalIndex, { subTopic: e.target.value })
                            }
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 max-w-[180px] truncate"
                          >
                            {STANDARD_TOPICS[q.subject].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                            <option value="Khác">Chủ đề khác...</option>
                          </select>

                          {/* Difficulty level */}
                          <select
                            value={q.difficulty || 'trung bình'}
                            onChange={(e) =>
                              handleUpdateQuestion(globalIndex, {
                                difficulty: e.target.value as DifficultyLevel,
                              })
                            }
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          >
                            <option value="dễ">Dễ</option>
                            <option value="trung bình">Trung bình</option>
                            <option value="khó">Khó</option>
                          </select>
                        </div>

                        {/* Question actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewMode((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                            }
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg"
                            title="Bật/Tắt xem trước công thức KaTeX"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isGrouped && (
                            <button
                              type="button"
                              onClick={() => handleUngroupQuestion(globalIndex)}
                              className="px-2 py-1 text-[11px] font-semibold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg"
                              title="Tách câu này khỏi nhóm cụm"
                            >
                              Tách nhóm
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(globalIndex)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            title="Xóa câu hỏi này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Warnings or Duplication Alert */}
                      {q.hasWarning && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>{q.warningReason || 'Cần kiểm tra lại đáp án hoặc phương án lựa chọn'}</span>
                        </div>
                      )}

                      {/* GROUP PASSAGE CONTEXT (IF GROUPED QUESTION) */}
                      {isGrouped && q.groupContent && (
                        <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5" />
                              {q.groupTitle || 'Ngữ cảnh / Đoạn văn chung cho nhóm câu'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedGroups((prev) => ({
                                  ...prev,
                                  [q.groupId!]: !prev[q.groupId!],
                                }))
                              }
                              className="text-[11px] text-purple-600 hover:underline flex items-center gap-0.5"
                            >
                              {expandedGroups[q.groupId!] ? (
                                <>Thu gọn <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>Mở rộng <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          </div>

                          {expandedGroups[q.groupId!] && (
                            <textarea
                              rows={3}
                              value={q.groupContent}
                              onChange={(e) => handleUpdateGroupContent(q.groupId!, e.target.value)}
                              className="w-full p-2.5 text-xs rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono"
                            />
                          )}
                        </div>
                      )}

                      {/* Question Text */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">
                          Nội dung câu hỏi:
                        </label>
                        {isPreview ? (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-sm">
                            <MathRenderer content={q.questionText} />
                          </div>
                        ) : (
                          <textarea
                            rows={3}
                            value={q.questionText}
                            onChange={(e) =>
                              handleUpdateQuestion(globalIndex, { questionText: e.target.value })
                            }
                            className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-900 dark:text-slate-100 font-mono"
                          />
                        )}
                      </div>

                      {/* Options */}
                      {q.type === 'multiple-choice' ? (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-500">
                            Các phương án (Tích chọn tròn để xác định đáp án đúng):
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {['A', 'B', 'C', 'D'].map((letter, optIndex) => {
                              const isCorrect = Number(q.correctAnswer) === optIndex;
                              return (
                                <div
                                  key={letter}
                                  className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                                    isCorrect
                                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                                      : 'border-slate-200 dark:border-slate-800'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`correct-${q.id}`}
                                    checked={isCorrect}
                                    onChange={() =>
                                      handleUpdateQuestion(globalIndex, {
                                        correctAnswer: optIndex,
                                        hasWarning: false,
                                      })
                                    }
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span className="text-xs font-bold text-slate-500 w-4">
                                    {letter}.
                                  </span>
                                  <input
                                    type="text"
                                    value={q.options[optIndex] || ''}
                                    onChange={(e) =>
                                      handleUpdateOption(globalIndex, optIndex, e.target.value)
                                    }
                                    className="flex-1 text-sm bg-transparent border-0 focus:outline-hidden text-slate-800 dark:text-slate-200"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500">
                            Đáp án điền khuyết:
                          </label>
                          <input
                            type="text"
                            value={String(q.correctAnswer)}
                            onChange={(e) =>
                              handleUpdateQuestion(globalIndex, { correctAnswer: e.target.value })
                            }
                            className="w-full p-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                          />
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">
                          Lời giải chi tiết:
                        </label>
                        {isPreview ? (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-600 dark:text-slate-300">
                            <MathRenderer content={q.explanation || 'Chưa có lời giải'} />
                          </div>
                        ) : (
                          <textarea
                            rows={2}
                            value={q.explanation || ''}
                            onChange={(e) =>
                              handleUpdateQuestion(globalIndex, { explanation: e.target.value })
                            }
                            placeholder="Lời giải chi tiết..."
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 font-mono"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {previewQuestions ? (
            <>
              <button
                type="button"
                onClick={() => setPreviewQuestions(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl"
              >
                Quay lại tải file
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
              >
                <Save className="w-4 h-4" />
                <span>Lưu {previewQuestions.length} câu vào ngân hàng đề</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-5 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// String normalization for duplicate detection
function normalizeForComparison(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\s\$\\\{\}\(\)\_\^\,\.\:\;\-\+\*\=\/\'\"\`]/g, '')
    .trim();
}
