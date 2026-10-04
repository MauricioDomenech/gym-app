import type { TrainingSession } from '../training/trainingStorage.js';
import { workSets } from '../training/trainingStorage.js';
/** Curated for Coach's variants. Counts of participating sets, not physiological stimulus. */
const primary: Record<string, number[]> = {
  Pecho:[1,2,3,4,5,6,7,8,41,42,43,44], Hombros:[9,10,21,22,23,37,38,39,40,69],
  Tríceps:[11,12,13,14,45,46,71,72], Abdomen:[15,64,74,75], Oblicuos:[16],
  Espalda:[17,18,19,20,47,48,49,50,51,66], Lumbar:[34], Trapecio:[],
  Bíceps:[24,25,26,52,53,54,55,70], Antebrazos:[27,28,56,57,76,77,78,79,80],
  Cuádriceps:[29,30,33,60,61,62,65], Isquiotibiales:[31,32,67,68], Glúteos:[58,59], Gemelos:[35,36,63,73],
};
const secondary: Record<string, number[]> = {
  Hombros:[1,2,3,4,5,6,7,8,19,20,41,42,43,44,49,50,66], Tríceps:[1,2,3,41,42],
  Bíceps:[17,18,19,20,47,48,49,50,66], Antebrazos:[24,25,26,28,52,53,54,55,57,67,68,70],
  Trapecio:[19,20,21,22,23,39,40,49,50,57,66,69], Espalda:[21,22,23,69],
  Abdomen:[16,57], Oblicuos:[64], Glúteos:[29,30,33,34,60,61,65,67,68],
  Isquiotibiales:[34,58,59], Lumbar:[67,68],
};
export const muscleRegions = Object.keys(primary);
export function exerciseMuscles(id: string) {
  const index=Number(id.split('.').at(-1));
  return {primary:Object.keys(primary).filter(g=>primary[g].includes(index)),secondary:Object.keys(secondary).filter(g=>secondary[g].includes(index))};
}
export function muscleDistribution(sessions: TrainingSession[]) {
  return muscleRegions.map(region=>{
    const exercises=new Map<string,{id:string;primary:number;secondary:number;lastDate:string}>();
    for(const session of sessions)for(const log of session.logs){
      const muscles=exerciseMuscles(log.exerciseId),sets=workSets(log).length;
      if(!muscles.primary.includes(region)&&!muscles.secondary.includes(region))continue;
      const value=exercises.get(log.exerciseId)??{id:log.exerciseId,primary:0,secondary:0,lastDate:session.performedOn};
      if(muscles.primary.includes(region))value.primary+=sets;else value.secondary+=sets;
      if(session.performedOn>value.lastDate)value.lastDate=session.performedOn;
      exercises.set(log.exerciseId,value);
    }
    const rows=[...exercises.values()];return {region,primary:rows.reduce((n,r)=>n+r.primary,0),secondary:rows.reduce((n,r)=>n+r.secondary,0),exercises:rows};
  });
}
