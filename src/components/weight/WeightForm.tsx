import { useEffect, useRef, useState } from 'react';
import { requestWeight } from './weightService';
import { validWeight, weightToday } from './weightRecord';

export function WeightForm({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => void }) {
  const [date, setDate] = useState(weightToday);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(false);
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoaded(false); setError(''); setValue(''); setExisting(false);
    requestWeight(date).then(record => {
      if (!active) return;
      setValue(record ? String(record.kg) : ''); setExisting(Boolean(record)); setLoaded(true);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'No se pudo cargar.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, retry]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !loaded || loading) return;
    const kg = Number(value.trim().replace(',', '.'));
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim()) || !validWeight(kg)) { setError('Ingresá un peso entre 1 y 500 kg, con hasta dos decimales.'); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      await requestWeight(date, kg);
      onSaved(`Peso guardado: ${kg.toLocaleString('es-ES')} kg.`); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar. Tu peso sigue aquí para reintentar.'); }
    finally { busy.current = false; setSaving(false); }
  }
  return <section className="today-card today-weight" id="daily-weight-form" aria-labelledby="weight-heading">
    <h2 id="weight-heading">Registrar peso</h2>
    <form onSubmit={save}>
      <label>Fecha<input className="today-settings-input" type="date" min="1900-01-01" max={weightToday()} value={date} required disabled={saving} onChange={e => { if (e.target.value) { setLoaded(false); setDate(e.target.value); } }} /></label>
      <label>Peso (kg)<input className="today-settings-input" type="text" inputMode="decimal" value={value} required disabled={loading || saving || !loaded} placeholder="Ej.: 82,5" onChange={e => setValue(e.target.value)} /></label>
      {loading && <p role="status">Consultando peso…</p>}
      {existing && <p>Ya hay un peso para esta fecha. Guardar lo actualizará.</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !loaded && <button type="button" className="today-secondary-button" onClick={() => setRetry(retry + 1)}>Reintentar carga</button>}
      <button type="submit" className="today-primary-button" disabled={loading || saving || !loaded}>{saving ? 'Guardando…' : 'Guardar peso'}</button>
      <button type="button" className="today-secondary-button" disabled={saving} onClick={onClose}>Cancelar</button>
    </form>
  </section>;
}
