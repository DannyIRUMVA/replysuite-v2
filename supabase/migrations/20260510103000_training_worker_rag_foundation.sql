begin;

alter table public.embeddings
  add column if not exists source_id uuid references public.data_sources(id) on delete cascade,
  add column if not exists chunk_index integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists embeddings_source_id_idx on public.embeddings(source_id);
create index if not exists training_jobs_status_idx on public.training_jobs(status);

alter table public.training_jobs
  add column if not exists progress integer not null default 0,
  add column if not exists progress_label text,
  add column if not exists error_message text,
  add column if not exists job_type text,
  add column if not exists data_source_id uuid references public.data_sources(id) on delete set null;

create index if not exists training_jobs_data_source_id_idx on public.training_jobs(data_source_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'training-assets',
  'training-assets',
  false,
  20971520,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/html'
  ]
where not exists (
  select 1 from storage.buckets where id = 'training-assets'
);

commit;
