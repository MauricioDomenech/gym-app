// Run with COACH_TEST_PGLITE pointing to a local, isolated @electric-sql/pglite module.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

test('real PostgreSQL schema: monotonic idempotent writes, atomic rollback, preserved exclusion and grants',async()=>{
  assert.ok(process.env.COACH_TEST_PGLITE,'Set COACH_TEST_PGLITE; no remote database is used.');
  const {PGlite}=await import(pathToFileURL(process.env.COACH_TEST_PGLITE));
  const db=new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    const schema=await readFile(new URL('../database/health-connect.sql',import.meta.url),'utf8');
    await db.exec(schema);
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
    const v2={recordType:'weight',sourceId:'synthetic-weight',sourcePackage:'synthetic',lastModifiedTime:'2026-09-22T10:00:00Z',startTime:'2026-09-22T09:00:00Z',endTime:'2026-09-22T09:00:00Z',startZoneOffsetSeconds:7200,endZoneOffsetSeconds:7200,data:{metadata:{id:'m',dataOrigin:{packageName:'synthetic'}},weight:{value:80,unit:'kg'}}};
    assert.equal((await db.query('select public.coach_ingest_health_v2($1,$2,$3::jsonb) as accepted',['p','d',JSON.stringify([v2])])).rows[0].accepted,1);
    const v2row=(await db.query("select schema_version, start_time, end_time from public.coach_health_records where source_id='synthetic-weight'")).rows[0];
    assert.equal(v2row.schema_version,2); assert.equal(v2row.start_time.toISOString(),v2row.end_time.toISOString());
    await assert.rejects(put([{...r,sourceId:'rolled-back'},{...r,sourceId:'bad',endTime:r.startTime}]));
    assert.equal((await db.query("select count(*)::int as n from public.coach_health_records where source_id='rolled-back'")).rows[0].n,0);
    for(const role of ['anon','authenticated']){
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(db.query('select * from public.coach_health_records'));
      await assert.rejects(put([r]));
    }
    await db.exec('reset role');
    await db.exec(schema);
    assert.equal((await db.query('select count(*)::int as n from public.coach_health_records')).rows[0].n,3);
    assert.equal((await db.query("select relrowsecurity from pg_class where relname='coach_health_records'")).rows[0].relrowsecurity,true);
  }finally{await db.close();}
});

test('schema extends a v1 table and can be reapplied without data loss',async()=>{
  assert.ok(process.env.COACH_TEST_PGLITE,'Set COACH_TEST_PGLITE; no remote database is used.');
  const {PGlite}=await import(pathToFileURL(process.env.COACH_TEST_PGLITE));
  const db=new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(`create table public.coach_health_records (
      id bigint generated always as identity primary key,
      profile_id text not null, device_id text not null,
      record_type text not null check (record_type in ('exercise_session','heart_rate')),
      source_id text not null, source_package text not null,
      last_modified_time timestamptz not null, start_time timestamptz not null,
      end_time timestamptz not null check (end_time > start_time),
      start_zone_offset_seconds integer, end_zone_offset_seconds integer,
      data jsonb not null, excluded boolean not null default false,
      exclusion_reason text, received_at timestamptz not null default now(),
      unique (profile_id, device_id, record_type, source_id)
    )`);
    await db.exec(`insert into public.coach_health_records (profile_id,device_id,record_type,source_id,source_package,last_modified_time,start_time,end_time,start_zone_offset_seconds,end_zone_offset_seconds,data) values ('p','d','exercise_session','old','synthetic','2026-09-22T10:00:00Z','2026-09-22T09:00:00Z','2026-09-22T09:10:00Z',7200,7200,'{"exerciseType":79,"title":null,"notes":null}')`);
    await db.exec(`insert into public.coach_health_records (profile_id,device_id,record_type,source_id,source_package,last_modified_time,start_time,end_time,start_zone_offset_seconds,data) values ('p','d','heart_rate','','','2026-09-22','2026-09-21','2026-09-22',999999,'[]')`);
    const schema=await readFile(new URL('../database/health-connect.sql',import.meta.url),'utf8');
    await db.exec(schema);
    assert.equal((await db.query("select schema_version from public.coach_health_records where source_id='old'")).rows[0].schema_version,1);
    await db.exec('set role service_role');
    const v2={recordType:'weight',sourceId:'new',sourcePackage:'synthetic',lastModifiedTime:'2026-09-22T10:00:00Z',startTime:'2026-09-22T09:00:00Z',endTime:'2026-09-22T09:00:00Z',startZoneOffsetSeconds:null,endZoneOffsetSeconds:null,data:{metadata:{id:'m'},weight:{value:80,unit:'kg'}}};
    assert.equal((await db.query('select public.coach_ingest_health_v2($1,$2,$3::jsonb) as accepted',['p','d',JSON.stringify([v2])])).rows[0].accepted,1);
    await db.exec('reset role');
    await db.exec(schema);
    assert.equal((await db.query('select count(*)::int as n from public.coach_health_records')).rows[0].n,3);
    assert.equal((await db.query("select schema_version from public.coach_health_records where source_id='new'")).rows[0].schema_version,2);
  }finally{await db.close();}
});

