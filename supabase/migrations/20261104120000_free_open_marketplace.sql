drop table if exists public.campaigns;
drop table if exists public.ad_batches;

alter table public.service_providers
  drop column if exists subscription_tier,
  drop column if exists subscription_started_at,
  drop column if exists subscription_expires_at;

alter table public.negotiations
  drop column if exists escrow_status;

drop type if exists public.subscription_tier;
drop type if exists public.campaign_target_type;
drop type if exists public.campaign_package_type;
drop type if exists public.escrow_status;

update public.service_providers set platform_member = true;

drop policy if exists "Public and owners can read platform providers" on public.service_providers;
drop policy if exists "Public can read published platform services" on public.services;

create policy "Public can read platform providers" on public.service_providers
  for select to anon, authenticated using (true);

create policy "Public can read published platform services" on public.services
  for select to anon, authenticated using (published and internal_platform_service);
