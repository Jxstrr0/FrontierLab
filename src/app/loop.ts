// The real-time game loop (DESIGN §5.1). At 1× one game day passes per second
// (DAY_MS); 2× and 4× scale that. After each weekly tick it autosaves, shows the
// weekly results when settings ask for it, and pauses for game over or expiring
// loan applications. Hidden tabs pause time. stepWeek() runs the rest of the
// current week at once and leaves the game paused, for week-by-week play.
import { CAPITAL_BUFFER_PP, DAY_MS, DAYS_PER_WEEK } from '../config/balance';
import { isQuarterStart } from '../sim/calendar';
import { advanceDay } from '../sim/engine';
import type { GameState } from '../sim/state';
import { homeCountry } from '../sim/treasury';
import { CAPITAL_BUFFER_POLICY } from '../data/newsWorld';
import { saveToSlot } from './saves';
import { bump, modal, peekGame, toast } from './store';

const FRAME_MS = 50;
let timer: ReturnType<typeof setInterval> | undefined;
let last = 0;
let acc = 0;
/** Event-log length already announced, so each new event toasts once. */
let seenEvents = 0;

export function startLoop(): void {
  stopLoop();
  last = performance.now();
  acc = 0;
  seenEvents = peekGame()?.events.log.length ?? 0;
  timer = setInterval(frame, FRAME_MS);
}

export function stopLoop(): void {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
}

export function setSpeed(speed: GameState['clock']['speed']): void {
  const s = peekGame();
  if (!s || s.flags.gameOver) return;
  s.clock.speed = speed;
  if (speed > 0) delete s.clock.pausedReason;
  acc = 0;
  bump();
}

export function pause(reason?: string): void {
  const s = peekGame();
  if (!s) return;
  s.clock.speed = 0;
  if (reason) s.clock.pausedReason = reason;
  bump();
}

/** Plays out the days left in this week instantly, then pauses (week-by-week play). */
export function stepWeek(): void {
  const s = peekGame();
  if (!s || s.flags.gameOver || modal.value) return;
  s.clock.speed = 0;
  delete s.clock.pausedReason;
  acc = 0;
  const week = s.clock.week;
  for (let i = 0; i < DAYS_PER_WEEK && s.clock.week === week; i++) advanceDay(s);
  if (s.clock.week !== week) afterWeek(s);
  bump();
}

function frame(): void {
  const now = performance.now();
  const dt = now - last;
  last = now;
  const s = peekGame();
  if (!s || s.clock.speed === 0 || modal.value || document.hidden) return;
  acc += Math.min(dt, 250) * s.clock.speed;
  let changed = false;
  while (acc >= DAY_MS && s.clock.speed > 0) {
    acc -= DAY_MS;
    const week = s.clock.week;
    advanceDay(s);
    changed = true;
    if (s.clock.week !== week) afterWeek(s);
    if (modal.value) break;
  }
  if (changed) bump();
}

function afterWeek(s: GameState): void {
  announceEvents(s);
  if (s.flags.gameOver) {
    s.clock.speed = 0;
    saveToSlot('auto', s);
    modal.value = { type: 'gameover' };
    return;
  }
  const err = saveToSlot('auto', s);
  if (err) toast(err, 'bad');

  if (s.settings.autoPauseApplications && expiringApplications(s) > 0) {
    pause('Loan applications expire this week');
    toast('Loan applications expire this week.', 'info');
  }
  const freq = s.settings.weeklyResults;
  const quarter = isQuarterStart(s.meta.startDate, s.clock.day);
  if (freq === 'weekly' || (freq === 'quarterly' && quarter)) {
    modal.value = { type: 'weekly', week: s.clock.week - 1 };
  }
}

/** Applications the next weekly tick will expire (it drops those with expiresWeek ≤ week). */
function expiringApplications(s: GameState): number {
  return Object.values(s.loanDesk.applications).filter((a) => a.expiresWeek <= s.clock.week + 1)
    .length;
}

const EVENT_TEXT: Record<string, (p: Record<string, unknown>) => string> = {
  BRANCH_OPENED: (p) => `${String(p.name)} is open for business.`,
  CB_DECISION: (p) => {
    const change = Number(p.change);
    const verb = change > 0 ? 'raised' : change < 0 ? 'cut' : 'held';
    return `${String(p.cb)} ${verb} its policy rate${change ? ' to' : ' at'} ${(Number(p.rate) * 100).toFixed(2)}%.`;
  },
  WINDOW_USE: () => 'Treasury borrowed from the central bank window.',
  POLICY_PASSED: (p) =>
    p.policyId === CAPITAL_BUFFER_POLICY
      ? `Lawmakers passed a capital buffer: capital requirements rise by ${CAPITAL_BUFFER_PP} pp for a year.`
      : '',
};

/** Events about a country toast only when it is your home country (nine central banks meet). */
const HOME_ONLY = new Set(['CB_DECISION', 'POLICY_PASSED']);

function announceEvents(s: GameState): void {
  const log = s.events.log;
  if (seenEvents > log.length) seenEvents = 0;
  const home = homeCountry(s).id;
  for (const e of log.slice(seenEvents)) {
    if (HOME_ONLY.has(e.type) && e.payload.country !== home) continue;
    const text = EVENT_TEXT[e.type]?.(e.payload);
    if (text) toast(text, e.type === 'WINDOW_USE' ? 'bad' : 'info');
  }
  seenEvents = log.length;
}
