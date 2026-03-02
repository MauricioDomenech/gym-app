import React from 'react';
import { DEFINICION_SUB_PHASES, TOTAL_WEEKS } from '../../types/definicion';
import type { DefinicionBodyComposition, WeightProjection } from '../../types/definicion';
import { getExpectedWeight } from '../../utils/progressAnalytics';

interface DefinicionProgressChartProps {
  bodyData: DefinicionBodyComposition[];
  projection: WeightProjection;
}

export const DefinicionProgressChart: React.FC<DefinicionProgressChartProps> = ({ bodyData, projection }) => {
  const sortedData = [...bodyData].sort((a, b) => a.week - b.week);

  // Chart dimensions
  const width = 700;
  const height = 320;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Expected weights for all weeks
  const expectedWeights: { week: number; weight: number }[] = [];
  for (let w = 0; w <= TOTAL_WEEKS; w++) {
    expectedWeights.push({ week: w, weight: getExpectedWeight(w) });
  }

  // Collect all weight values to compute Y range
  const allWeights: number[] = [
    ...expectedWeights.map(e => e.weight),
    ...sortedData.map(d => d.peso),
  ];

  // Add projection end weight if we have enough data
  const lastData = sortedData.length > 0 ? sortedData[sortedData.length - 1] : null;
  if (lastData && sortedData.length >= 2) {
    const slope = -projection.weeklyLossRate;
    const projectedEnd = lastData.peso + slope * (TOTAL_WEEKS - lastData.week);
    allWeights.push(projectedEnd);
  }

  const minWeight = Math.floor(Math.min(...allWeights) - 1);
  const maxWeight = Math.ceil(Math.max(...allWeights) + 1);

  // Scale functions
  const xScale = (week: number) => padding.left + (week / TOTAL_WEEKS) * chartWidth;
  const yScale = (weight: number) => padding.top + chartHeight - ((weight - minWeight) / (maxWeight - minWeight || 1)) * chartHeight;

  // Expected line path
  const expectedPath = expectedWeights
    .map((e, i) => `${i === 0 ? 'M' : 'L'} ${xScale(e.week)},${yScale(e.weight)}`)
    .join(' ');

  // Tolerance band (±0.5kg around expected)
  const toleranceTop = expectedWeights
    .map((e, i) => `${i === 0 ? 'M' : 'L'} ${xScale(e.week)},${yScale(e.weight + 0.5)}`)
    .join(' ');
  const toleranceBottom = [...expectedWeights]
    .reverse()
    .map((e) => `L ${xScale(e.week)},${yScale(e.weight - 0.5)}`)
    .join(' ');
  const tolerancePath = `${toleranceTop} ${toleranceBottom} Z`;

  // Real data line path
  const realPath = sortedData.length >= 2
    ? sortedData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.week)},${yScale(d.peso)}`).join(' ')
    : '';

  // Projection line (from last real point to week 22)
  let projectionPath = '';
  if (lastData && sortedData.length >= 2) {
    const slope = -projection.weeklyLossRate;
    const projectedEnd = lastData.peso + slope * (TOTAL_WEEKS - lastData.week);
    projectionPath = `M ${xScale(lastData.week)},${yScale(lastData.peso)} L ${xScale(TOTAL_WEEKS)},${yScale(projectedEnd)}`;
  }

  // Diet break zones
  const dietBreakPhases = DEFINICION_SUB_PHASES.filter(p => p.esDietBreak);

  // Y-axis ticks
  const yTicks: number[] = [];
  const yStep = (maxWeight - minWeight) <= 5 ? 0.5 : 1;
  for (let v = minWeight; v <= maxWeight; v += yStep) {
    yTicks.push(Math.round(v * 10) / 10);
  }

  // X-axis ticks (all weeks)
  const xTicks: number[] = [];
  for (let w = 0; w <= TOTAL_WEEKS; w++) {
    xTicks.push(w);
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-3xl mx-auto" style={{ minWidth: 400 }}>
        {/* Diet break zones */}
        {dietBreakPhases.map(phase => {
          const x1 = xScale(phase.semanaInicio - 0.4);
          const x2 = xScale(phase.semanaFin + 0.4);
          return (
            <rect
              key={phase.id}
              x={Math.max(x1, padding.left)}
              y={padding.top}
              width={Math.min(x2 - x1, chartWidth - (x1 - padding.left))}
              height={chartHeight}
              fill="rgba(251, 191, 36, 0.1)"
              stroke="rgba(251, 191, 36, 0.3)"
              strokeDasharray="4"
            />
          );
        })}

        {/* Horizontal grid lines */}
        {yTicks.map(tick => (
          <line
            key={`h-${tick}`}
            x1={padding.left}
            y1={yScale(tick)}
            x2={padding.left + chartWidth}
            y2={yScale(tick)}
            stroke="currentColor"
            className="text-gray-200 dark:text-slate-600"
            strokeWidth="0.5"
          />
        ))}

        {/* Vertical grid lines */}
        {xTicks.filter(w => w % 2 === 0).map(w => (
          <line
            key={`v-${w}`}
            x1={xScale(w)}
            y1={padding.top}
            x2={xScale(w)}
            y2={padding.top + chartHeight}
            stroke="currentColor"
            className="text-gray-100 dark:text-slate-700"
            strokeWidth="0.5"
          />
        ))}

        {/* Tolerance band */}
        <path
          d={tolerancePath}
          fill="rgba(16, 185, 129, 0.08)"
          stroke="none"
        />

        {/* Expected line (gray dashed) */}
        <path
          d={expectedPath}
          fill="none"
          stroke="#9ca3af"
          strokeWidth="1.5"
          strokeDasharray="6 3"
        />

        {/* Real data line (green solid) */}
        {realPath && (
          <path
            d={realPath}
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}

        {/* Real data points */}
        {sortedData.map(d => (
          <g key={d.week}>
            <circle
              cx={xScale(d.week)}
              cy={yScale(d.peso)}
              r={4}
              fill="#059669"
              stroke="white"
              strokeWidth="2"
            />
            <text
              x={xScale(d.week)}
              y={yScale(d.peso) - 10}
              textAnchor="middle"
              className="text-gray-700 dark:text-gray-300"
              fontSize="8"
              fontWeight="bold"
              fill="currentColor"
            >
              {d.peso}
            </text>
          </g>
        ))}

        {/* Projection line (blue dashed) */}
        {projectionPath && (
          <path
            d={projectionPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
        )}

        {/* Y-axis labels */}
        {yTicks.map(tick => (
          <text
            key={`yl-${tick}`}
            x={padding.left - 8}
            y={yScale(tick) + 4}
            textAnchor="end"
            className="text-gray-500 dark:text-gray-400"
            fontSize="10"
            fill="currentColor"
          >
            {tick}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map(w => (
          <text
            key={`xl-${w}`}
            x={xScale(w)}
            y={height - 10}
            textAnchor="middle"
            className="text-gray-500 dark:text-gray-400"
            fontSize="9"
            fill="currentColor"
          >
            {w}
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
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="4 2" /></svg>
          <span>Esperado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
          <span>Real</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" /></svg>
          <span>Proyeccion</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-amber-300 rounded"></div>
          <span>Diet Break</span>
        </div>
      </div>
    </div>
  );
};
