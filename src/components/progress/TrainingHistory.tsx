import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import catalog from '../training/exerciseCatalog.json';
import { dayForMadrid, loadTrainingPlan } from '../training/trainingPlan';
import { acceptTrainingResponse, trainingSnapshot } from '../training/trainingConnection';
import { createTrainingRemoteClient, makeTrainingWriteRequest, TrainingSyncError } from '../training/trainingSync';
import { blankSet, draftFromSet, parseSetDraft, sessionSummary } from '../training/trainingInsights';
import type { SetDraft } from '../training/trainingInsights';
import { formatTrainingSet, isLogFinished, trainingId, validDate } from '../training/trainingStorage';
import type { TrainingData, TrainingLog, TrainingSession } from '../training/trainingStorage';
import { shortDate } from './progressData';

const name = (id: string) => catalog.find(e => e.id === id)?.name ?? id;
export function TrainingHistory({ data, today, onSaved, onDirtyChange }: { data: TrainingData; today: string; onSaved: (data: TrainingData) => void; onDirtyChange?: (dirty: boolean) => void }) {
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [newDate, setNewDate] = useState('');
  const [loadingPast, setLoadingPast] = useState(false);
  const [slotId, setSlotId] = useState('');
  const [variant, setVariant] = useState('');
  const [sets, setSets] = useState<SetDraft[]>([]);
  const [loadType, setLoadType] = useState<TrainingLog['loadType']>('external');
  const [rir, setRir] = useState(''), [comment,setComment] = useState('');
  const [status,setStatus] = useState<TrainingLog['status']>('completed');
  const [excluded,setExcluded] = useState(false);
  const [cardio,setCardio] = useState({warmup:'',moderate:'',cooldown:'',comment:''});
  const [dirty,setDirty] = useState(false), [saving,setSaving] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [limit,setLimit] = useState(12);
  const base = useRef(trainingSnapshot());
  const busy = useRef(false);
  const client = useRef(createTrainingRemoteClient());
  useEffect(() => { onDirtyChange?.(dirty || saving); return () => onDirtyChange?.(false); }, [dirty,saving,onDirtyChange]);
  useEffect(() => { const protect = (e: BeforeUnloadEvent) => { if(dirty||saving){e.preventDefault();e.returnValue='';} }; window.addEventListener('beforeunload',protect); return()=>window.removeEventListener('beforeunload',protect); },[dirty,saving]);
  const sessions = [...data.sessions].sort((a,b)=>b.performedOn.localeCompare(a.performedOn));
  const choose = (target: TrainingSession, id: string) => {
    const item = target.plannedItems?.find(i=>i.id===id);
    const log = target.logs.find(l=>item ? l.plannedItemId===id || (!l.plannedItemId && l.exerciseId===item.exerciseId) : l.exerciseId===id);
    setSlotId(id); setVariant(log?.exerciseId ?? item?.exerciseId ?? id);
    setSets(log?.sets.map(s=>draftFromSet(s,true)) ?? [blankSet()]); setLoadType(log?.loadType ?? 'external');
    setRir(log?.rir==null?'':String(log.rir));setComment(log?.comment??'');setStatus(log?.status??'completed');setExcluded(log?.excludeFromProgression??false);
    setCardio({warmup:target.cardio?String(target.cardio.warmupMinutes):'',moderate:target.cardio?String(target.cardio.moderateMinutes):'',cooldown:target.cardio?String(target.cardio.cooldownMinutes):'',comment:target.cardio?.comment??''});
    setDirty(false);setError('');setNotice('');
  };
  const open = (target: TrainingSession) => {
    if (dirty && !window.confirm('¿Descartar los cambios sin guardar?')) return;
    base.current = trainingSnapshot();setSession(structuredClone(target));choose(target,target.plannedItems?.[0]?.id ?? target.exerciseIds[0] ?? 'cardio');
  };
  const addPast = async () => {
    if (!validDate(newDate) || newDate >= today) {setError('Elegí una fecha anterior a hoy.');return;}
    const existing = data.sessions.find(s=>s.performedOn===newDate);
    if(existing){open(existing);return;}
    if(loadingPast)return;
    setLoadingPast(true);setError('');
    try{
      const historicalPlan=await loadTrainingPlan(undefined,newDate);
      if(!historicalPlan.effectiveFrom || historicalPlan.effectiveFrom>newDate)throw Error('No hay una prescripción verificada para esa fecha.');
      const day=dayForMadrid(historicalPlan,new Date(`${newDate}T12:00:00Z`)), plan=day?.sessions[0];
      if(!day || !plan)throw Error('Esa fecha era un descanso del plan; no voy a inventar una sesión.');
      open({id:trainingId(),performedOn:newDate,exerciseIds:plan.items.map(i=>i.exerciseId),logs:[],finishedAt:null,mode:'prepared',routineId:historicalPlan.id,routineDayId:day.id,routineSessionId:plan.id,planVersion:historicalPlan.version,plannedItems:structuredClone(plan.items),plannedCardio:plan.cardio?structuredClone(plan.cardio):undefined});
    }catch(cause){setError(cause instanceof Error?cause.message:'No pude consultar el plan de esa fecha.');}
    finally{setLoadingPast(false);}
  };
  async function save(event: FormEvent) {
    event.preventDefault();if(!session || busy.current)return;
    setError('');setNotice('');
    try {
      const next=structuredClone(session), now=new Date().toISOString();
      if(slotId==='cardio'){
        const numbers=[cardio.warmup,cardio.moderate,cardio.cooldown];
        if(numbers.some(v=>!v.trim() || !Number.isInteger(Number(v)) || Number(v)<0 || Number(v)>1440))throw Error('Indicá minutos enteros entre 0 y 1440 en los tres bloques.');
        next.cardio={warmupMinutes:Number(cardio.warmup),moderateMinutes:Number(cardio.moderate),cooldownMinutes:Number(cardio.cooldown),plannedModerateMinutes:session.plannedCardio?.moderateMinutes??session.cardio?.plannedModerateMinutes??0,comment:cardio.comment,status:Number(cardio.moderate)>=(session.plannedCardio?.moderateMinutes??0)?'completed':'partial',updatedAt:now};
      } else {
        const item=session.plannedItems?.find(i=>i.id===slotId), old=session.logs.find(l=>item?l.plannedItemId===slotId || (!l.plannedItemId && l.exerciseId===item.exerciseId):l.exerciseId===slotId);
        const value=rir.trim()?Number(rir):null;
        if(value!==null && (!Number.isInteger(value)||value<0||value>10))throw Error('El RIR debe estar entre 0 y 10.');
        const log:TrainingLog={...old,exerciseId:variant,...(item?{plannedItemId:item.id}:{}),loadType,sets:sets.map(s=>parseSetDraft(s,loadType)),rir:value,status,comment,excludeFromProgression:excluded,recording:'finished',updatedAt:now};
        next.logs=[...next.logs.filter(l=>item?l.plannedItemId!==item.id && (l.plannedItemId || l.exerciseId!==item.exerciseId):l.exerciseId!==slotId),log];
      }
      const previous=base.current;
      const noteKey=slotId==='cardio'?null:`record-${session.id}-${variant}`;
      const exerciseNotes=previous.data.exerciseNotes.flatMap(note=>{
        if(note.id!==noteKey)return [note];
        return comment.trim()?[{...note,text:comment,updatedAt:now}]:[];
      });
      const newData={...previous.data,exerciseNotes,sessions:[...previous.data.sessions.filter(s=>s.id!==next.id),next],skippedDates:previous.data.skippedDates?.filter(d=>d!==next.performedOn)};
      busy.current=true;setSaving(true);
      const response=await client.current.write(makeTrainingWriteRequest(newData,previous.revision));
      acceptTrainingResponse(response);base.current=response;onSaved(response.data);setSession(next);choose(next,slotId);setNotice('Corrección guardada. Las estadísticas se recalcularon.');
    } catch(cause){
      if(cause instanceof TrainingSyncError && cause.code==='conflict'){
        try{const latest=await client.current.read();acceptTrainingResponse(latest);onSaved(trainingSnapshot().data);}catch{/* Keep the original draft and revision; never overwrite an unknown newer state. */}
        setError('Los registros cambiaron en otro lugar. Cerrá este editor y volvé a abrir la sesión para revisar el estado actual; no sobrescribí nada.');
      }else setError(cause instanceof TrainingSyncError?'No pude confirmar el guardado. Tus cambios siguen aquí para reintentar.':cause instanceof Error?cause.message:'Revisá los datos.');
    } finally{busy.current=false;setSaving(false);}
  }
  const item=session?.plannedItems?.find(i=>i.id===slotId);
  const fields=(session?.plannedItems?.length ? session.plannedItems.map(i=>({id:i.id,label:name(i.exerciseId)})):session?.exerciseIds.map(id=>({id,label:name(id)})))??[];
  if(session?.plannedCardio || session?.cardio)fields.push({id:'cardio',label:'Cardio'});
  return <section className="today-card progress-card coach-history" id="training-history"><h2>Historial de sesiones</h2><p className="progress-note">Todos tus registros. Las correcciones se guardan en tu cuenta y actualizan los gráficos. Hoy se registra desde Entrenamiento.</p>
    {!session && <details><summary>Añadir una sesión olvidada</summary><label className="progress-field">Fecha<input type="date" disabled={loadingPast} max={new Date(Date.parse(`${today}T12:00:00Z`)-86400000).toISOString().slice(0,10)} value={newDate} onChange={e=>setNewDate(e.target.value)} /></label><button type="button" className="today-secondary-button" disabled={loadingPast} onClick={addPast}>{loadingPast?'Consultando plan…':'Abrir fecha'}</button><p className="progress-note">Sin duplicados ni datos precargados como hechos. Sólo se usa un plan verificado para esa fecha.</p></details>}
    {error&&<p role="alert" className="training-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {session?<form onSubmit={save}><fieldset disabled={saving} className="training-fieldset"><button type="button" className="training-back" onClick={()=>{if(!dirty||window.confirm('¿Descartar los cambios sin guardar?')){setSession(null);setDirty(false);setError('');}}}>← Cerrar editor</button><h3>{shortDate(session.performedOn)} · corregir registro</h3>
      <label>Ejercicio o cardio<select value={slotId} onChange={e=>{if(!dirty||window.confirm('¿Descartar los cambios sin guardar?'))choose(session,e.target.value);}}>{fields.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
      {slotId==='cardio'?<>{(['warmup','moderate','cooldown'] as const).map((key,i)=><label key={key}>{['Entrada suave','Moderados','Salida suave'][i]} · minutos<input inputMode="numeric" value={cardio[key]} onChange={e=>{setCardio({...cardio,[key]:e.target.value});setDirty(true);}} /></label>)}<label>Comentario<textarea maxLength={2000} value={cardio.comment} onChange={e=>{setCardio({...cardio,comment:e.target.value});setDirty(true);}} /></label></>:<>
        {item?.alternatives?.length ? <label>Variante realizada<select value={variant} onChange={e=>{if(!window.confirm('Cambiar de variante vaciará las series de este editor. ¿Continuar?'))return;setVariant(e.target.value);setSets([blankSet()]);setDirty(true);}}><option value={item.exerciseId}>{name(item.exerciseId)}</option>{item.alternatives.map(a=><option key={a.exerciseId} value={a.exerciseId}>{name(a.exerciseId)}</option>)}</select></label>:null}
        <label>Tipo de carga<select value={loadType} onChange={e=>{if(!window.confirm('¿Cambiar el tipo de carga? Revisá las cargas antes de guardar.'))return;setLoadType(e.target.value as TrainingLog['loadType']);setDirty(true);}}><option value="external">Carga externa</option><option value="bodyweight">Peso corporal · sólo lastre</option></select></label>
        {sets.map((row,index)=><div key={index} className="coach-history-set"><strong>Serie {index+1}</strong><div className="training-tool-fields">{(['loadKg','reps','rir'] as const).map((key,i)=><label key={key}>{['Carga/lastre · kg','Repeticiones','RIR opcional'][i]}<input aria-label={`${['Carga','Reps','RIR'][i]} histórica ${index+1}`} inputMode={key==='loadKg'?'decimal':'numeric'} value={row[key]} onChange={e=>{setSets(sets.map((s,n)=>n===index?{...s,[key]:e.target.value}:s));setDirty(true);}} /></label>)}<label>Tipo<select value={row.kind} onChange={e=>{setSets(sets.map((s,n)=>n===index?{...s,kind:e.target.value as SetDraft['kind']}:s));setDirty(true);}}><option value="work">Trabajo</option><option value="warmup">Calentamiento</option></select></label></div><button type="button" disabled={sets.length===1} onClick={()=>{setSets(sets.filter((_,n)=>n!==index));setDirty(true);}}>Quitar serie {index+1}</button></div>)}
        <button type="button" disabled={sets.length>=30} onClick={()=>{setSets([...sets,blankSet()]);setDirty(true);}}>Añadir serie realizada</button>
        <label>RIR global · opcional<input inputMode="numeric" value={rir} onChange={e=>{setRir(e.target.value);setDirty(true);}} /></label><label>Estado<select value={status} onChange={e=>{setStatus(e.target.value as TrainingLog['status']);setDirty(true);}}><option value="completed">Completado</option><option value="partial">Parcial</option></select></label><label>Comentario<textarea maxLength={2000} value={comment} onChange={e=>{setComment(e.target.value);setDirty(true);}} /></label><label className="coach-checkbox"><input type="checkbox" checked={excluded} onChange={e=>{setExcluded(e.target.checked);setDirty(true);}} />Excluir de sugerencias de progresión</label>
      </>}
      <button className="today-primary-button" type="submit">{saving?'Guardando…':'Guardar corrección'}</button><p className="progress-note">Se guarda este ejercicio o cardio, sin alterar el resto de la sesión. No se inventa la hora de ejecución de una serie histórica.</p>
    </fieldset></form>:<>{sessions.slice(0,limit).map(s=><details className="gym-recent" key={s.id}><summary><span>{shortDate(s.performedOn)}<small>{s.logs.length?'Fuerza':'Cardio'}{s.logs.some(l=>!isLogFinished(l))?' · sin terminar':''}</small></span><strong>{sessionSummary(s).sets} series</strong></summary>{s.logs.map((l,index)=><div className="coach-history-log" key={`${l.exerciseId}-${index}`}><strong>{name(l.exerciseId)}</strong><p>{l.sets.map(set=>formatTrainingSet(set,l.loadType)).join(' · ')}</p>{l.comment&&<p>{l.comment}</p>}{l.excludeFromProgression&&<small>Excluido de progresión</small>}</div>)}{s.cardio&&<p>Cardio: {s.cardio.warmupMinutes} + {s.cardio.moderateMinutes} moderados + {s.cardio.cooldownMinutes} min</p>}{s.performedOn<today&&<button type="button" className="today-secondary-button" onClick={()=>open(s)}>Corregir sesión del {shortDate(s.performedOn)}</button>}</details>)}{sessions.length>limit&&<button onClick={()=>setLimit(limit+12)}>Ver más sesiones</button>}{!sessions.length&&<p>Todavía no hay sesiones.</p>}</>}
  </section>;
}
