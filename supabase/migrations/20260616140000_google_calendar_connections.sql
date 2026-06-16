-- Google Calendar connection foundation for appointments/bookings.

create table if not exists public.google_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_account_id text,
  google_email text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  status text not null default 'connected' check (status in ('connected', 'revoked', 'error')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.chatbot_google_calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  google_connection_id uuid not null references public.google_connections(id) on delete cascade,
  calendar_id text not null,
  calendar_summary text,
  calendar_timezone text not null default 'Africa/Kigali',
  sync_status text not null default 'connected' check (sync_status in ('connected', 'disabled', 'error')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chatbot_id)
);

alter table public.chatbot_appointments
  add column if not exists external_provider text,
  add column if not exists external_calendar_id text,
  add column if not exists external_event_id text,
  add column if not exists external_event_etag text,
  add column if not exists sync_status text,
  add column if not exists last_synced_at timestamptz;

create index if not exists idx_google_connections_user_id on public.google_connections(user_id);
create index if not exists idx_chatbot_google_calendars_user_id on public.chatbot_google_calendars(user_id);
create index if not exists idx_chatbot_google_calendars_chatbot_id on public.chatbot_google_calendars(chatbot_id);
create index if not exists idx_chatbot_appointments_external_event_id on public.chatbot_appointments(external_provider, external_event_id);

alter table public.google_connections enable row level security;
alter table public.chatbot_google_calendars enable row level security;

create policy "google_connections_select_own"
  on public.google_connections for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "google_connections_update_own"
  on public.google_connections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "google_connections_delete_own"
  on public.google_connections for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "chatbot_google_calendars_select_own"
  on public.chatbot_google_calendars for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "chatbot_google_calendars_update_own"
  on public.chatbot_google_calendars for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "chatbot_google_calendars_delete_own"
  on public.chatbot_google_calendars for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, update, delete on public.google_connections to authenticated;
grant select, update, delete on public.chatbot_google_calendars to authenticated;
