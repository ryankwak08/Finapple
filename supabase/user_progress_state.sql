create table if not exists public.user_progress_state (
  user_id uuid primary key,
  user_email text not null unique,
  hearts integer not null default 5,
  hearts_last_reset date,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid,
  updated_by_email text
);

alter table public.user_progress_state
  add column if not exists user_email text not null default '';

alter table public.user_progress_state
  add column if not exists hearts integer not null default 5;

alter table public.user_progress_state
  add column if not exists hearts_last_reset date;

alter table public.user_progress_state
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_progress_state
  add column if not exists updated_by_user_id uuid;

alter table public.user_progress_state
  add column if not exists updated_by_email text;

create index if not exists user_progress_state_email_idx
  on public.user_progress_state (user_email);
