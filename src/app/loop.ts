// The real-time game loop (DESIGN §5.1). At 1× one game day passes per second
// (DAY_MS); 2× and 4× scale that. After each weekly tick it autosaves, shows the
// weekly results when settings ask for it, and pauses for game over, expiring
// loan applications and new incidents (the incident modal opens once the weekly
// results are closed), and once a quarter for the board meeting reminder when
// there is an Executive floor (after any other modal). Hidden tabs hold time,
// and so does any open panel, sheet or modal: the clock runs only on the map,
// and real time that passes while it is held is dropped, not banked, so closing
// the weekly results never spends the seconds they were open. stepWeek() runs
// the rest of the current week at once and leaves the game paused, for
// week-by-week play.
import { CAPITAL_BUFFER_PP, DAY_MS, DAYS_PER_WEEK, FEATURES } from '../config/balance';
import { CITIES } from '../data/cities';
import { INCIDENT_SPECS } from '../data/incidents';
import { isQuarterStart } from '../sim/calendar';
import { advanceDay } from '../sim/engine';
import { boardDue, quarterLabel } from '../sim/governance';
import type { GameEvent, GameState } from '../sim/state';
import { homeCountry } from '../sim/treasury';
import { CAPITAL_BUFFER_POLICY } from '../data/newsWorld';
import { saveToSlot } from './saves';
import { play } from './sound/sound';
import { autosave } from './saves/autosave';
import { reportSaveError } from './saves/saveError';
import { bump, clockHeld, modal, peekGame, toast } from './store';
import { MNA_BAD_EVENTS, MNA_EVENT_TEXT } from './investmentBank/mnaToasts';
import { VENTURE_BAD_EVENTS, VENTURE_EVENT_TEXT } from './startup/ventureToasts';
import { AUCTION_BAD_EVENTS, AUCTION_EVENT_TEXT } from './auction/auctionToasts';

const FRAME_MS = 50;
/** A frame longer than this (a stall, a throttled background tab) counts as this much. */
const MAX_FRAME_MS = 250;
let timer: ReturnType<typeof setInterval> | undefined;
let last = 0;
let acc = 0;
/** The last event announced, so each new event toasts once. */
let lastSeen: GameEvent | undefined;
/** Incidents already shown to the player, so only new cases auto-pause. */
let promptedCases = new Set<string>();
/** New cases are waiting for the current modal (weekly results) to close. */
let casesWaiting = false;
/** The board meeting reminder is waiting for the other modals to close. */
let boardWaiting = false;
/** Quarter label of the last board reminder, so each quarter prompts once. */
let remindedQuarter: string | undefined;

export function startLoop(): void {
  stopLoop();
  last = performance.now();
  acc = 0;
  lastSeen = peekGame()?.events.log.at(-1);
  promptedCases = new Set(peekGame()?.incidents.active.map((i) => i.id) ?? []);
  casesWaiting = false;
  boardWaiting = false;
  remindedQuarter = undefined;
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
  elapse(dt);
}

/** True in a browser whose tab is in the background; false where there is no document (tests). */
function pageHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden;
}

/**
 * Moves the game on by `dt` ms of real time (one frame's worth from the loop;
 * tests call it directly). Nothing moves while the game is paused, the clock is
 * held (a panel, sheet or modal such as the weekly results is open) or the page
 * is hidden, and the fraction of a day banked so far is dropped, so play resumes
 * from a clean slate rather than jumping. The hold is checked again before every
 * day inside a frame, because a day's tick can itself open a modal.
 */
export function elapse(dt: number): void {
  const s = peekGame();
  if (!s) return;
  // Hand over from the weekly results to the incident modal, never stacking
  // them, and only once the player is back on the map.
  if (casesWaiting && !clockHeld()) {
    casesWaiting = false;
    if (s.incidents.active.length > 0 && !s.flags.gameOver) modal.value = { type: 'incident' };
  }
  if (boardWaiting && !clockHeld() && !casesWaiting) {
    boardWaiting = false;
    if (boardDue(s)) modal.value = { type: 'boardMeeting', reminder: true };
  }
  if (s.clock.speed === 0 || clockHeld() || pageHidden()) {
    acc = 0;
    return;
  }
  acc += Math.min(dt, MAX_FRAME_MS) * s.clock.speed;
  let changed = false;
  while (acc >= DAY_MS && s.clock.speed > 0 && !clockHeld()) {
    acc -= DAY_MS;
    const week = s.clock.week;
    advanceDay(s);
    changed = true;
    if (s.clock.week !== week) afterWeek(s);
  }
  // A modal opened (or afterWeek paused the game) mid-frame: drop what was banked.
  if (clockHeld() || !(s.clock.speed > 0)) acc = 0;
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
  autosave(s, reportSaveError);

  if (s.settings.autoPauseApplications && expiringApplications(s) > 0) {
    pause('Loan applications expire this week');
    toast('Loan applications expire this week.', 'info');
  }
  const freq = s.settings.weeklyResults;
  const quarter = isQuarterStart(s.meta.startDate, s.clock.day);
  if (freq === 'weekly' || (freq === 'quarterly' && quarter)) {
    modal.value = { type: 'weekly', week: s.clock.week - 1 };
  }
  promptIncidents(s);
  promptBoard(s, quarter);
}

