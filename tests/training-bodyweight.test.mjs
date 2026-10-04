import test from 'node:test';
import assert from 'node:assert/strict';
import {validTrainingData, formatTrainingSet} from '../dist/src/components/training/trainingStorage.js';
const data = {version:1, exerciseNotes:[], sessions:[{id:'qa', performedOn:'2026-09-30', exerciseIds:['exercise.catalog.034'], finishedAt:null, logs:[{exerciseId:'exercise.catalog.034',sets:[{loadKg:0,reps:12}],rir:2,status:'completed',comment:'original',updatedAt:'2026-09-30T06:46:52.183Z'}]}]};
test('legacy zero stays external; bodyweight and added load round-trip explicitly',()=>{
 assert.equal(validTrainingData(data),true);
 assert.equal(formatTrainingSet(data.sessions[0].logs[0].sets[0]),'0 kg × 12');
 const copy=structuredClone(data);copy.sessions[0].logs[0].loadType='bodyweight';
 const restored=JSON.parse(JSON.stringify(copy));
 assert.equal(validTrainingData(restored),true);
 assert.equal(formatTrainingSet(restored.sessions[0].logs[0].sets[0],restored.sessions[0].logs[0].loadType),'Peso corporal × 12');
 assert.equal(formatTrainingSet({loadKg:5,reps:12},'bodyweight'),'Peso corporal + 5 kg × 12');
 restored.sessions[0].logs[0].loadType='invalid';assert.equal(validTrainingData(restored),false);
 assert.equal(data.sessions[0].logs[0].comment,'original');
});
