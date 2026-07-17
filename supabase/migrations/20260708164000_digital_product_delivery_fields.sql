begin;

alter table public.chatbot_catalog
  add column if not exists delivery_url text,
  add column if not exists is_paid boolean not null default true,
  add column if not exists sales_notes text;

update public.chatbot_catalog
set is_paid = coalesce(is_paid, price > 0)
where is_paid is null;

create index if not exists chatbot_catalog_digital_delivery_idx
  on public.chatbot_catalog(chatbot_id, is_available, is_paid, sort_order);

commit;