/**
 * SIMULATION §2 auto-pause: at each quarter start, with an Executive floor and no
 * meeting held yet, the board meeting reminder opens once (after other modals).
 */
function promptBoard(s: GameState, quarterStart: boolean): void {
  if (!FEATURES.capitalMarkets || !quarterStart || !s.settings.autoPauseIncidents) return;
  const label = quarterLabel(s);
  if (remindedQuarter === label || !boardDue(s)) return;
  remindedQuarter = label;
  if (modal.value || casesWaiting) boardWaiting = true;
  else modal.value = { type: 'boardMeeting', reminder: true };
}

/** SIMULATION §2 auto-pause: new open cases open the incident modal (after any other modal). */
function promptIncidents(s: GameState): void {
  const fresh = s.incidents.active.filter((i) => !promptedCases.has(i.id));
  for (const i of fresh) promptedCases.add(i.id);
  if (fresh.length === 0 || !s.settings.autoPauseIncidents) return;
  if (modal.value) casesWaiting = true;
  else modal.value = { type: 'incident' };
}

/** Applications the next weekly tick will expire (it drops those with expiresWeek ≤ week). */
function expiringApplications(s: GameState): number {
  return Object.values(s.loanDesk.applications).filter((a) => a.expiresWeek <= s.clock.week + 1)
    .length;
}

const EVENT_TEXT: Record<string, (p: Record<string, unknown>) => string> = {
  ...MNA_EVENT_TEXT,
  ...VENTURE_EVENT_TEXT,
  ...AUCTION_EVENT_TEXT,
  BRANCH_OPENED: (p) => `${String(p.name)} is open for business.`,
  NEW_BRANCH: (p) =>
    p.by === 'coo'
      ? `Your COO leased ${String(p.address)} in ${CITIES[String(p.city)]?.name ?? String(p.city)}. The branch opens after fit-out.`
      : '',
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
  INCIDENT_RESOLVED: (p) => {
    const spec = INCIDENT_SPECS[String(p.type)];
    const title = spec?.title.toLowerCase() ?? 'incident';
    if (p.by === 'manager')
      return spec?.info
        ? `${String(p.scopeName)}: ${title}. Your manager has it in hand.`
        : `${String(p.scopeName)}: your manager handled the ${title} (${String(p.option)}).`;
    if (p.by === 'executive')
      return spec?.info
        ? `${spec.title}: your COO has it in hand.`
        : `Your COO handled the ${title} (${String(p.option)}).`;
    if (p.by === 'deadline' && !spec?.info)
      return `No decision on the ${title}, so we went with “${String(p.option)}”.`;
    return '';
  },
  MILESTONE: (p) => `Milestone reached: ${String(p.title)}.`,
  MANAGER_POACHED: (p) =>
    `${String(p.rival)} poached ${String(p.name)}, the manager of ${String(p.branch)}. Its delegations are back with you.`,
  PAY_REVIEW: (p) => {
    const changed = Number(p.raised) + Number(p.cut);
    return changed > 0
      ? `Your COO's pay review moved ${changed} ${changed === 1 ? 'salary' : 'salaries'} to market${Number(p.premium) ? ` ${Number(p.premium) > 0 ? '+' : '−'}${Math.round(Math.abs(Number(p.premium)) * 100)}%` : ''}.`
      : '';
  },
  BANK_RUN: () => 'Depositors are queueing to withdraw: a bank run has started.',
  BANK_RUN_ENDED: () => 'The bank run is over.',
};

/** Events about a country toast only when it is your home country (nine central banks meet). */
const HOME_ONLY = new Set(['CB_DECISION', 'POLICY_PASSED']);
const BAD_EVENTS = new Set([
  'WINDOW_USE',
  'MANAGER_POACHED',
  'BANK_RUN',
  ...MNA_BAD_EVENTS,
  ...VENTURE_BAD_EVENTS,
  ...AUCTION_BAD_EVENTS,
]);

function announceEvents(s: GameState): void {
  const log = s.events.log;
  // The log drops old weeks every tick, so track the last event announced by
  // identity rather than by index (trimming keeps the same objects).
  // If it has aged out of the log (a fast-forward), skip the backlog rather than flood toasts.
  const at = lastSeen ? log.indexOf(lastSeen) : -1;
  const from = !lastSeen ? 0 : at >= 0 ? at + 1 : log.length;
  const home = homeCountry(s).id;
  for (const e of log.slice(from)) {
    if (HOME_ONLY.has(e.type) && e.payload.country !== home) continue;
    if (e.type === 'APPRAISAL_DONE' && e.payload.genuine === false) play('stamp');
    const text = EVENT_TEXT[e.type]?.(e.payload);
    if (text) toast(text, BAD_EVENTS.has(e.type) ? 'bad' : 'info');
  }
  lastSeen = log.at(-1) ?? lastSeen;
}
