import { useEffect, useRef, useState } from 'react';
import type { FC, FormEvent } from 'react';
import {
  clearStoredWeatherLocation,
  readWeatherPreferences,
  saveWeatherPreferences,
} from './todaySettingsStorage';
import type { Transport, WeatherLocation, WeatherPreferences } from './todaySettingsStorage';

interface TodaySettingsProps {
  onLocationCleared: (preferences: WeatherPreferences | null) => void;
  onSaved: (preferences: WeatherPreferences) => void;
}

interface SearchResult {
  admin1?: string;
  country: string;
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  timezone: string;
}

type Feedback = {
  kind: 'error' | 'success';
  message: string;
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

const roundCoordinate = (value: number): number => Math.round(value * 10000) / 10000;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isSearchResult = (value: unknown): value is SearchResult => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'number' && Number.isFinite(value.id) &&
    typeof value.name === 'string' && value.name.trim().length > 0 &&
    (value.admin1 === undefined || typeof value.admin1 === 'string') &&
    typeof value.country === 'string' && value.country.trim().length > 0 &&
    typeof value.latitude === 'number' && Number.isFinite(value.latitude) && value.latitude >= -90 && value.latitude <= 90 &&
    typeof value.longitude === 'number' && Number.isFinite(value.longitude) && value.longitude >= -180 && value.longitude <= 180 &&
    typeof value.timezone === 'string' && value.timezone.trim().length > 0
  );
};

const formatLocationLabel = (result: SearchResult): string => {
  const parts = [result.name, result.admin1, result.country]
    .map(part => part?.trim())
    .filter((part): part is string => Boolean(part));

  return [...new Set(parts)].join(', ');
};

const fetchCityResults = async (query: string, signal: AbortSignal): Promise<SearchResult[]> => {
  const url = new URL(GEOCODING_ENDPOINT);
  url.searchParams.set('name', query);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'es');
  url.searchParams.set('format', 'json');

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('No se pudo consultar el buscador de ciudades.');
  }

  const data: unknown = await response.json();
  if (!isRecord(data)) {
    throw new Error('El buscador devolvió una respuesta no válida.');
  }
  if (data.results === undefined) {
    return [];
  }
  if (!Array.isArray(data.results)) {
    throw new Error('El buscador devolvió una respuesta no válida.');
  }

  return data.results.filter(isSearchResult).slice(0, 5);
};

const locationErrorMessage = (error: GeolocationPositionError): string => {
  if (error.code === error.PERMISSION_DENIED) {
    return 'El permiso de ubicación fue denegado. Podés elegir una ciudad manualmente.';
  }
  if (error.code === error.TIMEOUT) {
    return 'La ubicación tardó demasiado. Podés intentarlo de nuevo o elegir una ciudad.';
  }
  return 'No se pudo obtener tu ubicación. Podés elegir una ciudad manualmente.';
};

