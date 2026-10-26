// Rivals advertise and invest in technology (SIMULATION §18.9). Monthly, a
// profitable rival may run an ad campaign in a city it shares with you: its
// branches there read a higher overall rating for a few weeks (in your share
// formula and its own deposit target) while it pays for the airtime. Yearly, a
// profitable rival spends a slice of its profit on technology: a better app
// and better products at every branch. A disruptor that grows a big network
// becomes an incumbent. Ads draw from the `rivalAds` stream.
import { RIVAL_EXPANSION, RIVAL_LEARNING, RIVAL_MARKETING, RIVAL_TECH } from '../config/balance';
import { CITIES } from '../data/cities';
import { pushEvent } from './events';
import { clamp } from './math';
import { listLevel } from './nominal';
import { stream } from './rng';
import { trailingProfit } from './rivalExpansion';
import { overallOf } from './rivals';
import type { GameState, RivalBank, RivalBranch } from './state';

/** A rival branch's overall rating with any running campaign in its city (§18.9). */
export function rivalOverall(bank: RivalBank, branch: RivalBranch): number {
  return Math.min(5, branch.overall + (bank.campaigns?.[branch.cityId]?.boost ?? 0));
}

/** Cities where you run an open branch. */
function yourCities(state: GameState): Set<string> {
  const out = new Set<string>();
  for (const b of Object.values(state.branches)) if (b.status === 'open') out.add(b.cityId);
  return out;
}

/** Monthly (with the expansion check): profitable rivals may launch campaigns in your cities. */
export function launchRivalCampaigns(state: GameState): void {
  if (state.clock.week % RIVAL_EXPANSION.everyWeeks !== 0) return;
  const rng = stream(state, 'rivalAds');
  const yours = yourCities(state);
  for (const bank of Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (bank.status !== 'active') continue;
    const eligible = trailingProfit(bank) > 0;
    const chance = RIVAL_MARKETING.chance * RIVAL_MARKETING.weight[bank.strategy];
    for (const cityId of [...bank.cities].sort()) {
      if (!yours.has(cityId)) continue;
      // Draw first so every rival consumes the stream the same way.
      const roll = rng.next();
      if (!eligible || roll >= chance || bank.campaigns?.[cityId]) continue;
      bank.campaigns ??= {};
      bank.campaigns[cityId] = { boost: RIVAL_MARKETING.boost, weeksLeft: RIVAL_MARKETING.weeks };
      const branches = bank.branches.filter((b) => b.cityId === cityId).length;
      pushEvent(
        state,
        'RIVAL_CAMPAIGN',
        { rivalId: bank.id, bank: bank.name, city: cityId, weeks: RIVAL_MARKETING.weeks, branches },
        4,
        cityId,
      );
    }
  }
}

/** Weekly: running campaigns are paid for and count down. */
export function runRivalCampaigns(state: GameState): void {
  for (const bank of Object.values(state.rivals)) {
    if (!bank.campaigns) continue;
    if (bank.status !== 'active') {
      delete bank.campaigns;
      continue;
    }
    for (const [cityId, c] of Object.entries(bank.campaigns)) {
      const branches = bank.branches.filter((b) => b.cityId === cityId).length;
      const cost =
        RIVAL_MARKETING.costPerBranch *
        branches *
        (CITIES[cityId]?.costIndex ?? 1) *
        listLevel(state, cityId);
      bank.equity -= cost;
      bank.qtd.netIncome -= cost;
      c.weeksLeft -= 1;
      if (c.weeksLeft <= 0) delete bank.campaigns[cityId];
    }
    if (Object.keys(bank.campaigns).length === 0) delete bank.campaigns;
  }
}

/** One year's technology spend for a profitable rival; returns whether it spent. */
export function investInTech(state: GameState, bank: RivalBank): boolean {
  const profit = trailingProfit(bank);
  if (profit <= 0) return false;
  const spend = RIVAL_TECH.spendShare * profit;
  bank.equity -= spend;
  const before = bank.appRating;
  const cap = RIVAL_TECH.appCap[bank.strategy];
  if (bank.appRating < cap)
    bank.appRating = Math.min(cap, bank.appRating + RIVAL_TECH.appStep[bank.strategy]);
  for (const branch of bank.branches) {
    const q = [...branch.quality] as typeof branch.quality;
    q[1] = clamp(q[1] + RIVAL_TECH.productStep, 1, Math.max(q[1], RIVAL_LEARNING.maxQuality));
    branch.quality = q;
    branch.overall = overallOf(q);
  }
  // News when the app crosses a half star.
  if (Math.floor(bank.appRating * 2) > Math.floor(before * 2)) {
    pushEvent(
      state,
      'RIVAL_APP_LAUNCH',
      { rivalId: bank.id, bank: bank.name, app: bank.appRating, spend },
      3,
    );
  }
  return true;
}

/** A disruptor with a big network starts behaving like an incumbent (§18.9). */
export function growUp(state: GameState, bank: RivalBank): void {
  if (bank.strategy !== 'disruptor' || bank.branches.length < RIVAL_TECH.growUpBranches) return;
  bank.strategy = 'incumbent';
  pushEvent(
    state,
    'RIVAL_GROWS_UP',
    { rivalId: bank.id, bank: bank.name, branches: bank.branches.length },
    5,
  );
}

/** Year end: every active rival invests and may grow up. */
export function rivalsTechYear(state: GameState): void {
  for (const bank of Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (bank.status !== 'active') continue;
    investInTech(state, bank);
    growUp(state, bank);
  }
}

/** Weeks a campaign has left in a city, for panels (0 when none). */
export function campaignWeeksLeft(bank: RivalBank, cityId: string): number {
  return bank.campaigns?.[cityId]?.weeksLeft ?? 0;
}
