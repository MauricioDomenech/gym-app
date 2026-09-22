import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize, config, database, HttpError, validateBatch } from './_health/core.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }
  try {
    const c = config();
    authorize(req.headers.authorization, c.syncHash);
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) throw new HttpError(415, 'json_required');
    if (Number(req.headers['content-length']) > 1_000_000) throw new HttpError(413, 'payload_too_large');
    const records = validateBatch(req.body);
    const accepted = await database(c, 'rpc/coach_ingest_health', { method: 'POST', body: JSON.stringify({ p_profile: c.profile, p_device: c.device, p_records: records }) });
    if (accepted !== records.length) throw new HttpError(503, 'health_storage_unavailable');
    return res.status(200).json({ accepted });
  } catch (error) {
    return res.status(error instanceof HttpError ? error.status : 503).json({ error: error instanceof HttpError ? error.message : 'health_storage_unavailable' });
  }
}
