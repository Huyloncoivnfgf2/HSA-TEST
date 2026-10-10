-- Enable the Google provider in Supabase Auth before using the web client.
-- Add administrator addresses manually, for example:
-- insert into public.admins(email) values ('admin@example.com');

create extension if not exists pgcrypto;

create table if not exists public.admins (
  email text primary key check (email = lower(btrim(email)))
);

create table if not exists public.allowed_users (
  email text primary key check (email = lower(btrim(email)))
);

create or replace function public.normalize_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email = lower(btrim(new.email));
  return new;
end;
$$;

drop trigger if exists admins_normalize_email on public.admins;
create trigger admins_normalize_email
before insert or update of email on public.admins
for each row execute function public.normalize_email();

drop trigger if exists allowed_users_normalize_email on public.allowed_users;
create trigger allowed_users_normalize_email
before insert or update of email on public.allowed_users
for each row execute function public.normalize_email();

update public.admins set email = lower(btrim(email)) where email <> lower(btrim(email));
update public.allowed_users set email = lower(btrim(email)) where email <> lower(btrim(email));

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  section text not null check (section in ('dinh_luong', 'dinh_tinh', 'khoa_hoc')),
  question_count integer not null check (question_count > 0),
  pdf_path text not null,
  solution_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Giai đoạn 3: metadata quản lý đề. Các cột này được thêm kiểu if-not-exists để
-- có thể chạy lại schema trên project đã có dữ liệu mà không mất đề cũ.
alter table public.exams
  add column if not exists original_filename text,
  add column if not exists file_id text,
  add column if not exists page_start integer,
  add column if not exists page_end integer,
  add column if not exists start_question integer not null default 1,
  add column if not exists status text not null default 'draft',
  add column if not exists version integer not null default 1,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id);

-- Đề đã có trước khi có quy trình duyệt được coi là đã duyệt để không biến mất
-- khỏi thư viện sau khi nâng cấp. Việc này chỉ chạy đúng một lần nhờ marker;
-- chạy lại schema về sau sẽ không tự duyệt các đề draft mới.
create table if not exists public.hsa_schema_markers (
  key text primary key,
  applied_at timestamptz not null default now()
);
alter table public.hsa_schema_markers enable row level security;
do $$
begin
  if not exists (select 1 from public.hsa_schema_markers where key = 'phase3_existing_exams_approved_v1') then
    update public.exams
    set status = 'approved', approved_at = coalesce(approved_at, created_at)
    where status = 'draft';
    insert into public.hsa_schema_markers(key) values ('phase3_existing_exams_approved_v1');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'exams_page_range_check') then
    alter table public.exams add constraint exams_page_range_check
      check ((page_start is null or page_start >= 1) and (page_end is null or page_end >= coalesce(page_start, 1)));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'exams_start_question_check') then
    alter table public.exams add constraint exams_start_question_check check (start_question >= 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'exams_status_check') then
    alter table public.exams add constraint exams_status_check
      check (status in ('draft', 'verified', 'approved', 'archived'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'exams_version_check') then
    alter table public.exams add constraint exams_version_check check (version >= 1);
  end if;
end $$;

create table if not exists public.exam_revisions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  changed_by uuid references auth.users(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_keys (
  exam_id uuid primary key references public.exams(id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object')
);

create table if not exists public.exam_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  exam_version integer,
  is_content_test boolean not null default false,
  submitted_at timestamptz not null default now()
);

alter table public.exam_submissions
  add column if not exists exam_version integer;

alter table public.exam_submissions
  add column if not exists is_content_test boolean not null default false;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reporter_email text,
  exam_id uuid not null references public.exams(id) on delete cascade,
  exam_title text not null,
  exam_version integer,
  question_number integer not null check (question_number >= 1),
  page_number integer check (page_number is null or page_number >= 1),
  component text not null check (component in ('question', 'answer_key', 'solution', 'pdf', 'other')),
  category text not null check (category in ('wrong_answer', 'missing_or_wrong_content', 'typo_formula_image', 'wrong_or_missing_solution', 'pdf_error', 'other')),
  description text not null check (char_length(btrim(description)) >= 1),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'needs_info', 'rejected', 'resolved', 'duplicate')),
  owner_note text,
  duplicate_of uuid references public.content_reports(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_reports_active_unique
  on public.content_reports (reporter_id, exam_id, question_number, category)
  where status in ('pending', 'confirmed', 'needs_info');

-- Giai đoạn 6: mỗi lần sửa nội dung đã phát hành được ghi thành một bản sửa lỗi
-- riêng. Bản này không chứa đáp án đúng; đáp án trước/sau chỉ nằm trong
-- exam_revisions vốn chỉ Owner đọc được.
create table if not exists public.exam_corrections (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  exam_title text not null,
  from_version integer not null check (from_version >= 1),
  to_version integer not null check (to_version > from_version),
  change_type text not null check (change_type in ('answer_key', 'metadata', 'question_range')),
  changed_questions integer[] not null default '{}'::integer[],
  regrade_decision text not null default 'pending'
    check (regrade_decision in ('pending', 'not_requested', 'requested')),
  affected_submission_count integer,
  affected_learner_count integer,
  potentially_changed_count integer,
  impact_details jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  decision_by uuid references auth.users(id),
  decision_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exam_corrections_exam_created_idx
  on public.exam_corrections (exam_id, created_at desc);

-- Thông báo riêng chỉ gửi tới đúng người cần nhận (người báo lỗi). Người học
-- khác không đọc được nhờ RLS theo recipient_id.
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('content_report_update', 'exam_correction')),
  title text not null,
  body text not null,
  exam_id uuid references public.exams(id) on delete set null,
  report_id uuid references public.content_reports(id) on delete set null,
  correction_id uuid references public.exam_corrections(id) on delete set null,
  created_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_recipient_unread_idx
  on public.user_notifications (recipient_id, created_at desc)
  where acknowledged_at is null;

create table if not exists public.user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create or replace function public.set_exam_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists exams_set_updated_at on public.exams;
create trigger exams_set_updated_at
before update on public.exams
for each row execute function public.set_exam_updated_at();

drop trigger if exists content_reports_set_updated_at on public.content_reports;
create trigger content_reports_set_updated_at
before update on public.content_reports
for each row execute function public.set_exam_updated_at();

drop trigger if exists exam_corrections_set_updated_at on public.exam_corrections;
create trigger exam_corrections_set_updated_at
before update on public.exam_corrections
for each row execute function public.set_exam_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins
    where email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.admins
      where email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
    )
    or exists (
      select 1 from public.allowed_users
      where email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
    )
  );
