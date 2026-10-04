import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateTrainingOwner } from './_training/auth.js';
import { config, database } from './_health/core.js';
import { addDays, dateKey, summarizeHealth } from '../src/components/progress/progressData.js';
import type { HealthRow } from '../src/components/progress/progressData.js';
import { validDate } from '../src/components/training/trainingStorage.js';

export async function readProgressHealth(from: string, to: string) {
  const c = config();
  const rows: HealthRow[] = [];
  // Only small scalar projections; sleep stages and sensor samples never leave storage.
  for (let offset = 0; offset < 10000; offset += 500) {
    const query = new URLSearchParams({ select: 'id,record_type,source_package,start_time,end_time,count:data->count,weight:data->weight',
      profile_id: `eq.${c.profile}`, device_id: `eq.${c.device}`, excluded: 'eq.false', record_type: 'in.(steps,sleep_session,weight)',
      source_package: 'in.(com.sec.android.app.shealth,com.renpho.health)',
      end_time: `gte.${addDays(from, -1)}T00:00:00Z`, start_time: `lt.${addDays(to, 1)}T00:00:00Z`, order: 'id.asc', limit: '500', offset: String(offset) });
    const page = await database(c, `coach_health_records?${query}`);
    if (!Array.isArray(page)) throw Error('invalid health response');
    rows.push(...page as HealthRow[]);
    if (page.length < 500) return summarizeHealth(rows, from, to);
  }
  throw Error('health range too large');
}
export async function readProgressWeights(owner: string, from: string, to: string) {
  const base = process.env.COACH_TRAINING_DB_URL, key = process.env.COACH_TRAINING_DB_KEY ?? process.env.COACH_TRAINING_DB_SERVICE_KEY;
  if (!base || !key) throw Error('weight configuration');
  const url = new URL('/rest/v1/coach_daily_weights', base);
  if (url.protocol !== 'https:') throw Error('weight configuration');
  url.search = new URLSearchParams({ select: 'date,kg', owner_id: `eq.${owner}`, and: `(date.gte.${from},date.lte.${to})`, order: 'date.asc', limit: '100' }).toString();
  const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('weight unavailable');
  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || rows.some(r => !r || !validDate(r.date) || typeof r.kg !== 'number' || !Number.isFinite(r.kg) || r.kg <= 0 || r.kg > 500)) throw Error('invalid weights');
  return rows.map(r => ({ date: r.date as string, kg: r.kg as number, source: 'Coach' }));
}
export const createProgressHandler = (resolveOwner = authenticateTrainingOwner, readHealth = readProgressHealth, readWeights = readProgressWeights) => async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Vary', 'Authorization');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method_not_allowed' }); }
  try {
    const owner = await resolveOwner(req);
    if (!owner) return res.status(401).json({ error: 'authenticated_owner_required' });
    const { from, to } = req.query;
    if (Object.keys(req.query).some(k => !['from','to'].includes(k)) || typeof from !== 'string' || typeof to !== 'string' || !validDate(from) || !validDate(to) || from > to || to > dateKey(new Date()) || Date.parse(to) - Date.parse(from) > 34 * 86400000) return res.status(400).json({ error: 'invalid_range' });
    const [health, weights] = await Promise.allSettled([readHealth(from, to), readWeights(owner, from, to)]);
    const healthResult = health.status === 'fulfilled' ? health.value : null;
    // Confirmed context belongs to these dates only, delivered behind owner authentication.
    if (healthResult) healthResult.sleepNotes = healthResult.days.filter(d => ['2026-09-29', '2026-10-03'].includes(d.date) && d.sleepHours === null).map(d => ({ date: d.date, text: 'Sin medición: me explicaste que el reloj quedó cargando.' }));
    return res.status(200).json({ health: healthResult, weights: weights.status === 'fulfilled' ? weights.value : null });
  } catch { return res.status(503).json({ error: 'progress_unavailable' }); }
};
export default createProgressHandler();
