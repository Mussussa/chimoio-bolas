do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_providers'
      and column_name = 'category'
      and data_type <> 'ARRAY'
  ) then
    alter table public.service_providers
      alter column category type text[]
      using case
        when category is null or btrim(category::text) = '' then array[]::text[]
        when category::text like '{%}' then string_to_array(trim(both '{}' from category::text), ',')
        else array[category::text]
      end;
  end if;
end $$;

alter table public.services
  add column if not exists category text not null default 'Diversos',
  add column if not exists images jsonb not null default '[]'::jsonb;

update public.services service
set category = coalesce(provider.category[1], 'Diversos')
from public.service_providers provider
where provider.id = service.provider_id
  and (service.category is null or service.category = 'Diversos');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'provider-media',
  'provider-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read provider media" on storage.objects;
create policy "Public can read provider media" on storage.objects
  for select to public
  using (bucket_id = 'provider-media');

drop policy if exists "Users can upload their provider media" on storage.objects;
create policy "Users can upload their provider media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'provider-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their provider media" on storage.objects;
create policy "Users can update their provider media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'provider-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'provider-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their provider media" on storage.objects;
create policy "Users can delete their provider media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'provider-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );