import { trainingAuthorization } from '../training/trainingHttp';
import { isWeightRecord } from './weightRecord';
import type { WeightRecord } from './weightRecord';
export async function requestWeight(date: string, kg?: number): Promise<WeightRecord | null> {
  const response = await fetch(`/api/weight?date=${encodeURIComponent(date)}`, {
    method: kg === undefined ? 'GET' : 'PUT',
    headers: { ...await trainingAuthorization(), 'Content-Type': 'application/json' },
    ...(kg === undefined ? {} : { body: JSON.stringify({ date, kg }) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw Error(response.status === 401 ? 'La sesión venció. Volvé a entrar.' : kg === undefined ? 'No se pudo cargar el peso. Intentá de nuevo.' : 'No se pudo confirmar el guardado. El peso sigue aquí para reintentar.');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('record' in data)) throw Error('No se recibió una confirmación válida.');
  if (kg === undefined && data.record === null) return null;
  if (!isWeightRecord(data.record) || data.record.date !== date || (kg !== undefined && data.record.kg !== kg)) throw Error('No se recibió una confirmación válida.');
  return data.record;
}
