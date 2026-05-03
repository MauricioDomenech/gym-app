import React, { useState, useEffect } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { DefinicionBodyChart } from './DefinicionBodyChart';
import type { DefinicionBodyComposition } from '../../types/definicion';

const BIA_BLOCK = 'BIA_EXTRA';
const CHECKIN_BLOCK = 'CHECKIN_RECOMP_LENTA';
const ADHERENCE_PRESETS = [100, 90, 80, 70, 60];
const RELAX_MEAL_PRESETS = [0, 1, 2, 3, 4];

function parseBlock(notes: string, blockName: string): Record<string, string> {
  const regex = new RegExp(`\\n?\\[${blockName}\\]\\n([\\s\\S]*?)\\n\\[\\/${blockName}\\]`);
  const match = notes.match(regex);
  if (!match) return {};

  return match[1].split('\n').reduce<Record<string, string>>((acc, line) => {
    const separator = line.indexOf('=');
    if (separator <= 0) return acc;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function stripBlocks(notes: string): string {
  return notes
    .replace(/\n?\[BIA_EXTRA\]\n[\s\S]*?\n\[\/BIA_EXTRA\]/g, '')
    .replace(/\n?\[CHECKIN_RECOMP_LENTA\]\n[\s\S]*?\n\[\/CHECKIN_RECOMP_LENTA\]/g, '')
    .trim();
}

function readNumber(values: Record<string, string>, key: string): number {
  const parsed = parseFloat(values[key] || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

export const DefinicionBodyTracker: React.FC = () => {
  const { currentWeek, bodyComposition, addBodyComposition } = useDefinicionData();

  const existingEntry = bodyComposition.find(b => b.week === currentWeek);

  const [peso, setPeso] = useState<number>(existingEntry?.peso || 0);
  const [grasaCorporal, setGrasaCorporal] = useState<number>(existingEntry?.grasaCorporal || 0);
  const [grasaSubcutanea, setGrasaSubcutanea] = useState<number>(0);
  const [grasaVisceral, setGrasaVisceral] = useState<number>(0);
  const [musculoEsqueletico, setMusculoEsqueletico] = useState<number>(0);
  const [masaMuscular, setMasaMuscular] = useState<number>(0);
  const [aguaCorporal, setAguaCorporal] = useState<number>(0);
  const [pesoSinGrasa, setPesoSinGrasa] = useState<number>(0);
  const [masaOsea, setMasaOsea] = useState<number>(0);
  const [proteinaCorporal, setProteinaCorporal] = useState<number>(0);
  const [tmb, setTmb] = useState<number>(0);
  const [imc, setImc] = useState<number>(0);
  const [cintura, setCintura] = useState<number>(existingEntry?.cintura || 0);
  const [cadera, setCadera] = useState<number>(existingEntry?.cadera || 0);
  const [pecho, setPecho] = useState<number>(existingEntry?.pecho || 0);
  const [brazo, setBrazo] = useState<number>(existingEntry?.brazo || 0);
  const [muslo, setMuslo] = useState<number>(existingEntry?.muslo || 0);
  const [comidasRelax, setComidasRelax] = useState<number>(0);
  const [adherenciaNutricion, setAdherenciaNutricion] = useState<number>(0);
  const [suenoPromedio, setSuenoPromedio] = useState<number>(0);
  const [hambre, setHambre] = useState<number>(0);
  const [energia, setEnergia] = useState<number>(0);
  const [molestias, setMolestias] = useState<string>('');
  const [notas, setNotas] = useState<string>(existingEntry?.notas || '');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const hydrateExtendedFields = (entry?: DefinicionBodyComposition) => {
    const rawNotes = entry?.notas || '';
    const bia = parseBlock(rawNotes, BIA_BLOCK);
    const checkin = parseBlock(rawNotes, CHECKIN_BLOCK);

    setGrasaSubcutanea(entry?.grasaSubcutanea || readNumber(bia, 'grasaSubcutanea'));
    setGrasaVisceral(entry?.grasaVisceral || readNumber(bia, 'grasaVisceral'));
    setMusculoEsqueletico(entry?.musculoEsqueletico || readNumber(bia, 'musculoEsqueletico'));
    setMasaMuscular(entry?.masaMuscular || readNumber(bia, 'masaMuscular'));
    setAguaCorporal(entry?.aguaCorporal || readNumber(bia, 'aguaCorporal'));
    setPesoSinGrasa(entry?.pesoSinGrasa || readNumber(bia, 'pesoSinGrasa'));
    setMasaOsea(entry?.masaOsea || readNumber(bia, 'masaOsea'));
    setProteinaCorporal(entry?.proteinaCorporal || readNumber(bia, 'proteinaCorporal'));
    setTmb(entry?.tmb || readNumber(bia, 'tmb'));
    setImc(entry?.imc || readNumber(bia, 'imc'));

    setComidasRelax(entry?.comidasRelax || readNumber(checkin, 'comidasRelax'));
    setAdherenciaNutricion(entry?.adherenciaNutricion || readNumber(checkin, 'adherenciaNutricion'));
    setSuenoPromedio(entry?.suenoPromedio || readNumber(checkin, 'suenoPromedio'));
    setHambre(entry?.hambre || readNumber(checkin, 'hambre'));
    setEnergia(entry?.energia || readNumber(checkin, 'energia'));
    setMolestias(entry?.molestias || checkin.molestias || '');
    setNotas(stripBlocks(rawNotes));
  };

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
      hydrateExtendedFields(entry);
    } else {
      setPeso(0);
      setGrasaCorporal(0);
      setCintura(0);
      setCadera(0);
      setPecho(0);
      setBrazo(0);
      setMuslo(0);
      hydrateExtendedFields();
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
        grasaSubcutanea: grasaSubcutanea > 0 ? grasaSubcutanea : undefined,
        grasaVisceral: grasaVisceral > 0 ? grasaVisceral : undefined,
        musculoEsqueletico: musculoEsqueletico > 0 ? musculoEsqueletico : undefined,
        masaMuscular: masaMuscular > 0 ? masaMuscular : undefined,
        aguaCorporal: aguaCorporal > 0 ? aguaCorporal : undefined,
        pesoSinGrasa: pesoSinGrasa > 0 ? pesoSinGrasa : undefined,
        masaOsea: masaOsea > 0 ? masaOsea : undefined,
        proteinaCorporal: proteinaCorporal > 0 ? proteinaCorporal : undefined,
        tmb: tmb > 0 ? tmb : undefined,
        imc: imc > 0 ? imc : undefined,
        cintura: cintura > 0 ? cintura : undefined,
        cadera: cadera > 0 ? cadera : undefined,
        pecho: pecho > 0 ? pecho : undefined,
        brazo: brazo > 0 ? brazo : undefined,
        muslo: muslo > 0 ? muslo : undefined,
        comidasRelax: comidasRelax > 0 ? comidasRelax : undefined,
        adherenciaNutricion: adherenciaNutricion > 0 ? adherenciaNutricion : undefined,
        suenoPromedio: suenoPromedio > 0 ? suenoPromedio : undefined,
        hambre: hambre > 0 ? hambre : undefined,
        energia: energia > 0 ? energia : undefined,
        molestias: molestias.trim() || undefined,
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
          Check-in semanal del Plan Recomp Lenta 2026
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

        <div className="mt-6 border-t border-violet-100 dark:border-slate-700 pt-5">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Datos extra de balanza BIA</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Usalos como tendencia, no como medicion exacta.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <MetricInput label="Grasa subcutanea %" value={grasaSubcutanea} onChange={setGrasaSubcutanea} max={60} />
            <MetricInput label="Grasa visceral" value={grasaVisceral} onChange={setGrasaVisceral} max={40} />
            <MetricInput label="Musculo esqueletico %" value={musculoEsqueletico} onChange={setMusculoEsqueletico} max={80} />
            <MetricInput label="Masa muscular kg" value={masaMuscular} onChange={setMasaMuscular} max={120} />
            <MetricInput label="Agua corporal %" value={aguaCorporal} onChange={setAguaCorporal} max={80} />
            <MetricInput label="Peso sin grasa kg" value={pesoSinGrasa} onChange={setPesoSinGrasa} max={150} />
            <MetricInput label="Masa osea kg" value={masaOsea} onChange={setMasaOsea} max={10} />
            <MetricInput label="Proteina %" value={proteinaCorporal} onChange={setProteinaCorporal} max={40} />
            <MetricInput label="TMB kcal" value={tmb} onChange={setTmb} max={4000} step={1} />
            <MetricInput label="IMC" value={imc} onChange={setImc} max={60} />
          </div>
        </div>

        <div className="mt-6 border-t border-violet-100 dark:border-slate-700 pt-5">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Check-in de adherencia</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Estos datos ayudan a interpretar la semana antes de decidir cambios.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <MetricInput label="Comidas relax" value={comidasRelax} onChange={setComidasRelax} max={14} step={1} />
            <MetricInput label="Adherencia %" value={adherenciaNutricion} onChange={setAdherenciaNutricion} max={100} step={1} />
            <MetricInput label="Sueno h/dia" value={suenoPromedio} onChange={setSuenoPromedio} max={12} />
            <MetricInput label="Hambre 1-10" value={hambre} onChange={setHambre} max={10} step={1} />
            <MetricInput label="Energia 1-10" value={energia} onChange={setEnergia} max={10} step={1} />
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickPresetGroup
              label="Adherencia rapida"
              suffix="%"
              values={ADHERENCE_PRESETS}
              selectedValue={adherenciaNutricion}
              onSelect={setAdherenciaNutricion}
            />
            <QuickPresetGroup
              label="Comidas relax rapidas"
              values={RELAX_MEAL_PRESETS}
              selectedValue={comidasRelax}
              onSelect={setComidasRelax}
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Molestias / fatiga
            </label>
            <input
              value={molestias}
              onChange={(e) => setMolestias(e.target.value)}
              placeholder="Ej: hombro bien, gemelos cargados, sueño flojo..."
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

interface MetricInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  step?: number;
}

const MetricInput: React.FC<MetricInputProps> = ({ label, value, onChange, max, step = 0.1 }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    <input
      type="number"
      min="0"
      max={max}
      step={step}
      value={value || ''}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      placeholder="0"
      className="w-full px-3 py-2 border border-violet-300 dark:border-violet-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
    />
  </div>
);

interface QuickPresetGroupProps {
  label: string;
  values: number[];
  selectedValue: number;
  onSelect: (value: number) => void;
  suffix?: string;
}

const QuickPresetGroup: React.FC<QuickPresetGroupProps> = ({ label, values, selectedValue, onSelect, suffix = '' }) => (
  <div>
    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {values.map(value => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
            selectedValue === value
              ? 'bg-violet-600 border-violet-600 text-white'
              : 'bg-white dark:bg-slate-800 border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30'
          }`}
        >
          {value}{suffix}
        </button>
      ))}
    </div>
  </div>
);
