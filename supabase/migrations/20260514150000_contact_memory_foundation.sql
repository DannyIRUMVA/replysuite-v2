begin;

create table if not exists public.chatbot_contact_memories (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'web')),
  contact_key text not null,
  display_name text,
  preferred_language text,
  memory jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chatbot_id, channel, contact_key)
);

create index if not exists chatbot_contact_memories_chatbot_id_idx
  on public.chatbot_contact_memories(chatbot_id);

create index if not exists chatbot_contact_memories_channel_contact_idx
  on public.chatbot_contact_memories(channel, contact_key);

alter table public.chatbot_contact_memories enable row level security;

commit;
