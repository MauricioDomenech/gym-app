import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import { createPortal } from 'react-dom';

export interface RestControl { start(seconds: number, label: string): void }
interface Countdown { deadline: number | null; remaining: number; label: string; id: number }
const left = (timer: Countdown, now: number) => timer.deadline === null ? timer.remaining : Math.max(0, Math.ceil((timer.deadline-now)/1000));
export function RestTimer({ controlRef, active }: { controlRef: Ref<RestControl>; active: boolean }) {
  const [timer, setTimer] = useState<Countdown | null>(null);
  const [now, setNow] = useState(Date.now);
  const [sound, setSound] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);
  const [wakeStatus, setWakeStatus] = useState('');
  const audio = useRef<AudioContext | null>(null);
  const notified = useRef<number | null>(null);
  const serial = useRef(0);
  useImperativeHandle(controlRef, () => ({ start(seconds, label) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const stamp = Date.now(); setNow(stamp);
    setTimer({ deadline: stamp + Math.min(seconds, 3600)*1000, remaining: seconds, label, id: ++serial.current });
  } }));
  useEffect(() => {
    if (!timer) return;
    const update = () => setNow(Date.now());
    const interval = setInterval(update, 250);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', update); };
  }, [timer]);
  const remaining = timer ? left(timer, now) : 0;
  useEffect(() => {
    if (!timer || remaining > 0 || notified.current === timer.id) return;
    notified.current = timer.id;
    if (sound && audio.current?.state === 'running') {
      const oscillator = audio.current.createOscillator(), gain = audio.current.createGain();
      oscillator.connect(gain); gain.connect(audio.current.destination);
      oscillator.frequency.value = 660; gain.gain.setValueAtTime(0.08, audio.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.current.currentTime + 0.5);
      oscillator.start(); oscillator.stop(audio.current.currentTime + 0.5);
      navigator.vibrate?.([150,80,150]);
    }
  }, [remaining, timer, sound]);
  useEffect(() => {
    if (!keepAwake || !active) return;
    if (!('wakeLock' in navigator)) return;
    let cancelled = false;
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || lock && !lock.released) return;
      try { const result = await navigator.wakeLock.request('screen'); if (cancelled) { await result.release(); return; } lock = result; setWakeStatus('Pantalla encendida'); result.addEventListener('release', () => { if (!cancelled) setWakeStatus('Pantalla: en pausa'); }); }
      catch { if (!cancelled) setWakeStatus('El navegador no permitió mantener la pantalla'); }
    };
    void acquire(); document.addEventListener('visibilitychange', acquire);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', acquire); void lock?.release(); };
  }, [keepAwake, active]);
  useEffect(() => () => { void audio.current?.close(); }, []);
  function adjust(seconds: number) {
    if (!timer) return;
    const current = Date.now(), next = Math.max(0, Math.min(3600, left(timer,current)+seconds));
    setNow(current); setTimer({ ...timer, remaining: next, deadline: timer.deadline === null ? null : current+next*1000, id: ++serial.current });
  }
  return <>
    <details className="training-tools"><summary>Descanso y pantalla</summary>
      <div className="training-tool-actions"><button type="button" aria-pressed={sound} onClick={async () => {
        if (sound) { setSound(false); return; }
        try { audio.current ??= new AudioContext(); await audio.current.resume(); setSound(audio.current.state === 'running'); }
        catch { setSound(false); }
      }}>{sound ? 'Sonido activado' : 'Activar sonido'}</button>
      <button type="button" disabled={!('wakeLock' in navigator)} aria-pressed={keepAwake} onClick={() => setKeepAwake(!keepAwake)}>{keepAwake ? wakeStatus || 'Mantener pantalla' : 'Mantener pantalla encendida'}</button></div>
      <p className="training-muted">El aviso funciona con la app abierta. Si el móvil suspende el navegador, el tiempo se actualiza al volver. { !('wakeLock' in navigator) && 'Este navegador no admite mantener la pantalla encendida.'}</p>
    </details>
    {timer && createPortal(<aside className={`coach-rest-timer${remaining === 0 ? ' is-ready' : ''}`} aria-label="Descanso entre series">
      <div className="coach-rest-heading"><div><span>{remaining === 0 ? 'Descanso terminado' : timer.deadline === null ? 'Descanso en pausa' : 'Descansando'}</span><small>{timer.label}</small></div><strong role={remaining === 0 ? 'status' : 'timer'} aria-live={remaining === 0 ? 'polite' : 'off'}>{remaining === 0 ? 'Listo' : `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`}</strong></div>
      <div className="coach-rest-actions"><button type="button" onClick={() => adjust(-15)}>−15 s</button><button type="button" onClick={() => adjust(15)}>+15 s</button>{remaining > 0 && <button type="button" onClick={() => { const stamp = Date.now(); setNow(stamp); setTimer({ ...timer, remaining: left(timer,stamp), deadline: timer.deadline === null ? stamp+timer.remaining*1000 : null }); }}>{timer.deadline === null ? 'Reanudar' : 'Pausar'}</button>}<button type="button" onClick={() => setTimer(null)}>{remaining === 0 ? 'Cerrar' : 'Saltar'}</button></div>
    </aside>, document.querySelector('.today-app') ?? document.body)}
    {timer && <div className="coach-rest-spacer" aria-hidden="true" />}
  </>;
}
