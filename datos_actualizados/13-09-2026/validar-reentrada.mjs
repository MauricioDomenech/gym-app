// Ejecutar desde el repositorio: node datos_actualizados/13-09-2026/validar-reentrada.mjs
// Usa el importador real con persistencia simulada; no accede a Supabase.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const folder = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(folder, '../..');
const phase = path.join(root, 'src/phases/definicion');
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const source = read('definicion-semana-20-export.json');
const data = read('definicion-semana-21-import.json');
const saved = { workouts: [], cardio: [] };
const service = {
  addDefinicionWorkoutProgress: async entry => saved.workouts.push(entry),
  addDefinicionCardioLog: async entry => saved.cardio.push(entry),
  addDefinicionBodyComposition: async () => assert.fail('No se debe importar composición corporal'),
};
const allowed = new Set([
  'services/weeklyDataService.ts', 'services/definicionExerciseParser.ts',
  'utils/workoutNotes.ts', 'utils/weeklyClosure.ts', 'types/definicion.ts',
].map(file => path.join(phase, file)));
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  assert.ok(allowed.has(file), 'Dependencia no autorizada: ' + file);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, console,
    require: specifier => {
      const dependency = path.resolve(path.dirname(file), specifier);
      if (dependency === path.join(phase, 'services/definicionSupabaseService')) {
        return { DefinicionSupabaseService: service };
      }
      if (dependency === path.join(root, 'src/assets/data/definicion/plan_definicion.json')) {
        return JSON.parse(fs.readFileSync(dependency, 'utf8'));
      }
      return load(dependency + '.ts');
    },
  }, { filename: file });
  cache.set(file, module.exports);
  return module.exports;
}
const { importWeeklyData, buildWeeklyExport } = load(path.join(phase, 'services/weeklyDataService.ts'));
const { DefinicionExerciseParser: parser } = load(path.join(phase, 'services/definicionExerciseParser.ts'));
const { parseWorkoutNotes } = load(path.join(phase, 'utils/workoutNotes.ts'));
const omitted = 'jueves-remo-al-menton-en-polea-agarre-amplio';
const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const workouts = Object.fromEntries(days.map(day => [day, parser.getDayWorkout(day)]));
const expectedIds = Object.values(workouts).flatMap(day => day.exercises.map(e => e.id)).filter(id => id !== omitted);
assert.equal(data.weekTo, 21);
assert.deepEqual(data.workoutProgress.map(e => e.exerciseId), expectedIds);
assert.equal(expectedIds.length, 40);
assert.deepEqual(days.map(day => data.workoutProgress.filter(e => e.day === day).reduce((n, e) => n + e.seriesCount, 0)), [16, 12, 10, 10, 15, 14]);
const rows = fs.readFileSync(path.join(folder, 'plan-reentrada.md'), 'utf8').split('\n')
  .filter(line => /^\| .+ \| \d+ \| \d+ \|/.test(line)).map(line => line.split('|').map(s => s.trim()));
for (const [i, entry] of data.workoutProgress.entries()) {
  assert.equal(entry.week, 21);
  assert.equal(entry.rir, null);
  assert.equal(entry.seriesCount, Number(rows[i][2]));
  assert.equal(entry.weights.length, entry.seriesCount);
  assert.ok(entry.weights.every(weight => weight === 0));
  assert.equal(entry.date.slice(0, 10), '2026-09-' + (14 + days.indexOf(entry.day)));
  const note = parseWorkoutNotes(entry.observations).coachPlan;
  assert.ok(note.includes(rows[i][4]) && note.includes(rows[i][5]));
  assert.ok(note.includes('3–4 RIR objetivo') || entry.exerciseId.includes('farmers-walk'));
}
let feedbackCount = 0;
for (const old of source.workoutProgress) {
  const original = parseWorkoutNotes(old.observations).userFeedback;
  if (!original) continue;
  const expected = /^SEMANA\s+\d+/i.test(original) ? original : 'SEMANA 20: ' + original;
  const target = data.workoutProgress.find(e => e.exerciseId === old.exerciseId);
  if (!target) assert.equal(old.exerciseId, omitted);
  assert.equal(parseWorkoutNotes(target?.observations ?? data.coachNotes).userFeedback, expected);
  feedbackCount++;
}
assert.equal(feedbackCount, 32);
assert.equal(data.workoutProgress.filter(e => parseWorkoutNotes(e.observations).userFeedback).length, 31);
assert.deepEqual(data.cardioLogs.map(e => e.day), days);
assert.deepEqual(data.cardioLogs.map(e => e.duracionMinutos), [15, 15, 0, 15, 0, 0]);
assert.ok(data.cardioLogs.every(e => !e.completado && e.week === 21 && e.tipo === 'liss'));
assert.ok(data.cardioLogs.find(e => e.day === 'martes').notas.includes('opcional'));
assert.equal(data.bodyComposition, undefined);
const result = await importWeeklyData(JSON.stringify(data));
assert.equal(result.success, true, result.message);
assert.deepEqual(JSON.parse(JSON.stringify(saved.workouts)), data.workoutProgress);
assert.deepEqual(JSON.parse(JSON.stringify(saved.cardio)), data.cardioLogs);
const exported = buildWeeklyExport(21, { 21: workouts }, saved.workouts, [], saved.cardio, []);
assert.equal(exported.weeklyClosure.metrics.workoutCompleted, 0);
assert.equal(exported.weeklyClosure.metrics.cardioCompleted, 0);
assert.equal(exported.weeklyClosure.metrics.rirLogs, 0);
console.log('OK: importador real con persistencia simulada; 40 ejercicios, 77 series, 32 comentarios conservados, 0 sesiones completadas y 0 RIR registrados.');
