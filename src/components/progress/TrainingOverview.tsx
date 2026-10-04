import { AnatomicalBodyMap } from './AnatomicalBodyMap';
import { useEffect, useRef, useState } from 'react';
import type { TrainingData } from '../training/trainingStorage';
import catalog from '../training/exerciseCatalog.json';
import { addDays, shortDate } from './progressData';
// Primary-region classification only: not a fractional model of secondary-muscle stimulus.
const groups: Record<string, number[]> = {
  Pecho: [1,2,3,4,5,6,7,8,41,42,43,44], Hombros: [9,10,21,22,23,37,38,39,40,69],
  Tríceps: [11,12,13,14,45,46,71,72], Abdomen: [15,16,64,74,75], Espalda: [17,18,19,20,34,47,48,49,50,51,66],
  Bíceps: [24,25,26,52,53,54,55,70], Antebrazos: [27,28,56,57,76,77,78,79,80],
  Cuádriceps: [29,30,33,60,61,62,65], Isquiotibiales: [31,32,67,68], Glúteos: [58,59], Gemelos: [35,36,63,73],
};
const primaryGroup = (id: string) => Object.keys(groups).find(key => groups[key].includes(Number(id.split('.').at(-1))));
export function TrainingOverview({ data, today, from, to }: { data: TrainingData; today: string; from: string; to: string }) {
  const heatScroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (heatScroll.current) heatScroll.current.scrollLeft = heatScroll.current.scrollWidth; }, []);
  const [heatMetric, setHeatMetric] = useState<'sets'|'volume'>('sets');
  const [dayDetail, setDayDetail] = useState('');
  const [muscle, setMuscle] = useState('');
  const sessions = data.sessions.filter(s => s.performedOn <= to && (s.logs.length || s.cardio));
  const current = sessions.filter(s => s.performedOn >= from);
  const volume = (logs: typeof sessions[number]['logs']) => logs.reduce((sum,l)=>sum+l.sets.reduce((n,s)=>n+s.loadKg*s.reps,0),0);
  const totals = Object.fromEntries(Object.keys(groups).map(g => [g,0]));
  let unclassified=0;
  for(const session of current) for(const log of session.logs){const g=primaryGroup(log.exerciseId);if(g)totals[g]+=log.sets.length;else unclassified+=log.sets.length;}
  const max=Math.max(1,...Object.values(totals));
  const rated=current.flatMap(s=>s.logs).filter(l=>l.rir!==null);
  const buckets=[0,1,2,3,4].map(r=>({r,count:rated.filter(l=>r===4?l.rir!>=4:l.rir===r).length}));
  const chartStart=addDays(today,-363);
  const cells=Array.from({length:364},(_,i)=>{const date=addDays(chartStart,i),logs=sessions.filter(s=>s.performedOn===date).flatMap(s=>s.logs);return {date,value:heatMetric==='sets'?logs.reduce((n,l)=>n+l.sets.length,0):volume(logs)};});
  const peak=Math.max(1,...cells.map(c=>c.value));
  const head=[['Sesiones',sessions.length],['Esta semana',current.length],['Series',current.reduce((n,s)=>n+s.logs.reduce((a,l)=>a+l.sets.length,0),0)],['Volumen externo',`${Math.round(volume(current.flatMap(s=>s.logs))).toLocaleString('es-ES')} kg`]];
  return <>
    <div className="gym-stat-grid">{head.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <section className="today-card"><h2>Actividad · últimas 52 semanas</h2><div className="progress-tabs">{(['sets','volume'] as const).map(m=><button key={m} aria-pressed={heatMetric===m} onClick={()=>setHeatMetric(m)}>{m==='sets'?'Series':'Volumen'}</button>)}</div><div className="gym-heat-scroll" ref={heatScroll}><div className="gym-heatmap">{cells.map(c=><button key={c.date} aria-label={`${c.date}: ${c.value} ${heatMetric==='sets'?'series':'kg'}`} onClick={()=>setDayDetail(`${shortDate(c.date)} · ${c.value.toLocaleString('es-ES')} ${heatMetric==='sets'?'series':'kg'}`)} style={{background:c.value?`color-mix(in srgb, var(--today-accent) ${30+70*c.value/peak}%, var(--today-surface))`:'var(--today-surface-raised)'}} />)}</div></div><p className="progress-note" role="status">{dayDetail||'Tocá un día para ver el registro. Sin color: sin fuerza registrada, no prueba de inactividad. Volumen: carga externa o lastre × repeticiones.'}</p></section>
    <section className="today-card"><h2>Distribución muscular</h2><p className="progress-note">Semana seleccionada · series por región principal</p><AnatomicalBodyMap totals={totals} selected={muscle} onSelect={setMuscle} />{Object.entries(totals).sort((a,b)=>b[1]-a[1]).map(([g,n])=><button className="gym-muscle-row" aria-pressed={muscle===g} key={g} onClick={()=>setMuscle(g)}><span>{g}</span><span className="gym-muscle-bar"><i style={{width:`${100*n/max}%`}} /></span><strong>{n}</strong></button>)}{muscle&&<p className="progress-note" role="status">{muscle}: {totals[muscle]} series en ejercicios clasificados en esta región principal.</p>}<p className="progress-note">Clasificación simplificada: no suma músculos secundarios ni estima fatiga o recuperación.{unclassified>0?` ${unclassified} series sin clasificar.`:''}</p></section>
    <section className="today-card"><h2>Esfuerzo · RIR</h2><p className="progress-note">{rated.length} registros de ejercicio con RIR. El RIR actual se guarda por ejercicio, no por serie.</p>{rated.length?<><div className="gym-effort-average">{(rated.reduce((n,l)=>n+l.rir!,0)/rated.length).toLocaleString('es-ES',{maximumFractionDigits:1})}<small> RIR medio</small></div>{buckets.map(b=><div className="gym-muscle-row" key={b.r}><span>RIR {b.r}{b.r===4?'+':''}</span><span className="gym-muscle-bar"><i style={{width:`${100*b.count/rated.length}%`,background:'var(--progress-amber)'}} /></span><strong>{b.count}</strong></div>)}</>:<p className="progress-note">Aparecerá cuando registres el esfuerzo.</p>}</section>
    <section className="today-card"><h2>Entrenamientos recientes</h2>{[...sessions].sort((a,b)=>b.performedOn.localeCompare(a.performedOn)).slice(0,6).map(s=><details className="gym-recent" key={s.id}><summary><span>{s.plannedItems?.length?'Fuerza':'Cardio'}<small>{shortDate(s.performedOn)}</small></span><strong>{s.logs.reduce((n,l)=>n+l.sets.length,0)} series</strong></summary>{s.logs.map(l=><p key={l.exerciseId}>{catalog.find(c=>c.id===l.exerciseId)?.name??l.exerciseId}<br/><small>{l.sets.map(t=>`${t.loadKg} kg × ${t.reps}`).join(' · ')}</small></p>)}{s.cardio&&<p>{s.cardio.moderateMinutes} min moderados</p>}</details>)}{!sessions.length&&<p className="progress-note">Todavía no hay sesiones registradas.</p>}</section>
  </>;
}
