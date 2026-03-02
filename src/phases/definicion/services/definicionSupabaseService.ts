import { supabase } from '../../../utils/supabase/client';
import type { DefinicionWorkoutProgress, DefinicionShoppingList, DefinicionTableColumn, DefinicionBodyComposition, DefinicionCardioLog } from '../types/definicion';
import { DEFAULT_TABLE_COLUMNS } from '../types/definicion';

export class DefinicionSupabaseService {
  // ========================================
  // WORKOUT PROGRESS
  // ========================================

  public static async getDefinicionWorkoutProgress(): Promise<DefinicionWorkoutProgress[]> {
    const { data, error } = await supabase
      .from('definicion_workout_progress')
      .select('*');

    if (error) throw error;

    return (data || []).map(row => ({
      exerciseId: row.exercise_id,
      day: row.day,
      week: row.week,
      weights: row.weights || [],
      seriesCount: row.series_count || row.weights?.length || 3,
      date: row.date,
      isAlternative: row.is_alternative || false,
      alternativeIndex: row.alternative_index,
      observations: row.observations || '',
      rpeActual: row.rpe_actual,
    }));
  }

  public static async addDefinicionWorkoutProgress(progress: DefinicionWorkoutProgress): Promise<void> {
    let deleteQuery = supabase
      .from('definicion_workout_progress')
      .delete()
      .eq('exercise_id', progress.exerciseId)
      .eq('day', progress.day)
      .eq('week', progress.week)
      .eq('is_alternative', progress.isAlternative);

    if (progress.alternativeIndex !== undefined && progress.alternativeIndex !== null) {
      deleteQuery = deleteQuery.eq('alternative_index', progress.alternativeIndex);
    } else {
      deleteQuery = deleteQuery.is('alternative_index', null);
    }

    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from('definicion_workout_progress')
      .insert({
        exercise_id: progress.exerciseId,
        day: progress.day,
        week: progress.week,
        weights: progress.weights,
        series_count: progress.seriesCount,
        date: progress.date,
        is_alternative: progress.isAlternative,
        alternative_index: progress.alternativeIndex === undefined ? null : progress.alternativeIndex,
        observations: progress.observations || '',
        rpe_actual: progress.rpeActual === undefined ? null : progress.rpeActual,
      });

    if (insertError) throw insertError;
  }

  // ========================================
  // SHOPPING LISTS
  // ========================================

  public static async getDefinicionShoppingLists(): Promise<DefinicionShoppingList[]> {
    const { data, error } = await supabase
      .from('definicion_shopping_lists')
      .select('*');

    if (error) throw error;

    return (data || []).map(row => ({
      selectedWeeks: row.selected_weeks,
      selectedDays: row.selected_days,
      items: row.items,
      generatedDate: row.generated_date,
    }));
  }

  public static async addDefinicionShoppingList(list: DefinicionShoppingList): Promise<void> {
    const { error } = await supabase
      .from('definicion_shopping_lists')
      .insert({
        selected_weeks: list.selectedWeeks,
        selected_days: list.selectedDays,
        items: list.items,
        generated_date: list.generatedDate,
      });

    if (error) throw error;
  }

  // ========================================
  // BODY COMPOSITION
  // ========================================

  public static async getDefinicionBodyComposition(): Promise<DefinicionBodyComposition[]> {
    const { data, error } = await supabase
      .from('definicion_body_composition')
      .select('*')
      .order('week', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      week: row.week,
      date: row.date,
      peso: row.peso,
      grasaCorporal: row.grasa_corporal,
      cintura: row.cintura,
      cadera: row.cadera,
      pecho: row.pecho,
      brazo: row.brazo,
      muslo: row.muslo,
      notas: row.notas || '',
    }));
  }

  public static async addDefinicionBodyComposition(entry: DefinicionBodyComposition): Promise<void> {
    // Delete existing for this week
    await supabase
      .from('definicion_body_composition')
      .delete()
      .eq('week', entry.week);

    const { error } = await supabase
      .from('definicion_body_composition')
      .insert({
        week: entry.week,
        date: entry.date,
        peso: entry.peso,
        grasa_corporal: entry.grasaCorporal || null,
        cintura: entry.cintura || null,
        cadera: entry.cadera || null,
        pecho: entry.pecho || null,
        brazo: entry.brazo || null,
        muslo: entry.muslo || null,
        notas: entry.notas || '',
      });

    if (error) throw error;
  }

  // ========================================
  // CARDIO LOGS
  // ========================================

  public static async getDefinicionCardioLogs(): Promise<DefinicionCardioLog[]> {
    const { data, error } = await supabase
      .from('definicion_cardio_logs')
      .select('*')
      .order('week', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      day: row.day,
      week: row.week,
      tipo: row.tipo,
      duracionMinutos: row.duracion_minutos,
      completado: row.completado,
      notas: row.notas || '',
      date: row.date,
    }));
  }

  public static async addDefinicionCardioLog(log: DefinicionCardioLog): Promise<void> {
    // Delete existing for this day/week
    await supabase
      .from('definicion_cardio_logs')
      .delete()
      .eq('day', log.day)
      .eq('week', log.week);

    const { error } = await supabase
      .from('definicion_cardio_logs')
      .insert({
        day: log.day,
        week: log.week,
        tipo: log.tipo,
        duracion_minutos: log.duracionMinutos,
        completado: log.completado,
        notas: log.notas || '',
        date: log.date,
      });

    if (error) throw error;
  }

  // ========================================
  // SETTINGS
  // ========================================

  public static async getDefinicionSetting(key: string): Promise<any> {
    const { data, error } = await supabase
      .from('definicion_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.setting_value || null;
  }

  public static async saveDefinicionSetting(key: string, value: any): Promise<void> {
    const { error } = await supabase
      .from('definicion_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' });

    if (error) throw error;
  }

  public static async getDefinicionTableColumns(): Promise<DefinicionTableColumn[]> {
    try {
      const columns = await this.getDefinicionSetting('definicion-table-columns');
      return columns || DEFAULT_TABLE_COLUMNS;
    } catch (error) {
      console.error('Error getting definicion table columns:', error);
      return DEFAULT_TABLE_COLUMNS;
    }
  }

  public static async saveDefinicionTableColumns(columns: DefinicionTableColumn[]): Promise<void> {
    await this.saveDefinicionSetting('definicion-table-columns', columns);
  }

  public static async getCurrentDefinicionWeek(): Promise<number> {
    try {
      const week = await this.getDefinicionSetting('definicion-current-week');
      return parseInt(week) || 1;
    } catch {
      return 1;
    }
  }

  public static async saveCurrentDefinicionWeek(week: number): Promise<void> {
    await this.saveDefinicionSetting('definicion-current-week', week);
  }

  public static async getCurrentDefinicionDay(): Promise<string> {
    try {
      const day = await this.getDefinicionSetting('definicion-current-day');
      return day || 'lunes';
    } catch {
      return 'lunes';
    }
  }

  public static async saveCurrentDefinicionDay(day: string): Promise<void> {
    await this.saveDefinicionSetting('definicion-current-day', day);
  }

  // ========================================
  // UTILITY
  // ========================================

  public static async clearAllDefinicionData(): Promise<void> {
    const tables = [
      'definicion_workout_progress',
      'definicion_shopping_lists',
      'definicion_settings',
      'definicion_body_composition',
      'definicion_cardio_logs',
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error(`Error clearing definicion data from ${table}:`, error);
        throw error;
      }
    }
  }
}
