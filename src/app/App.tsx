// Root component. Holds the in-app screen stack (no URL routes; DEPLOYMENT.md).
// Only the title screen is in the first download; the other screens are
// separate chunks, fetched in the background once the title is up.
import { useEffect } from 'preact/hooks';
import { DEFAULT_SETTINGS } from '../sim/newGame';
import { lazy, whenIdle } from './lazy';
import { loadPrefs } from './saves';
import { applyDisplay } from './settings/display';
import { peekGame, rev, screen } from './store';
import { TitleScreen } from './title/TitleScreen';
import './components';

const GameScreen = lazy(() => import('./game/GameScreen').then((m) => m.GameScreen));
const NewGameWizard = lazy(() => import('./newgame/NewGameWizard').then((m) => m.NewGameWizard));
const SavesScreen = lazy(() => import('./saves/SavesScreen').then((m) => m.SavesScreen));
const SettingsScreen = lazy(() =>
  import('./settings/SettingsScreen').then((m) => m.SettingsScreen),
);
const CreditsScreen = lazy(() => import('./credits/CreditsScreen').then((m) => m.CreditsScreen));

/** Fetches every screen's code ahead of time; resolves when it's all here. */
export function preloadScreens(): Promise<unknown> {
  return Promise.all(
    [GameScreen, NewGameWizard, SavesScreen, SettingsScreen, CreditsScreen].map((c) => c.preload()),
  );
}

export function App() {
  useEffect(() => whenIdle(() => void preloadScreens().catch(() => undefined)), []);
  return (
    <>
      <DisplaySync />
      <CurrentScreen />
    </>
  );
}

/**
 * Keeps text size and reduced motion in step with the loaded game, or with the
 * saved preferences on the title screens. Renders nothing; its own component so
 * the game's per-day updates don't re-render the whole screen tree.
 */
function DisplaySync() {
  void rev.value;
  const { textScale, reducedMotion } = peekGame()?.settings ?? {
    ...DEFAULT_SETTINGS,
    ...loadPrefs(),
  };
  useEffect(() => applyDisplay({ textScale, reducedMotion }), [textScale, reducedMotion]);
  return null;
}

function CurrentScreen() {
  switch (screen.value) {
    case 'newgame':
      return <NewGameWizard />;
    case 'game':
      return <GameScreen />;
    case 'saves':
      return <SavesScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'credits':
      return <CreditsScreen />;
    default:
      return <TitleScreen />;
  }
}
