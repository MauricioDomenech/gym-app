import { useState } from 'react';
import type { FC } from 'react';
import { usePhase } from '../../contexts/PhaseContext';
import { useTheme } from '../../contexts/ThemeContext';

type IconName =
  | 'arrow'
  | 'chart'
  | 'cloud-sun'
  | 'home'
  | 'meals'
  | 'moon'
  | 'pin'
  | 'play'
  | 'scale'
  | 'sun'
  | 'training';

interface IconProps {
  name: IconName;
  size?: number;
}

const Icon: FC<IconProps> = ({ name, size = 24 }) => (
  <svg
    aria-hidden="true"
    className="today-icon"
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
  >
    {name === 'arrow' && (
      <>
        <path d="M4 12h15" />
        <path d="m13 6 6 6-6 6" />
      </>
    )}
    {name === 'chart' && (
      <>
        <path d="M5 20V12" />
        <path d="M12 20V6" />
        <path d="M19 20V3" />
      </>
    )}
    {name === 'cloud-sun' && (
      <>
        <path d="M17 17H7.5a4.5 4.5 0 1 1 1.8-8.63A5.5 5.5 0 0 1 20 10.5" />
        <path d="M16 4V2M20.24 5.76l1.42-1.42M21 10h2M4.76 5.76 3.34 4.34M3 10H1" />
      </>
    )}
    {name === 'home' && <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />}
    {name === 'meals' && (
      <>
        <path d="M5 3v8M2 3v5a3 3 0 0 0 6 0V3M5 11v10" />
        <path d="M16 3c-2.2 1.8-2.8 5.6-1.1 7.1.8.7 1.8.9 2.8.9H20v10" />
        <path d="M20 3v18" />
      </>
    )}
    {name === 'moon' && <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />}
    {name === 'pin' && (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    )}
    {name === 'play' && <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />}
    {name === 'scale' && (
      <>
        <path d="M6 4h12a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2Z" />
        <path d="M8 4a4 4 0 0 1 8 0M12 8l2.5 2.5M12 8 9.5 10.5" />
        <path d="M8 16h8" />
      </>
    )}
    {name === 'sun' && (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </>
    )}
    {name === 'training' && (
      <>
        <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
      </>
    )}
  </svg>
);

interface TodayAppProps {
  onOpenLegacy: () => void;
  onOpenPlan: () => void;
}

type TodaySection = 'today' | 'training' | 'meals' | 'progress';

const todaySections = [
  ['today', 'Hoy', 'home'],
  ['training', 'Entrenamiento', 'training'],
  ['meals', 'Comidas', 'meals'],
  ['progress', 'Progreso', 'chart'],
] as const satisfies ReadonlyArray<readonly [TodaySection, string, IconName]>;

const formatToday = (): string => {
  const date = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date());

  return date.replace(/ de /, ' ').toLocaleUpperCase('es-ES');
};

const phaseNames = {
  maintenance: 'Mantenimiento',
  volume: 'Volumen',
  definicion: 'Plan Recomp Lenta 2026',
} as const;

