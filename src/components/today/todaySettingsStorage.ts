export const TODAY_SETTINGS_STORAGE_KEY = 'gym-app:today-settings:v1';

export type WeatherLocationSource = 'gps' | 'search';

export type WeatherLocation = {
  source: WeatherLocationSource;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type Transport = 'walking' | 'cycling' | 'driving' | 'public-transit';

export type WeatherPreferences = {
  version: 1;
  location: WeatherLocation | null;
  departureTime: string;
  returnTime: string;
  transport: Transport | '';
};

const transportValues = new Set<Transport>(['walking', 'cycling', 'driving', 'public-transit']);
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const isFiniteCoordinate = (value: unknown, min: number, max: number): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
);

const isWeatherLocation = (value: unknown): value is WeatherLocation => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const location = value as Record<string, unknown>;
  return (
    (location.source === 'gps' || location.source === 'search') &&
    typeof location.label === 'string' && location.label.trim().length > 0 &&
    location.label.length <= 160 &&
    isFiniteCoordinate(location.latitude, -90, 90) &&
    isFiniteCoordinate(location.longitude, -180, 180) &&
    typeof location.timezone === 'string' && location.timezone.trim().length > 0 &&
    location.timezone.length <= 120
  );
};

const isWeatherPreferences = (value: unknown): value is WeatherPreferences => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const preferences = value as Record<string, unknown>;
  const transport = preferences.transport;
  return (
    preferences.version === 1 &&
    (preferences.location === null || isWeatherLocation(preferences.location)) &&
    typeof preferences.departureTime === 'string' &&
    (preferences.departureTime === '' || timePattern.test(preferences.departureTime)) &&
    typeof preferences.returnTime === 'string' &&
    (preferences.returnTime === '' || timePattern.test(preferences.returnTime)) &&
    (transport === '' || (typeof transport === 'string' && transportValues.has(transport as Transport)))
  );
};

export const readWeatherPreferences = (): WeatherPreferences | null => {
  try {
    const rawValue = window.localStorage.getItem(TODAY_SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    return isWeatherPreferences(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
};

const writeWeatherPreferences = (preferences: WeatherPreferences): boolean => {
  try {
    window.localStorage.setItem(TODAY_SETTINGS_STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
};

export const saveWeatherPreferences = (preferences: Omit<WeatherPreferences, 'version'>): boolean => (
  writeWeatherPreferences({ version: 1, ...preferences })
);

export const clearStoredWeatherLocation = (): { ok: boolean; preferences: WeatherPreferences | null } => {
  try {
    const rawValue = window.localStorage.getItem(TODAY_SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return { ok: true, preferences: null };
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    if (!isWeatherPreferences(parsedValue)) {
      window.localStorage.removeItem(TODAY_SETTINGS_STORAGE_KEY);
      return { ok: true, preferences: null };
    }

    const preferences = { ...parsedValue, location: null } satisfies WeatherPreferences;
    return {
      ok: writeWeatherPreferences(preferences),
      preferences,
    };
  } catch {
    return { ok: false, preferences: null };
  }
};