test('fragment staging is idempotent and only finalizes a complete validated envelope',async()=>{
  assert.ok(process.env.COACH_TEST_PGLITE,'Set COACH_TEST_PGLITE; no remote database is used.');
  const {PGlite}=await import(pathToFileURL(process.env.COACH_TEST_PGLITE));
  const db=new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../database/health-connect.sql',import.meta.url),'utf8'));
    await db.exec('set role service_role');
    const record={recordType:'exercise_session',sourceId:'fragmented',sourcePackage:'synthetic',lastModifiedTime:'2026-09-22T10:00:00Z',startTime:'2026-09-22T09:00:00Z',endTime:'2026-09-22T09:10:00Z',startZoneOffsetSeconds:7200,endZoneOffsetSeconds:7200,data:{metadata:{id:'m'},exerciseType:{value:79,unit:'code'}}};
    const bytes=Buffer.from(JSON.stringify({schemaVersion:2,records:[record]}));
    const split=Math.ceil(bytes.length/2);
    const chunks=[bytes.subarray(0,split),bytes.subarray(split)];
    const sha256=createHash('sha256').update(bytes).digest('hex');
    const stage=(index)=>db.query('select public.coach_stage_health_fragment($1,$2,$3,$4,$5,$6,$7,$8,$9) as result',['p','d',record.recordType,record.sourceId,record.lastModifiedTime,sha256,index,chunks.length,chunks[index].toString('base64')]);
    const first=(await stage(0)).rows[0].result;
    assert.equal(first.complete,false); assert.equal((await db.query('select count(*)::int as n from public.coach_health_fragments')).rows[0].n,1);
    const retry=(await stage(0)).rows[0].result;
    assert.equal(retry.complete,false); assert.equal((await db.query('select count(*)::int as n from public.coach_health_fragments')).rows[0].n,1);
    const complete=(await stage(1)).rows[0].result;
    assert.equal(complete.complete,true);
    const listed=(await db.query('select public.coach_read_health_fragment($1,$2,$3,$4,$5,$6,0,8) as result',['p','d',record.recordType,record.sourceId,record.lastModifiedTime,sha256])).rows[0].result;
    assert.equal(listed.length,2);
    const oldRecord={...record,lastModifiedTime:'2026-09-22T09:00:00Z'};
    const oldBytes=Buffer.from(JSON.stringify({schemaVersion:2,records:[oldRecord]}));
    const oldHash=createHash('sha256').update(oldBytes).digest('hex');
    await db.query('select public.coach_stage_health_fragment($1,$2,$3,$4,$5,$6,$7,$8,$9)',[
      'p','d',oldRecord.recordType,oldRecord.sourceId,oldRecord.lastModifiedTime,oldHash,0,1,oldBytes.toString('base64'),
    ]);
    const sameRevision={...record,data:{...record.data,correction:'same-revision'}};
    const sameBytes=Buffer.from(JSON.stringify({schemaVersion:2,records:[sameRevision]}));
    const sameHash=createHash('sha256').update(sameBytes).digest('hex');
    await db.query('select public.coach_stage_health_fragment($1,$2,$3,$4,$5,$6,$7,$8,$9)',[
      'p','d',sameRevision.recordType,sameRevision.sourceId,sameRevision.lastModifiedTime,sameHash,0,1,sameBytes.toString('base64'),
    ]);
    assert.equal((await db.query('select count(*)::int as n from public.coach_health_fragments')).rows[0].n,4);
    await db.query('select public.coach_ingest_health($1,$2,$3::jsonb)',['p','d',JSON.stringify([{...record,recordType:'exercise_session',sourceId:'fragmented',lastModifiedTime:'2026-09-22T10:00:00Z',data:{exerciseType:79,title:null,notes:null}}])]);
    await db.exec("update public.coach_health_records set excluded=true, exclusion_reason='keep' where source_id='fragmented'");
    assert.equal((await db.query('select public.coach_finalize_health_fragment($1,$2,$3,$4,$5,$6,$7) as accepted',['p','d',record.recordType,record.sourceId,record.lastModifiedTime,sha256,JSON.stringify(record)])).rows[0].accepted,1);
    const stored=(await db.query("select schema_version,excluded,exclusion_reason,data->'exerciseType' as exercise_type from public.coach_health_records where source_id='fragmented'")).rows[0];
    assert.equal(stored.schema_version,2); assert.equal(stored.excluded,true); assert.equal(stored.exclusion_reason,'keep'); assert.equal(stored.exercise_type.value,79);
    await db.query('select public.coach_ingest_health($1,$2,$3::jsonb)',['p','d',JSON.stringify([{recordType:'exercise_session',sourceId:'fragmented',sourcePackage:'synthetic',lastModifiedTime:record.lastModifiedTime,startTime:record.startTime,endTime:record.endTime,startZoneOffsetSeconds:7200,endZoneOffsetSeconds:7200,data:{exerciseType:79,title:'downgrade-at-equal-revision',notes:null}}])]);
    const preserved=(await db.query("select schema_version,excluded,exclusion_reason,data->'exerciseType' as exercise_type,data->>'title' as title from public.coach_health_records where source_id='fragmented'")).rows[0];
    assert.equal(preserved.schema_version,2); assert.equal(preserved.excluded,true); assert.equal(preserved.exclusion_reason,'keep'); assert.equal(preserved.exercise_type.value,79); assert.equal(preserved.title,null);
    const detailId=(await db.query("select id from public.coach_health_records where source_id='fragmented'")).rows[0].id;
    assert.equal((await db.query('select public.coach_read_health_detail($1,$2,$3,0,5,false) as result',['p','d',detailId])).rows[0].result,null);
    const detailPage=(await db.query('select public.coach_read_health_detail($1,$2,$3,0,5,true) as result',['p','d',detailId])).rows[0].result;
    assert.equal(detailPage.id,detailId); assert.equal(detailPage.offset,0); assert.equal(detailPage.dataBase64.length>0,true); assert.equal(detailPage.nextOffset,5);
    const detailTail=(await db.query('select public.coach_read_health_detail($1,$2,$3,$4,240000,true) as result',['p','d',detailId,detailPage.nextOffset])).rows[0].result;
    assert.equal(detailTail.offset,5); assert.equal(detailTail.nextOffset,null);
    assert.equal((await db.query('select count(*)::int as n from public.coach_health_fragments')).rows[0].n,0);
    const bad={...record,sourceId:'bad-finalize'};
    const badBytes=Buffer.from(JSON.stringify({schemaVersion:2,records:[bad]}));
    const badHash=createHash('sha256').update(badBytes).digest('hex');
    await db.query('select public.coach_stage_health_fragment($1,$2,$3,$4,$5,$6,$7,$8,$9)',['p','d',bad.recordType,bad.sourceId,bad.lastModifiedTime,badHash,0,1,badBytes.toString('base64')]);
    await assert.rejects(db.query('select public.coach_finalize_health_fragment($1,$2,$3,$4,$5,$6,$7)',['p','d',bad.recordType,bad.sourceId,bad.lastModifiedTime,badHash,JSON.stringify({...bad,data:{metadata:{id:'wrong'}}})]));
    assert.equal((await db.query("select count(*)::int as n from public.coach_health_records where source_id='bad-finalize'")).rows[0].n,0);
    assert.equal((await db.query("select count(*)::int as n from public.coach_health_fragments where source_id='bad-finalize'")).rows[0].n,1);
  }finally{await db.close();}
});

