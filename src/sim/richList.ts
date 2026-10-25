// The rich list (SIMULATION §22): RICH_LIST.size generated fortunes (names from
// the CONTENT §26 pools, a source of wealth, worth log-uniform in
// RICH_LIST.fortune), each growing by U(RICH_LIST.growth) a year. At each year
// end you are ranked by net worth among them (no rank below the last place)
// and a RICH_LIST event reaches The Weekly Ledger. Stream: `richList`.
import { RICH_LIST } from '../config/balance';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { RICH_SOURCES } from '../data/richList';
import { dexp, dlog } from './detmath';
import { pushEvent } from './events';
import { netWorth } from './netWorth';
import { stream } from './rng';
import type { GameState, RichFortune } from './state';

/** Most draws spent looking for an unused name before accepting a repeat. */
const NAME_TRIES = 20;

const byWorth = (a: RichFortune, b: RichFortune) => b.worth - a.worth || a.id.localeCompare(b.id);
const round = (x: number) => Math.round(x / RICH_LIST.roundTo) * RICH_LIST.roundTo;

/** Generates the fixed fortunes (newGame and migration 9 → 10). */
export function seedRichList(state: GameState): void {
  const rng = stream(state, 'richList');
  const [lo, hi] = RICH_LIST.fortune;
  const used = new Set<string>([state.meta.founderName]);
  const fortunes: RichFortune[] = [];
  for (let i = 0; i < RICH_LIST.size; i++) {
    let name = '';
    for (let t = 0; t < NAME_TRIES && (name === '' || used.has(name)); t++)
      name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    used.add(name);
    // Log-uniform: as many fortunes between $1.5B and $15B as between $12B and $120B.
    const worth = round(dexp(rng.range(dlog(lo), dlog(hi))));
    fortunes.push({ id: `rich_${i + 1}`, name, source: rng.pick(RICH_SOURCES), worth });
  }
  state.personal.empire.richList = { fortunes: fortunes.sort(byWorth) };
}

/** Your rank among the fortunes for a net worth (undefined below the last place). */
export function rankFor(fortunes: RichFortune[], worth: number): number | undefined {
  const rank = 1 + fortunes.filter((f) => f.worth > worth).length;
  return rank <= RICH_LIST.size ? rank : undefined;
}

/** Year end: grow the fortunes and rank you (RICH_LIST event). */
export function richListYear(state: GameState): void {
  const list = state.personal.empire.richList;
  if (list.fortunes.length === 0) return;
  const rng = stream(state, 'richList');
  for (const f of list.fortunes) f.worth = round(f.worth * (1 + rng.range(...RICH_LIST.growth)));
  list.fortunes.sort(byWorth);
  const worth = netWorth(state).total;
  const prev = list.rank;
  const rank = rankFor(list.fortunes, worth);
  list.lastRankWeek = state.clock.week;
  if (rank === undefined) {
    delete list.rank;
    return;
  }
  list.rank = rank;
  pushEvent(
    state,
    'RICH_LIST',
    {
      rank,
      worth,
      entered: prev === undefined,
      ...(prev !== undefined ? { prevRank: prev } : {}),
      name: state.meta.founderName,
      bank: state.meta.bankName,
    },
    3,
  );
}

export interface RichRow {
  rank: number;
  name: string;
  source: string;
  worth: number;
  you: boolean;
}

/** The list as printed: the fortunes with you slotted in at your current worth. */
export function richListRows(state: GameState): RichRow[] {
  const you = netWorth(state).total;
  const rows: RichRow[] = state.personal.empire.richList.fortunes.map((f) => ({
    rank: 0,
    name: f.name,
    source: f.source,
    worth: f.worth,
    you: false,
  }));
  rows.push({
    rank: 0,
    name: state.meta.founderName,
    source: state.meta.bankName,
    worth: you,
    you: true,
  });
  rows.sort((a, b) => b.worth - a.worth || Number(b.you) - Number(a.you));
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows.filter((r) => r.rank <= RICH_LIST.size || r.you);
}
