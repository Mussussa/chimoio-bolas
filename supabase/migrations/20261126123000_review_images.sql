alter table public.reviews
  add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-images',
  'review-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read review images" on storage.objects;
create policy "Public can read review images" on storage.objects
  for select to public
  using (bucket_id = 'review-images');

drop policy if exists "Users can upload review images" on storage.objects;
create policy "Users can upload review images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'reviews'
  );

drop policy if exists "Users can delete their review images" on storage.objects;
create policy "Users can delete their review images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'review-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'reviews'
  );

create or replace view public.public_reviews as
  select
    reviews.target_type,
    reviews.target_id,
    reviews.rating,
    reviews.comment,
    reviews.created_at,
    users.name as reviewer_name,
    users.avatar_url as reviewer_avatar_url,
    reviews.image_url
  from public.reviews
  left join public.users as users on users.id = reviews.client_id;

grant select on public.public_reviews to anon, authenticated;
