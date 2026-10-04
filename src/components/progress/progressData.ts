import type { TrainingData, TrainingRoutine } from '../training/trainingStorage.js';

export const dateKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(date);
export const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const monday = (date: string) => addDays(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
export const shortDate = (date: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
export interface HealthRow {
  id: number; record_type: string; source_package: string; start_time: string; end_time: string;
  count?: { value: number; unit: string } | number; weight?: { value: number; unit: string }; excluded?: boolean;
}
export interface ProgressHealth {
  sleepNotes?: { date: string; text: string }[];
  days: { date: string; steps: number | null; sleepHours: number | null; daytimeHours: number | null; stepsConflict: boolean }[];
  weights: { date: string; kg: number; source: string }[];
}
const hour = (time: string) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23' }).format(new Date(time)));
function unionMinutes(intervals: [number, number][]) {
  let total = 0, end = -Infinity;
  for (const [a, b] of intervals.sort((a, b) => a[0] - b[0])) { total += Math.max(0, b - Math.max(a, end)); end = Math.max(end, b); }
  return total / 60000;
}
/** Single-source steps; overlapping counts are unknown, never silently summed. Sleep uses union of windows, not net sleep. */
export function summarizeHealth(rows: HealthRow[], from: string, to: string): ProgressHealth {
  const days: ProgressHealth['days'] = [];
  const clean = rows.filter(r => !r.excluded && Number.isFinite(Date.parse(r.start_time)) && Number.isFinite(Date.parse(r.end_time)));
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const steps = clean.filter(r => r.record_type === 'steps' && r.source_package === 'com.sec.android.app.shealth' && dateKey(new Date(r.start_time)) === date).sort((a, b) => a.start_time.localeCompare(b.start_time));
    let end = -Infinity, sum = 0, conflict = false;
    for (const row of steps) {
      const start = Date.parse(row.start_time), finish = Date.parse(row.end_time);
      const count = typeof row.count === 'number' ? row.count : row.count?.unit === 'count' ? row.count.value : NaN;
      if (start < end || finish <= start || dateKey(new Date(finish - 1)) !== date || !Number.isFinite(count) || count! < 0) conflict = true;
      sum += count ?? 0; end = Math.max(end, finish);
    }
    const sleep = clean.filter(r => r.record_type === 'sleep_session' && r.source_package === 'com.sec.android.app.shealth' && dateKey(new Date(r.end_time)) === date);
    const night = sleep.filter(r => hour(r.end_time) < 12);
    const daytime = sleep.filter(r => hour(r.end_time) >= 12);
    const duration = (rs: HealthRow[]) => rs.length ? unionMinutes(rs.map(r => [Date.parse(r.start_time), Date.parse(r.end_time)])) / 60 : null;
    days.push({ date, steps: steps.length && !conflict ? sum : null, stepsConflict: conflict, sleepHours: duration(night), daytimeHours: duration(daytime) });
  }
  const weights = clean.filter(r => r.record_type === 'weight' && r.source_package === 'com.renpho.health').flatMap(r => {
    const kg = r.weight?.unit === 'gram' ? r.weight.value / 1000 : r.weight?.unit === 'kilogram' ? r.weight.value : NaN;
    const date = dateKey(new Date(r.start_time));
    return Number.isFinite(kg) && kg > 0 && kg <= 500 && date >= from && date <= to ? [{ date, kg: Math.round(kg * 100) / 100, source: 'Renpho' }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date));
  return { days, weights };
}
export function trainingWeek(data: TrainingData, plan: TrainingRoutine | null, start: string, today: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const sessions = data.sessions.filter(s => s.performedOn === date);
    const planned = plan && plan.effectiveFrom && date >= plan.effectiveFrom ? plan.days.find(d => d.weekday === ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][index]) : null;
    // Saved prescriptions override the active plan for already-created sessions.
    const plannedSeries = planned ? planned.sessions.reduce((sum, p) => sum + (sessions.find(s => s.routineSessionId === p.id)?.plannedItems ?? p.items).reduce((n, i) => n + i.sets, 0), 0) : null;
    const target = planned ? planned.sessions.reduce((sum, p) => sum + ((sessions.find(s => s.routineSessionId === p.id)?.plannedCardio ?? p.cardio)?.moderateMinutes ?? 0), 0) : null;
    return { date, label: ['L','M','X','J','V','S','D'][index], series: sessions.reduce((n, s) => n + s.logs.reduce((v, l) => v + l.sets.length, 0), 0),
      moderate: sessions.reduce((n, s) => n + (s.cardio?.moderateMinutes ?? 0), 0), total: sessions.reduce((n, s) => n + (s.cardio ? s.cardio.moderateMinutes + s.cardio.warmupMinutes + s.cardio.cooldownMinutes : 0), 0),
      target, plannedSeries, future: date > today, skipped: data.skippedDates?.includes(date) ?? false,
      comments: sessions.flatMap(s => s.cardio?.comment ? [s.cardio.comment] : []),
    };
  });
}
