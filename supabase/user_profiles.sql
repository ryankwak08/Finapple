create table if not exists public.user_profiles (
  user_id uuid primary key,
  email text not null unique,
  nickname text not null unique,
  avatar_url text not null default '',
  school_name text not null default '',
  school_code text not null default '',
  education_office_code text not null default '',
  education_office_name text not null default '',
  school_type text not null default '',
  school_region text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles
  add column if not exists school_name text not null default '';

alter table public.user_profiles
  add column if not exists school_code text not null default '';

alter table public.user_profiles
  add column if not exists education_office_code text not null default '';

alter table public.user_profiles
  add column if not exists education_office_name text not null default '';

alter table public.user_profiles
  add column if not exists school_type text not null default '';

alter table public.user_profiles
  add column if not exists school_region text not null default '';

create index if not exists user_profiles_school_idx
  on public.user_profiles (education_office_code, school_code);

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_all"
  on public.user_profiles;

create policy "user_profiles_select_all"
  on public.user_profiles
  for select
  using (true);

drop policy if exists "user_profiles_insert_own"
  on public.user_profiles;

create policy "user_profiles_insert_own"
  on public.user_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_profiles_update_own"
  on public.user_profiles;

create policy "user_profiles_update_own"
  on public.user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
