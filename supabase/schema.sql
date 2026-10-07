-- Spusť jednou v Supabase SQL Editoru na novém projektu.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40)
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'Tvůrce'),40));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
insert into public.profiles(id, display_name) select id,left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),'Tvůrce'),40) from auth.users on conflict do nothing;
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  kind text not null check (kind in ('lut','preset')),
  category text not null check (category in ('Filmové','Příroda','Lifestyle','Cestování','Vintage')),
  description text not null default '',
  format text not null,
  software text not null,
  image_url text not null check (image_url ~ '^https://'),
  download_url text check (download_url ~ '^https://drive[.]google[.]com/'),
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.ratings (
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  primary key(asset_id,user_id)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_asset_created_idx on public.comments(asset_id,created_at desc);
create index ratings_user_idx on public.ratings(user_id);
create index comments_user_idx on public.comments(user_id);
alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;
revoke all on public.profiles, public.assets, public.ratings, public.comments from anon, authenticated;
grant select on public.profiles, public.assets to authenticated;
grant select, insert, update, delete on public.ratings to authenticated;
grant select, insert, delete on public.comments to authenticated;
create policy "Members read profiles" on public.profiles for select to authenticated using (true);
create policy "Members read assets" on public.assets for select to authenticated using (true);
create policy "Members read ratings" on public.ratings for select to authenticated using (true);
create policy "Members rate as themselves" on public.ratings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Members update own rating" on public.ratings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Members delete own rating" on public.ratings for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Members read comments" on public.comments for select to authenticated using (true);
create policy "Members comment as themselves" on public.comments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Members delete own comments" on public.comments for delete to authenticated using ((select auth.uid()) = user_id);
revoke execute on function public.handle_new_user() from public, anon, authenticated;
commit;
