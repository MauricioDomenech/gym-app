export function LoadStepper({ value, onChange, label, step, required = false, placeholder }: { value: string; onChange: (value: string) => void; label: string; step: number; required?: boolean; placeholder?: string }) {
  function adjust(direction: number) {
    const n = Number(value.replace(',', '.'));
    if (Number.isFinite(n)) onChange(String(Math.max(0, Math.round((n + direction * step) * 100) / 100)));
  }
  return <div className="coach-stepper"><button type="button" aria-label={`Reducir ${label}`} onClick={() => adjust(-1)}>−</button><input aria-label={label} inputMode={step === 1 ? 'numeric' : 'decimal'} required={required} placeholder={placeholder ?? '—'} value={value} onChange={e => onChange(e.target.value)} /><button type="button" aria-label={`Aumentar ${label}`} onClick={() => adjust(1)}>+</button></div>;
}
