// Explicit legacy gateway mode for these synthetic contract tests.
process.env.COACH_AUTH_MODE = 'gateway';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createMemoryTrainingStore,
  createPostgrestTrainingStore,
  createTrainingHandler,
} from '../dist/api/training.js';

const owner = '00000000-0000-4000-8000-000000000001';
const emptyData = () => ({ version: 1, sessions: [], exerciseNotes: [] });

const authHeaders = (extra = {}) => ({
  'x-coach-owner': owner,
  'x-coach-owner-signature': createHmac('sha256', 'synthetic-secret').update(owner).digest('hex'),
  ...extra,
});

const call = async (handler, { method = 'GET', resource = 'records', body, headers = {} } = {}) => {
  const response = {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
  await handler({ method, query: { resource }, headers: authHeaders(headers), body }, response);
  return response;
};

test('el store sintético serializa CAS e impide reutilizar requestId con otro payload', async () => {
  const store = createMemoryTrainingStore();
  const first = { baseRevision: 0, requestId: 'same-request', data: emptyData() };
  const results = await Promise.all([
    store.write(owner, first),
    store.write(owner, { ...first, requestId: 'other-request', data: { version: 1, sessions: [], exerciseNotes: [{ id: 'n', exerciseId: 'e', author: 'Mauri', text: 'x', updatedAt: '2026-09-22T08:00:00.000Z', pinned: false }] } }),
  ]);
  assert.equal(results.filter(result => result.kind === 'ok').length, 1);
  assert.equal(results.filter(result => result.kind === 'conflict').length, 1);

  const replay = await store.write(owner, { ...first, data: { ...first.data, ignored: undefined } });
  assert.equal(replay.kind, 'replay');

  const reused = await store.write(owner, { ...first, data: { version: 1, sessions: [], exerciseNotes: [{ id: 'different', exerciseId: 'e', author: 'Mauri', text: 'x', updatedAt: '2026-09-22T08:00:00.000Z', pinned: false }] } });
  assert.deepEqual(reused, { kind: 'rejected', reason: 'request_id_reused' });
});

test('el adaptador PostgREST inyectable conserva owner, request y respuesta RPC', async () => {
  const calls = [];
  const envelope = { schemaVersion: 1, revision: 1, data: emptyData() };
  const store = createPostgrestTrainingStore({
    baseUrl: 'https://db.example.test',
    apiKey: 'synthetic-key',
    fetcher: async (input, init) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ kind: 'ok', response: envelope }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });

  const result = await store.write(owner, { baseRevision: 0, requestId: 'rpc-1', data: emptyData() });
  assert.equal(result.kind, 'ok');
  assert.deepEqual(result.envelope, envelope);
  assert.equal(calls[0].input, 'https://db.example.test/rest/v1/rpc/coach_training_write');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    p_owner_id: owner,
    p_base_revision: 0,
    p_request_id: 'rpc-1',
    p_payload: emptyData(),
  });
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test('handler y adaptador no confirman un envelope semánticamente distinto', async () => {
  const different = {
    version: 1,
    sessions: [],
    exerciseNotes: [{ id: 'different', exerciseId: 'e', author: 'Mauri', text: 'otro', updatedAt: '2026-09-22T08:00:00.000Z', pinned: false }],
  };
  const store = createPostgrestTrainingStore({
    baseUrl: 'https://db.example.test',
    apiKey: 'synthetic-key',
    fetcher: async () => new Response(JSON.stringify({
      kind: 'ok',
      response: { schemaVersion: 1, revision: 1, data: different },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  });
  await assert.rejects(
    store.write(owner, { baseRevision: 0, requestId: 'semantic-1', data: emptyData() }),
    /training storage unavailable/,
  );

  const previous = process.env.COACH_AUTH_ASSERTION_SECRET;
  process.env.COACH_AUTH_ASSERTION_SECRET = 'synthetic-secret';
  try {
    const handler = createTrainingHandler({
      async read() { return null; },
      async write() { return { kind: 'ok', envelope: { schemaVersion: 1, revision: 4, data: emptyData() } }; },
    });
    const response = await call(handler, { method: 'PUT', body: { baseRevision: 0, requestId: 'semantic-2', data: emptyData() } });
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.body, { error: 'training_storage_unavailable' });
  } finally {
    if (previous === undefined) delete process.env.COACH_AUTH_ASSERTION_SECRET;
    else process.env.COACH_AUTH_ASSERTION_SECRET = previous;
  }
});

test('el endpoint de DB sólo admite HTTPS salvo loopback y nunca userinfo', () => {
  const options = { apiKey: 'synthetic-key', fetcher: async () => new Response('null', { status: 200 }) };
  assert.throws(() => createPostgrestTrainingStore({ ...options, baseUrl: 'http://db.example.test' }));
  assert.throws(() => createPostgrestTrainingStore({ ...options, baseUrl: 'https://user:password@db.example.test' }));
  assert.doesNotThrow(() => createPostgrestTrainingStore({ ...options, baseUrl: 'http://127.0.0.1:54321' }));
});

test('el handler no filtra excepciones del store y rechaza reutilización', async () => {
  const previous = process.env.COACH_AUTH_ASSERTION_SECRET;
  process.env.COACH_AUTH_ASSERTION_SECRET = 'synthetic-secret';
  try {
    const handler = createTrainingHandler(createMemoryTrainingStore());
    const body = { baseRevision: 0, requestId: 'request-1', data: emptyData() };
    const saved = await call(handler, { method: 'PUT', body });
    assert.equal(saved.statusCode, 200);
    assert.equal(saved.body.requestId, body.requestId);
    const reused = await call(handler, {
      method: 'PUT',
      body: { ...body, data: { version: 1, sessions: [], exerciseNotes: [{ id: 'n', exerciseId: 'e', author: 'Mauri', text: 'different', updatedAt: '2026-09-22T08:00:00.000Z', pinned: false }] } },
    });
    assert.equal(reused.statusCode, 409);
    assert.equal(reused.body.error, 'training_request_id_reused');

    const broken = createTrainingHandler({
      async read() { throw new Error('internal detail'); },
      async write() { throw new Error('internal detail'); },
    });
    const unavailable = await call(broken);
    assert.equal(unavailable.statusCode, 503);
    assert.deepEqual(unavailable.body, { error: 'training_storage_unavailable' });
  } finally {
    if (previous === undefined) delete process.env.COACH_AUTH_ASSERTION_SECRET;
    else process.env.COACH_AUTH_ASSERTION_SECRET = previous;
  }
});

test('la semilla server-only requiere el owner autorizado explícitamente', async () => {
  const previous = {
    auth: process.env.COACH_AUTH_ASSERTION_SECRET,
    mode: process.env.COACH_TRAINING_PLAN_MODE,
    owner: process.env.COACH_TRAINING_OWNER_ID,
  };
  process.env.COACH_AUTH_ASSERTION_SECRET = 'synthetic-secret';
  process.env.COACH_TRAINING_PLAN_MODE = 'server-seed';
  process.env.COACH_TRAINING_OWNER_ID = owner;
  try {
    const handler = createTrainingHandler(createMemoryTrainingStore());
    const allowed = await call(handler, { resource: 'plan' });
    assert.equal(allowed.statusCode, 200);
    process.env.COACH_TRAINING_OWNER_ID = '00000000-0000-4000-8000-000000000002';
    const denied = await call(handler, { resource: 'plan' });
    assert.equal(denied.statusCode, 404);
  } finally {
    if (previous.auth === undefined) delete process.env.COACH_AUTH_ASSERTION_SECRET;
    else process.env.COACH_AUTH_ASSERTION_SECRET = previous.auth;
    if (previous.mode === undefined) delete process.env.COACH_TRAINING_PLAN_MODE;
    else process.env.COACH_TRAINING_PLAN_MODE = previous.mode;
    if (previous.owner === undefined) delete process.env.COACH_TRAINING_OWNER_ID;
    else process.env.COACH_TRAINING_OWNER_ID = previous.owner;
  }
});

test('el SQL declara bloqueo de primera escritura, RPC restringido y rechazo null', async () => {
  const sql = await readFile(new URL('../database/training-r1.sql', import.meta.url), 'utf8');
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(p_owner_id::text, 0\)\)/);
  assert.match(sql, /p_payload is null or jsonb_typeof\(p_payload\) is distinct from 'object'/i);
  assert.match(sql, /payload_hash/);
  assert.match(sql, /revoke all on table public\.coach_training_records from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.coach_training_write\(uuid, bigint, text, jsonb\) to service_role/i);
  assert.doesNotMatch(sql, /for all using \(owner_id = auth\.uid\(\)\)/i);
});
