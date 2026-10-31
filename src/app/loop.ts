// The real-time game loop (DESIGN §5.1). At 1× one game day passes per second
// (DAY_MS); 2× and 4× scale that. After each weekly tick it autosaves, shows the
// results when settings ask for it, and pauses for game over, expiring proposal
// requests, the first week in the red and new incidents (the incident modal
// opens once the results are closed). Hidden tabs hold time,
// and so does any open panel, sheet or modal: the clock runs only on the map,
// and real time that passes while it is held is dropped, not banked, so closing
// the weekly results never spends the seconds they were open. stepWeek() runs
// the rest of the current week at once and leaves the game paused, for
// week-by-week play. skipAhead() runs flat out (SKIP_DAYS_PER_SECOND) until
// something needs you: a popup, a bad notice, cash below zero, or the end of
// the month, which shows that month's results; then it pauses. Resuming after
// any pause returns to the speed you were playing at. Info-only incidents
// (nothing to decide) become notices instead of popups, and the quarter's
// board meeting is a HUD chip rather than a popup.
import { signal } from '@preact/signals';
import {
  CAPITAL_BUFFER_PP,
  DAY_MS,
  DAYS_PER_WEEK,
  SAFETY,
  SKIP_DAYS_PER_SECOND,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { INCIDENT_SPECS } from '../data/incidents';
import { isQuarterStart } from '../sim/calendar';
import { advanceDay } from '../sim/engine';
import { boardDue, quarterLabel } from '../sim/governance';
import type { GameEvent, GameState } from '../sim/state';
import { homeCountry } from '../sim/homeCountry';
import { CAPITAL_BUFFER_POLICY } from '../data/newsWorld';
import { saveToSlot } from './saves';
import { play } from './sound/sound';
import { autosave } from './saves/autosave';
import { reportSaveError } from './saves/saveError';
import { resolveIncident, setSettings } from '../sim/commands';
import { bump, clockHeld, modal, notice, peekGame } from './store';
import { periodKey } from './weekly/resultsPeriod';
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
/** Quarter label of the last board reminder: the HUD shows the Board chip for it while a meeting is due. */
export const boardChipQuarter = signal<string | undefined>(undefined);
/** The speed to resume at after a pause (the one you were playing at). */
let resumeSpeed: 1 | 2 | 4 | undefined;
/** Skip ahead is running; it stops at the month key below or anything that needs you. */
export const skipping = signal(false);
let skipMonth = '';
/** Annual reports already on file when shown, so each year end opens its report once. */
let shownYears = 0;
/** The year's annual report is waiting for the results modal to close. */
let annualWaiting = false;

export function startLoop(): void {
  stopLoop();
  last = performance.now();
  acc = 0;
  lastSeen = peekGame()?.events.log.at(-1);
  promptedCases = new Set(peekGame()?.incidents.active.map((i) => i.id) ?? []);
  casesWaiting = false;
  boardChipQuarter.value = undefined;
  resumeSpeed = undefined;
  skipping.value = false;
  shownYears = peekGame()?.history.yearly.length ?? 0;
  annualWaiting = false;
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
  if (speed > 0) {
    delete s.clock.pausedReason;
    resumeSpeed = speed as 1 | 2 | 4;
  }
  skipping.value = false;
  acc = 0;
  bump();
}

/** Play again at the speed you were playing at before the pause (or the default speed). */
export function resume(): void {
  const s = peekGame();
  if (!s) return;
  setSpeed(resumeSpeed ?? s.settings.defaultSpeed);
}

export function pause(reason?: string): void {
  const s = peekGame();
  if (!s) return;
  if (s.clock.speed > 0) resumeSpeed = s.clock.speed as 1 | 2 | 4;
  s.clock.speed = 0;
  skipping.value = false;
  if (reason) s.clock.pausedReason = reason;
  bump();
}

/** HUD ⏭: run flat out to the end of the month, or sooner if something needs you. */
export function skipAhead(): void {
  const s = peekGame();
  if (!s || s.flags.gameOver || clockHeld()) return;
  if (skipping.value) return pause();
  if (s.clock.speed === 0) s.clock.speed = resumeSpeed ?? s.settings.defaultSpeed;
  delete s.clock.pausedReason;
  skipMonth = periodKey('monthly', s.meta.startDate, s.clock.week);
  skipping.value = true;
  acc = 0;
  bump();
}

/** Ends a skip ahead and leaves the game paused, saying why. */
function stopSkip(reason?: string): void {
  if (skipping.value) pause(reason);
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
  // Hand over from the weekly results to the annual report, then the incident
  // modal, never stacking them, and only once the player is back on the map.
  if (annualWaiting && !clockHeld()) {
    annualWaiting = false;
    if (!s.flags.gameOver) modal.value = { type: 'annual' };
  }
  if (casesWaiting && !clockHeld()) {
    casesWaiting = false;
    if (s.incidents.active.length > 0 && !s.flags.gameOver) modal.value = { type: 'incident' };
  }
  if (s.clock.speed === 0 || clockHeld() || pageHidden()) {
    acc = 0;
    return;
  }
  const rate = skipping.value ? (SKIP_DAYS_PER_SECOND * DAY_MS) / 1000 : s.clock.speed;
  acc += Math.min(dt, MAX_FRAME_MS) * rate;
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
  // Skip ahead stops for any popup, and the game waits paused once it closes.
  if (skipping.value && clockHeld()) stopSkip();
  if (changed) bump();
}

function afterWeek(s: GameState): void {
  const bad = announceEvents(s);
  if (s.flags.gameOver) {
    s.clock.speed = 0;
    skipping.value = false;
    void saveToSlot('auto', s);
    modal.value = { type: 'gameover' };
    return;
  }
  autosave(s, reportSaveError);

  if (s.settings.autoPauseApplications && expiringRfps(s) > 0) {
    pause('Proposal requests expire this week');
    notice('Proposal requests expire this week.', 'info');
  }
  // The first week in the red pauses once: four weeks there with no credit is game over.
  if (s.company.negativeCashWeeks === 1) {
    pause('Cash is below zero');
    notice('Cash is below zero. Four weeks in the red with no credit ends the game.', 'bad', 6000);
  }
  const newYear = s.history.yearly.length > shownYears;
  if (newYear && shownYears === 0 && s.settings.weeklyResults === 'weekly') {
    // After the first year, results come monthly so the week-by-week sheet stops interrupting.
    setSettings(s, { weeklyResults: 'monthly' });
    notice('Results now come once a month. Change it in Settings or at the foot of the results.');
  }
  const quarter = isQuarterStart(s.meta.startDate, s.clock.day);
  showResults(s, newYear);
  promptAnnual(s);
  promptIncidents(s);
  promptBoard(s, quarter);
  if (skipping.value) {
    if (bad) stopSkip('Something needs your attention');
    else if (periodKey('monthly', s.meta.startDate, s.clock.week) !== skipMonth)
      stopSkip('Skipped to the end of the month');
  }
}

/**
 * Opens the results the settings ask for. While skipping ahead the weekly sheet
 * is skipped and the month's results show when the month ends; a quarter's
 * results are skipped at a year end that opens the annual report, which covers
 * the same weeks.
 */
function showResults(s: GameState, newYear: boolean): void {
  const freq = s.settings.weeklyResults;
  if (skipping.value) {
    if (freq === 'off') return;
    const monthEnd = periodKey('monthly', s.meta.startDate, s.clock.week) !== skipMonth;
    if (monthEnd) modal.value = { type: 'weekly', week: s.clock.week - 1, period: 'monthly' };
    return;
  }
  const due = resultsDue(freq, s.meta.startDate, s.clock.day);
  if (due === 'quarterly' && newYear && s.settings.annualReport) return;
  if (due === 'weekly') modal.value = { type: 'weekly', week: s.clock.week - 1 };
  else if (due) modal.value = { type: 'weekly', week: s.clock.week - 1, period: due };
}

/**
 * Which results the tick that began `day` should show (SCREENS §21, §26): every
 * week, or the tick that closes the last week of a month or quarter (a week
 * belongs to the period its last day falls in, resultsPeriod.ts), so the
 * report covers the whole period that just ended; else none.
 */
export function resultsDue(
  freq: GameState['settings']['weeklyResults'],
  startDate: string,
  day: number,
): 'weekly' | 'monthly' | 'quarterly' | null {
  if (freq === 'weekly') return 'weekly';
  if (freq !== 'monthly' && freq !== 'quarterly') return null;
  const week = Math.floor(day / DAYS_PER_WEEK);
  if (week < 1) return null;
  const closes = periodKey(freq, startDate, week) !== periodKey(freq, startDate, week + 1);
  return closes ? freq : null;
}

/**
 * SIMULATION §2: at each quarter start, with an Executive floor and no meeting
 * held yet, the HUD shows a Board chip for the quarter and a notice says so.
 */
function promptBoard(s: GameState, quarterStart: boolean): void {
  if (!quarterStart) return;
  const label = quarterLabel(s);
  if (boardChipQuarter.value === label || !boardDue(s)) return;
  boardChipQuarter.value = label;
  notice(`The board is ready to meet for ${label}. Tap Board when you want to hold it.`);
}

/** A year end filed a new annual report (SCREENS §21b): open it, after the results. */
function promptAnnual(s: GameState): void {
  const n = s.history.yearly.length;
  if (n <= shownYears) return;
  shownYears = n;
  if (!s.settings.annualReport) return;
  if (modal.value) annualWaiting = true;
  else modal.value = { type: 'annual' };
}

/** SIMULATION §2 auto-pause: new open cases open the incident modal (after any other modal). */
function promptIncidents(s: GameState): void {
  // Notices with nothing to decide close themselves and show as a message.
  for (const i of [...s.incidents.active]) {
    const spec = INCIDENT_SPECS[i.type];
    if (!spec?.info || promptedCases.has(i.id)) continue;
    const text = String(i.data.text ?? '');
    if (resolveIncident(s, i.id, i.options[0]?.id ?? 'ok').ok)
      notice(`${spec.title}: ${text}`, 'info', 7000);
  }
  const fresh = s.incidents.active.filter((i) => !promptedCases.has(i.id));
  for (const i of fresh) promptedCases.add(i.id);
  if (fresh.length === 0 || !s.settings.autoPauseIncidents) return;
  if (modal.value) casesWaiting = true;
  else modal.value = { type: 'incident' };
}

/** New RFPs the next weekly tick will expire (it drops those with dueWeek ≤ week). */
function expiringRfps(s: GameState): number {
  return Object.values(s.dealDesk.rfps).filter(
    (r) => r.kind === 'new' && r.dueWeek <= s.clock.week + 1,
  ).length;
}

const EVENT_TEXT: Record<string, (p: Record<string, unknown>) => string> = {
  ...MNA_EVENT_TEXT,
  ...VENTURE_EVENT_TEXT,
  ...AUCTION_EVENT_TEXT,
  BRANCH_OPENED: (p) => `${String(p.name)} is open for business.`,
  DATA_CENTER_OPENED: (p) =>
    `${String(p.name)} is ${p.refit ? 'back online' : 'online'} with ${Number(p.gpus).toLocaleString('en-US')} GPUs running.`,
  NEW_BRANCH: (p) =>
    p.by === 'coo'
      ? `Your COO leased ${String(p.address)} in ${CITIES[String(p.city)]?.name ?? String(p.city)}. The sales office opens after fit-out.`
      : '',
  CB_DECISION: (p) => {
    const change = Number(p.change);
    const verb = change > 0 ? 'raised' : change < 0 ? 'cut' : 'held';
    return `${String(p.cb)} ${verb} its policy rate${change ? ' to' : ' at'} ${(Number(p.rate) * 100).toFixed(2)}%.`;
  },
  POLICY_PASSED: (p) =>
    p.policyId === CAPITAL_BUFFER_POLICY
      ? `Lawmakers passed an AI safety buffer: every safety tier line rises by ${Math.round(CAPITAL_BUFFER_PP * SAFETY.bufferPerPp * 100)} points for a year.`
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
  BANK_RUN: () => 'Outage rumours are spreading: customers are cancelling.',
  BANK_RUN_ENDED: () => 'The outage rumour has died down.',
  COMPUTE_BURST: () => 'Spot ran out, so we bought emergency burst GPUs at a premium.',
  COMPUTE_CRUNCH: () => 'Capacity crunch: new customers are on a waitlist until we add GPUs.',
  COMPUTE_CRUNCH_ENDED: () => 'The waitlist has cleared.',
  COMPUTE_OUTAGE: () => 'Outage: too little compute for too long. Customers are leaving.',
  PROJECT_DONE: (p) => `${String(p.name)} is finished.`,
  PROJECT_OVERRUN: (p) => `${String(p.name)} is running late: ${Number(p.weeks)} more weeks.`,
  PROJECT_STALLED: (p) => `${String(p.name)} has stalled: not enough cash for this week's payment.`,
  REGIONS_OPENED: (p) => `New regions are open: ${String(p.names)}. Fly there from any airport.`,
  TENDER_OPENED: (p) =>
    `${String(p.name)} is asking for bids. Seal one on the Deal Desk within ${Number(p.weeks)} weeks.`,
  TENDER_WON: (p) => `${String(p.name)} picked us: a ${Number(p.years)}-year public contract.`,
  TENDER_LOST: (p) =>
    p.reason === 'tier'
      ? `${String(p.name)} set our bid aside: our safety rating is below Adequate.`
      : `${String(p.name)} awarded its tender to ${p.rival ? String(p.rival) : 'another lab'}.`,
  TENDER_CANCELLED: (p) =>
    p.reason === 'tier'
      ? `${String(p.name)} cancelled our contract: the regulator has restricted us.`
      : `${String(p.name)} ended our contract when the sales office closed.`,
  SPECIAL_DIVIDEND: () => 'The special dividend has been paid. Your share is in personal cash.',
};

/** Events about a country toast only when it is your home country (nine central banks meet). */
const HOME_ONLY = new Set(['CB_DECISION', 'POLICY_PASSED']);
const BAD_EVENTS = new Set([
  'MANAGER_POACHED',
  'BANK_RUN',
  'COMPUTE_BURST',
  'COMPUTE_CRUNCH',
  'COMPUTE_OUTAGE',
  'PROJECT_OVERRUN',
  'PROJECT_STALLED',
  'TENDER_LOST',
  'TENDER_CANCELLED',
  ...MNA_BAD_EVENTS,
  ...VENTURE_BAD_EVENTS,
  ...AUCTION_BAD_EVENTS,
]);

/** Toasts the week's new events; returns true when any of them was bad news. */
function announceEvents(s: GameState): boolean {
  let bad = false;
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
    if (!text) continue;
    const isBad = BAD_EVENTS.has(e.type);
    bad ||= isBad;
    notice(text, isBad ? 'bad' : 'info');
  }
  lastSeen = log.at(-1) ?? lastSeen;
  return bad;
}
