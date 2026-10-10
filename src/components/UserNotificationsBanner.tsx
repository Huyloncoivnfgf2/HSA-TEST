import React, { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import {
  acknowledgeUserNotification,
  listMyUnreadNotifications,
  type UserNotification,
} from '../services/userNotificationService';

export const UserNotificationsBanner: React.FC = () => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void listMyUnreadNotifications()
      .then((items) => { if (mounted) setNotifications(items); })
      .catch(() => { if (mounted) setNotifications([]); });
    return () => { mounted = false; };
  }, []);

  if (!notifications.length) return null;

  const acknowledge = async (notification: UserNotification) => {
    setAcknowledgingId(notification.id);
    setError(null);
    try {
      await acknowledgeUserNotification(notification.id);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
    } catch {
      setError('Chưa xác nhận được thông báo. Hãy thử lại khi có mạng.');
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <section aria-label="Thông báo riêng" className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      {notifications.map((notification) => (
        <article key={notification.id} className="flex flex-col gap-3 rounded-3xl border border-amber-300 bg-amber-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-amber-950 dark:text-amber-100">{notification.title}</h3>
              <p className="mt-1 text-xs leading-5 text-amber-900/80 dark:text-amber-100/75">{notification.body}</p>
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{new Date(notification.createdAt).toLocaleString('vi-VN')}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={acknowledgingId === notification.id}
            onClick={() => void acknowledge(notification)}
            className="btn-warning shrink-0 px-4 py-2.5 text-xs font-extrabold"
          >
            <Check className="h-4 w-4" /> OK
          </button>
        </article>
      ))}
    </section>
  );
};
