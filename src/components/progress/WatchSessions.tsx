import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { trainingAuthorization } from '../training/trainingHttp';
import { sessionSummary } from '../training/trainingInsights';
import type { TrainingData } from '../training/trainingStorage';
import { addDays, shortDate } from './progressData';
import { activityName, cardioCandidates, comparableCardio } from './activityData';
import type { WatchActivity } from './activityData';
const number=(value:number|null)=>value===null?'—':value.toLocaleString('es-ES',{maximumFractionDigits:1});
const time=(value:string)=>new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(new Date(value));
function validActivities(value:unknown):value is WatchActivity[]{
  const numeric=(v:unknown)=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=0);
  return Array.isArray(value)&&value.every(a=>a&&typeof a.id==='string'&&typeof a.date==='string'&&Number.isFinite(Date.parse(a.start))&&Number.isFinite(Date.parse(a.end))&&numeric(a.type)&&numeric(a.minutes)&&numeric(a.bpm)&&numeric(a.kmh)&&numeric(a.distanceKm)&&numeric(a.peakBpm)&&numeric(a.coveredPulseMinutes)&&typeof a.conflicts==='number'&&Array.isArray(a.timeline)&&a.timeline.length<=180&&a.timeline.every((p:{minute:unknown;bpm:unknown;kmh:unknown})=>numeric(p.minute)&&numeric(p.bpm)&&numeric(p.kmh)));
}
export function WatchSessions({data,to}:{data:TrainingData;to:string}){
  const [activities,setActivities]=useState<WatchActivity[]>([]),[state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const [reload,setReload]=useState(0),[selected,setSelected]=useState('');
  const from=addDays(to,-27);
  useEffect(()=>{
    const controller=new AbortController();let active=true;
    (async()=>{
      const response=await fetch(`/api/progress?resource=activity&from=${from}&to=${to}`,{headers:await trainingAuthorization(),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])});
      if(!response.ok)throw Error('activities');const payload=await response.json();if(!validActivities(payload.activities))throw Error('activities');
      if(active){setActivities(payload.activities);setState('ready');}
    })().catch(()=>{if(active)setState('error');});
    return()=>{active=false;controller.abort();};
  },[from,to,reload]);
  const activity=activities.find(a=>a.id===selected)??activities[0];
  const coach=activity?data.sessions.filter(s=>s.performedOn===activity.date&&(s.logs.length||s.cardio)):[];
  const comparison=activity?comparableCardio(activity,activities)[0]:undefined;
  return <section className="today-card progress-card coach-watch"><span className="progress-eyebrow">COACH + RELOJ</span><h2>Tu sesión, con contexto</h2><p className="progress-note">Actividades del reloj de {shortDate(from)} a {shortDate(to)}. Se muestran junto a Coach, nunca se suman como entrenamientos extra.</p>
    {state==='loading'?<p role="status">Consultando tus actividades…</p>:state==='error'?<p role="status">No pude consultar las actividades del reloj. <button onClick={()=>{setState('loading');setReload(reload+1);}}>Reintentar</button></p>:!activity?<p>No hay actividades del reloj en este período.</p>:<>
      <label className="progress-field">Actividad<select value={activity.id} onChange={e=>setSelected(e.target.value)}>{activities.map(a=><option key={a.id} value={a.id}>{shortDate(a.date)} · {time(a.start)} · {activityName(a.type)} · {number(a.minutes)} min</option>)}</select></label>
      <div className="coach-watch-coach"><h3>Tu registro de Coach ese día</h3>{coach.length?coach.map(s=>{const summary=sessionSummary(s),candidates=cardioCandidates(s,activities);return <div key={s.id}><p><strong>{summary.sets} series de trabajo</strong> · {summary.cardioMinutes} min de cardio</p>{s.cardio&&<p className="progress-note">{candidates.some(a=>a.id===activity.id)?candidates.length===1?'Posible coincidencia de cardio por fecha, tipo y duración.':'Hay varias actividades compatibles: la relación es ambigua.':'Esta actividad no coincide con la duración del cardio registrado.'} Coach no tiene hora de inicio: no atribuyo el pulso a ejercicios o series concretos.</p>}</div>}):<p className="progress-note">Sin entrenamiento registrado en Coach para esa fecha. No se crea uno automáticamente.</p>}</div>
      <h3>{activityName(activity.type)} · {time(activity.start)}–{time(activity.end)}</h3><div className="progress-stats"><div><strong>{number(activity.minutes)}<small> min</small></strong><span>duración del reloj</span></div><div><strong>{number(activity.bpm)}<small> lpm</small></strong><span>media de muestras de pulso</span></div><div><strong>{number(activity.kmh)}<small> km/h</small></strong><span>media de muestras de velocidad</span></div><div><strong>{number(activity.distanceKm)}<small> km</small></strong><span>distancia del mismo intervalo</span></div></div>
      {(activity.pulseSamples>0||activity.speedSamples>0)&&<><p className="progress-legend"><i style={{background:'var(--progress-purple)'}}/> Pulso · lpm <i style={{background:'var(--progress-blue)'}}/> Velocidad · km/h</p><div className="progress-chart" role="group" aria-label="Pulso y velocidad durante la actividad"><ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={activity.timeline} margin={{top:12,right:4,left:0,bottom:0}} accessibilityLayer><CartesianGrid stroke="var(--today-border-soft)" vertical={false}/><XAxis dataKey="minute" tick={{fill:'var(--today-muted)',fontSize:11}} tickFormatter={v=>`${v}′`}/><YAxis yAxisId="pulse" width={35} tick={{fill:'var(--progress-purple)',fontSize:11}} domain={['auto','auto']}/><YAxis yAxisId="speed" orientation="right" width={32} tick={{fill:'var(--progress-blue)',fontSize:11}}/><Tooltip trigger="click" contentStyle={{background:'var(--today-surface)',border:'1px solid var(--today-border)',borderRadius:12}} formatter={(v,key)=>[`${number(typeof v==='number'?v:null)} ${key==='Pulso'?'lpm':'km/h'}`,key]} labelFormatter={v=>`Minuto ${v}`}/><Line yAxisId="pulse" name="Pulso" dataKey="bpm" stroke="var(--progress-purple)" dot={false} strokeWidth={2} connectNulls={false} isAnimationActive={false}/><Line yAxisId="speed" name="Velocidad" dataKey="kmh" stroke="var(--progress-blue)" dot={false} strokeWidth={2} connectNulls={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div><details className="progress-values"><summary>Ver valores del reloj</summary><table><thead><tr><th>Minuto</th><th>Pulso · lpm</th><th>Velocidad · km/h</th></tr></thead><tbody>{activity.timeline.map(p=><tr key={p.minute}><th>{p.minute}</th><td>{number(p.bpm)}</td><td>{number(p.kmh)}</td></tr>)}</tbody></table></details></>}
      <p className="progress-note">{activity.coveredPulseMinutes} de {Math.ceil(activity.minutes)} minutos contienen alguna muestra de pulso; no implica cobertura continua. {activity.pulseSamples} muestras únicas. Los huecos no se rellenan. {activity.conflicts>0?`${activity.conflicts} instantes con valores contradictorios se excluyeron.`:''} Las medias de muestras no son medias ponderadas por tiempo ni pulso de reposo.</p>
      <h3>Cardio parecido, no idéntico</h3>{comparison?<><p>{shortDate(comparison.date)} · {number(comparison.minutes)} min · {number(comparison.kmh)} km/h · {number(comparison.bpm)} lpm</p><p className="progress-note">Mismo tipo, duración dentro de ±10 %, velocidad media dentro de ±0,5 km/h y muestras de pulso en al menos el 70 % de los minutos. Pendiente, pausas, calor y condiciones no están verificados: un pulso menor no prueba por sí solo una mejora.</p></>:<p className="progress-note">Todavía no hay otra actividad anterior con tipo, duración, velocidad y cobertura de pulso suficientemente parecidos en estos 28 días.</p>}
    </>}
  </section>;
}
