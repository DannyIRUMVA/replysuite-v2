begin;

-- Public pricing must remain readable, but writes must be blocked.
alter table public.plans enable row level security;
drop policy if exists plans_select_public on public.plans;
create policy plans_select_public
on public.plans
for select
to public
using (true);

-- Memberships are customer-private and only readable by their owner.
alter table public.user_memberships enable row level security;
drop policy if exists user_memberships_select_own on public.user_memberships;
create policy user_memberships_select_own
on public.user_memberships
for select
to authenticated
using (auth.uid() = user_id);

-- Payments are customer-private and only readable by their owner.
alter table public.payments enable row level security;
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own
on public.payments
for select
to authenticated
using (auth.uid() = user_id);

-- User activity feeds are customer-private and server-written.
alter table public.user_activity enable row level security;
drop policy if exists user_activity_select_own on public.user_activity;
create policy user_activity_select_own
on public.user_activity
for select
to authenticated
using (auth.uid() = user_id);

-- Training job history is customer-private and read-only from the browser.
alter table public.training_jobs enable row level security;
drop policy if exists training_jobs_select_own on public.training_jobs;
create policy training_jobs_select_own
on public.training_jobs
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.chatbots c
    where c.id = training_jobs.chatbot_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  )
);

-- Conversation sessions are owner-visible in the dashboard only.
alter table public.chat_sessions enable row level security;
drop policy if exists chat_sessions_select_owner on public.chat_sessions;
create policy chat_sessions_select_owner
on public.chat_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.chatbots c
    where c.id = chat_sessions.chatbot_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  )
);

-- Conversation messages follow ownership through sessions -> chatbots.
alter table public.chat_messages enable row level security;
drop policy if exists chat_messages_select_owner on public.chat_messages;
create policy chat_messages_select_owner
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_sessions s
    join public.chatbots c on c.id = s.chatbot_id
    where s.id = chat_messages.session_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  )
);

-- Website embed records should only be manageable by the chatbot owner.
alter table public.website_embeds enable row level security;
drop policy if exists website_embeds_select_owner on public.website_embeds;
drop policy if exists website_embeds_insert_owner on public.website_embeds;
drop policy if exists website_embeds_update_owner on public.website_embeds;
drop policy if exists website_embeds_delete_owner on public.website_embeds;
create policy website_embeds_select_owner
on public.website_embeds
for select
to authenticated
using (
  exists (
    select 1
    from public.chatbots c
    where c.id = website_embeds.chatbot_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  )
);
create policy website_embeds_insert_owner
on public.website_embeds
for insert
to authenticated
with check (
  exists (
    select 1
    from public.chatbots c
    where c.id = website_embeds.chatbot_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  )
);
create policy website_embeds_update_owner
on public.website_embeds
for update
to authenticated
using (
  exists (
    select 1
    from public.chatbots c
    where c.id = website_embeds.chatbot_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from public.chatbots c
    where c.id = website_embeds.chatbot_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  )
);
create policy website_embeds_delete_owner
on public.website_embeds
for delete
to authenticated
using (
  exists (
    select 1
    from public.chatbots c
    where c.id = website_embeds.chatbot_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  )
);

-- Internal operational tables should not be browser-accessible.
alter table public.system_logs enable row level security;
alter table public.integration_logs enable row level security;
alter table public.mail enable row level security;

commit;
