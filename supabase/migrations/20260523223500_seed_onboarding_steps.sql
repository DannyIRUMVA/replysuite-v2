create unique index if not exists user_onboarding_user_id_step_code_key
on public.user_onboarding (user_id, step_code)
where user_id is not null and step_code is not null;

insert into public.onboarding_steps (code, description)
values
  ('verify_account', 'Verify account before first dashboard access.'),
  ('create_chatbot', 'Create first chatbot before first dashboard access.')
on conflict (code) do update
set description = excluded.description;