test('exact nanosecond intervals, monotonic revisions and bounded header/inline reads', async()=>{
  const {PGlite}=await import(pathToFileURL(process.env.COACH_TEST_PGLITE));
  const db=new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../database/health-connect.sql',import.meta.url),'utf8'));
    await db.exec('set role service_role');
    const r={recordType:'heart_rate',sourceId:'nano',sourcePackage:'synthetic',lastModifiedTime:'2026-09-20T10:00:00.0000001Z',startTime:'2026-09-20T09:00:00.0000001Z',endTime:'2026-09-20T09:00:00.0000002Z',startZoneOffsetSeconds:null,endZoneOffsetSeconds:null,data:{metadata:{id:'nano'},revision:'first'}};
    const put=r=>db.query('select coach_ingest_health_v2($1,$2,$3::jsonb)',['p','d',JSON.stringify([r])]);
    await put(r);
    await put({...r,lastModifiedTime:'2026-09-20T10:00:00.0000002Z',data:{...r.data,revision:'second'}});
    await put(r);
    const row=(await db.query('select * from coach_health_record_headers')).rows[0];
    assert.equal(row.start_time,r.startTime);assert.equal(row.end_time,r.endTime);assert.ok(!('data' in row));
    const inline=(await db.query('select coach_read_health_inline($1,$2,$3,$4) as result',['p','d',row.id,10000])).rows[0].result;
    assert.equal(inline.data.revision,'second');
    const firstDetail=(await db.query('select coach_read_health_detail($1,$2,$3,0,1) as result',['p','d',row.id])).rows[0].result;
    await put({...r,lastModifiedTime:'2026-09-20T10:00:00.0000003Z',data:{...r.data,revision:'third'}});
    const changed=(await db.query('select coach_read_health_detail($1,$2,$3,1,1,false,$4) as result',['p','d',row.id,firstDetail.revision])).rows[0].result;
    assert.deepEqual(changed,{changed:true});

    assert.equal((await db.query('select coach_read_health_inline($1,$2,$3,$4) as result',['p','d',row.id,1])).rows[0].result.tooLarge,true);
    assert.equal((await db.query('select coach_read_health_inline($1,$2,$3,$4) as result',['other','d',row.id,10000])).rows[0].result,null);
    assert.equal((await db.query('select coach_health_epoch_ns($1)=coach_health_epoch_ns($2) as same',['2026-09-20T12:00:00.0000002+02:00','2026-09-20T10:00:00.0000002Z'])).rows[0].same,true);
    await db.exec('reset role; set role anon');await assert.rejects(db.query('select * from coach_health_record_headers'));
  } finally {await db.close();}
});

