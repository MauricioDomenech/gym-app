import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptedTrainingPlan as plan } from '../dist/api/_training/plan.js';
import { validTrainingData, validRoutineItem } from '../dist/src/components/training/trainingStorage.js';
import { isTrainingRoutine } from '../dist/src/components/training/trainingPlan.js';
const friday=plan.days[4].sessions[0];
const make = () => ({version:1,exerciseNotes:[],sessions:[{id:'qa',performedOn:'2026-09-25',exerciseIds:friday.items.map(i=>i.exerciseId),plannedItems:structuredClone(friday.items),logs:[],finishedAt:null}]});
const log=(p,e)=>({plannedItemId:p,exerciseId:e,sets:[{loadKg:10,reps:8}],rir:2,status:'completed',comment:'',updatedAt:'2026-09-25T10:00:00Z'});
test('rutina aprobada: dosis, alternativas y excepciones',()=>{
 assert.ok(isTrainingRoutine(plan));assert.equal(plan.version,2);
 assert.deepEqual(plan.days.filter(d=>d.kind==='mixed').map(d=>d.sessions[0].items.reduce((n,i)=>n+i.sets,0)),[14,19,18]);
 const cardio=plan.days.flatMap(d=>d.sessions.map(s=>s.cardio));
 assert.equal(cardio.reduce((n,c)=>n+c.moderateMinutes,0),160);
 assert.equal(cardio.reduce((n,c)=>n+c.moderateMinutes+c.warmupMinutes+c.cooldownMinutes,0),210);
 assert.equal(plan.days[0].sessions[0].items[1].alternatives[1].reps,'10–15');
 assert.equal(plan.days[2].sessions[0].items[3].alternatives[0].reps,'8–12');
 assert.deepEqual(friday.items[7].alternatives,[]);
});
test('misma variante en dos puestos conserva identidad y rechaza variantes ajenas',()=>{
 const d=make();const [row,pull]=[friday.items[2],friday.items[4]];
 // Synthetic two-slot reuse proves the generic contract without changing the real plan.
 d.sessions[0].plannedItems[4].alternatives.push({exerciseId:row.exerciseId});
 d.sessions[0].logs=[log(row.id,row.exerciseId),log(pull.id,row.exerciseId)];
 assert.ok(validTrainingData(d));
 d.sessions[0].logs[1].exerciseId='foreign';assert.equal(validTrainingData(d),false);
 d.sessions[0].logs[1]=log(row.id,row.exerciseId);assert.equal(validTrainingData(d),false);
 d.sessions[0].logs[1]=log('foreign-slot',row.exerciseId);assert.equal(validTrainingData(d),false);
});
test('legacy compatible, sin log doble legacy/slot ni alternativas malformadas',()=>{
 const d=make();const p=friday.items[0];const l=log(p.id,p.exerciseId);delete l.plannedItemId;
 d.sessions[0].logs=[l];assert.ok(validTrainingData(d));
 d.sessions[0].logs.push(log(p.id,p.alternatives[0].exerciseId));assert.equal(validTrainingData(d),false);
 assert.equal(validRoutineItem({...p,alternatives:[{exerciseId:p.exerciseId}]}),false);
 assert.equal(validRoutineItem({...p,alternatives:[{exerciseId:'x',reps:{}}]}),false);
 assert.equal(validRoutineItem({...p,alternatives:[{exerciseId:'x'},{exerciseId:'x'}]}),false);
});
