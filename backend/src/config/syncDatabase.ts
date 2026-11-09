import type { Sequelize } from "sequelize";

const schemaSetupStatements = [
  `alter table public.users enable row level security`,
  `alter table public.stores enable row level security`,
  `alter table public.products enable row level security`,
  `alter table public.service_providers enable row level security`,
  `alter table public.services enable row level security`,
  `alter table public.negotiations enable row level security`,
  `alter table public.messages enable row level security`,
  `alter table public.reviews enable row level security`,
  `revoke all on public.users, public.negotiations, public.messages, public.reviews from anon, authenticated`,
  `revoke insert, update, delete on public.stores, public.products, public.service_providers, public.services from anon, authenticated`,
  `grant select on public.stores, public.products, public.service_providers, public.services to anon, authenticated`,
  `drop policy if exists "Public can read verified stores" on public.stores`,
  `create policy "Public can read verified stores" on public.stores for select to anon, authenticated using (verified)`,
  `drop policy if exists "Public can read products from verified stores" on public.products`,
  `create policy "Public can read products from verified stores" on public.products for select to anon, authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.verified))`,
  `drop policy if exists "Public and owners can read platform providers" on public.service_providers`,
  `drop policy if exists "Public can read platform providers" on public.service_providers`,
  `create policy "Public can read platform providers" on public.service_providers for select to anon, authenticated using (platform_member or user_id = auth.uid())`,
  `drop policy if exists "Public can read published platform services" on public.services`,
  `create policy "Public can read published platform services" on public.services for select to anon, authenticated using (published and internal_platform_service and exists (select 1 from public.service_providers p where p.id = provider_id and p.platform_member))`,
  `drop policy if exists "Public can read reviews" on public.reviews`,
  `create policy "Public can read reviews" on public.reviews for select to anon, authenticated using (true)`,
  `drop policy if exists "Users read own profile" on public.users`,
  `create policy "Users read own profile" on public.users for select to authenticated using (id = auth.uid())`,
  `drop policy if exists "Users read own negotiations" on public.negotiations`,
  `create policy "Users read own negotiations" on public.negotiations for select to authenticated using (client_id = auth.uid() or exists (select 1 from public.service_providers p where p.id = provider_id and p.user_id = auth.uid()))`,
  `drop policy if exists "Participants read negotiation messages" on public.messages`,
  `create policy "Participants read negotiation messages" on public.messages for select to authenticated using (exists (select 1 from public.negotiations n left join public.service_providers p on p.id = n.provider_id where n.id = negotiation_id and (n.client_id = auth.uid() or p.user_id = auth.uid())))`,
  `create or replace view public.public_reviews as select target_type, target_id, rating, comment, created_at from public.reviews`,
  `grant select on public.public_reviews to anon, authenticated`,
  `notify pgrst, 'reload schema'`
];

export async function syncDatabaseSchema(sequelize: Sequelize): Promise<void> {
  await sequelize.sync();
  for (const statement of schemaSetupStatements) {
    await sequelize.query(statement);
  }
}
