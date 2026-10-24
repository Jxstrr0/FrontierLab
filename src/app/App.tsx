// Root component. Holds the in-app screen stack (no URL routes; DEPLOYMENT.md).
// Stage 0 has a single screen: the title.
import { TitleScreen } from './title/TitleScreen';

export function App() {
  return <TitleScreen />;
}
