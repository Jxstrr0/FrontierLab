// Registers the offline service worker (sw.js, written next to index.html by
// swPlugin.ts) in production builds only, so `npm run dev` and tests never run
// it. The URL and scope are relative, so it works under the GitHub Pages
// sub-path /VaultStreet/. Opening the game with `?nosw` removes the worker
// (an escape hatch if a cached build ever needs clearing).

/** Whether this page should run the service worker. */
export function wantsServiceWorker(url: URL): boolean {
  return !url.searchParams.has('nosw');
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  if (!wantsServiceWorker(new URL(location.href))) {
    void sw.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
    return;
  }
  // After load, so filling the cache never competes with the first paint.
  const register = () => {
    sw.register('./sw.js', { scope: './' }).catch(() => {
      // No offline support this time (e.g. private browsing); the game still runs.
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
