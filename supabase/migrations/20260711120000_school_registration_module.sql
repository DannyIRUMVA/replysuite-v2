begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- School registration: admissions, optional fee, admin approval
-- ─────────────────────────────────────────────────────────────
create table if not exists public.school_registration_forms (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null default 'Student Registration',
  description text,
  is_active boolean not null default true,
  payment_required boolean not null default false,
  registration_fee numeric(12,2) not null default 0 check (registration_fee >= 0),
  currency text not null default 'RWF',
  requires_approval boolean not null default true,
  academic_year text,
  intake_label text,
  confirmation_message text,
  pending_approval_message text,
  approval_message text,
  rejection_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_registration_forms_chatbot_active_idx
  on public.school_registration_forms(chatbot_id, is_active, created_at desc);

drop trigger if exists set_school_registration_forms_updated_at on public.school_registration_forms;
create trigger set_school_registration_forms_updated_at
before update on public.school_registration_forms
for each row execute function public.set_updated_at();

create table if not exists public.school_registration_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.school_registration_forms(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null default 'text' check (field_type in ('text', 'phone', 'email', 'number', 'date', 'select', 'textarea')),
  required boolean not null default true,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(form_id, field_key)
);

create index if not exists school_registration_fields_form_order_idx
  on public.school_registration_fields(form_id, enabled, sort_order, created_at);

drop trigger if exists set_school_registration_fields_updated_at on public.school_registration_fields;
create trigger set_school_registration_fields_updated_at
before update on public.school_registration_fields
for each row execute function public.set_updated_at();

create table if not exists public.school_student_registrations (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  form_id uuid references public.school_registration_forms(id) on delete set null,
  chat_session_id uuid references public.chat_sessions(id) on delete set null,
  student_name text,
  student_phone text,
  student_email text,
  parent_name text,
  parent_phone text,
  parent_email text,
  class_applying_for text,
  status text not null default 'collecting_info' check (status in ('collecting_info', 'pending_payment', 'payment_failed', 'pending_approval', 'paid_pending_approval', 'submitted', 'approved', 'rejected', 'cancelled')),
  payment_status text not null default 'not_required' check (payment_status in ('not_required', 'unpaid', 'pending', 'paid', 'failed', 'refunded')),
  approval_status text not null default 'not_required' check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  answers jsonb not null default '{}'::jsonb,
  admin_notes text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_student_registrations_chatbot_status_idx
  on public.school_student_registrations(chatbot_id, status, created_at desc);
create index if not exists school_student_registrations_chat_session_idx
  on public.school_student_registrations(chat_session_id, created_at desc);
create index if not exists school_student_registrations_parent_phone_idx
  on public.school_student_registrations(chatbot_id, parent_phone, created_at desc);
create index if not exists school_student_registrations_student_name_idx
  on public.school_student_registrations(chatbot_id, student_name, created_at desc);

drop trigger if exists set_school_student_registrations_updated_at on public.school_student_registrations;
create trigger set_school_student_registrations_updated_at
before update on public.school_student_registrations
for each row execute function public.set_updated_at();

create table if not exists public.school_registration_payments (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  registration_id uuid not null references public.school_student_registrations(id) on delete cascade,
  customer_phone text,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'RWF',
  provider text not null default 'replysuite_mobile_payment_worker',
  provider_ref text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
  raw_response jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_registration_payments_registration_idx
  on public.school_registration_payments(registration_id, created_at desc);
create index if not exists school_registration_payments_chatbot_phone_idx
  on public.school_registration_payments(chatbot_id, customer_phone, created_at desc);
create index if not exists school_registration_payments_provider_ref_idx
  on public.school_registration_payments(provider_ref, created_at desc);

drop trigger if exists set_school_registration_payments_updated_at on public.school_registration_payments;
create trigger set_school_registration_payments_updated_at
before update on public.school_registration_payments
for each row execute function public.set_updated_at();

create table if not exists public.school_registration_events (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.school_student_registrations(id) on delete cascade,
  chatbot_id uuid references public.chatbots(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists school_registration_events_registration_idx
  on public.school_registration_events(registration_id, created_at desc);
create index if not exists school_registration_events_chatbot_idx
  on public.school_registration_events(chatbot_id, created_at desc);

-- Default fixed fields for a form.
create or replace function public.seed_school_registration_default_fields(target_form_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.school_registration_fields (form_id, field_key, label, field_type, required, enabled, sort_order)
  values
    (target_form_id, 'student_name', 'Student full name', 'text', true, true, 10),
    (target_form_id, 'date_of_birth', 'Date of birth / age', 'text', false, true, 20),
    (target_form_id, 'gender', 'Gender', 'select', false, true, 30),
    (target_form_id, 'class_applying_for', 'Class / grade applying for', 'text', true, true, 40),
    (target_form_id, 'previous_school', 'Previous school', 'text', false, true, 50),
    (target_form_id, 'parent_name', 'Parent / guardian full name', 'text', true, true, 60),
    (target_form_id, 'parent_phone', 'Parent / guardian phone', 'phone', true, true, 70),
    (target_form_id, 'parent_email', 'Parent / guardian email', 'email', false, true, 80),
    (target_form_id, 'home_address', 'Home address', 'textarea', false, true, 90),
    (target_form_id, 'emergency_contact', 'Emergency contact', 'phone', false, true, 100),
    (target_form_id, 'notes', 'Notes', 'textarea', false, true, 110)
  on conflict (form_id, field_key) do nothing;
end;
$$;

-- RLS: owners manage dashboard records; service role handles runtime automation.
alter table public.school_registration_forms enable row level security;
alter table public.school_registration_fields enable row level security;
alter table public.school_student_registrations enable row level security;
alter table public.school_registration_payments enable row level security;
alter table public.school_registration_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'school_registration_forms',
    'school_student_registrations',
    'school_registration_payments',
    'school_registration_events'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_owner', t);
    execute format($policy$
      create policy %I on public.%I
      for select to authenticated
      using (exists (
        select 1 from public.chatbots c
        where c.id = %I.chatbot_id
          and c.user_id = (select auth.uid())
          and c.deleted_at is null
      ))
    $policy$, t || '_select_owner', t, t);

    execute format('drop policy if exists %I on public.%I', t || '_insert_owner', t);
    execute format($policy$
      create policy %I on public.%I
      for insert to authenticated
      with check (exists (
        select 1 from public.chatbots c
        where c.id = %I.chatbot_id
          and c.user_id = (select auth.uid())
          and c.deleted_at is null
      ))
    $policy$, t || '_insert_owner', t, t);

    execute format('drop policy if exists %I on public.%I', t || '_update_owner', t);
    execute format($policy$
      create policy %I on public.%I
      for update to authenticated
      using (exists (
        select 1 from public.chatbots c
        where c.id = %I.chatbot_id
          and c.user_id = (select auth.uid())
          and c.deleted_at is null
      ))
      with check (exists (
        select 1 from public.chatbots c
        where c.id = %I.chatbot_id
          and c.user_id = (select auth.uid())
          and c.deleted_at is null
      ))
    $policy$, t || '_update_owner', t, t, t);

    execute format('drop policy if exists %I on public.%I', t || '_delete_owner', t);
    execute format($policy$
      create policy %I on public.%I
      for delete to authenticated
      using (exists (
        select 1 from public.chatbots c
        where c.id = %I.chatbot_id
          and c.user_id = (select auth.uid())
          and c.deleted_at is null
      ))
    $policy$, t || '_delete_owner', t, t);
  end loop;
end $$;

-- Field rows inherit ownership through their parent form.
drop policy if exists school_registration_fields_select_owner on public.school_registration_fields;
create policy school_registration_fields_select_owner on public.school_registration_fields
for select to authenticated
using (exists (
  select 1 from public.school_registration_forms f
  join public.chatbots c on c.id = f.chatbot_id
  where f.id = school_registration_fields.form_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists school_registration_fields_insert_owner on public.school_registration_fields;
create policy school_registration_fields_insert_owner on public.school_registration_fields
for insert to authenticated
with check (exists (
  select 1 from public.school_registration_forms f
  join public.chatbots c on c.id = f.chatbot_id
  where f.id = school_registration_fields.form_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists school_registration_fields_update_owner on public.school_registration_fields;
create policy school_registration_fields_update_owner on public.school_registration_fields
for update to authenticated
using (exists (
  select 1 from public.school_registration_forms f
  join public.chatbots c on c.id = f.chatbot_id
  where f.id = school_registration_fields.form_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
))
with check (exists (
  select 1 from public.school_registration_forms f
  join public.chatbots c on c.id = f.chatbot_id
  where f.id = school_registration_fields.form_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists school_registration_fields_delete_owner on public.school_registration_fields;
create policy school_registration_fields_delete_owner on public.school_registration_fields
for delete to authenticated
using (exists (
  select 1 from public.school_registration_forms f
  join public.chatbots c on c.id = f.chatbot_id
  where f.id = school_registration_fields.form_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

grant select, insert, update, delete on table
  public.school_registration_forms,
  public.school_registration_fields,
  public.school_student_registrations,
  public.school_registration_payments,
  public.school_registration_events
to authenticated;

grant execute on function public.seed_school_registration_default_fields(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