export const TodaySettings: FC<TodaySettingsProps> = ({ onLocationCleared, onSaved }) => {
  const [savedPreferences] = useState<WeatherPreferences | null>(() => readWeatherPreferences());
  const [location, setLocation] = useState<WeatherLocation | null>(savedPreferences?.location ?? null);
  const [cityQuery, setCityQuery] = useState(
    savedPreferences?.location?.source === 'search' ? savedPreferences.location.label : '',
  );
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [departureTime, setDepartureTime] = useState(savedPreferences?.departureTime ?? '');
  const [returnTime, setReturnTime] = useState(savedPreferences?.returnTime ?? '');
  const [transport, setTransport] = useState<Transport | ''>(savedPreferences?.transport ?? '');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const requestId = useRef(0);
  const locationRequestId = useRef(0);
  const searchController = useRef<AbortController | null>(null);

  useEffect(() => () => {
    requestId.current += 1;
    locationRequestId.current += 1;
    searchController.current?.abort();
  }, []);

  const handleSearch = async () => {
    const query = cityQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError('Escribí al menos dos caracteres para buscar una ciudad.');
      return;
    }

    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const results = await fetchCityResults(query, controller.signal);
      if (requestId.current !== currentRequestId) {
        return;
      }
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('No encontramos esa ciudad. Probá con otro nombre.');
      }
    } catch (error) {
      if (controller.signal.aborted || requestId.current !== currentRequestId) {
        return;
      }
      setSearchError(error instanceof Error ? error.message : 'No se pudo buscar la ciudad.');
    } finally {
      if (requestId.current === currentRequestId) {
        setIsSearching(false);
      }
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    locationRequestId.current += 1;
    setIsLocating(false);
    setLocation({
      source: 'search',
      label: formatLocationLabel(result),
      latitude: roundCoordinate(result.latitude),
      longitude: roundCoordinate(result.longitude),
      timezone: result.timezone,
    });
    setCityQuery(formatLocationLabel(result));
    setSearchResults([]);
    setSearchError('');
    setLocationMessage('Ciudad seleccionada. Guardá la configuración para conservarla.');
  };

  const handleUseLocation = () => {
    if (!window.isSecureContext) {
      setLocationMessage('La ubicación del navegador requiere HTTPS. En una red local HTTP no está disponible.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage('Este navegador no ofrece ubicación. Podés elegir una ciudad manualmente.');
      return;
    }

    setIsLocating(true);
    const currentLocationRequestId = locationRequestId.current + 1;
    locationRequestId.current = currentLocationRequestId;
    setLocationMessage('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(
      position => {
        if (locationRequestId.current !== currentLocationRequestId) {
          return;
        }
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        setLocation({
          source: 'gps',
          label: 'Mi ubicación',
          latitude: roundCoordinate(position.coords.latitude),
          longitude: roundCoordinate(position.coords.longitude),
          timezone,
        });
        setIsLocating(false);
        setLocationMessage('Ubicación lista. Guardá la configuración para conservarla.');
      },
      error => {
        if (locationRequestId.current !== currentLocationRequestId) {
          return;
        }
        setIsLocating(false);
        setLocationMessage(locationErrorMessage(error));
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  };

  const handleClearLocation = () => {
    const result = clearStoredWeatherLocation();
    if (!result.ok) {
      setFeedback({ kind: 'error', message: 'No se pudo borrar la ubicación guardada en este dispositivo.' });
      return;
    }

    locationRequestId.current += 1;
    setIsLocating(false);
    setLocation(null);
    setCityQuery('');
    setSearchResults([]);
    setSearchError('');
    setLocationMessage('Ubicación borrada.');
    setFeedback(null);
    onLocationCleared(result.preferences);
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!location) {
      setFeedback({ kind: 'error', message: 'Elegí una ubicación con GPS o seleccioná una ciudad de los resultados.' });
      return;
    }
    if (!TIME_PATTERN.test(departureTime) || !TIME_PATTERN.test(returnTime)) {
      setFeedback({ kind: 'error', message: 'Completá la hora de salida y la hora de vuelta.' });
      return;
    }
    if (!transport) {
      setFeedback({ kind: 'error', message: 'Elegí cómo vas al gimnasio.' });
      return;
    }

    const preferences: WeatherPreferences = {
      version: 1,
      location,
      departureTime,
      returnTime,
      transport,
    };
    if (!saveWeatherPreferences(preferences)) {
      setFeedback({ kind: 'error', message: 'No se pudo guardar en este dispositivo. Revisá el almacenamiento del navegador.' });
      return;
    }

    onSaved(preferences);
    setFeedback({ kind: 'success', message: 'Configuración guardada en este dispositivo.' });
  };

  return (
    <section aria-labelledby="settings-heading" className="today-settings">
      <div className="today-settings-intro">
        <h2 id="settings-heading">Salida al gimnasio</h2>
        <p>Guardá una ubicación y tu horario diario para preparar la salida al gimnasio.</p>
        <p>Estos datos se guardan solo en este dispositivo. La ubicación se envía a Open-Meteo para consultar el pronóstico en Hoy.</p>
      </div>

      <form className="today-settings-form" onSubmit={handleSave}>
        <fieldset className="today-settings-fieldset" aria-labelledby="settings-location-heading">
          <h3 className="today-card-label today-settings-card-heading" id="settings-location-heading">
            <svg aria-hidden="true" className="today-icon" fill="none" width="24" height="24" viewBox="0 0 24 24">
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span>Ubicación</span>
          </h3>
          <p className="today-settings-helper">Usá el GPS una vez o buscá una ciudad. La búsqueda necesita que elijas un resultado.</p>

          <button className="today-settings-button today-settings-location-button" disabled={isLocating} onClick={handleUseLocation} type="button">
            <span>{isLocating ? 'Buscando ubicación…' : 'Usar mi ubicación'}</span>
          </button>

          <div className="today-settings-divider" role="presentation"><span>o buscar ciudad</span></div>

          <div className="today-settings-search-row">
            <label className="today-settings-label" htmlFor="today-city-search">Ciudad o localidad</label>
            <div className="today-settings-search-controls">
              <input
                autoComplete="address-level2"
                className="today-settings-input"
                id="today-city-search"
                onChange={event => setCityQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSearch();
                  }
                }}
                placeholder="Ej. Madrid"
                type="search"
                value={cityQuery}
              />
              <button className="today-settings-button today-settings-search-button" disabled={isSearching} onClick={() => void handleSearch()} type="button">
                {isSearching ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
          </div>

          {searchError && <p className="today-settings-error" role="alert">{searchError}</p>}

          {searchResults.length > 0 && (
            <ul aria-label="Resultados de ciudades" className="today-settings-results">
              {searchResults.map(result => (
                <li key={`${result.id}-${result.latitude}-${result.longitude}`}>
                  <button className="today-settings-result" onClick={() => handleSelectResult(result)} type="button">
                    <strong>{result.name}</strong>
                    <span>{formatLocationLabel(result)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="today-settings-selected-location" aria-live="polite">
            <span className="today-settings-selected-label">Ubicación elegida</span>
            <strong>{location?.label ?? 'Todavía no elegiste una ubicación'}</strong>
            {location && (
              <button className="today-settings-clear-button" onClick={handleClearLocation} type="button">Borrar ubicación</button>
            )}
          </div>
          {locationMessage && <p className="today-settings-helper" role="status">{locationMessage}</p>}
        </fieldset>

        <fieldset className="today-settings-fieldset" aria-labelledby="settings-schedule-heading">
          <h3 className="today-card-label today-settings-card-heading" id="settings-schedule-heading">
            <svg aria-hidden="true" className="today-icon" fill="none" width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>Horario diario</span>
          </h3>
          <p className="today-settings-helper">Se aplica todos los días y podés cambiarlo cuando quieras.</p>
          <div className="today-settings-time-grid">
            <label className="today-settings-label" htmlFor="today-departure-time">
              Hora de salida
              <input
                className="today-settings-input"
                id="today-departure-time"
                onChange={event => setDepartureTime(event.target.value)}
                type="time"
                value={departureTime}
              />
            </label>
            <label className="today-settings-label" htmlFor="today-return-time">
              Hora de vuelta
              <input
                className="today-settings-input"
                id="today-return-time"
                onChange={event => setReturnTime(event.target.value)}
                type="time"
                value={returnTime}
              />
            </label>
          </div>
          <label className="today-settings-label" htmlFor="today-transport">Transporte</label>
          <select
            className="today-settings-select"
            id="today-transport"
            onChange={event => setTransport(event.target.value as Transport | '')}
            value={transport}
          >
            <option value="">Elegí una opción</option>
            <option value="walking">Caminar</option>
            <option value="cycling">Bici</option>
            <option value="driving">Coche</option>
            <option value="public-transit">Transporte público</option>
          </select>
        </fieldset>

        <button className="today-settings-button today-settings-save-button" type="submit">Guardar configuración</button>
        {feedback && (
          <p aria-live="polite" className={`today-settings-feedback is-${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
            {feedback.message}
          </p>
        )}
      </form>

      <p className="today-settings-attribution">Búsqueda de ciudades: Open-Meteo / GeoNames.</p>
    </section>
  );
};
