begin;

alter table public.user_memberships
  add column if not exists status text default 'active',
  add column if not exists provider text,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists metadata jsonb default '{}'::jsonb;

alter table public.user_memberships
  drop constraint if exists user_memberships_status_check;

alter table public.user_memberships
  add constraint user_memberships_status_check
  check (status is null or status in ('active', 'trialing', 'expired', 'canceled', 'past_due'));

create index if not exists user_memberships_user_trial_idx
  on public.user_memberships (user_id, provider, status, trial_started_at)
  where provider = 'trial';

create index if not exists user_memberships_active_window_idx
  on public.user_memberships (user_id, is_active, ends_at, trial_ends_at);

commit;
