import { createHash, timingSafeEqual } from 'node:crypto';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type HealthRecord = {
  recordType: 'exercise_session' | 'heart_rate'; sourceId: string; sourcePackage: string;
  lastModifiedTime: string; startTime: string; endTime: string;
  startZoneOffsetSeconds: number | null; endZoneOffsetSeconds: number | null;
  data: Record<string, unknown>;
};
export type Config = { url: string; serviceKey: string; profile: string; device: string; syncHash: string; readHash: string };
export function config(env: NodeJS.ProcessEnv = process.env): Config {
  const { COACH_HEALTH_SUPABASE_URL: url, COACH_HEALTH_SERVICE_ROLE_KEY: serviceKey,
    COACH_HEALTH_PROFILE_ID: profile, COACH_HEALTH_DEVICE_ID: device,
    COACH_HEALTH_SYNC_TOKEN_SHA256: syncHash, COACH_HEALTH_READ_TOKEN_SHA256: readHash } = env;
  if (!url || !serviceKey || !profile || !device || !syncHash || !readHash ||
      !/^[a-f0-9]{64}$/.test(syncHash) || !/^[a-f0-9]{64}$/.test(readHash) || syncHash === readHash ||
      profile.length > 128 || device.length > 128) throw new HttpError(503, 'health_not_configured');
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new HttpError(503, 'health_not_configured'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new HttpError(503, 'health_not_configured');
  return { url: parsed.origin, serviceKey, profile, device, syncHash, readHash };
}
export function authorize(header: unknown, hash: string): void {
  if (typeof header !== 'string' || !/^Bearer [^\s]{32,512}$/.test(header)) throw new HttpError(401, 'unauthorized');
  const digest = createHash('sha256').update(header.slice(7)).digest();
  if (!timingSafeEqual(digest, Buffer.from(hash, 'hex'))) throw new HttpError(401, 'unauthorized');
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'invalid_object');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, expected: string[]) {
  if (Object.keys(value).length !== expected.length || expected.some(k => !(k in value))) throw new HttpError(400, 'invalid_fields');
}
function string(value: unknown, max: number): asserts value is string {
  if (typeof value !== 'string' || !value || value.length > max || /[\u0000-\u001f]/.test(value)) throw new HttpError(400, 'invalid_string');
}
export function timestamp(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new HttpError(400, 'invalid_time');
  const time = Date.parse(value);
  const day = Number(value.slice(8,10));
  const month = Number(value.slice(5,7));
  const year = Number(value.slice(0,4));
  if (!Number.isFinite(time) || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || Number(value.slice(11,13)) > 23 || time < 0 || time > Date.now() + 86_400_000) throw new HttpError(400, 'invalid_time');
  return time;
}
export function validateBatch(body: unknown): HealthRecord[] {
  let raw: string;
  try { raw = typeof body === 'string' ? body : JSON.stringify(body); } catch { throw new HttpError(400, 'invalid_json'); }
  if (typeof raw !== 'string') throw new HttpError(400, 'invalid_json');
  if (Buffer.byteLength(raw) > 1_000_000) throw new HttpError(413, 'payload_too_large');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new HttpError(400, 'invalid_json'); }
  const envelope = object(parsed);
  keys(envelope, ['schemaVersion', 'records']);
  if (envelope.schemaVersion !== 1 || !Array.isArray(envelope.records) || envelope.records.length < 1 || envelope.records.length > 200) throw new HttpError(400, 'invalid_batch');
  const seen = new Set<string>();
  return envelope.records.map(value => {
    const r = object(value);
    keys(r, ['recordType','sourceId','sourcePackage','lastModifiedTime','startTime','endTime','startZoneOffsetSeconds','endZoneOffsetSeconds','data']);
    if (r.recordType !== 'exercise_session' && r.recordType !== 'heart_rate') throw new HttpError(400, 'invalid_type');
    string(r.sourceId, 1024); string(r.sourcePackage, 255);
    const identity = JSON.stringify([r.recordType, r.sourceId]);
    if (seen.has(identity)) throw new HttpError(400, 'duplicate_in_batch');
    seen.add(identity);
    const start = timestamp(r.startTime), end = timestamp(r.endTime);
    timestamp(r.lastModifiedTime);
    if (end <= start) throw new HttpError(400, 'invalid_interval');
    for (const key of ['startZoneOffsetSeconds','endZoneOffsetSeconds']) {
      const offset = r[key];
      if (offset !== null && (typeof offset !== 'number' || !Number.isInteger(offset) || Math.abs(offset) > 64800)) throw new HttpError(400, 'invalid_offset');
    }
    const data = object(r.data);
    if (r.recordType === 'exercise_session') {
      keys(data, ['exerciseType','title','notes']);
      if (typeof data.exerciseType !== 'number' || !Number.isInteger(data.exerciseType) || data.exerciseType < 0 || data.exerciseType > 10000) throw new HttpError(400, 'invalid_exercise');
      for (const key of ['title','notes']) if (data[key] !== null && (typeof data[key] !== 'string' || (data[key] as string).length > 20000)) throw new HttpError(400, 'invalid_text');
    } else {
      keys(data, ['samples']);
      if (!Array.isArray(data.samples) || !data.samples.length || data.samples.length > 10000) throw new HttpError(400, 'invalid_samples');
      let previous = -Infinity;
      for (const item of data.samples) {
        const sample = object(item); keys(sample, ['time','bpm']);
        const time = timestamp(sample.time);
        if (time < start || time > end || time < previous || typeof sample.bpm !== 'number' || !Number.isInteger(sample.bpm) || sample.bpm < 1 || sample.bpm > 300) throw new HttpError(400, 'invalid_sample');
        previous = time;
      }
    }
    return r as HealthRecord;
  });
}
export async function database(c: Config, path: string, init: RequestInit = {}) {
  const response = await fetch(`${c.url}/rest/v1/${path}`, {
    ...init, redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new HttpError(503, 'health_storage_unavailable');
  return response.json();
}
