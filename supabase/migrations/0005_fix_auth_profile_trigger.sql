-- Fix anonymous sign-up failures caused by calling an unqualified pgcrypto
-- function from a SECURITY DEFINER function with an empty search_path.
-- Deriving the non-sensitive avatar seed from the user's random UUID avoids
-- any dependency on an extension schema.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, avatar_seed)
  values (
    new.id,
    substr(replace(new.id::text, '-', ''), 1, 16)
  )
  on conflict (id) do nothing;

  return new;
end
$$;
