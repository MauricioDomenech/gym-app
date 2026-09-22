import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import catalog from './exerciseCatalog.json';
import { readTraining, saveTraining, trainingId } from './trainingStorage';
import type { TrainingData, TrainingRoutine, TrainingRoutineDay, TrainingRoutineSession, TrainingSession } from './trainingStorage';
import './training.css';

interface Props { routine?: TrainingRoutine | null; onDirtyChange?: (dirty: boolean) => void }
const exercise = (id: string) => catalog.find(item => item.id === id);
const dateLabel = (date: string) => new Date(date.length === 10 ? `${date}T12:00:00` : date).toLocaleDateString('es-ES');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function TrainingApp({ routine = null, onDirtyChange }: Props) {
  const [initial] = useState(readTraining);
  const [data, setData] = useState(initial.data);
  const [raw, setRaw] = useState(initial.raw);
  const [error, setError] = useState(initial.error);
  const [notice, setNotice] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [sets, setSets] = useState([{ loadKg: '', reps: '' }]);
  const [rir, setRir] = useState('');
  const [status, setStatus] = useState<'completed' | 'partial'>('completed');
  const [comment, setComment] = useState('');
  const [note, setNote] = useState('');
  const [recordDirty, setRecordDirty] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [mediaState, setMediaState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const dirty = recordDirty || note.length > 0;
  const session = data.sessions.find(s => s.id === sessionId);
  const log = session?.logs.find(l => l.exerciseId === exerciseId);
  const planned = session?.plannedItems?.find(p => p.exerciseId === exerciseId);
  const selected = exerciseId ? exercise(exerciseId) : undefined;
  const notes = data.exerciseNotes.filter(n => n.exerciseId === exerciseId).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  const history = data.sessions.filter(s => s.id !== sessionId && s.logs.some(l => l.exerciseId === exerciseId));

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty]);

  function persist(next: TrainingData) {
    if (initial.error) return false;
    try {
      const nextRaw = saveTraining(next, raw);
      setRaw(nextRaw); setData(next); setError('');
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); return false; }
  }
  function leave() {
    if (dirty && !window.confirm('Tenés cambios sin guardar. ¿Descartarlos y volver?')) return;
    setExerciseId(null); setRecordDirty(false); setNote(''); setNotice('');
  }
  function openExercise(id: string) {
    const existing = session?.logs.find(l => l.exerciseId === id);
    const target = session?.plannedItems?.find(p => p.exerciseId === id);
    setExerciseId(id);
    setSets(existing ? existing.sets.map(s => ({ loadKg: String(s.loadKg), reps: String(s.reps) })) : Array.from({ length: Math.min(target?.sets ?? 1, 30) }, () => ({ loadKg: '', reps: '' })));
    setRir(existing?.rir == null ? '' : String(existing.rir)); setStatus(existing?.status ?? 'completed');
    setComment(existing?.comment ?? ''); setNote(''); setRecordDirty(false); setNotice(''); setShowMedia(false); setMediaState('loading');
  }
  function start(day: TrainingRoutineDay, plan: TrainingRoutineSession) {
    if (!routine || initial.error) return;
    const active = data.sessions.find(s => !s.finishedAt);
    if (active) { setSessionId(active.id); setNotice('Tenés una sesión sin finalizar. Podés revisar sus registros antes de continuar.'); return; }
    const ids = plan.items.map(i => i.exerciseId);
    if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !exercise(id))) {
      setError('Esta sesión necesita una revisión del plan antes de registrarla.'); return;
    }
    const next: TrainingSession = { id: trainingId(), performedOn: today(), exerciseIds: ids, logs: [], finishedAt: null, mode: 'prepared', routineId: routine.id, routineDayId: day.id, routineSessionId: plan.id, plannedItems: structuredClone(plan.items) };
    if (persist({ ...data, sessions: [...data.sessions, next] })) { setSessionId(next.id); setNotice(''); }
  }
  function saveRecord(event: FormEvent) {
    event.preventDefault();
    if (!session || !exerciseId) return;
    const parsed = sets.map(s => ({ loadKg: Number(s.loadKg.replace(',', '.')), reps: Number(s.reps) }));
    if (sets.some(s => !s.loadKg.trim() || !s.reps.trim()) || parsed.some(s => !Number.isFinite(s.loadKg) || s.loadKg < 0 || s.loadKg > 2000 || !Number.isInteger(s.reps) || s.reps <= 0 || s.reps > 1000)) {
      setError('Completá el peso y las repeticiones reales de cada serie; podés quitar las que no hiciste.'); return;
    }
    const now = new Date().toISOString();
    const updated = { exerciseId, sets: parsed, rir: rir === '' ? null : Number(rir), status, comment, updatedAt: now };
    const noteId = `record-${session.id}-${exerciseId}`;
    const previous = data.exerciseNotes.find(n => n.id === noteId);
    const updatedNotes = data.exerciseNotes.filter(n => n.id !== noteId);
    if (comment.trim()) updatedNotes.push({ id: noteId, exerciseId, author: 'Mauri', text: comment, updatedAt: now, pinned: previous?.pinned ?? false });
    if (persist({ ...data, sessions: data.sessions.map(s => s.id === session.id ? { ...s, logs: [...s.logs.filter(l => l.exerciseId !== exerciseId), updated] } : s), exerciseNotes: updatedNotes })) {
      setRecordDirty(false); setNotice('Registro guardado en este navegador.');
    }
  }
  function saveNote() {
    if (!exerciseId || !note.trim()) return;
    if (persist({ ...data, exerciseNotes: [...data.exerciseNotes, { id: trainingId(), exerciseId, author: 'Mauri', text: note.trim(), updatedAt: new Date().toISOString(), pinned: false }] })) { setNote(''); setNotice('Nota guardada.'); }
  }
  function exportRecords() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `entrenamiento-${today()}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function finish() {
    if (!session || (!session.logs.length && session.mode === 'prepared')) return;
    if (persist({ ...data, sessions: data.sessions.map(s => s.id === session.id ? { ...s, finishedAt: new Date().toISOString() } : s) })) setNotice('Sesión finalizada. Tus registros y notas se conservan.');
  }
  const prescription = (item: NonNullable<typeof planned>) => <>
    <p><strong>{item.sets} series · {item.reps} repeticiones</strong>{item.rir !== null ? ` · RIR ${item.rir}` : ''}{item.rest !== null ? ` · Descanso ${typeof item.rest === 'number' ? `${item.rest} s` : item.rest}` : ''}</p>
    {item.loadGuidance && <p><strong>Carga orientativa:</strong> {item.loadGuidance}</p>}
    {item.instructions && <p>{item.instructions}</p>}
  </>;

  return <div className="training-app" data-testid="training-app">
    <p className="training-local">Tus registros se guardan sólo en este navegador. Todavía no se sincronizan.</p>
    {error && <p className="training-error" role="alert">{error}</p>}
    {notice && <p className="training-notice" role="status">{notice}</p>}
    {session && exerciseId ? <section className="today-card" data-testid="training-record-editor">
      <button type="button" className="training-back" onClick={leave}>← Volver a la sesión</button>
      <p className="training-eyebrow">{dateLabel(session.performedOn)} · Tu registro</p>
      <h2>{selected?.name ?? exerciseId}</h2>
      {planned && <section aria-label="Planificado"><h3>Lo que te toca</h3>{prescription(planned)}</section>}
      {selected?.image && <>
        <button type="button" data-testid="training-media-button" aria-expanded={showMedia} onClick={() => { setShowMedia(!showMedia); setMediaState('loading'); }}>{showMedia ? 'Ocultar animación' : 'Ver animación'}</button>
        {showMedia && <div className="training-media">{mediaState === 'loading' && <p role="status">Cargando referencia…</p>}{mediaState === 'error' ? <p>No se pudo cargar la animación. Podés seguir registrando el ejercicio.</p> : <img src={selected.image} alt={`Referencia de ${selected.name}`} onLoad={() => setMediaState('loaded')} onError={() => setMediaState('error')} />}</div>}
      </>}
      <section className="training-notes" data-testid="training-notes"><h3>Notas de este ejercicio</h3>
        <p className="training-muted">Se conservan aunque el ejercicio deje de estar en tu rutina.</p>
        {notes.length === 0 && <p>Todavía no hay notas.</p>}
        {notes.map(n => <article className="training-note" key={n.id} data-note-id={n.id}><div className="training-row"><strong>{n.author}{n.pinned ? ' · Fijada' : ''}</strong><time dateTime={n.updatedAt}>{dateLabel(n.updatedAt)}</time></div><p>{n.text}</p><button type="button" disabled={!!initial.error} aria-label={n.pinned ? 'Desfijar nota' : 'Fijar nota'} onClick={() => persist({ ...data, exerciseNotes: data.exerciseNotes.map(item => item.id === n.id ? { ...item, pinned: !item.pinned } : item) })}>{n.pinned ? 'Desfijar' : 'Fijar'}</button></article>)}
        <label>Nueva nota para este ejercicio<textarea aria-label="Nueva nota para este ejercicio" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></label>
        <button type="button" disabled={!!initial.error || !note.trim()} onClick={saveNote}>Guardar nota</button>
      </section>
      {history.length > 0 && <details className="training-history"><summary>Últimos registros ({history.length})</summary>{[...history].reverse().map(s => { const l = s.logs.find(item => item.exerciseId === exerciseId)!; return <article key={s.id}><time>{dateLabel(s.performedOn)}</time><p>{l.sets.map(t => `${t.loadKg} kg × ${t.reps}`).join(' · ')}{l.rir !== null ? ` · RIR ${l.rir}` : ''}</p>{l.comment && <p>{l.comment}</p>}</article>; })}</details>}
      <form onSubmit={saveRecord}><fieldset className="training-fieldset" disabled={!!initial.error}><h3>Lo que hiciste</h3><p className="training-muted">Cargá los datos reales. Las indicaciones del plan no completan tu registro.</p>
        <div className="training-set-head"><span>Serie</span><span>Peso · kg</span><span>Reps</span><span /></div>
        {sets.map((s, index) => <div className="training-set" key={index}><span>{index + 1}</span><input aria-label={`Peso serie ${index + 1}`} inputMode="decimal" required value={s.loadKg} onChange={e => { setSets(sets.map((item, i) => i === index ? { ...item, loadKg: e.target.value } : item)); setRecordDirty(true); }} /><input aria-label={`Repeticiones serie ${index + 1}`} inputMode="numeric" required value={s.reps} onChange={e => { setSets(sets.map((item, i) => i === index ? { ...item, reps: e.target.value } : item)); setRecordDirty(true); }} /><button type="button" aria-label={`Quitar serie ${index + 1}`} disabled={sets.length === 1} onClick={() => { setSets(sets.filter((_, i) => i !== index)); setRecordDirty(true); }}>×</button></div>)}
        <button type="button" disabled={sets.length >= 30} onClick={() => { setSets([...sets, { loadKg: '', reps: '' }]); setRecordDirty(true); }}>Añadir serie realizada</button>
        <label>RIR · repeticiones que te quedaban (opcional)<input type="number" min="0" max="10" step="1" value={rir} onChange={e => { setRir(e.target.value); setRecordDirty(true); }} /></label>
        <label>Estado del ejercicio<select value={status} onChange={e => { setStatus(e.target.value as typeof status); setRecordDirty(true); }}><option value="completed">Completado</option><option value="partial">Parcial</option></select></label>
        <label>Comentario de este entrenamiento<textarea aria-label="Comentario de este entrenamiento" maxLength={2000} value={comment} onChange={e => { setComment(e.target.value); setRecordDirty(true); }} /></label>
        <button className="today-primary-button" type="submit">{log ? 'Actualizar registro' : 'Guardar ejercicio'}</button>
      </fieldset></form>
    </section> : session ? <section className="today-card" data-testid="training-session">
      <button type="button" className="training-back" onClick={() => { setSessionId(null); setNotice(''); }}>Ver todas mis sesiones</button>
      <p className="training-eyebrow">{session.mode === 'prepared' ? 'Sesión preparada' : 'Sesión anterior'} · {dateLabel(session.performedOn)}</p>
      <h2>{session.finishedAt ? (session.logs.length ? 'Sesión finalizada' : 'Sesión archivada sin registros') : 'Tu registro de entrenamiento'}</h2>
      <p>{session.logs.length} de {session.exerciseIds.length} ejercicios registrados</p>
      <ul className="training-exercise-list">{session.exerciseIds.map(id => { const recorded = session.logs.find(l => l.exerciseId === id); const target = session.plannedItems?.find(i => i.exerciseId === id); return <li key={id}><h3>{exercise(id)?.name ?? id}</h3>{target && prescription(target)}{recorded && <p>{recorded.status === 'partial' ? 'Parcial' : 'Registrado'} · {recorded.sets.map(s => `${s.loadKg} kg × ${s.reps}`).join(' · ')}</p>}<button type="button" onClick={() => openExercise(id)}>{recorded ? 'Editar registro' : 'Registrar ejercicio'}</button></li>; })}</ul>
      {!session.finishedAt && <button type="button" className="today-primary-button" disabled={!!initial.error || (!session.logs.length && session.mode === 'prepared')} onClick={finish}>{session.logs.length ? 'Finalizar sesión' : 'Archivar sesión anterior'}</button>}
    </section> : <>
      <section className="today-card" data-testid="training-plan">
        <p className="training-eyebrow">Tu rutina</p>
        {routine ? <><h2>{routine.name}</h2>{routine.days.map(day => <section key={day.id}><h3>{day.label}</h3>{day.sessions.map(plan => <article key={plan.id}><p>{plan.title} · {plan.items.length} ejercicios</p><button type="button" disabled={!!initial.error} onClick={() => start(day, plan)}>Abrir {plan.title}</button></article>)}</section>)}</> : <><h2>Todavía no hay una rutina asignada</h2><p>La definiremos juntos con tus datos actuales. Después la prepararé con los agentes especializados.</p><p>Acá verás lo que te toca hacer y podrás registrar pesos, repeticiones y comentarios. No tenés que armar ni editar la rutina.</p></>}
      </section>
      {!initial.error && (data.sessions.length > 0 || data.exerciseNotes.length > 0) && <button type="button" onClick={exportRecords}>Descargar copia de mis registros</button>}
      {data.sessions.length > 0 && <section className="today-card"><h2>Tus sesiones anteriores</h2><p>Tu historial y tus notas siguen disponibles.</p><ul className="training-sessions">{[...data.sessions].reverse().map(s => <li key={s.id}><button type="button" onClick={() => { setSessionId(s.id); setNotice(''); }}>{dateLabel(s.performedOn)}<span>{s.logs.length} ejercicios registrados · {s.finishedAt ? (s.logs.length ? 'Finalizada' : 'Archivada sin registros') : 'Sin finalizar'}</span></button></li>)}</ul></section>}
    </>}
  </div>;
}
