import geometry from './bodyGeometry.json';
// Geometry: MuscleMap / Melih Colpan, MIT. Attribution: /MUSCLEMAP-LICENSE.txt.
// Counts come from the curated variant metadata, not inferred physiological stimulus.
const regions: Record<string, string> = { chest:'Pecho', abs:'Abdomen', obliques:'Oblicuos', biceps:'Bíceps', triceps:'Tríceps', deltoids:'Hombros', quadriceps:'Cuádriceps', calves:'Gemelos', forearm:'Antebrazos', 'upper-back':'Espalda', 'lower-back':'Lumbar', trapezius:'Trapecio', gluteal:'Glúteos', hamstring:'Isquiotibiales' };
export function AnatomicalBodyMap({ totals, selected, onSelect }: { totals: Record<string, number>; selected: string; onSelect: (region: string) => void }) {
  const max = Math.max(1, ...Object.values(totals));
  return <><div className="gym-body-maps gym-anatomical">{Object.entries(geometry).map(([side, view]) => <svg key={side} viewBox={view.vb} role="group" aria-label={side === 'front' ? 'Cuerpo · vista frontal' : 'Cuerpo · vista posterior'}>{Object.entries(view.p).map(([part, paths]) => {
    const region = regions[part], count = totals[region] ?? 0;
    const fill = count ? `color-mix(in srgb, var(--today-accent) ${30 + 70 * count / max}%, var(--today-surface))` : 'var(--today-surface-raised)';
    return <g key={part} role={region ? 'button' : undefined} tabIndex={region ? 0 : undefined} aria-label={region ? `${region}: ${count} series con participación` : undefined} aria-pressed={region ? selected === region : undefined} onClick={region ? () => onSelect(region) : undefined} onKeyDown={region ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(region); } } : undefined} fill={fill} stroke={region && selected === region ? 'var(--today-text)' : 'none'} strokeWidth="3">{paths.map((d, i) => <path key={i} d={d} />)}</g>;
  })}</svg>)}</div><p className="gym-map-credit"><a href="/MUSCLEMAP-LICENSE.txt" target="_blank" rel="noreferrer">Silueta: MuscleMap · MIT</a></p></>;
}
