// Applies the display settings to the whole app: text size scales #app with CSS
// zoom, and reduced motion adds a class to <html> that turns movement into fades.
import type { Settings } from '../../sim/state';
import './display.css';

export function applyDisplay(d: Pick<Settings, 'textScale' | 'reducedMotion'>): void {
  const app = document.getElementById('app');
  if (app) app.style.zoom = d.textScale === 1 ? '' : String(d.textScale);
  // display.css divides viewport-based sizes by this so zoom doesn't overshoot them.
  document.documentElement.style.setProperty('--ui-zoom', String(d.textScale));
  document.documentElement.classList.toggle('reduced-motion', d.reducedMotion);
  // display.css rearranges a few crowded bars when text is larger than 100%.
  document.documentElement.classList.toggle('text-large', d.textScale > 1);
}

/** Whether motion should be reduced now: the in-game setting or the system's. */
export function motionReduced(): boolean {
  return (
    document.documentElement.classList.contains('reduced-motion') ||
    (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
}
