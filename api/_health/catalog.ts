export type HealthTemporalKind = 'instant' | 'interval';

// Fuente: androidx.health.connect:connect-client:1.1.0. Los tres tipos de
// extensión se mantienen en el catálogo aunque el dispositivo pueda no
// exponerlos; la app debe detectar esa disponibilidad antes de leerlos.
export const HEALTH_RECORD_CATALOG = {
  active_calories_burned: 'interval',
  basal_body_temperature: 'instant',
  basal_metabolic_rate: 'instant',
  blood_glucose: 'instant',
  blood_pressure: 'instant',
  body_fat: 'instant',
  body_temperature: 'instant',
  body_water_mass: 'instant',
  bone_mass: 'instant',
  cervical_mucus: 'instant',
  cycling_pedaling_cadence: 'interval',
  distance: 'interval',
  elevation_gained: 'interval',
  exercise_session: 'interval',
  floors_climbed: 'interval',
  heart_rate: 'interval',
  heart_rate_variability_rmssd: 'instant',
  height: 'instant',
  hydration: 'interval',
  intermenstrual_bleeding: 'instant',
  lean_body_mass: 'instant',
  menstruation_flow: 'instant',
  menstruation_period: 'interval',
  mindfulness_session: 'interval',
  nutrition: 'interval',
  ovulation_test: 'instant',
  oxygen_saturation: 'instant',
  planned_exercise_session: 'interval',
  power: 'interval',
  respiratory_rate: 'instant',
  resting_heart_rate: 'instant',
  sexual_activity: 'instant',
  skin_temperature: 'interval',
  sleep_session: 'interval',
  speed: 'interval',
  steps: 'interval',
  steps_cadence: 'interval',
  total_calories_burned: 'interval',
  vo2_max: 'instant',
  weight: 'instant',
  wheelchair_pushes: 'interval',
} as const satisfies Record<string, HealthTemporalKind>;

export type HealthRecordType = keyof typeof HEALTH_RECORD_CATALOG;

export function isHealthRecordType(value: unknown): value is HealthRecordType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(HEALTH_RECORD_CATALOG, value);
}

export function temporalKind(recordType: HealthRecordType): HealthTemporalKind {
  return HEALTH_RECORD_CATALOG[recordType];
}

export const HEALTH_RECORD_TYPES = Object.keys(HEALTH_RECORD_CATALOG) as HealthRecordType[];

// SDK 1.1.0: these sample series allow startTime == endTime; other intervals do not.
export const ZERO_DURATION_RECORD_TYPES: ReadonlySet<HealthRecordType> = new Set([
  'cycling_pedaling_cadence', 'heart_rate', 'power', 'speed', 'steps_cadence',
]);
