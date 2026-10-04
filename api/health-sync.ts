import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import {
  authorize, batchSchemaVersion, config, database, decodeArchiveJson, decodeFragmentPayload,
  isFragmentPayload, MAX_ARCHIVE_RECORD_BYTES, type HealthFragment, HttpError, validateBatch,
  validateFragments,
} from './_health/core.js';

function recordObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(503, 'health_storage_unavailable');
  return value as Record<string, unknown>;
}

async function syncFragments(c: ReturnType<typeof config>, fragments: HealthFragment[]): Promise<number> {
  const first = fragments[0];
  let complete = false;
  for (const fragment of fragments) {
    const staged = recordObject(await database(c, 'rpc/coach_stage_health_fragment', {
      method: 'POST',
      body: JSON.stringify({
        p_profile: c.profile, p_device: c.device, p_record_type: fragment.recordType,
        p_source_id: fragment.sourceId, p_last_modified_time: fragment.lastModifiedTime,
        p_sha256: fragment.sha256, p_fragment_index: fragment.index,
        p_fragment_count: fragment.count, p_payload_base64: fragment.payloadBase64,
      }),
    }));
    if (staged.accepted !== 1 || typeof staged.complete !== 'boolean') throw new HttpError(503, 'health_storage_unavailable');
    complete ||= staged.complete;
  }
  if (!complete) return fragments.length;

  const chunks: Buffer[] = [];
  let nextIndex = 0;
  let totalBytes = 0;
  while (nextIndex < first.count) {
    const rows = await database(c, 'rpc/coach_read_health_fragment', {
      method: 'POST',
      body: JSON.stringify({
        p_profile: c.profile, p_device: c.device, p_record_type: first.recordType,
        p_source_id: first.sourceId, p_last_modified_time: first.lastModifiedTime,
        p_sha256: first.sha256, p_after_index: nextIndex, p_limit: 8,
      }),
    });
    if (!Array.isArray(rows) || rows.length < 1) throw new HttpError(503, 'health_storage_unavailable');
    for (const rowValue of rows) {
      const row = recordObject(rowValue);
      if (row.index !== nextIndex || typeof row.payloadBase64 !== 'string') throw new HttpError(503, 'health_storage_unavailable');
      const bytes = decodeFragmentPayload(row.payloadBase64);
      totalBytes += bytes.length;
      if (totalBytes > MAX_ARCHIVE_RECORD_BYTES) throw new HttpError(413, 'fragmented_record_too_large');
      chunks.push(bytes);
      nextIndex += 1;
    }
  }
  const payload = Buffer.concat(chunks, totalBytes);
  if (createHash('sha256').update(payload).digest('hex') !== first.sha256) throw new HttpError(400, 'fragment_hash_mismatch');
  const records = validateBatch(decodeArchiveJson(payload), { maxPayloadBytes: MAX_ARCHIVE_RECORD_BYTES });
  if (batchSchemaVersion(records) !== 2 || records.length !== 1) throw new HttpError(400, 'invalid_fragment_payload');
  const record = records[0];
  if (record.recordType !== first.recordType || record.sourceId !== first.sourceId || record.lastModifiedTime !== first.lastModifiedTime) throw new HttpError(400, 'fragment_identity_mismatch');
  const accepted = await database(c, 'rpc/coach_finalize_health_fragment', {
    method: 'POST',
    body: JSON.stringify({
      p_profile: c.profile, p_device: c.device, p_record_type: first.recordType,
      p_source_id: first.sourceId, p_last_modified_time: first.lastModifiedTime,
      p_sha256: first.sha256, p_record: record,
    }),
  });
  if (accepted !== 1) throw new HttpError(503, 'health_storage_unavailable');
  return fragments.length;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }
  try {
    const c = config();
    authorize(req.headers.authorization, c.syncHash);
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) throw new HttpError(415, 'json_required');
    if (Number(req.headers['content-length']) > 1_000_000) throw new HttpError(413, 'payload_too_large');
    if (isFragmentPayload(req.body)) {
      const fragments = validateFragments(req.body);
      const accepted = await syncFragments(c, fragments);
      return res.status(200).json({ accepted });
    }
    const records = validateBatch(req.body);
    const schemaVersion = batchSchemaVersion(records);
    const rpc = schemaVersion === 1 ? 'rpc/coach_ingest_health' : 'rpc/coach_ingest_health_v2';
    const accepted = await database(c, rpc, { method: 'POST', body: JSON.stringify({ p_profile: c.profile, p_device: c.device, p_records: records }) });
    if (accepted !== records.length) throw new HttpError(503, 'health_storage_unavailable');
    return res.status(200).json({ accepted });
  } catch (error) {
    return res.status(error instanceof HttpError ? error.status : 503).json({ error: error instanceof HttpError ? error.message : 'health_storage_unavailable' });
  }
}
