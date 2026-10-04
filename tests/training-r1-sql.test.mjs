// Optional local PostgreSQL/WASM runner, same dependency mechanism as health-sql.
// Never connects to Supabase or reads .env.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

test('SQL de entrenamiento: versiones inmutables, historial, CAS, reintentos y permisos', {
  skip: !process.env.COACH_TEST_PGLITE && 'Set COACH_TEST_PGLITE to an installed local PGlite module.',
}, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.COACH_TEST_PGLITE));
  const db = new PGlite();
  const owner = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as 'select null::uuid';
      create table public.definicion_workout_progress(id integer primary key, marker text);
      insert into public.definicion_workout_progress values(1,'legacy-unchanged');`);
    await db.query('insert into auth.users values ($1),($2)', [owner, other]);
    const sql = await readFile(new URL('../database/training-r1.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    await db.exec(sql); // Reapplying the preparation must not remove records.
    await db.exec('set role service_role');
    const plan = {
      id: 'synthetic-plan', version: 1, name: 'Synthetic', source: 'local test', effectiveFrom: '2026-09-22',
      days: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(weekday => ({ id: weekday, weekday, label: weekday, kind: 'rest', sessions: [] })),
    };
    const putPlan = p => db.query('select coach_training_plan_write($1,$2::jsonb) as value', [owner, JSON.stringify(p)]);
    const readPlan = (date, id = owner) => db.query('select coach_training_plan_read($1,$2,$3::date) as value', [id, plan.id, date]);
    await putPlan(plan);
    assert.deepEqual((await putPlan(plan)).rows[0].value, plan);
    await assert.rejects(putPlan({ ...plan, name: 'changed in place' }), /immutable/);
    await assert.rejects(putPlan(null));
    await assert.rejects(putPlan({ ...plan, version: 2, effectiveFrom: '2026-02-31' }));
    await assert.rejects(putPlan({ ...plan, version: 2, days: [] }));
    await assert.rejects(putPlan({ ...plan, version: 2, days: null }));
    const future = { ...plan, version: 2, effectiveFrom: '2026-10-01' };
    await putPlan(future);
    assert.equal((await readPlan('2026-09-21')).rows[0].value, null);
    assert.deepEqual((await readPlan('2026-09-22')).rows[0].value, plan);
    assert.deepEqual((await readPlan('2026-10-01')).rows[0].value, future);
    assert.equal((await readPlan('2026-10-01', other)).rows[0].value, null);

    const data = { version: 1, sessions: [{ id: 'synthetic-session', planVersion: 1, plannedItems: [], logs: [] }], exerciseNotes: [{ id: 'synthetic-note', exerciseId: 'exercise-1', author: 'Mauri', text: 'synthetic' }] };
    const put = (revision, id, value = data) => db.query('select coach_training_write($1,$2,$3,$4::jsonb) as value', [owner, revision, id, JSON.stringify(value)]);
    assert.equal((await put(0, 'write-1')).rows[0].value.kind, 'ok');
    assert.equal((await put(0, 'write-1')).rows[0].value.kind, 'replay');
    assert.equal((await put(0, 'write-2')).rows[0].value.kind, 'conflict');
    assert.equal((await put(0, 'write-1', { ...data, exerciseNotes: [] })).rows[0].value.kind, 'request_id_reused');
    await assert.rejects(put(1, 'null-data', null));
    const stored = (await db.query('select coach_training_read($1) as value', [owner])).rows[0].value;
    assert.deepEqual(stored.data, data); // Publishing version 2 did not rewrite the session or notes.
    assert.equal(stored.revision, 1);
    await assert.rejects(db.query('update coach_training_plan_versions set version=9'));
    await assert.rejects(db.query('delete from coach_training_records'));

    for (const role of ['anon', 'authenticated']) {
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(readPlan('2026-09-22'));
      await assert.rejects(putPlan(plan));
      await assert.rejects(put(1, 'unauthorized'));
      await assert.rejects(db.query('select * from coach_training_records'));
    }
    await db.exec('reset role');
    await db.exec(sql);
    assert.deepEqual((await db.query('select marker from definicion_workout_progress')).rows, [{ marker: 'legacy-unchanged' }]);
    assert.equal((await db.query('select count(*)::int as n from coach_training_plan_versions')).rows[0].n, 2);
    assert.equal((await db.query('select revision from coach_training_records')).rows[0].revision, 1);
  } finally {
    await db.close();
  }
});
