import { createHash, timingSafeEqual } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { isHealthRecordType, temporalKind, ZERO_DURATION_RECORD_TYPES, type HealthRecordType } from './catalog.js';

const MAX_PAYLOAD_BYTES = 1_000_000;
const MAX_BATCH_RECORDS = 200;
const MAX_JSON_DEPTH = 32;
const MAX_JSON_ARRAY = 10_000;
const MAX_JSON_KEYS = 256;
const MAX_DATA_STRING = 32 * 1024 * 1024;
const MAX_JSON_STRING = MAX_DATA_STRING;
const MAX_UNIT_STRING = 64;
const MAX_OFFSET_SECONDS = 64_800;
export const MAX_FRAGMENT_BYTES = 240 * 1024;
export const MAX_ARCHIVE_RECORD_BYTES = 32 * 1024 * 1024;
export const MAX_FRAGMENT_COUNT = Math.ceil(MAX_ARCHIVE_RECORD_BYTES / MAX_FRAGMENT_BYTES);
const MAX_FRAGMENT_BASE64 = Math.ceil(MAX_FRAGMENT_BYTES / 3) * 4;
const MAX_FRAGMENT_BATCH = 3;

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
export type HealthRecordEnvelope = {
  recordType: HealthRecordType;
  sourceId: string;
  sourcePackage: string;
  lastModifiedTime: string;
  startTime: string;
  endTime: string;
  startZoneOffsetSeconds: number | null;
  endZoneOffsetSeconds: number | null;
  data: JsonObject;
};
export type HealthRecord = HealthRecordEnvelope;
export type HealthSchemaVersion = 1 | 2;
export type ValidatedBatch = HealthRecord[] & { readonly schemaVersion: HealthSchemaVersion };
export type HealthFragment = {
  recordType: HealthRecordType;
  sourceId: string;
  lastModifiedTime: string;
  sha256: string;
  index: number;
  count: number;
  payloadBase64: string;
};
export type ValidatedFragments = HealthFragment[] & { readonly schemaVersion: 2 };
export type Config = { url: string; serviceKey: string; profile: string; device: string; syncHash: string; readHash: string };

type JsonScan = { seen: Set<object> };

export function config(env: NodeJS.ProcessEnv = process.env): Config {
  const { COACH_HEALTH_SUPABASE_URL: url, COACH_HEALTH_SERVICE_ROLE_KEY: serviceKey,
    COACH_HEALTH_PROFILE_ID: profile, COACH_HEALTH_DEVICE_ID: device,
    COACH_HEALTH_SYNC_TOKEN_SHA256: syncHash, COACH_HEALTH_READ_TOKEN_SHA256: readHash } = env;
  if (!url || !serviceKey || !profile || !device || !syncHash || !readHash ||
      !/^[a-f0-9]{64}$/.test(syncHash) || !/^[a-f0-9]{64}$/.test(readHash) || syncHash === readHash ||
      profile.length > 128 || device.length > 128 || unsafeScopeValue(profile) || unsafeScopeValue(device)) throw new HttpError(503, 'health_not_configured');
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

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeKey(value: string): boolean {
  return value.length >= 1 && value.length <= 128 && /^[A-Za-z][A-Za-z0-9_.-]*$/.test(value) &&
    value !== '__proto__' && value !== 'prototype' && value !== 'constructor';
}

function unsafeScopeValue(value: string): boolean {
  return Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f || ',()'.includes(character);
  });
}

function invalidJson(message = 'invalid_json'): never {
  throw new HttpError(400, message);
}