export const TodayApp: FC<TodayAppProps> = ({ onOpenLegacy, onOpenPlan }) => {
  const { currentPhase } = usePhase();
  const { theme, toggleTheme } = useTheme();
  const [notice, setNotice] = useState('');
  const [activeSection, setActiveSection] = useState<TodaySection>('today');
  const hasPlan = currentPhase !== null;
  const planName = currentPhase ? phaseNames[currentPhase] : null;
  const isHome = activeSection === 'today';
  const sectionTitle = todaySections.find(([key]) => key === activeSection)?.[1] ?? 'Hoy';

  const showNotice = (message: string) => {
    setNotice(message);
  };

  const showUnavailable = (section: string) => {
    showNotice(`${section} todavía no está conectado.`);
  };

  return (
    <div className="today-app">
      <main className="today-main">
        <header className={isHome ? 'today-header' : 'today-header today-header-section'}>
          <div>
            <p className="today-date">{formatToday()}</p>
            <h1>{sectionTitle}</h1>
            {isHome && (
              <>
                <p className="today-greeting">Buen día, Mauri</p>
                <div className="today-header-links">
                  <button onClick={onOpenPlan} type="button">Mi plan</button>
                  <span aria-hidden="true">·</span>
                  <button onClick={onOpenLegacy} type="button">Ver app anterior</button>
                </div>
              </>
            )}
          </div>

          <div className="today-header-actions">
            <button
              aria-label="Cambiar tema"
              className="today-icon-button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Usar modo claro' : 'Usar modo oscuro'}
              type="button"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
            </button>
            <button aria-label="Registrar peso" className="today-weight-button" onClick={() => showNotice('El registro de peso todavía no está conectado.')} type="button">
              <Icon name="scale" size={24} />
              <span>Registrar peso</span>
            </button>
          </div>
        </header>

        {isHome ? (
          <>
            <section aria-labelledby="weather-heading" className="today-card today-weather-card">
              <div className="today-card-heading">
                <div className="today-card-label">
                  <Icon name="cloud-sun" size={25} />
                  <span id="weather-heading">METEOROLOGÍA</span>
                </div>
                <span className="today-status-pill">Sin configurar</span>
              </div>
              <div className="today-weather-content">
                <div className="today-weather-symbol">
                  <Icon name="cloud-sun" size={66} />
                </div>
                <div>
                  <div className="today-weather-value">—</div>
                  <p className="today-weather-title">Antes de salir</p>
                  <p className="today-weather-detail">Ubicación y horarios pendientes</p>
                </div>
              </div>
              <div className="today-weather-note">
                <Icon name="pin" size={21} />
                <span>Configurá ubicación y horario de ida/vuelta para ver un pronóstico real.</span>
              </div>
            </section>

            <section aria-labelledby="training-heading" className="today-card">
              <div className="today-card-heading">
                <div className="today-card-label">
                  <Icon name="training" size={27} />
                  <span id="training-heading">TU ENTRENAMIENTO</span>
                </div>
                <span className="today-status-pill">{hasPlan ? 'Plan activo' : 'Sin plan'}</span>
              </div>
              <h2>{planName ?? 'Entrenamiento de hoy'}</h2>
              <p className="today-card-subtitle">{hasPlan ? 'Resumen del día pendiente.' : 'Todavía no hay una fase seleccionada.'}</p>
              <p className="today-card-helper">{hasPlan ? 'El detalle y tu registro aparecerán cuando el resumen esté conectado.' : 'Elegí un plan desde «Mi plan» para ver tu entrenamiento.'}</p>
              <button className="today-primary-button" onClick={hasPlan ? onOpenLegacy : onOpenPlan} type="button">
                <Icon name="play" size={22} />
                <span>{hasPlan ? 'Abrir app anterior' : 'Elegir un plan'}</span>
                <Icon name="arrow" size={26} />
              </button>
            </section>

            <section aria-labelledby="meals-heading" className="today-card">
              <div className="today-card-heading">
                <div className="today-card-label">
                  <Icon name="meals" size={27} />
                  <h2 id="meals-heading">Tus comidas</h2>
                </div>
                <span className="today-status-pill">{hasPlan ? 'Plan activo' : 'Sin plan'}</span>
              </div>
              <div className="today-empty-state">
                <strong>{hasPlan ? planName : 'Comidas de hoy no configuradas'}</strong>
                <p>{hasPlan ? 'Resumen del día pendiente. El menú aparecerá cuando esta sección esté conectada.' : 'El menú aparecerá cuando haya una fase seleccionada.'}</p>
              </div>
              <button className="today-secondary-button" onClick={() => showUnavailable('Las comidas')} type="button">
                <span>Ver comidas de hoy</span>
                <Icon name="arrow" size={25} />
              </button>
            </section>

            <p className="today-view-note">La meteorología, la rutina y el menú se mostrarán cuando estén configurados.</p>
          </>
        ) : (
          <section aria-labelledby="construction-heading" className="today-card today-construction-card">
            <h2 id="construction-heading">{sectionTitle}</h2>
            <p>En construcción</p>
          </section>
        )}

        {notice && (
          <p aria-live="polite" className="today-notice" role="status">
            {notice}
            <button aria-label="Cerrar aviso" onClick={() => setNotice('')} type="button">×</button>
          </p>
        )}
      </main>

      <nav aria-label="Navegación principal" className="today-bottom-nav">
        {todaySections.map(([key, label, icon]) => {
          const isActive = key === activeSection;
          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={isActive ? 'today-nav-item is-active' : 'today-nav-item'}
              key={key}
              onClick={() => setActiveSection(key)}
              type="button"
            >
              <span className="today-nav-icon"><Icon name={icon} size={26} /></span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
