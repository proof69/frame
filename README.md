# FRAME — LUTy a foto presety

Česká webová aplikace: Vite + React, statický frontend na Netlify, Supabase Auth a PostgreSQL. Soubory zůstávají na Google Drive. Bez konfigurace aplikace zobrazuje označenou ukázku se šesti položkami; registrace, hodnocení a stahování v ukázce nejsou aktivní.

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

Obsah katalogu spravuješ zatím v Supabase Table Editoru. Uživatelé nemají oprávnění katalog měnit. Hodnocení je jedno na uživatele a položku, lze ho změnit. Komentáře mají limit 2000 znaků a autor je může smazat. Veřejné profily obsahují pouze zobrazované jméno. Nepřihlášený návštěvník nemůže číst katalog, komentáře ani hodnocení, ani přímo přes API.

## Netlify

1. Nahraj projekt do Git repozitáře a v Netlify zvol import repozitáře.
2. `netlify.toml` nastavuje build `npm run build`, výstup `dist` a Node.js 22.
3. V Netlify Environment variables přidej stejné dvě `VITE_SUPABASE_*` proměnné, potom spusť deploy. Jsou součástí veřejného buildu, proto použij jen veřejný publishable key.
4. Produkční adresu doplň do Supabase URL Configuration. Otestuj registraci, potvrzovací e-mail, přihlášení, stažení, změnu hodnocení, komentář a jeho smazání. Zkontroluj také mobilní rozhraní.

## Kontrola oprávnění před spuštěním

Vytvoř dva testovací účty. První přidá hodnocení a komentář. Druhý je vidí, ale API musí odmítnout změnu cizího hodnocení i smazání cizího komentáře. Odhlášený klient nesmí přečíst `assets`. Tyto scénáře ověřují RLS, samotný frontend není bezpečnostní hranice.

Hotový základ zatím neobsahuje administrační rozhraní, nahrávání, moderaci, obnovu zapomenutého hesla ani placené položky. Skutečné LUTy/presety a jejich licence musí dodat správce. Ukázkové fotografie načítá Unsplash a fonty Google Fonts.

Dokumentace: [Supabase Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vite na Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/).
# frame
