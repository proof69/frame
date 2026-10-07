-- Spusť v existujícím projektu po schema.sql. Lze bezpečně spustit znovu.
begin;
-- Veřejné jsou pouze údaje katalogu, nikdy download_url.
revoke select on public.assets from anon;
revoke select (download_url) on public.assets from anon;
grant select (id, title, kind, category, description, format, software,
  image_url, featured, created_at) on public.assets to anon;
drop policy if exists "Visitors read catalog" on public.assets;
create policy "Visitors read catalog" on public.assets
  for select to anon using (true);
-- Zápisy, komentáře, hodnocení a admin role zůstávají chráněné.
commit;
