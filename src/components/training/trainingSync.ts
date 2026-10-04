import { trainingId, validTrainingData } from './trainingStorage.js';
import { trainingAuthorization } from './trainingHttp.js';
import type { TrainingData } from './trainingStorage.js';

export const TRAINING_RECORDS_ENDPOINT = '/api/training?resource=records';
export const TRAINING_REMOTE_TIMEOUT_MS = 10000;
const MAX_TRAINING_REVISION = Number.MAX_SAFE_INTEGER - 1;

export interface TrainingRemoteEnvelope {
  schemaVersion: 1;
  revision: number;
  data: TrainingData;
}

export interface TrainingWriteRequest {
  baseRevision: number;
  requestId: string;
  data: TrainingData;
}

export type TrainingSyncErrorCode = 'unauthorized' | 'unavailable' | 'invalid-response' | 'conflict' | 'rejected' | 'update-required';

export class TrainingSyncError extends Error {
  readonly code: TrainingSyncErrorCode;
  readonly current: TrainingRemoteEnvelope | null;

  constructor(code: TrainingSyncErrorCode, message: string, current: TrainingRemoteEnvelope | null = null) {
    super(message);
    this.name = 'TrainingSyncError';
    this.code = code;
    this.current = current;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isEnvelope = (value: unknown): value is TrainingRemoteEnvelope => (
  isRecord(value) && value.schemaVersion === 1 && typeof value.revision === 'number' && Number.isSafeInteger(value.revision) && value.revision >= 0 && value.revision <= MAX_TRAINING_REVISION && validTrainingData(value.data)
);

const responsePayload = async (response: Response): Promise<{ ok: true; value: unknown } | { ok: false }> => {
  try {
    return { ok: true, value: await response.json() };
  } catch {
    return { ok: false };
  }
};

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(item => item === undefined ? 'null' : canonical(item)).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
};

// Keep the client comparison byte-for-byte compatible with the API fingerprint.
export const canonicalTrainingJson = canonical;
const sameData = (left: TrainingData, right: TrainingData) => canonical(left) === canonical(right);

const validRevision = (value: unknown): value is number => (
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_TRAINING_REVISION
);

const validRequestId = (value: unknown): value is string => (
  typeof value === 'string' && value.length > 0 && value.length <= 160 && /^[A-Za-z0-9._:-]+$/.test(value)
);

export const makeTrainingWriteRequest = (
  data: TrainingData,
  baseRevision: number,
  requestId = trainingId(),
): TrainingWriteRequest => {
  if (!validRevision(baseRevision)) {
    throw new TrainingSyncError('rejected', 'La revisión de registros no es válida.');
  }
  if (!validTrainingData(data)) {
    throw new TrainingSyncError('rejected', 'El registro contiene datos no válidos.');
  }
  if (!validRequestId(requestId)) {
    throw new TrainingSyncError('rejected', 'La operación no tiene un identificador válido.');
  }
  return { baseRevision, requestId, data };
};

export interface TrainingRemoteClient {
  read(): Promise<TrainingRemoteEnvelope | null>;
  write(request: TrainingWriteRequest): Promise<TrainingRemoteEnvelope>;
}

export const createTrainingRemoteClient = (
  fetcher: typeof fetch = fetch,
  endpoint = TRAINING_RECORDS_ENDPOINT,
  timeoutMs = TRAINING_REMOTE_TIMEOUT_MS,
): TrainingRemoteClient => {
  const requestTimeout = Number.isFinite(timeoutMs) ? Math.max(1, Math.floor(timeoutMs)) : TRAINING_REMOTE_TIMEOUT_MS;

  const requestJson = async (init: RequestInit): Promise<{ response: Response; payload: { ok: true; value: unknown } | { ok: false } }> => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let timedOut = false;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error('training-sync-timeout'));
      }, requestTimeout);
    });
    try {
      const response = await Promise.race([
        (async () => fetcher(endpoint, { ...init, headers: { ...init.headers, ...await trainingAuthorization() }, signal: controller.signal }))(),
        timeout,
      ]);
      const payload = await Promise.race([responsePayload(response), timeout]);
      return { response, payload };
    } catch (error) {
      if (timedOut) throw new TrainingSyncError('unavailable', 'El guardado privado tardó demasiado; podés reintentar.');
      throw error;
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  };

  return {
    async read() {
      let result: { response: Response; payload: { ok: true; value: unknown } | { ok: false } };
      try {
        result = await requestJson({ credentials: 'include', headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' } });
      } catch (error) {
        if (error instanceof TrainingSyncError) throw error;
        throw new TrainingSyncError('unavailable', 'No se pudo consultar el guardado privado.');
      }
      const { response, payload: responseResult } = result;
      if (response.status === 401 || response.status === 403) {
        throw new TrainingSyncError('unauthorized', 'La sesión privada no está autenticada.');
      }
      if (response.status === 404 || response.status === 503) {
        throw new TrainingSyncError('unavailable', 'El guardado privado todavía no está activado.');
      }
      if (!response.ok) {
        throw new TrainingSyncError('rejected', 'El servidor rechazó la consulta de registros.');
      }
      if (!responseResult.ok) {
        throw new TrainingSyncError('invalid-response', 'La respuesta de registros no se pudo leer.');
      }
      const envelopePayload = responseResult.value;
      if (envelopePayload === null || envelopePayload === undefined) {
        throw new TrainingSyncError('invalid-response', 'La respuesta de registros no pasó la validación.');
      }
      const envelope = isRecord(envelopePayload) && 'records' in envelopePayload ? envelopePayload.records : envelopePayload;
      if (envelope === null) {
        return null;
      }
      if (!isEnvelope(envelope)) {
        throw new TrainingSyncError('invalid-response', 'La respuesta de registros no pasó la validación.');
      }
      return envelope;
    },

    async write(request) {
      let result: { response: Response; payload: { ok: true; value: unknown } | { ok: false } };
      try {
        result = await requestJson({
          method: 'PUT',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Idempotency-Key': request.requestId,
            'X-Coach-Recording': 'series-v1',
          },
          body: JSON.stringify(request),
        });
      } catch (error) {
        if (error instanceof TrainingSyncError) throw error;
        throw new TrainingSyncError('unavailable', 'No se pudo confirmar el guardado privado.');
      }
      const { response, payload: responseResult } = result;
      const payload = responseResult.ok ? responseResult.value : null;
      const currentPayload = isRecord(payload) && 'records' in payload ? payload.records : null;
      const current = isEnvelope(currentPayload) ? currentPayload : null;
      if (response.status === 426) throw new TrainingSyncError('update-required', 'Hay una versión nueva de Coach. Conservá lo que escribiste y recargá antes de volver a registrar.');
      if (response.status === 401 || response.status === 403) {
        throw new TrainingSyncError('unauthorized', 'La sesión privada no está autenticada.', current);
      }
      if (response.status === 409) {
        throw new TrainingSyncError('conflict', 'Los registros cambiaron en la base de datos. Revisá el estado actualizado antes de guardar.', current);
      }
      if (response.status === 404 || response.status === 503) {
        throw new TrainingSyncError('unavailable', 'El guardado privado todavía no está activado.', current);
      }
      if (!response.ok) {
        throw new TrainingSyncError('rejected', 'El servidor rechazó el guardado privado.', current);
      }
      if (!responseResult.ok || !isEnvelope(current) || current.revision !== request.baseRevision + 1 || !sameData(current.data, request.data) ||
        (isRecord(payload) && 'requestId' in payload && payload.requestId !== request.requestId)) {
        throw new TrainingSyncError('invalid-response', 'El servidor no confirmó el registro guardado.');
      }
      return current;
    },
  };
};
