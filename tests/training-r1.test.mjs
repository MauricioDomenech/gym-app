// Explicit legacy gateway mode for these synthetic contract tests.
process.env.COACH_AUTH_MODE = 'gateway';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { createMemoryTrainingStore, createTrainingHandler } from '../dist/api/training.js';
import { createTrainingRemoteClient, TrainingSyncError } from '../dist/src/components/training/trainingSync.js';
import { validTrainingData, withSkippedDates } from '../dist/src/components/training/trainingStorage.js';
import { statusForDay, trainingForToday } from '../dist/src/components/training/trainingPlan.js';

const emptyData = () => ({ version: 1, sessions: [], exerciseNotes: [] });
const SYNTHETIC_OWNER = '00000000-0000-4000-8000-000000000001';

const calendarPlan = {
  id: 'qa-calendar',
  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((weekday, index) => ({
    id: weekday, weekday, kind: index > 4 ? 'rest' : index % 2 ? 'cardio' : 'strength',
    sessions: index > 4 ? [] : [{ id: `${weekday}-session`, kind: index % 2 ? 'cardio' : 'strength', items: [] }],
  })),
};

test('abrir hoy selecciona el cardio de Madrid y no queda bloqueado por ayer pendiente', () => {
  const previous = { id: 'old', routineId: calendarPlan.id, routineDayId: 'monday', routineSessionId: 'monday-session', performedOn: '2026-09-21', finishedAt: null, logs: [] };
  const data = { ...emptyData(), sessions: [previous] };
  const result = trainingForToday(calendarPlan, data, new Date('2026-09-22T10:00:00Z'));
  assert.equal(result.plan.id, 'tuesday-session');
  assert.equal(result.plan.kind, 'cardio');
  assert.equal(result.session, null);
  assert.equal(data.sessions[0], previous);
  assert.equal(previous.finishedAt, null);
});

test('hoy retoma su mismo ID, conserva el snapshot y no duplica una sesión completada', () => {
  const current = { id: 'same-id', routineId: calendarPlan.id, routineDayId: 'tuesday', routineSessionId: 'tuesday-session', performedOn: '2026-09-22', finishedAt: null, logs: [], planVersion: 1, plannedItems: [] };
  const data = { ...emptyData(), sessions: [current] };
  const date = new Date('2026-09-22T10:00:00Z');
  assert.equal(trainingForToday({ ...calendarPlan, version: 2 }, data, date).session, current);
  current.finishedAt = '2026-09-22T10:15:00Z';
  current.cardio = { moderateMinutes: 5 };
  assert.equal(trainingForToday(calendarPlan, data, date).session.id, 'same-id');
  delete current.cardio;
  assert.equal(trainingForToday(calendarPlan, data, date).session, null, 'archivada vacía no bloquea hoy');
});

test('descanso y cambio de fecha de Madrid no permiten abrir el día anterior', () => {
  assert.equal(trainingForToday(calendarPlan, emptyData(), new Date('2026-09-27T10:00:00Z')).plan, null);
  const midnight = trainingForToday(calendarPlan, emptyData(), new Date('2026-09-22T22:30:00Z'));
  assert.equal(midnight.dateKey, '2026-09-23');
  assert.equal(midnight.plan.id, 'wednesday-session');
  assert.equal(trainingForToday(null, emptyData()).plan, null);
});

const authHeaders = (owner) => ({
  'x-coach-owner': owner,
  'x-coach-owner-signature': process.env.COACH_AUTH_ASSERTION_SECRET
    ? createHmac('sha256', process.env.COACH_AUTH_ASSERTION_SECRET).update(owner).digest('hex')
    : '0'.repeat(64),
});

