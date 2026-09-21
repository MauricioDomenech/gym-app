import { useEffect, useState } from 'react';
import type { WeatherPreferences } from './todaySettingsStorage';
import { parseForecast, weatherUrl } from './weatherForecast';
import type { TripForecast } from './weatherForecast';

export function TodayWeather({ preferences }: { preferences: WeatherPreferences }) {
  const [forecast, setForecast] = useState<TripForecast | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let controller: AbortController | undefined;
    let disposed = false;
    let refreshedAt = 0;
    const refresh = async () => {
      if (disposed || document.visibilityState === 'hidden' || Date.now() - refreshedAt < 60_000) return;
      refreshedAt = Date.now();
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 15_000);
      setLoading(true);
      setError(false);
      // Do not present an old trip as today's forecast while refreshing or offline.
      setForecast(null);
      try {
        const response = await fetch(weatherUrl(preferences), { signal: request.signal });
        if (!response.ok) throw new Error('Pronóstico no disponible');
        const result = parseForecast(await response.json(), preferences);
        if (!disposed && request === controller) setForecast(result);
      } catch {
        if (!disposed && request === controller) setError(true);
      } finally {
        window.clearTimeout(timeout);
        if (!disposed && request === controller) setLoading(false);
      }
    };
    void refresh();
    const onVisible = () => { void refresh(); };
    const interval = window.setInterval(onVisible, 15 * 60_000);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [preferences, attempt]);

  const measurement = (value: number | null, unit: string) => value === null ? '—' : `${Number(value.toFixed(1))}${unit}`;

  return (
    <section aria-labelledby="weather-heading" className="today-card today-weather-card">
      <div className="today-card-heading">
        <div className="today-card-label"><span id="weather-heading">METEOROLOGÍA</span></div>
        <span className="today-status-pill">Pronóstico</span>
      </div>
      <p className="today-weather-title today-forecast-title">Antes de salir</p>
      <p className="today-weather-detail">{preferences.location?.label}</p>
      {loading && <p role="status" className="today-weather-detail">Consultando el pronóstico…</p>}
      {error && <div role="status">
        <p className="today-weather-detail">No pude obtener el pronóstico. Comprobá tu conexión y volvé a intentarlo.</p>
        <button className="today-secondary-button today-weather-config-button" onClick={() => setAttempt(value => value + 1)} type="button">Reintentar</button>
      </div>}
      {forecast && <>
        <div className="today-forecast-slots">
          {forecast.slots.map(slot => <div className="today-forecast-slot" key={slot.label}>
            <h3>{slot.label} · {slot.date}</h3>
            <p className="today-weather-detail">{slot.time}</p>
            <p className="today-forecast-temperature">{measurement(slot.values.temperature_2m, ' °C')}</p>
            <p className="today-weather-detail">Sensación {measurement(slot.values.apparent_temperature, ' °C')}</p>
            <p className="today-weather-detail">Lluvia {measurement(slot.values.precipitation_probability, ' %')} · {measurement(slot.values.precipitation, ' mm')}</p>
            <p className="today-weather-detail">Viento {measurement(slot.values.wind_speed_10m, ' km/h')}</p>
          </div>)}
        </div>
        <p className="today-weather-note">{forecast.recommendation}</p>
        <p className="today-weather-detail today-forecast-source">
          Estimación por hora · {forecast.timezone} · Actualizado {new Intl.DateTimeFormat('es-ES', { timeZone: forecast.timezone, hour: '2-digit', minute: '2-digit' }).format(forecast.updatedAt)}
          {' · '}<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
        </p>
      </>}
    </section>
  );
}
