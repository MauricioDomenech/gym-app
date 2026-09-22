import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { config, authorize, validateBatch } from '../dist/api/_health/core.js';
import sync from '../dist/api/health-sync.js';
import read from '../dist/api/health-records.js';
const ingest = 'synthetic-ingest-token-000000000000000000';
const reader = 'synthetic-reader-token-000000000000000000';
const hash = s => createHash('sha256').update(s).digest('hex');
const env = { COACH_HEALTH_SUPABASE_URL: 'https://example.invalid', COACH_HEALTH_SERVICE_ROLE_KEY: 'synthetic-service-role', COACH_HEALTH_PROFILE_ID: 'synthetic-profile', COACH_HEALTH_DEVICE_ID: 'synthetic-device', COACH_HEALTH_SYNC_TOKEN_SHA256: hash(ingest), COACH_HEALTH_READ_TOKEN_SHA256: hash(reader) };
const record = () => ({ recordType: 'exercise_session', sourceId: 'synthetic-session', sourcePackage: 'com.example.synthetic', lastModifiedTime:'2026-09-22T09:30:00Z', startTime:'2026-09-22T09:00:00Z', endTime:'2026-09-22T09:25:00Z', startZoneOffsetSeconds:7200, endZoneOffsetSeconds:7200, data:{exerciseType:79,title:null,notes:null} });
const body = r => ({schemaVersion:1,records:[r]});
const response = () => ({ code:0, headers:{}, setHeader(k,v){ this.headers[k]=v; }, status(n){this.code=n;return this;},json(b){this.body=b;return this;} });
const request = (token = ingest) => ({method:'POST', headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:body(record()),query:{}});

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
test('endpoints: no DB calls before auth, ACK after persist, private scoped pagination',async()=>{
  const originalEnv = Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
  Object.assign(process.env,env);
  const originalFetch=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async (url,init)=>{calls.push({url,init});return {ok:true,json:async()=>url.includes('/rpc/')?1:[{id:10},{id:11}]};};
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
