import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { coachAuth } from './coachAuth';
import { setTrainingAccessTokenReader, trainingAuthorization } from '../training/trainingHttp';
import { createTrainingRemoteClient } from '../training/trainingSync';
import { acceptTrainingResponse, clearTrainingResponse, removeLegacyTrainingCopies } from '../training/trainingConnection';

if (coachAuth) setTrainingAccessTokenReader(async () => {
  const { data, error } = await coachAuth!.auth.getSession();
  if (error) throw new Error('No pude comprobar la sesión. Volvé a entrar.');
  return data.session?.access_token ?? null;
});

export function CoachAccess({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<'checking' | 'login' | 'ready' | 'error'>('checking');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!coachAuth) return;
    let active = true;
    const check = async () => {
      try {
        const { data, error: sessionError } = await coachAuth!.auth.getSession();
        if (!active) return;
        if (sessionError) throw new Error('No pude recuperar la sesión.');
        if (!data.session) { clearTrainingResponse(); setPhase('login'); return; }
        const response = await fetch('/api/training?resource=identity', {
          headers: await trainingAuthorization(), signal: AbortSignal.timeout(10_000),
        });
        if (response.status === 503) throw new Error('El servidor no pudo conectar con el servicio de acceso. Tu sesión puede seguir siendo válida; no hace falta pedir otro código. Probá volver a intentar más tarde.');
        if (!response.ok) throw new Error('No pude verificar tu acceso privado. Revisá la conexión o entrá con la cuenta autorizada.');
        const identity: unknown = await response.json();
        if (!identity || typeof identity !== 'object' || !('ownerId' in identity) || typeof identity.ownerId !== 'string') throw new Error('No pude verificar la cuenta.');
        const remote = await createTrainingRemoteClient().read();
        if (!active) return;
        removeLegacyTrainingCopies();
        acceptTrainingResponse(remote);
        setPhase('ready');
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'No pude abrir tus registros.');
        setPhase('error');
      }
    };
    void check();
    const { data: subscription } = coachAuth.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearTrainingResponse(); setSent(false); setCode(''); setEmail(''); setError(''); setPhase('login');
      }
    });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, [attempt]);

  const returnToLogin = () => {
    // Discard only this browser's access session, even if remote logout fails.
    try {
      localStorage.removeItem('coach-auth-v1');
      clearTrainingResponse();
      window.location.reload();
    } catch {
      setError('No pude limpiar el acceso de este navegador. Comprobá que permita guardar datos e intentá de nuevo.');
    }
  };

  const retry = () => { setError(''); setPhase('checking'); setAttempt(value => value + 1); };
  const login = async (event: FormEvent) => {
    event.preventDefault();
    if (!coachAuth) return;
    setBusy(true); setError('');
    try {
      if (!sent) {
        const { error: loginError } = await coachAuth.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
        if (loginError) {
          if (loginError.code === 'over_email_send_rate_limit') {
            throw new Error('Se alcanzó el límite temporal de correos. Tu email está bien; esperá a que se renueve el límite antes de pedir otro código.');
          }
          if (loginError.status === 429) {
            throw new Error('Hubo demasiados intentos seguidos. Esperá un momento antes de pedir otro código.');
          }
          throw new Error('No pude enviar el código. Puede haber un problema de conexión o del servicio de correo. Intentá de nuevo más tarde.');
        }
        setSent(true);
      } else {
        const { error: loginError } = await coachAuth.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
        if (loginError) throw new Error('El código no es válido o venció.');
        retry();
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pude iniciar sesión.'); }
    finally { setBusy(false); }
  };

  if (phase === 'ready') return children;
  return <div className="today-app"><main className="today-main coach-access">
    <section className="today-card" aria-labelledby="coach-access-heading">
      <h1 id="coach-access-heading">Tu espacio de entrenamiento</h1>
      {!coachAuth ? <p>El acceso privado todavía no está configurado.</p> : phase === 'checking' ? <p role="status">Abriendo tus registros…</p> : phase === 'login' ? <>
        <p>{sent ? 'Ingresá el código que recibiste por email.' : 'Entrá con tu email para recuperar tu rutina y tus registros.'}</p>
        <form className="today-settings-form" onSubmit={login}>
          <label className="today-settings-label">Email<input className="today-settings-input" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={sent || busy} required /></label>
          {sent && <label className="today-settings-label">Código<input className="today-settings-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value)} required /></label>}
          <button className="today-primary-button" disabled={busy} type="submit"><span>{busy ? 'Un momento…' : sent ? 'Entrar' : 'Recibir código'}</span></button>
          {sent && <button className="today-settings-button" disabled={busy} onClick={() => { setSent(false); setCode(''); }} type="button">Cambiar email o pedir otro código</button>}
        </form>
      </> : <button className="today-settings-button" onClick={retry}>Volver a intentar</button>}
      {error && <p className="today-settings-error" role="alert">{error}</p>}
      {coachAuth && phase === 'error' && <button className="today-settings-button coach-access-exit" onClick={returnToLogin}>Volver al acceso</button>}
    </section>
  </main></div>;
}
