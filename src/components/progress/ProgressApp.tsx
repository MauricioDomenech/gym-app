import { WatchSessions } from './WatchSessions';
import { TrainingHistory } from './TrainingHistory';
import { acceptTrainingResponse } from '../training/trainingConnection';
import { comparableHistory, comparableRecords } from '../training/trainingInsights';
import { TrainingOverview } from './TrainingOverview';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrainingData, TrainingRoutine } from '../training/trainingStorage';
import { emptyTrainingData, workSets } from '../training/trainingStorage';
import { createTrainingRemoteClient } from '../training/trainingSync';
import { trainingAuthorization } from '../training/trainingHttp';
import catalog from '../training/exerciseCatalog.json';
import { addDays, dateKey, monday, shortDate, trainingWeek, weightTrend } from './progressData';
import type { ProgressHealth } from './progressData';
import './progress.css';

type Point = { label: string; value: number | null; target?: number | null };
const number = (value: number) => value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
function Chart({ points, unit, line = false, pointsOnly = false, target = false, color = 'var(--today-accent)', title }: { points: Point[]; unit: string; line?: boolean; pointsOnly?: boolean; target?: boolean; color?: string; title: string }) {
  const axes = <><CartesianGrid stroke="var(--today-border-soft)" vertical={false} strokeDasharray="3 5" /><XAxis dataKey="label" tick={{ fill: 'var(--today-muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} /><YAxis width={38} tick={{ fill: 'var(--today-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => unit === 'pasos' && Number(v) >= 1000 ? `${number(Number(v) / 1000)}k` : number(Number(v))} domain={line ? ['auto', 'auto'] : [0, 'auto']} /><Tooltip trigger="click" contentStyle={{ background: 'var(--today-surface-raised)', border: '1px solid var(--today-border)', borderRadius: 12, color: 'var(--today-text)' }} formatter={(v, key) => [typeof v === 'number' ? `${number(v)} ${unit}` : 'Sin medición', key === 'target' ? 'Plan' : 'Registrado']} /></>;
  return <><div className="progress-chart" role="group" aria-label={title}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
    {line ? <LineChart data={points} margin={{ top: 16, right: 18, left: 0, bottom: 0 }} accessibilityLayer>{axes}<Line dataKey="value" name="value" stroke={color} strokeWidth={pointsOnly ? 0 : 3} dot={{ r: 4, fill: color, strokeWidth: 2 }} activeDot={{ r: 7 }} connectNulls={false} isAnimationActive={false} /></LineChart> :
      <BarChart data={points} margin={{ top: 16, right: 10, left: 0, bottom: 0 }} accessibilityLayer>{axes}{target && <Bar dataKey="target" fill="var(--today-muted)" fillOpacity={0.25} radius={[4,4,0,0]} isAnimationActive={false} />}<Bar dataKey="value" fill={color} radius={[5,5,0,0]} maxBarSize={32} isAnimationActive={false} /></BarChart>}
  </ResponsiveContainer></div><details className="progress-values"><summary>Ver valores · {unit}</summary><table><caption>{title}</caption><thead><tr><th>Fecha</th><th>Registrado</th>{target && <th>Plan</th>}</tr></thead><tbody>{points.map((p, i) => <tr key={i}><th>{p.label}</th><td>{p.value === null ? 'Sin dato' : number(p.value)}</td>{target && <td>{p.target == null ? '—' : number(p.target)}</td>}</tr>)}</tbody></table></details></>;
}
function isHealth(value: unknown): value is ProgressHealth {
  if (!value || typeof value !== 'object' || !('days' in value) || !('weights' in value) || !Array.isArray(value.days) || !Array.isArray(value.weights)) return false;
  const numeric = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);
  if ('sleepNotes' in value && (!Array.isArray(value.sleepNotes) || !value.sleepNotes.every(n => n && typeof n.date === 'string' && typeof n.text === 'string'))) return false;
  return value.days.every(d => d && typeof d.date === 'string' && numeric(d.steps) && numeric(d.sleepHours) && numeric(d.daytimeHours)) && validWeights(value.weights);
}
function validWeights(value: unknown): value is ProgressHealth['weights'] {
  return Array.isArray(value) && value.every(w => w && typeof w.date === 'string' && typeof w.kg === 'number' && Number.isFinite(w.kg) && w.kg > 0 && typeof w.source === 'string');
}
export default function ProgressApp({ routine, onDirtyChange }: { routine: TrainingRoutine | null; onDirtyChange?: (dirty: boolean) => void }) {
  const today = dateKey(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<TrainingData>(emptyTrainingData);
  const [trainingState, setTrainingState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [healthState, setHealthState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [health, setHealth] = useState<ProgressHealth | null>(null);
  const [weights, setWeights] = useState<ProgressHealth['weights'] | null>(null);
  const [exercise, setExercise] = useState('');
  const [metric, setMetric] = useState('load');
  const [range, setRange] = useState(28);
  const [healthMissing, setHealthMissing] = useState(0);
  const start = addDays(monday(today), weekOffset * 7), end = addDays(start, 6), cutoff = end < today ? end : today;
  const firstDate = data.sessions.map(s=>s.performedOn).filter(d=>d<=cutoff).sort()[0] ?? cutoff;
  const historyStart = range === 0 ? firstDate : addDays(cutoff, 1-range);
  const healthStart = historyStart < addDays(cutoff,-364) ? addDays(cutoff,-364) : historyStart;
  useEffect(() => {
    let active = true;
    createTrainingRemoteClient().read().then(result => { if (active) { acceptTrainingResponse(result); setData(result?.data ?? emptyTrainingData()); setTrainingState('ready'); } }).catch(() => { if (active) setTrainingState('error'); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      const combined: ProgressHealth = {days:[],weights:[],sleepNotes:[]};
      const manual: ProgressHealth['weights'] = [];
      let missing = 0, healthOk = false, weightsOk = false;
      const headers = await trainingAuthorization();
      for(let from=healthStart;from<=cutoff;from=addDays(from,35)){
        if(controller.signal.aborted)return;
        const to=addDays(from,34)<cutoff?addDays(from,34):cutoff;
        try{
          const response=await fetch(`/api/progress?from=${from}&to=${to}`,{headers,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});
          if(!response.ok)throw Error('progress');
          const payload=await response.json();
          if(payload.health!==null&&!isHealth(payload.health))throw Error('health');
          if(payload.weights!==null&&!validWeights(payload.weights))throw Error('weights');
          if(payload.health){healthOk=true;combined.days.push(...payload.health.days);combined.weights.push(...payload.health.weights);combined.sleepNotes!.push(...payload.health.sleepNotes??[]);}else missing++;
          if(payload.weights){weightsOk=true;manual.push(...payload.weights);}else missing++;
        }catch{if(controller.signal.aborted)return;missing++;}
      }
      if(active){setHealth(healthOk?combined:null);setWeights(weightsOk?manual:null);setHealthMissing(missing);setHealthState(healthOk||weightsOk?'ready':'error');}
    })().catch(()=>{if(active)setHealthState('error');});
    return()=>{active=false;controller.abort();};
  }, [healthStart, cutoff, reload]);
  const week = trainingWeek(data, routine, start, today);
  const series = week.reduce((n, d) => n + d.series, 0), moderate = week.reduce((n, d) => n + d.moderate, 0);
  const planKnown = week.every(d => d.target !== null);
  const target = week.reduce((n, d) => n + (d.target ?? 0), 0);
  const plannedSeries = week.reduce((n, d) => n + (d.plannedSeries ?? 0), 0);
  const strengthDays = week.filter(d => d.series > 0).length;
  const strengthTarget = week.filter(d => (d.plannedSeries ?? 0) > 0).length;
  const exerciseIds = [...new Set(data.sessions.filter(s => s.performedOn >= historyStart && s.performedOn <= cutoff).flatMap(s => s.logs.map(l => l.exerciseId)))];
  const selected = exerciseIds.includes(exercise) ? exercise : exerciseIds[0];
  const exposures = data.sessions.filter(s => s.performedOn >= historyStart && s.performedOn <= cutoff).flatMap(s => s.logs.filter(l => l.exerciseId === selected).map(l => ({ date: s.performedOn, ...l }))).sort((a, b) => a.date.localeCompare(b.date));
  const latest = exposures.at(-1);
  const latestSession = latest ? data.sessions.find(s=>s.performedOn===latest.date && s.logs.some(l=>l.exerciseId===selected && l.updatedAt===latest.updatedAt)) : undefined;
  const latestSlot = latestSession?.plannedItems?.find(p=>p.id===latest?.plannedItemId || (!latest?.plannedItemId&&p.exerciseId===selected));
  const personalRecords = latest && latestSession ? comparableRecords(latest,comparableHistory(data,latestSession,selected,latestSlot)) : [];
  const sameType = exposures.filter(l => (l.loadType ?? 'external') === (latest?.loadType ?? 'external'));
  const readings = [...(health?.weights ?? []), ...(weights ?? [])].filter(w => w.date >= historyStart && w.date <= cutoff).sort((a, b) => a.date.localeCompare(b.date));
  const trends = weightTrend(readings);
  const days = week.map(d => ({ ...d, ...health?.days.find(h => h.date === d.date) }));
  const stepDays = days.filter(d => d.date < today && d.steps != null);
  const stepAverage = stepDays.length ? stepDays.reduce((n, d) => n + d.steps!, 0) / stepDays.length : null;
  const sleepDays = days.filter(d => d.sleepHours != null).length;
  const changeWeek = (offset: number) => { setWeekOffset(offset); setHealthState('loading'); setHealth(null); setWeights(null); };
  return <div className="progress-app">
    <div className="progress-period"><button aria-label="Semana anterior" disabled={weekOffset <= -103} onClick={() => changeWeek(weekOffset - 1)}>‹</button><div><span className="progress-eyebrow">{weekOffset === 0 ? 'TU SEMANA' : 'SEMANA ANTERIOR'}</span><strong>{shortDate(start)} — {shortDate(end)}</strong></div><button aria-label="Semana siguiente" disabled={weekOffset === 0} onClick={() => changeWeek(weekOffset + 1)}>›</button></div>
    {healthMissing > 0 && <p role="status" className="progress-warning">Algunos períodos o fuentes no se pudieron cargar. Los huecos no se interpretan como cero; podés reintentar.</p>}
    <p className="progress-intro">Constancia, esfuerzo y contexto. Tocá los gráficos para ver los valores.</p>
    {(trainingState === 'error' || healthState === 'error' || (healthState === 'ready' && (!health || !weights))) && <div className="progress-warning" role="status">{trainingState === 'error' ? 'No pude cargar tu entrenamiento. ' : ''}{healthState === 'error' || !health ? 'La actividad y el descanso no están disponibles. ' : ''}{healthState === 'ready' && !weights ? 'Los pesos de Coach no están disponibles. ' : ''}<button onClick={() => { if (trainingState === 'error') setTrainingState('loading'); setHealthState('loading'); setReload(reload + 1); }}>Reintentar</button></div>}
    {trainingState === 'loading' ? <p role="status">Consultando tus registros…</p> : trainingState === 'ready' && <>
      <TrainingOverview data={data} today={today} from={start} to={cutoff} />
      <section className="today-card progress-card" aria-labelledby="progress-week"><span className="progress-eyebrow">01 / ENTRENAMIENTO</span><h2 id="progress-week">Entrenamiento semanal</h2><div className="progress-stats"><div><strong>{strengthDays}<small>{planKnown ? ` / ${strengthTarget} días` : ' días'}</small></strong><span>de fuerza registrados</span></div><div><strong>{series}<small>{planKnown ? ` / ${plannedSeries}` : ''}</small></strong><span>series {planKnown ? 'del plan semanal' : 'registradas'}</span></div><div><strong>{moderate}<small>{planKnown ? ` / ${target}` : ''}</small></strong><span>minutos moderados</span></div><div><strong>{week.reduce((n,d) => n + d.total, 0)}<small> min</small></strong><span>cardio con entrada y salida</span></div></div>
        <h3>Cardio · minutos moderados</h3><p className="progress-legend"><i /> Registrado <i className="plan" /> Plan semanal</p><Chart title="Cardio diario" unit="min" target points={week.map(d => ({ label: `${d.label} ${shortDate(d.date)}`, value: d.future ? null : d.moderate, target: d.target }))} />
        <h3>Fuerza · series registradas</h3><Chart title="Series por día" unit="series" target color="var(--progress-blue)" points={week.map(d => ({ label: d.label, value: d.future ? null : d.series, target: d.plannedSeries }))} />
        {!planKnown && <p className="progress-note">No hay un plan histórico completo para comparar esta semana.</p>}
        <ul className="progress-context">{week.filter(d => d.skipped || d.comments.length).map(d => <li key={d.date}><strong>{shortDate(d.date)}</strong> · {d.skipped ? 'Marcaste «No entrené».' : d.comments.join(' · ')}</li>)}</ul><p className="progress-note">Los días futuros no cuentan como ausencias. El cardio del reloj no se suma otra vez.</p>
      </section>
      <section className="today-card progress-card" aria-labelledby="progress-strength"><span className="progress-eyebrow">02 / FUERZA</span><h2 id="progress-strength">Progreso por ejercicio</h2><div className="progress-tabs" aria-label="Período de evolución">{[[28,'28 días'],[90,'90 días'],[365,'1 año'],[0,'Todo']].map(([value,label])=><button key={value} aria-pressed={range===value} onClick={()=>{if(range===Number(value))return;setRange(Number(value));setHealthState('loading');setHealth(null);setWeights(null);setHealthMissing(0);}}>{label}</button>)}</div><p className="progress-note">Desde {shortDate(historyStart)} hasta {shortDate(cutoff)}. Los gráficos semanales de arriba conservan su semana.</p>{!latest ? <p>Tus primeras series aparecerán aquí cuando las registres.</p> : <><label className="progress-field">Ejercicio<select value={selected} onChange={e => setExercise(e.target.value)}>{exerciseIds.map(id => <option key={id} value={id}>{catalog.find(c => c.id === id)?.name ?? id}</option>)}</select></label>
      <div className="progress-tabs" aria-label="Métrica de fuerza">{[['load',latest.loadType === 'bodyweight' ? 'Lastre' : 'Carga'],['reps','Repeticiones'],['setRir','RIR por serie'],['rir','RIR global']].map(([key,label]) => <button key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}>{label}</button>)}</div>
      <Chart title="Evolución del ejercicio" unit={metric === 'load' ? 'kg' : metric === 'reps' ? 'reps' : 'RIR'} line points={sameType.map(l => ({ label: shortDate(l.date), value: metric === 'load' ? (workSets(l).length ? Math.max(...workSets(l).map(s => s.loadKg)) : null) : metric === 'reps' ? workSets(l).reduce((n,s) => n+s.reps,0) : metric === 'setRir' ? (()=>{const rated=workSets(l).filter(s=>s.rir!=null);return rated.length?rated.reduce((n,s)=>n+s.rir!,0)/rated.length:null;})() : l.rir }))} />
      <p className="progress-note">{metric === 'load' ? 'Carga máxima de las series de trabajo, sin calentamientos; no es un 1RM.' : metric === 'reps' ? 'Repeticiones totales de trabajo, sin calentamientos.' : metric === 'setRir' ? 'Media del RIR de las series de trabajo que valoraste; las demás no se rellenan.' : 'RIR global que registraste para el ejercicio; separado del RIR individual.'} {latest.loadType === 'bodyweight' && 'Peso corporal: los kilos son sólo lastre, no tu peso.'}</p>
      {personalRecords.length>0&&<p className="coach-record-badge">Mejor marca comparable: {personalRecords.map(r=>`${r.set.loadKg} kg × ${r.set.reps}, antes ${r.previous.loadKg} × ${r.previous.reps} (${shortDate(r.date)})`).join(' · ')}. Misma variante y sesión; la técnica y el esfuerzo pueden variar.</p>}
      <div className="progress-last"><strong>Último registro · {shortDate(latest.date)}</strong><p>{latest.sets.map(s => `${s.loadKg} kg × ${s.reps}`).join(' · ')}</p><span>RIR {latest.rir ?? 'sin dato'}{latest.loadType === 'bodyweight' ? ' · Peso corporal + lastre' : ' · Carga externa'}</span></div>
      <p className="progress-note">{sameType.length < 2 ? 'Esta es tu línea base: todavía no hay otra exposición para comparar.' : 'Compará sólo con la misma máquina, técnica y configuración. Más kilos por sí solos no prueban una mejora.'}</p><details className="progress-values"><summary>Sueño junto al entrenamiento</summary><p className="progress-note">Noche por fecha de despertar, junto al trabajo registrado. Es contexto, no una explicación causal del rendimiento.</p><table><thead><tr><th>Fecha</th><th>Reps de trabajo</th><th>Ventana de sueño</th></tr></thead><tbody>{sameType.map((l,i)=><tr key={i}><th>{shortDate(l.date)}</th><td>{workSets(l).reduce((n,s)=>n+s.reps,0)}</td><td>{(()=>{const hours=health?.days.find(d=>d.date===l.date)?.sleepHours;return hours==null?'Sin medición':`${number(hours)} h`;})()}</td></tr>)}</tbody></table></details></> }</section>
      <WatchSessions key={cutoff} data={data} to={cutoff} />
      <TrainingHistory data={data} today={today} onSaved={setData} onDirtyChange={onDirtyChange} />
    </>}
    <section className="today-card progress-card" aria-labelledby="progress-health"><span className="progress-eyebrow">03 / ACTIVIDAD Y DESCANSO</span><h2 id="progress-health">Pasos y sueño</h2>{healthState === 'loading' ? <p role="status">Consultando el reloj…</p> : healthState === 'ready' && health ? <>
      <div className="progress-section-heading"><h3>Pasos diarios</h3><strong>{stepAverage === null ? '—' : number(Math.round(stepAverage))}<small> / día</small></strong></div><p className="progress-note">Samsung Health · media de {stepDays.length} días con medición, excluyendo hoy. No garantiza cobertura completa.</p><Chart title="Pasos Samsung" unit="pasos" points={days.map(d => ({ label: d.label + (d.date === today ? '*' : ''), value: d.steps ?? null }))} />
      <p className="progress-note">* Hoy es parcial. Hueco = sin medición, no cero pasos.{days.some(d => d.stepsConflict) && ' Hay intervalos solapados: ese día no se suma.'}</p>
      <div className="progress-section-heading"><h3>Sueño por noche</h3><strong>{sleepDays}<small> noches registradas</small></strong></div><Chart title="Ventanas nocturnas por fecha de despertar" unit="h" color="var(--progress-purple)" points={days.map(d => ({ label: d.label, value: d.sleepHours ?? null }))} />
      <p className="progress-note">Ventanas del reloj, no tiempo neto dormido. Tramos agrupados por fecha de despertar, sin sumar huecos ni solapamientos. Los episodios que terminan desde las 12 h se muestran aparte.</p>
      {health.sleepNotes?.filter(n => n.date >= start && n.date <= cutoff).map(n => <p className="progress-context" key={n.date}>{shortDate(n.date)} · {n.text}</p>)}
      {days.filter(d => d.daytimeHours != null).map(d => <p className="progress-note" key={d.date}>{shortDate(d.date)} · episodio diurno: {number(d.daytimeHours!)} h, separado de la noche.</p>)}
    </> : <p>Sin acceso a las mediciones. No se interpretan como actividad o descanso cero.</p>}</section>
    <section className="today-card progress-card" aria-labelledby="progress-weight"><span className="progress-eyebrow">04 / PESO</span><h2 id="progress-weight">Peso corporal</h2>{healthState === 'loading' ? <p>Cargando pesajes…</p> : healthState === 'ready' && readings.length ? <><div className="progress-weight"><strong>{number(readings.at(-1)!.kg)}<small> kg</small></strong><span>{shortDate(readings.at(-1)!.date)} · {readings.at(-1)!.source}</span></div><Chart title="Pesajes del período seleccionado" unit="kg" line pointsOnly color="var(--today-accent)" points={readings.map(w => ({ label: `${shortDate(w.date)} · ${w.source}`, value: w.kg }))} />{trends.filter(t=>t.points.some(p=>p.kg!==null)).map(t=><div key={t.source}><h3>Tendencia · {t.source}</h3><Chart title={`Media móvil de peso · ${t.source}`} unit="kg" line points={t.points.map(p=>({label:shortDate(p.date),value:p.kg}))} /></div>)}<p className="progress-note">Tendencia: media de siete días sólo con al menos tres días medidos, separada por fuente y sin rellenar huecos. Salud y peso consultan hasta un año.</p><p className="progress-note">Puntos reales por fuente, sin promedio entre Coach y Renpho. No implican una tendencia ni cambios de grasa. Compará pesajes en condiciones similares.</p></> : <p>{healthState === 'ready' && health && weights ? 'Todavía no hay pesajes en este período.' : 'No pude comprobar todos los pesajes.'}</p>}</section>
    {trainingState === 'ready' && <section className="today-card progress-card progress-reading"><span className="progress-eyebrow">05 / LECTURA DE LA SEMANA</span><h2>Lo que podemos decir</h2><p>{series ? `Hay ${strengthDays} días de fuerza y ${series} series registradas. El cardio suma ${moderate} minutos moderados${planKnown ? ` de ${target} previstos en la semana` : ''}.` : 'Todavía no hay fuerza registrada en esta semana.'}</p><p>Esto describe tu trabajo, no mide todavía cuánto músculo ganaste o grasa perdiste. Para ver evolución, compará exposiciones del mismo ejercicio y pesajes en condiciones parecidas.</p><p className="progress-note">Lectura automática de los registros. Las calorías parciales del reloj no se usan para calcular un déficit.</p></section>}
  </div>;
}
