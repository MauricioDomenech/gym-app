import { useState } from 'react';
import type { TrainingData, TrainingRoutine } from '../training/trainingStorage';
import { dayForMadrid, today } from '../training/trainingPlan';

interface Props {
  data: TrainingData;
  routine: TrainingRoutine;
  disabled: boolean;
  onSave: (dates: string[]) => Promise<boolean>;
  onClose: () => void;
}

export function TrainingAbsences({ data, routine, disabled, onSave, onClose }: Props) {
  const dateKey = today();
  const [month, setMonth] = useState(dateKey.slice(0, 7));
  const [selected, setSelected] = useState<string[]>(() => [...(data.skippedDates ?? [])]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const marked = data.skippedDates ?? [];
  const moveMonth = (delta: number) => {
    setMonth(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + delta, 1)).toISOString().slice(0, 7));
  };
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (!await onSave(selected)) throw new Error('No se pudo guardar. Tus cambios siguen aquí; recargá si otra pestaña cambió los registros.');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return <section className="today-card today-absences" id="training-absence-calendar" aria-label="Días que no entrené">
      <h2>Días que no entrené</h2>
      <p className="today-absences-help">Elegí uno o varios días. Para deshacer una marca, tocá ese día otra vez y guardá.</p>
      <div className="today-absences-month">
        <button type="button" aria-label="Mes anterior" disabled={month <= '1900-01'} onClick={() => moveMonth(-1)}>‹</button>
        <strong aria-live="polite">{new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)}</strong>
        <button type="button" aria-label="Mes siguiente" disabled={month >= dateKey.slice(0, 7)} onClick={() => moveMonth(1)}>›</button>
      </div>
      <div className="today-absences-grid">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span className="today-absences-weekday" key={d} aria-hidden="true">{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, '0')}`;
          const recorded = data.sessions.some(s => s.performedOn === key && (s.logs.length > 0 || s.cardio !== undefined));
          const rest = dayForMadrid(routine, new Date(`${key}T12:00:00Z`))?.kind === 'rest';
          const checked = selected.includes(key);
          const blocked = key > dateKey || recorded || (rest && !marked.includes(key));
          const state = recorded ? 'Con registros' : rest && !checked ? 'Descanso' : checked ? 'No entrené' : 'Sin marcar';
          const label = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`));
          return <button type="button" key={key} data-date={key} className={recorded ? 'has-records' : rest ? 'is-rest' : ''}
            disabled={blocked || saving} aria-pressed={checked} aria-current={key === dateKey ? 'date' : undefined} aria-label={`${label}: ${state}`}
            title={state} onClick={() => { setSelected(checked ? selected.filter(d => d !== key) : [...selected, key]); setError(''); }}>
            {i + 1}{recorded && <span aria-hidden="true">•</span>}
          </button>;
        })}
      </div>
      <p className="today-absences-help">Los días de descanso y los días con registros (•) no se pueden marcar.</p>
      {error && <p role="alert">{error}</p>}
      <div className="today-absences-actions">
        <button type="button" className="today-primary-button" disabled={disabled || saving} onClick={save}>Guardar días</button>
        <button type="button" className="today-absences-toggle" disabled={saving} onClick={onClose}>Cancelar</button>
      </div>
  </section>;
}
