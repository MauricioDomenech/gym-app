import { isLogFinished, workSets } from './trainingStorage.js';
import type { TrainingData, TrainingLog, TrainingRoutineItem, TrainingSession, TrainingSet } from './trainingStorage.js';

export interface Exposure { session: TrainingSession; log: TrainingLog }
/** Same variant, routine and slot: a light day must not prescribe a heavy day's loads. */
export function comparableHistory(data: TrainingData, session: TrainingSession, exerciseId: string, item?: TrainingRoutineItem): Exposure[] {
  return data.sessions.filter(s => s.id !== session.id && s.performedOn < session.performedOn &&
    s.routineId === session.routineId && s.routineDayId === session.routineDayId && s.routineSessionId === session.routineSessionId)
    .flatMap(s => s.logs.filter(l => l.exerciseId === exerciseId && isLogFinished(l) && !l.excludeFromProgression &&
      (!item || l.plannedItemId === item.id || (!l.plannedItemId && s.plannedItems?.some(p => p.id === item.id && p.exerciseId === exerciseId))))
      .map(log => ({ session: s, log }))).filter(e => workSets(e.log).length > 0)
    .sort((a, b) => b.session.performedOn.localeCompare(a.session.performedOn) || b.log.updatedAt.localeCompare(a.log.updatedAt));
}
export function repRange(value: string | number): [number, number] | null {
  const match = String(value).trim().match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/);
  if (!match) return null;
  const min = Number(match[1]), max = Number(match[2] ?? match[1]);
  return min > 0 && max >= min && max <= 1000 ? [min, max] : null;
}
export function restSeconds(value: TrainingRoutineItem['rest']): number | null {
  if (typeof value === 'number') return value > 0 && value <= 3600 ? value : null;
  if (!value) return null;
  // Explicit units only. A bare string like "90–120" is ambiguous.
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)(?:\s*[-–—]\s*(\d+(?:[.,]\d+)?))?\s*(s|seg(?:undos)?|min(?:utos)?|′|')(?:\s+antes de repetir lado)?$/i);
  if (!match) return null;
  const seconds = Number((match[2] ?? match[1]).replace(',', '.')) * (/^(min|′|')/i.test(match[3]) ? 60 : 1);
  return seconds > 0 && seconds <= 3600 ? Math.round(seconds) : null;
}
export interface SetDraft { loadKg: string; reps: string; rir: string; kind: 'work' | 'warmup'; saved?: TrainingSet; edited?: boolean }
export const draftFromSet = (set: TrainingSet, saved = false): SetDraft => ({ loadKg: String(set.loadKg), reps: String(set.reps), rir: saved && set.rir != null ? String(set.rir) : '', kind: set.kind ?? 'work', ...(saved ? { saved: set } : {}) });
export const blankSet = (kind: SetDraft['kind'] = 'work'): SetDraft => ({ loadKg: '', reps: '', rir: '', kind });
export function exerciseDraft(existing: TrainingLog | undefined, last: TrainingLog | undefined, item?: TrainingRoutineItem): SetDraft[] {
  const rows = existing?.sets.map(s => draftFromSet(s, true)) ?? [];
  const count = Math.max(1, Math.min(item?.sets ?? 1, 30));
  if (existing && isLogFinished(existing)) return rows;
  const previous = last ? workSets(last) : [];
  for (let i = rows.filter(s => s.kind === 'work').length; i < count && rows.length < 30; i++) {
    // Never repeat the last old set to invent a missing proposal.
    rows.push(previous[i] ? draftFromSet(previous[i]) : blankSet());
  }
  return rows;
}
export function parseSetDraft(row: SetDraft, loadType: TrainingLog['loadType']): TrainingSet {
  const loadKg = Number(row.loadKg.replace(',', '.')), reps = Number(row.reps), rir = row.rir.trim() ? Number(row.rir) : null;
  if ((loadType !== 'bodyweight' && !row.loadKg.trim()) || !row.reps.trim() || !Number.isFinite(loadKg) || loadKg < 0 || loadKg > 2000 ||
    !Number.isInteger(reps) || reps <= 0 || reps > 1000 || (rir !== null && (!Number.isInteger(rir) || rir < 0 || rir > 10))) throw Error('Completá la carga y las repeticiones. El RIR es opcional, entre 0 y 10.');
  return { ...row.saved, loadKg, reps, rir, kind: row.kind };
}
export const draftChanged = (row: SetDraft) => !row.saved || row.loadKg !== String(row.saved.loadKg) || row.reps !== String(row.saved.reps) || row.rir !== (row.saved.rir == null ? '' : String(row.saved.rir)) || row.kind !== (row.saved.kind ?? 'work');

/** A conservative, explained suggestion. It never edits the plan or the form. */
export function progressionSuggestion(history: Exposure[], item?: TrainingRoutineItem): { title: string; reason: string; date?: string } {
  const last = history[0];
  if (!last || !item) return { title: 'Primera referencia', reason: 'Registrá lo que hagas hoy. Todavía no hay una sesión comparable para sugerir un cambio.' };
  const range = repRange(item.reps), oldItem = last.session.plannedItems?.find(p => p.id === item.id);
  const oldPrescription = oldItem ? { ...oldItem, ...oldItem.alternatives?.find(a => a.exerciseId === last.log.exerciseId) } : undefined;
  const base = { date: last.session.performedOn };
  if (!oldPrescription || oldPrescription.sets !== item.sets || String(oldPrescription.reps) !== String(item.reps) || String(oldPrescription.rir) !== String(item.rir)) return { ...base, title: 'El plan cambió', reason: 'La sesión anterior sigue como referencia, pero no uso otra prescripción para sugerir una subida.' };
  const rows = workSets(last.log);
  if (last.log.status === 'partial' || rows.length < item.sets) return { ...base, title: 'Consolidar primero', reason: 'La última sesión quedó parcial o con menos series. Usá esa carga como referencia y revisá el objetivo del plan.' };
  if (!range) return { ...base, title: 'Seguí la indicación del plan', reason: 'La prescripción tiene un formato especial. No convierto esa indicación en un objetivo automático.' };
  const targetRir = repRange(item.rir ?? '');
  const efforts = rows.map(s => s.rir ?? last.log.rir);
  if (!targetRir || efforts.some(r => r === null)) return { ...base, title: 'Mantener como referencia', reason: 'Falta RIR comparable para recomendar una subida. Ajustá según la técnica y el esfuerzo del plan.' };
  if (efforts.some(r => r! < targetRir[0])) return { ...base, title: 'No subir todavía', reason: `En la sesión anterior hubo menos reserva que el RIR ${item.rir} previsto. Priorizá recuperar esa reserva y la técnica.` };
  if (rows.every(s => s.reps >= range[1])) return { ...base, title: 'Podés valorar subir la carga', reason: `Llegaste a ${range[1]} reps en todas las series con la reserva prevista. Si la técnica fue estable, valorá el incremento más pequeño disponible; no se aplica automáticamente.` };
  return { ...base, title: range[0] === range[1] ? 'Consolidar repeticiones' : 'Primero, más repeticiones', reason: `Mantené la carga como referencia y acercate a ${range[1]} reps sin salir del RIR ${item.rir} del plan.` };
}

export interface ComparableRecord { kind: 'reps' | 'load'; set: TrainingSet; previous: TrainingSet; date: string }
/** Actual output records, not a physiological improvement score. Warmups and first exposures never win. */
export function comparableRecords(current: TrainingLog, history: Exposure[]): ComparableRecord[] {
  if (!isLogFinished(current) || current.excludeFromProgression) return [];
  const prior = history.filter(e => (e.log.loadType ?? 'external') === (current.loadType ?? 'external'))
    .flatMap(e => workSets(e.log).map(set => ({ set, date: e.session.performedOn })));
  return workSets(current).flatMap<ComparableRecord>(set => {
    const sameLoad = prior.filter(p => p.set.loadKg === set.loadKg).sort((a,b) => b.set.reps - a.set.reps);
    if (sameLoad[0] && set.reps > sameLoad[0].set.reps) return [{ kind: 'reps' as const, set, previous: sameLoad[0].set, date: sameLoad[0].date }];
    const sameReps = prior.filter(p => p.set.reps === set.reps).sort((a,b) => b.set.loadKg - a.set.loadKg);
    if (sameReps[0] && set.loadKg > sameReps[0].set.loadKg) return [{ kind: 'load' as const, set, previous: sameReps[0].set, date: sameReps[0].date }];
    return [];
  }).filter((record, index, all) => all.findIndex(r => r.kind === record.kind && r.set.loadKg === record.set.loadKg && r.set.reps === record.set.reps) === index);
}

export function sessionSummary(session: TrainingSession) {
  const sets = session.logs.flatMap(workSets), warmups = session.logs.flatMap(l => l.sets).filter(s => s.kind === 'warmup');
  return { sets: sets.length, warmups: warmups.length, reps: sets.reduce((n,s) => n+s.reps,0),
    externalVolume: sets.reduce((n,s) => n+s.loadKg*s.reps,0), partial: session.logs.filter(l => l.status === 'partial').length,
    cardioMinutes: session.cardio ? session.cardio.warmupMinutes + session.cardio.moderateMinutes + session.cardio.cooldownMinutes : 0 };
}

/** Symmetric bar only. Whole quarter-kilos avoid rounding a requested load upwards. */
export function plateCalculation(total: number, bar: number, available: number[]) {
  if (!Number.isFinite(total) || !Number.isFinite(bar) || total < bar || bar < 0 || total > 2000) return null;
  const target = Math.floor((total - bar) * 2 + 1e-8);
  const sizes = [...new Set(available)].filter(v => v > 0 && Number.isInteger(v * 4)).sort((a,b) => b-a);
  // At most 4001 quarter-kilo states. Greedy fails when, for example, only 25/15 kg remain.
  const counts = Array<number>(target+1).fill(Infinity), choices = Array<number>(target+1).fill(0);
  counts[0]=0;
  for(let amount=1;amount<=target;amount++)for(const size of sizes){
    const units=size*4;
    if(units<=amount&&counts[amount-units]+1<counts[amount]){counts[amount]=counts[amount-units]+1;choices[amount]=units;}
  }
  let reachable=target;while(reachable>0&&!Number.isFinite(counts[reachable]))reachable--;
  const plates:number[]=[];
  for(let remaining=reachable;remaining>0;remaining-=choices[remaining])plates.push(choices[remaining]/4);
  plates.sort((a,b)=>b-a);
  const achievable = Math.round((bar+reachable/2)*100)/100;
  return { plates, achievable, missing: Math.round((total-achievable)*100)/100 };
}
