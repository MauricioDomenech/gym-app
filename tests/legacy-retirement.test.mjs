import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import retiredDatabase from '../dist/api/database.js';

test('API retirada rechaza lecturas y escrituras sin consultar credenciales ni BD', () => {
  for (const action of ['get', 'set', 'delete', 'clear']) {
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} };
    retiredDatabase({ method: 'POST', body: { action, key: 'synthetic' } }, res);
    assert.equal(res.code, 410);
    assert.deepEqual(res.body, { error: 'legacy_api_retired' });
  }
});

test('retirada SQL conserva filas y Coach pero deniega todos los roles de la app antigua', {
  skip: !process.env.COACH_TEST_PGLITE && 'Requires local PGlite.',
}, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.COACH_TEST_PGLITE));
  const db = new PGlite();
  const tables = ['workout_progress', 'shopping_lists', 'user_settings', 'definicion_workout_progress', 'definicion_shopping_lists', 'definicion_body_composition', 'definicion_cardio_logs', 'definicion_daily_weights', 'definicion_settings', 'volume_workout_progress', 'volume_shopping_lists', 'volume_settings'];
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    for (const table of tables) {
      await db.exec(`create table ${table}(id int primary key, marker text); insert into ${table} values(1,'historical'); grant all on ${table} to public,anon,authenticated,service_role;`);
    }
    await db.exec("create table coach_training_records(marker text); insert into coach_training_records values('current'); create function coach_training_read() returns text language sql security definer as 'select marker from coach_training_records'; revoke all on function coach_training_read() from public; grant execute on function coach_training_read() to service_role;");
    const sql = await readFile(new URL('../database/retire-legacy-access.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      await db.exec(`set role ${role}`);
      for (const table of tables) {
        await assert.rejects(db.query(`select * from ${table}`), /permission denied/);
        await assert.rejects(db.query(`insert into ${table} values(2,'new')`), /permission denied/);
        await assert.rejects(db.query(`update ${table} set marker='changed'`), /permission denied/);
        await assert.rejects(db.query(`delete from ${table}`), /permission denied/);
      }
      if (role === 'service_role') assert.equal((await db.query('select coach_training_read() as value')).rows[0].value, 'current');
      await db.exec('reset role');
    }
    for (const table of tables) assert.deepEqual((await db.query(`select * from ${table}`)).rows, [{ id: 1, marker: 'historical' }]);
  } finally { await db.close(); }
});
