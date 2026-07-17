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
-- Business commerce: products, orders, payments, protected links
-- ─────────────────────────────────────────────────────────────
create table if not exists public.business_products (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  category text,
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'RWF',
  product_type text not null default 'digital' check (product_type in ('digital', 'service', 'physical')),
  file_key text,
  image_url text,
  is_paid boolean not null default true,
  is_active boolean not null default true,
  sales_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_products_chatbot_active_idx on public.business_products(chatbot_id, is_active, created_at desc);

drop trigger if exists set_business_products_updated_at on public.business_products;
create trigger set_business_products_updated_at
before update on public.business_products
for each row execute function public.set_updated_at();

create table if not exists public.business_orders (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  chat_session_id uuid references public.chat_sessions(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  status text not null default 'draft' check (status in ('draft', 'pending_payment', 'paid', 'completed', 'cancelled', 'refunded')),
  payment_status text not null default 'not_required' check (payment_status in ('not_required', 'unpaid', 'pending', 'paid', 'failed', 'refunded')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  currency text not null default 'RWF',
  source_channel text not null default 'web' check (source_channel in ('web', 'whatsapp', 'instagram', 'dashboard', 'test')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_orders_chatbot_status_idx on public.business_orders(chatbot_id, status, created_at desc);
create index if not exists business_orders_chat_session_idx on public.business_orders(chat_session_id, created_at desc);
create index if not exists business_orders_customer_phone_idx on public.business_orders(chatbot_id, customer_phone, created_at desc);

drop trigger if exists set_business_orders_updated_at on public.business_orders;
create trigger set_business_orders_updated_at
before update on public.business_orders
for each row execute function public.set_updated_at();

create table if not exists public.business_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.business_orders(id) on delete cascade,
  product_id uuid references public.business_products(id) on delete set null,
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  line_total numeric(12,2) not null default 0 check (line_total >= 0),
  currency text not null default 'RWF',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists business_order_items_order_idx on public.business_order_items(order_id);

create table if not exists public.business_payments (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  order_id uuid not null references public.business_orders(id) on delete cascade,
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

create index if not exists business_payments_order_idx on public.business_payments(order_id, created_at desc);
create index if not exists business_payments_chatbot_phone_idx on public.business_payments(chatbot_id, customer_phone, created_at desc);

drop trigger if exists set_business_payments_updated_at on public.business_payments;
create trigger set_business_payments_updated_at
before update on public.business_payments
for each row execute function public.set_updated_at();

create table if not exists public.business_delivery_links (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  order_id uuid not null references public.business_orders(id) on delete cascade,
  product_id uuid references public.business_products(id) on delete set null,
  customer_phone text,
  short_code text not null unique,
  token_hash text,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'revoked', 'blocked')),
  file_key text not null,
  expires_at timestamptz,
  max_downloads integer not null default 3 check (max_downloads > 0),
  download_count integer not null default 0 check (download_count >= 0),
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_delivery_links_order_idx on public.business_delivery_links(order_id, created_at desc);
create index if not exists business_delivery_links_shortcode_idx on public.business_delivery_links(short_code);

drop trigger if exists set_business_delivery_links_updated_at on public.business_delivery_links;
create trigger set_business_delivery_links_updated_at
before update on public.business_delivery_links
for each row execute function public.set_updated_at();

create table if not exists public.business_delivery_events (
  id uuid primary key default gen_random_uuid(),
  delivery_link_id uuid references public.business_delivery_links(id) on delete cascade,
  order_id uuid references public.business_orders(id) on delete cascade,
  product_id uuid references public.business_products(id) on delete set null,
  event_type text not null check (event_type in ('created', 'opened', 'downloaded', 'blocked', 'expired', 'revoked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists business_delivery_events_link_idx on public.business_delivery_events(delivery_link_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- School tutor: chat-only paid sessions, no external access links
-- ─────────────────────────────────────────────────────────────
create table if not exists public.school_tutor_plans (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'RWF',
  duration_minutes integer not null default 30 check (duration_minutes > 0 and duration_minutes <= 1440),
  default_question_count integer not null default 10 check (default_question_count > 0 and default_question_count <= 100),
  allow_student_question_count boolean not null default true,
  min_question_count integer not null default 5 check (min_question_count > 0),
  max_question_count integer not null default 20 check (max_question_count > 0),
  quiz_delivery_mode text not null default 'let_student_choose' check (quiz_delivery_mode in ('one_by_one', 'all_at_once', 'let_student_choose')),
  passing_score_percent integer not null default 70 check (passing_score_percent between 0 and 100),
  question_style text not null default 'short_answer',
  marking_style text not null default 'balanced',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_question_count <= max_question_count)
);

create index if not exists school_tutor_plans_chatbot_active_idx on public.school_tutor_plans(chatbot_id, is_active, created_at desc);

drop trigger if exists set_school_tutor_plans_updated_at on public.school_tutor_plans;
create trigger set_school_tutor_plans_updated_at
before update on public.school_tutor_plans
for each row execute function public.set_updated_at();

create table if not exists public.school_tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  plan_id uuid references public.school_tutor_plans(id) on delete set null,
  chat_session_id uuid references public.chat_sessions(id) on delete set null,
  student_name text,
  student_phone text,
  student_email text,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'active', 'expired', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  started_at timestamptz,
  expires_at timestamptz,
  completed_at timestamptz,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_tutor_sessions_chatbot_status_idx on public.school_tutor_sessions(chatbot_id, status, created_at desc);
create index if not exists school_tutor_sessions_chat_session_idx on public.school_tutor_sessions(chat_session_id, created_at desc);
create index if not exists school_tutor_sessions_student_phone_idx on public.school_tutor_sessions(chatbot_id, student_phone, created_at desc);

drop trigger if exists set_school_tutor_sessions_updated_at on public.school_tutor_sessions;
create trigger set_school_tutor_sessions_updated_at
before update on public.school_tutor_sessions
for each row execute function public.set_updated_at();

create table if not exists public.school_tutor_payments (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  school_session_id uuid not null references public.school_tutor_sessions(id) on delete cascade,
  student_phone text,
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

create index if not exists school_tutor_payments_session_idx on public.school_tutor_payments(school_session_id, created_at desc);
create index if not exists school_tutor_payments_chatbot_phone_idx on public.school_tutor_payments(chatbot_id, student_phone, created_at desc);

drop trigger if exists set_school_tutor_payments_updated_at on public.school_tutor_payments;
create trigger set_school_tutor_payments_updated_at
before update on public.school_tutor_payments
for each row execute function public.set_updated_at();

create table if not exists public.school_tutor_messages (
  id uuid primary key default gen_random_uuid(),
  school_session_id uuid references public.school_tutor_sessions(id) on delete cascade,
  chat_session_id uuid references public.chat_sessions(id) on delete set null,
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  role text not null check (role in ('student', 'assistant', 'system')),
  content text not null,
  mode text not null default 'ask' check (mode in ('ask', 'quiz', 'feedback', 'payment', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists school_tutor_messages_session_idx on public.school_tutor_messages(school_session_id, created_at);
create index if not exists school_tutor_messages_chat_session_idx on public.school_tutor_messages(chat_session_id, created_at);

create table if not exists public.school_tutor_quizzes (
  id uuid primary key default gen_random_uuid(),
  school_session_id uuid not null references public.school_tutor_sessions(id) on delete cascade,
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  student_phone text,
  question_count integer not null check (question_count > 0 and question_count <= 100),
  delivery_mode text not null default 'one_by_one' check (delivery_mode in ('one_by_one', 'all_at_once')),
  status text not null default 'active' check (status in ('active', 'completed', 'expired', 'cancelled')),
  score numeric(8,2) not null default 0,
  max_score numeric(8,2) not null default 0,
  percentage numeric(5,2),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_tutor_quizzes_session_idx on public.school_tutor_quizzes(school_session_id, created_at desc);

drop trigger if exists set_school_tutor_quizzes_updated_at on public.school_tutor_quizzes;
create trigger set_school_tutor_quizzes_updated_at
before update on public.school_tutor_quizzes
for each row execute function public.set_updated_at();

create table if not exists public.school_tutor_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.school_tutor_quizzes(id) on delete cascade,
  school_session_id uuid not null references public.school_tutor_sessions(id) on delete cascade,
  question_number integer not null check (question_number > 0),
  question text not null,
  student_answer text,
  correct_answer text,
  is_correct boolean,
  score numeric(8,2) not null default 0,
  max_score numeric(8,2) not null default 1,
  feedback text,
  improvement text,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create unique index if not exists school_tutor_quiz_questions_unique_number_idx on public.school_tutor_quiz_questions(quiz_id, question_number);
create index if not exists school_tutor_quiz_questions_session_idx on public.school_tutor_quiz_questions(school_session_id, question_number);

create table if not exists public.school_tutor_events (
  id uuid primary key default gen_random_uuid(),
  school_session_id uuid references public.school_tutor_sessions(id) on delete cascade,
  chatbot_id uuid references public.chatbots(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists school_tutor_events_session_idx on public.school_tutor_events(school_session_id, created_at desc);

-- RLS: owners can manage via dashboard; service role bypasses for runtime automation.
alter table public.business_products enable row level security;
alter table public.business_orders enable row level security;
alter table public.business_order_items enable row level security;
alter table public.business_payments enable row level security;
alter table public.business_delivery_links enable row level security;
alter table public.business_delivery_events enable row level security;
alter table public.school_tutor_plans enable row level security;
alter table public.school_tutor_sessions enable row level security;
alter table public.school_tutor_payments enable row level security;
alter table public.school_tutor_messages enable row level security;
alter table public.school_tutor_quizzes enable row level security;
alter table public.school_tutor_quiz_questions enable row level security;
alter table public.school_tutor_events enable row level security;

-- Direct chatbot-owned tables.
do $$
declare t text;
begin
  foreach t in array array[
    'business_products',
    'business_orders',
    'business_payments',
    'business_delivery_links',
    'school_tutor_plans',
    'school_tutor_sessions',
    'school_tutor_payments',
    'school_tutor_messages',
    'school_tutor_quizzes',
    'school_tutor_events'
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

-- Child tables inherit access through parent records.
drop policy if exists business_order_items_select_owner on public.business_order_items;
create policy business_order_items_select_owner on public.business_order_items
for select to authenticated
using (exists (
  select 1 from public.business_orders o
  join public.chatbots c on c.id = o.chatbot_id
  where o.id = business_order_items.order_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists business_order_items_insert_owner on public.business_order_items;
create policy business_order_items_insert_owner on public.business_order_items
for insert to authenticated
with check (exists (
  select 1 from public.business_orders o
  join public.chatbots c on c.id = o.chatbot_id
  where o.id = business_order_items.order_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists business_order_items_update_owner on public.business_order_items;
create policy business_order_items_update_owner on public.business_order_items
for update to authenticated
using (exists (
  select 1 from public.business_orders o
  join public.chatbots c on c.id = o.chatbot_id
  where o.id = business_order_items.order_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
))
with check (exists (
  select 1 from public.business_orders o
  join public.chatbots c on c.id = o.chatbot_id
  where o.id = business_order_items.order_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists business_order_items_delete_owner on public.business_order_items;
create policy business_order_items_delete_owner on public.business_order_items
for delete to authenticated
using (exists (
  select 1 from public.business_orders o
  join public.chatbots c on c.id = o.chatbot_id
  where o.id = business_order_items.order_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists business_delivery_events_select_owner on public.business_delivery_events;
create policy business_delivery_events_select_owner on public.business_delivery_events
for select to authenticated
using (exists (
  select 1 from public.business_delivery_links l
  join public.chatbots c on c.id = l.chatbot_id
  where l.id = business_delivery_events.delivery_link_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists school_tutor_quiz_questions_select_owner on public.school_tutor_quiz_questions;
create policy school_tutor_quiz_questions_select_owner on public.school_tutor_quiz_questions
for select to authenticated
using (exists (
  select 1 from public.school_tutor_sessions s
  join public.chatbots c on c.id = s.chatbot_id
  where s.id = school_tutor_quiz_questions.school_session_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

drop policy if exists school_tutor_quiz_questions_insert_owner on public.school_tutor_quiz_questions;
create policy school_tutor_quiz_questions_insert_owner on public.school_tutor_quiz_questions
for insert to authenticated
with check (exists (
  select 1 from public.school_tutor_sessions s
  join public.chatbots c on c.id = s.chatbot_id
  where s.id = school_tutor_quiz_questions.school_session_id
    and c.user_id = (select auth.uid())
    and c.deleted_at is null
));

-- Explicit API privileges for Supabase Data API. RLS policies above still decide row access.
grant select, insert, update, delete on table
  public.business_products,
  public.business_orders,
  public.business_order_items,
  public.business_payments,
  public.business_delivery_links,
  public.business_delivery_events,
  public.school_tutor_plans,
  public.school_tutor_sessions,
  public.school_tutor_payments,
  public.school_tutor_messages,
  public.school_tutor_quizzes,
  public.school_tutor_quiz_questions,
  public.school_tutor_events
to authenticated;

notify pgrst, 'reload schema';

commit;