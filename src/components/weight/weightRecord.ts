export interface WeightRecord { date: string; kg: number }
export const weightToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
export const validWeightDate = (date: unknown): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  date >= '1900-01-01' && date <= weightToday() && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
export const validWeight = (kg: unknown): kg is number => typeof kg === 'number' && Number.isFinite(kg) && kg >= 1 && kg <= 500 && Math.abs(kg * 100 - Math.round(kg * 100)) < 0.000001;
export const isWeightRecord = (value: unknown): value is WeightRecord => Boolean(value && typeof value === 'object' &&
  'date' in value && 'kg' in value && validWeightDate(value.date) && validWeight(value.kg));
