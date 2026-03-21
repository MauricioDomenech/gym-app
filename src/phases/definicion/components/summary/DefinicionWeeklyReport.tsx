import React, { useState } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { TOTAL_WEEKS } from '../../types/definicion';
import { generateWeeklyReport, getReportFilename, downloadReport } from '../../utils/weeklyReportGenerator';

export const DefinicionWeeklyReport: React.FC = () => {
  const { workoutProgress, workoutData, bodyComposition, cardioLogs, nutritionData, currentWeek } = useDefinicionData();
  const [selectedWeek, setSelectedWeek] = useState(currentWeek > 0 ? currentWeek : 1);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const handleGenerate = () => {
    const content = generateWeeklyReport({
      week: selectedWeek,
      workoutProgress,
      workoutData,
      bodyComposition,
      cardioLogs,
      nutritionData,
    });

    const filename = getReportFilename(selectedWeek);
    downloadReport(content, filename);

    setJustDownloaded(true);
    setTimeout(() => setJustDownloaded(false), 4000);
  };

  const weeksWithData = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).filter(w => {
    const hasProgress = workoutProgress.some(p => p.week === w);
    const hasBody = bodyComposition.some(b => b.week === w);
    const hasCardio = cardioLogs.some(l => l.week === w);
    return hasProgress || hasBody || hasCardio;
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Exportar Reporte Semanal
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Genera un archivo con todos los datos de la semana para analisis y ajustes del plan.
        Guarda el archivo en la carpeta <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">reportes/</code> del proyecto.
      </p>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Semana:
          </label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-emerald-300 dark:border-emerald-700 rounded-md text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          >
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>
                S{w} {weeksWithData.includes(w) ? '' : '(sin datos)'}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Generar reporte
        </button>

        {justDownloaded && (
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center animate-pulse">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Descargado — guardalo en reportes/
          </span>
        )}
      </div>
    </div>
  );
};
