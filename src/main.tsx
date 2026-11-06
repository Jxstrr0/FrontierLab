// Boot: load bundled fonts and global styles, then mount <App/> and register the
// offline service worker (production builds only). The `?debug` hook has its
// own entry point, src/debugEntry.ts. index.html paints a loading screen
// (#boot) on the first frame; it fades out here once the title screen is on
// screen, or shows an error and a Reload button if boot throws.
import './app/styles/global';
import { render } from 'preact';
import { App } from './app/App';
import { registerServiceWorker } from './app/pwa/register';
import { failBoot, hideBoot } from './app/boot';

try {
  const root = document.getElementById('app');
  if (!root) throw new Error('No #app element');
  render(<App />, root);
  hideBoot();
} catch (e) {
  console.error(e);
  failBoot();
}
registerServiceWorker();
