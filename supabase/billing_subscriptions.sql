create table if not exists public.billing_subscriptions (
  id bigserial primary key,
  user_id uuid not null,
  provider text not null,
  status text not null default 'active',
  plan_code text not null,
  currency text not null default 'KRW',
  amount integer not null,
  batch_key text not null,
  batch_group_id text,
  last_order_id text,
  last_paid_at timestamptz,
  next_billing_at timestamptz,
  fail_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists billing_subscriptions_provider_status_next_billing_idx
  on public.billing_subscriptions(provider, status, next_billing_at);

create index if not exists billing_subscriptions_user_id_idx
  on public.billing_subscriptions(user_id);
