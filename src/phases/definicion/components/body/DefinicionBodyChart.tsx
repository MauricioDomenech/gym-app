import React from 'react';
import { DEFINICION_SUB_PHASES } from '../../types/definicion';
import type { DefinicionBodyComposition } from '../../types/definicion';

interface DefinicionBodyChartProps {
  data: DefinicionBodyComposition[];
  currentWeek: number;
}

export const DefinicionBodyChart: React.FC<DefinicionBodyChartProps> = ({ data, currentWeek }) => {
  if (data.length < 2) return null;

  const sortedData = [...data].sort((a, b) => a.week - b.week);

  // Chart dimensions
  const width = 700;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Data ranges
  const weights = sortedData.map(d => d.peso);
  const minWeight = Math.floor(Math.min(...weights) - 1);
  const maxWeight = Math.ceil(Math.max(...weights) + 1);
  const minWeek = Math.min(...sortedData.map(d => d.week));
  const maxWeek = Math.max(...sortedData.map(d => d.week), currentWeek);

  // Scale functions
  const xScale = (week: number) => padding.left + ((week - minWeek) / (maxWeek - minWeek || 1)) * chartWidth;
  const yScale = (weight: number) => padding.top + chartHeight - ((weight - minWeight) / (maxWeight - minWeight || 1)) * chartHeight;

  // Generate path
  const pathPoints = sortedData.map(d => `${xScale(d.week)},${yScale(d.peso)}`);
  const linePath = `M ${pathPoints.join(' L ')}`;

  // Y-axis ticks
  const yTicks: number[] = [];
  const yStep = (maxWeight - minWeight) <= 5 ? 0.5 : 1;
  for (let v = minWeight; v <= maxWeight; v += yStep) {
    yTicks.push(v);
  }

  // Diet break zones
  const dietBreakPhases = DEFINICION_SUB_PHASES.filter(p => p.esDietBreak);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Evolucion de Peso
      </h3>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-3xl mx-auto" style={{ minWidth: 400 }}>
          {/* Diet break zones */}
          {dietBreakPhases.map(phase => {
            const x1 = xScale(phase.semanaInicio);
            const x2 = xScale(phase.semanaFin);
            return (
              <rect
                key={phase.id}
                x={Math.max(x1, padding.left)}
                y={padding.top}
                width={Math.min(x2 - x1 + xScale(1) - xScale(0), chartWidth)}
                height={chartHeight}
                fill="rgba(251, 191, 36, 0.1)"
                stroke="rgba(251, 191, 36, 0.3)"
                strokeDasharray="4"
              />
            );
          })}

          {/* Grid lines */}
          {yTicks.map(tick => (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={yScale(tick)}
                x2={padding.left + chartWidth}
                y2={yScale(tick)}
                stroke="currentColor"
                className="text-gray-200 dark:text-slate-600"
                strokeWidth="0.5"
              />
              <text
                x={padding.left - 8}
                y={yScale(tick) + 4}
                textAnchor="end"
                className="text-gray-500 dark:text-gray-400"
                fontSize="10"
                fill="currentColor"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {sortedData.map(d => (
            <text
              key={d.week}
              x={xScale(d.week)}
              y={height - 10}
              textAnchor="middle"
              className="text-gray-500 dark:text-gray-400"
              fontSize="10"
              fill="currentColor"
            >
              S{d.week}
            </text>
          ))}

          {/* Axis labels */}
          <text
            x={padding.left - 35}
            y={padding.top + chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, ${padding.left - 35}, ${padding.top + chartHeight / 2})`}
            className="text-gray-600 dark:text-gray-400"
            fontSize="11"
            fill="currentColor"
          >
            Peso (kg)
          </text>
          <text
            x={padding.left + chartWidth / 2}
            y={height - 2}
            textAnchor="middle"
            className="text-gray-600 dark:text-gray-400"
            fontSize="11"
            fill="currentColor"
          >
            Semana
          </text>

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {sortedData.map(d => (
            <g key={d.week}>
              <circle
                cx={xScale(d.week)}
                cy={yScale(d.peso)}
                r={d.week === currentWeek ? 6 : 4}
                fill={d.week === currentWeek ? '#059669' : '#10b981'}
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={xScale(d.week)}
                y={yScale(d.peso) - 10}
                textAnchor="middle"
                className="text-gray-700 dark:text-gray-300"
                fontSize="9"
                fontWeight="bold"
                fill="currentColor"
              >
                {d.peso}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
          <span>Peso registrado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1 bg-amber-300"></div>
          <span>Diet Break</span>
        </div>
      </div>

      {/* Summary Stats */}
      {sortedData.length >= 2 && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
            <p className="text-xs text-violet-600 dark:text-violet-400">Peso inicial</p>
            <p className="text-lg font-bold text-violet-800 dark:text-violet-200">
              {sortedData[0].peso} kg
            </p>
          </div>
          <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
            <p className="text-xs text-violet-600 dark:text-violet-400">Peso actual</p>
            <p className="text-lg font-bold text-violet-800 dark:text-violet-200">
              {sortedData[sortedData.length - 1].peso} kg
            </p>
          </div>
          <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
            <p className="text-xs text-violet-600 dark:text-violet-400">Diferencia</p>
            <p className={`text-lg font-bold ${
              sortedData[sortedData.length - 1].peso < sortedData[0].peso
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {(sortedData[sortedData.length - 1].peso - sortedData[0].peso).toFixed(1)} kg
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
