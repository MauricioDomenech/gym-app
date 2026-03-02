import React, { useState, useEffect } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { DefinicionBodyChart } from './DefinicionBodyChart';
import type { DefinicionBodyComposition } from '../../types/definicion';

export const DefinicionBodyTracker: React.FC = () => {
  const { currentWeek, bodyComposition, addBodyComposition } = useDefinicionData();

  const existingEntry = bodyComposition.find(b => b.week === currentWeek);

  const [peso, setPeso] = useState<number>(existingEntry?.peso || 0);
  const [grasaCorporal, setGrasaCorporal] = useState<number>(existingEntry?.grasaCorporal || 0);
  const [cintura, setCintura] = useState<number>(existingEntry?.cintura || 0);
  const [cadera, setCadera] = useState<number>(existingEntry?.cadera || 0);
  const [pecho, setPecho] = useState<number>(existingEntry?.pecho || 0);
  const [brazo, setBrazo] = useState<number>(existingEntry?.brazo || 0);
  const [muslo, setMuslo] = useState<number>(existingEntry?.muslo || 0);
  const [notas, setNotas] = useState<string>(existingEntry?.notas || '');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const entry = bodyComposition.find(b => b.week === currentWeek);
    if (entry) {
      setPeso(entry.peso);
      setGrasaCorporal(entry.grasaCorporal || 0);
      setCintura(entry.cintura || 0);
      setCadera(entry.cadera || 0);
      setPecho(entry.pecho || 0);
      setBrazo(entry.brazo || 0);
      setMuslo(entry.muslo || 0);
      setNotas(entry.notas || '');
    } else {
      setPeso(0);
      setGrasaCorporal(0);
      setCintura(0);
      setCadera(0);
      setPecho(0);
      setBrazo(0);
      setMuslo(0);
      setNotas('');
    }
  }, [currentWeek, bodyComposition]);

  const handleSave = async () => {
    if (peso <= 0) {
      alert('El peso es obligatorio.');
      return;
    }

    setIsSaving(true);
    try {
      const entry: DefinicionBodyComposition = {
        week: currentWeek,
        date: new Date().toISOString(),
        peso,
        grasaCorporal: grasaCorporal > 0 ? grasaCorporal : undefined,
        cintura: cintura > 0 ? cintura : undefined,
        cadera: cadera > 0 ? cadera : undefined,
        pecho: pecho > 0 ? pecho : undefined,
        brazo: brazo > 0 ? brazo : undefined,
        muslo: muslo > 0 ? muslo : undefined,
        notas: notas.trim(),
      };
      await addBodyComposition(entry);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (error) {
      console.error('Error saving body composition:', error);
      alert('Error al guardar. Intentalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const recentEntries = bodyComposition
    .filter(b => b.week <= currentWeek)
    .sort((a, b) => b.week - a.week)
    .slice(0, 6);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          <span className="text-violet-600 dark:text-violet-400">📏</span>
          Composicion Corporal - Semana {currentWeek}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Registro semanal de medidas corporales
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Registro Semana {currentWeek}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Peso (required) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Peso (kg) *
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={peso || ''}
              onChange={(e) => setPeso(parseFloat(e.target.value) || 0)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-violet-300 dark:border-violet-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* % Grasa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              % Grasa corporal
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={grasaCorporal || ''}
              onChange={(e) => setGrasaCorporal(parseFloat(e.target.value) || 0)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-violet-300 dark:border-violet-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Cintura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cintura (cm)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={cintura || ''}
              onChange={(e) => setCintura(parseFloat(e.target.value) || 0)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-violet-300 dark:border-violet-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Cadera */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cadera (cm)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={cadera || ''}
              onChange={(e) => setCadera(parseFloat(e.target.value) || 0)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-violet-300 dark:border-violet-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Pecho */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pecho (cm)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={pecho || ''}
              onChange={(e) => setPecho(parseFloat(e.target.value) || 0)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-violet-300 dark:border-violet-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Brazo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Brazo (cm)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={brazo || ''}
              onChange={(e) => setBrazo(parseFloat(e.target.value) || 0)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-violet-300 dark:border-violet-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Muslo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Muslo (cm)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={muslo || ''}
              onChange={(e) => setMuslo(parseFloat(e.target.value) || 0)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-violet-300 dark:border-violet-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Notas */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Sensaciones, fotos tomadas, metodo de medicion..."
            rows={2}
            className="w-full px-3 py-2 border border-violet-300 dark:border-violet-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>

        {/* Save Button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving || peso <= 0}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
              isSaving || peso <= 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {isSaving ? 'Guardando...' : existingEntry ? 'Actualizar' : 'Guardar'}
          </button>
          {justSaved && (
            <span className="text-sm text-green-600 dark:text-green-400 animate-pulse">
              Guardado
            </span>
          )}
        </div>
      </div>

      {/* Body Chart */}
      {bodyComposition.length > 1 && (
        <DefinicionBodyChart data={bodyComposition} currentWeek={currentWeek} />
      )}

      {/* Recent Entries Table */}
      {recentEntries.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ultimos registros
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2 text-gray-700 dark:text-gray-300">Sem.</th>
                  <th className="text-center py-2 text-gray-700 dark:text-gray-300">Peso</th>
                  <th className="text-center py-2 text-gray-700 dark:text-gray-300">% Grasa</th>
                  <th className="text-center py-2 text-gray-700 dark:text-gray-300">Cintura</th>
                  <th className="text-center py-2 text-gray-700 dark:text-gray-300">Cadera</th>
                  <th className="text-center py-2 text-gray-700 dark:text-gray-300">Brazo</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map(entry => (
                  <tr key={entry.week} className={`border-b border-gray-100 dark:border-slate-800 ${
                    entry.week === currentWeek ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                  }`}>
                    <td className="py-2 font-medium text-gray-900 dark:text-white">S{entry.week}</td>
                    <td className="py-2 text-center">{entry.peso} kg</td>
                    <td className="py-2 text-center">{entry.grasaCorporal ? `${entry.grasaCorporal}%` : '-'}</td>
                    <td className="py-2 text-center">{entry.cintura ? `${entry.cintura} cm` : '-'}</td>
                    <td className="py-2 text-center">{entry.cadera ? `${entry.cadera} cm` : '-'}</td>
                    <td className="py-2 text-center">{entry.brazo ? `${entry.brazo} cm` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
