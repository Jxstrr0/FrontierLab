// Root component. Holds the in-app screen stack (no URL routes; DEPLOYMENT.md).
import { GameScreen } from './game/GameScreen';
import { NewGameWizard } from './newgame/NewGameWizard';
import { SavesScreen } from './saves/SavesScreen';
import { SettingsScreen } from './settings/SettingsScreen';
import { screen } from './store';
import { TitleScreen } from './title/TitleScreen';
import './components';

export function App() {
  switch (screen.value) {
    case 'newgame':
      return <NewGameWizard />;
    case 'game':
      return <GameScreen />;
    case 'saves':
      return <SavesScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <TitleScreen />;
  }
}
