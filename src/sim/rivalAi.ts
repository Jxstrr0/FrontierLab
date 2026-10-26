// Rival bank AI (SIMULATION §18): branch books, weekly financials, monthly
// expansion, ad campaigns and closures, price wars, quarterly earnings,
// recession failures with distressed sales and rival-to-rival mergers, and
// yearly learning, technology and new charters. The pieces live in
// rivalBooks.ts, rivalExpansion.ts, rivalMarketing.ts, priceWar.ts,
// rivalQuarter.ts, rivalMergers.ts, rivalLearning.ts and rivalCharters.ts;
// this module calls them in order.
import { runPriceWars } from './priceWar';
import { runRivalFinancials } from './rivalBooks';
import { runClosures, runExpansion } from './rivalExpansion';
import { charterRivals } from './rivalCharters';
import { rivalsLearn } from './rivalLearning';
import { launchRivalCampaigns, rivalsTechYear, runRivalCampaigns } from './rivalMarketing';
import { runRivalMergers } from './rivalMergers';
import { runRivalQuarter, splitDistressed } from './rivalQuarter';
import type { GameState } from './state';

/** Tick step 3, after rival prices: books, financials, expansion, closures, price wars. */
export function runRivals(state: GameState): void {
  runRivalFinancials(state);
  runRivalCampaigns(state);
  runClosures(state);
  runExpansion(state);
  launchRivalCampaigns(state);
  runPriceWars(state);
  splitDistressed(state);
}

/** Quarter-end (tick step 13): rival earnings, dividends, the failure check, then mergers (§18.8). */
export function rivalsQuarter(state: GameState): void {
  runRivalQuarter(state);
  runRivalMergers(state);
}

/**
 * Year end (tick step 14): rivals learn from the cities you share (§18.3),
 * invest in technology (§18.9), and cities short of rivals may charter one (§18.7).
 */
export function rivalsYear(state: GameState): void {
  rivalsLearn(state);
  rivalsTechYear(state);
  charterRivals(state);
}
