import { dateKey } from './progressData.js';
import type { TrainingSession } from '../training/trainingStorage.js';
export interface ActivityRow { id: number; record_type: string; source_package: string; start_time: string; end_time: string; exerciseType?: unknown; samples?: unknown; distance?: unknown; excluded?: boolean }
export interface WatchActivity {
  id:string; date:string; start:string; end:string; type:number|null; minutes:number;
  bpm:number|null; peakBpm:number|null; kmh:number|null; distanceKm:number|null;
  pulseSamples:number; speedSamples:number; coveredPulseMinutes:number; conflicts:number;
  timeline:{minute:number;bpm:number|null;kmh:number|null}[];
}
const numeric = (value:unknown,unit:string) => typeof value==='number'&&Number.isFinite(value)?value:value&&typeof value==='object'&&'unit' in value&&'value' in value&&value.unit===unit&&typeof value.value==='number'&&Number.isFinite(value.value)?value.value:null;
const average=(values:number[])=>values.length?values.reduce((n,v)=>n+v,0)/values.length:null;
const round=(v:number|null)=>v===null?null:Math.round(v*10)/10;
function sensorSamples(rows:ActivityRow[],field:'bpm'|'speed',start:number,end:number){
  const values=new Map<number,number|null>();let conflicts=0;
  for(const row of rows){if(!Array.isArray(row.samples))continue;
    for(const raw of row.samples){if(!raw||typeof raw!=='object'||typeof raw.time!=='string')continue;
      const time=Date.parse(raw.time);if(time<start||time>=end||!Number.isFinite(time))continue;
      const value=field==='bpm'?numeric(raw.beatsPerMinute??raw.bpm,'beats_per_minute'):numeric(raw.speed,'meter_per_second');
      if(value===null||value<0||value>(field==='bpm'?300:40)||(field==='bpm'&&value<1))continue;
      if(values.has(time)&&values.get(time)!==value){if(values.get(time)!==null)conflicts++;values.set(time,null);}else if(!values.has(time))values.set(time,value);
    }
  }
  return {values:[...values].flatMap(([time,value])=>value===null?[]:[{time,value:field==='speed'?value*3.6:value}]),conflicts};
}
/** Summarize only inside recorded exercise windows. Exact duplicate samples are counted once. */
export function summarizeActivities(rows:ActivityRow[],from:string,to:string):WatchActivity[]{
  const clean=rows.filter(r=>!r.excluded&&r.source_package==='com.sec.android.app.shealth'&&Number.isFinite(Date.parse(r.start_time))&&Number.isFinite(Date.parse(r.end_time)));
  const sessions=clean.filter(r=>r.record_type==='exercise_session'&&r.end_time>r.start_time&&dateKey(new Date(r.start_time))>=from&&dateKey(new Date(r.start_time))<=to);
  const seen=new Set<string>();
  return sessions.flatMap(row=>{
    const start=Date.parse(row.start_time),end=Date.parse(row.end_time),minutes=(end-start)/60000,type=numeric(row.exerciseType,'code');
    if(minutes<=0||minutes>1440)return [];
    const key=`${start}:${end}:${type}`;if(seen.has(key))return [];seen.add(key);
    const overlapping=clean.filter(r=>Date.parse(r.end_time)>=start&&Date.parse(r.start_time)<end);
    const pulse=sensorSamples(overlapping.filter(r=>r.record_type==='heart_rate'),'bpm',start,end),speed=sensorSamples(overlapping.filter(r=>r.record_type==='speed'),'speed',start,end);
    // Scalar distance cannot be split proportionally. Only a matching exercise interval is usable.
    const distances=overlapping.filter(r=>r.record_type==='distance'&&Date.parse(r.start_time)===start&&Date.parse(r.end_time)===end).map(r=>numeric(r.distance,'meter')).filter((v):v is number=>v!==null&&v>=0);
    const uniqueDistances=[...new Set(distances)];
    const buckets=Math.ceil(minutes),width=Math.max(1,Math.ceil(buckets/180));
    const timeline=Array.from({length:Math.ceil(buckets/width)},(_,i)=>({minute:i*width,
      bpm:round(average(pulse.values.filter(p=>p.time>=start+i*width*60000&&p.time<start+(i+1)*width*60000).map(p=>p.value))),
      kmh:round(average(speed.values.filter(p=>p.time>=start+i*width*60000&&p.time<start+(i+1)*width*60000).map(p=>p.value)))}));
    return [{id:String(row.id),date:dateKey(new Date(row.start_time)),start:row.start_time,end:row.end_time,type,minutes:round(minutes)!,
      bpm:round(average(pulse.values.map(p=>p.value))),peakBpm:pulse.values.length?pulse.values.reduce((n,p)=>Math.max(n,p.value),0):null,
      kmh:round(average(speed.values.map(p=>p.value))),distanceKm:uniqueDistances.length===1?round(uniqueDistances[0]/1000):null,
      pulseSamples:pulse.values.length,speedSamples:speed.values.length,coveredPulseMinutes:new Set(pulse.values.map(p=>Math.floor((p.time-start)/60000))).size,
      conflicts:pulse.conflicts+speed.conflicts,timeline}];
  }).sort((a,b)=>b.start.localeCompare(a.start));
}
export const activityName=(type:number|null)=>type===57?'Cinta':type===79?'Caminata':type===56?'Carrera':'Actividad del reloj';
/** Date and duration produce candidates, not a proven temporal match: Coach has no start time. */
export function cardioCandidates(session:TrainingSession,activities:WatchActivity[]){
  if(!session.cardio)return [];
  const minutes=session.cardio.warmupMinutes+session.cardio.moderateMinutes+session.cardio.cooldownMinutes;
  return activities.filter(a=>a.date===session.performedOn&&[57,79].includes(a.type??-1)&&Math.abs(a.minutes-minutes)<=Math.max(5,minutes*.15));
}
export function comparableCardio(activity:WatchActivity,activities:WatchActivity[]){
  if(activity.kmh===null||activity.bpm===null||activity.conflicts||activity.coveredPulseMinutes<activity.minutes*.7)return [];
  return activities.filter(a=>a.id!==activity.id&&a.start<activity.start&&a.type===activity.type&&a.kmh!==null&&a.bpm!==null&&!a.conflicts&&a.coveredPulseMinutes>=a.minutes*.7&&Math.abs(a.minutes-activity.minutes)<=activity.minutes*.1&&Math.abs(a.kmh!-activity.kmh!)<=.5);
}
