// Run with COACH_TEST_PGLITE pointing to a local, isolated @electric-sql/pglite module.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

test('real PostgreSQL schema: monotonic idempotent writes, atomic rollback, preserved exclusion and grants',async()=>{
  assert.ok(process.env.COACH_TEST_PGLITE,'Set COACH_TEST_PGLITE; no remote database is used.');
  const {PGlite}=await import(pathToFileURL(process.env.COACH_TEST_PGLITE));
  const db=new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../database/health-connect.sql',import.meta.url),'utf8'));
    const r={recordType:'exercise_session',sourceId:'synthetic-id',sourcePackage:'synthetic',lastModifiedTime:'2026-09-22T10:00:00Z',startTime:'2026-09-22T09:00:00Z',endTime:'2026-09-22T09:10:00Z',startZoneOffsetSeconds:7200,endZoneOffsetSeconds:7200,data:{exerciseType:79,title:null,notes:null}};
    const put=(records,profile='p')=>db.query('select public.coach_ingest_health($1,$2,$3::jsonb) as accepted',[profile,'d',JSON.stringify(records)]);
    await db.exec('set role service_role');
    assert.equal((await put([r])).rows[0].accepted,1);
    await put([r]); assert.equal((await db.query('select count(*)::int as n from public.coach_health_records')).rows[0].n,1);
    await db.exec("update public.coach_health_records set excluded=true,exclusion_reason='synthetic test'");
    await put([{...r,lastModifiedTime:'2026-09-22T11:00:00Z',data:{...r.data,title:'new'}}]);
    await put([{...r,data:{...r.data,title:'old'}}]);
    const row=(await db.query('select * from public.coach_health_records')).rows[0];
    assert.equal(row.data.title,'new');assert.equal(row.excluded,true);assert.equal(row.exclusion_reason,'synthetic test');
    await put([r],'other-profile');assert.equal((await db.query('select count(*)::int as n from public.coach_health_records')).rows[0].n,2);
    await assert.rejects(put([{...r,sourceId:'rolled-back'},{...r,sourceId:'bad',endTime:r.startTime}]));
    assert.equal((await db.query("select count(*)::int as n from public.coach_health_records where source_id='rolled-back'")).rows[0].n,0);
    for(const role of ['anon','authenticated']){
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(db.query('select * from public.coach_health_records'));
      await assert.rejects(put([r]));
    }
    await db.exec('reset role');
    assert.equal((await db.query("select relrowsecurity from pg_class where relname='coach_health_records'")).rows[0].relrowsecurity,true);
  }finally{await db.close();}
});
