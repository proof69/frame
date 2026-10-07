import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { publicAssetColumns } from '../src/catalog.js';

test('admin migration enforces permissions and preserves member access', async () => {
  const db = new PGlite();
  const admin = '00000000-0000-4000-8000-000000000001';
  const member = '00000000-0000-4000-8000-000000000002';
  const asset = '00000000-0000-4000-8000-000000000003';
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
    await db.exec(await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
    const migration = await readFile(new URL('../supabase/admin.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // Reapplying must preserve data and policies.
    const publicCatalog = await readFile(new URL('../supabase/public-catalog.sql', import.meta.url), 'utf8');
    await db.exec(publicCatalog);
    await db.exec(publicCatalog);
    await db.exec(`insert into auth.users(id) values ('${admin}'), ('${member}');
      insert into public.admin_users values ('${admin}');`);
    const login = async id => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec('set role authenticated');
    };
    const insert = `insert into public.assets(id,title,kind,category,format,software,image_url)
      values ('${asset}','Test LUT','lut','Filmové','.CUBE','Resolve','https://example.com/image.jpg')`;
    await login(member);
    assert.equal((await db.query('select public.is_admin() as allowed')).rows[0].allowed, false);
    await assert.rejects(db.exec(insert), /row-level security/i);
    await assert.rejects(db.exec(`insert into public.admin_users values ('${member}')`), /permission denied/i);
    await assert.rejects(db.exec('select * from public.admin_users'), /permission denied/i);
    await assert.rejects(db.exec(`update public.profiles set display_name = 'Admin' where id = '${member}'`), /permission denied/i);
    await login(admin);
    assert.equal((await db.query('select public.is_admin() as allowed')).rows[0].allowed, true);
    await db.exec(insert);
    assert.equal((await db.query(`update public.assets set title = 'Updated' where id = '${asset}' returning title`)).rows[0].title, 'Updated');
    await db.exec(`update public.assets set download_url = 'https://drive.google.com/file/d/private-link/view' where id = '${asset}'`);
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await db.exec('set role anon');
    const publicRows = (await db.query(`select ${publicAssetColumns} from public.assets order by created_at desc`)).rows;
    assert.equal(publicRows.length, 1);
    assert.equal(publicRows[0].title, 'Updated');
    assert.equal(publicRows[0].image_url, 'https://example.com/image.jpg');
    assert.equal(Object.hasOwn(publicRows[0], 'download_url'), false);
    await assert.rejects(db.exec('select download_url from public.assets'), /permission denied/i);
    await assert.rejects(db.exec('select download_url is not null from public.assets'), /permission denied/i);
    await assert.rejects(db.exec('select * from public.assets'), /permission denied/i);
    await assert.rejects(db.exec('select * from public.comments'), /permission denied/i);
    await assert.rejects(db.exec('select * from public.ratings'), /permission denied/i);
    await assert.rejects(db.exec('select * from public.profiles'), /permission denied/i);
    await assert.rejects(db.exec(insert), /permission denied/i);
    await assert.rejects(db.exec(`update public.assets set title = 'Guest change' where id = '${asset}'`), /permission denied/i);
    await assert.rejects(db.exec(`delete from public.assets where id = '${asset}'`), /permission denied/i);
    await login(member);
    assert.equal((await db.query('select * from public.assets')).rows.length, 1);
    assert.equal((await db.query('select download_url from public.assets')).rows[0].download_url, 'https://drive.google.com/file/d/private-link/view');
    assert.equal((await db.query(`update public.assets set title = 'Hijacked' where id = '${asset}' returning id`)).rows.length, 0);
    assert.equal((await db.query(`delete from public.assets where id = '${asset}' returning id`)).rows.length, 0);
    await db.exec(`insert into public.ratings values ('${asset}','${member}',5);
      insert into public.comments(asset_id,user_id,body) values ('${asset}','${member}','Comment');`);
    await login(admin);
    assert.equal((await db.query(`delete from public.assets where id = '${asset}' returning id`)).rows.length, 1);
    assert.equal((await db.query('select * from public.comments')).rows.length, 0);
    assert.equal((await db.query('select * from public.ratings')).rows.length, 0);
    await db.exec('reset role');
    await db.exec(`delete from public.admin_users where user_id = '${admin}'`);
    await login(admin);
    assert.equal((await db.query('select public.is_admin() as allowed')).rows[0].allowed, false);
    await assert.rejects(db.exec(insert), /row-level security/i);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.exec('select public.is_admin()'), /permission denied/i);
    await assert.rejects(db.exec('select * from public.assets'), /permission denied/i);
  } finally { await db.close(); }
});
