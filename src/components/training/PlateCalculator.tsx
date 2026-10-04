import { useState } from 'react';
import { plateCalculation } from './trainingInsights';
const sizes = [25,20,15,10,5,2.5,1.25];
export function PlateCalculator() {
  const [total, setTotal] = useState(''), [bar, setBar] = useState('20'), [available, setAvailable] = useState(sizes);
  const result = total.trim() && bar.trim() ? plateCalculation(Number(total.replace(',','.')),Number(bar.replace(',','.')),available) : null;
  return <details className="training-tools"><summary>Calculadora de discos</summary><p className="training-muted">Carga total de una barra simétrica, incluida la barra. No sirve para convertir placas de una máquina ni peso por mancuerna.</p>
    <div className="training-tool-fields"><label>Total · kg<input inputMode="decimal" value={total} onChange={e => setTotal(e.target.value)} /></label><label>Barra · kg<input inputMode="decimal" value={bar} onChange={e => setBar(e.target.value)} /></label></div>
    <fieldset><legend>Discos disponibles · kg</legend><div className="training-plate-options">{sizes.map(size => <label key={size}><input type="checkbox" checked={available.includes(size)} onChange={e => setAvailable(e.target.checked ? [...available,size] : available.filter(s=>s!==size))} />{size}</label>)}</div></fieldset>
    <p role="status">{result ? `Por lado: ${result.plates.length ? result.plates.join(' + ')+' kg' : 'sin discos'}. Total: ${result.achievable} kg.${result.missing > 0 ? ` Faltan ${result.missing} kg para el objetivo; no redondeé hacia arriba.` : ''}` : total ? 'Indicá una carga total igual o mayor que la barra, hasta 2000 kg.' : 'Indicá el peso total que querés montar.'}</p><p className="training-muted">Supone suficientes pares de cada tamaño seleccionado. Confirmá el peso de tu barra.</p>
  </details>;
}
