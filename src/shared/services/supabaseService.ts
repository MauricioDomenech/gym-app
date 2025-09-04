import { supabase } from '../../utils/supabase/client';
import type { WorkoutProgress, ShoppingList } from '../../phases/maintenance/types/maintenance';

export class SupabaseService {
  public static async saveWorkoutProgress(progress: WorkoutProgress[]): Promise<void> {
    // Eliminar todos los datos existentes (datos globales compartidos)
    const { error: deleteError } = await supabase
      .from('workout_progress')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      throw deleteError;
    }

    if (progress.length === 0) return;

    const progressData = progress.map(p => ({
      exercise_id: p.exerciseId,
      day: p.day,
      week: p.week,
      weights: p.weights,
      date: p.date
    }));

    const { error: insertError } = await supabase
      .from('workout_progress')
      .insert(progressData);

    if (insertError) {
      throw insertError;
    }
  }

  public static async getWorkoutProgress(): Promise<WorkoutProgress[]> {
    const { data, error } = await supabase
      .from('workout_progress')
      .select('*');

    if (error) {
      throw error;
    }

    return (data || []).map(item => ({
      exerciseId: item.exercise_id,
      day: item.day,
      week: item.week,
      weights: item.weights,
      date: item.date
    }));
  }

  public static async addWorkoutProgress(progress: WorkoutProgress): Promise<void> {
    // Eliminar progreso existente para este ejercicio específico
    const { error: deleteError } = await supabase
      .from('workout_progress')
      .delete()
      .eq('exercise_id', progress.exerciseId)
      .eq('day', progress.day)
      .eq('week', progress.week);

    if (deleteError) {
      throw deleteError;
    }

    const { error: insertError } = await supabase
      .from('workout_progress')
      .insert({
        exercise_id: progress.exerciseId,
        day: progress.day,
        week: progress.week,
        weights: progress.weights,
        date: progress.date
      });

    if (insertError) {
      throw insertError;
    }
  }

  public static async getExerciseProgress(
    exerciseId: string, 
    day: string, 
    week: number
  ): Promise<WorkoutProgress | null> {
    const { data, error } = await supabase
      .from('workout_progress')
      .select('*')
      .eq('exercise_id', exerciseId)
      .eq('day', day)
      .eq('week', week)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) return null;

    return {
      exerciseId: data.exercise_id,
      day: data.day,
      week: data.week,
      weights: data.weights,
      date: data.date
    };
  }

  public static async saveShoppingLists(lists: ShoppingList[]): Promise<void> {
    // Eliminar todas las listas existentes (datos globales compartidos)
    const { error: deleteError } = await supabase
      .from('shopping_lists')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      throw deleteError;
    }

    if (lists.length === 0) return;

    const listsData = lists.map(list => ({
      selected_weeks: list.selectedWeeks,
      selected_days: list.selectedDays,
      items: list.items,
      generated_date: list.generatedDate
    }));

    const { error: insertError } = await supabase
      .from('shopping_lists')
      .insert(listsData);

    if (insertError) {
      throw insertError;
    }
  }

  public static async getShoppingLists(): Promise<ShoppingList[]> {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*');

    if (error) {
      throw error;
    }

    return (data || []).map(item => ({
      selectedWeeks: item.selected_weeks,
      selectedDays: item.selected_days,
      items: item.items,
      generatedDate: item.generated_date
    }));
  }

  public static async addShoppingList(list: ShoppingList): Promise<void> {
    const { error } = await supabase
      .from('shopping_lists')
      .insert({
        selected_weeks: list.selectedWeeks,
        selected_days: list.selectedDays,
        items: list.items,
        generated_date: list.generatedDate
      });

    if (error) {
      throw error;
    }
  }

  public static async updateShoppingList(index: number, list: ShoppingList): Promise<void> {
    const allLists = await this.getShoppingLists();
    if (index >= 0 && index < allLists.length) {
      allLists[index] = list;
      await this.saveShoppingLists(allLists);
    }
  }

  public static async deleteShoppingList(index: number): Promise<void> {
    const allLists = await this.getShoppingLists();
    if (index >= 0 && index < allLists.length) {
      allLists.splice(index, 1);
      await this.saveShoppingLists(allLists);
    }
  }

  public static async clearAllData(): Promise<void> {
    const tables = ['workout_progress', 'shopping_lists', 'user_settings'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        throw error;
      }
    }
  }
}