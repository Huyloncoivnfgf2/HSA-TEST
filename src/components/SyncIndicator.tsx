import { useEffect, useState } from 'react';
import { subscribeSyncStatus, type SyncStatus } from '../services/userDataSync';

const labels: Record<SyncStatus, string> = {
  synced: 'Đã đồng bộ',
  syncing: 'Đang đồng bộ',
  offline: 'Chưa đồng bộ',
};

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>('synced');
  useEffect(() => subscribeSyncStatus(setStatus), []);
  return <span className="fixed bottom-3 right-3 z-40 rounded-full bg-white/90 px-2.5 py-1 text-[10px] text-slate-500 shadow dark:bg-slate-900/90">{labels[status]}</span>;
}