function scanJson(value: unknown, depth: number, state: JsonScan): asserts value is JsonValue {
  if (depth > MAX_JSON_DEPTH) invalidJson('json_too_deep');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) invalidJson('invalid_number');
    return;
  }
  if (typeof value === 'string') {
    if (value.length > MAX_JSON_STRING || Array.from(value).some(character => {
      const code = character.charCodeAt(0);
      return (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0x7f;
    })) invalidJson('invalid_string');
    return;
  }
  if (typeof value !== 'object') invalidJson();
  if (state.seen.has(value)) invalidJson('json_limits');
  state.seen.add(value);
  try {
    if (Array.isArray(value)) {
      for (const item of value) scanJson(item, depth + 1, state);
    } else {
      if (!isPlainObject(value)) invalidJson();
      const entries = Object.entries(value);
      if (entries.length > MAX_JSON_KEYS) invalidJson('json_limits');
      for (const [key, item] of entries) {
        if (!safeKey(key)) invalidJson('invalid_key');
        scanJson(item, depth + 1, state);
      }
    }
  } finally {
    state.seen.delete(value);
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !isPlainObject(value)) throw new HttpError(400, 'invalid_object');
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, expected: string[]) {
  if (Object.keys(value).length !== expected.length || expected.some(k => !(k in value))) throw new HttpError(400, 'invalid_fields');
}

function string(value: unknown, max: number): asserts value is string {
  // eslint-disable-next-line no-control-regex -- La validación rechaza deliberadamente controles C0; no son caracteres accidentales.
  if (typeof value !== 'string' || !value || value.length > max || /[\u0000-\u001f]/.test(value)) throw new HttpError(400, 'invalid_string');
}

export function timestamp(value: unknown, allowFuture = false): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new HttpError(400, 'invalid_time');
  const time = Date.parse(value);
  const day = Number(value.slice(8, 10));
  const month = Number(value.slice(5, 7));
  const year = Number(value.slice(0, 4));
  const hour = Number(value.slice(11, 13));
  const minute = Number(value.slice(14, 16));
  const second = Number(value.slice(17, 19));
  const zone = value.endsWith('Z') ? 'Z' : value.slice(-6);
  const zoneHour = zone === 'Z' ? 0 : Number(zone.slice(1, 3));
  const zoneMinute = zone === 'Z' ? 0 : Number(zone.slice(4, 6));
  if (!Number.isFinite(time) || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
      hour > 23 || minute > 59 || second > 59 || zoneHour > 23 || zoneMinute > 59 || time < 0 ||
      (!allowFuture && time > Date.now() + 86_400_000)) throw new HttpError(400, 'invalid_time');
  return time;
}

export function timestampExact(value: unknown, allowFuture = false): bigint {
  timestamp(value, allowFuture);
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_time');
  const fraction = value.match(/\.(\d{1,9})(?=(?:Z|[+-]))/)?.[1] ?? '';
  const withoutFraction = value.replace(/\.\d{1,9}(?=(?:Z|[+-]))/, '');
  return BigInt(Date.parse(withoutFraction)) * 1_000_000n + BigInt(fraction.padEnd(9, '0') || 0);
}

function offset(value: unknown): void {
  if (value !== null && (typeof value !== 'number' || !Number.isInteger(value) || !Number.isSafeInteger(value) || Math.abs(value) > MAX_OFFSET_SECONDS)) throw new HttpError(400, 'invalid_offset');
}

function validateV1Data(recordType: 'exercise_session' | 'heart_rate', value: unknown, start: number, end: number): JsonObject {
  const data = object(value);
  if (recordType === 'exercise_session') {
    keys(data, ['exerciseType', 'title', 'notes']);
    if (typeof data.exerciseType !== 'number' || !Number.isInteger(data.exerciseType) || data.exerciseType < 0 || data.exerciseType > 10000) throw new HttpError(400, 'invalid_exercise');
    for (const key of ['title', 'notes']) if (data[key] !== null && (typeof data[key] !== 'string' || (data[key] as string).length > 20_000)) throw new HttpError(400, 'invalid_text');
    return data as JsonObject;
  }
  keys(data, ['samples']);
  if (!Array.isArray(data.samples) || !data.samples.length || data.samples.length > MAX_JSON_ARRAY) throw new HttpError(400, 'invalid_samples');
  let previous = -Infinity;
  for (const item of data.samples) {
    const sample = object(item); keys(sample, ['time', 'bpm']);
    const time = timestamp(sample.time);
    if (time < start || time > end || time < previous || typeof sample.bpm !== 'number' || !Number.isInteger(sample.bpm) || sample.bpm < 1 || sample.bpm > 300) throw new HttpError(400, 'invalid_sample');
    previous = time;
  }
  return data as JsonObject;
}

