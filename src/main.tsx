// Boot: load bundled fonts and global styles, then mount <App/> and register the
// offline service worker (production builds only). The `?debug` hook has its
// own entry point, src/debugEntry.ts.
import './app/styles/global';
import { render } from 'preact';
import { App } from './app/App';
import { registerServiceWorker } from './app/pwa/register';

const root = document.getElementById('app');
if (root) render(<App />, root);
registerServiceWorker();
