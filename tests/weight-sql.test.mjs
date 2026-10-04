import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
test('SQL peso: upsert diario, aislamiento por dueño y acceso sólo servidor', {skip:!process.env.COACH_TEST_PGLITE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.COACH_TEST_PGLITE));const db=new PGlite();
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
 try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key);');
  await db.query('insert into auth.users values($1),($2)',[a,b]);
  const sql=await readFile(new URL('../database/daily-weight.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
  await db.exec('set role service_role');
  const put=(owner,kg)=>db.query("insert into coach_daily_weights values($1,'2026-01-15',$2) on conflict(owner_id,date) do update set kg=excluded.kg",[owner,kg]);
  await put(a,82.5);await put(a,82.6);await put(b,70);
  assert.equal((await db.query('select count(*)::int as n from coach_daily_weights')).rows[0].n,2);
  assert.equal(Number((await db.query('select kg from coach_daily_weights where owner_id=$1',[a])).rows[0].kg),82.6);
  await assert.rejects(put(a,0));await assert.rejects(put(a,501));
  for(const role of ['anon','authenticated']){await db.exec(`reset role;set role ${role}`);await assert.rejects(put(a,90));await assert.rejects(db.query('select * from coach_daily_weights'));}
  await db.exec('reset role');await db.exec(sql);assert.equal((await db.query('select count(*)::int as n from coach_daily_weights')).rows[0].n,2);
 }finally{await db.close();}
});