$$;

create or replace function public.can_read_exam_file(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or not exists (
    select 1 from public.exams as exam where exam.solution_path = p_name
  ) or exists (
    select 1
      from public.exams as exam
      join public.exam_submissions as submission on submission.exam_id = exam.id
     where exam.solution_path = p_name
       and submission.user_id = (select auth.uid())
  );
$$;

alter table public.admins enable row level security;
alter table public.allowed_users enable row level security;
alter table public.exams enable row level security;
alter table public.exam_keys enable row level security;
alter table public.exam_revisions enable row level security;
alter table public.content_reports enable row level security;
alter table public.exam_corrections enable row level security;
alter table public.user_notifications enable row level security;
alter table public.exam_submissions enable row level security;
alter table public.user_data enable row level security;

drop policy if exists "Authenticated users can check admins" on public.admins;
drop policy if exists "Admins can view admins" on public.admins;
create policy "Admins can view admins"
  on public.admins for select to authenticated using (public.is_admin());

drop policy if exists "Admins can view allowed users" on public.allowed_users;
create policy "Admins can view allowed users"
  on public.allowed_users for select to authenticated using (public.is_admin());
drop policy if exists "Admins can add allowed users" on public.allowed_users;
create policy "Admins can add allowed users"
  on public.allowed_users for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can remove allowed users" on public.allowed_users;
create policy "Admins can remove allowed users"
  on public.allowed_users for delete to authenticated using (public.is_admin());

drop policy if exists "Authenticated users can read exams" on public.exams;
drop policy if exists "Users can read approved exams" on public.exams;
create policy "Users can read approved exams"
  on public.exams for select to authenticated
  using (public.is_admin() or (public.is_allowed() and status = 'approved'));
drop policy if exists "Admins can insert exams" on public.exams;
create policy "Admins can insert exams"
  on public.exams for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update exams" on public.exams;
create policy "Admins can update exams"
  on public.exams for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete exams" on public.exams;
create policy "Admins can delete exams"
  on public.exams for delete to authenticated using (public.is_admin());

drop policy if exists "Admins can insert exam keys" on public.exam_keys;
drop policy if exists "Admins can write exam keys" on public.exam_keys;
create policy "Admins can insert exam keys"
  on public.exam_keys for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update exam keys" on public.exam_keys;
create policy "Admins can update exam keys"
  on public.exam_keys for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete exam keys" on public.exam_keys;
create policy "Admins can delete exam keys"
  on public.exam_keys for delete to authenticated using (public.is_admin());

drop policy if exists "Admins can view exam revisions" on public.exam_revisions;
create policy "Admins can view exam revisions"
  on public.exam_revisions for select to authenticated using (public.is_admin());
drop policy if exists "Admins can add exam revisions" on public.exam_revisions;
create policy "Admins can add exam revisions"
  on public.exam_revisions for insert to authenticated with check (public.is_admin());

drop policy if exists "Allowed users can create content reports" on public.content_reports;
create policy "Allowed users can create content reports"
  on public.content_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and public.is_allowed());
