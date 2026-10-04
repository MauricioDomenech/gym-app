import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { config, authorize, validateBatch } from '../dist/api/_health/core.js';
import { HEALTH_RECORD_CATALOG } from '../dist/api/_health/catalog.js';
import sync from '../dist/api/health-sync.js';
import read from '../dist/api/health-records.js';
const ingest = 'synthetic-ingest-token-000000000000000000';
const reader = 'synthetic-reader-token-000000000000000000';
const hash = s => createHash('sha256').update(s).digest('hex');
const env = { COACH_HEALTH_SUPABASE_URL: 'https://example.invalid', COACH_HEALTH_SERVICE_ROLE_KEY: 'synthetic-service-role', COACH_HEALTH_PROFILE_ID: 'synthetic-profile', COACH_HEALTH_DEVICE_ID: 'synthetic-device', COACH_HEALTH_SYNC_TOKEN_SHA256: hash(ingest), COACH_HEALTH_READ_TOKEN_SHA256: hash(reader) };
const record = () => ({ recordType: 'exercise_session', sourceId: 'synthetic-session', sourcePackage: 'com.example.synthetic', lastModifiedTime:'2026-09-22T09:30:00Z', startTime:'2026-09-22T09:00:00Z', endTime:'2026-09-22T09:25:00Z', startZoneOffsetSeconds:7200, endZoneOffsetSeconds:7200, data:{exerciseType:79,title:null,notes:null} });
const body = r => ({schemaVersion:1,records:[r]});
const v2Body = (r) => ({schemaVersion:2,records:[r]});
const v2Record = (type = 'weight') => ({
  recordType: type,
  sourceId: `synthetic-${type}`,
  sourcePackage: 'com.example.synthetic',
  lastModifiedTime: '2026-09-22T09:30:00Z',
  startTime: '2026-09-22T09:00:00Z',
  endTime: type === 'weight' ? '2026-09-22T09:00:00Z' : '2026-09-22T09:10:00Z',
  startZoneOffsetSeconds: 7200,
  endZoneOffsetSeconds: 7200,
  data: { metadata: { id: `metadata-${type}`, dataOrigin: { packageName: 'com.example.synthetic' }, clientRecordVersion: '1' }, measurement: { value: 80.5, unit: 'kg' } },
});
const response = () => ({ code:0, headers:{}, setHeader(k,v){ this.headers[k]=v; }, status(n){this.code=n;return this;},json(b){this.body=b;return this;} });
const request = (token = ingest) => ({method:'POST', headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:body(record()),query:{}});

test('v2 accepts exactly the five SDK single-instant series, rejects reversed nanos and keeps v1 strict', () => {
  const allowed = ['cycling_pedaling_cadence', 'heart_rate', 'power', 'speed', 'steps_cadence'];
  for (const [type, temporal] of Object.entries(HEALTH_RECORD_CATALOG)) {
    const point = {...v2Record(type), startTime:'2026-09-22T09:00:00.123456789Z', endTime:'2026-09-22T09:00:00.123456789Z'};
    if (temporal === 'instant' || allowed.includes(type)) assert.equal(validateBatch(v2Body(point)).length, 1, type);
    else assert.throws(() => validateBatch(v2Body(point)), e => e.message === 'invalid_interval', type);
    assert.throws(() => validateBatch(v2Body({...point, endTime:'2026-09-22T09:00:00.123456788Z'})), e => e.status === 400, type);
  }
  assert.throws(() => validateBatch(body({...record(), recordType:'heart_rate', endTime:record().startTime})), e => e.message === 'invalid_interval');
});

