-- Spusť po schema.sql. Lze bezpečně spustit znovu.
begin;
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated;

-- Čte pouze identitu volajícího; seznam správců není dostupný klientům.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant insert, update, delete on public.assets to authenticated;
drop policy if exists "Admins insert assets" on public.assets;
drop policy if exists "Admins update assets" on public.assets;
drop policy if exists "Admins delete assets" on public.assets;
create policy "Admins insert assets" on public.assets for insert to authenticated
  with check ((select public.is_admin()));
create policy "Admins update assets" on public.assets for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete assets" on public.assets for delete to authenticated
  using ((select public.is_admin()));
commit;

-- Přidělení role: v SQL Editoru spusť samostatně po nahrazení e-mailu.
-- insert into public.admin_users(user_id)
-- select id from auth.users where lower(email) = lower('TVUJ_EMAIL')
-- on conflict do nothing;
-- Ověření: select user_id from public.admin_users;
-- Odebrání role: delete from public.admin_users where user_id = 'UUID_UCTU';