const call = async (handler, { method = 'GET', resource = 'records', owner = SYNTHETIC_OWNER, body } = {}) => {
  const response = {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
  await handler({
    method,
    query: { resource },
    headers: authHeaders(owner),
    body,
  }, response);
  return response;
};

test('la ruta falla cerrada si el gateway no declara identidad confiable', async () => {
  const previous = process.env.COACH_AUTH_ASSERTION_SECRET;
  delete process.env.COACH_AUTH_ASSERTION_SECRET;
  const response = await call(createTrainingHandler(createMemoryTrainingStore()));
  assert.equal(response.statusCode, 401);
  if (previous === undefined) delete process.env.COACH_AUTH_ASSERTION_SECRET;
  else process.env.COACH_AUTH_ASSERTION_SECRET = previous;
});

test('CAS e idempotencia rechazan snapshot obsoleto sin duplicar', async () => {
  const previous = process.env.COACH_AUTH_ASSERTION_SECRET;
  process.env.COACH_AUTH_ASSERTION_SECRET = 'synthetic-secret';
  const handler = createTrainingHandler(createMemoryTrainingStore());
  const body = { baseRevision: 0, requestId: 'request-1', data: emptyData() };

  const first = await call(handler, { method: 'PUT', body });
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.records.revision, 1);
  assert.equal(first.body.replayed, false);

  const replay = await call(handler, { method: 'PUT', body });
  assert.equal(replay.statusCode, 200);
  assert.equal(replay.body.records.revision, 1);
  assert.equal(replay.body.replayed, true);

  const conflict = await call(handler, {
    method: 'PUT',
    body: { baseRevision: 0, requestId: 'request-2', data: emptyData() },
  });
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.body.records.revision, 1);

  const injectedOwner = await call(handler, {
    method: 'PUT',
    body: { ...body, requestId: 'request-3', userId: 'not-trusted' },
  });
  assert.equal(injectedOwner.statusCode, 400);

  if (previous === undefined) delete process.env.COACH_AUTH_ASSERTION_SECRET;
  else process.env.COACH_AUTH_ASSERTION_SECRET = previous;
});

test('la semilla privada conserva A14/B19/C18 y la progresión manual de cardio', async () => {
  const previousAuth = process.env.COACH_AUTH_ASSERTION_SECRET;
  const previousPlan = process.env.COACH_TRAINING_PLAN_MODE;
  const previousOwner = process.env.COACH_TRAINING_OWNER_ID;
  process.env.COACH_AUTH_ASSERTION_SECRET = 'synthetic-secret';
  process.env.COACH_TRAINING_PLAN_MODE = 'server-seed';
  process.env.COACH_TRAINING_OWNER_ID = SYNTHETIC_OWNER;
  const response = await call(createTrainingHandler(createMemoryTrainingStore()), { resource: 'plan' });
  assert.equal(response.statusCode, 200);
  const plan = response.body.plan;
  const strengths = plan.days.flatMap(day => day.sessions.filter(session => session.kind === 'strength'));
  assert.deepEqual(strengths.map(session => session.items.reduce((total, item) => total + item.sets, 0)), [14, 19, 18]);
  const cardio = plan.days.flatMap(day => day.sessions).filter(session => session.cardio);
  assert.equal(cardio.filter(session => session.cardio.moderateMinutes === 20).length, 3);
  assert.equal(cardio.filter(session => session.cardio.moderateMinutes === 50).length, 2);
  assert.deepEqual(cardio[0].cardio.progression.map(step => step.moderateMinutes), [160]);
  assert.equal(cardio[0].cardio.progressionMode, 'manual-tolerance');
  assert.equal(statusForDay(plan, emptyData(), new Date('2026-09-28T10:00:00Z')), 'scheduled');
  assert.equal(statusForDay(plan, emptyData(), new Date('2026-09-26T10:00:00Z')), 'rest');

  if (previousAuth === undefined) delete process.env.COACH_AUTH_ASSERTION_SECRET;
  else process.env.COACH_AUTH_ASSERTION_SECRET = previousAuth;
  if (previousPlan === undefined) delete process.env.COACH_TRAINING_PLAN_MODE;
  else process.env.COACH_TRAINING_PLAN_MODE = previousPlan;
  if (previousOwner === undefined) delete process.env.COACH_TRAINING_OWNER_ID;
  else process.env.COACH_TRAINING_OWNER_ID = previousOwner;
});

