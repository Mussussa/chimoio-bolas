alter table public.stores
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-logos',
  'store-logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read store logos" on storage.objects;
create policy "Public can read store logos" on storage.objects
  for select to public
  using (bucket_id = 'store-logos');

drop policy if exists "Store owners can upload their logos" on storage.objects;
create policy "Store owners can upload their logos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'store-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Store owners can update their logos" on storage.objects;
create policy "Store owners can update their logos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'store-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'store-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Store owners can delete their logos" on storage.objects;
create policy "Store owners can delete their logos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'store-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );