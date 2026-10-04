import { RestTimer } from './RestTimer';
import type { RestControl } from './RestTimer';
import { PlateCalculator } from './PlateCalculator';
import { blankSet, comparableHistory, comparableRecords, draftChanged, draftFromSet, exerciseDraft, parseSetDraft, progressionSuggestion, restSeconds, sessionSummary } from './trainingInsights';
import type { SetDraft } from './trainingInsights';
import { LoadStepper } from './LoadStepper';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { FormEvent, Ref } from 'react';
import catalog from './exerciseCatalog.json';
import { formatTrainingSet, isLogFinished, isSessionRecorded, trainingId, withSkippedDates } from './trainingStorage';
import type {
  TrainingCardioPlan,
  TrainingData,
  TrainingRoutine,
  TrainingSession,
  TrainingLog,
} from './trainingStorage';
import {
  dayForMadrid,
  statusForDay,
  trainingForToday,
  today as todayForMadrid,
} from './trainingPlan';
import type { TrainingPlanLoadState } from './trainingPlan';
import { createTrainingRemoteClient, makeTrainingWriteRequest, TrainingSyncError } from './trainingSync';
import { acceptTrainingResponse, subscribeTrainingResponse, trainingSnapshot } from './trainingConnection';
import './training.css';

interface Props {
  navigationRef?: Ref<TrainingNavigation>;
  active?: boolean;
  routine?: TrainingRoutine | null;
  planState?: TrainingPlanLoadState;
  onDirtyChange?: (dirty: boolean) => void;
  onDataChange?: (data: TrainingData) => void;
}

export interface TrainingNavigation { openToday(): void; setSkippedDates(dates: string[]): Promise<boolean> }

const exercise = (id: string) => catalog.find(item => item.id === id);
const dateLabel = (date: string) => new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid' }).format(new Date(date.length === 10 ? `${date}T12:00:00Z` : date));
const cardioMinutes = (value: string) => Number(value.trim());

const cardioSummary = (plan: TrainingCardioPlan) => (
  `${plan.warmupMinutes} min de entrada · ${plan.moderateMinutes} min moderados · ${plan.cooldownMinutes} min de salida`
);

const trainingHeading = (label: string, cardio = false) => (
  <h3 className="training-exercise-title">
    <svg className="training-heading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={cardio ? 'M2 12h5l3-8 4 16 3-8h5' : 'M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10'} />
    </svg>
    <span>{label}</span>
  </h3>
);

