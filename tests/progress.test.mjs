import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeHealth, trainingWeek, monday } from '../dist/src/components/progress/progressData.js';
import { createProgressHandler } from '../dist/api/progress.js';
const row = (id, type, start, end, rest = {}) => ({ id, record_type: type, source_package: 'com.sec.android.app.shealth', start_time: start, end_time: end, ...rest });
test('Samsung only; missing data stays null; overlapping intervals are not added', () => {
 const rows = [row(1,'steps','2026-09-27T22:00:00Z','2026-09-28T21:59:59Z',{count:{value:12442,unit:'count'}}),row(2,'steps','2026-09-27T22:00:00Z','2026-09-28T21:59:59Z',{source_package:'phone',count:20000})];
 const result = summarizeHealth(rows,'2026-09-28','2026-09-29');
 assert.equal(result.days[0].steps,12442); assert.equal(result.days[1].steps,null);
 rows.push({...rows[0],id:3});
 assert.equal(summarizeHealth(rows,'2026-09-28','2026-09-28').days[0].stepsConflict,true);
});
test('night is assigned to Madrid wake date, union excludes overlaps and gaps; nap separate', () => {
 const rows = [row(1,'sleep_session','2026-09-27T21:20:00Z','2026-09-27T22:44:00Z'),row(2,'sleep_session','2026-09-27T23:00:00Z','2026-09-28T03:14:00Z'),row(3,'sleep_session','2026-09-28T03:30:00Z','2026-09-28T04:33:00Z'),row(4,'sleep_session','2026-09-28T03:30:00Z','2026-09-28T04:33:00Z'),row(5,'sleep_session','2026-09-28T12:00:00Z','2026-09-28T13:17:00Z')];
 const d = summarizeHealth(rows,'2026-09-28','2026-09-29').days;
 assert.equal(d[0].sleepHours,401/60); assert.equal(d[0].daytimeHours,77/60); assert.equal(d[1].sleepHours,null);
});
test('Renpho grams converted without invented historical measurements', () => {
 const r = summarizeHealth([row(1,'weight','2026-09-28T06:05:00Z','2026-09-28T06:05:00Z',{source_package:'com.renpho.health',weight:{unit:'gram',value:100599.998}})],'2026-09-28','2026-10-03');
 assert.deepEqual(r.weights,[{date:'2026-09-28',kg:100.6,source:'Renpho'}]);
});
test('empty drafts do not count as work, finishedAt not required, saved targets preserved', () => {
 const data={version:1,sessions:[{performedOn:'2026-09-28',routineSessionId:'a',logs:[{sets:[{loadKg:0,reps:12}],loadType:'bodyweight'}],plannedItems:[{sets:3}],plannedCardio:{moderateMinutes:20},cardio:{moderateMinutes:10,warmupMinutes:5,cooldownMinutes:5},finishedAt:null},{performedOn:'2026-09-29',logs:[]}],skippedDates:['2026-10-02']};
 const plan={effectiveFrom:'2026-09-25',days:[{weekday:'monday',sessions:[{id:'a',items:[{sets:10}],cardio:{moderateMinutes:50}}]}]};
 const w=trainingWeek(data,plan,'2026-09-28','2026-10-03');
 assert.equal(w[0].series,1); assert.equal(w[0].target,20); assert.equal(w[0].plannedSeries,3); assert.equal(w[1].series,0); assert.equal(w[4].skipped,true); assert.equal(w[6].future,true);
 assert.equal(trainingWeek(data,{...plan,effectiveFrom:'2026-10-05'},'2026-09-28','2026-10-03')[0].target,null);
 assert.equal(monday('2026-10-03'),'2026-09-28');
});
const call = async(handler,query={from:'2026-09-28',to:'2026-10-03'},method='GET') => {const res={status(c){this.code=c;return this},json(b){this.body=b;return this},setHeader(){}};await handler({method,query,headers:{}},res);return res;};
test('progress requires verified owner, GET only, bounded dates, no injected scope',async()=>{
 let reads=0;const health=async()=>{reads++;return {days:[],weights:[]}};
 assert.equal((await call(createProgressHandler(async()=>null,health,async()=>[]))).code,401);assert.equal(reads,0);
 const handler=createProgressHandler(async()=>'owner',health,async()=>[]);
 assert.equal((await call(handler,undefined,'POST')).code,405);
 for(const query of [{from:'2026-01-01',to:'2026-10-03'},{from:'2026-09-31',to:'2026-10-03'},{from:'2026-09-28',to:'2026-10-03',owner:'other'}]) assert.equal((await call(handler,query)).code,400);
 assert.equal(reads,0);assert.equal((await call(handler)).code,200);
});
test('one source unavailable stays explicit and does not erase available source',async()=>{
 const handler=createProgressHandler(async()=>'owner',async()=>{throw Error('secret')},async()=>[{date:'2026-09-28',kg:100.6,source:'Coach'}]);
 const result=await call(handler);assert.equal(result.body.health,null);assert.equal(result.body.weights.length,1);assert.ok(!JSON.stringify(result).includes('secret'));
});
test('health read scopes profile/device, excludes ignored rows and paginates scalar projection',async()=>{
 const {readProgressHealth}=await import('../dist/api/progress.js');
 const oldFetch=globalThis.fetch,oldEnv={...process.env};
 Object.assign(process.env,{COACH_HEALTH_SUPABASE_URL:'https://synthetic.test',COACH_HEALTH_SERVICE_ROLE_KEY:'fake',COACH_HEALTH_PROFILE_ID:'qa-profile',COACH_HEALTH_DEVICE_ID:'qa-device',COACH_HEALTH_SYNC_TOKEN_SHA256:'a'.repeat(64),COACH_HEALTH_READ_TOKEN_SHA256:'b'.repeat(64)});
 let pages=0;
 globalThis.fetch=async(input)=>{const q=new URL(input).searchParams;pages++;assert.equal(q.get('profile_id'),'eq.qa-profile');assert.equal(q.get('device_id'),'eq.qa-device');assert.equal(q.get('excluded'),'eq.false');assert.equal(q.get('select'),'id,record_type,source_package,start_time,end_time,count:data->count,weight:data->weight');return Response.json(pages===1?Array.from({length:500},(_,i)=>row(i,'weight','2026-09-28T06:00:00Z','2026-09-28T06:00:00Z',{source_package:'com.renpho.health',weight:{value:100000,unit:'gram'}})):[]);};
 try {assert.equal((await readProgressHealth('2026-09-28','2026-10-03')).weights.length,500);assert.equal(pages,2);}finally{globalThis.fetch=oldFetch;for(const k of Object.keys(process.env))if(!(k in oldEnv))delete process.env[k];Object.assign(process.env,oldEnv);}
});
test('charging explanation applies only to confirmed missing nights',async()=>{
 const health=async()=>({days:[{date:'2026-09-29',sleepHours:null},{date:'2026-10-03',sleepHours:7},{date:'2026-10-04',sleepHours:null}],weights:[]});
 const result=await call(createProgressHandler(async()=>'owner',health,async()=>[]));
 assert.deepEqual(result.body.health.sleepNotes.map(n=>n.date),['2026-09-29']);
});
