begin;

-- Resumable worker reruns use upsert(source_id, chunk_index) so a retried
-- training job can safely overwrite a chunk without duplicating embeddings.
with ranked as (
  select
    id,
    row_number() over (
      partition by source_id, chunk_index
      order by created_at desc nulls last, id desc
    ) as rn
  from public.embeddings
  where source_id is not null
)
delete from public.embeddings e
using ranked r
where e.id = r.id
  and r.rn > 1;

create unique index if not exists embeddings_source_chunk_unique_idx
  on public.embeddings(source_id, chunk_index);

create index if not exists training_jobs_retry_status_idx
  on public.training_jobs(status, started_at)
  where status in ('queued', 'processing', 'retry_wait');

commit;
