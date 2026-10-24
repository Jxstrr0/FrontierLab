// Root component. Holds the in-app screen stack (no URL routes; DEPLOYMENT.md).
import { useEffect } from 'preact/hooks';
import { DEFAULT_SETTINGS } from '../sim/newGame';
import { GameScreen } from './game/GameScreen';
import { NewGameWizard } from './newgame/NewGameWizard';
import { loadPrefs } from './saves';
import { SavesScreen } from './saves/SavesScreen';
import { CreditsScreen } from './credits/CreditsScreen';
import { applyDisplay } from './settings/display';
import { SettingsScreen } from './settings/SettingsScreen';
import { peekGame, rev, screen } from './store';
import { TitleScreen } from './title/TitleScreen';
import './components';

export function App() {
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