drop policy if exists "Users can read own or admin content reports" on public.content_reports;
create policy "Users can read own or admin content reports"
  on public.content_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
drop policy if exists "Admins can update content reports" on public.content_reports;
create policy "Admins can update content reports"
  on public.content_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete content reports" on public.content_reports;
create policy "Admins can delete content reports"
  on public.content_reports for delete to authenticated using (public.is_admin());

drop policy if exists "Allowed users can read exam corrections" on public.exam_corrections;
create policy "Allowed users can read exam corrections"
  on public.exam_corrections for select to authenticated
  using (public.is_allowed());
drop policy if exists "Admins can create exam corrections" on public.exam_corrections;
create policy "Admins can create exam corrections"
  on public.exam_corrections for insert to authenticated
  with check (public.is_admin());
drop policy if exists "Admins can update exam corrections" on public.exam_corrections;
create policy "Admins can update exam corrections"
  on public.exam_corrections for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete exam corrections" on public.exam_corrections;
create policy "Admins can delete exam corrections"
  on public.exam_corrections for delete to authenticated using (public.is_admin());

drop policy if exists "Users can read own notifications" on public.user_notifications;
create policy "Users can read own notifications"
  on public.user_notifications for select to authenticated
  using (recipient_id = (select auth.uid()) and public.is_allowed());
drop policy if exists "Admins can send private notifications" on public.user_notifications;
create policy "Admins can send private notifications"
  on public.user_notifications for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Users can read own submissions" on public.exam_submissions;
create policy "Users can read own submissions"
  on public.exam_submissions for select to authenticated
  using (user_id = (select auth.uid()) and public.is_allowed());

drop policy if exists "Users can read own user data" on public.user_data;
create policy "Users can read own user data"
  on public.user_data for select to authenticated
  using (user_id = (select auth.uid()) and public.is_allowed());
drop policy if exists "Users can insert own user data" on public.user_data;
create policy "Users can insert own user data"
  on public.user_data for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_allowed());
drop policy if exists "Users can update own user data" on public.user_data;
create policy "Users can update own user data"
  on public.user_data for update to authenticated
  using (user_id = (select auth.uid()) and public.is_allowed())
  with check (user_id = (select auth.uid()) and public.is_allowed());
drop policy if exists "Users can delete own user data" on public.user_data;
create policy "Users can delete own user data"
  on public.user_data for delete to authenticated
  using (user_id = (select auth.uid()) and public.is_allowed());

