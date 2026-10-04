import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isHealthRecordType } from './_health/catalog.js';
import { authorize, config, database, HttpError, MAX_ARCHIVE_RECORD_BYTES, timestampExact } from './_health/core.js';

const MAX_RESPONSE_BYTES = 4_000_000;

function queryString(value: unknown, max: number, error: string): string {
  // eslint-disable-next-line no-control-regex -- Los filtros no deben transportar controles.
  if (typeof value !== 'string' || !value || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw new HttpError(400, error);
  return value;
}

function queryInteger(value: unknown, maxDigits: number, max: number, error: string, minimum = 0): number {
  if (typeof value !== 'string' || !new RegExp(`^\\d{1,${maxDigits}}$`).test(value) || Number(value) < minimum || Number(value) > max) throw new HttpError(400, error);
  return Number(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method_not_allowed' }); }
  try {
    const c = config(); authorize(req.headers.authorization, c.readHash);
    const q = req.query;
    for (const key of Object.keys(q)) if (!['after','limit','from','to','recordType','includeExcluded','sourceId','sourcePackage','schemaVersion','detail','detailId','detailAfter','detailLimit','detailRevision'].includes(key) || typeof q[key] !== 'string') throw new HttpError(400, 'invalid_query');
    if (q.detailId !== undefined) {
      if (Object.keys(q).some(key => !['detailId','detailAfter','detailLimit','detailRevision','includeExcluded'].includes(key))) throw new HttpError(400, 'invalid_query');
      const id = queryInteger(q.detailId, 15, Number.MAX_SAFE_INTEGER, 'invalid_detail_cursor');
      const after = queryInteger(q.detailAfter ?? '0', 8, MAX_ARCHIVE_RECORD_BYTES * 2, 'invalid_detail_cursor');
      const limit = queryInteger(q.detailLimit ?? '240000', 6, 240000, 'invalid_detail_limit', 1);
      if (q.includeExcluded !== undefined && !['true', 'false'].includes(q.includeExcluded as string)) throw new HttpError(400, 'invalid_query');
      const revision = q.detailRevision;
      if ((after > 0 && revision === undefined) || (revision !== undefined && (typeof revision !== 'string' || !/^[a-f0-9]{32}$/.test(revision)))) throw new HttpError(400, 'invalid_detail_revision');
      const detail = await database(c, 'rpc/coach_read_health_detail', {
        method: 'POST',
        body: JSON.stringify({ p_profile: c.profile, p_device: c.device, p_id: id, p_after: after, p_limit: limit, p_include_excluded: q.includeExcluded === 'true', p_expected_revision: revision ?? null }),
      });
      if (detail === null) return res.status(404).json({ error: 'health_detail_not_found' });
      if (!isObject(detail)) throw new HttpError(503, 'health_storage_unavailable');
      if (detail.changed === true) throw new HttpError(409, 'health_detail_changed');
      return res.status(200).json({ detail });
    }
    const detailMode = q.detail ?? 'auto';
    if (!['auto', 'full', 'metadata'].includes(detailMode as string)) throw new HttpError(400, 'invalid_detail_mode');
    const after = q.after ?? '0', limit = q.limit ?? '100';
    if (!/^\d{1,15}$/.test(after as string) || !/^\d{1,3}$/.test(limit as string) || Number(limit) < 1 || Number(limit) > 200) throw new HttpError(400, 'invalid_pagination');
    if (q.detailAfter !== undefined || q.detailLimit !== undefined || q.detailRevision !== undefined) throw new HttpError(400, 'invalid_query');
    const params = new URLSearchParams({ select: '*', profile_id: `eq.${c.profile}`, device_id: `eq.${c.device}`, id: `gt.${after}`, order: 'id.asc', limit: String(Number(limit) + 1) });
    if (q.includeExcluded !== undefined && !['true','false'].includes(q.includeExcluded as string)) throw new HttpError(400, 'invalid_query');
    if (q.includeExcluded !== 'true') params.set('excluded', 'eq.false');
    if (q.recordType !== undefined) {
      if (!isHealthRecordType(q.recordType)) throw new HttpError(400, 'invalid_type');
      params.set('record_type', `eq.${q.recordType}`);
    }
    if (q.schemaVersion !== undefined) {
      if (!['1', '2'].includes(q.schemaVersion as string)) throw new HttpError(400, 'invalid_schema');
      params.set('schema_version', `eq.${q.schemaVersion}`);
    }
    if (q.from !== undefined) params.set('end_ns', `gte.${timestampExact(q.from, true)}`);
    if (q.to !== undefined) params.set('start_ns', `lte.${timestampExact(q.to, true)}`);
    if (q.from !== undefined && q.to !== undefined && timestampExact(q.from, true) > timestampExact(q.to, true)) throw new HttpError(400, 'invalid_interval');
    if (q.sourceId !== undefined) {
      const sourceId = queryString(q.sourceId, 1024, 'invalid_source_id');
      params.set('source_id', `eq.${sourceId}`);
    }
    if (q.sourcePackage !== undefined) {
      const sourcePackage = queryString(q.sourcePackage, 255, 'invalid_source_package');
      params.set('source_package', `eq.${sourcePackage}`);
    }
    const rows = await database(c, `coach_health_record_headers?${params}`);
    if (!Array.isArray(rows)) throw new HttpError(503, 'health_storage_unavailable');
    const sourceRows = rows.slice(0, Number(limit));
    const records: Record<string, unknown>[] = [];
    let responseBytes = Buffer.byteLength('{"records":[],"nextCursor":null}', 'utf8');
    let stoppedForSize = false;
    for (const row of sourceRows) {
      if (!isObject(row)) throw new HttpError(503, 'health_storage_unavailable');
      const dataBytes = row.data_bytes;
      if (typeof dataBytes !== 'number' || !Number.isSafeInteger(dataBytes) || dataBytes < 0) throw new HttpError(503, 'health_storage_unavailable');
      const header = { ...row };
      delete header.start_ns; delete header.end_ns; delete header.data_bytes;
      const metadata = { ...header, data: null, detailAvailable: true, detailBytes: dataBytes, detailCursor: String(row.id) };
      let output: Record<string, unknown> = metadata;
      const budget = MAX_RESPONSE_BYTES - responseBytes - Buffer.byteLength(JSON.stringify(header), 'utf8') - 256;
      if (detailMode !== 'metadata') {
        if (dataBytes <= budget) {
          const inline = await database(c, 'rpc/coach_read_health_inline', { method: 'POST', body: JSON.stringify({
            p_profile: c.profile, p_device: c.device, p_id: row.id, p_max_bytes: budget,
            p_include_excluded: q.includeExcluded === 'true',
          }) });
          if (!isObject(inline)) throw new HttpError(503, 'health_storage_unavailable');
          if (Object.prototype.hasOwnProperty.call(inline, 'data')) output = { ...header, data: inline.data };
          else if (inline.tooLarge !== true) throw new HttpError(503, 'health_storage_unavailable');
        }
        if (detailMode === 'full' && output === metadata) throw new HttpError(413, 'health_response_too_large');
      }
      const outputBytes = Buffer.byteLength(JSON.stringify(output), 'utf8');
      if (responseBytes + outputBytes > MAX_RESPONSE_BYTES && records.length > 0) {
        stoppedForSize = true;
        break;
      }
      if (responseBytes + outputBytes > MAX_RESPONSE_BYTES) throw new HttpError(413, 'health_response_too_large');
      records.push(output);
      responseBytes += outputBytes + 1;
    }
    const hasMore = stoppedForSize || rows.length > Number(limit);
    return res.status(200).json({ records, nextCursor: hasMore ? String(records.at(-1)?.id) : null });
  } catch (error) {
    return res.status(error instanceof HttpError ? error.status : 503).json({ error: error instanceof HttpError ? error.message : 'health_storage_unavailable' });
  }
}