test('la forma v1 sigue admitiendo una sesión libre y notas existentes', async () => {
  const { validTrainingData } = await import('../dist/src/components/training/trainingStorage.js');
  const legacy = {
    version: 1,
    sessions: [{ id: 'free-1', performedOn: '2026-09-22', exerciseIds: ['exercise.catalog.029'], logs: [], finishedAt: null, mode: 'free' }],
    exerciseNotes: [{ id: 'note-1', exerciseId: 'exercise.catalog.029', author: 'Mauri', text: 'nota existente', updatedAt: '2026-09-22T08:00:00.000Z', pinned: false }],
  };
  assert.equal(validTrainingData(legacy), true);
});

test('el cliente remoto no declara éxito si la red devuelve conflicto y no envía identidad en el body', async () => {
  const current = { schemaVersion: 1, revision: 4, data: emptyData() };
  let requestInit;
  const client = createTrainingRemoteClient(async (_url, init) => {
    requestInit = init;
    return new Response(JSON.stringify({ records: current }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  });

  await assert.rejects(
    client.write({ baseRevision: 3, requestId: 'retry-1', data: emptyData() }),
    error => error instanceof TrainingSyncError && error.code === 'conflict' && error.current?.revision === 4,
  );
  assert.equal(requestInit.headers['Idempotency-Key'], 'retry-1');
  assert.equal(Object.hasOwn(JSON.parse(requestInit.body), 'userId'), false);
});

test('una respuesta JSON corrupta no se interpreta como servidor vacío', async () => {
  const client = createTrainingRemoteClient(async () => new Response('{"records":', { status: 200 }));
  await assert.rejects(
    client.read(),
    error => error instanceof TrainingSyncError && error.code === 'invalid-response',
  );
});

test('la escritura exige que el servidor confirme el mismo borrador', async () => {
  const request = { baseRevision: 0, requestId: 'same-snapshot-1', data: emptyData() };
  const different = {
    version: 1,
    sessions: [{
      id: 'session-1',
      performedOn: '2026-09-22',
      exerciseIds: ['exercise.catalog.029'],
      logs: [],
      finishedAt: null,
    }],
    exerciseNotes: [],
  };
  const client = createTrainingRemoteClient(async () => new Response(JSON.stringify({
    records: { schemaVersion: 1, revision: 1, data: different },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  await assert.rejects(
    client.write(request),
    error => error instanceof TrainingSyncError && error.code === 'invalid-response',
  );
});

test('el estado del día no acredita un archivo vacío ni una sesión de otro día', async () => {
  const previousAuth = process.env.COACH_AUTH_ASSERTION_SECRET;
  const previousPlan = process.env.COACH_TRAINING_PLAN_MODE;
  const previousOwner = process.env.COACH_TRAINING_OWNER_ID;
  process.env.COACH_AUTH_ASSERTION_SECRET = 'synthetic-secret';
  process.env.COACH_TRAINING_PLAN_MODE = 'server-seed';
  process.env.COACH_TRAINING_OWNER_ID = SYNTHETIC_OWNER;
  const response = await call(createTrainingHandler(createMemoryTrainingStore()), { resource: 'plan' });
  const plan = response.body.plan;
  const date = new Date('2026-09-22T10:00:00Z');
  const archived = {
    version: 1,
    sessions: [{ id: 'archived', performedOn: '2026-09-22', exerciseIds: [], logs: [], finishedAt: '2026-09-22T09:00:00.000Z', mode: 'prepared', routineDayId: 'r1-tuesday' }],
    exerciseNotes: [],
  };
  assert.equal(statusForDay(plan, archived, date), 'scheduled');

  const otherDay = {
    version: 1,
    sessions: [{
      id: 'other-day',
      performedOn: '2026-09-22',
      exerciseIds: ['exercise.catalog.029'],
      logs: [{ exerciseId: 'exercise.catalog.029', sets: [{ loadKg: 10, reps: 8 }], rir: 2, status: 'completed', comment: '', updatedAt: '2026-09-22T09:00:00.000Z' }],
      finishedAt: '2026-09-22T09:30:00.000Z',
      mode: 'prepared',
      routineDayId: 'r1-monday',
    }],
    exerciseNotes: [],
  };
  assert.equal(statusForDay(plan, otherDay, date), 'scheduled');
  if (previousAuth === undefined) delete process.env.COACH_AUTH_ASSERTION_SECRET;
  else process.env.COACH_AUTH_ASSERTION_SECRET = previousAuth;
  if (previousPlan === undefined) delete process.env.COACH_TRAINING_PLAN_MODE;
  else process.env.COACH_TRAINING_PLAN_MODE = previousPlan;
  if (previousOwner === undefined) delete process.env.COACH_TRAINING_OWNER_ID;
  else process.env.COACH_TRAINING_OWNER_ID = previousOwner;
});

test('el cliente aplica timeout abortable tanto a lectura como a escritura', async () => {
  let readSignal;
  const hangingRead = createTrainingRemoteClient(async (_url, init) => new Promise((_resolve, reject) => {
    readSignal = init.signal;
    init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }), '/api/training?resource=records', 5);
  await assert.rejects(hangingRead.read(), error => error instanceof TrainingSyncError && error.code === 'unavailable');
  assert.equal(readSignal.aborted, true);

  let writeSignal;
  const hangingWrite = createTrainingRemoteClient(async (_url, init) => new Promise((_resolve, reject) => {
    writeSignal = init.signal;
    init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }), '/api/training?resource=records', 5);
  await assert.rejects(hangingWrite.write({ baseRevision: 0, requestId: 'timeout-1', data: emptyData() }), error => error instanceof TrainingSyncError && error.code === 'unavailable');
  assert.equal(writeSignal.aborted, true);
});

test('ausencias: varios días, deshacer, datos legacy y fechas protegidas', () => {
  const initial = emptyData();
  assert.equal(validTrainingData(initial), true);
  const marked = withSkippedDates(initial, ['2026-09-21', '2026-09-22'], '2026-09-23');
  assert.deepEqual(marked.skippedDates, ['2026-09-21', '2026-09-22']);
  assert.equal(validTrainingData(JSON.parse(JSON.stringify(marked))), true);
  assert.equal(statusForDay(calendarPlan, marked, new Date('2026-09-22T10:00:00Z')), 'skipped');
  assert.deepEqual(withSkippedDates(marked, ['2026-09-21'], '2026-09-23').skippedDates, ['2026-09-21']);
  assert.equal(initial.skippedDates, undefined);
  assert.throws(() => withSkippedDates(initial, ['2026-09-24'], '2026-09-23'));
  assert.throws(() => withSkippedDates(initial, ['2026-02-30'], '2026-09-23'));
  const session = { id: 'qa', performedOn: '2026-09-21', exerciseIds: ['exercise'], finishedAt: null,
    logs: [{ exerciseId: 'exercise', sets: [{ loadKg: 10, reps: 8 }], rir: 2, status: 'completed', comment: '', updatedAt: '2026-09-21T10:00:00Z' }] };
  assert.throws(() => withSkippedDates({ ...initial, sessions: [session] }, ['2026-09-21'], '2026-09-23'));
  const cardio = { plannedModerateMinutes: 30, moderateMinutes: 25, warmupMinutes: 5, cooldownMinutes: 5, comment: '', status: 'partial', updatedAt: '2026-09-21T10:00:00Z' };
  assert.throws(() => withSkippedDates({ ...initial, sessions: [{ ...session, logs: [], cardio }] }, ['2026-09-21'], '2026-09-23'));
  assert.equal(validTrainingData({ ...initial, skippedDates: ['2026-09-21', '2026-09-21'] }), false);
});

test('la escritura rechaza confirmación de una revisión distinta de base + 1', async () => {
  const client = createTrainingRemoteClient(async () => Response.json({records:{schemaVersion:1,revision:5,data:emptyData()}}));
  await assert.rejects(client.write({baseRevision:3,requestId:'revision-check',data:emptyData()}), error => error.code === 'invalid-response');
});
