import { useEffect, useState } from 'react';
import { LoaderCircle, Trash2, UserPlus, X } from 'lucide-react';
import { addAllowedUsers, loadAllowedUsers, removeAllowedUser } from '../services/allowedUsersService';

interface AllowedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

export function AllowedUsersModal({ isOpen, onClose }: AllowedUsersModalProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [invalidEmails, setInvalidEmails] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    setMessage('');
    try {
      setEmails(await loadAllowedUsers());
    } catch (error) {
      console.error('Could not load the allowed user list:', error);
      setMessage('Không thể tải danh sách email được duyệt.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) void refresh();
  }, [isOpen]);

  if (!isOpen) return null;

  const addEmails = async () => {
    const parsed = draft
      .split(/[,\s;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const unique = [...new Set(parsed)];
    const invalid = unique.filter((email) => !EMAIL_PATTERN.test(email));
    setInvalidEmails(invalid);
    if (invalid.length || unique.length === 0) {
      if (!unique.length) setMessage('Nhập ít nhất một địa chỉ email hợp lệ.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const existing = new Set(emails);
      const fresh = unique.filter((email) => !existing.has(email));
      if (fresh.length) await addAllowedUsers(fresh);
      setDraft('');
      setInvalidEmails([]);
      await refresh();
      setMessage(fresh.length ? `Đã thêm ${fresh.length} email.` : 'Các email này đã có trong danh sách.');
    } catch (error) {
      console.error('Could not add allowed users:', error);
      setMessage('Không thể thêm email. Hãy kiểm tra quyền quản trị và thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const deleteEmail = async (email: string) => {
    setBusy(true);
    setMessage('');
    try {
      await removeAllowedUser(email);
      setEmails((current) => current.filter((item) => item !== email));
    } catch (error) {
      console.error(`Could not remove allowed user ${email}:`, error);
      setMessage(`Không thể xoá ${email}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Quản lý người dùng">
      <section className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-extrabold">Người dùng</h2>
            <p className="mt-1 text-xs text-slate-500">Quản lý email được phép sử dụng web</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-4 overflow-y-auto p-5">
          <label className="block space-y-1.5 text-xs font-bold">
            Thêm nhiều email
            <textarea
              rows={3}
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setInvalidEmails([]); }}
              placeholder={'hocvien@example.com, ban@example.com\nnguoi-dung@example.com'}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
          {invalidEmails.length > 0 && <p role="alert" className="text-xs text-rose-600">Email sai định dạng: {invalidEmails.join(', ')}</p>}
          <button type="button" onClick={() => void addEmails()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><UserPlus className="h-4 w-4" /> Thêm email</button>
          {message && <p role="status" className="text-xs text-slate-600 dark:text-slate-300">{message}</p>}
          <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span>Email được duyệt ({emails.length})</span>
              {busy && <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" />}
            </div>
            {emails.length === 0 && !busy
              ? <p className="py-5 text-center text-xs text-slate-500">Chưa có email nào trong danh sách.</p>
              : <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {emails.map((email) => (
                    <li key={email} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 break-all text-sm">{email}</span>
                      <button type="button" disabled={busy} onClick={() => void deleteEmail(email)} title={`Xoá ${email}`} aria-label={`Xoá ${email}`} className="shrink-0 rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>}
          </div>
        </div>
      </section>
    </div>
  );
}
