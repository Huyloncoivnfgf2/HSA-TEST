import { supabase } from './supabaseClient';

export interface UserNotification {
  id: string;
  type: 'content_report_update' | 'exam_correction';
  title: string;
  body: string;
  examId: string | null;
  reportId: string | null;
  correctionId: string | null;
  createdAt: number;
  acknowledgedAt: number | null;
}

type NotificationRow = {
  id: string;
  type: UserNotification['type'];
  title: string;
  body: string;
  exam_id: string | null;
  report_id: string | null;
  correction_id: string | null;
  created_at: string;
  acknowledged_at: string | null;
};

function mapNotification(row: NotificationRow): UserNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    examId: row.exam_id,
    reportId: row.report_id,
    correctionId: row.correction_id,
    createdAt: Date.parse(row.created_at),
    acknowledgedAt: row.acknowledged_at ? Date.parse(row.acknowledged_at) : null,
  };
}

export async function listMyUnreadNotifications(): Promise<UserNotification[]> {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('recipient_id', userData.user.id)
    .is('acknowledged_at', null)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) {
    // Trang chủ vẫn dùng bình thường nếu Supabase chưa chạy schema Giai đoạn 6.
    console.warn('Could not load private notifications:', error);
    return [];
  }
  return ((data ?? []) as NotificationRow[]).map(mapNotification);
}

export async function acknowledgeUserNotification(notificationId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('acknowledge_user_notification', {
    p_notification_id: notificationId,
  });
  if (error) throw error;
}
