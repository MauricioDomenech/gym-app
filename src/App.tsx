import { ThemeProvider } from './contexts/ThemeContext';
import { TodayApp } from './components/today/TodayApp';
import { CoachAccess } from './components/auth/CoachAccess';
import { coachAuth } from './components/auth/coachAuth';

function App() {
  return (
    <ThemeProvider>
      <CoachAccess>
        <TodayApp onSignOut={async () => {
          const result = await coachAuth?.auth.signOut({ scope: 'local' });
          if (result?.error) throw new Error('No pude cerrar la sesión. Volvé a intentarlo.');
        }} />
      </CoachAccess>
    </ThemeProvider>
  );
}

export default App;
