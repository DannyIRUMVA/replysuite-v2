insert into public.onboarding_steps (code, description)
values
  ('company_profile', 'Collect business profile context.'),
  ('choose_plan', 'Start a trial or continue with Starter.'),
  ('choose_channel', 'Choose the first channel to connect after training.')
on conflict (code) do update
set description = excluded.description;
