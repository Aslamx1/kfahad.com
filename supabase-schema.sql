-- ================================================================
-- KFAHAD Academy — Supabase Production Schema
-- Run this in Supabase SQL Editor before deploying.
-- ================================================================

-- Users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  username text,
  password_hash text,
  role text not null default 'student',
  avatar_url text,
  bio text default '',
  phone_number text,
  interested_courses jsonb default '[]'::jsonb,
  interested_tracks jsonb default '[]'::jsonb,
  subscription_expires_at bigint,
  created_at bigint not null default extract(epoch from now())::bigint,
  last_login_at bigint,
  sign_in_count integer not null default 0,
  verified_at text,
  auth_provider text not null default 'email',
  terms_accepted_at bigint,
  terms_version text,
  failed_login_count integer not null default 0,
  locked_until bigint
);

-- Sessions
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  csrf_token text not null,
  ip_address text,
  user_agent text,
  created_at bigint not null default extract(epoch from now())::bigint,
  expires_at bigint not null
);

create index if not exists idx_user_sessions_token_hash on public.user_sessions(token_hash);
create index if not exists idx_user_sessions_user_id on public.user_sessions(user_id);

-- Account lockouts
create table if not exists public.account_lockouts (
  email text primary key,
  fail_count integer not null default 0,
  locked_until bigint,
  updated_at bigint not null default extract(epoch from now())::bigint
);

-- Password resets
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email text not null,
  token text not null,
  expires_at bigint not null,
  used boolean not null default false
);

create index if not exists idx_password_resets_token on public.password_resets(token);

-- Messages
create table if not exists public.messages (
  id text primary key,
  sender_id text not null,
  text text not null default '',
  created_at bigint not null default extract(epoch from now())::bigint,
  channel text not null default 'group',
  receiver_id text,
  read boolean not null default false,
  read_by jsonb not null default '[]'::jsonb,
  delivered_to jsonb not null default '[]'::jsonb
);

create index if not exists idx_messages_created_at on public.messages(created_at);

-- Notifications
create table if not exists public.notifications (
  id text primary key,
  title text not null,
  body text not null default '',
  target_role text not null default 'all',
  target_user_id text,
  priority text not null default 'normal',
  created_at bigint not null default extract(epoch from now())::bigint,
  updated_at bigint,
  read boolean,
  read_by jsonb not null default '[]'::jsonb
);

-- Payments
create table if not exists public.payments (
  id text primary key,
  user_id text,
  type text not null,
  amount bigint not null,
  provider text not null,
  reference text,
  status text not null,
  account text not null,
  net_amount bigint,
  platform_fee bigint,
  created_at text,
  completed_at text
);

-- Appointments
create table if not exists public.appointments (
  id text primary key,
  user_id text not null,
  instructor_id text,
  scheduled_at bigint not null,
  status text not null default 'pending',
  notes text default '',
  created_at bigint not null default extract(epoch from now())::bigint
);

-- Learning progress
create table if not exists public.learning_progress (
  id text primary key,
  user_id text not null,
  course_id text not null,
  lesson_id text not null,
  timestamp_seconds integer not null default 0,
  status text not null default 'completed',
  created_at bigint not null default extract(epoch from now())::bigint,
  updated_at bigint not null default extract(epoch from now())::bigint
);

create index if not exists idx_learning_progress_user_course on public.learning_progress(user_id, course_id);

-- Site content
create table if not exists public.courses (
  id text primary key,
  track text,
  title text not null,
  description text,
  video_url text,
  category text,
  image_url text,
  modules jsonb default '[]'::jsonb,
  created_at bigint not null default extract(epoch from now())::bigint,
  updated_at bigint
);

create table if not exists public.blog_posts (
  id text primary key,
  title text not null,
  description text,
  author text,
  type text,
  media_url text,
  created_at bigint not null default extract(epoch from now())::bigint
);

create table if not exists public.jobs (
  id text primary key,
  title text not null,
  company text not null,
  location text,
  type text default 'Full-time',
  description text,
  apply_url text default '#',
  created_at bigint not null default extract(epoch from now())::bigint,
  updated_at bigint
);

create table if not exists public.knowledge_base (
  id text primary key,
  title text not null,
  category text not null,
  description text,
  content text,
  author text default 'Admin',
  created_at bigint not null default extract(epoch from now())::bigint
);

create table if not exists public.live_sessions (
  id text primary key,
  title text not null,
  url text,
  course_id text,
  course_title text,
  instructor_id text,
  instructor_name text,
  scheduled_at bigint,
  created_at bigint not null default extract(epoch from now())::bigint
);

