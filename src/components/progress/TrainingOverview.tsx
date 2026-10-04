import { AnatomicalBodyMap } from './AnatomicalBodyMap';
import { useEffect, useRef, useState } from 'react';
import type { TrainingData } from '../training/trainingStorage';
import catalog from '../training/exerciseCatalog.json';
import { addDays, shortDate } from './progressData';
import { exerciseMuscles, muscleDistribution } from './muscleData';
import { workSets } from '../training/trainingStorage';
export function TrainingOverview({ data, today, from, to }: { data: TrainingData; today: string; from: string; to: string }) {
  const heatScroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (heatScroll.current) heatScroll.current.scrollLeft = heatScroll.current.scrollWidth; }, []);
  const [heatMetric, setHeatMetric] = useState<'sets'|'volume'>('sets');
  const [dayDetail, setDayDetail] = useState('');
  const [muscle, setMuscle] = useState('');
  const [includeSecondary, setIncludeSecondary] = useState(false);
  const sessions = data.sessions.filter(s => s.performedOn <= to && (s.logs.length || s.cardio));
  const current = sessions.filter(s => s.performedOn >= from);
  const volume = (logs: typeof sessions[number]['logs']) => logs.reduce((sum,l)=>sum+workSets(l).reduce((n,s)=>n+s.loadKg*s.reps,0),0);
  const distribution=muscleDistribution(current);
  const totals=Object.fromEntries(distribution.map(g=>[g.region,g.primary+(includeSecondary?g.secondary:0)]));
  const unclassified=current.flatMap(s=>s.logs).filter(l=>!exerciseMuscles(l.exerciseId).primary.length).reduce((n,l)=>n+workSets(l).length,0);
  const max=Math.max(1,...Object.values(totals));
  const setEfforts=current.flatMap(s=>s.logs).flatMap(workSets).filter(s=>s.rir!=null).map(s=>s.rir!);
  const globalEfforts=current.flatMap(s=>s.logs).filter(l=>l.rir!==null && !workSets(l).some(s=>s.rir!=null)).map(l=>l.rir!);
  const rated=setEfforts.length?setEfforts:globalEfforts;
  const buckets=[0,1,2,3,4].map(r=>({r,count:rated.filter(value=>r===4?value>=4:value===r).length}));
  const chartStart=addDays(today,-363);
  const cells=Array.from({length:364},(_,i)=>{const date=addDays(chartStart,i),logs=sessions.filter(s=>s.performedOn===date).flatMap(s=>s.logs);return {date,value:heatMetric==='sets'?logs.reduce((n,l)=>n+workSets(l).length,0):volume(logs)};});
  const peak=Math.max(1,...cells.map(c=>c.value));
  const head=[['Sesiones',sessions.length],['Esta semana',current.length],['Series',current.reduce((n,s)=>n+s.logs.reduce((a,l)=>a+workSets(l).length,0),0)],['Volumen externo',`${Math.round(volume(current.flatMap(s=>s.logs))).toLocaleString('es-ES')} kg`]];
  return <>
    <div className="gym-stat-grid">{head.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <section className="today-card"><h2>Actividad · últimas 52 semanas</h2><div className="progress-tabs">{(['sets','volume'] as const).map(m=><button key={m} aria-pressed={heatMetric===m} onClick={()=>setHeatMetric(m)}>{m==='sets'?'Series':'Volumen'}</button>)}</div><div className="gym-heat-scroll" ref={heatScroll}><div className="gym-heatmap">{cells.map(c=><button key={c.date} aria-label={`${c.date}: ${c.value} ${heatMetric==='sets'?'series':'kg'}`} onClick={()=>setDayDetail(`${shortDate(c.date)} · ${c.value.toLocaleString('es-ES')} ${heatMetric==='sets'?'series':'kg'}`)} style={{background:c.value?`color-mix(in srgb, var(--today-accent) ${30+70*c.value/peak}%, var(--today-surface))`:'var(--today-surface-raised)'}} />)}</div></div><p className="progress-note" role="status">{dayDetail||'Tocá un día para ver el registro. Sin color: sin fuerza registrada, no prueba de inactividad. Volumen: carga externa o lastre × repeticiones.'}</p></section>
    <section className="today-card"><h2>Distribución muscular</h2><p className="progress-note">Semana seleccionada · series de trabajo, sin calentamientos</p><div className="progress-tabs"><button aria-pressed={!includeSecondary} onClick={()=>setIncludeSecondary(false)}>Principales</button><button aria-pressed={includeSecondary} onClick={()=>setIncludeSecondary(true)}>+ Secundarios</button></div><AnatomicalBodyMap totals={totals} selected={muscle} onSelect={setMuscle} />{Object.entries(totals).sort((a,b)=>b[1]-a[1]).map(([g,n])=><button className="gym-muscle-row" aria-pressed={muscle===g} key={g} onClick={()=>setMuscle(g)}><span>{g}</span><span className="gym-muscle-bar"><i style={{width:`${100*n/max}%`}} /></span><strong>{n}</strong></button>)}{muscle&&<div className="coach-muscle-detail" role="status"><h3>{muscle}</h3>{(()=>{const group=distribution.find(g=>g.region===muscle)!;return <><p>{group.primary} series principales · {group.secondary} con participación secundaria</p>{group.exercises.map(e=><p key={e.id}><strong>{catalog.find(c=>c.id===e.id)?.name??e.id}</strong><br/><small>{e.primary?`${e.primary} principales`:`${e.secondary} secundarias`} · última exposición: {shortDate(e.lastDate)}</small></p>)}{!group.exercises.length&&<p>Sin series registradas para esta región en la semana.</p>}</>;})()}</div>}<p className="progress-note">Una serie puede aparecer en varias regiones. Participación secundaria no equivale al mismo estímulo; no se suman como series independientes ni se estima fatiga.{unclassified>0?` ${unclassified} series sin clasificar.`:''}</p></section>
    <section className="today-card"><h2>Esfuerzo · RIR</h2><p className="progress-note">{rated.length} {setEfforts.length ? 'series con RIR individual.' : 'registros con RIR global por ejercicio.'} {setEfforts.length > 0 && globalEfforts.length > 0 ? `${globalEfforts.length} registros globales antiguos se mantienen separados.` : ''}</p>{rated.length?<><div className="gym-effort-average">{(rated.reduce((n,value)=>n+value,0)/rated.length).toLocaleString('es-ES',{maximumFractionDigits:1})}<small> RIR medio</small></div>{buckets.map(b=><div className="gym-muscle-row" key={b.r}><span>RIR {b.r}{b.r===4?'+':''}</span><span className="gym-muscle-bar"><i style={{width:`${100*b.count/rated.length}%`,background:'var(--progress-amber)'}} /></span><strong>{b.count}</strong></div>)}</>:<p className="progress-note">Aparecerá cuando registres el esfuerzo.</p>}</section>

  </>;
}
