import React, { useState, useRef } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { TOTAL_WEEKS } from '../../types/definicion';
import {
  buildWeeklyExport,
  downloadWeeklyExport,
  importWeeklyData,
} from '../../services/weeklyDataService';
import type { ImportResult } from '../../services/weeklyDataService';

export const DefinicionWeeklyDataExchange: React.FC = () => {
  const {
    workoutProgress, bodyComposition, cardioLogs, currentWeek, refreshData,
  } = useDefinicionData();

  const [exportWeek, setExportWeek] = useState(currentWeek > 0 ? currentWeek : 1);
  const [exportDone, setExportDone] = useState(false);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================
  // EXPORT
  // ========================================

  const handleExport = () => {
    const data = buildWeeklyExport(exportWeek, workoutProgress, bodyComposition, cardioLogs);
    downloadWeeklyExport(data);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 4000);
  };

  const weeksWithData = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).filter(w => {
    return workoutProgress.some(p => p.week === w) ||
      bodyComposition.some(b => b.week === w) ||
      cardioLogs.some(l => l.week === w);
  });

  // ========================================
  // IMPORT
  // ========================================

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const result = await importWeeklyData(text);
      setImportResult(result);

      if (result.success) {
        await refreshData();
      }
    } catch {
      setImportResult({
        success: false,
        message: 'Error al leer el archivo',
        imported: { workoutProgress: 0, bodyComposition: false, cardioLogs: 0 },
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Datos Semanales — Export / Import
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
        Exporta los datos de una semana para analisis, recibe el JSON con ajustes e importalo para la proxima semana.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EXPORT */}
        <div className="p-4 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10">
          <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar semana
          </h4>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">Semana:</label>
              <select
                value={exportWeek}
                onChange={(e) => setExportWeek(parseInt(e.target.value))}
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
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors duration-200"
            >
              Exportar JSON
            </button>

            {exportDone && (
              <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Descargado
              </span>
            )}
          </div>
        </div>

        {/* IMPORT */}
        <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
          <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Importar datos
          </h4>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelected}
            className="hidden"
          />

          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors duration-200"
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Importando...
              </>
            ) : (
              'Seleccionar archivo JSON'
            )}
          </button>

          {importResult && (
            <div className={`mt-3 p-3 rounded-md text-sm ${
              importResult.success
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {importResult.success ? (
                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {importResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