test('configuration fails closed and rejects shared read/write credentials', () => {
  assert.throws(()=>config({}), e=>e.status===503);
  assert.throws(()=>config({...env,COACH_HEALTH_READ_TOKEN_SHA256:hash(ingest)}),e=>e.status===503);
  assert.throws(()=>config({...env,COACH_HEALTH_SUPABASE_URL:'http://example.invalid'}),e=>e.status===503);
  assert.equal(config(env).profile,'synthetic-profile');
});
test('authentication separates read/write, missing and wrong credentials',()=>{
  authorize(`Bearer ${ingest}`,hash(ingest));
  for (const value of [undefined, `Bearer ${reader}`, 'Bearer short', ['Bearer bad']]) assert.throws(()=>authorize(value,hash(ingest)),e=>e.status===401);
});
test('strict payload and intervals, valid heart samples including nanos',()=>{
  assert.equal(validateBatch(body(record())).length,1);
  const heart = {...record(),recordType:'heart_rate',sourceId:'id#minute-1-0',data:{samples:[{time:'2026-09-22T09:00:01.123456789Z',bpm:100}]}};
  assert.equal(validateBatch(body(heart)).length,1);
  for (const r of [ {...record(),userId:'attacker'}, {...record(),startTime:'2026-02-30T09:00:00Z'}, {...record(),endTime:record().startTime}, {...record(),startZoneOffsetSeconds:999999}, {...heart,data:{samples:[{time:'2026-09-22T09:01:00Z',bpm:301}]}}, {...heart,data:{samples:[{time:'2026-09-22T10:01:00Z',bpm:100}]}}, {...heart,data:{samples:[]}} ]) assert.throws(()=>validateBatch(body(r)),e=>e.status===400);
  assert.throws(()=>validateBatch({schemaVersion:1,records:[record(),record()]}),e=>e.status===400);
  assert.throws(()=>validateBatch({schemaVersion:1,records:Array(201).fill(record())}),e=>e.status===400);
  assert.throws(()=>validateBatch(' '.repeat(1_000_001)),e=>e.status===413);
});
test('v2 catalog, temporal rules, detailed values and bounded JSON',()=>{
  const instant = validateBatch(v2Body(v2Record()));
  assert.equal(instant.length, 1);
  assert.equal(instant.schemaVersion, 2);
  assert.equal(validateBatch(v2Body(v2Record('active_calories_burned'))).length, 1);
  const sdkInstant = {...v2Record(), startZoneOffsetSeconds: null, endZoneOffsetSeconds: null, data: {...v2Record().data, time: '2026-09-22T09:00:00.123456789Z', zoneOffsetSeconds: null}};
  assert.equal(validateBatch(v2Body(sdkInstant)).length, 1);
  const catalogRecords = Object.entries(HEALTH_RECORD_CATALOG).map(([type, temporal]) => {
    const start = '2026-09-22T09:00:00.123456789Z';
    const end = temporal === 'instant' ? start : '2026-09-22T09:10:00.123456789Z';
    const source = `catalog-${type}`;
    return {...v2Record(type), sourceId: source, startTime: start, endTime: end,
      startZoneOffsetSeconds: null, endZoneOffsetSeconds: null,
      data: {...v2Record(type).data, recordType: type, value: {value: 1, unit: 'count'},
        ...(temporal === 'instant' ? {time: start, zoneOffsetSeconds: null} : {startTime: start, endTime: end, startZoneOffsetSeconds: null, endZoneOffsetSeconds: null})}};
  });
  assert.equal(validateBatch({schemaVersion: 2, records: catalogRecords}).length, 41);
  for (const invalid of [
    {...v2Record('weight'), endTime: '2026-09-22T09:00:01Z'},
    {...v2Record('active_calories_burned'), endTime: '2026-09-22T09:00:00Z'},
    {...v2Record(), recordType: 'made_up_type'},
    {...v2Record(), data: {...v2Record().data, measurement: 80.5}},
    {...v2Record(), data: {...v2Record().data, time: 'not-a-timestamp'}},
    {...v2Record(), data: {...v2Record().data, 'bad key': {value: 2, unit: 'kg'}}},
  ]) assert.throws(() => validateBatch(v2Body(invalid)), e => e.status === 400);
  const deep = { metadata: {} };
  let cursor = deep;
  for (let i = 0; i < 40; i++) { cursor.nested = {}; cursor = cursor.nested; }
  assert.throws(() => validateBatch(v2Body({...v2Record(), data: deep})), e => e.status === 400);
});
test('v1 text compatibility, planned future intervals and signed int64 archive values',()=>{
  const legacyWithText = {...record(), data:{exerciseType:79,title:'línea 1\nlínea 2\t',notes:'nota\r\n'}};
  assert.equal(validateBatch(body(legacyWithText)).length,1);
  const planned={...v2Record('planned_exercise_session'),startTime:'2035-09-22T09:00:00Z',endTime:'2035-09-22T09:10:00Z',data:{metadata:{id:'future',clientRecordVersion:'7'},planned:{value:'9223372036854775807',unit:'count',encoding:'int64'}}};
  assert.equal(validateBatch(v2Body(planned)).length,1);
  assert.throws(()=>validateBatch(v2Body({...planned,lastModifiedTime:'2035-09-22T09:30:00Z'})),e=>e.status===400);
  for (const value of ['01','9223372036854775808','-9223372036854775809']) assert.throws(()=>validateBatch(v2Body({...v2Record(),data:{metadata:{id:'bad',clientRecordVersion:value},count:{value,unit:'count',encoding:'int64'}}})),e=>e.status===400);
});
test('endpoints: no DB calls before auth, ACK after persist, private scoped pagination',async()=>{
  const originalEnv = Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
  Object.assign(process.env,env);
  const originalFetch=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async (url,init)=>{calls.push({url,init});return {ok:true,json:async()=>url.includes('/coach_read_health_inline')?{data:{}}:url.includes('/rpc/')?1:[{id:10,data_bytes:2},{id:11,data_bytes:2}]};};
  try {
    let res=response();await sync({...request(),headers:{}},res);assert.equal(res.code,401);assert.equal(calls.length,0);
    res=response();await sync(request(reader),res);assert.equal(res.code,401);assert.equal(calls.length,0);
    res=response();await read({...request(),method:'GET'},res);assert.equal(res.code,401);assert.equal(calls.length,0);
    res=response();await sync(request(),res);assert.equal(res.code,200);assert.deepEqual(res.body,{accepted:1});
    assert.equal(JSON.parse(calls[0].init.body).p_profile,env.COACH_HEALTH_PROFILE_ID);
    assert.equal(calls[0].init.redirect,'error');
    res=response();await read({...request(reader),method:'GET',query:{limit:'1'}},res);assert.equal(res.code,200);assert.equal(res.body.nextCursor,'10');
    const url=new URL(calls[1].url);assert.equal(url.searchParams.get('profile_id'),'eq.synthetic-profile');assert.equal(url.searchParams.get('excluded'),'eq.false');
    globalThis.fetch=async()=>({ok:false});res=response();await sync(request(),res);assert.equal(res.code,503);assert.equal(res.body.accepted,undefined);
    globalThis.fetch=async()=>({ok:true,json:async()=>0});res=response();await sync(request(),res);assert.equal(res.code,503);
    delete process.env.COACH_HEALTH_SERVICE_ROLE_KEY;res=response();await sync(request(),res);assert.equal(res.code,503);
  } finally {globalThis.fetch=originalFetch;for(const [k,v] of Object.entries(originalEnv))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('v2 endpoint uses separate versioned RPC and preserves private scope',async()=>{
  const originalEnv = Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
  Object.assign(process.env,env);
  const originalFetch=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async (url,init)=>{calls.push({url,init});return {ok:true,json:async()=>1};};
  try {
    const req={method:'POST',headers:{authorization:`Bearer ${ingest}`,'content-type':'application/json'},body:v2Body(v2Record()),query:{}};
    const res=response(); await sync(req,res);
    assert.equal(res.code,200); assert.deepEqual(res.body,{accepted:1});
    assert.match(calls[0].url,/\/rpc\/coach_ingest_health_v2$/);
    const sent=JSON.parse(calls[0].init.body);
    assert.equal(sent.p_profile,env.COACH_HEALTH_PROFILE_ID);
    assert.equal(sent.p_device,env.COACH_HEALTH_DEVICE_ID);
    assert.equal(sent.p_records[0].recordType,'weight');
    globalThis.fetch=async (url,init)=>{calls.push({url,init});return {ok:true,json:async()=>url.includes('/coach_read_health_inline')?{data:{}}:[{id:10,data_bytes:2}]};};
    const readResponse=response();
    await read({method:'GET',headers:{authorization:`Bearer ${reader}`},query:{limit:'1',schemaVersion:'2',recordType:'weight',sourcePackage:'com.example.synthetic'}},readResponse);
    assert.equal(readResponse.code,200);
    const readUrl=new URL(calls[1].url);
    assert.equal(readUrl.searchParams.get('schema_version'),'eq.2');
    assert.equal(readUrl.searchParams.get('record_type'),'eq.weight');
    assert.equal(readUrl.searchParams.get('source_package'),'eq.com.example.synthetic');
  } finally {globalThis.fetch=originalFetch;for(const [k,v] of Object.entries(originalEnv))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});

test('fragmented v2 payload stages idempotently and finalizes only after hash validation',async()=>{
  const originalEnv = Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
  Object.assign(process.env,env);
  const originalFetch=globalThis.fetch;
  const record=v2Record();
  const raw=Buffer.from(JSON.stringify(v2Body(record)),'utf8');
  const cut=Math.ceil(raw.length/2);
  const chunks=[raw.subarray(0,cut),raw.subarray(cut)];
  const sha256=createHash('sha256').update(raw).digest('hex');
  const fragments=chunks.map((chunk,index)=>({recordType:record.recordType,sourceId:record.sourceId,lastModifiedTime:record.lastModifiedTime,sha256,index,count:chunks.length,payloadBase64:chunk.toString('base64')}));
  const stored=new Map();
  const calls=[];
  globalThis.fetch=async (url,init)=>{
    calls.push({url,init});
    const path=new URL(url).pathname;
    const requestBody=JSON.parse(init.body);
    if(path.endsWith('/coach_stage_health_fragment')) {
      stored.set(requestBody.p_fragment_index,requestBody.p_payload_base64);
      return {ok:true,json:async()=>({accepted:1,complete:stored.size===requestBody.p_fragment_count})};
    }
    if(path.endsWith('/coach_read_health_fragment')) {
      return {ok:true,json:async()=>[...stored.entries()].sort((a,b)=>a[0]-b[0]).slice(requestBody.p_after_index,requestBody.p_after_index+requestBody.p_limit).map(([index,payloadBase64])=>({index,payloadBase64}))};
    }
    if(path.endsWith('/coach_finalize_health_fragment')) return {ok:true,json:async()=>1};
    throw new Error(`unexpected ${path}`);
  };
  try {
    const request={method:'POST',headers:{authorization:`Bearer ${ingest}`,'content-type':'application/json'},body:{schemaVersion:2,fragments}};
    const res=response(); await sync(request,res);
    assert.equal(res.code,200); assert.deepEqual(res.body,{accepted:2});
    assert.ok(calls.some(call=>call.url.endsWith('/coach_finalize_health_fragment')));
    const retry=response(); await sync({...request,body:{schemaVersion:2,fragments:[fragments[0]]}},retry);
    assert.equal(retry.code,200); assert.deepEqual(retry.body,{accepted:1});
  } finally {globalThis.fetch=originalFetch;for(const [k,v] of Object.entries(originalEnv))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});

test('fragment hash mismatch never calls finalize',async()=>{
  const originalEnv = Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
  Object.assign(process.env,env);
  const originalFetch=globalThis.fetch;
  const record=v2Record();
  const raw=Buffer.from(JSON.stringify(v2Body(record)),'utf8');
  const fragment={recordType:record.recordType,sourceId:record.sourceId,lastModifiedTime:record.lastModifiedTime,sha256:'0'.repeat(64),index:0,count:1,payloadBase64:raw.toString('base64')};
  const calls=[];
  globalThis.fetch=async (url,init)=>{calls.push({url,init});const path=new URL(url).pathname;if(path.endsWith('/coach_stage_health_fragment'))return {ok:true,json:async()=>({accepted:1,complete:true})};if(path.endsWith('/coach_read_health_fragment'))return {ok:true,json:async()=>[{index:0,payloadBase64:fragment.payloadBase64}]};if(path.endsWith('/coach_finalize_health_fragment'))return {ok:true,json:async()=>1};throw new Error(`unexpected ${path}`);};
  try {
    const res=response(); await sync({method:'POST',headers:{authorization:`Bearer ${ingest}`,'content-type':'application/json'},body:{schemaVersion:2,fragments:[fragment]}},res);
    assert.equal(res.code,400); assert.equal(res.body.error,'fragment_hash_mismatch');
    assert.equal(calls.filter(call=>call.url.endsWith('/coach_finalize_health_fragment')).length,0);
  } finally {globalThis.fetch=originalFetch;for(const [k,v] of Object.entries(originalEnv))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});

test('large v2 reads expose paginated detail instead of oversized output',async()=>{
  const originalEnv = Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
  Object.assign(process.env,env);
  const originalFetch=globalThis.fetch;
  const largeRow={id:99,schema_version:2,record_type:'weight',source_id:'large',data_bytes:4_100_000};
  globalThis.fetch=async (url)=>{
    if(url.includes('/rpc/coach_read_health_detail')) return {ok:true,json:async()=>({id:99,schemaVersion:2,offset:0,totalBytes:2,dataBase64:'e30=',nextOffset:null})};
    return {ok:true,json:async()=>[largeRow]};
  };
  try {
    const list=response();
    await read({method:'GET',headers:{authorization:`Bearer ${reader}`},query:{limit:'1'}},list);
    assert.equal(list.code,200); assert.equal(list.body.records[0].data,null); assert.equal(list.body.records[0].detailAvailable,true); assert.equal(list.body.records[0].detailCursor,'99');
    assert.ok(Buffer.byteLength(JSON.stringify(list.body),'utf8') < 4_000_000);
    const detail=response();
    await read({method:'GET',headers:{authorization:`Bearer ${reader}`},query:{detailId:'99',detailLimit:'240000'}},detail);
    assert.equal(detail.code,200); assert.equal(detail.body.detail.id,99); assert.equal(detail.body.detail.nextOffset,null);
  } finally {globalThis.fetch=originalFetch;for(const [k,v] of Object.entries(originalEnv))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});

test('v2 long series are byte-bounded, not rejected at 10000 samples',()=>{
  const r=v2Record('heart_rate');
  r.data.samples=Array.from({length:14000},()=>({time:r.startTime,beatsPerMinute:{value:80,unit:'beats_per_minute'}}));
  const payload=v2Body(r);
  assert.ok(Buffer.byteLength(JSON.stringify(payload))>1_000_000);
  assert.throws(()=>validateBatch(payload),e=>e.status===413);
  assert.equal(validateBatch(payload,{maxPayloadBytes:32*1024*1024})[0].data.samples.length,14000);
});

test('empty filters fail closed and opaque source IDs remain literal in URL-encoded PostgREST equality filters',async()=>{
  const previous={...process.env}; const originalFetch=globalThis.fetch; Object.assign(process.env,env);
  let calls=0; let path;
  globalThis.fetch=async url=>{calls++;path=new URL(url);return {ok:true,json:async()=>[]};};
  try {
    for(const key of ['recordType','schemaVersion','sourceId','sourcePackage','from','to']) {
      const res=response();await read({method:'GET',headers:{authorization:`Bearer ${reader}`},query:{[key]:''}},res);
      assert.equal(res.code,400,key);assert.equal(calls,0);
    }
    const source='source,(opaque)"\\end';
    const res=response();await read({method:'GET',headers:{authorization:`Bearer ${reader}`},query:{sourceId:source,from:'2026-09-20T00:00:00.0000001Z'}},res);
    assert.equal(res.code,200);assert.match(path.pathname,/coach_health_record_headers$/);
    assert.equal(path.searchParams.get('source_id'),'eq.'+source);assert.equal(path.searchParams.has('or'),false);
    assert.match(path.searchParams.get('end_ns'),/^gte\.\d+100$/);
  } finally {globalThis.fetch=originalFetch; for(const key of Object.keys(env)) if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
});
