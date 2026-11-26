alter table public.service_providers
  add column if not exists neighborhood varchar(120);
