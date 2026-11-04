create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('client', 'lojista', 'prestador', 'admin');
create type public.negotiation_status as enum ('pending', 'accepted', 'rejected', 'completed');
create type public.message_type as enum ('text', 'proposal', 'system_alert');
create type public.review_target_type as enum ('store', 'service_provider');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name varchar(120) not null,
  email varchar(255) not null unique,
  phone text,
  role public.user_role not null default 'client',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.users(id) on delete cascade,
  name varchar(160) not null,
  slug varchar(180) not null unique,
  category varchar(100) not null,
  description text not null,
  address text not null,
  latitude numeric(10,7) not null check (latitude between -90 and 90),
  longitude numeric(10,7) not null check (longitude between -180 and 180),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name varchar(160) not null,
  description text not null,
  price numeric(12,2) not null check (price > 0),
  category varchar(100) not null,
  variants jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  min_order_qty integer not null default 1 check (min_order_qty > 0),
  created_at timestamptz not null default now()
);

create table public.service_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  category varchar(100) not null,
  bio text not null,
  base_price numeric(12,2) not null check (base_price >= 0),
  verified boolean not null default false,
  platform_member boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  title varchar(180) not null,
  description text not null,
  price numeric(12,2) not null check (price >= 0),
  delivery_time varchar(100) not null,
  published boolean not null default false,
  internal_platform_service boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.negotiations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id),
  provider_id uuid not null references public.service_providers(id),
  service_id uuid not null references public.services(id),
  status public.negotiation_status not null default 'pending',
  agreed_price numeric(12,2) check (agreed_price is null or agreed_price > 0),
  client_proof_file text,
  provider_proof_file text,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.negotiations(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  content text not null,
  proposal_amount numeric(12,2) check (proposal_amount is null or proposal_amount > 0),
  message_type public.message_type not null default 'text',
  created_at timestamptz not null default now(),
  check ((message_type = 'proposal') = (proposal_amount is not null))
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id),
  target_type public.review_target_type not null,
  target_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (client_id, target_type, target_id)
);

create index stores_location_idx on public.stores (latitude, longitude);
create index products_store_idx on public.products (store_id);
create index services_public_idx on public.services (published, provider_id);
create index messages_negotiation_date_idx on public.messages (negotiation_id, created_at);

alter table public.users enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.service_providers enable row level security;
alter table public.services enable row level security;
alter table public.negotiations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

revoke all on public.users, public.negotiations, public.messages, public.reviews
  from anon, authenticated;
revoke insert, update, delete on public.stores, public.products, public.service_providers, public.services
  from anon, authenticated;
grant select on public.stores, public.products, public.service_providers, public.services to anon, authenticated;

create policy "Public can read verified stores" on public.stores
  for select to anon, authenticated using (verified);
create policy "Public can read products from verified stores" on public.products
  for select to anon, authenticated using (
    exists (select 1 from public.stores s where s.id = store_id and s.verified)
  );
create policy "Public and owners can read platform providers" on public.service_providers
  for select to anon, authenticated using (platform_member or user_id = auth.uid());
create policy "Public can read published platform services" on public.services
  for select to anon, authenticated using (
    published and internal_platform_service and exists (
      select 1 from public.service_providers p
      where p.id = provider_id and p.platform_member
    )
  );
create policy "Public can read reviews" on public.reviews
  for select to anon, authenticated using (true);

create view public.public_reviews as
  select target_type, target_id, rating, comment, created_at
  from public.reviews;
grant select on public.public_reviews to anon, authenticated;

create policy "Users read own profile" on public.users
  for select to authenticated using (id = auth.uid());
create policy "Users read own negotiations" on public.negotiations
  for select to authenticated using (
    client_id = auth.uid() or exists (
      select 1 from public.service_providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );
create policy "Participants read negotiation messages" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.negotiations n
      left join public.service_providers p on p.id = n.provider_id
      where n.id = negotiation_id and (n.client_id = auth.uid() or p.user_id = auth.uid())
    )
  );
