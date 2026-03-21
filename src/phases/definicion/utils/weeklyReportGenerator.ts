import {
  getSubPhaseForWeek,
  getMesocycleInfo,
} from '../types/definicion';
import type {
  DefinicionWorkoutProgress,
  DefinicionWorkoutDay,
  DefinicionBodyComposition,
  DefinicionCardioLog,
  DefinicionDayNutrition,
} from '../types/definicion';

const DAYS_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DAYS_LABELS: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miercoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sabado', domingo: 'Domingo',
};

interface ReportParams {
  week: number;
  workoutProgress: DefinicionWorkoutProgress[];
  workoutData: { [week: number]: { [day: string]: DefinicionWorkoutDay } };
  bodyComposition: DefinicionBodyComposition[];
  cardioLogs: DefinicionCardioLog[];
  nutritionData: { [week: number]: { [day: string]: DefinicionDayNutrition } };
}

export function generateWeeklyReport(params: ReportParams): string {
  const { week, workoutProgress, workoutData, bodyComposition, cardioLogs, nutritionData } = params;

  const subPhase = getSubPhaseForWeek(week);
  const mesocycle = getMesocycleInfo(week);
  const weekProgress = workoutProgress.filter(p => p.week === week);
  const weekCardio = cardioLogs.filter(l => l.week === week);
  const bodyEntry = bodyComposition.find(b => b.week === week);
  const prevBodyEntry = bodyComposition
    .filter(b => b.week < week)
    .sort((a, b) => b.week - a.week)[0] || null;

  const lines: string[] = [];
  const now = new Date();

  // Header
  lines.push(`# Reporte Semanal — Semana ${week}`);
  lines.push('');
  lines.push(`- **Fecha**: ${now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push(`- **Sub-fase**: ${subPhase.nombre} (${subPhase.kcalDiarias} kcal/dia${subPhase.deficit > 0 ? `, deficit ${subPhase.deficit} kcal` : ''})`);
  lines.push(`- **Mesociclo**: ${mesocycle.isDietBreak ? 'Diet Break' : `M${mesocycle.mesocycleNumber} — Semana ${mesocycle.weekInMesocycle}`}${mesocycle.isDeload ? ' (DELOAD)' : ''}`);
  lines.push('');

  // Body composition
  lines.push('## Composicion corporal');
  lines.push('');
  if (bodyEntry) {
    lines.push(`| Medida | Valor |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Peso | ${bodyEntry.peso} kg |`);
    if (prevBodyEntry) {
      const diff = bodyEntry.peso - prevBodyEntry.peso;
      lines.push(`| Cambio vs S${prevBodyEntry.week} | ${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg |`);
    }
    if (bodyEntry.grasaCorporal) lines.push(`| Grasa corporal | ${bodyEntry.grasaCorporal}% |`);
    if (bodyEntry.cintura) lines.push(`| Cintura | ${bodyEntry.cintura} cm |`);
    if (bodyEntry.cadera) lines.push(`| Cadera | ${bodyEntry.cadera} cm |`);
    if (bodyEntry.pecho) lines.push(`| Pecho | ${bodyEntry.pecho} cm |`);
    if (bodyEntry.brazo) lines.push(`| Brazo | ${bodyEntry.brazo} cm |`);
    if (bodyEntry.muslo) lines.push(`| Muslo | ${bodyEntry.muslo} cm |`);
    if (bodyEntry.notas) {
      lines.push('');
      lines.push(`**Notas**: ${bodyEntry.notas}`);
    }
  } else {
    lines.push('*No se registro peso esta semana.*');
  }
  lines.push('');

  // Training
  lines.push('## Entrenamiento');
  lines.push('');

  const weekWorkouts = workoutData[week];
  let totalExercisesPlanned = 0;
  let totalExercisesDone = 0;

  for (const day of DAYS_ORDER) {
    const dayWorkout = weekWorkouts?.[day];
    if (!dayWorkout) continue;

    totalExercisesPlanned += dayWorkout.exercises.length;
    const dayExerciseIds = new Set(dayWorkout.exercises.map(e => e.id));
    const dayProgress = weekProgress.filter(p => p.day === day && dayExerciseIds.has(p.exerciseId));
    totalExercisesDone += Math.min(dayProgress.length, dayWorkout.exercises.length);

    lines.push(`### ${DAYS_LABELS[day]} — ${dayWorkout.tipo}`);
    lines.push('');

    if (dayProgress.length === 0) {
      lines.push('*Sin datos registrados.*');
      lines.push('');
      continue;
    }

    lines.push(`| Ejercicio | Series | Pesos (kg) | RIR | Observaciones |`);
    lines.push(`|-----------|--------|------------|-----|---------------|`);

    for (const exercise of dayWorkout.exercises) {
      const progress = dayProgress.find(p => p.exerciseId === exercise.id);
      if (!progress) {
        lines.push(`| ${exercise.name} | — | — | — | *No registrado* |`);
        continue;
      }

      const weightsStr = progress.weights.filter(w => w > 0).map((w, i) => `S${i + 1}:${w}`).join(', ') || '—';
      const rirStr = progress.rir != null ? `${progress.rir} (${progress.rir === 0 ? 'Al limite' : progress.rir === 1 ? 'Duro' : progress.rir === 2 ? 'Moderado' : 'Facil'})` : '—';
      const obsStr = progress.observations?.trim() || '—';

      lines.push(`| ${exercise.name} | ${progress.seriesCount} | ${weightsStr} | ${rirStr} | ${obsStr} |`);
    }
    lines.push('');
  }

  // Training summary
  const rirValues = weekProgress.filter(p => p.rir != null).map(p => p.rir as number);
  const avgRir = rirValues.length > 0 ? (rirValues.reduce((a, b) => a + b, 0) / rirValues.length) : null;

  lines.push(`**Resumen entrenamiento**: ${totalExercisesDone}/${totalExercisesPlanned} ejercicios completados (${totalExercisesPlanned > 0 ? Math.round((totalExercisesDone / totalExercisesPlanned) * 100) : 0}%)`);
  if (avgRir !== null) {
    lines.push(`**RIR promedio**: ${avgRir.toFixed(1)} — ${avgRir >= 1 && avgRir <= 2 ? 'Zona ideal' : avgRir < 1 ? 'Intensidad muy alta' : 'Podria empujar mas'}`);
  }
  lines.push('');

  // Strength tracking (top weight per compound)
  const compoundExercises = weekProgress.filter(p => {
    const dayWorkout = weekWorkouts?.[p.day];
    if (!dayWorkout) return false;
    const idx = dayWorkout.exercises.findIndex(e => e.id === p.exerciseId);
    return idx === 0; // first exercise of each day = compound
  });

  if (compoundExercises.length > 0) {
    lines.push('### Pesos maximos en compuestos');
    lines.push('');
    lines.push('| Ejercicio | Peso maximo | RIR |');
    lines.push('|-----------|------------|-----|');
    for (const progress of compoundExercises) {
      const dayWorkout = weekWorkouts?.[progress.day];
      const exercise = dayWorkout?.exercises.find(e => e.id === progress.exerciseId);
      if (!exercise) continue;
      const positiveWeights = progress.weights.filter(w => w > 0);
      if (positiveWeights.length === 0) continue;
      const maxWeight = Math.max(...positiveWeights);

      // Compare to previous weeks
      const prevWeekProgress = workoutProgress
        .filter(p => p.exerciseId === progress.exerciseId && p.week < week && p.weights.some(w => w > 0))
        .sort((a, b) => b.week - a.week)[0];
      const prevMax = prevWeekProgress ? Math.max(...prevWeekProgress.weights.filter(w => w > 0)) : null;
      const diff = prevMax ? maxWeight - prevMax : null;
      const diffStr = diff !== null ? ` (${diff > 0 ? '+' : ''}${diff}kg vs S${prevWeekProgress!.week})` : '';

      lines.push(`| ${exercise.name} | ${maxWeight}kg${diffStr} | ${progress.rir != null ? progress.rir : '—'} |`);
    }
    lines.push('');
  }

  // Cardio
  lines.push('## Cardio');
  lines.push('');
  if (weekCardio.length > 0) {
    lines.push('| Dia | Tipo | Duracion | Completado | Notas |');
    lines.push('|-----|------|----------|------------|-------|');
    for (const log of weekCardio.sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day))) {
      lines.push(`| ${DAYS_LABELS[log.day] || log.day} | ${log.tipo.toUpperCase()} | ${log.duracionMinutos} min | ${log.completado ? 'Si' : 'No'} | ${log.notas || '—'} |`);
    }
    const totalMin = weekCardio.filter(l => l.completado).reduce((sum, l) => sum + l.duracionMinutos, 0);
    lines.push('');
    lines.push(`**Total cardio completado**: ${totalMin} minutos`);
  } else {
    lines.push('*Sin sesiones de cardio registradas.*');
  }
  lines.push('');

  // Nutrition summary
  lines.push('## Nutricion (plan programado)');
  lines.push('');
  const weekNutrition = nutritionData[week];
  if (weekNutrition) {
    let totalKcal = 0, totalProt = 0, totalCarbs = 0, totalFat = 0;
    let dayCount = 0;
    for (const day of DAYS_ORDER) {
      const dayNutrition = weekNutrition[day];
      if (dayNutrition) {
        totalKcal += dayNutrition.totals.kcal;
        totalProt += dayNutrition.totals.proteinas_g;
        totalCarbs += dayNutrition.totals.carbohidratos_g;
        totalFat += dayNutrition.totals.grasas_g;
        dayCount++;
      }
    }
    if (dayCount > 0) {
      lines.push(`| Macro | Promedio diario |`);
      lines.push(`|-------|----------------|`);
      lines.push(`| Calorias | ${Math.round(totalKcal / dayCount)} kcal |`);
      lines.push(`| Proteina | ${Math.round(totalProt / dayCount)}g |`);
      lines.push(`| Carbohidratos | ${Math.round(totalCarbs / dayCount)}g |`);
      lines.push(`| Grasas | ${Math.round(totalFat / dayCount)}g |`);
    }
  } else {
    lines.push('*Sin datos de nutricion para esta semana.*');
  }
  lines.push('');

  // Historical context
  const allBodySorted = bodyComposition
    .filter(b => b.week <= week)
    .sort((a, b) => a.week - b.week);

  if (allBodySorted.length >= 2) {
    lines.push('## Tendencia de peso');
    lines.push('');
    lines.push('| Semana | Peso | Cambio |');
    lines.push('|--------|------|--------|');
    for (const entry of allBodySorted.slice(-5)) {
      const prevEntry = allBodySorted.find(b => b.week < entry.week && allBodySorted.indexOf(b) === allBodySorted.indexOf(entry) - 1);
      const change = prevEntry ? entry.peso - prevEntry.peso : null;
      lines.push(`| S${entry.week} | ${entry.peso} kg | ${change !== null ? `${change > 0 ? '+' : ''}${change.toFixed(1)} kg` : '—'} |`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*Generado el ${now.toISOString().slice(0, 16).replace('T', ' ')}*`);

  return lines.join('\n');
}

export function getReportFilename(week: number): string {
  return `semana-${String(week).padStart(2, '0')}.md`;
}

export function downloadReport(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