export function TrainingApp({ navigationRef, active = true, routine = null, planState = routine ? 'ready' : 'unavailable', onDirtyChange, onDataChange }: Props) {
  const [data, setData] = useState(() => trainingSnapshot().data);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [plannedItemId, setPlannedItemId] = useState<string | null>(null);
  const [cardioEditing, setCardioEditing] = useState(false);
  const [loadType, setLoadType] = useState<'external' | 'bodyweight'>('external');
  const [sets, setSets] = useState<SetDraft[]>([blankSet()]);
  const [prefillDate, setPrefillDate] = useState('');
  const [excludeFromProgression, setExcludeFromProgression] = useState(false);
  const [deferred, setDeferred] = useState<string[]>([]);
  const restControl = useRef<RestControl>(null);
  const [rir, setRir] = useState('');
  const [status, setStatus] = useState<'completed' | 'partial'>('completed');
  const [comment, setComment] = useState('');
  const [cardioModerate, setCardioModerate] = useState('');
  const [cardioWarmup, setCardioWarmup] = useState('');
  const [cardioCooldown, setCardioCooldown] = useState('');
  const [cardioComment, setCardioComment] = useState('');
  const [note, setNote] = useState('');
  const [recordDirty, setRecordDirty] = useState(false);
  const [cardioDirty, setCardioDirty] = useState(false);
  const [showMedia, setShowMedia] = useState(true);
  const [guidedStart, setGuidedStart] = useState(false);
  const [mediaState, setMediaState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const dirty = recordDirty || cardioDirty || note.length > 0;
  const dataRef = useRef(data);
  const revisionRef = useRef(trainingSnapshot().revision);
  const savingRef = useRef(false);
  const remoteClientRef = useRef(createTrainingRemoteClient());
  const session = data.sessions.find(s => s.id === sessionId);
  const slot = session?.plannedItems?.find(p => p.id === plannedItemId);
  const log = session?.logs.find(l => slot ? l.plannedItemId === slot.id || (!l.plannedItemId && l.exerciseId === slot.exerciseId) : l.exerciseId === exerciseId);
  const planned = slot ? { ...slot, ...slot.alternatives?.find(a => a.exerciseId === exerciseId) } : undefined;
  const selected = exerciseId ? exercise(exerciseId) : undefined;
  const notes = data.exerciseNotes.filter(n => n.exerciseId === exerciseId).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  const history = data.sessions.filter(s => s.id !== sessionId && s.logs.some(l => l.exerciseId === exerciseId));
  const orderedIds = session ? [...session.exerciseIds.filter(id => !deferred.includes(id)), ...deferred.filter(id => session.exerciseIds.includes(id))] : [];
  const comparable = session && exerciseId ? comparableHistory(data, session, exerciseId, slot) : [];
  const suggestion = progressionSuggestion(comparable.filter(e => (e.log.loadType ?? 'external') === loadType), planned);
  const records = log ? comparableRecords(log, comparable) : [];
  const currentDay = dayForMadrid(routine);
  const todayStatus = statusForDay(routine, data);
  const canRecordSession = session?.performedOn === todayForMadrid() && session?.routineId === routine?.id &&
    session?.routineDayId === currentDay?.id && session?.routineSessionId === currentDay?.sessions[0]?.id;

  useImperativeHandle(navigationRef, () => ({ openToday, setSkippedDates: async dates => persist(withSkippedDates(dataRef.current, dates, todayForMadrid())) }));

  useEffect(() => { onDirtyChange?.(dirty || saving); }, [dirty, saving, onDirtyChange]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => subscribeTrainingResponse(() => {
    const latest = trainingSnapshot();
    revisionRef.current = latest.revision; dataRef.current = latest.data; setData(latest.data);
  }), []);
  useEffect(() => { onDataChange?.(data); }, [data, onDataChange]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (dirty || saving) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty, saving]);
  async function persist(next: TrainingData) {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setError('');
    setNotice('Guardando…');
    try {
      const envelope = await remoteClientRef.current.write(makeTrainingWriteRequest(next, revisionRef.current));
      acceptTrainingResponse(envelope);
      revisionRef.current = envelope.revision;
      dataRef.current = envelope.data;
      setData(envelope.data);
      setNotice('Guardado.');
      return true;
    } catch (cause) {
      setNotice('');
      if (cause instanceof TrainingSyncError && cause.code === 'conflict') {
        // A concurrent change is resolved by reading the database, never by
        // uploading a browser snapshot or asking which copy should win.
        try {
          const current = await remoteClientRef.current.read();
          acceptTrainingResponse(current);
          const latest = trainingSnapshot();
          revisionRef.current = latest.revision;
          dataRef.current = latest.data;
          setData(latest.data);
          setSessionId(null);
          setExerciseId(null);
          setCardioEditing(false);
          setRecordDirty(false);
          setCardioDirty(false);
          setNote('');
          setError('Los registros cambiaron en tu cuenta. Cargué el estado actual; abrí el ejercicio para revisarlo antes de guardar.');
        } catch {
          setError('No pude consultar el estado actual. Recargá la página antes de volver a guardar.');
        }
      } else if (cause instanceof TrainingSyncError && cause.code === 'update-required') {
        setError(cause.message);
      } else {
        setError('No pude confirmar el guardado en tu cuenta. Tus cambios siguen en pantalla, todavía sin confirmar. Volvé a intentarlo con conexión.');
      }
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function leave() {
    if (dirty && !window.confirm('Tenés cambios sin guardar. ¿Descartarlos y volver?')) return;
    setExerciseId(null);
    setCardioEditing(false);
    setRecordDirty(false);
    setCardioDirty(false);
    setNote('');
    setNotice('');
  }

  function openExercise(id: string, variant?: string) {
    const target = session?.plannedItems?.find(p => p.exerciseId === id || p.id === id);
    const existing = session?.logs.find(l => target ? l.plannedItemId === target.id || (!l.plannedItemId && l.exerciseId === target.exerciseId) : l.exerciseId === id);
    if (!canRecordSession && !existing) return;
    if (dirty && !window.confirm('Tenés cambios sin guardar. ¿Descartarlos y cambiar de ejercicio?')) return;
    const chosen = variant ?? existing?.exerciseId ?? target?.exerciseId ?? id;
    const matching = existing?.exerciseId === chosen ? existing : undefined;
    setPlannedItemId(target?.id ?? null);
    setExerciseId(chosen);
    setCardioEditing(false);
    const last = session ? comparableHistory(data, session, chosen, target)[0] : undefined;
    setSets(exerciseDraft(matching, last?.log, target));
    setPrefillDate(!matching || !isLogFinished(matching) ? last?.session.performedOn ?? '' : '');
    setLoadType(matching?.loadType ?? last?.log.loadType ?? 'external');
    setExcludeFromProgression(matching?.excludeFromProgression ?? false);
    setRir(matching?.rir == null ? '' : String(matching.rir));
    setStatus(matching?.status ?? 'completed');
    setComment(matching?.comment ?? '');
    setNote('');
    setRecordDirty(!!variant && variant !== existing?.exerciseId);
    setCardioDirty(false);
    setNotice('');
    setShowMedia(true);
    setMediaState('loading');
  }

  function openCardio() {
    if (dirty && !window.confirm('Tenés cambios sin guardar. ¿Descartarlos y abrir cardio?')) return;
    if (!session?.plannedCardio) return;
    if (!canRecordSession && !session.cardio) return;
    setExerciseId(null);
    setCardioEditing(true);
    setCardioModerate(session.cardio ? String(session.cardio.moderateMinutes) : '');
    setCardioWarmup(session.cardio ? String(session.cardio.warmupMinutes) : '');
    setCardioCooldown(session.cardio ? String(session.cardio.cooldownMinutes) : '');
    setCardioComment(session.cardio?.comment ?? '');
    setRecordDirty(false);
    setCardioDirty(false);
    setNotice('');
  }

  // Once the server-confirmed session is in state, enter its first unrecorded exercise.
  useEffect(() => {
    if (!guidedStart || !session) return;
    setGuidedStart(false);
    const next = orderedIds.find(id => !session.logs.some(l => isLogFinished(l) && (l.exerciseId === id || l.plannedItemId === session.plannedItems?.find(p => p.exerciseId === id)?.id)));
    if (next) openExercise(next);
    else if (session.plannedCardio && !session.cardio) openCardio();
    else if (session.exerciseIds[0]) openExercise(session.exerciseIds[0]);
    // This effect is an explicit navigation request, not a response to form changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guidedStart, sessionId]);

  async function openToday() {
    if (savingRef.current) return;
    const active = trainingForToday(routine, dataRef.current).session;
    if (active?.id === sessionId && (exerciseId || cardioEditing)) return;
    setExerciseId(null);
    setCardioEditing(false);
    setRecordDirty(false);
    setCardioDirty(false);
    setNote('');
    setNotice('');
    setDeferred([]);
    const { day, plan, session: existing, dateKey } = trainingForToday(routine, dataRef.current);
    if (!routine || !day || !plan) {
      setSessionId(null);
      return;
    }
    if (existing) {
      setSessionId(existing.id);
      setGuidedStart(true);
      return;
    }
    const ids = plan.items.map(i => i.exerciseId);
    if ((!ids.length && !plan.cardio) || new Set(ids).size !== ids.length || ids.some(id => !exercise(id))) {
      setError('Esta sesión necesita una revisión del plan antes de registrarla.');
      return;
    }
    const next: TrainingSession = {
      id: trainingId(),
      performedOn: dateKey,
      exerciseIds: ids,
      logs: [],
      finishedAt: null,
      mode: 'prepared',
      routineId: routine.id,
      routineDayId: day.id,
      routineSessionId: plan.id,
      planVersion: routine.version,
      plannedItems: structuredClone(plan.items),
      plannedCardio: plan.cardio ? structuredClone(plan.cardio) : undefined,
    };
    if (await persist({ ...data, sessions: [...data.sessions, next] })) {
      setSessionId(next.id);
      setGuidedStart(true);
      setNotice('');
    }
  }

  async function saveRecord(event?: FormEvent, selectedIndex?: number, finishPartial = false) {
    event?.preventDefault();
    if (!session || !exerciseId || (!canRecordSession && !log) || savingRef.current) return;
    try {
      const now = new Date().toISOString();
      const parsedRir = rir.trim() === '' ? null : Number(rir);
      if (parsedRir !== null && (!Number.isInteger(parsedRir) || parsedRir < 0 || parsedRir > 10)) throw Error('El RIR del ejercicio debe estar entre 0 y 10.');
      if (finishPartial && recordDirty && !window.confirm('Se conservarán sólo las series ya guardadas y el comentario actual. ¿Terminar parcial y descartar las filas sin confirmar?')) return;
      const nextDrafts = finishPartial ? sets.filter(s => s.saved).map(s => draftFromSet(s.saved!, true)) : sets.map((s, i) => {
        if (selectedIndex !== undefined && selectedIndex !== i) return s;
        const parsed = { ...parseSetDraft(s, loadType), recordedAt: s.saved?.recordedAt ?? now };
        return draftFromSet(parsed, true);
      });
      const parsed = nextDrafts.flatMap(s => s.saved ? [s.saved] : []);
      if (!parsed.length) throw Error('Guardá al menos una serie antes de terminar el ejercicio.');
      const allConfirmed = nextDrafts.every(s => s.saved && !draftChanged(s));
      const enoughWork = parsed.filter(s => s.kind !== 'warmup').length >= (planned?.sets ?? 1);
      const finished = finishPartial || selectedIndex === undefined || (allConfirmed && enoughWork);
      const updated: TrainingLog = { exerciseId, ...(plannedItemId ? { plannedItemId } : {}), loadType, sets: parsed,
        rir: parsedRir, status: finishPartial || (finished && !enoughWork) ? 'partial' : status, recording: finished ? 'finished' : 'in-progress',
        excludeFromProgression, comment, updatedAt: now };
      const noteId = `record-${session.id}-${exerciseId}`;
      const previous = data.exerciseNotes.find(n => n.id === noteId);
      const updatedNotes = data.exerciseNotes.filter(n => n.id !== noteId);
      if (comment.trim()) updatedNotes.push({ id: noteId, exerciseId, author: 'Mauri', text: comment, updatedAt: previous?.text === comment ? previous.updatedAt : now, pinned: previous?.pinned ?? false });
      const next = { ...data, skippedDates: data.skippedDates?.filter(d => d !== session.performedOn), sessions: data.sessions.map(s => s.id === session.id ? { ...s, logs: [...s.logs.filter(l => l !== log), updated] } : s), exerciseNotes: updatedNotes };
      if (await persist(next)) {
        setSets(nextDrafts);
        setStatus(updated.status);
        setRecordDirty(nextDrafts.some(s => s.edited && draftChanged(s)));
        setNotice(selectedIndex === undefined ? 'Ejercicio guardado.' : `Serie ${selectedIndex + 1} guardada${finished ? ' · ejercicio registrado' : ''}.`);
        // A replay/update never restarts a rest. Only a newly confirmed actual set does.
        if (selectedIndex !== undefined && !sets[selectedIndex].saved) {
          const seconds = restSeconds(planned?.rest ?? null);
          if (seconds) restControl.current?.start(seconds, selected?.name ?? exerciseId);
        }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Revisá los datos de las series.'); }
  }

  function postponeExercise() {
    if (!session || !exerciseId) return;
    const id = slot?.exerciseId ?? exerciseId;
    const next = orderedIds.find(other => other !== id && !session.logs.some(l => isLogFinished(l) && (l.exerciseId === other || l.plannedItemId === session.plannedItems?.find(p => p.exerciseId === other)?.id)));
    if (!next) { setNotice('No hay otro ejercicio pendiente. Podés elegir un reemplazo del plan.'); return; }
    if (dirty && !window.confirm('¿Descartar los cambios sin guardar y dejar este ejercicio para después?')) return;
    setRecordDirty(false); setCardioDirty(false); setNote('');
    setDeferred([...deferred.filter(other => other !== id), id]);
    // Open on the following render so the dirty guard uses the accepted state.
    setExerciseId(null); setGuidedStart(true);
  }

  async function saveCardio(event: FormEvent) {
    event.preventDefault();
    if (!session || !session.plannedCardio || (!canRecordSession && !session.cardio)) return;
    const moderate = cardioMinutes(cardioModerate);
    const warmup = cardioMinutes(cardioWarmup);
    const cooldown = cardioMinutes(cardioCooldown);
    if (![moderate, warmup, cooldown].every(value => Number.isInteger(value) && value >= 0 && value <= 1440)) {
      setError('Registrá minutos enteros entre 0 y 1440. El bloque moderado se guarda separado de las transiciones.');
      return;
    }
    const nextCardio = {
      plannedModerateMinutes: session.plannedCardio.moderateMinutes,
      moderateMinutes: moderate,
      warmupMinutes: warmup,
      cooldownMinutes: cooldown,
      comment: cardioComment,
      status: moderate >= session.plannedCardio.moderateMinutes ? 'completed' as const : 'partial' as const,
      updatedAt: new Date().toISOString(),
    };
    if (await persist({ ...data, skippedDates: data.skippedDates?.filter(d => d !== session.performedOn), sessions: data.sessions.map(s => s.id === session.id ? { ...s, cardio: nextCardio } : s) })) {
      setCardioDirty(false);
      setNotice('Guardado.');
    }
  }

  async function saveNote() {
    if (!exerciseId || !note.trim()) return;
    if (await persist({ ...data, exerciseNotes: [...data.exerciseNotes, { id: trainingId(), exerciseId, author: 'Mauri', text: note.trim(), updatedAt: new Date().toISOString(), pinned: false }] })) {
      setNote('');
      setNotice('Nota guardada.');
    }
  }

  const prescription = (item: NonNullable<typeof planned>) => <>
    <dl className="training-exercise-metrics">
      <div><dt>Series</dt><dd>{item.sets}</dd></div>
      <div className="training-metric-main"><dt>Repeticiones</dt><dd>{item.reps}</dd></div>
      {item.rir !== null && <div><dt>RIR</dt><dd>{item.rir}</dd></div>}
      {item.rest !== null && <div className="training-metric-rest"><dt>Descanso</dt><dd>{typeof item.rest === 'number' ? `${item.rest} s` : item.rest}</dd></div>}
    </dl>
    {(item.loadGuidance || item.instructions) && <details className="training-instructions"><summary>Indicaciones</summary>
      {item.loadGuidance && <p>{item.loadGuidance}</p>}
      {item.instructions && <p>{item.instructions}</p>}
    </details>}
  </>;

  const renderPlanUnavailable = () => (
    <section className="today-card" data-testid="training-plan-unavailable">
      <p className="training-eyebrow">Tu rutina</p>
      <h2>{planState === 'loading' ? 'Consultando tu rutina…' : planState === 'no-plan' ? 'Sin plan asignado' : 'Rutina no disponible'}</h2>
      <p>{planState === 'loading' ? 'Esperá un momento.' : planState === 'no-plan' ? 'Cuando la rutina esté preparada aparecerá acá. ' : 'No voy a mostrar un plan incompleto ni inventar una rutina. '}</p>
    </section>
  );

  return <div className="training-app" data-testid="training-app">
    {error && <p className="training-error" role="alert">{error}</p>}
    {session && exerciseId ? <section className="today-card training-editor" data-testid="training-record-editor">
      <button type="button" className="training-back" disabled={saving} onClick={leave}>← Volver a la sesión</button>
      {!canRecordSession && <p className="training-eyebrow">{dateLabel(session.performedOn)}</p>}
      <div className="coach-exercise-pagination"><button type="button" disabled={saving || orderedIds.indexOf(slot?.exerciseId ?? exerciseId) <= 0} onClick={() => openExercise(orderedIds[orderedIds.indexOf(slot?.exerciseId ?? exerciseId) - 1])}>← Anterior</button><span>Ejercicio {orderedIds.indexOf(slot?.exerciseId ?? exerciseId) + 1} / {session.exerciseIds.length}</span><button type="button" disabled={saving || (orderedIds.indexOf(slot?.exerciseId ?? exerciseId) === orderedIds.length - 1 && !session.plannedCardio)} onClick={() => { const next = orderedIds[orderedIds.indexOf(slot?.exerciseId ?? exerciseId) + 1]; if (next) openExercise(next); else openCardio(); }}>Siguiente →</button></div>
      <h2>{selected?.name ?? exerciseId}</h2>
      <div className="training-tool-actions"><button type="button" disabled={saving} onClick={postponeExercise}>Máquina ocupada · hacerlo después</button>{restSeconds(planned?.rest ?? null) !== null && <button type="button" onClick={() => restControl.current?.start(restSeconds(planned!.rest)!, selected?.name ?? exerciseId)}>Descanso · {restSeconds(planned!.rest)} s</button>}</div>
      {selected && !selected.image && <p className="training-muted">Animación pendiente para esta variante.</p>}
      {selected?.image && <>
        <button type="button" className="training-media-toggle training-full-button" data-testid="training-media-button" aria-expanded={showMedia} onClick={() => { setShowMedia(!showMedia); setMediaState('loading'); }}>{showMedia ? 'Ocultar animación' : 'Ver animación'}</button>
        {showMedia && <div className="training-media">{mediaState === 'loading' && <p role="status">Cargando referencia…</p>}{mediaState === 'error' ? <p>No se pudo cargar la animación. Podés seguir registrando el ejercicio.</p> : <img src={selected.image} alt={`Referencia de ${selected.name}`} onLoad={() => setMediaState('loaded')} onError={() => setMediaState('error')} />}</div>}
      </>}
      {!!slot?.alternatives?.length && <label className="training-variant">Ejercicio que vas a hacer
        <select aria-label="Ejercicio que vas a hacer" disabled={saving} value={exerciseId} onChange={e => openExercise(slot.id, e.target.value)}>
          <option value={slot.exerciseId}>{exercise(slot.exerciseId)?.name} · principal</option>
          {slot.alternatives.map(a => <option key={a.exerciseId} value={a.exerciseId}>{exercise(a.exerciseId)?.name} · reemplazo</option>)}
        </select>
        <span className="training-muted">Elegí uno, no se suman. Registrá la carga de esta variante.</span>
      </label>}
      {planned && <section aria-label="Planificado">{prescription(planned)}</section>}
      {history.length > 0 && <p className="coach-last-time">Última vez · {(() => { const last = [...history].sort((a, b) => b.performedOn.localeCompare(a.performedOn))[0]; const record = last.logs.find(l => l.exerciseId === exerciseId)!; return `${dateLabel(last.performedOn)}: ${record.sets.map(t => formatTrainingSet(t, record.loadType)).join(' · ')}`; })()}</p>}
      <aside className="coach-suggestion"><strong>{suggestion.title}</strong><p>{suggestion.reason}</p>{suggestion.date && <small>Referencia · {dateLabel(suggestion.date)} · misma variante y sesión</small>}</aside>
      {records.length > 0 && <p className="coach-record-badge">Mejor marca comparable: {records.map(r => `${r.set.loadKg} kg × ${r.set.reps} (antes ${r.previous.loadKg} × ${r.previous.reps})`).join(' · ')}. Trabajo registrado, no estimación de fuerza.</p>}
      <form onSubmit={saveRecord}><fieldset className="training-fieldset" disabled={saving}><h3>Tu registro</h3>
        {prefillDate && <p className="coach-prefill">Propuesta de {dateLabel(prefillDate)}. Editá lo que cambie y confirmá cada serie que hagas. No se copia el RIR.</p>}
        <details className="coach-record-options"><summary>Tipo de carga · {loadType === 'bodyweight' ? 'peso corporal' : 'externa'}</summary><label>Tipo de carga<select aria-label="Tipo de carga" value={loadType} onChange={e => { if (sets.some(s=>s.saved) && !window.confirm('Cambiar el tipo de carga reemplazará este registro al guardar. Revisá de nuevo las cargas y confirmá las series realizadas. ¿Continuar?')) return; setLoadType(e.target.value as typeof loadType); setSets(sets.map(s => ({ ...s, loadKg: '', saved: undefined, edited: true }))); setRecordDirty(true); }}><option value="external">Carga externa</option><option value="bodyweight">Peso corporal</option></select></label></details>
        {loadType === 'bodyweight' && <p className="training-muted">Registrá solo el lastre añadido; vacío o 0 si usás únicamente tu peso corporal.</p>}
        {sets.map((s, index) => <div className={`coach-series-row${s.saved && !draftChanged(s) ? ' is-saved' : ''}`} key={index}>
          <div className="coach-series-heading"><strong>{s.kind === 'warmup' ? 'Calentamiento' : 'Serie'} {index + 1}</strong><span>{s.saved ? draftChanged(s) ? 'Cambios sin guardar' : '✓ Guardada' : 'Por hacer'}</span><button type="button" aria-label={`Quitar serie ${index + 1}`} disabled={sets.length === 1} onClick={() => { if (s.saved && !window.confirm('La serie se quitará en el próximo guardado. ¿Quitarla?')) return; setSets(sets.filter((_,i)=>i!==index)); setRecordDirty(true); }}>×</button></div>
          <div className="coach-series-inputs"><label>{loadType === 'bodyweight' ? 'Lastre · kg' : 'Carga · kg'}<LoadStepper label={`${loadType === 'bodyweight' ? 'Lastre añadido' : 'Peso'} serie ${index + 1}`} step={2.5} value={s.loadKg} onChange={value => { setSets(sets.map((item,i)=>i===index?{...item,loadKg:value,edited:true}:item)); setRecordDirty(true); }} /></label><label>Repeticiones<LoadStepper label={`Repeticiones serie ${index + 1}`} step={1} value={s.reps} onChange={value => { setSets(sets.map((item,i)=>i===index?{...item,reps:value,edited:true}:item)); setRecordDirty(true); }} /></label></div>
          <div className="coach-series-detail"><label>RIR <span>opcional</span><input aria-label={`RIR serie ${index + 1}`} inputMode="numeric" placeholder="—" value={s.rir} onChange={e=>{setSets(sets.map((item,i)=>i===index?{...item,rir:e.target.value,edited:true}:item));setRecordDirty(true);}} /></label><label>Tipo<select aria-label={`Tipo serie ${index + 1}`} value={s.kind} onChange={e=>{setSets(sets.map((item,i)=>i===index?{...item,kind:e.target.value as SetDraft['kind'],edited:true}:item));setRecordDirty(true);}}><option value="work">Trabajo</option><option value="warmup">Calentamiento</option></select></label></div>
          <button type="button" className="today-secondary-button coach-confirm-set" disabled={!!s.saved && !draftChanged(s) && !recordDirty} onClick={() => saveRecord(undefined,index)}>{s.saved ? 'Actualizar serie' : '✓ Hecha · guardar serie'} {index+1}</button>
        </div>)}
        <button type="button" className="training-full-button" disabled={sets.length >= 30} onClick={() => { setSets([...sets, blankSet()]); setRecordDirty(true); }}>Añadir serie</button>
        <details className="coach-record-options"><summary>Comentario y opciones del ejercicio</summary>
          <label>RIR global · sólo si no lo registrás por serie<input type="number" min="0" max="10" step="1" value={rir} onChange={e => { setRir(e.target.value); setRecordDirty(true); }} /></label>
          <label>Estado del ejercicio<select value={status} onChange={e => { setStatus(e.target.value as typeof status); setRecordDirty(true); }}><option value="completed">Completado</option><option value="partial">Parcial</option></select></label>
          <label>Comentario de este entrenamiento<textarea aria-label="Comentario de este entrenamiento" maxLength={2000} value={comment} onChange={e => { setComment(e.target.value); setRecordDirty(true); }} /></label>
          <label className="coach-checkbox"><input type="checkbox" checked={excludeFromProgression} onChange={e=>{setExcludeFromProgression(e.target.checked);setRecordDirty(true);}} />No usar este ejercicio de hoy para sugerir progresión</label><p className="training-muted">Se conserva en el historial. Útil para una sesión atípica; no modifica la rutina.</p>
        </details>
        <button className="today-primary-button" type="submit">{log ? 'Actualizar ejercicio completo' : 'Guardar todas las series'}</button><p className="training-muted">Este botón confirma todas las filas como realizadas. Quitá las que no hiciste.</p>
        {sets.some(s=>s.saved) && log?.recording === 'in-progress' && <button type="button" className="training-full-button" onClick={() => saveRecord(undefined,undefined,true)}>Terminar con {sets.filter(s=>s.saved).length} series guardadas · parcial</button>}
      </fieldset></form>
      <PlateCalculator />
      <details className="training-notes" data-testid="training-notes"><summary>Notas de este ejercicio</summary>
        <p className="training-muted">Se conservan aunque el ejercicio deje de estar en tu rutina.</p>
        {notes.length === 0 && <p>Todavía no hay notas.</p>}
        {notes.map(n => <article className="training-note" key={n.id} data-note-id={n.id}>
          <div className="training-row">
            <div className="training-note-heading">
              <strong>{n.author}</strong>
              <button type="button" className="training-pin-button" disabled={saving}
                aria-label={n.pinned ? 'Desfijar nota' : 'Fijar nota'} aria-pressed={n.pinned}
                title={n.pinned ? 'Desfijar nota' : 'Fijar nota'}
                onClick={() => persist({ ...data, exerciseNotes: data.exerciseNotes.map(item => item.id === n.id ? { ...item, pinned: !item.pinned } : item) })}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 3h6M10 3v7l-3 3v4h10v-4l-3-3V3M12 17v5" />
                  {n.pinned && <path d="m3 3 18 18" />}
                </svg>
              </button>
              <button type="button" className="training-delete-note-button" disabled={saving}
                aria-label="Borrar nota" title="Borrar nota"
                onClick={async () => {
                  if (!window.confirm('¿Borrar esta nota? No se puede deshacer.')) return;
                  if (await persist({ ...data, exerciseNotes: data.exerciseNotes.filter(item => item.id !== n.id) })) setNotice('Nota borrada.');
                }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
                </svg>
              </button>
            </div>
            <time dateTime={n.updatedAt}>{dateLabel(n.updatedAt)}</time>
          </div>
          <p>{n.text}</p>
        </article>)}
        <label>Nueva nota para este ejercicio<textarea aria-label="Nueva nota para este ejercicio" maxLength={2000} value={note} disabled={saving} onChange={e => setNote(e.target.value)} /></label>
        <button type="button" className="training-full-button" disabled={saving || !note.trim()} onClick={saveNote}>Guardar nota</button>
      </details>
      {history.length > 0 && <details className="training-history"><summary>Últimos registros ({history.length})</summary>{[...history].reverse().map(s => { const l = s.logs.find(item => item.exerciseId === exerciseId)!; return <article key={s.id}><time>{dateLabel(s.performedOn)}</time><p>{l.sets.map(t => formatTrainingSet(t, l.loadType)).join(' · ')}{l.rir !== null ? ` · RIR ${l.rir}` : ''}</p>{l.comment && <p>{l.comment}</p>}</article>; })}</details>}
    </section> : session && cardioEditing ? <section className="today-card training-editor" data-testid="training-cardio-editor">
      <button type="button" className="training-back" disabled={saving} onClick={leave}>← Volver a la sesión</button>
      <p className="training-eyebrow">{dateLabel(session.performedOn)} · Cardio realizado</p>
      <h2>{session.routineSessionId?.includes('tuesday') ? 'Cinta · martes' : session.routineSessionId?.includes('thursday') ? 'Cinta · jueves' : 'Cinta después de fuerza'}</h2>
      {session.plannedCardio && <section aria-label="Cardio planificado"><h3>Lo planificado</h3><p><strong>{cardioSummary(session.plannedCardio)}</strong></p><details className="training-instructions"><summary>Indicaciones</summary><p>{session.plannedCardio.intensity}</p><p>{session.plannedCardio.notes}</p></details></section>}
      <form onSubmit={saveCardio}><fieldset className="training-fieldset" disabled={saving}>
        <label>Minutos suaves de entrada<input type="number" min="0" max="1440" step="1" required value={cardioWarmup} onChange={e => { setCardioWarmup(e.target.value); setCardioDirty(true); }} /></label>
        <label>Minutos moderados realizados<input type="number" min="0" max="1440" step="1" required value={cardioModerate} onChange={e => { setCardioModerate(e.target.value); setCardioDirty(true); }} /></label>
        <label>Minutos suaves de salida<input type="number" min="0" max="1440" step="1" required value={cardioCooldown} onChange={e => { setCardioCooldown(e.target.value); setCardioDirty(true); }} /></label>
        <label>Comentario de este cardio<textarea maxLength={2000} value={cardioComment} onChange={e => { setCardioComment(e.target.value); setCardioDirty(true); }} /></label>
        <button className="today-primary-button" type="submit">{session.cardio ? 'Actualizar cardio' : 'Guardar cardio'}</button>
      </fieldset></form>
    </section> : session ? <div data-testid="training-session">
      {!canRecordSession && <p className="training-muted">Sesión anterior: podés consultar y corregir registros existentes. Lo que quedó sin registrar no se traslada a hoy.</p>}

      {session.exerciseIds.length > 0 && <section className="today-card" aria-label="Ejercicios de fuerza"><ul className="training-exercise-list">{orderedIds.map(id => { const target = session.plannedItems?.find(i => i.exerciseId === id); const recorded = session.logs.find(l => target ? l.plannedItemId === target.id || (!l.plannedItemId && l.exerciseId === id) : l.exerciseId === id); const displayed = recorded?.exerciseId ?? id; return <li key={id}>{trainingHeading(exercise(displayed)?.name ?? displayed)}{target && prescription({ ...target, ...target.alternatives?.find(a => a.exerciseId === displayed) })}{!!target?.alternatives?.length && <p className="training-muted">{target.alternatives.length} reemplazos disponibles al registrar</p>}{recorded && <p>{!isLogFinished(recorded) ? 'En curso' : recorded.status === 'partial' ? 'Parcial' : 'Registrado'} · {recorded.sets.map(s => formatTrainingSet(s, recorded.loadType)).join(' · ')}</p>}<button type="button" className="today-primary-button" disabled={!canRecordSession && !recorded} onClick={() => openExercise(id)}>{recorded ? 'Editar registro' : 'Registrar ejercicio'}</button></li>; })}</ul></section>}
      {session.plannedCardio && <section className="today-card training-cardio-summary training-cardio-block" aria-label="Cardio de la sesión">
        {trainingHeading('Cardio', true)}
        <dl className="training-cardio-metrics">
          <div><dt>Entrada suave</dt><dd>{session.plannedCardio.warmupMinutes}<span> min</span></dd></div>
          <div className="training-cardio-main"><dt>Moderados</dt><dd>{session.plannedCardio.moderateMinutes}<span> min</span></dd></div>
          <div><dt>Salida suave</dt><dd>{session.plannedCardio.cooldownMinutes}<span> min</span></dd></div>
        </dl>
        {session.cardio && <p className="training-muted">Registrado · {session.cardio.moderateMinutes} min moderados · {session.cardio.warmupMinutes + session.cardio.cooldownMinutes} min suaves</p>}
        <button type="button" className="today-primary-button" disabled={!canRecordSession && !session.cardio} onClick={openCardio}>{session.cardio ? 'Editar cardio' : 'Registrar cardio'}</button>
      </section>}
    </div> : routine ? <section className="today-card" data-testid="training-today">
      <p className="training-eyebrow">Lo previsto para hoy</p>
      <h2>{currentDay?.label ?? 'Hoy'}</h2>
      {currentDay?.kind === 'rest' || !currentDay?.sessions.length
        ? <p>Hoy toca descanso. No hay un entrenamiento para iniciar.</p>
        : <><p>{currentDay.sessions[0].title}</p><p>Estado: {todayStatus === 'in-progress' ? 'en curso' : todayStatus === 'completed' ? 'completo' : 'pendiente'}.</p><button type="button" className="today-primary-button" disabled={saving} onClick={openToday}>Abrir entrenamiento de hoy</button></>}
    </section> : renderPlanUnavailable()}
    {session && isSessionRecorded(session) && <section className="today-card coach-session-summary" data-testid="session-summary"><span className="training-eyebrow">Sesión registrada</span><h2>Tu trabajo de hoy</h2>{(() => { const summary = sessionSummary(session); return <><div className="gym-stat-grid"><div><strong>{summary.sets}</strong><span>series de trabajo</span></div><div><strong>{summary.reps}</strong><span>repeticiones</span></div><div><strong>{summary.externalVolume.toLocaleString('es-ES')} kg</strong><span>carga externa × reps</span></div><div><strong>{summary.cardioMinutes} min</strong><span>cardio total</span></div></div><p className="training-muted">{summary.warmups > 0 ? `${summary.warmups} series de calentamiento separadas. ` : ''}{summary.partial > 0 || session.cardio?.status === 'partial' ? 'Hay registros parciales: registrado no significa que se haya cumplido toda la dosis del plan.' : 'Todo guardado. Podés volver a editar cualquier registro.'}</p></>; })()}</section>}
    <RestTimer controlRef={restControl} active={active && !!session && !isSessionRecorded(session)} />
    {notice && <p className="training-save-status" role="status">{notice}</p>}
  </div>;
}
