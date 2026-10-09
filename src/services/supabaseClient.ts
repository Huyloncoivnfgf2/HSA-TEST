import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);
export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type CloudExamRecord = {
  id: string;
  title: string;
  section: 'dinh_luong' | 'dinh_tinh' | 'khoa_hoc';
  question_count: number;
  pdf_path: string;
  created_at: string;
  updated_at: string;
};
