// Where startups come from (SIMULATION §20.1): the CONTENT §18 seed list at a
// new game and generated startups later (name pools, sector blurbs, post-money
// ranges by stage). Each gets a share count and last price from its post-money,
// a founder and one or two funds on the cap table, a CEO with a portrait, a
// short revenue history from post-money ÷ the sector P/S multiple, cash for a
// few quarters of burn and a funding history.
import { DAYS_PER_WEEK, QUARTERS_PER_YEAR, VENTURE_GEN } from '../config/balance';
import { FUND_NAMES } from '../data/names';
import {
  GENERATED_POST_MONEY,
  ROUND_NAMES,
  SEED_ROUND_NAME,
  SEED_STARTUPS,
  STAGE_ORDER,
  STARTUP_NAME_PREFIXES,
  STARTUP_NAME_SUFFIXES,
  STARTUP_SECTORS,
  type SeedStartup,
  type StartupStageId,
} from '../data/startups';
import type { Pentagon } from '../data/types';
import { dateOf } from './calendar';
import { dpow } from './detmath';
import { newId } from './ids';
import { personName, randomAvatar } from './people';
import { stream, type Rng } from './rng';
import type { GameState, Startup, StartupHolder } from './state';
import { PENTAGON, sectorOf, targetMargin } from './ventureModel';

const MS_PER_WEEK = DAYS_PER_WEEK * 86_400_000;

export const FOUNDER_HOLDER = 'founder';
export const fundHolderId = (name: string) => `fund:${name}`;

/** Current calendar year of the game. */
export const gameYear = (state: GameState) =>
  dateOf(state.meta.startDate, state.clock.day).getUTCFullYear();

/** Game week (may be negative) of 1 January of a year. */
function weekOfJan1(state: GameState, year: number): number {
  const start = Date.parse(`${state.meta.startDate}T00:00:00Z`);
  return Math.floor((Date.UTC(year, 0, 1) - start) / MS_PER_WEEK);
}

/** The rounds a startup has raised to reach its stage: Seed, Series A, … */
export function roundsTo(stage: StartupStageId): string[] {
  const idx = STAGE_ORDER.indexOf(stage);
  const names = [SEED_ROUND_NAME];
  for (let k = 1; k <= idx; k++) names.push(ROUND_NAMES[STAGE_ORDER[k - 1]!]);
  return names;
}

/** Founder plus one or two funds splitting the rest (shares sum exactly). */
function capTable(rng: Rng, ceo: string, stage: StartupStageId, shares: number): StartupHolder[] {
  const founder = Math.round(shares * VENTURE_GEN.founderShare[stage]);
  const holders: StartupHolder[] = [
    { id: FOUNDER_HOLDER, name: ceo, kind: 'founder', shares: founder },
  ];
  const pool = [...FUND_NAMES];
  const n = rng.int(VENTURE_GEN.fundHolders[0], VENTURE_GEN.fundHolders[1]);
  const weights = Array.from({ length: n }, () => rng.range(1, 2));
  const totalW = weights.reduce((a, b) => a + b, 0);
  let left = shares - founder;
  weights.forEach((w, i) => {
    const name = pool.splice(rng.int(0, pool.length - 1), 1)[0]!;
    const take = i === n - 1 ? left : Math.round(((shares - founder) * w) / totalW);
    left -= take;
    holders.push({ id: fundHolderId(name), name, kind: 'fund', shares: take });
  });
  return holders;
}

