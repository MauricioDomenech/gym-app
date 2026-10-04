import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { acceptedTrainingPlan } from './_training/plan.js';
import { authenticateTrainingOwner } from './_training/auth.js';
import type { TrainingRoutine } from '../src/components/training/trainingStorage.js';
import { isTrainingRoutine } from '../src/components/training/trainingPlan.js';
import { validTrainingData } from '../src/components/training/trainingStorage.js';
import type { TrainingData } from '../src/components/training/trainingStorage.js';
import type { TrainingRemoteEnvelope, TrainingWriteRequest } from '../src/components/training/trainingSync.js';

type OwnerId = string;

export const MAX_TRAINING_WRITE_BYTES = 1_000_000;
export const TRAINING_DATABASE_TIMEOUT_MS = 10_000;
const MAX_REVISION = Number.MAX_SAFE_INTEGER - 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface TrainingStore {
  readPlan?(ownerId: OwnerId, planId: string): Promise<TrainingRoutine | null>;
  read(ownerId: OwnerId): Promise<TrainingRemoteEnvelope | null>;
  write(ownerId: OwnerId, request: TrainingWriteRequest): Promise<
    | { kind: 'ok'; envelope: TrainingRemoteEnvelope }
    | { kind: 'replay'; envelope: TrainingRemoteEnvelope }
    | { kind: 'conflict'; current: TrainingRemoteEnvelope | null }
    | { kind: 'rejected'; reason: 'request_id_reused' }
  >;
}

export interface TrainingDatabaseTransport {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

export interface PostgrestTrainingStoreOptions {
  baseUrl: string;
  apiKey: string;
  fetcher?: TrainingDatabaseTransport['fetch'];
}

class TrainingStorageError extends Error {
  constructor() {
    super('training storage unavailable');
    this.name = 'TrainingStorageError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const text = (value: unknown, max = 200): value is string => (
  typeof value === 'string' && value.length > 0 && value.length <= max
);

const validRevision = (value: unknown): value is number => (
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_REVISION
);

const validRequestId = (value: unknown): value is string => (
  text(value, 160) && /^[A-Za-z0-9._:-]+$/.test(value)
);

const cloneData = (data: TrainingData): TrainingData => structuredClone(data);

const cloneEnvelope = (envelope: TrainingRemoteEnvelope): TrainingRemoteEnvelope => ({
  ...envelope,
  data: cloneData(envelope.data),
});

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(item => canonical(item === undefined ? null : item)).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
};

const requestFingerprint = (request: TrainingWriteRequest): string => createHash('sha256')
  .update(canonical({ baseRevision: request.baseRevision, data: request.data }))
  .digest('hex');

const isUuidOwner = (ownerId: string): boolean => UUID.test(ownerId);

/**
 * In-memory CAS store used only by synthetic local contract tests. Production
 * must inject a transactional store backed by database/training-r1.sql.
 */
export const createMemoryTrainingStore = (): TrainingStore => {
  const records = new Map<OwnerId, TrainingRemoteEnvelope>();
  const mutations = new Map<string, { baseRevision: number; fingerprint: string; envelope: TrainingRemoteEnvelope }>();

  return {
    async read(ownerId) {
      const current = records.get(ownerId);
      return current ? cloneEnvelope(current) : null;
    },

    async write(ownerId, request) {
      const mutationKey = JSON.stringify([ownerId, request.requestId]);
      const replay = mutations.get(mutationKey);
      if (replay) {
        if (replay.baseRevision !== request.baseRevision || replay.fingerprint !== requestFingerprint(request)) {
          return { kind: 'rejected', reason: 'request_id_reused' };
        }
        return { kind: 'replay', envelope: cloneEnvelope(replay.envelope) };
      }

      const current = records.get(ownerId) ?? null;
      const currentRevision = current?.revision ?? 0;
      if (request.baseRevision !== currentRevision) {
        return { kind: 'conflict', current: current ? cloneEnvelope(current) : null };
      }

      const envelope: TrainingRemoteEnvelope = {
        schemaVersion: 1,
        revision: currentRevision + 1,
        data: cloneData(request.data),
      };
      records.set(ownerId, envelope);
      mutations.set(mutationKey, {
        baseRevision: request.baseRevision,
        fingerprint: requestFingerprint(request),
        envelope: cloneEnvelope(envelope),
      });
      return { kind: 'ok', envelope: cloneEnvelope(envelope) };
    },
  };
};

const restBaseUrl = (baseUrl: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new TrainingStorageError();
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (!['http:', 'https:'].includes(parsed.protocol) || (parsed.protocol === 'http:' && !loopback) ||
      parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new TrainingStorageError();
  }
  const trimmed = parsed.toString().replace(/\/+$/, '');
  return /\/rest\/v1$/i.test(trimmed) ? trimmed : `${trimmed}/rest/v1`;
};

const isEnvelope = (value: unknown): value is TrainingRemoteEnvelope => (
  isRecord(value) && value.schemaVersion === 1 && validRevision(value.revision) && validTrainingData(value.data)
);

const responseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new TrainingStorageError();
  }
};

