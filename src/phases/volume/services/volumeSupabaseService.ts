import { supabase } from '../../../utils/supabase/client';
import type { VolumeWorkoutProgress, VolumeShoppingList, VolumeTableColumn } from '../types/volume';

export class VolumeSupabaseService {
  // ========================================
  // VOLUME WORKOUT PROGRESS METHODS
  // ========================================

  public static async saveVolumeWorkoutProgress(progress: VolumeWorkoutProgress[]): Promise<void> {
    // Delete all existing volume workout progress (global shared data)
    const { error: deleteError } = await supabase
      .from('volume_workout_progress')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      throw deleteError;
    }

    // Transform progress data for database
    const progressData = progress.map(p => ({
      exercise_id: p.exerciseId,
      day: p.day,
      week: p.week,
      weights: p.weights,
      series_count: p.seriesCount,
      date: p.date,
      is_alternative: p.isAlternative,
      alternative_index: p.alternativeIndex === undefined ? null : p.alternativeIndex,
      observations: p.observations || '',
    }));

    const { error: insertError } = await supabase
      .from('volume_workout_progress')
      .insert(progressData);

    if (insertError) {
      throw insertError;
    }
  }

  public static async getVolumeWorkoutProgress(): Promise<VolumeWorkoutProgress[]> {
    const { data, error } = await supabase
      .from('volume_workout_progress')
      .select('*');

    if (error) {
      throw error;
    }

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
    }));
  }

  public static async addVolumeWorkoutProgress(progress: VolumeWorkoutProgress): Promise<void> {
    // Delete existing progress for this specific exercise
    let deleteQuery = supabase
      .from('volume_workout_progress')
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

    if (deleteError) {
      throw deleteError;
    }

    const { error: insertError } = await supabase
      .from('volume_workout_progress')
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
      });

    if (insertError) {
      throw insertError;
    }
  }

  public static async getVolumeExerciseProgress(
    exerciseId: string,
    day: string,
    week: number,
    isAlternative: boolean = false,
    alternativeIndex?: number
  ): Promise<VolumeWorkoutProgress | null> {
    let query = supabase
      .from('volume_workout_progress')
      .select('*')
      .eq('exercise_id', exerciseId)
      .eq('day', day)
      .eq('week', week)
      .eq('is_alternative', isAlternative);

    if (isAlternative && alternativeIndex !== undefined && alternativeIndex !== null) {
      query = query.eq('alternative_index', alternativeIndex);
    } else if (!isAlternative) {
      query = query.is('alternative_index', null);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) return null;

    return {
      exerciseId: data.exercise_id,
      day: data.day,
      week: data.week,
      weights: data.weights || [],
      seriesCount: data.series_count || data.weights?.length || 3,
      date: data.date,
      isAlternative: data.is_alternative || false,
      alternativeIndex: data.alternative_index,
      observations: data.observations || '',
    };
  }

  // ========================================
  // VOLUME SHOPPING LIST METHODS
  // ========================================

  public static async saveVolumeShoppingLists(lists: VolumeShoppingList[]): Promise<void> {
    // Delete all existing volume shopping lists (global shared data)
    const { error: deleteError } = await supabase
      .from('volume_shopping_lists')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      throw deleteError;
    }

    // Transform lists data for database
    const listsData = lists.map(list => ({
      selected_weeks: list.selectedWeeks,
      selected_days: list.selectedDays,
      items: list.items,
      generated_date: list.generatedDate,
    }));

    const { error: insertError } = await supabase
      .from('volume_shopping_lists')
      .insert(listsData);

    if (insertError) {
      throw insertError;
    }
  }

  public static async getVolumeShoppingLists(): Promise<VolumeShoppingList[]> {
    const { data, error } = await supabase
      .from('volume_shopping_lists')
      .select('*');

    if (error) {
      throw error;
    }

    return (data || []).map(row => ({
      selectedWeeks: row.selected_weeks,
      selectedDays: row.selected_days,
      items: row.items,
      generatedDate: row.generated_date,
    }));
  }

  public static async addVolumeShoppingList(list: VolumeShoppingList): Promise<void> {
    const { error } = await supabase
      .from('volume_shopping_lists')
      .insert({
        selected_weeks: list.selectedWeeks,
        selected_days: list.selectedDays,
        items: list.items,
        generated_date: list.generatedDate,
      });

    if (error) {
      throw error;
    }
  }

  // ========================================
  // VOLUME SETTINGS METHODS
  // ========================================

  public static async getVolumeSetting(key: string): Promise<any> {
    const { data, error } = await supabase
      .from('volume_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.setting_value || null;
  }

  public static async saveVolumeSetting(key: string, value: any): Promise<void> {
    const { error } = await supabase
      .from('volume_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      throw error;
    }
  }

  public static async getVolumeTableColumns(): Promise<VolumeTableColumn[]> {
    try {
      const columns = await this.getVolumeSetting('volume-table-columns');
      return columns || [
        { key: 'comida', label: 'Comida', visible: true },
        { key: 'hora', label: 'Hora', visible: true },
        { key: 'alimento', label: 'Alimento', visible: true },
        { key: 'cantidad', label: 'Cantidad', visible: true },
        { key: 'unidad', label: 'Unidad', visible: true },
        { key: 'kcal', label: 'Kcal', visible: true },
        { key: 'proteinas_g', label: 'Proteínas', visible: true },
        { key: 'carbohidratos_g', label: 'Carbs', visible: true },
        { key: 'grasas_g', label: 'Grasas', visible: true },
        { key: 'fibra_g', label: 'Fibra', visible: false },
        { key: 'notas', label: 'Notas', visible: true },
      ];
    } catch (error) {
      console.error('Error getting volume table columns:', error);
      return [];
    }
  }

  public static async saveVolumeTableColumns(columns: VolumeTableColumn[]): Promise<void> {
    await this.saveVolumeSetting('volume-table-columns', columns);
  }

  public static async getCurrentVolumeWeek(): Promise<number> {
    try {
      const week = await this.getVolumeSetting('volume-current-week');
      return parseInt(week) || 1;
    } catch (error) {
      console.error('Error getting current volume week:', error);
      return 1;
    }
  }

  public static async saveCurrentVolumeWeek(week: number): Promise<void> {
    await this.saveVolumeSetting('volume-current-week', week);
  }

  public static async getCurrentVolumeDay(): Promise<string> {
    try {
      const day = await this.getVolumeSetting('volume-current-day');
      return day || 'lunes';
    } catch (error) {
      console.error('Error getting current volume day:', error);
      return 'lunes';
    }
  }

  public static async saveCurrentVolumeDay(day: string): Promise<void> {
    await this.saveVolumeSetting('volume-current-day', day);
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  public static async clearAllVolumeData(): Promise<void> {
    const tables = ['volume_workout_progress', 'volume_shopping_lists', 'volume_settings'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error(`Error clearing volume data from ${table}:`, error);
        throw error;
      }
    }
  }

  public static async getVolumeDataSummary(): Promise<{
    workoutProgressCount: number;
    shoppingListCount: number;
    settingsCount: number;
  }> {
    try {
      const [workoutResult, shoppingResult, settingsResult] = await Promise.all([
        supabase.from('volume_workout_progress').select('id', { count: 'exact', head: true }),
        supabase.from('volume_shopping_lists').select('id', { count: 'exact', head: true }),
        supabase.from('volume_settings').select('id', { count: 'exact', head: true }),
      ]);

      return {
        workoutProgressCount: workoutResult.count || 0,
        shoppingListCount: shoppingResult.count || 0,
        settingsCount: settingsResult.count || 0,
      };
    } catch (error) {
      console.error('Error getting volume data summary:', error);
      return {
        workoutProgressCount: 0,
        shoppingListCount: 0,
        settingsCount: 0,
      };
    }
  }
}