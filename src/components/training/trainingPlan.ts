import type {
  TrainingData,
  TrainingRoutine,
  TrainingRoutineDay,
  TrainingRoutineSession,
  TrainingRoutineSessionKind,
  TrainingSession,
  TrainingWeekday,
} from './trainingStorage.js';
import { validCardioPlan, validRoutineItem } from './trainingStorage.js';
import { trainingAuthorization } from './trainingHttp.js';

export const TRAINING_PLAN_ENDPOINT = '/api/training?resource=plan';

const weekdays: TrainingWeekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const weekdayByIntlName: Record<string, TrainingWeekday> = {
  Monday: 'monday',
  Tuesday: 'tuesday',
  Wednesday: 'wednesday',
  Thursday: 'thursday',
  Friday: 'friday',
  Saturday: 'saturday',
  Sunday: 'sunday',
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isText = (value: unknown, max = 200): value is string => (
  typeof value === 'string' && value.trim().length > 0 && value.length <= max
);

const isInteger = (value: unknown, min = 1, max = 1000000): value is number => (
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
);

const unique = (values: string[]) => new Set(values).size === values.length;

const isSessionKind = (value: unknown): value is TrainingRoutineSessionKind => (
  value === 'strength' || value === 'cardio'
);

const isRoutineSession = (value: unknown): value is TrainingRoutineSession => {
  if (!isRecord(value) || !isText(value.id) || !isText(value.title, 160) || !Array.isArray(value.items) || !value.items.every(validRoutineItem)) {
    return false;
  }

  const kind = value.kind ?? 'strength';
  if (!isSessionKind(kind)) {
    return false;
  }

  if (kind === 'cardio') {
    return value.items.length === 0 && validCardioPlan(value.cardio);
  }

  return value.items.length > 0 && (value.cardio === undefined || validCardioPlan(value.cardio));
};

const isRoutineDay = (value: unknown): value is TrainingRoutineDay => {
  if (!isRecord(value) || !isText(value.id) || !isText(value.label, 120) || !Array.isArray(value.sessions) || !value.sessions.every(isRoutineSession)) {
    return false;
  }

  return weekdays.includes(value.weekday as TrainingWeekday) &&
    (value.kind === 'strength' || value.kind === 'cardio' || value.kind === 'rest' || value.kind === 'mixed') &&
    (value.kind === 'rest' ? value.sessions.length === 0 : value.sessions.length > 0);
};

/**
 * Validate a server response before it can enter the UI. The client never
 * treats a malformed or unauthenticated response as a plan.
 */
export const isTrainingRoutine = (value: unknown): value is TrainingRoutine => {
  if (!isRecord(value) || !isText(value.id) || !isInteger(value.version) || !isText(value.name, 160) || !isText(value.source, 500) ||
    !isText(value.effectiveFrom, 10) || !Array.isArray(value.days) || value.days.length !== 7 || !value.days.every(isRoutineDay)) {
    return false;
  }

  const days = value.days as TrainingRoutineDay[];
  return unique(days.map(day => day.id)) && unique(days.map(day => day.weekday as string)) &&
    (value.guidance === undefined || (Array.isArray(value.guidance) && value.guidance.every(item => isText(item, 3000))));
};

export type TrainingPlanLoadState = 'loading' | 'ready' | 'no-plan' | 'unavailable' | 'error';

export class TrainingPlanError extends Error {
  readonly state: Exclude<TrainingPlanLoadState, 'loading' | 'ready'>;

  constructor(message: string, state: Exclude<TrainingPlanLoadState, 'loading' | 'ready'>) {
    super(message);
    this.name = 'TrainingPlanError';
    this.state = state;
  }
}

export async function loadTrainingPlan(fetcher: typeof fetch = fetch): Promise<TrainingRoutine> {
  let response: Response;
  try {
    response = await fetcher(TRAINING_PLAN_ENDPOINT, {
      credentials: 'include',
      headers: { Accept: 'application/json', ...await trainingAuthorization() },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new TrainingPlanError('No se pudo consultar la rutina privada. Podés seguir viendo tus registros locales.', 'unavailable');
  }

  if (response.status === 404) {
    throw new TrainingPlanError('Todavía no hay una rutina asignada a esta cuenta.', 'no-plan');
  }
  if (response.status === 401 || response.status === 403 || response.status === 503) {
    throw new TrainingPlanError('La rutina todavía no está disponible en una sesión privada autenticada.', 'unavailable');
  }
  if (!response.ok) {
    throw new TrainingPlanError('La respuesta de la rutina no es válida. No voy a mostrar un plan incompleto.', 'error');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new TrainingPlanError('La respuesta de la rutina no se pudo leer.', 'error');
  }

  const plan = isRecord(payload) && 'plan' in payload ? payload.plan : payload;
  if (!isTrainingRoutine(plan)) {
    throw new TrainingPlanError('La respuesta de la rutina no pasó la validación.', 'error');
  }
  return plan;
}

export const weekdayForMadrid = (date = new Date()): TrainingWeekday => {
  const label = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', weekday: 'long' }).format(date);
  return weekdayByIntlName[label] ?? 'monday';
};

export const today = (date = new Date()): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid',
}).format(date);

export const dayForMadrid = (routine: TrainingRoutine | null, date = new Date()): TrainingRoutineDay | null => {
  if (!routine) return null;
  const weekday = weekdayForMadrid(date);
  return routine.days.find(day => day.weekday === weekday) ?? null;
};

/** Only today's assigned session can be started; older drafts stay in history. */
export const trainingForToday = (routine: TrainingRoutine | null, data: TrainingData, date = new Date()) => {
  const day = dayForMadrid(routine, date);
  const plan = day?.kind === 'rest' ? null : day?.sessions[0] ?? null;
  const dateKey = today(date);
  const matches = plan ? data.sessions.filter(s => s.performedOn === dateKey &&
    s.routineId === routine?.id && s.routineDayId === day?.id && s.routineSessionId === plan.id) : [];
  const session: TrainingSession | null = matches.find(s => !s.finishedAt) ??
    [...matches].reverse().find(s => s.logs.length > 0 || s.cardio !== undefined) ?? null;
  return { day, plan, session, dateKey };
};

export type TrainingDayStatus = 'no-plan' | 'rest' | 'skipped' | 'scheduled' | 'in-progress' | 'completed';

export const statusForDay = (routine: TrainingRoutine | null, data: TrainingData, date = new Date()): TrainingDayStatus => {
  if (!routine) {
    return 'no-plan';
  }
  if (data.skippedDates?.includes(today(date))) return 'skipped';
  const day = dayForMadrid(routine, date);
  if (!day || day.kind === 'rest') {
    return 'rest';
  }
  const dateKey = today(date);
  const sessions = data.sessions.filter(session => session.performedOn === dateKey &&
    session.routineId === routine.id && session.routineDayId === day.id);
  const complete = day.sessions.length > 0 && day.sessions.every(plan => {
    const matching = sessions.filter(session => session.routineSessionId === plan.id);
    // Completion means every slot was recorded, not that every prescribed target was met.
    // Partial effort remains explicit in each record. Use the saved plan snapshot.
    const session = matching.find(s => !s.finishedAt) ?? [...matching].reverse().find(s => s.logs.length > 0 || s.cardio !== undefined);
    if (!session) return false;
    const items = session.plannedItems ?? plan.items;
    const cardio = session.plannedCardio ?? plan.cardio;
    return (items.length > 0 || !!cardio) && items.every(item => session.logs.some(log =>
      log.plannedItemId === item.id || (!log.plannedItemId && log.exerciseId === item.exerciseId))) &&
      (!cardio || session.cardio !== undefined);
  });
  if (complete) return 'completed';
  if (sessions.some(session => day.sessions.some(plan => plan.id === session.routineSessionId))) {
    return 'in-progress';
  }
  return 'scheduled';
};

export const displayLabelForDay = (day: TrainingRoutineDay | null): string => {
  if (!day || day.kind === 'rest') {
    return 'Descanso';
  }
  return day.label;
};