/** Builds a startup from its profile; history and cash follow from post-money and the sector. */
export function buildStartup(
  state: GameState,
  rng: Rng,
  spec: SeedStartup,
  id: string,
  seenAt: Startup['seenAt'],
): Startup {
  const sector = sectorOf(spec.sector);
  const [plo, phi] = VENTURE_GEN.sharePrice[spec.stage];
  const shares = Math.max(1, Math.round(spec.postMoney / rng.range(plo, phi)));
  const ceo = { name: personName(rng), portrait: randomAvatar(rng) };

  // Revenue history: annual = post-money ÷ P/S, growing at μ into the latest quarter.
  const quarterNow = spec.postMoney / sector.psMultiple / QUARTERS_PER_YEAR;
  const margin = targetMargin(sector.margin, spec.pentagon[PENTAGON.maturity]);
  const quarters: Startup['quarters'] = [];
  for (let k = VENTURE_GEN.historyQuarters - 1; k >= 0; k--) {
    const revenue = quarterNow / dpow(1 + sector.mu, k);
    quarters.push({ revenue, netIncome: revenue * margin });
  }
  const burn = margin < 0 ? -quarterNow * margin : 0;
  const cash =
    burn > 0
      ? burn * rng.range(VENTURE_GEN.startRunway[0], VENTURE_GEN.startRunway[1])
      : spec.postMoney * VENTURE_GEN.profitableCash;

  // Funding history spread evenly from founding to now.
  const rounds = roundsTo(spec.stage);
  const from = weekOfJan1(state, spec.founded);
  const to = state.clock.week;
  const history = rounds.map((round, k) => ({
    round,
    amount:
      spec.postMoney *
      VENTURE_GEN.historyRoundShare *
      dpow(VENTURE_GEN.historyStepDown, rounds.length - 1 - k),
    week: Math.round(from + ((to - from) * (k + 1)) / (rounds.length + 1)),
  }));

  return {
    id,
    name: spec.name,
    sector: sector.id,
    description: spec.description,
    founded: spec.founded,
    ceo,
    pentagon: [...spec.pentagon] as Pentagon,
    stage: spec.stage,
    shares,
    postMoney: spec.postMoney,
    lastPrice: spec.postMoney / shares,
    cash,
    quarters,
    history,
    holders: capTable(rng, ceo.name, spec.stage, shares),
    seenAt,
  };
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** The CONTENT §18 seed list, at a new game (and the 7 → 8 migration). */
export function seedStartups(state: GameState): void {
  const rng = stream(state, 'ventureGen');
  for (const spec of SEED_STARTUPS) {
    const id = `st_${slug(spec.name)}`;
    state.ventures.startups[id] = buildStartup(state, rng, spec, id, 'pipeline');
  }
}

function nameTaken(state: GameState, name: string): boolean {
  if (Object.values(state.ventures.startups).some((s) => s.name === name)) return true;
  return Object.values(state.market.companies).some((c) => c.name === name);
}

/** A fresh prefix + suffix name ("Cobalt Labs") not used by any startup or listed company. */
export function uniqueStartupName(state: GameState, rng: Rng): string {
  let name = '';
  for (let i = 0; i < VENTURE_GEN.nameTries; i++) {
    name = `${rng.pick(STARTUP_NAME_PREFIXES)} ${rng.pick(STARTUP_NAME_SUFFIXES)}`;
    if (!nameTaken(state, name)) return name;
  }
  let n = 2;
  while (nameTaken(state, `${name} ${n}`)) n++;
  return `${name} ${n}`;
}

/** A generated startup profile: weighted stage, random sector, post-money in the stage's range. */
export function generateProfile(state: GameState, rng: Rng): SeedStartup {
  const stage = rng.pickWeighted(
    STAGE_ORDER.map((s) => ({ item: s, weight: VENTURE_GEN.stageWeights[s] })),
  );
  const sector = sectorOf(rng.pick(Object.keys(STARTUP_SECTORS)));
  const [lo, hi] = GENERATED_POST_MONEY[stage];
  const [plo, phi] = VENTURE_GEN.pentagonRange;
  const pentagon = Array.from({ length: 5 }, () => rng.int(plo, phi)) as Pentagon;
  const [alo, ahi] = VENTURE_GEN.ageYears[stage];
  return {
    name: uniqueStartupName(state, rng),
    sector: sector.id,
    founded: gameYear(state) - rng.int(alo, ahi),
    stage,
    pentagon,
    postMoney: rng.range(lo, hi),
    description: rng.pick(sector.blurbs),
  };
}

/** Creates, stores and returns a generated startup. */
export function generateStartup(
  state: GameState,
  rng: Rng,
  seenAt: Startup['seenAt'],
  conventionId?: string,
): Startup {
  const profile = generateProfile(state, rng);
  const s = buildStartup(state, rng, profile, newId(state, 'st'), seenAt);
  if (conventionId) s.conventionId = conventionId;
  state.ventures.startups[s.id] = s;
  return s;
}

/** Startups still private and trading (not public, acquired or failed). */
export const isPrivate = (s: Startup) =>
  s.stage !== 'public' && s.stage !== 'acquired' && s.stage !== 'failed';