drop function if exists public.submit_exam(uuid, jsonb);
drop function if exists public.submit_exam(uuid, jsonb, boolean);
create function public.submit_exam(exam_id uuid, answers jsonb, p_is_content_test boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_answers jsonb;
  v_solution_path text;
  v_exam_version integer;
  -- Chỉ Owner mới được ghi dấu kiểm thử nội dung ở phía máy chủ; tài khoản
  -- người học luôn bị ghi là lượt thật để không lách được phân tích tiến độ.
  v_is_content_test boolean := coalesce(p_is_content_test, false) and public.is_admin();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not public.is_allowed() then
    raise exception 'Account is not allowed' using errcode = '42501';
  end if;
  if $2 is null or jsonb_typeof($2) <> 'object' then
    raise exception 'Answers must be a JSON object' using errcode = '22023';
  end if;
  if not exists (select 1 from public.exams where id = $1) then
    raise exception 'Exam not found' using errcode = 'P0002';
  end if;

  insert into public.exam_submissions(user_id, exam_id, answers, exam_version, is_content_test)
  select v_user_id, $1, $2, version, v_is_content_test from public.exams where id = $1
  returning exam_version into v_exam_version;

  select coalesce(keys.answers, '{}'::jsonb), exams.solution_path
    into v_answers, v_solution_path
    from public.exam_keys as keys
    join public.exams as exams on exams.id = keys.exam_id
   where keys.exam_id = $1;

  if not found then
    select '{}'::jsonb, exams.solution_path
      into v_answers, v_solution_path
      from public.exams as exams
     where exams.id = $1;
  end if;

  return jsonb_build_object('answers', v_answers, 'solution_path', v_solution_path, 'exam_version', v_exam_version);
end;
$$;

create or replace function public.save_exam_key(exam_id uuid, answers jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if answers is null or jsonb_typeof(answers) <> 'object' then
    raise exception 'Answers must be a JSON object' using errcode = '22023';
  end if;
  insert into public.exam_keys(exam_id, answers)
  values ($1, $2)
  on conflict (exam_id) do update set answers = excluded.answers;
end;
$$;

create or replace function public.pdf_answers_equal(p_left text, p_right text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  with normalized as (
    select
      upper(regexp_replace(replace(coalesce(p_left, ''), ',', '.'), '\s', '', 'g')) as left_value,
      upper(regexp_replace(replace(coalesce(p_right, ''), ',', '.'), '\s', '', 'g')) as right_value
  )
  select case
    when left_value = '' or right_value = '' then false
    when left_value ~ '^-?[0-9]+(\.[0-9]+)?$' and right_value ~ '^-?[0-9]+(\.[0-9]+)?$'
      then left_value::numeric = right_value::numeric
    else left_value = right_value
  end
  from normalized;
$$;

-- Chỉ Owner gọi được. Hàm chỉ trả số liệu gộp, không trả đáp án của người học.
create or replace function public.assess_exam_correction_impact(p_exam_id uuid, p_proposed_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_answers jsonb := '{}'::jsonb;
  v_current_version integer := 1;
  v_changed_questions integer[] := '{}'::integer[];
  v_total integer := 0;
  v_learners integer := 0;
  v_potentially_changed integer := 0;
  v_earliest timestamptz;
  v_latest timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_proposed_answers is null or jsonb_typeof(p_proposed_answers) <> 'object' then
    raise exception 'Proposed answers must be a JSON object' using errcode = '22023';
  end if;
  select version into v_current_version from public.exams where id = p_exam_id;
  if not found then
    raise exception 'Exam not found' using errcode = 'P0002';
  end if;
  select coalesce(answers, '{}'::jsonb) into v_old_answers
    from public.exam_keys where exam_id = p_exam_id;
  if not found then v_old_answers := '{}'::jsonb; end if;

  select coalesce(array_agg(candidate.question_number order by candidate.question_number), '{}'::integer[])
    into v_changed_questions
    from (
      select (entry.key)::integer as question_number
        from jsonb_each(coalesce(v_old_answers, '{}'::jsonb)) as entry
       where entry.key ~ '^[0-9]+$'
      union
      select (entry.key)::integer as question_number
        from jsonb_each(p_proposed_answers) as entry
       where entry.key ~ '^[0-9]+$'
    ) as candidate
   where not public.pdf_answers_equal(
     v_old_answers ->> candidate.question_number::text,
     p_proposed_answers ->> candidate.question_number::text
   );

  select count(*),
         count(distinct user_id),
         count(*) filter (
           where exists (
             select 1
               from unnest(v_changed_questions) as changed(question_number)
              where public.pdf_answers_equal(submission.answers ->> changed.question_number::text, v_old_answers ->> changed.question_number::text)
                 is distinct from public.pdf_answers_equal(submission.answers ->> changed.question_number::text, p_proposed_answers ->> changed.question_number::text)
           )
         ),
         min(submitted_at),
         max(submitted_at)
    into v_total, v_learners, v_potentially_changed, v_earliest, v_latest
    from public.exam_submissions as submission
   where submission.exam_id = p_exam_id;

  return jsonb_build_object(
    'fromVersion', v_current_version,
    'toVersion', v_current_version + 1,
    'changedQuestions', to_jsonb(v_changed_questions),
    'totalSubmissions', coalesce(v_total, 0),
    'affectedLearners', coalesce(v_learners, 0),
    'potentiallyChangedSubmissions', coalesce(v_potentially_changed, 0),
    'earliestSubmissionAt', v_earliest,
    'latestSubmissionAt', v_latest
  );
end;
$$;

-- Người học chỉ lấy được đáp án hiện tại sau khi chính họ đã nộp bài của đề
-- đó; Owner lấy được để xử lý sửa lỗi. Hàm này không ghi thêm bài nộp mới.
create or replace function public.get_submitted_exam_answer_key(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answers jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not public.is_allowed() then
    raise exception 'Account is not allowed' using errcode = '42501';
  end if;
  if not public.is_admin() and not exists (
    select 1 from public.exam_submissions
     where exam_id = p_exam_id and user_id = (select auth.uid())
  ) then
    return null;
  end if;
  select coalesce(answers, '{}'::jsonb) into v_answers
    from public.exam_keys where exam_id = p_exam_id;
  return coalesce(v_answers, '{}'::jsonb);
end;
$$;

create or replace function public.acknowledge_user_notification(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.user_notifications
     set acknowledged_at = coalesce(acknowledged_at, now())
   where id = p_notification_id
     and recipient_id = (select auth.uid());
  return found;
end;
$$;

revoke all on function public.submit_exam(uuid, jsonb, boolean) from public, anon;
grant execute on function public.submit_exam(uuid, jsonb, boolean) to authenticated;
revoke all on function public.save_exam_key(uuid, jsonb) from public, anon;
grant execute on function public.save_exam_key(uuid, jsonb) to authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;
revoke all on function public.can_read_exam_file(text) from public, anon;
grant execute on function public.can_read_exam_file(text) to authenticated;
revoke all on function public.pdf_answers_equal(text, text) from public, anon;
grant execute on function public.pdf_answers_equal(text, text) to authenticated;
revoke all on function public.assess_exam_correction_impact(uuid, jsonb) from public, anon;
grant execute on function public.assess_exam_correction_impact(uuid, jsonb) to authenticated;
revoke all on function public.get_submitted_exam_answer_key(uuid) from public, anon;
grant execute on function public.get_submitted_exam_answer_key(uuid) to authenticated;
revoke all on function public.acknowledge_user_notification(uuid) from public, anon;
grant execute on function public.acknowledge_user_notification(uuid) to authenticated;
revoke all on public.admins, public.allowed_users, public.exams, public.exam_keys, public.exam_revisions, public.content_reports, public.exam_corrections, public.user_notifications, public.exam_submissions, public.user_data
  from public, anon, authenticated;
grant select on public.admins, public.allowed_users to authenticated;
grant insert, delete on public.allowed_users to authenticated;
grant select (id, title, section, question_count, pdf_path, original_filename, file_id, page_start, page_end, start_question, status, version, created_at, updated_at)
  on public.exams to authenticated;
grant insert, update, delete on public.exams to authenticated;
grant select, insert on public.exam_revisions to authenticated;
grant select, insert, update, delete on public.content_reports to authenticated;
grant select, insert, update, delete on public.exam_corrections to authenticated;
grant select, insert on public.user_notifications to authenticated;
grant select on public.exam_submissions to authenticated;
grant select, insert, update, delete on public.user_data to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('exam-files', 'exam-files', false, 31457280)
on conflict (id) do update
set public = false, file_size_limit = 31457280;

drop policy if exists "Authenticated users can read exam files" on storage.objects;
create policy "Authenticated users can read exam files"
  on storage.objects for select to authenticated
  using (bucket_id = 'exam-files' and public.is_allowed() and public.can_read_exam_file(storage.objects.name));
drop policy if exists "Admins can upload exam files" on storage.objects;
create policy "Admins can upload exam files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'exam-files' and public.is_admin());
drop policy if exists "Admins can update exam files" on storage.objects;
create policy "Admins can update exam files"
  on storage.objects for update to authenticated
  using (bucket_id = 'exam-files' and public.is_admin())
  with check (bucket_id = 'exam-files' and public.is_admin());
drop policy if exists "Admins can delete exam files" on storage.objects;
create policy "Admins can delete exam files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'exam-files' and public.is_admin());
