import assert from 'node:assert/strict';
import test from 'node:test';
import { comparableHistory, comparableRecords, exerciseDraft, parseSetDraft, progressionSuggestion, restSeconds, plateCalculation, sessionSummary } from '../dist/src/components/training/trainingInsights.js';
import { validTrainingData, isSessionRecorded } from '../dist/src/components/training/trainingStorage.js';
import { statusForDay } from '../dist/src/components/training/trainingPlan.js';
import { weightTrend, trainingWeek } from '../dist/src/components/progress/progressData.js';
import { muscleDistribution } from '../dist/src/components/progress/muscleData.js';
const item={id:'slot',exerciseId:'exercise.catalog.001',sets:2,reps:'8–12',rir:'2–3',rest:90,loadGuidance:'',instructions:''};
const set={loadKg:40,reps:12};
const log={plannedItemId:'slot',exerciseId:item.exerciseId,loadType:'external',sets:[set,set],rir:2,status:'completed',comment:'',updatedAt:'2026-09-28T10:00:00Z'};
const old={id:'old',performedOn:'2026-09-28',exerciseIds:[item.exerciseId],logs:[log],finishedAt:null,routineId:'plan',routineDayId:'m',routineSessionId:'a',plannedItems:[item]};
const current={...old,id:'now',performedOn:'2026-10-05',logs:[]};
const data={version:1,sessions:[old,current],exerciseNotes:[]};
const routine={id:'plan',days:[{id:'m',weekday:'monday',kind:'strength',sessions:[{id:'a',items:[item]}]}]};
test('incremental logs do not complete a day; old and explicitly finished partial records do',()=>{
 const s={...current,logs:[{...log,recording:'in-progress',sets:[{...set,rir:3,kind:'work',recordedAt:'2026-10-05T10:00:00Z'}]}]};
 assert.equal(validTrainingData({...data,sessions:[s]}),true);assert.equal(isSessionRecorded(s),false);
 assert.equal(statusForDay(routine,{...data,sessions:[s]},new Date('2026-10-05T12:00:00Z')),'in-progress');
 s.logs[0].recording='finished';s.logs[0].status='partial';assert.equal(isSessionRecorded(s),true);
 delete s.logs[0].recording;assert.equal(isSessionRecorded(s),true);
});
test('new set metadata rejects malformed effort, kind, timestamp and recording state',()=>{
 for(const invalid of [{rir:11},{rir:.5},{kind:'drop'},{recordedAt:'not-a-date'}])assert.equal(validTrainingData({...data,sessions:[{...old,logs:[{...log,sets:[{...set,...invalid}]}]}]}),false);
 assert.equal(validTrainingData({...data,sessions:[{...old,logs:[{...log,recording:'saved'}]}]}),false);
 assert.equal(validTrainingData(data),true);
});
test('same slot/day/variant history excludes future, same date, incomplete and atypical sessions',()=>{
 const candidates=[old,{...old,id:'light',routineDayId:'light'},{...old,id:'future',performedOn:'2026-10-06'},{...old,id:'same',performedOn:'2026-10-05'},...['in-progress','excluded','variant'].map(id=>({...old,id,logs:[{...log,...(id==='in-progress'?{recording:'in-progress'}:id==='excluded'?{excludeFromProgression:true}:{exerciseId:'another'})}]}))];
 assert.deepEqual(comparableHistory({...data,sessions:candidates},current,item.exerciseId,item).map(e=>e.session.id),['old']);
});
test('prefill is an unsaved editable proposal; never clones effort or invents missing rows',()=>{
 const last={...log,sets:[{...set,rir:3,recordedAt:'2026-09-28T10:00:00Z'},{...set,kind:'warmup'}]};
 const draft=exerciseDraft(undefined,last,item);assert.equal(draft.length,2);assert.equal(draft[0].loadKg,'40');assert.equal(draft[0].rir,'');assert.equal(draft[0].saved,undefined);assert.equal(draft[1].loadKg,'');
 const partial=exerciseDraft({...log,recording:'in-progress',sets:[set]},log,item);assert.equal(partial[0].saved.loadKg,40);assert.equal(partial[1].saved,undefined);
});
test('per-set parsing validates blank external load, zero bodyweight, integers and warmups',()=>{
 const row={loadKg:'',reps:'12',rir:'',kind:'work'};assert.throws(()=>parseSetDraft(row,'external'));assert.equal(parseSetDraft(row,'bodyweight').loadKg,0);
 assert.equal(parseSetDraft({...row,loadKg:'12,5',rir:'0',kind:'warmup'},'external').rir,0);
 for(const patch of [{reps:'2.5'},{reps:'0'},{rir:'11'},{loadKg:'Infinity'}])assert.throws(()=>parseSetDraft({...row,loadKg:'20',...patch},'external'));
});
test('progression explains plan changes, missing effort, lower reserve, reps and load without mutation',()=>{
 const history=[{session:old,log}], before=structuredClone(data);
 assert.match(progressionSuggestion(history,item).title,/subir la carga/);
 assert.match(progressionSuggestion([{session:old,log:{...log,rir:null}}],item).reason,/Falta RIR/);
 assert.match(progressionSuggestion([{session:old,log:{...log,rir:0}}],item).title,/No subir/);
 assert.match(progressionSuggestion(history,{...item,sets:3}).title,/plan cambió/);
 assert.match(progressionSuggestion([{session:old,log:{...log,sets:[{loadKg:40,reps:9},{loadKg:40,reps:9}]}}],item).title,/repeticiones/);
 assert.deepEqual(data,before);
});
test('records require a prior comparable exposure and exclude warmups, other load type and unfinished work',()=>{
 const history=[{session:old,log}], newLog={...log,sets:[{loadKg:40,reps:13},{loadKg:50,reps:12},{loadKg:80,reps:12,kind:'warmup'}]};
 assert.deepEqual(comparableRecords(newLog,history).map(r=>r.kind),['reps','load']);assert.equal(comparableRecords(newLog,[]).length,0);
 assert.equal(comparableRecords({...newLog,loadType:'bodyweight'},history).length,0);assert.equal(comparableRecords({...newLog,recording:'in-progress'},history).length,0);
});
test('rest parser accepts unit-bearing ranges, does not turn arbitrary text into seconds',()=>{
 assert.equal(restSeconds('90–120 s'),120);assert.equal(restSeconds('1,5 min'),90);assert.equal(restSeconds('según tolerancia'),null);assert.equal(restSeconds('90–120'),null);assert.equal(restSeconds(0),null);
});
test('bar calculator respects bar mass, available sizes and never rounds upward',()=>{
 assert.deepEqual(plateCalculation(60,20,[20,10,5,2.5,1.25]),{plates:[20],achievable:60,missing:0});
 assert.equal(plateCalculation(62,20,[20,10,5,2.5,1.25]).achievable,60);assert.equal(plateCalculation(10,20,[5]),null);assert.equal(plateCalculation(21,20,[]).missing,1);
});
test('warmups remain in history but not work volume, weekly series or muscle counts',()=>{
 const session={...old,logs:[{...log,sets:[set,{loadKg:20,reps:10,kind:'warmup'}]}]};
 assert.deepEqual(sessionSummary(session),{sets:1,warmups:1,reps:12,externalVolume:480,partial:0,cardioMinutes:0});
 assert.equal(trainingWeek({...data,sessions:[session]},null,'2026-09-28','2026-10-05')[0].series,1);
 const muscles=muscleDistribution([session]);assert.equal(muscles.find(g=>g.region==='Pecho').primary,1);assert.equal(muscles.find(g=>g.region==='Tríceps').secondary,1);
});
test('weight trend requires three measured days in seven, separate sources and no future leakage',()=>{
 const weights=[{date:'2026-10-01',kg:100,source:'Coach'},{date:'2026-10-02',kg:102,source:'Coach'},{date:'2026-10-03',kg:101,source:'Coach'},{date:'2026-10-03',kg:90,source:'Renpho'},{date:'2026-10-15',kg:95,source:'Coach'}];
 const trends=weightTrend(weights);assert.deepEqual(trends[0].points.map(p=>p.kg),[null,null,101,null]);assert.equal(trends[1].points[0].kg,null);
});
test('cached old clients cannot remove new per-set metadata; updated client can write',async()=>{
 const {createTrainingHandler,createMemoryTrainingStore}=await import('../dist/api/training.js');
 const store=createMemoryTrainingStore(),owner='owner';const enhanced={...data,sessions:[{...old,logs:[{...log,recording:'in-progress',sets:[{...set,rir:2,kind:'work'}]}]}]};
 await store.write(owner,{baseRevision:0,requestId:'initial',data:enhanced});
 const handler=createTrainingHandler(store,()=>owner);
 const invoke=async headers=>{const res={status(code){this.code=code;return this},json(body){this.body=body;return this},setHeader(){}};await handler({method:'PUT',query:{resource:'records'},headers,body:{baseRevision:1,requestId:'change',data}},res);return res;};
 assert.equal((await invoke({})).code,426);assert.equal((await store.read(owner)).revision,1);
 assert.equal((await invoke({'x-coach-recording':'series-v1'})).code,200);
});
test('historical plan reads use the requested date and reject future or malformed dates',async()=>{
 const {createTrainingHandler,createPostgrestTrainingStore}=await import('../dist/api/training.js');
 const {acceptedTrainingPlan}=await import('../dist/api/_training/plan.js');
 const owner='00000000-0000-4000-8000-000000000001',original={...process.env};
 Object.assign(process.env,{COACH_TRAINING_PLAN_MODE:'database',COACH_TRAINING_OWNER_ID:owner,COACH_TRAINING_PLAN_ID:acceptedTrainingPlan.id});
 let body;
 const store=createPostgrestTrainingStore({baseUrl:'https://synthetic.test',apiKey:'fake',fetcher:async(_,init)=>{body=JSON.parse(init.body);return Response.json(acceptedTrainingPlan);}});
 const handler=createTrainingHandler(store,()=>owner);
 const get=async on=>{const res={status(code){this.code=code;return this},json(value){this.body=value;return this},setHeader(){}};await handler({method:'GET',query:{resource:'plan',on},headers:{}},res);return res;};
 try{assert.equal((await get('2026-09-28')).code,200);assert.equal(body.p_on,'2026-09-28');for(const date of ['2026-02-31','2099-01-01',['2026-09-28']])assert.equal((await get(date)).code,400);}
 finally{for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original);}
});
