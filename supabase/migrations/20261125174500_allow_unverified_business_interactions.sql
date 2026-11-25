drop policy if exists "Public can read verified stores" on public.stores;
drop policy if exists "Public can read stores" on public.stores;
create policy "Public can read stores" on public.stores
  for select to anon, authenticated using (true);

drop policy if exists "Public can read products from verified stores" on public.products;
drop policy if exists "Public can read products" on public.products;
create policy "Public can read products" on public.products
  for select to anon, authenticated using (true);

drop policy if exists "Clients create store conversations" on public.store_conversations;
drop policy if exists "Users create store conversations" on public.store_conversations;
create policy "Users create store conversations" on public.store_conversations
  for insert to authenticated with check (
    client_id = auth.uid()
    and exists (
      select 1
      from public.stores s
      join public.users u on u.id = auth.uid()
      where s.id = store_id
        and s.owner_id <> auth.uid()
        and u.role in ('client', 'lojista', 'prestador')
    )
    and (
      product_id is null
      or exists (
        select 1 from public.products p
        where p.id = product_id and p.store_id = public.store_conversations.store_id
      )
    )
  );

notify pgrst, 'reload schema';
