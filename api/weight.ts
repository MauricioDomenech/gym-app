import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateTrainingOwner } from './_training/auth.js';
import { isWeightRecord, validWeightDate } from '../src/components/weight/weightRecord.js';
import type { WeightRecord } from '../src/components/weight/weightRecord.js';

interface WeightStore {
  read(owner: string, date: string): Promise<WeightRecord | null>;
  write(owner: string, record: WeightRecord): Promise<WeightRecord>;
}
export function createWeightStore(base: string, key: string, fetcher: typeof fetch = fetch): WeightStore {
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !key) throw Error('weight configuration');
  url.pathname = '/rest/v1/coach_daily_weights';
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' };
  async function request(owner: string, date: string, record?: WeightRecord) {
    const endpoint = new URL(url);
    endpoint.searchParams.set('select', 'date,kg');
    if (record) endpoint.searchParams.set('on_conflict', 'owner_id,date');
    else {
      endpoint.searchParams.set('owner_id', `eq.${owner}`);
      endpoint.searchParams.set('date', `eq.${date}`);
    }
    const response = await fetcher(endpoint.toString(), {
      method: record ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { ...headers, ...(record ? { Prefer: 'resolution=merge-duplicates,return=representation' } : {}) },
      ...(record ? { body: JSON.stringify({ owner_id: owner, ...record }) } : {}),
    });
    if (!response.ok) throw Error('weight storage');
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || rows.length > 1 || (rows.length && (!isWeightRecord(rows[0]) || rows[0].date !== date))) throw Error('weight response');
    return rows[0] as WeightRecord | undefined;
  }
  return {
    read: async (owner, date) => await request(owner, date) ?? null,
    write: async (owner, record) => {
      const saved = await request(owner, record.date, record);
      if (!saved || saved.kg !== record.kg) throw Error('weight confirmation');
      return saved;
    },
  };
}
function configuredStore(): WeightStore | null {
  try { return createWeightStore(process.env.COACH_TRAINING_DB_URL ?? '', process.env.COACH_TRAINING_DB_KEY ?? process.env.COACH_TRAINING_DB_SERVICE_KEY ?? ''); }
  catch { return null; }
}
export const createWeightHandler = (store: WeightStore | null = configuredStore(), resolveOwner = authenticateTrainingOwner) => async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'GET' && req.method !== 'PUT') return res.status(405).json({ error: 'method_not_allowed' });
  let owner: string | null;
  try { owner = await resolveOwner(req); } catch { return res.status(503).json({ error: 'weight_auth_unavailable' }); }
  if (!owner) return res.status(401).json({ error: 'authenticated_owner_required' });
  const body: unknown = req.body;
  if (req.method === 'PUT' && (!isWeightRecord(body) || Object.keys(body).some(k => !['date', 'kg'].includes(k)))) return res.status(400).json({ error: 'invalid_weight' });
  const date = req.method === 'GET' ? req.query.date : (body as WeightRecord).date;
  if (!validWeightDate(date)) return res.status(400).json({ error: 'invalid_date' });
  if (!store) return res.status(503).json({ error: 'weight_storage_not_configured' });
  try {
    const record = req.method === 'GET' ? await store.read(owner, date) : await store.write(owner, body as WeightRecord);
    if ((record !== null && (!isWeightRecord(record) || record.date !== date)) || (req.method === 'PUT' && (!record || record.kg !== (body as WeightRecord).kg))) throw Error('invalid confirmation');
    return res.status(200).json({ record });
  } catch { return res.status(503).json({ error: 'weight_storage_unavailable' }); }
};
export default createWeightHandler();