const databaseResponse = async (response: Response): Promise<unknown> => {
  if (!response.ok) {
    throw new TrainingStorageError();
  }
  return responseJson(response);
};

const postgrestEnvelope = (value: unknown): TrainingRemoteEnvelope | null => {
  if (value === null) return null;
  if (!isEnvelope(value)) throw new TrainingStorageError();
  return value;
};

const isWriteConfirmation = (envelope: TrainingRemoteEnvelope, request: TrainingWriteRequest): boolean => (
  envelope.revision === request.baseRevision + 1 && canonical(envelope.data) === canonical(request.data)
);

/**
 * Real server-side adapter. The transport is injectable so its protocol can
 * be tested without a database or a credential. Production configuration is
 * deliberately absent unless both URL and key are provided by the runtime.
 */
export const createPostgrestTrainingStore = (options: PostgrestTrainingStoreOptions): TrainingStore => {
  const baseUrl = restBaseUrl(options.baseUrl);
  if (!options.apiKey) throw new TrainingStorageError();
  const fetcher = options.fetcher ?? fetch;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    apikey: options.apiKey,
    Authorization: `Bearer ${options.apiKey}`,
  };

  const call = async (path: string, body: Record<string, unknown>): Promise<unknown> => {
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}/${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TRAINING_DATABASE_TIMEOUT_MS),
      });
    } catch {
      throw new TrainingStorageError();
    }
    return databaseResponse(response);
  };

  return {
    async readPlan(ownerId, planId) {
      if (!isUuidOwner(ownerId) || !text(planId, 160)) throw new TrainingStorageError();
      const payload = await call('rpc/coach_training_plan_read', { p_owner_id: ownerId, p_plan_id: planId });
      if (payload === null) return null;
      if (!isTrainingRoutine(payload) || payload.id !== planId || !payload.effectiveFrom ||
          payload.effectiveFrom > new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())) throw new TrainingStorageError();
      return payload;
    },
    async read(ownerId) {
      if (!isUuidOwner(ownerId)) throw new TrainingStorageError();
      const payload = await call('rpc/coach_training_read', { p_owner_id: ownerId });
      return postgrestEnvelope(payload);
    },

    async write(ownerId, request) {
      if (!isUuidOwner(ownerId) || !validRevision(request.baseRevision) || !validRequestId(request.requestId) || !validTrainingData(request.data)) {
        throw new TrainingStorageError();
      }
      const payload = await call('rpc/coach_training_write', {
        p_owner_id: ownerId,
        p_base_revision: request.baseRevision,
        p_request_id: request.requestId,
        p_payload: request.data,
      });
      if (!isRecord(payload) || typeof payload.kind !== 'string') throw new TrainingStorageError();
      if (payload.kind === 'request_id_reused') {
        return { kind: 'rejected', reason: 'request_id_reused' };
      }
      if (payload.kind === 'conflict') {
        const current = payload.records === null || payload.records === undefined ? null : postgrestEnvelope(payload.records);
        return { kind: 'conflict', current };
      }
      if (payload.kind === 'ok' || payload.kind === 'replay') {
        const envelope = postgrestEnvelope(payload.response);
        if (!envelope || !isWriteConfirmation(envelope, request)) throw new TrainingStorageError();
        return { kind: payload.kind, envelope };
      }
      throw new TrainingStorageError();
    },
  };
};

