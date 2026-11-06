// The loading screen from index.html (#boot): fade it out once the app has
// mounted, or turn it into an error line with a Reload button. The inline
// script in index.html defines window.__bootFail and also catches files that
// fail to download, which happens before any of this code can run.

/** Fade time; matches the transition on #boot in index.html. */
const BOOT_FADE_MS = 320;

declare global {
  interface Window {
    __bootFail?: (message?: string) => void;
  }
}

/** Fades the loading screen out after the title screen has painted, then removes it. */
export function hideBoot(): void {
  const boot = document.getElementById('boot');
  if (!boot) return;
  // Two frames: the first lets the browser lay out the title screen, the
  // second runs after it has painted, so the fade never shows a blank page.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      boot.classList.add('boot-done');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(() => boot.remove(), reduced ? 0 : BOOT_FADE_MS + 50);
    }),
  );
}

/** Shows the plain "could not start" line with a Reload button. */
export function failBoot(): void {
  window.__bootFail?.('Frontier Lab could not start. Reloading usually fixes it.');
}