const METADATA_KEYS = new Set(['metadata', 'origin', 'dataOrigin', 'device']);
const RAW_NUMBER_KEYS = new Set(['zoneOffsetSeconds', 'startZoneOffsetSeconds', 'endZoneOffsetSeconds']);
const TIMESTAMP_KEYS = new Set(['time', 'startTime', 'endTime', 'lastModifiedTime']);

function validateRawOffset(value: unknown): void {
  if (value === null) return;
  if (typeof value !== 'number' || !Number.isInteger(value) || !Number.isSafeInteger(value) || Math.abs(value) > MAX_OFFSET_SECONDS) throw new HttpError(400, 'invalid_offset');
}

function validateUnit(value: unknown): void {
  string(value, MAX_UNIT_STRING);
  if (!/^[A-Za-z][A-Za-z0-9._/%-]*$/.test(value)) throw new HttpError(400, 'invalid_unit');
}

function validateSignedInt64(value: unknown): void {
  if (typeof value !== 'string' || value === '-0' || !/^-?(?:0|[1-9]\d*)$/.test(value) || value.length > 20) throw new HttpError(400, 'invalid_int64');
  try {
    const parsed = BigInt(value);
    if (parsed < -9_223_372_036_854_775_808n || parsed > 9_223_372_036_854_775_807n) throw new HttpError(400, 'invalid_int64');
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'invalid_int64');
  }
}

function validateDetailedNode(value: unknown, depth: number, metadataContext: boolean, rawNumberContext = false): void {
  if (depth > MAX_JSON_DEPTH) throw new HttpError(400, 'json_too_deep');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') {
    if (value.length > MAX_DATA_STRING) throw new HttpError(400, 'invalid_string');
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (!metadataContext && !rawNumberContext)) throw new HttpError(400, 'invalid_measure');
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) validateDetailedNode(item, depth + 1, metadataContext, rawNumberContext);
    return;
  }
  const record = object(value);
  const entries = Object.entries(record);
  const hasValue = Object.prototype.hasOwnProperty.call(record, 'value') &&
    Object.prototype.hasOwnProperty.call(record, 'unit') &&
    entries.every(([key]) => key === 'value' || key === 'unit' || key === 'encoding');
  if (hasValue) {
    if (typeof record.value === 'number') {
      if (!Number.isFinite(record.value) || (Number.isInteger(record.value) && !Number.isSafeInteger(record.value))) throw new HttpError(400, 'invalid_measure');
    } else if (typeof record.value === 'string' && record.encoding === 'int64') {
      validateSignedInt64(record.value);
    } else {
      throw new HttpError(400, 'invalid_measure');
    }
    validateUnit(record.unit);
  }
  for (const [key, child] of entries) {
    if (hasValue && (key === 'value' || key === 'unit')) continue;
    if (metadataContext && key === 'clientRecordVersion') validateSignedInt64(child);
    if (RAW_NUMBER_KEYS.has(key)) validateRawOffset(child);
    if (TIMESTAMP_KEYS.has(key)) timestamp(child, key !== 'lastModifiedTime');
    validateDetailedNode(child, depth + 1, metadataContext || METADATA_KEYS.has(key), RAW_NUMBER_KEYS.has(key));
  }
}

