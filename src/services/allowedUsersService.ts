import { supabase } from './supabaseClient';

export async function loadAllowedUsers(): Promise<string[]> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('allowed_users').select('email').order('email');
  if (error) throw error;
  return (data ?? []).map((row) => row.email);
}

export async function addAllowedUsers(emails: string[]): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  if (!emails.length) return;
  const { error } = await supabase.from('allowed_users').insert(
    emails.map((email) => ({ email: email.trim().toLowerCase() }))
  );
  if (error) throw error;
}

export async function removeAllowedUser(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('allowed_users')
    .delete()
    .eq('email', email.trim().toLowerCase());
  if (error) throw error;
}
