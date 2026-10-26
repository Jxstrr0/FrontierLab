// Registers the offline service worker (sw.js, written next to index.html by
// swPlugin.ts) in production builds only, so `npm run dev` and tests never run
// it. The URL and scope are relative, so it works under the GitHub Pages
// sub-path /FrontierLab/. Opening the game with `?nosw` removes the worker
// (an escape hatch if a cached build ever needs clearing).
//
// Updates: a new deploy's worker installs in the background and waits. When
// nothing is in play (the title screen with no game loaded) it is switched on
// and the page reloads into the new version at once, so a player doesn't need
// a second launch to see it. Mid-game it waits until the player quits to the
// title. Coming back to the app (iOS resumes it without reloading) checks for
// a new deploy, and the title screen's "Check for updates" button asks on demand
// (checkForUpdate).
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
/** The live registration, once registered (production only). */
let registration: ServiceWorkerRegistration | null = null;
/** Set once a waiting worker has been asked to take over; its arrival reloads the page. */
let applying = false;
/** How long a tapped check waits for a new version to finish downloading. */
const INSTALL_WAIT_MS = 30_000;

/** What a tapped update check found. */
export type UpdateCheck = 'updating' | 'latest' | 'offline';

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

  registration = reg;
  sw.addEventListener('controllerchange', () => {
    if (applying) location.reload();
  });
  let told = false;
  effect(() => {
    if (!updateWaiting.value || applying) return;
    if (canApplyUpdate(screen.value, peekGame() !== null)) {
      applyWaiting(reg);
    } else if (!told && screen.value === 'game') {
      told = true;
      toast('A new version is ready. It loads when you quit to the title screen.', 'info', 5000);
    }
  });
}

/** Asks the waiting worker to take over; the page reloads when it does. */
function applyWaiting(reg: ServiceWorkerRegistration): void {
  if (!reg.waiting) return;
  applying = true;
  reg.waiting.postMessage('skipWaiting');
}

/**
 * The title screen's "Check for updates": asks the site for a newer version and,
 * if there is one, downloads it and reloads into it. Without a worker (dev,
 * `?nosw`, a first visit still installing) it simply reloads the page.
 */
export async function checkForUpdate(): Promise<UpdateCheck> {
  const reg = registration;
  if (!reg || !navigator.serviceWorker.controller) {
    location.reload();
    return 'updating';
  }
  if (!reg.waiting) {
    try {
      await reg.update();
    } catch {
      return 'offline';
    }
    await installed(reg.installing);
  }
  if (!reg.waiting) return 'latest';
  applyWaiting(reg);
  return 'updating';
}

/** Resolves once a downloading worker finishes (or fails, or takes too long). */
function installed(worker: ServiceWorker | null): Promise<void> {
  if (!worker || worker.state !== 'installing') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, INSTALL_WAIT_MS);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installing') return;
      clearTimeout(timer);
      resolve();
    });
  });
}