function validateV2Data(value: unknown): JsonObject {
  const data = object(value);
  if (!Object.prototype.hasOwnProperty.call(data, 'metadata') || !data.metadata || typeof data.metadata !== 'object' || Array.isArray(data.metadata)) throw new HttpError(400, 'invalid_metadata');
  validateDetailedNode(data, 0, false);
  return data as JsonObject;
}

function validateRecord(value: unknown, schemaVersion: HealthSchemaVersion): HealthRecord {
  const record = object(value);
  keys(record, ['recordType', 'sourceId', 'sourcePackage', 'lastModifiedTime', 'startTime', 'endTime', 'startZoneOffsetSeconds', 'endZoneOffsetSeconds', 'data']);
  if (!isHealthRecordType(record.recordType)) throw new HttpError(400, 'invalid_type');
  if (schemaVersion === 1 && record.recordType !== 'exercise_session' && record.recordType !== 'heart_rate') throw new HttpError(400, 'invalid_type');
  string(record.sourceId, 1024); string(record.sourcePackage, 255);
  const allowFuture = schemaVersion === 2 && record.recordType === 'planned_exercise_session';
  const start = timestamp(record.startTime, allowFuture);
  const end = timestamp(record.endTime, allowFuture);
  const startExact = timestampExact(record.startTime, allowFuture);
  const endExact = timestampExact(record.endTime, allowFuture);
  timestamp(record.lastModifiedTime);
  const temporal = temporalKind(record.recordType);
  if (schemaVersion === 2 && temporal === 'instant' && endExact !== startExact) throw new HttpError(400, 'invalid_instant');
  const allowsZeroDuration = schemaVersion === 2 && ZERO_DURATION_RECORD_TYPES.has(record.recordType);
  if ((schemaVersion === 1 || temporal === 'interval') && (endExact < startExact || (endExact === startExact && !allowsZeroDuration))) throw new HttpError(400, 'invalid_interval');
  offset(record.startZoneOffsetSeconds); offset(record.endZoneOffsetSeconds);
  record.data = schemaVersion === 1
    ? validateV1Data(record.recordType as 'exercise_session' | 'heart_rate', record.data, start, end)
    : validateV2Data(record.data);
  return record as HealthRecord;
}

function parsePayload(body: unknown, maxPayloadBytes = MAX_PAYLOAD_BYTES): { value: unknown; raw: string } {
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > maxPayloadBytes) throw new HttpError(413, 'payload_too_large');
    try {
      const value = JSON.parse(body) as unknown;
      scanJson(value, 0, { seen: new Set() });
      return { value, raw: body };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, 'invalid_json');
    }
  }
  try {
    const raw = JSON.stringify(body);
    if (typeof raw !== 'string') throw new HttpError(400, 'invalid_json');
    if (Buffer.byteLength(raw, 'utf8') > maxPayloadBytes) throw new HttpError(413, 'payload_too_large');
    // The byte budget bounds collections too; sample arrays are not truncated by an unrelated count ceiling.
    scanJson(body, 0, { seen: new Set() });
    return { value: body, raw };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'invalid_json');
  }
}

export function validateBatch(body: unknown, options: { maxPayloadBytes?: number } = {}): ValidatedBatch {
  const { value } = parsePayload(body, options.maxPayloadBytes ?? MAX_PAYLOAD_BYTES);
  const envelope = object(value);
  keys(envelope, ['schemaVersion', 'records']);
  if (envelope.schemaVersion !== 1 && envelope.schemaVersion !== 2) throw new HttpError(400, 'invalid_batch');
  const schemaVersion = envelope.schemaVersion as HealthSchemaVersion;
  if (!Array.isArray(envelope.records) || envelope.records.length < 1 || envelope.records.length > MAX_BATCH_RECORDS) throw new HttpError(400, 'invalid_batch');
  const seen = new Set<string>();
  const records = envelope.records.map(item => {
    const record = validateRecord(item, schemaVersion);
    const identity = JSON.stringify([record.recordType, record.sourceId]);
    if (seen.has(identity)) throw new HttpError(400, 'duplicate_in_batch');
    seen.add(identity);
    return record;
  }) as ValidatedBatch;
  Object.defineProperty(records, 'schemaVersion', { value: schemaVersion, enumerable: false });
  return records;
}

