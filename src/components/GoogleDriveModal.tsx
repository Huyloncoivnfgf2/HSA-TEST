import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../services/firebaseAuth';
import {
  listHsaFilesFromDrive,
  uploadQuestionBankToDrive,
  downloadFileFromDrive,
  deleteFileFromDrive,
  DriveFileItem,
} from '../services/googleDriveService';
import { Question } from '../types/hsa';
import { ConfirmationModal } from './ConfirmationModal';
import {
  X,
  Cloud,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  LogOut,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onImportQuestions: (imported: Question[]) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  questions,
  onImportQuestions,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDriveLoading, setIsDriveLoading] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  // Confirmation dialog state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (user, t) => {
        setCurrentUser(user);
        setToken(t);
        fetchFiles(t);
      },
      () => {
        setCurrentUser(null);
        setToken(null);
        setDriveFiles([]);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setToken(res.accessToken);
        await fetchFiles(res.accessToken);
        setStatusMessage({ text: 'Đăng nhập Google Drive thành công!', type: 'success' });
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setStatusMessage({
        text: err.message || 'Không thể đăng nhập Google Drive. Vui lòng thử lại.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    setToken(null);
    setDriveFiles([]);
    setStatusMessage({ text: 'Đã đăng xuất Google.', type: 'success' });
  };

  const fetchFiles = async (authToken?: string) => {
    const t = authToken || token || (await getAccessToken());
    if (!t) return;

    setIsDriveLoading(true);
    try {
      const files = await listHsaFilesFromDrive(t);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('List files error:', err);
      setStatusMessage({ text: err.message || 'Lỗi tải danh sách tệp từ Drive', type: 'error' });
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Upload to Drive with confirmation
  const triggerUpload = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Lưu bộ câu hỏi lên Google Drive?',
      message: `Bạn có chắc chắn muốn tải lên và lưu trữ ${questions.length} câu hỏi hiện tại vào Google Drive của bạn không?`,
      type: 'info',
      action: async () => {
        const t = token || (await getAccessToken());
        if (!t) throw new Error('Chưa đăng nhập');

        setIsDriveLoading(true);
        try {
          const result = await uploadQuestionBankToDrive(t, questions);
          setStatusMessage({
            text: `Đã lưu thành công tệp "${result.name}" vào Google Drive!`,
            type: 'success',
          });
          await fetchFiles(t);
        } catch (err: any) {
          setStatusMessage({ text: err.message || 'Lỗi khi tải lên Google Drive', type: 'error' });
        } finally {
          setIsDriveLoading(false);
        }
      },
    });
  };

  // Download from Drive with confirmation
  const triggerDownload = (file: DriveFileItem) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Tải và nạp đề thi từ Google Drive?',
      message: `Hành động này sẽ tải tệp "${file.name}" từ Google Drive và thêm các câu hỏi vào ngân hàng câu hỏi trên thiết bị này.`,
      type: 'warning',
      action: async () => {
        const t = token || (await getAccessToken());
        if (!t) throw new Error('Chưa đăng nhập');

        setIsDriveLoading(true);
        try {
          const imported = await downloadFileFromDrive(t, file.id);
          onImportQuestions(imported);
          setStatusMessage({
            text: `Đã nạp thành công ${imported.length} câu hỏi từ Google Drive!`,
            type: 'success',
          });
        } catch (err: any) {
          setStatusMessage({ text: err.message || 'Lỗi khi đọc tệp từ Drive', type: 'error' });
        } finally {
          setIsDriveLoading(false);
        }
      },
    });
  };

  // Delete from Drive with confirmation
  const triggerDelete = (file: DriveFileItem) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Xóa tệp trên Google Drive?',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn tệp "${file.name}" khỏi Google Drive không? Thao tác này không thể hoàn tác.`,
      type: 'danger',
      action: async () => {
        const t = token || (await getAccessToken());
        if (!t) throw new Error('Chưa đăng nhập');

        setIsDriveLoading(true);
        try {
          await deleteFileFromDrive(t, file.id);
          setStatusMessage({ text: `Đã xóa tệp "${file.name}" khỏi Google Drive.`, type: 'success' });
          await fetchFiles(t);
        } catch (err: any) {
          setStatusMessage({ text: err.message || 'Lỗi khi xóa tệp trên Drive', type: 'error' });
        } finally {
          setIsDriveLoading(false);
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Đồng bộ Google Drive
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lưu trữ và phục hồi ngân hàng câu hỏi đề thi HSA trên đám mây cá nhân
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {statusMessage && (
            <div
              className={`flex items-start gap-3 p-4 rounded-2xl text-xs sm:text-sm ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {!currentUser ? (
            /* Google Sign-in Prompt */
            <div className="text-center py-8 px-4 space-y-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-800/20">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
                <Cloud className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Kết nối tài khoản Google Drive
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Đăng nhập bằng tài khoản Google để sao lưu toàn bộ đề thi, kết quả luyện tập và dễ
                  dàng chuyển đổi giữa điện thoại và máy tính.
                </p>
              </div>

              {/* Official Google Sign-in Styled Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSignIn}
                  className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xs hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>
                    {isLoading ? 'Đang kết nối...' : 'Đăng nhập với Google (Drive)'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Logged in state */
            <div className="space-y-6">
              {/* User profile banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || ''}
                      className="w-10 h-10 rounded-full border border-emerald-400"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {currentUser.displayName || 'Người dùng Google'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isDriveLoading}
                  onClick={triggerUpload}
                  className="flex items-center gap-2 py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Sao lưu {questions.length} câu lên Drive</span>
                </button>

                <button
                  type="button"
                  disabled={isDriveLoading}
                  onClick={() => fetchFiles()}
                  className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDriveLoading ? 'animate-spin' : ''}`} />
                  <span>Làm mới danh sách</span>
                </button>
              </div>

              {/* Files on Drive list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Các tệp sao lưu trên Google Drive ({driveFiles.length})
                </h4>

                {isDriveLoading && driveFiles.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Đang tải dữ liệu từ Google Drive...
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                    Chưa có tệp sao lưu HSA nào trên Google Drive của bạn. Bấm "Sao lưu lên Drive" để
                    tạo tệp đầu tiên.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {driveFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(file.modifiedTime).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => triggerDownload(file)}
                            className="p-2 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition"
                            title="Tải về máy & nạp vào ngân hàng"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => triggerDelete(file)}
                            className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                            title="Xóa tệp khỏi Google Drive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog */}
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={async () => {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          await confirmConfig.action();
        }}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
