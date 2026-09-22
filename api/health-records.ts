import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize, config, database, HttpError, timestamp } from './_health/core.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method_not_allowed' }); }
  try {
    const c = config(); authorize(req.headers.authorization, c.readHash);
    const q = req.query;
    for (const key of Object.keys(q)) if (!['after','limit','from','to','recordType','includeExcluded','sourceId'].includes(key) || typeof q[key] !== 'string') throw new HttpError(400, 'invalid_query');
    const after = q.after ?? '0', limit = q.limit ?? '100';
    if (!/^\d{1,15}$/.test(after as string) || !/^\d{1,3}$/.test(limit as string) || Number(limit) < 1 || Number(limit) > 200) throw new HttpError(400, 'invalid_pagination');
    const params = new URLSearchParams({ select: '*', profile_id: `eq.${c.profile}`, device_id: `eq.${c.device}`, id: `gt.${after}`, order: 'id.asc', limit: String(Number(limit) + 1) });
    if (q.includeExcluded !== undefined && !['true','false'].includes(q.includeExcluded as string)) throw new HttpError(400, 'invalid_query');
    if (q.includeExcluded !== 'true') params.set('excluded', 'eq.false');
    if (q.recordType) {
      if (!['exercise_session','heart_rate'].includes(q.recordType as string)) throw new HttpError(400, 'invalid_type');
      params.set('record_type', `eq.${q.recordType}`);
    }
    if (q.from) { timestamp(q.from); params.append('end_time', `gte.${q.from}`); }
    if (q.to) { timestamp(q.to); params.append('start_time', `lte.${q.to}`); }
    if (q.from && q.to && Date.parse(q.from as string) > Date.parse(q.to as string)) throw new HttpError(400, 'invalid_interval');
    if (q.sourceId) {
      if ((q.sourceId as string).length > 1024) throw new HttpError(400, 'invalid_source_id');
      params.set('source_id', `eq.${q.sourceId}`);
    }
    const rows = await database(c, `coach_health_records?${params}`);
    if (!Array.isArray(rows)) throw new HttpError(503, 'health_storage_unavailable');
    const records = rows.slice(0, Number(limit));
    return res.status(200).json({ records, nextCursor: rows.length > Number(limit) ? String(records.at(-1)?.id) : null });
  } catch (error) {
    return res.status(error instanceof HttpError ? error.status : 503).json({ error: error instanceof HttpError ? error.message : 'health_storage_unavailable' });
  }
}