const trustedOwner = (req: VercelRequest): OwnerId | null => {
  // The reverse proxy/auth layer must sign this UUID assertion. A client-
  // supplied owner header is never trusted on its own.
  const assertionSecret = process.env.COACH_AUTH_ASSERTION_SECRET;
  if (!assertionSecret) {
    return null;
  }
  const value = req.headers['x-coach-owner'];
  const signatureValue = req.headers['x-coach-owner-signature'];
  const owner = Array.isArray(value) ? null : value;
  const signature = Array.isArray(signatureValue) ? null : signatureValue;
  if (!owner || !signature || !isUuidOwner(owner) || !/^[a-f0-9]{64}$/.test(signature)) {
    return null;
  }
  const expected = createHmac('sha256', assertionSecret).update(owner).digest('hex');
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature)) ? owner : null;
};

export const configuredStore = (): TrainingStore | null => {
  const baseUrl = process.env.COACH_TRAINING_DB_URL;
  const apiKey = process.env.COACH_TRAINING_DB_KEY ?? process.env.COACH_TRAINING_DB_SERVICE_KEY;
  if (!baseUrl || !apiKey) {
    // No implicit fallback is allowed here. Returning 503 is safer than
    // pretending a process-local map is durable.
    return null;
  }
  try {
    return createPostgrestTrainingStore({ baseUrl, apiKey });
  } catch {
    return null;
  }
};

const send = (res: VercelResponse, status: number, body: unknown) => res.status(status).json(body);

const parseWriteRequest = (body: unknown): TrainingWriteRequest | null => {
  if (!isRecord(body) || Object.keys(body).some(key => !['baseRevision', 'requestId', 'data'].includes(key)) ||
      !validRevision(body.baseRevision) || !validRequestId(body.requestId) || !validTrainingData(body.data)) {
    return null;
  }
  return { baseRevision: body.baseRevision, requestId: body.requestId, data: body.data };
};

const bodyBytes = (body: unknown): number | null => {
  try {
    return Buffer.byteLength(JSON.stringify(body), 'utf8');
  } catch {
    return null;
  }
};

const scalarHeader = (value: string | string[] | undefined): string | null => (
  typeof value === 'string' ? value : null
);

const planOwnerConfigured = (ownerId: OwnerId): boolean => {
  const configured = process.env.COACH_TRAINING_OWNER_ID;
  return typeof configured === 'string' && isUuidOwner(configured) && configured === ownerId;
};

const configuredOwner = (req: VercelRequest): Promise<string | null> | string | null => (
  process.env.COACH_AUTH_MODE === 'gateway' ? trustedOwner(req) : authenticateTrainingOwner(req)
);

