// The crash screen (SCREENS §1). When the game hits an error it cannot get past
// (most often a save whose numbers the game can't work with), the page used to
// go blank with no way out. This puts up a plain card instead: what happened,
// that the saves are untouched, and a Reload button back to the title screen.
//
// It is plain DOM with its own styles, so it still draws when the app's own
// screens can't. Colours copy the loading screen in index.html.
import { CRASH_DETAIL_MAX_CHARS } from '../config/saveLimits';

/** The kinds of error that mean the game's own code fell over. */
const CRASH_KINDS = new Set(['TypeError', 'RangeError', 'ReferenceError']);
/**
 * Not a crash: a file that didn't download (offline, a new version mid-play)
 * or a browser notice. The screens that load files handle those themselves.
 */
const NOT_A_CRASH = /fetch|import|network|load failed|resizeobserver|aborted/i;

/**
 * Whether an uncaught error should stop the game. `source` is the file it came
 * from, when the browser says; `origin` is the game's own address. Anything
 * from somewhere else (a browser extension) is not the game's.
 */
export function isCrash(error: unknown, source?: string, origin?: string): boolean {
  if (!(error instanceof Error)) return false;
  if (!CRASH_KINDS.has(error.name)) return false;
  if (NOT_A_CRASH.test(error.message)) return false;
  if (source && origin && !source.startsWith(origin)) return false;
  return true;
}

/** The one line of detail shown small on the card, for a bug report. */
export function crashDetail(error: unknown, version: string): string {
  const what = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  return `v${version} · ${what}`.slice(0, CRASH_DETAIL_MAX_CHARS);
}

let shown = false;

/**
 * True once the crash screen is up. The game loop asks before every frame and
 * stops, and with it the weekly autosave, so a broken game is never written
 * over a good save. (The loop asks; this file does not import it, so the crash
 * screen costs the first load nothing.)
 */
export function hasCrashed(): boolean {
  return shown;
}

const CARD_CSS = [
  'position:fixed',
  'inset:0',
  'z-index:2000',
  'display:flex',
  'align-items:center',
  'justify-content:center',
  'padding:calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))',
  'background:#0a1222',
  'color:#ece8da',
  "font-family:'Public Sans',system-ui,-apple-system,'Segoe UI',sans-serif",
  'text-align:center',
].join(';');
const FRAME_CSS = [
  'display:flex',
  'flex-direction:column',
  'align-items:center',
  'gap:14px',
  'width:min(100%,340px)',
  'padding:28px 20px 24px',
  'border:1px solid rgb(184 145 61 / 40%)',
].join(';');
const BUTTON_CSS = [
  'min-width:44px',
  'min-height:44px',
  'padding:10px 24px',
  'border:1px solid #b8913d',
  'border-radius:999px',
  'background:#b8913d',
  'color:#0a1222',
  'font:inherit',
  'font-weight:700',
  'cursor:pointer',
].join(';');

function showCrash(error: unknown, version: string): void {
  if (shown) return;
  shown = true;
  const card = document.createElement('div');
  card.id = 'crash';
  card.setAttribute('role', 'alertdialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-labelledby', 'crash-title');
  card.style.cssText = CARD_CSS;
  const frame = document.createElement('div');
  frame.style.cssText = FRAME_CSS;
  const title = document.createElement('h1');
  title.id = 'crash-title';
  title.textContent = 'Frontier Lab stopped';
  title.style.cssText = 'margin:0;font-size:22px;line-height:1.2';
  const line = (text: string, css: string) => {
    const p = document.createElement('p');
    p.textContent = text;
    p.style.cssText = `margin:0;font-size:14px;line-height:1.45;${css}`;
    return p;
  };
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Reload';
  button.style.cssText = BUTTON_CSS;
  button.onclick = () => location.reload();
  frame.append(
    title,
    line('The game hit a problem it could not get past. Your saves are kept as they were.', ''),
    line(
      'Reload goes back to the title screen. If the same save stops again, tap Load there and pick another slot or a backup.',
      'color:#b3b5ae',
    ),
    button,
    // textContent only: the detail can carry text from a save.
    line(crashDetail(error, version), 'font-size:11px;color:#8d9099;word-break:break-word'),
  );
  card.append(frame);
  document.body.append(card);
  button.focus();
}

/**
 * Watches for errors nothing caught and puts the crash screen up for the ones
 * that are the game's own.
 */
export function installCrashScreen(version: string): void {
  const origin = location.origin;
  window.addEventListener('error', (e) => {
    // A file that fails to download has an element as its target and no error; index.html handles those.
    if (isCrash(e.error, e.filename, origin)) showCrash(e.error, version);
  });
  // A screen that fails while redrawing is reported this way (the redraw runs after the tap that caused it).
  window.addEventListener('unhandledrejection', (e) => {
    if (isCrash(e.reason)) showCrash(e.reason, version);
  });
}
