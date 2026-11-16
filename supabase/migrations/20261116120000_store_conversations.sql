create table if not exists public.store_conversations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  client_id uuid not null references public.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.store_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.store_conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  content text not null check (length(btrim(content)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists store_conversations_store_date_idx
  on public.store_conversations (store_id, created_at desc);
create index if not exists store_conversations_client_date_idx
  on public.store_conversations (client_id, created_at desc);
create index if not exists store_messages_conversation_date_idx
  on public.store_messages (conversation_id, created_at);

alter table public.store_conversations enable row level security;
alter table public.store_messages enable row level security;

revoke all on public.store_conversations, public.store_messages from anon, authenticated;

drop policy if exists "Participants read store conversations" on public.store_conversations;
create policy "Participants read store conversations" on public.store_conversations
  for select to authenticated using (
    client_id = auth.uid()
    or exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "Clients create store conversations" on public.store_conversations;
create policy "Clients create store conversations" on public.store_conversations
  for insert to authenticated with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.stores s
      join public.users u on u.id = auth.uid()
      where s.id = store_id and s.verified and s.owner_id <> auth.uid() and u.role = 'client'
    )
    and (
      product_id is null
      or exists (
        select 1 from public.products p
        where p.id = product_id and p.store_id = public.store_conversations.store_id
      )
    )
  );

drop policy if exists "Participants read store messages" on public.store_messages;
create policy "Participants read store messages" on public.store_messages
  for select to authenticated using (
    exists (
      select 1 from public.store_conversations c
      join public.stores s on s.id = c.store_id
      where c.id = conversation_id and (c.client_id = auth.uid() or s.owner_id = auth.uid())
    )
  );

drop policy if exists "Participants send store messages" on public.store_messages;
create policy "Participants send store messages" on public.store_messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and length(btrim(content)) between 1 and 4000
    and exists (
      select 1 from public.store_conversations c
      join public.stores s on s.id = c.store_id
      where c.id = conversation_id and (c.client_id = auth.uid() or s.owner_id = auth.uid())
    )
  );

grant select, insert on public.store_conversations, public.store_messages to authenticated;
