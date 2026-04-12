create table if not exists public.leaderboard_entries (
  user_id uuid primary key,
  user_email text not null,
  display_name text not null,
  avatar_url text not null default '',
  season_key text not null default '',
  season_label text not null default '',
  season_start_date date,
  season_end_date date,
  xp integer not null default 0,
  streak_count integer not null default 1,
  best_streak integer not null default 1,
  streak_freezers integer not null default 0,
  completed_count integer not null default 0,
  active_review_count integer not null default 0,
  resolved_review_count integer not null default 0,
  ads_disabled boolean not null default false,
  score integer not null default 0,
  score_youth integer not null default 0,
  score_start integer not null default 0,
  score_one integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_entries
  add column if not exists season_key text not null default '';

alter table public.leaderboard_entries
  add column if not exists season_label text not null default '';

alter table public.leaderboard_entries
  add column if not exists season_start_date date;

alter table public.leaderboard_entries
  add column if not exists season_end_date date;

alter table public.leaderboard_entries
  add column if not exists score_youth integer not null default 0;

alter table public.leaderboard_entries
  add column if not exists score_start integer not null default 0;

alter table public.leaderboard_entries
  add column if not exists score_one integer not null default 0;

create index if not exists leaderboard_entries_score_idx
  on public.leaderboard_entries (score desc, updated_at asc);

create index if not exists leaderboard_entries_season_score_idx
  on public.leaderboard_entries (season_key, score desc, updated_at asc);

create table if not exists public.leaderboard_entry_history (
  user_id uuid not null,
  user_email text not null,
  display_name text not null,
  avatar_url text not null default '',
  season_key text not null,
  season_label text not null default '',
  season_start_date date,
  season_end_date date,
  xp integer not null default 0,
  streak_count integer not null default 1,
  best_streak integer not null default 1,
  streak_freezers integer not null default 0,
  completed_count integer not null default 0,
  active_review_count integer not null default 0,
  resolved_review_count integer not null default 0,
  ads_disabled boolean not null default false,
  score integer not null default 0,
  score_youth integer not null default 0,
  score_start integer not null default 0,
  score_one integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, season_key)
);

alter table public.leaderboard_entry_history
  add column if not exists score_youth integer not null default 0;

alter table public.leaderboard_entry_history
  add column if not exists score_start integer not null default 0;

alter table public.leaderboard_entry_history
  add column if not exists score_one integer not null default 0;

create index if not exists leaderboard_entry_history_user_idx
  on public.leaderboard_entry_history (user_id, season_start_date desc);