test('single-instant migration is repeatable, preserves rows/exclusions and rejects invalid intervals', async()=>{
  const {PGlite}=await import(pathToFileURL(process.env.COACH_TEST_PGLITE));
  const db=new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    const schema=await readFile(new URL('../database/health-connect.sql',import.meta.url),'utf8');
    await db.exec(schema);
    const time='2026-09-20T09:00:00.123456789Z';
    const r={recordType:'heart_rate',sourceId:'single',sourcePackage:'synthetic',lastModifiedTime:time,startTime:time,endTime:time,startZoneOffsetSeconds:null,endZoneOffsetSeconds:null,data:{metadata:{id:'single'},samples:[]}};
    const put=r=>db.query('select coach_ingest_health_v2($1,$2,$3::jsonb)',['p','d',JSON.stringify([r])]);
    // Install the previous strict constraint, insert an existing row, then migrate in place.
    await db.exec('alter table coach_health_records drop constraint coach_health_records_temporal_check; alter table coach_health_records add constraint coach_health_records_temporal_check check (coach_health_epoch_ns(end_time_raw)>coach_health_epoch_ns(start_time_raw))');
    await put({...r,endTime:'2026-09-20T09:01:00Z'});
    await db.exec("update coach_health_records set excluded=true,exclusion_reason='keep'");
    const before=(await db.query('select * from coach_health_records')).rows;
    await assert.rejects(put({...r,sourceId:'point'}));
    const migration=await readFile(new URL('../database/health-connect-single-instant.sql',import.meta.url),'utf8');
    await db.exec(migration);await db.exec(migration);
    assert.deepEqual((await db.query('select * from coach_health_records')).rows,before);
    await db.exec('set role service_role');
    for(const type of ['cycling_pedaling_cadence','heart_rate','power','speed','steps_cadence']) {
      await put({...r,recordType:type,sourceId:type});
      await assert.rejects(put({...r,recordType:type,endTime:'2026-09-20T09:00:00.123456788Z'}),e=>e.constraint==='coach_health_records_temporal_check');
    }
    for(const type of ['exercise_session','steps','skin_temperature','nutrition']) await assert.rejects(put({...r,recordType:type}),e=>e.constraint==='coach_health_records_temporal_check');
    await assert.rejects(db.query('select coach_ingest_health($1,$2,$3::jsonb)',['p','d',JSON.stringify([r])]),e=>e.constraint==='coach_health_records_temporal_check');
    await db.exec('reset role');await db.exec(schema);
    assert.equal((await db.query('select count(*)::int as n from coach_health_records')).rows[0].n,6);
  }finally{await db.close();}
});
