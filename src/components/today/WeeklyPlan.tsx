import type { TrainingRoutine } from '../training/trainingStorage';
import { weekdayForMadrid } from '../training/trainingPlan';
import catalog from '../training/exerciseCatalog.json';
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export function WeeklyPlan({ routine, loading = false }: { routine: TrainingRoutine | null; loading?: boolean }) {
  if (!routine) return <section className="today-card"><p>{loading ? 'Consultando tu plan…' : 'Tu plan no está disponible. Volvé a intentarlo más tarde.'}</p></section>;
  return <section className="coach-plan"><p className="coach-section-caption">Tu semana · {routine.name}</p>{days.map((weekday, index) => {
    const day = routine.days.find(d => d.weekday === weekday);
    return <details className="coach-plan-day" key={weekday} open={weekday === weekdayForMadrid()}>
      <summary><span><strong>{labels[index]}</strong>{weekday === weekdayForMadrid() && <small>Hoy</small>}</span><span>{day?.kind === 'rest' ? 'Descanso' : day?.label ?? 'Sin asignar'}<b aria-hidden="true">⌄</b></span></summary>
      {day?.kind === 'rest' ? <p className="coach-section-caption">Día de descanso.</p> : day?.sessions.map(session => <div key={session.id} className="coach-plan-session"><h3>{session.title}</h3>{session.items.map(item => <div className="coach-plan-exercise" key={item.id}><span>{catalog.find(e => e.id === item.exerciseId)?.name ?? item.exerciseId}</span><strong>{item.sets} × {item.reps}</strong></div>)}{session.cardio && <p className="coach-section-caption">Cardio · {session.cardio.warmupMinutes} + <strong>{session.cardio.moderateMinutes} min moderados</strong> + {session.cardio.cooldownMinutes}</p>}</div>)}
    </details>;
  })}<p className="coach-section-caption">Vista informativa de tu rutina asignada.</p></section>;
}
export function WeekStrip({ onPlan }: { onPlan: () => void }) {
  const current = days.indexOf(weekdayForMadrid());
  const madrid = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date()) + 'T12:00:00Z');
  const dates = days.map((_, i) => { const date = new Date(madrid); date.setUTCDate(date.getUTCDate() - current + i); return date.getUTCDate(); });
  return <section className="coach-week" aria-label="Esta semana"><p className="coach-section-caption">Esta semana</p><div>{labels.map((day, i) => <button type="button" key={day} onClick={onPlan} aria-label={`Ver plan del ${day}`} aria-current={i === current ? 'date' : undefined}><span>{day.slice(0, 2)}</span><strong>{dates[i]}</strong></button>)}</div></section>;
}
