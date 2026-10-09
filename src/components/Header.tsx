import React from 'react';
import {
  Moon,
  Sun,
  PlusCircle,
  FolderKanban,
  Cloud,
  GraduationCap,
  Sparkles,
  BookX,
  History,
  Target,
  Flame,
  Brain,
  FileText,
  LogOut,
  Users,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenImport: () => void;
  onOpenPdfLibrary: () => void;
  onOpenManager: () => void;
  onOpenDrive: () => void;
  onOpenMistakes: () => void;
  onOpenHistory: () => void;
  onOpenGoals: () => void;
  onOpenFSRS?: () => void;
  onGoHome: () => void;
  currentView: 'home' | 'study' | 'exam' | 'analytics' | 'fsrs-review' | 'pdf-exam';
  questionCount: number;
  mistakeCount: number;
  streakDays: number;
  fsrsDueCount?: number;
  user: User;
  onSignOut: () => void;
  isAdmin: boolean;
  onOpenUsers: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  onOpenImport,
  onOpenPdfLibrary,
  onOpenManager,
  onOpenDrive,
  onOpenMistakes,
  onOpenHistory,
  onOpenGoals,
  onOpenFSRS,
  onGoHome,
  currentView,
  questionCount,
  mistakeCount,
  streakDays,
  fsrsDueCount = 0,
  user,
  onSignOut,
  isAdmin,
  onOpenUsers,
  onOpenProfile,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <div
          onClick={onGoHome}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-lg tracking-tight text-slate-900 dark:text-slate-100">
                HSA ĐHQGHN
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                2026
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Luyện đề Đánh giá năng lực
            </p>
          </div>
        </div>

        {/* Center/Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Streak indicator */}
          <button
            type="button"
            onClick={onOpenGoals}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold text-xs hover:bg-orange-500/20 transition"
            title={`Chuỗi ${streakDays} ngày học liên tục`}
          >
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
            <span>{streakDays} ngày</span>
          </button>

          {/* Ôn tập FSRS button */}
          {onOpenFSRS && (
            <button
              type="button"
              onClick={onOpenFSRS}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                fsrsDueCount > 0
                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-900/60'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Ôn tập ngắt quãng FSRS (Mức ghi nhớ 90% cố định)"
            >
              <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="hidden md:inline">Ôn FSRS</span>
              {fsrsDueCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-600 text-white font-bold">
                  {fsrsDueCount}
                </span>
              )}
            </button>
          )}

          {/* Sổ lỗi sai button */}
          <button
            type="button"
            onClick={onOpenMistakes}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              mistakeCount > 0
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Sổ ghi chép câu sai (tự gỡ khi đúng 2 lần liên tiếp)"
          >
            <BookX className="w-4 h-4 text-rose-500" />
            <span className="hidden md:inline">Sổ lỗi</span>
            {mistakeCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                {mistakeCount}
              </span>
            )}
          </button>

          {/* Lịch sử thi */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Lịch sử các bài kiểm tra"
          >
            <History className="w-4 h-4 text-indigo-500" />
            <span className="hidden xl:inline">Lịch sử</span>
          </button>

          {/* Mục tiêu */}
          <button
            type="button"
            onClick={onOpenGoals}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Cài đặt mục tiêu điểm số & ngày thi"
          >
            <Target className="w-4 h-4 text-emerald-500" />
            <span className="hidden xl:inline">Mục tiêu</span>
          </button>

          {/* Bank Manager button (Owner only: content management) */}
          {isAdmin && (<button
            type="button"
            onClick={onOpenManager}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Quản lý ngân hàng câu hỏi"
          >
            <FolderKanban className="w-4 h-4 text-blue-500" />
            <span className="hidden lg:inline">Ngân hàng</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 font-bold">
              {questionCount}
            </span>
          </button>)}

          {/* Import / AI extract button (Owner only) */}
          {isAdmin && (<button
            type="button"
            onClick={onOpenImport}
            aria-label="Nhập bằng AI (thử nghiệm)"
            title="Nhập bằng AI (thử nghiệm)"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="hidden xl:inline">Nhập bằng AI (thử nghiệm)</span>
          </button>)}

          <button
            type="button"
            onClick={onOpenPdfLibrary}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Thư viện đề PDF"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="hidden lg:inline">Thư viện PDF</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={onOpenUsers}
              className="flex items-center gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Quản lý người dùng"
            >
              <Users className="h-4 w-4 text-indigo-500" />
              <span className="hidden lg:inline">Người dùng</span>
            </button>
          )}

          {/* Google Drive sync button (Owner only: content import) */}
          {isAdmin && (<button
            type="button"
            onClick={onOpenDrive}
            className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
            title="Đồng bộ Google Drive"
          >
            <Cloud className="w-4 h-4 text-amber-500" />
            <span className="hidden xl:inline">Drive</span>
          </button>)}

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Chuyển chế độ sáng/tối"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-700">
            <button type="button" onClick={onOpenProfile} className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800" title="Hồ sơ người học" aria-label="Mở hồ sơ người học">
              {user.user_metadata.avatar_url && <img src={user.user_metadata.avatar_url} alt="" className="h-7 w-7 rounded-full" />}
              <span className="hidden max-w-28 truncate text-xs text-slate-600 dark:text-slate-300 sm:inline" title={user.user_metadata.full_name ?? user.email ?? ''}>
                {user.user_metadata.full_name ?? user.email}
              </span>
            </button>
            <button type="button" onClick={onSignOut} title="Đăng xuất" aria-label="Đăng xuất" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </header>
  );
};
