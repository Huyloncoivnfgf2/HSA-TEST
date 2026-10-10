import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

// Các chốt chặn phân quyền/riêng tư ở mức code và schema (Task 9.3). Test này
// không thay thế kiểm tra bằng tài khoản thật trên web, nhưng giữ cho các lần
// sửa sau không vô tình phá vỡ những chốt chặn đã có.
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf-8');
const supabaseClient = readFileSync(new URL('../src/services/supabaseClient.ts', import.meta.url), 'utf-8');

describe('bí mật và khóa', () => {
  test('web chỉ dùng anon key, không nhúng service_role', () => {
    expect(supabaseClient).toContain('VITE_SUPABASE_ANON_KEY');
    expect(supabaseClient.toLowerCase()).not.toContain('service_role');
  });
});

describe('schema Supabase', () => {
  test('bảng đáp án không được cấp quyền đọc trực tiếp cho người dùng thường', () => {
    expect(schema.toLowerCase()).not.toContain('grant select on public.exam_keys');
    expect(schema).toContain('revoke all on public.admins, public.allowed_users, public.exams, public.exam_keys');
  });

  test('nộp bài đi qua hàm máy chủ và chỉ Owner mới được ghi dấu kiểm thử', () => {
    expect(schema).toContain('create function public.submit_exam(exam_id uuid, answers jsonb, p_is_content_test boolean default false)');
    expect(schema).toContain('v_is_content_test boolean := coalesce(p_is_content_test, false) and public.is_admin()');
  });

  test('thông báo riêng chỉ người nhận mới đọc được', () => {
    expect(schema).toContain('recipient_id = (select auth.uid())');
  });

  test('đáp án hiện tại chỉ lấy được sau khi chính người đó đã nộp bài', () => {
    expect(schema).toContain('create or replace function public.get_submitted_exam_answer_key(p_exam_id uuid)');
  });
});
