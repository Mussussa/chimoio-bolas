alter table public.users
  add column if not exists age_group varchar(10),
  add column if not exists neighborhood varchar(120);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_age_group_allowed'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_age_group_allowed
      check (age_group is null or age_group in ('18-24', '25-34', '35+'));
  end if;
end $$;
