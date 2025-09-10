import React from 'react';
import { useVolumeData } from '../../contexts/VolumeDataContext';
import type { VolumeNutritionTotals } from '../../types/volume';

export const VolumeWeeklySummary: React.FC = () => {
  const { nutritionData, workoutData, workoutProgress } = useVolumeData();

  const getDaysOfWeek = () => ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

  const calculateWeeklySummary = (week: number) => {
    const days = getDaysOfWeek();
    const totalsByDay: { [day: string]: VolumeNutritionTotals } = {};
    let weeklyTotals: VolumeNutritionTotals = {
      kcal: 0,
      proteinas_g: 0,
      carbohidratos_g: 0,
      grasas_g: 0,
      fibra_g: 0,
      calorias: 0,
    };

    days.forEach(day => {
      const dayNutrition = nutritionData[week]?.[day];
      if (dayNutrition) {
        totalsByDay[day] = dayNutrition.totals;
        weeklyTotals.kcal += dayNutrition.totals.kcal;
        weeklyTotals.proteinas_g += dayNutrition.totals.proteinas_g;
        weeklyTotals.carbohidratos_g += dayNutrition.totals.carbohidratos_g;
        weeklyTotals.grasas_g += dayNutrition.totals.grasas_g;
        weeklyTotals.fibra_g += dayNutrition.totals.fibra_g;
      }
    });

    weeklyTotals.calorias = weeklyTotals.kcal;

    const validDays = Object.keys(totalsByDay).length;
    const averageDaily: VolumeNutritionTotals = validDays > 0 ? {
      kcal: weeklyTotals.kcal / validDays,
      proteinas_g: weeklyTotals.proteinas_g / validDays,
      carbohidratos_g: weeklyTotals.carbohidratos_g / validDays,
      grasas_g: weeklyTotals.grasas_g / validDays,
      fibra_g: weeklyTotals.fibra_g / validDays,
      calorias: weeklyTotals.kcal / validDays,
    } : {
      kcal: 0,
      proteinas_g: 0,
      carbohidratos_g: 0,
      grasas_g: 0,
      fibra_g: 0,
      calorias: 0,
    };

    return { totalsByDay, weeklyTotals, averageDaily, validDays };
  };

  const getProgressStats = (week: number) => {
    const weekProgress = workoutProgress.filter(p => p.week === week);
    const totalExercises = Object.values(workoutData[week] || {})
      .reduce((total, day) => total + day.exercises.length, 0);
    
    return {
      exercisesTracked: weekProgress.length,
      totalExercises,
      completionRate: totalExercises > 0 ? (weekProgress.length / totalExercises) * 100 : 0,
    };
  };

  const weeks = [1, 2];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📊 Resumen del Plan de Volumen
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Análisis completo del plan nutricional y progreso de entrenamiento
        </p>
      </div>

      {/* Week Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {weeks.map(week => {
          const summary = calculateWeeklySummary(week);
          const progressStats = getProgressStats(week);

          return (
            <div key={week} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
              {/* Week Header */}
              <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Semana {week}</h3>
                <p className="text-orange-100">
                  {summary.validDays}/7 días con datos nutricionales
                </p>
              </div>

              {/* Nutrition Summary */}
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  🍽️ Resumen Nutricional
                </h4>

                {/* Weekly Totals */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Calorías/Semana</p>
                    <p className="text-lg font-bold text-orange-800 dark:text-orange-200">
                      {summary.weeklyTotals.kcal.toFixed(0)} kcal
                    </p>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">Proteínas/Semana</p>
                    <p className="text-lg font-bold text-red-800 dark:text-red-200">
                      {summary.weeklyTotals.proteinas_g.toFixed(0)}g
                    </p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Carbs/Semana</p>
                    <p className="text-lg font-bold text-orange-800 dark:text-orange-200">
                      {summary.weeklyTotals.carbohidratos_g.toFixed(0)}g
                    </p>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">Grasas/Semana</p>
                    <p className="text-lg font-bold text-red-800 dark:text-red-200">
                      {summary.weeklyTotals.grasas_g.toFixed(0)}g
                    </p>
                  </div>
                </div>

                {/* Daily Averages */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 rounded-lg p-4 mb-6">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    📈 Promedios Diarios
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Calorías</p>
                      <p className="text-sm font-bold text-orange-700 dark:text-orange-300">
                        {summary.averageDaily.kcal.toFixed(0)} kcal
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Proteínas</p>
                      <p className="text-sm font-bold text-red-700 dark:text-red-300">
                        {summary.averageDaily.proteinas_g.toFixed(1)}g
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Carbs</p>
                      <p className="text-sm font-bold text-orange-700 dark:text-orange-300">
                        {summary.averageDaily.carbohidratos_g.toFixed(1)}g
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Grasas</p>
                      <p className="text-sm font-bold text-red-700 dark:text-red-300">
                        {summary.averageDaily.grasas_g.toFixed(1)}g
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workout Progress */}
                <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    💪 Progreso de Entrenamiento
                  </h5>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                      <p className="text-xs text-orange-600 dark:text-orange-400">Ejercicios Registrados</p>
                      <p className="text-lg font-bold text-orange-800 dark:text-orange-200">
                        {progressStats.exercisesTracked}
                      </p>
                    </div>
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <p className="text-xs text-red-600 dark:text-red-400">Total Ejercicios</p>
                      <p className="text-lg font-bold text-red-800 dark:text-red-200">
                        {progressStats.totalExercises}
                      </p>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <p className="text-xs text-green-600 dark:text-green-400">Completado</p>
                      <p className="text-lg font-bold text-green-800 dark:text-green-200">
                        {progressStats.completionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          ⚖️ Comparación entre Semanas
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left py-2 text-gray-700 dark:text-gray-300">Métrica</th>
                <th className="text-center py-2 text-orange-700 dark:text-orange-300">Semana 1</th>
                <th className="text-center py-2 text-red-700 dark:text-red-300">Semana 2</th>
                <th className="text-center py-2 text-gray-700 dark:text-gray-300">Diferencia</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {(() => {
                const week1Summary = calculateWeeklySummary(1);
                const week2Summary = calculateWeeklySummary(2);
                const week1Progress = getProgressStats(1);
                const week2Progress = getProgressStats(2);

                return (
                  <>
                    <tr className="border-b border-gray-100 dark:border-slate-800">
                      <td className="py-2 font-medium">Calorías promedio/día</td>
                      <td className="py-2 text-center">{week1Summary.averageDaily.kcal.toFixed(0)} kcal</td>
                      <td className="py-2 text-center">{week2Summary.averageDaily.kcal.toFixed(0)} kcal</td>
                      <td className="py-2 text-center">
                        {(week2Summary.averageDaily.kcal - week1Summary.averageDaily.kcal).toFixed(0)} kcal
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-slate-800">
                      <td className="py-2 font-medium">Proteínas promedio/día</td>
                      <td className="py-2 text-center">{week1Summary.averageDaily.proteinas_g.toFixed(1)}g</td>
                      <td className="py-2 text-center">{week2Summary.averageDaily.proteinas_g.toFixed(1)}g</td>
                      <td className="py-2 text-center">
                        {(week2Summary.averageDaily.proteinas_g - week1Summary.averageDaily.proteinas_g).toFixed(1)}g
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-slate-800">
                      <td className="py-2 font-medium">Ejercicios registrados</td>
                      <td className="py-2 text-center">{week1Progress.exercisesTracked}</td>
                      <td className="py-2 text-center">{week2Progress.exercisesTracked}</td>
                      <td className="py-2 text-center">
                        {week2Progress.exercisesTracked - week1Progress.exercisesTracked}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Tasa de completado</td>
                      <td className="py-2 text-center">{week1Progress.completionRate.toFixed(1)}%</td>
                      <td className="py-2 text-center">{week2Progress.completionRate.toFixed(1)}%</td>
                      <td className="py-2 text-center">
                        {(week2Progress.completionRate - week1Progress.completionRate).toFixed(1)}%
                      </td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-orange-600 dark:text-orange-400">💡</span>
          Consejos para el Plan de Volumen
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🍽️ Nutrición</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Mantén un superávit calórico consistente</li>
              <li>• Consume 1.6-2.2g de proteína por kg de peso</li>
              <li>• Prioriza carbohidratos alrededor del entrenamiento</li>
              <li>• Hidratación: 35-40ml por kg de peso corporal</li>
            </ul>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💪 Entrenamiento</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Registra el peso de cada serie completada</li>
              <li>• Incrementa progresivamente la carga</li>
              <li>• Usa alternativas si no tienes el equipo principal</li>
              <li>• Descansa 2-3 minutos entre series pesadas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};