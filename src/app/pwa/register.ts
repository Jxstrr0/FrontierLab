// Registers the offline service worker (sw.js, written next to index.html by
// swPlugin.ts) in production builds only, so `npm run dev` and tests never run
// it. The URL and scope are relative, so it works under the GitHub Pages
// sub-path /VaultStreet/. Opening the game with `?nosw` removes the worker
// (an escape hatch if a cached build ever needs clearing).
//
// Updates: a new deploy's worker installs in the background and waits. When
// nothing is in play (the title screen with no game loaded) it is switched on
// and the page reloads into the new version at once, so a player doesn't need
// a second launch to see it. Mid-game it waits until the player quits to the
// title. Coming back to the app (iOS resumes it without reloading) checks for
// a new deploy.
import { effect, signal } from '@preact/signals';
import { peekGame, screen, toast, type Screen } from '../store';

/** Whether this page should run the service worker. */
export function wantsServiceWorker(url: URL): boolean {
  return !url.searchParams.has('nosw');
}

/** Whether a waiting update can replace the page now without losing anything. */
export function canApplyUpdate(current: Screen, gameLoaded: boolean): boolean {
  return current === 'title' && !gameLoaded;
}

/** A new version has installed and is waiting to take over. */
const updateWaiting = signal(false);

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  if (!wantsServiceWorker(new URL(location.href))) {
    void sw.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
    return;
  }
  // After load, so filling the cache never competes with the first paint.
  const register = () => {
    sw.register('./sw.js', { scope: './' })
      .then(watchForUpdates)
      .catch(() => {
        // No offline support this time (e.g. private browsing); the game still runs.
      });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/** Notices a waiting worker, applies it when safe, and checks again on return. */
function watchForUpdates(reg: ServiceWorkerRegistration): void {
  const sw = navigator.serviceWorker;
  // Only a page that already had a worker is upgrading; a first visit isn't.
  const flagIfWaiting = () => {
    if (reg.waiting && sw.controller) updateWaiting.value = true;
  };
  flagIfWaiting();
  reg.addEventListener('updatefound', () => {
    const next = reg.installing;
    next?.addEventListener('statechange', () => {
      if (next.state === 'installed') flagIfWaiting();
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
  });

  let applying = false;
  sw.addEventListener('controllerchange', () => {
    if (applying) location.reload();
  });
  let told = false;
  effect(() => {
    if (!updateWaiting.value || applying) return;
    if (canApplyUpdate(screen.value, peekGame() !== null)) {
      applying = true;
      reg.waiting?.postMessage('skipWaiting');
    } else if (!told && screen.value === 'game') {
      told = true;
      toast('A new version is ready. It loads when you quit to the title screen.', 'info', 5000);
    }
  });
}
