import React, { useState, useEffect } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import type { DefinicionCardioLog } from '../../types/definicion';

export const DefinicionCardioTracker: React.FC = () => {
  const { currentDay, currentWeek, getCardioConfig, cardioLogs, addCardioLog, getDaysOfWeek } = useDefinicionData();

  const cardioConfig = getCardioConfig(currentDay);
  const currentLog = cardioLogs.find(l => l.day === currentDay && l.week === currentWeek);
  const weekLogs = cardioLogs.filter(l => l.week === currentWeek);

  const [duracion, setDuracion] = useState<number>(currentLog?.duracionMinutos || 0);
  const [tipo, setTipo] = useState<'liss' | 'hiit' | 'caminata'>(currentLog?.tipo || (cardioConfig?.tipo as 'liss' | 'hiit') || 'liss');
  const [completado, setCompletado] = useState(currentLog?.completado || false);
  const [notas, setNotas] = useState(currentLog?.notas || '');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const log = cardioLogs.find(l => l.day === currentDay && l.week === currentWeek);
    if (log) {
      setDuracion(log.duracionMinutos);
      setTipo(log.tipo);
      setCompletado(log.completado);
      setNotas(log.notas);
    } else {
      setDuracion(0);
      setTipo((cardioConfig?.tipo as 'liss' | 'hiit') || 'liss');
      setCompletado(false);
      setNotas('');
    }
  }, [currentDay, currentWeek, cardioLogs, cardioConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const log: DefinicionCardioLog = {
        day: currentDay,
        week: currentWeek,
        tipo,
        duracionMinutos: duracion,
        completado,
        notas: notas.trim(),
        date: new Date().toISOString(),
      };
      await addCardioLog(log);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (error) {
      console.error('Error saving cardio log:', error);
      alert('Error al guardar. Intentalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const days = getDaysOfWeek();
  const dayLabels: Record<string, string> = {
    lunes: 'Lun', martes: 'Mar', miercoles: 'Mie', jueves: 'Jue',
    viernes: 'Vie', sabado: 'Sab', domingo: 'Dom',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          <span className="text-cyan-600 dark:text-cyan-400">🏃</span>
          Cardio - Semana {currentWeek}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Seguimiento de sesiones de cardio
        </p>
      </div>

      {/* Weekly Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Resumen Semanal
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const config = getCardioConfig(day);
            const log = weekLogs.find(l => l.day === day);
            const isToday = day === currentDay;

            return (
              <div
                key={day}
                className={`p-2 rounded-lg text-center border-2 transition-colors ${
                  isToday
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                    : log?.completado
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700'
                }`}
              >
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {dayLabels[day]}
                </div>
                {config ? (
                  <>
                    <div className={`text-xs mt-1 ${
                      log?.completado
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {config.tipo?.toUpperCase()}
                    </div>
                    {log?.completado && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {log.duracionMinutos}min
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    -
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Cardio */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {currentDay.charAt(0).toUpperCase() + currentDay.slice(1)}
        </h3>

        {cardioConfig && cardioConfig.tipo ? (
          <div className="space-y-6">
            {/* Expected Cardio */}
            <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
              <h4 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-2">
                Cardio programado
              </h4>
              <div className="text-sm text-cyan-700 dark:text-cyan-300 space-y-1">
                <p><strong>Tipo:</strong> {cardioConfig.tipo.toUpperCase()}</p>
                <p><strong>Duracion:</strong> {cardioConfig.duracion}</p>
                <p><strong>Detalle:</strong> {cardioConfig.detalle}</p>
                {cardioConfig.opcional && (
                  <p className="text-amber-600 dark:text-amber-400 font-medium mt-2">
                    (Opcional)
                  </p>
                )}
              </div>
            </div>

            {/* Input Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo realizado
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as 'liss' | 'hiit' | 'caminata')}
                    className="w-full px-3 py-2 border border-cyan-300 dark:border-cyan-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="liss">LISS</option>
                    <option value="hiit">HIIT</option>
                    <option value="caminata">Caminata</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duracion (minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={duracion || ''}
                    onChange={(e) => setDuracion(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-cyan-300 dark:border-cyan-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="completado"
                  checked={completado}
                  onChange={(e) => setCompletado(e.target.checked)}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 dark:border-slate-600 rounded"
                />
                <label htmlFor="completado" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sesion completada
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Velocidad, inclinacion, sensaciones..."
                  rows={2}
                  className="w-full px-3 py-2 border border-cyan-300 dark:border-cyan-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                    isSaving
                      ? 'bg-cyan-400 cursor-not-allowed'
                      : 'bg-cyan-600 hover:bg-cyan-700'
                  }`}
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
                {justSaved && (
                  <span className="text-sm text-green-600 dark:text-green-400 animate-pulse">
                    Guardado
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="mx-auto h-12 w-12 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            <p>No hay cardio programado para hoy.</p>
            <p className="text-sm mt-1">Dia de descanso cardiovascular.</p>
          </div>
        )}
      </div>

      {/* Weekly Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Estadisticas de la semana
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Sesiones completadas</p>
            <p className="text-2xl font-bold text-cyan-800 dark:text-cyan-200">
              {weekLogs.filter(l => l.completado).length}
            </p>
          </div>
          <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Sesiones programadas</p>
            <p className="text-2xl font-bold text-cyan-800 dark:text-cyan-200">
              {days.filter(d => { const c = getCardioConfig(d); return c && c.tipo; }).length}
            </p>
          </div>
          <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Minutos totales</p>
            <p className="text-2xl font-bold text-cyan-800 dark:text-cyan-200">
              {weekLogs.filter(l => l.completado).reduce((sum, l) => sum + l.duracionMinutos, 0)}
            </p>
          </div>
          <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">HIIT vs LISS</p>
            <p className="text-lg font-bold text-cyan-800 dark:text-cyan-200">
              {weekLogs.filter(l => l.completado && l.tipo === 'hiit').length} / {weekLogs.filter(l => l.completado && l.tipo === 'liss').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
