create table if not exists public.content_items (
  id text primary key,
  title text not null,
  subtitle text not null default '',
  summary text not null default '',
  category text not null default '금융 상식',
  badge text not null default '',
  icon text not null default '📰',
  content_type text not null default 'article',
  source_label text not null default '',
  source_url text not null default '',
  thumbnail_url text not null default '',
  video_url text not null default '',
  pdf_url text not null default '',
  body text not null default '',
  read_time text not null default '',
  updated_at_label text not null default '',
  sort_order integer not null default 0,
  featured boolean not null default false,
  published boolean not null default false,
  card_news jsonb not null default '[]'::jsonb,
  media_items jsonb not null default '[]'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  concepts jsonb not null default '[]'::jsonb,
  learning_points jsonb not null default '[]'::jsonb,
  quiz jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_items
  add column if not exists subtitle text not null default '';

alter table public.content_items
  add column if not exists summary text not null default '';

alter table public.content_items
  add column if not exists category text not null default '금융 상식';

alter table public.content_items
  add column if not exists badge text not null default '';

alter table public.content_items
  add column if not exists icon text not null default '📰';

alter table public.content_items
  add column if not exists content_type text not null default 'article';

alter table public.content_items
  add column if not exists source_label text not null default '';

alter table public.content_items
  add column if not exists source_url text not null default '';

alter table public.content_items
  add column if not exists thumbnail_url text not null default '';

alter table public.content_items
  add column if not exists video_url text not null default '';

alter table public.content_items
  add column if not exists pdf_url text not null default '';

alter table public.content_items
  add column if not exists body text not null default '';

alter table public.content_items
  add column if not exists read_time text not null default '';

alter table public.content_items
  add column if not exists updated_at_label text not null default '';

alter table public.content_items
  add column if not exists sort_order integer not null default 0;

alter table public.content_items
  add column if not exists featured boolean not null default false;

alter table public.content_items
  add column if not exists published boolean not null default false;

alter table public.content_items
  add column if not exists card_news jsonb not null default '[]'::jsonb;

alter table public.content_items
  add column if not exists media_items jsonb not null default '[]'::jsonb;

alter table public.content_items
  add column if not exists goals jsonb not null default '[]'::jsonb;

alter table public.content_items
  add column if not exists concepts jsonb not null default '[]'::jsonb;

alter table public.content_items
  add column if not exists learning_points jsonb not null default '[]'::jsonb;

alter table public.content_items
  add column if not exists quiz jsonb not null default '[]'::jsonb;

create index if not exists content_items_published_sort_idx
  on public.content_items (published, sort_order desc, updated_at desc);

alter table public.content_items enable row level security;

drop policy if exists "content_items_select_published"
  on public.content_items;

create policy "content_items_select_published"
  on public.content_items
  for select
  using (published = true);
