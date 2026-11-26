create or replace view public.public_reviews as
  select
    reviews.target_type,
    reviews.target_id,
    reviews.rating,
    reviews.comment,
    reviews.created_at,
    users.name as reviewer_name,
    users.avatar_url as reviewer_avatar_url
  from public.reviews
  left join public.users as users on users.id = reviews.client_id;

grant select on public.public_reviews to anon, authenticated;
