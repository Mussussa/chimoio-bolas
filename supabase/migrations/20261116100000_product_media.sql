insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read product media" on storage.objects;
create policy "Public can read product media" on storage.objects
  for select to public
  using (bucket_id = 'products');

drop policy if exists "Users can upload their product media" on storage.objects;
create policy "Users can upload their product media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'products'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
