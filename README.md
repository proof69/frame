# Lucas Presets — LUTy a foto presety

Anglická webová aplikace pro tvůrce z celého světa: Vite + React, statický frontend na Netlify, Supabase Auth a PostgreSQL. Soubory zůstávají na Google Drive. Bez konfigurace aplikace zobrazuje označenou ukázku se šesti položkami; registrace, hodnocení a stahování v ukázce nejsou aktivní.

Rozhraní, administrace, hlášky i ukázkové popisy jsou anglicky. Kategorie se zobrazují jako Cinematic, Nature, Lifestyle, Travel a Vintage; jejich původní databázové hodnoty zůstávají zachované, takže není potřeba SQL migrace. Vlastní názvy a popisy již uložené v Supabase přelož přes Admin → Edit. Texty e-mailů spravuje Supabase mimo tento projekt.

## Lokální spuštění

Použij Node.js 22 nebo novější.

```sh
npm install
cp .env.example .env.local
npm run dev
```

V PowerShellu místo `cp` můžeš použít `Copy-Item .env.example .env.local`. Pro pouhou ukázku není `.env.local` potřeba. Produkční build: `npm run build`; místní kontrola buildu: `npm run preview`.

## Supabase

1. Vytvoř nový Supabase projekt. V SQL Editoru spusť `supabase/schema.sql` jednou. Vytvoří tabulky, trigger profilů a oprávnění. Volitelně spusť `supabase/seed.sql` pro první ukázkovou položku.
2. V Project Settings → API zkopíruj URL a veřejný publishable key do `.env.local` jako `VITE_SUPABASE_URL` a `VITE_SUPABASE_PUBLISHABLE_KEY`. Nikdy sem nedávej secret nebo service_role klíč. Po změně restartuj Vite.
3. V Authentication zapni Email provider a potvrzení e-mailu. Nastav minimálně osm znaků hesla. V URL Configuration nastav Site URL na adresu webu a mezi Redirect URLs přidej `http://localhost:5173` i přesnou produkční adresu Netlify.
4. V Table Editoru přidej do `assets` své položky: název, typ `lut` nebo `preset`, kategorii, popis, formát, podporované aplikace, HTTPS adresu náhledu a `download_url` z Google Drive. Kategorie: Filmové, Příroda, Lifestyle, Cestování, Vintage. Vzor odkazu: `https://drive.google.com/file/d/ID_SOUBORU/view`.
5. U souboru v Google Drive zapni sdílení pro každého s odkazem. Ověř odkaz v anonymním okně. Odkaz lze po stažení sdílet dál; přihlášení chrání katalog v databázi, veřejný soubor na Drive tím soukromý nebude.

Obsah katalogu spravuje admin přímo na webu nebo přes Supabase Table Editor. Běžní uživatelé nemají oprávnění katalog měnit. Hodnocení je jedno na uživatele a položku, lze ho změnit. Komentáře mají limit 2000 znaků a autor je může smazat. Veřejné profily obsahují pouze zobrazované jméno. Nepřihlášený návštěvník nemůže číst katalog, komentáře ani hodnocení, ani přímo přes API.

## Administrace

1. V existujícím Supabase projektu spusť v SQL Editoru celý `supabase/admin.sql`. Původní `schema.sql` znovu nespouštěj. U nového projektu nejdřív spusť `schema.sql`, potom `admin.sql`.
2. Zaregistruj svůj účet na webu a potvrď e-mail. V SQL Editoru spusť následující dotaz s e-mailem tohoto účtu:

```sql
insert into public.admin_users(user_id)
select id from auth.users where lower(email) = lower('TVUJ_EMAIL')
on conflict do nothing;
```

3. Ověř přidělení role: `select user_id from public.admin_users;`. Pokud je tabulka prázdná, zkontroluj e-mail a existenci registrovaného účtu.
4. Nasaď aktuální kód a znovu se přihlas nebo obnov stránku. V horní liště se objeví **Administrace**. Zde můžeš přidávat, upravovat a mazat položky. Náhled zadáváš jako HTTPS odkaz a stažení jako odkaz na Google Drive; aplikace soubory nenahrává.
5. Smazání položky odstraní i její komentáře a hodnocení. Soubory na Google Drive zůstanou. Odebrání role: `delete from public.admin_users where user_id = 'UUID_UCTU';`.

Role jsou uložené v chráněné tabulce. Uživatel si nemůže admin oprávnění přidělit přes registraci ani API. Zápisy do katalogu ověřují databázové RLS politiky při každé operaci. Bez migrace `admin.sql` zůstane katalog funkční, tlačítko administrace se neobjeví.

`npm test` ověřuje migraci v lokálním PostgreSQL přes PGlite: admin zápisy, zákaz změn pro běžného uživatele, zákaz přidělení vlastní role, okamžité odebrání oprávnění a smazání souvisejících komentářů a hodnocení. Nepřipojuje se k produkční databázi.

## Netlify

1. Nahraj projekt do Git repozitáře a v Netlify zvol import repozitáře.
2. `netlify.toml` nastavuje build `npm run build`, výstup `dist` a Node.js 22.
3. V Netlify Environment variables přidej stejné dvě `VITE_SUPABASE_*` proměnné, potom spusť deploy. Jsou součástí veřejného buildu, proto použij jen veřejný publishable key.
4. Produkční adresu doplň do Supabase URL Configuration. Otestuj registraci, potvrzovací e-mail, přihlášení, stažení, změnu hodnocení, komentář a jeho smazání. Zkontroluj také mobilní rozhraní.

## Kontrola oprávnění před spuštěním

Vytvoř dva testovací účty. První přidá hodnocení a komentář. Druhý je vidí, ale API musí odmítnout změnu cizího hodnocení i smazání cizího komentáře. Odhlášený klient nesmí přečíst `assets`. Tyto scénáře ověřují RLS, samotný frontend není bezpečnostní hranice.

Hotový základ zatím neobsahuje nahrávání souborů, moderaci, obnovu zapomenutého hesla ani placené položky. Skutečné LUTy/presety a jejich licence musí dodat správce. Ukázkové fotografie načítá Unsplash a fonty Google Fonts.

Dokumentace: [Supabase Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vite na Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/).
# Lucas Presets