export const createTrainingHandler = (
  store: TrainingStore | null = configuredStore(),
  resolveOwner: (req: VercelRequest) => Promise<string | null> | string | null = configuredOwner,
) => async (
  req: VercelRequest,
  res: VercelResponse,
) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'PUT') {
    return send(res, 405, { error: 'method_not_allowed' });
  }

  let ownerId: OwnerId | null;
  try {
    ownerId = await resolveOwner(req);
  } catch {
    return send(res, 503, { error: 'training_auth_unavailable' });
  }
  if (!ownerId) {
    return send(res, 401, { error: 'authenticated_owner_required' });
  }

  const resource = typeof req.query.resource === 'string' ? req.query.resource : '';
  if (resource === 'identity' && req.method === 'GET') return send(res, 200, { ownerId });
  if (resource === 'plan' && req.method === 'GET') {
    if (process.env.COACH_TRAINING_PLAN_MODE === 'database') {
      if (!planOwnerConfigured(ownerId)) return send(res, 404, { error: 'training_plan_not_found' });
      const planId = process.env.COACH_TRAINING_PLAN_ID;
      if (!planId || !store?.readPlan) return send(res, 503, { error: 'training_plan_not_activated' });
      try {
        const plan = await store.readPlan(ownerId, planId);
        if (!plan) return send(res, 404, { error: 'training_plan_not_found' });
        if (!isTrainingRoutine(plan) || plan.id !== planId) return send(res, 503, { error: 'training_plan_not_activated' });
        return send(res, 200, { plan });
      } catch {
        return send(res, 503, { error: 'training_storage_unavailable' });
      }
    }
    if (process.env.COACH_TRAINING_PLAN_MODE === 'no-plan') {
      return send(res, 404, { error: 'training_plan_not_found' });
    }
    if (process.env.COACH_TRAINING_PLAN_MODE !== 'server-seed') {
      return send(res, 503, { error: 'training_plan_not_activated' });
    }
    if (!planOwnerConfigured(ownerId)) {
      return send(res, 404, { error: 'training_plan_not_found' });
    }
    if (!isTrainingRoutine(acceptedTrainingPlan)) {
      return send(res, 503, { error: 'training_plan_not_activated' });
    }
    return send(res, 200, { plan: acceptedTrainingPlan });
  }

  if (resource !== 'records') {
    return send(res, 404, { error: 'unknown_resource' });
  }

  if (!store) {
    return send(res, 503, { error: 'training_storage_not_configured' });
  }

  if (req.method === 'GET') {
    try {
      const records = await store.read(ownerId);
      if (records !== null && !isEnvelope(records)) {
        throw new TrainingStorageError();
      }
      return send(res, 200, { records });
    } catch {
      return send(res, 503, { error: 'training_storage_unavailable' });
    }
  }

  const contentType = scalarHeader(req.headers['content-type']);
  if (contentType && !/^application\/json(?:;|$)/i.test(contentType)) {
    return send(res, 415, { error: 'json_required' });
  }
  const contentLength = scalarHeader(req.headers['content-length']);
  if (contentLength !== null && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_TRAINING_WRITE_BYTES) {
    return send(res, 413, { error: 'payload_too_large' });
  }
  const size = bodyBytes(req.body);
  if (size === null) {
    return send(res, 400, { error: 'invalid_training_write' });
  }
  if (size > MAX_TRAINING_WRITE_BYTES) {
    return send(res, 413, { error: 'payload_too_large' });
  }

  const request = parseWriteRequest(req.body);
  if (!request) {
    return send(res, 400, { error: 'invalid_training_write' });
  }
  const idempotencyKey = scalarHeader(req.headers['idempotency-key']);
  if (idempotencyKey !== null && idempotencyKey !== request.requestId) {
    return send(res, 400, { error: 'idempotency_key_mismatch' });
  }
  try {
    const result = await store.write(ownerId, request);
    if (result.kind === 'conflict') {
      if (result.current !== null && !isEnvelope(result.current)) {
        throw new TrainingStorageError();
      }
      return send(res, 409, { error: 'training_revision_conflict', records: result.current });
    }
    if (result.kind === 'rejected') {
      return send(res, 409, { error: 'training_request_id_reused' });
    }
    if (result.kind !== 'ok' && result.kind !== 'replay') {
      return send(res, 503, { error: 'training_storage_unavailable' });
    }
    if (!isEnvelope(result.envelope)) {
      throw new TrainingStorageError();
    }
    if (!isWriteConfirmation(result.envelope, request)) {
      throw new TrainingStorageError();
    }
    return send(res, 200, {
      records: result.envelope,
      replayed: result.kind === 'replay',
      requestId: request.requestId,
    });
  } catch {
    return send(res, 503, { error: 'training_storage_unavailable' });
  }
};

export default createTrainingHandler();
