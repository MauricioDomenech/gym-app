import type { WeatherPreferences } from './todaySettingsStorage';

const fields = ['temperature_2m', 'apparent_temperature', 'precipitation_probability', 'precipitation', 'wind_speed_10m'] as const;
type Field = typeof fields[number];
export type WeatherSlot = { label: string; time: string; date: string; values: Record<Field, number | null> };
export type TripForecast = { slots: WeatherSlot[]; timezone: string; updatedAt: Date; recommendation: string };

export function weatherUrl(preferences: WeatherPreferences): string {
  if (!preferences.location) throw new Error('Falta la ubicación');
  const params = new URLSearchParams({
    latitude: String(preferences.location.latitude), longitude: String(preferences.location.longitude),
    hourly: fields.join(','), timezone: 'auto', forecast_days: '3', past_days: '1',
    temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm',
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

function localDateTime(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function tripTimes(preferences: WeatherPreferences, timezone: string, now: Date): string[] {
  const local = localDateTime(now, timezone);
  const today = local.slice(0, 10);
  const time = local.slice(11);
  const overnight = preferences.returnTime <= preferences.departureTime;
  // Preserve an ongoing trip, including an overnight return. Otherwise use the next trip.
  const departureDay = overnight && time <= preferences.returnTime ? shiftDay(today, -1)
    : !overnight && time > preferences.returnTime ? shiftDay(today, 1) : today;
  const returnDay = overnight ? shiftDay(departureDay, 1) : departureDay;
  return [`${departureDay}T${preferences.departureTime}`, `${returnDay}T${preferences.returnTime}`];
}

export function parseForecast(raw: unknown, preferences: WeatherPreferences, now = new Date()): TripForecast {
  if (!raw || typeof raw !== 'object') throw new Error('Respuesta meteorológica inválida');
  const data = raw as Record<string, unknown>;
  if (typeof data.timezone !== 'string' || !data.hourly || typeof data.hourly !== 'object') throw new Error('Faltan datos horarios');
  const timezone = data.timezone;
  const today = localDateTime(now, timezone).slice(0, 10); // Also validates the provider timezone.
  const hourly = data.hourly as Record<string, unknown>;
  const times = hourly.time;
  if (!Array.isArray(times) || !times.length || !times.every(t => typeof t === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(t))) throw new Error('Horas inválidas');
  const ranges: Record<Field, [number, number]> = {
    temperature_2m: [-100, 70], apparent_temperature: [-150, 100],
    precipitation_probability: [0, 100], precipitation: [0, 2000], wind_speed_10m: [0, 500],
  };
  for (const field of fields) {
    const values = hourly[field];
    const [min, max] = ranges[field];
    if (!Array.isArray(values) || values.length !== times.length || !values.every(v => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max))) throw new Error('Mediciones inválidas');
  }
  const slots = tripTimes(preferences, timezone, now).map((time, index) => {
    // Hourly estimates: use the hour containing the configured departure/return, without inventing interpolation.
    const hourIndex = times.indexOf(`${time.slice(0, 13)}:00`);
    if (hourIndex === -1) throw new Error('No hay pronóstico para ese horario');
    const day = time.slice(0, 10);
    const date = day === today ? 'Hoy' : day === shiftDay(today, 1) ? 'Mañana'
      : new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
    const values = Object.fromEntries(fields.map(field => [field, (hourly[field] as (number | null)[])[hourIndex]])) as Record<Field, number | null>;
    return { label: index === 0 ? 'Ida' : 'Vuelta', time: time.slice(11), date, values };
  });
  const values = slots.map(slot => slot.values);
  const notes: string[] = [];
  const exposed = preferences.transport !== 'driving';
  if (values.some(v => (v.precipitation_probability ?? -1) >= 50 || (v.precipitation ?? 0) >= 0.2)) {
    notes.push(preferences.transport === 'cycling' ? 'Llevá impermeable para la bici.'
      : exposed ? 'Llevá paraguas o impermeable.' : 'Puede llover en el trayecto.');
  }
  if (values.some(v => v.apparent_temperature !== null && v.apparent_temperature < 16)) notes.push('Llevá una chaqueta.');
  if (values.some(v => v.apparent_temperature !== null && v.apparent_temperature >= 30)) notes.push('Hará calor: llevá agua.');
  if (exposed && values.some(v => (v.wind_speed_10m ?? 0) >= 30)) notes.push(preferences.transport === 'cycling' ? 'Atención al viento al ir en bici.' : 'Se espera viento fuerte.');
  const missing = values.some(v => fields.some(field => v[field] === null));
  if (missing) notes.push('Hay mediciones no disponibles; revisá el tiempo antes de salir.');
  return { slots, timezone, updatedAt: now, recommendation: notes.join(' ') || 'Sin lluvia ni temperaturas extremas previstas para tus horarios.' };
}
