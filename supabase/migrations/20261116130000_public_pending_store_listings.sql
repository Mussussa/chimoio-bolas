drop policy if exists "Public can read verified stores" on public.stores;
drop policy if exists "Public can read stores" on public.stores;
create policy "Public can read stores" on public.stores
  for select to anon, authenticated using (true);

drop policy if exists "Public can read products from verified stores" on public.products;
drop policy if exists "Public can read products" on public.products;
create policy "Public can read products" on public.products
  for select to anon, authenticated using (true);

notify pgrst, 'reload schema';
