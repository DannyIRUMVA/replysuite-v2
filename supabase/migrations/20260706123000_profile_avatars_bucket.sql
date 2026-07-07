-- Dedicated public bucket for dashboard profile avatars.
-- Uploads are performed by the Nuxt server with service-role access; public read is needed for avatar display.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read profile avatars'
  ) then
    create policy "Public read profile avatars"
    on storage.objects
    for select
    using (bucket_id = 'profile-avatars');
  end if;
end $$;
