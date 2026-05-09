begin;

-- Verification records contain sensitive tokens and should never be browser-accessible.
alter table public.user_verifications enable row level security;

-- Onboarding catalog can be public read-only; per-user progress stays owner-scoped.
alter table public.onboarding_steps enable row level security;
drop policy if exists onboarding_steps_select_public on public.onboarding_steps;
create policy onboarding_steps_select_public
on public.onboarding_steps
for select
to public
using (true);

alter table public.user_onboarding enable row level security;
drop policy if exists user_onboarding_select_own on public.user_onboarding;
drop policy if exists user_onboarding_insert_own on public.user_onboarding;
drop policy if exists user_onboarding_update_own on public.user_onboarding;
drop policy if exists user_onboarding_delete_own on public.user_onboarding;
create policy user_onboarding_select_own
on public.user_onboarding
for select
to authenticated
using (auth.uid() = user_id);
create policy user_onboarding_insert_own
on public.user_onboarding
for insert
to authenticated
with check (auth.uid() = user_id);
create policy user_onboarding_update_own
on public.user_onboarding
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create policy user_onboarding_delete_own
on public.user_onboarding
for delete
to authenticated
using (auth.uid() = user_id);

-- Currency rates are not sensitive, but should be read-only from the public API.
alter table public.currency_rates enable row level security;
drop policy if exists currency_rates_select_active on public.currency_rates;
create policy currency_rates_select_active
on public.currency_rates
for select
to public
using (coalesce(is_active, true));

-- Instagram operational data should be owner-readable only.
alter table public.instagram_posts enable row level security;
drop policy if exists instagram_posts_select_owner on public.instagram_posts;
create policy instagram_posts_select_owner
on public.instagram_posts
for select
to authenticated
using (
  exists (
    select 1
    from public.instagram_accounts ia
    where ia.id = instagram_posts.instagram_account_id
      and ia.user_id = auth.uid()
  )
);

alter table public.instagram_comments enable row level security;
drop policy if exists instagram_comments_select_owner on public.instagram_comments;
create policy instagram_comments_select_owner
on public.instagram_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.instagram_accounts ia
    where ia.id = instagram_comments.instagram_account_id
      and ia.user_id = auth.uid()
  )
);

alter table public.instagram_comment_triggers enable row level security;
drop policy if exists instagram_comment_triggers_select_owner on public.instagram_comment_triggers;
create policy instagram_comment_triggers_select_owner
on public.instagram_comment_triggers
for select
to authenticated
using (
  exists (
    select 1
    from public.chatbots c
    where c.id = instagram_comment_triggers.chatbot_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  )
);

alter table public.instagram_message_jobs enable row level security;
drop policy if exists instagram_message_jobs_select_owner on public.instagram_message_jobs;
create policy instagram_message_jobs_select_owner
on public.instagram_message_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.chatbots c
    where c.id = instagram_message_jobs.chatbot_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  )
  or exists (
    select 1
    from public.instagram_accounts ia
    where ia.id = instagram_message_jobs.instagram_account_id
      and ia.user_id = auth.uid()
  )
);

-- Pin function search_path to avoid mutable search_path warnings.
alter function public.fn_assign_trial_on_verify() set search_path = public;
alter function public.fn_sync_verification_to_profile() set search_path = public;
alter function public.get_daily_analytics(uuid[], integer) set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.match_embeddings(uuid, vector, integer) set search_path = public;
alter function public.match_embeddings(vector, double precision, integer, uuid) set search_path = public;
alter function public.match_embeddings_meta(uuid, vector, integer) set search_path = public;
alter function public.trigger_set_updated_at() set search_path = public;

-- Remove direct API execution from internal/trigger functions and server-only helpers.
revoke execute on function public.fn_assign_trial_on_verify() from public, anon, authenticated;
revoke execute on function public.fn_sync_verification_to_profile() from public, anon, authenticated;
revoke execute on function public.get_daily_analytics(uuid[], integer) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.match_embeddings(uuid, vector, integer) from public, anon, authenticated;
revoke execute on function public.match_embeddings(vector, double precision, integer, uuid) from public, anon, authenticated;
revoke execute on function public.match_embeddings_meta(uuid, vector, integer) from public, anon, authenticated;
revoke execute on function public.trigger_set_updated_at() from public, anon, authenticated;

grant execute on function public.fn_assign_trial_on_verify() to postgres, service_role;
grant execute on function public.fn_sync_verification_to_profile() to postgres, service_role;
grant execute on function public.get_daily_analytics(uuid[], integer) to postgres, service_role;
grant execute on function public.handle_new_user() to postgres, service_role;
grant execute on function public.match_embeddings(uuid, vector, integer) to postgres, service_role;
grant execute on function public.match_embeddings(vector, double precision, integer, uuid) to postgres, service_role;
grant execute on function public.match_embeddings_meta(uuid, vector, integer) to postgres, service_role;
grant execute on function public.trigger_set_updated_at() to postgres, service_role;

commit;