function decodeBase64(value: unknown): Buffer {
  string(value, MAX_FRAGMENT_BASE64);
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new HttpError(400, 'invalid_fragment');
  const bytes = Buffer.from(value, 'base64');
  if (!bytes.length || bytes.length > MAX_FRAGMENT_BYTES || bytes.toString('base64') !== value) throw new HttpError(400, 'invalid_fragment');
  return bytes;
}

export function validateFragments(body: unknown): ValidatedFragments {
  const { value } = parsePayload(body);
  const envelope = object(value);
  keys(envelope, ['schemaVersion', 'fragments']);
  if (envelope.schemaVersion !== 2 || !Array.isArray(envelope.fragments) || envelope.fragments.length < 1 || envelope.fragments.length > MAX_FRAGMENT_BATCH) throw new HttpError(400, 'invalid_fragments');
  const seen = new Set<number>();
  const fragments = envelope.fragments.map(item => {
    const fragment = object(item);
    keys(fragment, ['recordType', 'sourceId', 'lastModifiedTime', 'sha256', 'index', 'count', 'payloadBase64']);
    if (!isHealthRecordType(fragment.recordType)) throw new HttpError(400, 'invalid_type');
    string(fragment.sourceId, 1024);
    timestamp(fragment.lastModifiedTime);
    if (typeof fragment.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(fragment.sha256)) throw new HttpError(400, 'invalid_fragment');
    if (typeof fragment.index !== 'number' || !Number.isSafeInteger(fragment.index) || typeof fragment.count !== 'number' || !Number.isSafeInteger(fragment.count) || fragment.count < 1 || fragment.count > MAX_FRAGMENT_COUNT || fragment.index < 0 || fragment.index >= fragment.count) throw new HttpError(400, 'invalid_fragment');
    if (seen.has(fragment.index)) throw new HttpError(400, 'duplicate_fragment');
    seen.add(fragment.index);
    decodeBase64(fragment.payloadBase64);
    return fragment as HealthFragment;
  }) as ValidatedFragments;
  const first = fragments[0];
  if (fragments.some(fragment => fragment.recordType !== first.recordType || fragment.sourceId !== first.sourceId || fragment.lastModifiedTime !== first.lastModifiedTime || fragment.sha256 !== first.sha256 || fragment.count !== first.count)) throw new HttpError(400, 'mixed_fragments');
  const totalBytes = fragments.reduce((total, fragment) => total + decodeBase64(fragment.payloadBase64).length, 0);
  if (totalBytes > MAX_ARCHIVE_RECORD_BYTES) throw new HttpError(413, 'fragmented_record_too_large');
  Object.defineProperty(fragments, 'schemaVersion', { value: 2, enumerable: false });
  return fragments;
}

export function isFragmentPayload(body: unknown): boolean {
  let value = body;
  if (typeof body === 'string') {
    try { value = JSON.parse(body) as unknown; } catch { return false; }
  }
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, 'fragments');
}

export function decodeFragmentPayload(payloadBase64: string): Buffer {
  return decodeBase64(payloadBase64);
}

export function decodeArchiveJson(bytes: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new HttpError(400, 'invalid_fragment_utf8'); }
}

export function batchSchemaVersion(records: readonly HealthRecord[]): HealthSchemaVersion {
  const value = (records as Partial<ValidatedBatch>).schemaVersion;
  return value === 2 ? 2 : 1;
}

export async function database(c: Config, path: string, init: RequestInit = {}) {
  const response = await fetch(`${c.url}/rest/v1/${path}`, {
    ...init, redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new HttpError(503, 'health_storage_unavailable');
  return response.json();
}
