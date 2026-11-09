create or replace view public.map_stores as
  select id, name, category, address, latitude, longitude, verified
  from public.stores;

revoke all on public.map_stores from public, anon, authenticated;
grant select on public.map_stores to anon, authenticated;

notify pgrst, 'reload schema';
