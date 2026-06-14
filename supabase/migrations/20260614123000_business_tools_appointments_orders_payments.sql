begin;

-- ReplySuite production business tools foundation:
-- appointments, orders, and optional Paypack payments attached to those records.
-- Invoice automation is intentionally excluded from this toolset.

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
-- Appointment domain
-- ─────────────────────────────────────────────────────────────
create table if not exists public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 30 check (duration_minutes > 0 and duration_minutes <= 1440),
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'RWF',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointment_services_chatbot_idx on public.appointment_services(chatbot_id, is_active, sort_order);

drop trigger if exists set_appointment_services_updated_at on public.appointment_services;
create trigger set_appointment_services_updated_at
before update on public.appointment_services
for each row execute function public.set_updated_at();

create table if not exists public.appointment_staff (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointment_staff_chatbot_idx on public.appointment_staff(chatbot_id, is_active);

drop trigger if exists set_appointment_staff_updated_at on public.appointment_staff;
create trigger set_appointment_staff_updated_at
before update on public.appointment_staff
for each row execute function public.set_updated_at();

create table if not exists public.appointment_availability_rules (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  staff_id uuid references public.appointment_staff(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'Africa/Kigali',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

create index if not exists appointment_availability_rules_chatbot_idx on public.appointment_availability_rules(chatbot_id, weekday, is_active);
create index if not exists appointment_availability_rules_staff_idx on public.appointment_availability_rules(staff_id, weekday, is_active);

drop trigger if exists set_appointment_availability_rules_updated_at on public.appointment_availability_rules;
create trigger set_appointment_availability_rules_updated_at
before update on public.appointment_availability_rules
for each row execute function public.set_updated_at();

create table if not exists public.chatbot_appointments (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  service_id uuid references public.appointment_services(id) on delete set null,
  staff_id uuid references public.appointment_staff(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  appointment_start timestamptz,
  appointment_end timestamptz,
  appointment_time timestamptz,
  timezone text not null default 'Africa/Kigali',
  status text not null default 'pending',
  payment_status text not null default 'not_required',
  deposit_required boolean not null default false,
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  currency text not null default 'RWF',
  notes text,
  internal_notes text,
  source_channel text not null default 'web',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (appointment_end is null or appointment_start is null or appointment_end > appointment_start)
);

alter table public.chatbot_appointments add column if not exists session_id uuid references public.chat_sessions(id) on delete set null;
alter table public.chatbot_appointments add column if not exists service_id uuid references public.appointment_services(id) on delete set null;
alter table public.chatbot_appointments add column if not exists staff_id uuid references public.appointment_staff(id) on delete set null;
alter table public.chatbot_appointments add column if not exists customer_email text;
alter table public.chatbot_appointments add column if not exists appointment_start timestamptz;
alter table public.chatbot_appointments add column if not exists appointment_end timestamptz;
alter table public.chatbot_appointments add column if not exists appointment_time timestamptz;
alter table public.chatbot_appointments add column if not exists timezone text not null default 'Africa/Kigali';
alter table public.chatbot_appointments add column if not exists payment_status text not null default 'not_required';
alter table public.chatbot_appointments add column if not exists deposit_required boolean not null default false;
alter table public.chatbot_appointments add column if not exists deposit_amount numeric(12,2) not null default 0;
alter table public.chatbot_appointments add column if not exists currency text not null default 'RWF';
alter table public.chatbot_appointments add column if not exists notes text;
alter table public.chatbot_appointments add column if not exists internal_notes text;
alter table public.chatbot_appointments add column if not exists source_channel text not null default 'web';
alter table public.chatbot_appointments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.chatbot_appointments add column if not exists updated_at timestamptz not null default now();

-- Older live schemas made these customer fields required. The production
-- workflow should allow drafts/imported records while the tool handlers still
-- validate required customer details before creating customer-facing records.
alter table public.chatbot_appointments alter column customer_name drop not null;
alter table public.chatbot_appointments alter column customer_phone drop not null;
alter table public.chatbot_appointments alter column appointment_time drop not null;

do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.chatbot_appointments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ~ '(status|payment_status|source_channel)'
  loop
    execute format('alter table public.chatbot_appointments drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.chatbot_appointments
  add constraint chatbot_appointments_status_check
  check (status in ('pending', 'pending_payment', 'paid_pending_approval', 'approved', 'rejected', 'rescheduled', 'cancelled', 'completed', 'no_show'));
alter table public.chatbot_appointments
  add constraint chatbot_appointments_payment_status_check
  check (payment_status in ('not_required', 'unpaid', 'pending', 'paid', 'failed', 'refunded'));
alter table public.chatbot_appointments
  add constraint chatbot_appointments_source_channel_check
  check (source_channel in ('web', 'whatsapp', 'instagram', 'dashboard', 'test'));

create index if not exists chatbot_appointments_chatbot_status_idx on public.chatbot_appointments(chatbot_id, status, appointment_start);
create index if not exists chatbot_appointments_session_idx on public.chatbot_appointments(session_id);

drop trigger if exists set_chatbot_appointments_updated_at on public.chatbot_appointments;
create trigger set_chatbot_appointments_updated_at
before update on public.chatbot_appointments
for each row execute function public.set_updated_at();

create table if not exists public.appointment_status_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.chatbot_appointments(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  status_from text,
  status_to text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists appointment_status_events_appointment_idx on public.appointment_status_events(appointment_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Order domain
-- ─────────────────────────────────────────────────────────────
create table if not exists public.chatbot_catalog (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  name text not null,
  description text,
  category text,
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'RWF',
  image_url text,
  sku text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chatbot_catalog add column if not exists description text;
alter table public.chatbot_catalog add column if not exists category text;
alter table public.chatbot_catalog add column if not exists price numeric(12,2) not null default 0;
alter table public.chatbot_catalog add column if not exists currency text not null default 'RWF';
alter table public.chatbot_catalog add column if not exists image_url text;
alter table public.chatbot_catalog add column if not exists sku text;
alter table public.chatbot_catalog add column if not exists is_available boolean not null default true;
alter table public.chatbot_catalog add column if not exists sort_order integer not null default 0;
alter table public.chatbot_catalog add column if not exists updated_at timestamptz not null default now();
alter table public.chatbot_catalog alter column price set default 0;
update public.chatbot_catalog set is_available = true where is_available is null;
alter table public.chatbot_catalog alter column is_available set not null;

create index if not exists chatbot_catalog_chatbot_available_idx on public.chatbot_catalog(chatbot_id, is_available, category, sort_order);

drop trigger if exists set_chatbot_catalog_updated_at on public.chatbot_catalog;
create trigger set_chatbot_catalog_updated_at
before update on public.chatbot_catalog
for each row execute function public.set_updated_at();

create table if not exists public.chatbot_orders (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  order_type text not null default 'pickup',
  delivery_address text,
  status text not null default 'draft',
  payment_status text not null default 'not_required',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  currency text not null default 'RWF',
  notes text,
  internal_notes text,
  source_channel text not null default 'web',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chatbot_orders add column if not exists session_id uuid references public.chat_sessions(id) on delete set null;
alter table public.chatbot_orders add column if not exists customer_email text;
alter table public.chatbot_orders add column if not exists order_type text not null default 'pickup';
alter table public.chatbot_orders add column if not exists delivery_address text;
alter table public.chatbot_orders add column if not exists payment_status text not null default 'not_required';
alter table public.chatbot_orders add column if not exists subtotal numeric(12,2) not null default 0;
alter table public.chatbot_orders add column if not exists tax_amount numeric(12,2) not null default 0;
alter table public.chatbot_orders add column if not exists delivery_fee numeric(12,2) not null default 0;
alter table public.chatbot_orders add column if not exists total_amount numeric(12,2) not null default 0;
alter table public.chatbot_orders add column if not exists currency text not null default 'RWF';
alter table public.chatbot_orders add column if not exists notes text;
alter table public.chatbot_orders add column if not exists internal_notes text;
alter table public.chatbot_orders add column if not exists source_channel text not null default 'web';
alter table public.chatbot_orders add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.chatbot_orders add column if not exists updated_at timestamptz not null default now();

-- Older live schemas stored order items as a required JSONB column on
-- chatbot_orders. New orders store line items in chatbot_order_items, so the
-- legacy column must not block inserts that omit it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chatbot_orders'
      and column_name = 'items'
  ) then
    alter table public.chatbot_orders alter column items set default '[]'::jsonb;
    alter table public.chatbot_orders alter column items drop not null;
  end if;
end $$;

alter table public.chatbot_orders alter column customer_phone drop not null;
alter table public.chatbot_orders alter column total_amount set default 0;

do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.chatbot_orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ~ '(status|payment_status|source_channel|order_type)'
  loop
    execute format('alter table public.chatbot_orders drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.chatbot_orders
  add constraint chatbot_orders_status_check
  check (status in ('draft', 'pending', 'pending_payment', 'paid_pending_approval', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'refunded'));
alter table public.chatbot_orders
  add constraint chatbot_orders_payment_status_check
  check (payment_status in ('not_required', 'unpaid', 'pending', 'paid', 'failed', 'refunded'));
alter table public.chatbot_orders
  add constraint chatbot_orders_source_channel_check
  check (source_channel in ('web', 'whatsapp', 'instagram', 'dashboard', 'test'));
alter table public.chatbot_orders
  add constraint chatbot_orders_order_type_check
  check (order_type in ('pickup', 'delivery', 'shipping', 'digital', 'in_store'));

create index if not exists chatbot_orders_chatbot_status_idx on public.chatbot_orders(chatbot_id, status, created_at desc);
create index if not exists chatbot_orders_session_idx on public.chatbot_orders(session_id);

drop trigger if exists set_chatbot_orders_updated_at on public.chatbot_orders;
create trigger set_chatbot_orders_updated_at
before update on public.chatbot_orders
for each row execute function public.set_updated_at();

create table if not exists public.chatbot_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.chatbot_orders(id) on delete cascade,
  catalog_item_id uuid references public.chatbot_catalog(id) on delete set null,
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  line_total numeric(12,2) not null default 0 check (line_total >= 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.chatbot_order_items add column if not exists catalog_item_id uuid references public.chatbot_catalog(id) on delete set null;
alter table public.chatbot_order_items add column if not exists name text;
alter table public.chatbot_order_items add column if not exists quantity integer not null default 1;
alter table public.chatbot_order_items add column if not exists unit_price numeric(12,2) not null default 0;
alter table public.chatbot_order_items add column if not exists line_total numeric(12,2) not null default 0;
alter table public.chatbot_order_items add column if not exists notes text;

update public.chatbot_order_items
set name = coalesce(name, 'Item')
where name is null;

alter table public.chatbot_order_items alter column name set not null;

create index if not exists chatbot_order_items_order_idx on public.chatbot_order_items(order_id);

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.chatbot_orders(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  status_from text,
  status_to text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists order_status_events_order_idx on public.order_status_events(order_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Payment add-on domain (attached to appointments or orders)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.chatbot_payment_providers (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  provider text not null default 'paypack' check (provider in ('paypack')),
  client_id text,
  encrypted_client_secret text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chatbot_id, provider)
);

create index if not exists chatbot_payment_providers_chatbot_idx on public.chatbot_payment_providers(chatbot_id, provider, is_active);

drop trigger if exists set_chatbot_payment_providers_updated_at on public.chatbot_payment_providers;
create trigger set_chatbot_payment_providers_updated_at
before update on public.chatbot_payment_providers
for each row execute function public.set_updated_at();

create table if not exists public.chatbot_payments (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  target_type text not null check (target_type in ('appointment', 'order')),
  target_id uuid not null,
  provider text not null default 'paypack' check (provider in ('paypack')),
  provider_ref text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'RWF',
  phone text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chatbot_id, target_type, target_id, provider_ref)
);

create index if not exists chatbot_payments_chatbot_status_idx on public.chatbot_payments(chatbot_id, status, created_at desc);
create index if not exists chatbot_payments_target_idx on public.chatbot_payments(target_type, target_id, status);

drop trigger if exists set_chatbot_payments_updated_at on public.chatbot_payments;
create trigger set_chatbot_payments_updated_at
before update on public.chatbot_payments
for each row execute function public.set_updated_at();

create table if not exists public.payment_status_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.chatbot_payments(id) on delete cascade,
  status_from text,
  status_to text not null,
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_status_events_payment_idx on public.payment_status_events(payment_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Tool observability
-- ─────────────────────────────────────────────────────────────
create table if not exists public.chatbot_tool_events (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  message_id uuid references public.chat_messages(id) on delete set null,
  tool_name text not null,
  target_type text,
  target_id uuid,
  arguments jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  status text not null default 'success' check (status in ('success', 'error', 'skipped')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists chatbot_tool_events_chatbot_idx on public.chatbot_tool_events(chatbot_id, created_at desc);
create index if not exists chatbot_tool_events_session_idx on public.chatbot_tool_events(session_id, created_at desc);
create index if not exists chatbot_tool_events_target_idx on public.chatbot_tool_events(target_type, target_id);

-- Keep cross-record references inside the same chatbot scope. RLS protects rows,
-- while these triggers protect data integrity for nullable child references.
create or replace function public.validate_business_tool_scope()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'appointment_availability_rules' then
    if new.staff_id is not null and not exists (
      select 1 from public.appointment_staff s
      where s.id = new.staff_id and s.chatbot_id = new.chatbot_id
    ) then
      raise exception 'appointment staff must belong to the same chatbot';
    end if;
  elsif tg_table_name = 'chatbot_appointments' then
    if new.service_id is not null and not exists (
      select 1 from public.appointment_services s
      where s.id = new.service_id and s.chatbot_id = new.chatbot_id
    ) then
      raise exception 'appointment service must belong to the same chatbot';
    end if;

    if new.staff_id is not null and not exists (
      select 1 from public.appointment_staff s
      where s.id = new.staff_id and s.chatbot_id = new.chatbot_id
    ) then
      raise exception 'appointment staff must belong to the same chatbot';
    end if;
  elsif tg_table_name = 'chatbot_order_items' then
    if new.catalog_item_id is not null and not exists (
      select 1
      from public.chatbot_orders o
      join public.chatbot_catalog c on c.id = new.catalog_item_id and c.chatbot_id = o.chatbot_id
      where o.id = new.order_id
    ) then
      raise exception 'catalog item must belong to the same chatbot as the order';
    end if;
  elsif tg_table_name = 'chatbot_payments' then
    if new.target_type = 'appointment' and not exists (
      select 1 from public.chatbot_appointments a
      where a.id = new.target_id and a.chatbot_id = new.chatbot_id
    ) then
      raise exception 'payment appointment target must belong to the same chatbot';
    end if;

    if new.target_type = 'order' and not exists (
      select 1 from public.chatbot_orders o
      where o.id = new.target_id and o.chatbot_id = new.chatbot_id
    ) then
      raise exception 'payment order target must belong to the same chatbot';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_appointment_availability_rules_scope on public.appointment_availability_rules;
create trigger validate_appointment_availability_rules_scope
before insert or update on public.appointment_availability_rules
for each row execute function public.validate_business_tool_scope();

drop trigger if exists validate_chatbot_appointments_scope on public.chatbot_appointments;
create trigger validate_chatbot_appointments_scope
before insert or update on public.chatbot_appointments
for each row execute function public.validate_business_tool_scope();

drop trigger if exists validate_chatbot_order_items_scope on public.chatbot_order_items;
create trigger validate_chatbot_order_items_scope
before insert or update on public.chatbot_order_items
for each row execute function public.validate_business_tool_scope();

drop trigger if exists validate_chatbot_payments_scope on public.chatbot_payments;
create trigger validate_chatbot_payments_scope
before insert or update on public.chatbot_payments
for each row execute function public.validate_business_tool_scope();

-- ─────────────────────────────────────────────────────────────
-- RLS policies
-- ─────────────────────────────────────────────────────────────
alter table public.appointment_services enable row level security;
alter table public.appointment_staff enable row level security;
alter table public.appointment_availability_rules enable row level security;
alter table public.chatbot_appointments enable row level security;
alter table public.appointment_status_events enable row level security;
alter table public.chatbot_catalog enable row level security;
alter table public.chatbot_orders enable row level security;
alter table public.chatbot_order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.chatbot_payment_providers enable row level security;
alter table public.chatbot_payments enable row level security;
alter table public.payment_status_events enable row level security;
alter table public.chatbot_tool_events enable row level security;

-- Expose only the required business tables to Supabase Data API.
-- RLS policies below still restrict every row to the owning chatbot user.
-- Start by removing broad/default privileges so status logs and encrypted
-- payment providers cannot be mutated directly from browser roles.
revoke all on table
  public.appointment_services,
  public.appointment_staff,
  public.appointment_availability_rules,
  public.chatbot_appointments,
  public.appointment_status_events,
  public.chatbot_catalog,
  public.chatbot_orders,
  public.chatbot_order_items,
  public.order_status_events,
  public.chatbot_payment_providers,
  public.chatbot_payments,
  public.payment_status_events,
  public.chatbot_tool_events
  from anon, authenticated;

grant select, insert, update, delete on table
  public.appointment_services,
  public.appointment_staff,
  public.appointment_availability_rules,
  public.chatbot_appointments,
  public.chatbot_catalog,
  public.chatbot_orders,
  public.chatbot_order_items
  to authenticated;

grant select on table
  public.appointment_status_events,
  public.order_status_events,
  public.chatbot_payments,
  public.payment_status_events,
  public.chatbot_tool_events
  to authenticated;

-- Do not grant browser access to public.chatbot_payment_providers; encrypted Paypack
-- credentials are managed only through server endpoints and service role access.

-- Browser-manageable chatbot-owned setup/queue tables.
do $$
declare
  t text;
begin
  foreach t in array array[
    'appointment_services',
    'appointment_staff',
    'appointment_availability_rules',
    'chatbot_appointments',
    'chatbot_catalog',
    'chatbot_orders'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_owner', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_owner', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_owner', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_owner', t);

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

-- Payment provider credentials remain server-only. Owners can see payments/tool events, but credentials have no browser policy.
drop policy if exists chatbot_payments_select_owner on public.chatbot_payments;
create policy chatbot_payments_select_owner on public.chatbot_payments
for select to authenticated
using (exists (
  select 1 from public.chatbots c
  where c.id = chatbot_payments.chatbot_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists chatbot_tool_events_select_owner on public.chatbot_tool_events;
create policy chatbot_tool_events_select_owner on public.chatbot_tool_events
for select to authenticated
using (exists (
  select 1 from public.chatbots c
  where c.id = chatbot_tool_events.chatbot_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

-- Child tables inherit visibility through their parent record.
drop policy if exists chatbot_order_items_select_owner on public.chatbot_order_items;
create policy chatbot_order_items_select_owner on public.chatbot_order_items
for select to authenticated
using (exists (
  select 1 from public.chatbot_orders o
  join public.chatbots c on c.id = o.chatbot_id
  where o.id = chatbot_order_items.order_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists chatbot_order_items_insert_owner on public.chatbot_order_items;
create policy chatbot_order_items_insert_owner on public.chatbot_order_items
for insert to authenticated
with check (exists (
  select 1 from public.chatbot_orders o
  join public.chatbots c on c.id = o.chatbot_id
  where o.id = chatbot_order_items.order_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists chatbot_order_items_update_owner on public.chatbot_order_items;
create policy chatbot_order_items_update_owner on public.chatbot_order_items
for update to authenticated
using (exists (
  select 1 from public.chatbot_orders o
  join public.chatbots c on c.id = o.chatbot_id
  where o.id = chatbot_order_items.order_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
))
with check (exists (
  select 1 from public.chatbot_orders o
  join public.chatbots c on c.id = o.chatbot_id
  where o.id = chatbot_order_items.order_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists chatbot_order_items_delete_owner on public.chatbot_order_items;
create policy chatbot_order_items_delete_owner on public.chatbot_order_items
for delete to authenticated
using (exists (
  select 1 from public.chatbot_orders o
  join public.chatbots c on c.id = o.chatbot_id
  where o.id = chatbot_order_items.order_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists order_status_events_select_owner on public.order_status_events;
create policy order_status_events_select_owner on public.order_status_events
for select to authenticated
using (exists (
  select 1 from public.chatbot_orders o
  join public.chatbots c on c.id = o.chatbot_id
  where o.id = order_status_events.order_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists appointment_status_events_select_owner on public.appointment_status_events;
create policy appointment_status_events_select_owner on public.appointment_status_events
for select to authenticated
using (exists (
  select 1 from public.chatbot_appointments a
  join public.chatbots c on c.id = a.chatbot_id
  where a.id = appointment_status_events.appointment_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists payment_status_events_select_owner on public.payment_status_events;
create policy payment_status_events_select_owner on public.payment_status_events
for select to authenticated
using (exists (
  select 1 from public.chatbot_payments p
  join public.chatbots c on c.id = p.chatbot_id
  where p.id = payment_status_events.payment_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

notify pgrst, 'reload schema';

commit;