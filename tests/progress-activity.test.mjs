import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeActivities, cardioCandidates, comparableCardio } from '../dist/src/components/progress/activityData.js';
import { createProgressHandler,readProgressActivities } from '../dist/api/progress.js';
const start='2026-10-01T10:00:00Z',end='2026-10-01T10:30:00Z';
const row=(id,record_type,rest={})=>({id,record_type,source_package:'com.sec.android.app.shealth',start_time:start,end_time:end,...rest});
const base=[row(1,'exercise_session',{exerciseType:{value:57,unit:'code'}}),row(2,'heart_rate',{samples:[{time:'2026-10-01T10:00:30Z',beatsPerMinute:{value:120,unit:'beats_per_minute'}},{time:'2026-10-01T10:02:30Z',bpm:140},{time:'2026-10-01T10:30:00Z',bpm:200}]}),row(3,'speed',{samples:[{time:start,speed:{value:2,unit:'meter_per_second'}}]}),row(4,'distance',{distance:{value:3200,unit:'meter'}})];
test('watch stats use exercise window only, convert speed and retain gaps',()=>{
 const [a]=summarizeActivities(base,'2026-10-01','2026-10-01');assert.equal(a.bpm,130);assert.equal(a.peakBpm,140);assert.equal(a.kmh,7.2);assert.equal(a.distanceKm,3.2);assert.equal(a.coveredPulseMinutes,2);assert.equal(a.timeline[1].bpm,null);assert.equal(a.timeline.length,30);
});
test('duplicates do not inflate activity or samples; conflicting instants are excluded',()=>{
 const rows=[...base,{...base[0],id:8},{...base[1],id:9}];const [a]=summarizeActivities(rows,'2026-10-01','2026-10-01');assert.equal(a.pulseSamples,2);
 rows.push(row(10,'heart_rate',{samples:[{time:'2026-10-01T10:00:30Z',bpm:130}]}));const [b]=summarizeActivities(rows,'2026-10-01','2026-10-01');assert.equal(b.pulseSamples,1);assert.equal(b.bpm,140);assert.equal(b.conflicts,1);
});
test('wrong sources, excluded rows and partial-distance intervals do not contaminate summaries',()=>{
 const rows=base.map(r=>r.record_type==='distance'?{...r,start_time:'2026-10-01T09:00:00Z'}:r);rows.push(row(11,'heart_rate',{source_package:'other',samples:[{time:start,bpm:250}]}));
 assert.equal(summarizeActivities(rows,'2026-10-01','2026-10-01')[0].distanceKm,null);assert.equal(summarizeActivities(rows.map(r=>({...r,excluded:true})),'2026-10-01','2026-10-01').length,0);
});
test('Coach matching is candidate-only by date/type/duration, all ambiguities retained',()=>{
 const [a]=summarizeActivities(base,'2026-10-01','2026-10-01');const session={performedOn:'2026-10-01',cardio:{warmupMinutes:5,moderateMinutes:20,cooldownMinutes:5}};
 assert.equal(cardioCandidates(session,[a,{...a,id:'b'}]).length,2);assert.equal(cardioCandidates({...session,performedOn:'2026-10-02'},[a]).length,0);assert.equal(cardioCandidates(session,[{...a,type:0}]).length,0);
});
test('cardio comparison requires earlier matching type, enough pulse and similar speed/duration',()=>{
 const [a]=summarizeActivities(base,'2026-10-01','2026-10-01');const current={...a,id:'current',start:'2026-10-03T10:00:00Z',coveredPulseMinutes:25},previous={...a,coveredPulseMinutes:25};
 assert.equal(comparableCardio(current,[previous]).length,1);for(const patch of [{kmh:10},{minutes:10},{conflicts:1},{coveredPulseMinutes:1},{type:79},{bpm:null}])assert.equal(comparableCardio(current,[{...previous,...patch}]).length,0);
});
const call=async(handler,query)=>{const res={status(code){this.code=code;return this},json(body){this.body=body;return this},setHeader(){}};await handler({method:'GET',query,headers:{}},res);return res;};
test('activity API requires owner and bounded dates; does not expose database errors',async()=>{
 let count=0;const activity=async()=>{count++;return []};const query={resource:'activity',from:'2026-10-01',to:'2026-10-02'};
 assert.equal((await call(createProgressHandler(async()=>null,undefined,undefined,activity),query)).code,401);assert.equal(count,0);
 assert.equal((await call(createProgressHandler(async()=>'owner',undefined,undefined,activity),query)).code,200);assert.equal(count,1);
 assert.equal((await call(createProgressHandler(async()=>'owner',undefined,undefined,activity),{...query,owner:'other'})).code,400);
 const failed=await call(createProgressHandler(async()=>'owner',undefined,undefined,async()=>{throw Error('private-key');}),query);assert.equal(failed.code,503);assert.ok(!JSON.stringify(failed).includes('private-key'));
});
test('activity reader scopes device and owner profile; only summaries leave the API',async()=>{
 const oldFetch=globalThis.fetch,env={...process.env};Object.assign(process.env,{COACH_HEALTH_SUPABASE_URL:'https://synthetic.test',COACH_HEALTH_SERVICE_ROLE_KEY:'fake',COACH_HEALTH_PROFILE_ID:'profile',COACH_HEALTH_DEVICE_ID:'device',COACH_HEALTH_SYNC_TOKEN_SHA256:'a'.repeat(64),COACH_HEALTH_READ_TOKEN_SHA256:'b'.repeat(64)});
 globalThis.fetch=async input=>{const q=new URL(input).searchParams;assert.equal(q.get('profile_id'),'eq.profile');assert.equal(q.get('device_id'),'eq.device');assert.equal(q.get('excluded'),'eq.false');assert.equal(q.get('source_package'),'eq.com.sec.android.app.shealth');return Response.json(base);};
 try{const result=await readProgressActivities('2026-10-01','2026-10-01');assert.equal(result.length,1);assert.equal(result[0].samples,undefined);assert.equal(result[0].source_id,undefined);}finally{globalThis.fetch=oldFetch;for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);}
});
