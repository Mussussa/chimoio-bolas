create or replace function public.create_user_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'client'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.create_user_profile_from_auth() from public, anon, authenticated;

create trigger create_user_profile_after_auth_signup
  after insert on auth.users
  for each row execute function public.create_user_profile_from_auth();
