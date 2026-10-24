// Second entry point, loaded only with `?debug` in the URL (see the inline
// script in index.html). It is a blocking module script, so `window.__vs`
// (src/app/debug.ts) exists by the time the page's load event fires, while the
// normal first download stays small. It shares every module with main.tsx.
import { preloadScreens } from './app/App';
import { installDebug } from './app/debug';

installDebug();
void preloadScreens().catch(() => undefined);
