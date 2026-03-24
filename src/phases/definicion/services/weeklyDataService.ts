import { DefinicionSupabaseService } from './definicionSupabaseService';
import type {
  DefinicionWorkoutProgress,
  DefinicionBodyComposition,
  DefinicionCardioLog,
} from '../types/definicion';
import { getSubPhaseForWeek, getMesocycleInfo } from '../types/definicion';

// ========================================
// EXPORT/IMPORT JSON SCHEMA
// ========================================

export interface WeeklyExportData {
  version: '1.0';
  phase: 'definicion';
  exportDate: string;
  weekFrom: number;
  subPhase: string;
  mesocycle: string;
  workoutProgress: DefinicionWorkoutProgress[];
  bodyComposition: DefinicionBodyComposition | null;
  cardioLogs: DefinicionCardioLog[];
}

export interface WeeklyImportData {
  version: '1.0';
  phase: 'definicion';
  importDate: string;
  weekTo: number;
  workoutProgress: DefinicionWorkoutProgress[];
  bodyComposition?: DefinicionBodyComposition | null;
  cardioLogs?: DefinicionCardioLog[];
  coachNotes?: string;
}

// ========================================
// VALIDATION
// ========================================

function validateImportData(data: unknown): data is WeeklyImportData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  if (d.version !== '1.0') return false;
  if (d.phase !== 'definicion') return false;
  if (typeof d.weekTo !== 'number' || d.weekTo < 1 || d.weekTo > 22) return false;
  if (!Array.isArray(d.workoutProgress)) return false;

  for (const p of d.workoutProgress) {
    if (!p || typeof p !== 'object') return false;
    const prog = p as Record<string, unknown>;
    if (typeof prog.exerciseId !== 'string') return false;
    if (typeof prog.day !== 'string') return false;
    if (typeof prog.week !== 'number') return false;
    if (!Array.isArray(prog.weights)) return false;
    if (typeof prog.seriesCount !== 'number') return false;
  }

  return true;
}

// ========================================
// EXPORT
// ========================================

export function buildWeeklyExport(
  week: number,
  workoutProgress: DefinicionWorkoutProgress[],
  bodyComposition: DefinicionBodyComposition[],
  cardioLogs: DefinicionCardioLog[],
): WeeklyExportData {
  const subPhase = getSubPhaseForWeek(week);
  const meso = getMesocycleInfo(week);

  return {
    version: '1.0',
    phase: 'definicion',
    exportDate: new Date().toISOString(),
    weekFrom: week,
    subPhase: subPhase.nombre,
    mesocycle: meso.isDietBreak
      ? 'Diet Break'
      : `M${meso.mesocycleNumber}.${meso.weekInMesocycle}${meso.isDeload ? ' (Deload)' : ''}`,
    workoutProgress: workoutProgress.filter(p => p.week === week),
    bodyComposition: bodyComposition.find(b => b.week === week) || null,
    cardioLogs: cardioLogs.filter(l => l.week === week),
  };
}

export function downloadWeeklyExport(data: WeeklyExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `definicion-semana-${String(data.weekFrom).padStart(2, '0')}-export.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ========================================
// IMPORT
// ========================================

export interface ImportResult {
  success: boolean;
  message: string;
  imported: {
    workoutProgress: number;
    bodyComposition: boolean;
    cardioLogs: number;
  };
}

export async function importWeeklyData(jsonString: string): Promise<ImportResult> {
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return { success: false, message: 'JSON invalido', imported: { workoutProgress: 0, bodyComposition: false, cardioLogs: 0 } };
  }

  if (!validateImportData(data)) {
    return { success: false, message: 'Formato invalido. Verifica que el JSON tenga version "1.0", phase "definicion" y weekTo valido.', imported: { workoutProgress: 0, bodyComposition: false, cardioLogs: 0 } };
  }

  const result: ImportResult = {
    success: true,
    message: '',
    imported: { workoutProgress: 0, bodyComposition: false, cardioLogs: 0 },
  };

  try {
    // Import workout progress
    for (const progress of data.workoutProgress) {
      const entry: DefinicionWorkoutProgress = {
        exerciseId: progress.exerciseId,
        day: progress.day,
        week: data.weekTo,
        weights: progress.weights,
        seriesCount: progress.seriesCount,
        date: progress.date || new Date().toISOString(),
        isAlternative: progress.isAlternative || false,
        alternativeIndex: progress.alternativeIndex ?? null,
        observations: progress.observations || '',
        rir: progress.rir ?? null,
      };
      await DefinicionSupabaseService.addDefinicionWorkoutProgress(entry);
      result.imported.workoutProgress++;
    }

    // Import body composition
    if (data.bodyComposition) {
      await DefinicionSupabaseService.addDefinicionBodyComposition({
        ...data.bodyComposition,
        week: data.weekTo,
      });
      result.imported.bodyComposition = true;
    }

    // Import cardio logs
    if (data.cardioLogs) {
      for (const log of data.cardioLogs) {
        await DefinicionSupabaseService.addDefinicionCardioLog({
          ...log,
          week: data.weekTo,
        });
        result.imported.cardioLogs++;
      }
    }

    result.message = `Importado para semana ${data.weekTo}: ${result.imported.workoutProgress} ejercicios${result.imported.bodyComposition ? ', composicion corporal' : ''}${result.imported.cardioLogs > 0 ? `, ${result.imported.cardioLogs} cardio` : ''}`;
  } catch (error) {
    result.success = false;
    result.message = `Error al importar: ${error instanceof Error ? error.message : 'Error desconocido'}`;
  }

  return result;
}
