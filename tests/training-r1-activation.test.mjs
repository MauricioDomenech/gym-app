import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticateTrainingOwner } from '../dist/api/_training/auth.js';
import { createTrainingHandler, createPostgrestTrainingStore } from '../dist/api/training.js';
import { build } from 'esbuild';
const built = await build({entryPoints:['src/components/training/trainingConnection.ts'],bundle:true,platform:'node',format:'esm',write:false});
const { acceptTrainingResponse, clearTrainingResponse, trainingSnapshot, removeLegacyTrainingCopies } = await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
import { acceptedTrainingPlan } from '../dist/api/_training/plan.js';

const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const empty = () => ({ version: 1, sessions: [], exerciseNotes: [] });
const note = text => ({ ...empty(), exerciseNotes: [{ id: 'note', exerciseId: 'e', author: 'Mauri', text, pinned: false, updatedAt: '2026-09-22T08:00:00.000Z' }] });
const envelope = (data, revision = 1) => ({ schemaVersion: 1, revision, data });
test('Supabase verifies bearer; wrong owner, invalid token, missing config and forged headers fail closed', async () => {
  process.env.COACH_TRAINING_DB_URL = 'https://auth.example.test';
  process.env.COACH_AUTH_PUBLIC_KEY = 'synthetic-public';
  process.env.COACH_TRAINING_OWNER_ID = owner;
  const req = { headers: { authorization: 'Bearer synthetic-token' } };
  let count = 0;
  const fetcher = async (url, init) => {
    count++;
    assert.equal(url, 'https://auth.example.test/auth/v1/user');
    assert.equal(init.headers.Authorization, req.headers.authorization);
    assert.equal(init.redirect, 'error');
    return Response.json({ id: owner });
  };
  assert.equal(await authenticateTrainingOwner(req, fetcher), owner);
  assert.equal(await authenticateTrainingOwner({ headers: {'x-coach-owner':owner} }, fetcher), null);
  assert.equal(count,1);
  assert.equal(await authenticateTrainingOwner(req, async () => Response.json({id:other})), null);
  assert.equal(await authenticateTrainingOwner(req, async () => new Response('', {status:401})), null);
  await assert.rejects(authenticateTrainingOwner(req, async () => { throw new Error('secret transport details'); }), { name: 'TrainingAuthUnavailableError', message: 'training authentication unavailable' });
  await assert.rejects(authenticateTrainingOwner(req, async () => new Response('', {status:503})), { name: 'TrainingAuthUnavailableError' });
  const unavailable = {statusCode:200,status(c){this.statusCode=c;return this;},json(b){this.body=b;return this;},setHeader(){}};
  await createTrainingHandler(null, async () => { throw Error('private network detail'); })({method:'GET',headers:req.headers,query:{resource:'identity'}},unavailable);
  assert.equal(unavailable.statusCode,503);
  assert.deepEqual(unavailable.body,{error:'training_auth_unavailable'});
  delete process.env.COACH_AUTH_PUBLIC_KEY;
  assert.equal(await authenticateTrainingOwner(req, fetcher), null);
});

test('plan DB RPC is scoped by owner and validates the returned plan, with no seed fallback', async () => {
  const routine = {...acceptedTrainingPlan, effectiveFrom:'2026-01-01'};
  let rpc;
  const store = createPostgrestTrainingStore({baseUrl:'https://db.example.test',apiKey:'synthetic',fetcher:async (url,init)=>{
    rpc={url,body:JSON.parse(init.body)};return Response.json(routine);
  }});
  assert.deepEqual(await store.readPlan(owner,routine.id),routine);
  assert.ok(rpc.url.endsWith('/rpc/coach_training_plan_read'));
  assert.deepEqual(rpc.body,{p_owner_id:owner,p_plan_id:routine.id});
  const bad = createPostgrestTrainingStore({baseUrl:'https://db.example.test',apiKey:'synthetic',fetcher:async()=>Response.json({...routine,effectiveFrom:'2999-01-01'})});
  await assert.rejects(bad.readPlan(owner,routine.id));
  process.env.COACH_TRAINING_PLAN_MODE='database';
  process.env.COACH_TRAINING_PLAN_ID=routine.id;
  process.env.COACH_TRAINING_OWNER_ID=owner;
  const call = async (s, identity=owner) => {
    const res={statusCode:200,status(c){this.statusCode=c;return this;},json(b){this.body=b;return this;},setHeader(){}};
    await createTrainingHandler(s,()=>identity)({method:'GET',headers:{},query:{resource:'plan'}},res);return res;
  };
  assert.equal((await call(store)).statusCode,200);
  assert.equal((await call({readPlan:async()=>null})).statusCode,404);
  assert.equal((await call({readPlan:async()=>{throw Error('private');}})).statusCode,503);
  assert.equal((await call(store,other)).statusCode,404);
});

test('registros sólo desde respuesta DB; purga copias antiguas sin importar ni descargar', () => {
  const storage = () => {
    const map = new Map([
      ['gym-app:training:v1', JSON.stringify(note('obsoleto'))],
      ['gym-app:training-sync:v1', 'cola antigua'],
      ['gym-app:training-owner:v1', owner],
      ['gym-app:training-backup:old', 'copia antigua'],
      ['coach-auth-v1', 'sesión'], ['theme', 'dark'],
    ]);
    return { get length(){return map.size;}, key:i=>[...map.keys()][i], getItem:k=>map.get(k)??null,
      removeItem:k=>map.delete(k), setItem(){throw Error('No se deben escribir copias');} };
  };
  globalThis.localStorage = storage(); globalThis.sessionStorage = storage();
  clearTrainingResponse(); assert.throws(trainingSnapshot);
  removeLegacyTrainingCopies();
  for (const store of [localStorage,sessionStorage]) {
    assert.equal(store.getItem('gym-app:training:v1'),null);
    assert.equal(store.getItem('gym-app:training-sync:v1'),null);
    assert.equal(store.getItem('gym-app:training-backup:old'),null);
    assert.equal(store.getItem('coach-auth-v1'),'sesión');
    assert.equal(store.getItem('theme'),'dark');
  }
  const remote = envelope(note('base'),8); acceptTrainingResponse(remote);
  assert.deepEqual(trainingSnapshot(),remote);
  const draft=trainingSnapshot(); draft.data.exerciseNotes[0].text='sin guardar';
  assert.equal(trainingSnapshot().data.exerciseNotes[0].text,'base');
  // Remote deletion always wins, even if this browser held an older response.
  acceptTrainingResponse(envelope(empty(),9)); assert.deepEqual(trainingSnapshot().data,empty());
  acceptTrainingResponse(null); assert.deepEqual(trainingSnapshot(),envelope(empty(),0));
  clearTrainingResponse(); assert.throws(trainingSnapshot);
});