create table if not exists public.student_reviews (
  id text primary key,
  student_name text not null,
  course_titles jsonb default '[]'::jsonb,
  avatar_url text,
  rating integer not null default 5,
  text text not null,
  created_at bigint not null default extract(epoch from now())::bigint
);

create table if not exists public.examples (
  id text primary key,
  title text not null,
  description text,
  image_url text,
  created_at bigint not null default extract(epoch from now())::bigint
);

create table if not exists public.pathways (
  id text primary key,
  title text not null,
  description text,
  course_ids jsonb default '[]'::jsonb,
  created_at bigint not null default extract(epoch from now())::bigint
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table public.users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.account_lockouts enable row level security;
alter table public.password_resets enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.payments enable row level security;
alter table public.appointments enable row level security;
alter table public.learning_progress enable row level security;
alter table public.courses enable row level security;
alter table public.blog_posts enable row level security;
alter table public.jobs enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.live_sessions enable row level security;
alter table public.student_reviews enable row level security;
alter table public.examples enable row level security;
alter table public.pathways enable row level security;

-- Public read for site content
create policy "public_read_courses" on public.courses for select using (true);
create policy "public_read_blog_posts" on public.blog_posts for select using (true);
create policy "public_read_jobs" on public.jobs for select using (true);
create policy "public_read_knowledge_base" on public.knowledge_base for select using (true);
create policy "public_read_live_sessions" on public.live_sessions for select using (true);
create policy "public_read_student_reviews" on public.student_reviews for select using (true);
create policy "public_read_examples" on public.examples for select using (true);
create policy "public_read_pathways" on public.pathways for select using (true);

-- Admin/instructor write for site content
create policy "admin_write_courses" on public.courses for insert with check (false);
create policy "admin_write_blog_posts" on public.blog_posts for insert with check (false);
create policy "admin_write_jobs" on public.jobs for insert with check (false);
create policy "admin_write_knowledge_base" on public.knowledge_base for insert with check (false);
create policy "admin_write_live_sessions" on public.live_sessions for insert with check (false);
create policy "admin_write_student_reviews" on public.student_reviews for insert with check (false);
create policy "admin_write_examples" on public.examples for insert with check (false);
create policy "admin_write_pathways" on public.pathways for insert with check (false);

-- Users can read their own data
create policy "users_read_self" on public.users for select using (auth.uid() = id);
create policy "users_update_self" on public.users for update using (auth.uid() = id);

-- Sessions
create policy "session_insert_self" on public.user_sessions for insert with check (auth.uid() = user_id);
create policy "session_read_self" on public.user_sessions for select using (auth.uid() = user_id);
create policy "session_delete_self" on public.user_sessions for delete using (auth.uid() = user_id);

-- Private data
create policy "private_read_own" on public.notifications for select using (true);
create policy "private_write_own" on public.notifications for insert with check (true);
create policy "private_read_own_payments" on public.payments for select using (true);
create policy "private_write_own_payments" on public.payments for insert with check (true);
create policy "private_read_own_appointments" on public.appointments for select using (true);
create policy "private_write_own_appointments" on public.appointments for insert with check (true);
create policy "private_read_own_progress" on public.learning_progress for select using (true);
create policy "private_write_own_progress" on public.learning_progress for insert with check (true);

-- Messages
create policy "messages_read_authenticated" on public.messages for select using (true);
create policy "messages_write_authenticated" on public.messages for insert with check (true);

-- ================================================================
-- INITIAL SEED USERS
-- ================================================================

-- 1. Admin Account (Email: Admin.kfahad@gmail.com / Pass: Kfahad.login.)
insert into public.users (
  id, name, email, username, role, password_hash, bio, phone_number, verified_at, created_at, last_login_at
) values (
  'a0000000-0000-0000-0000-000000000001',
  'Kandeke Fahad',
  'admin.kfahad@gmail.com',
  'kfahad',
  'admin',
  '007646dda8a8efff1ea5511164908011:6f61f16b8ff4141c4ec1ee5a935b75c447b3331799c82399c629508d93f8195c86e7fa1232ee70b95395937b40b183630efd0fcf30b147b2d173e5f4d3b0fdde',
  'Founder & CEO of KFAHAD Academy',
  '+256702618396',
  now()::text,
  extract(epoch from now())::bigint,
  extract(epoch from now())::bigint
) on conflict (email) do update set
  role = 'admin',
  password_hash = excluded.password_hash;
