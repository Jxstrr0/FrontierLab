// Turns a week's event log and the macro numbers into The Daily Ledger's
// articles (SCREENS §21, ART_DIRECTION §6). Read-only over GameState and
// deterministic: wording variants are chosen from the week number, never at random.
import { COUNTRIES } from '../../data/countries';
import { CITIES } from '../../data/cities';
import { DISTRICT_SPECS } from '../../data/districts';
import { LOAN_SECTORS } from '../../data/loanSectors';
import type { CountryId, DistrictId, Phase } from '../../data/types';
import type { GameEvent, GameState, WeeklySnapshot } from '../../sim/state';
import { homeCountry } from '../../sim/treasury';
import { money, pct } from '../format/format';

export type LedgerSection = 'banking' | 'business';
export type LedgerIcon = 'facade' | 'dome' | 'chart' | 'coin' | 'alert' | 'shield';

export interface Article {
  id: string;
  section: LedgerSection;
  icon: LedgerIcon;
  headline: string;
  body: string;
  /** Higher stories lead the front page. */
  weight: number;
}

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Picks a wording variant from the week so a given week always reads the same. */
function pick<T>(list: readonly T[], seed: number): T {
  return list[Math.abs(seed) % list.length]!;
}

const percent1 = (x: number) => `${x.toFixed(1)}%`;

export function buildArticles(s: GameState, snap: WeeklySnapshot | undefined): Article[] {
  const week = snap?.week ?? s.clock.week;
  const sym = s.settings.currency;
  const bank = s.meta.bankName;
  const events = s.events.log.filter((e) => e.week === week);
  const out: Article[] = [];

  for (const [i, e] of events.entries()) {
    const a = fromEvent(s, e, week, sym, bank);
    if (a) out.push({ ...a, id: `${e.type}-${i}` });
  }
  out.push(...loanStories(events, sym, bank, week));
  out.push(marketColour(s, week));
  if (snap) out.push(revenueStory(snap, sym, bank, week), capitalStory(snap, bank));
  return out.sort((a, b) => b.weight - a.weight);
}

function fromEvent(
  s: GameState,
  e: GameEvent,
  week: number,
  sym: string,
  bank: string,
): Omit<Article, 'id'> | undefined {
  const p = e.payload;
  switch (e.type) {
    case 'CB_DECISION':
      return centralBank(p, week);
    case 'BRANCH_OPENED': {
      const branch = s.branches[str(p.branchId)];
      const address = branch ? s.world.lots[branch.lotId]?.address : undefined;
      const name = str(p.name, 'a new branch');
      return {
        section: 'banking',
        icon: 'facade',
        weight: 70,
        headline: pick(
          [`${bank} opens ${name}`, `Doors open at ${name}`, `${name} welcomes first customers`],
          week,
        ),
        body: `${address ? `${address} has a new bank on the block. ` : ''}Tellers are at their stations and the savings board is up. The branch takes deposits from day one.`,
      };
    }
    case 'NEW_BRANCH': {
      const city = CITIES[str(p.city)]?.name ?? 'town';
      const district = DISTRICT_SPECS[str(p.district) as DistrictId]?.name ?? 'the district';
      return {
        section: 'banking',
        icon: 'facade',
        weight: 60,
        headline: `${bank} breaks ground in ${city}`,
        body: `Builders are fitting out ${str(p.address, 'a storefront')} in the ${district}. Opening day is about a week away.`,
      };
    }
    case 'WINDOW_USE':
      return {
        section: 'banking',
        icon: 'alert',
        weight: 90,
        headline: pick(
          [`${bank} borrows from the central bank window`, `${bank} taps emergency funding`],
          week,
        ),
        body: `Treasury drew ${money(num(p.amount), sym)} from the discount window to cover a shortfall. Use of the window is noticed, and rivals will not forget it soon.`,
      };
    case 'BIG_DEFAULT': {
      const sector = LOAN_SECTORS.find((x) => x.id === str(p.sector))?.name.toLowerCase();
      return {
        section: 'business',
        icon: 'alert',
        weight: 85,
        headline: `${str(p.business, 'A borrower')} defaults on ${money(num(p.amount), sym)}`,
        body: `The${sector ? ` ${sector}` : ''} borrower missed its payments and ${bank} expects to recover only part of the balance. Analysts call it a reminder to read the small print on collateral.`,
      };
    }
    default:
      return undefined;
  }
}

function centralBank(p: Record<string, unknown>, week: number): Omit<Article, 'id'> {
  const country = COUNTRIES[str(p.country) as CountryId]?.name ?? 'The economy';
  const cb = str(p.cb, 'The central bank');
  const rate = num(p.rate);
  const change = num(p.change);
  const infl = percent1(num(p.inflation));
  const steps = `${Math.abs(change * 100).toFixed(2)} points`;
  if (change > 0) {
    return {
      section: 'banking',
      icon: 'dome',
      weight: 80,
      headline: pick([`${cb} raises rate to ${pct(rate)}`, `${cb} lifts borrowing costs`], week),
      body: `Policymakers raised the policy rate by ${steps} to ${pct(rate)}, pointing to inflation of ${infl} in ${country}. Loans get dearer; savers should see better rates.`,
    };
  }
  if (change < 0) {
    return {
      section: 'banking',
      icon: 'dome',
      weight: 80,
      headline: pick([`${cb} cuts rate to ${pct(rate)}`, `${cb} eases policy`], week),
      body: `The policy rate fell by ${steps} to ${pct(rate)} as growth cooled in ${country}. Cheaper credit helps borrowers; deposit margins get thinner.`,
    };
  }
  return {
    section: 'banking',
    icon: 'dome',
    weight: 75,
    headline: pick([`${cb} holds at ${pct(rate)}`, `${cb} keeps rates unchanged`], week),
    body: `Policymakers left the rate at ${pct(rate)}, with inflation at ${infl} in ${country}. Markets expect the next decision in about six weeks.`,
  };
}

/** One story for the week's booked loans, however many there were. */
function loanStories(events: GameEvent[], sym: string, bank: string, week: number): Article[] {
  const loans = events.filter((e) => e.type === 'LOAN_BOOKED');
  if (loans.length === 0) return [];
  const total = loans.reduce((sum, e) => sum + num(e.payload.amount), 0);
  const largest = loans.reduce((a, b) => (num(b.payload.amount) > num(a.payload.amount) ? b : a));
  const lead = str(largest.payload.business, 'a local firm');
  if (loans.length === 1) {
    return [
      {
        id: 'loan-one',
        section: 'business',
        icon: 'coin',
        weight: 50,
        headline: `${lead} secures ${money(num(largest.payload.amount), sym)} loan`,
        body: `${bank} priced the facility at ${pct(num(largest.payload.rate))}. The owners plan to put the money to work straight away.`,
      },
    ];
  }
  return [
    {
      id: 'loan-many',
      section: 'business',
      icon: 'coin',
      weight: 52,
      headline: pick(
        [`${bank} writes ${loans.length} business loans`, `Local firms line up for ${bank} credit`],
        week,
      ),
      body: `${money(total, sym)} went out the door this week, the largest to ${lead} at ${pct(num(largest.payload.rate))}. Main Street is borrowing.`,
    },
  ];
}

const PHASE_COPY: Record<
  Phase,
  { headlines: string[]; body: (c: string, g: string, i: string, u: string) => string }
> = {
  expansion: {
    headlines: ['Growth holds firm', 'Economy keeps its stride', 'Order books stay full'],
    body: (c, g, i, u) =>
      `Output in ${c} is growing at ${g} a year, with inflation at ${i} and unemployment at ${u}. Lenders report steady appetite for credit.`,
  },
  slowdown: {
    headlines: ['Growth cools', 'Economy loses momentum', 'Caution creeps into the market'],
    body: (c, g, i, u) =>
      `Growth in ${c} has slowed to ${g}, inflation sits at ${i} and unemployment at ${u}. Banks are watching credit quality closely.`,
  },
  recession: {
    headlines: ['Recession tightens its grip', 'Downturn bites', 'Output falls as firms cut back'],
    body: (c, g, i, u) =>
      `${c} is contracting at ${g}, with unemployment at ${u} and inflation at ${i}. Expect more missed payments and cautious borrowers.`,
  },
  recovery: {
    headlines: ['Recovery takes root', 'Green shoots turn to leaves', 'Confidence returns'],
    body: (c, g, i, u) =>
      `${c} is climbing out of the slump at ${g} a year, with inflation at ${i} and unemployment still ${u}. Credit is easing back open.`,
  },
};

/** The market-colour filler line, built from the home country's macro numbers. */
function marketColour(s: GameState, week: number): Article {
  const c = homeCountry(s);
  const copy = PHASE_COPY[c.phase];
  return {
    id: 'market',
    section: 'business',
    icon: 'chart',
    weight: 40,
    headline: pick(copy.headlines, week),
    body: copy.body(
      COUNTRIES[c.id].name,
      percent1(c.gdp),
      percent1(c.inflation),
      percent1(c.unemployment),
    ),
  };
}

function revenueStory(snap: WeeklySnapshot, sym: string, bank: string, week: number): Article {
  const profit = snap.netIncome >= 0;
  return {
    id: 'revenue',
    section: 'business',
    icon: 'chart',
    weight: 35,
    headline: profit
      ? pick([`${bank} turns a profit`, `${bank} in the black`], week)
      : pick([`${bank} slips into the red`, `${bank} posts a weekly loss`], week),
    body: profit
      ? `Revenue of ${money(snap.revenue, sym)} left ${money(snap.netIncome, sym)} after costs and tax this week.`
      : `Revenue of ${money(snap.revenue, sym)} fell short of costs, leaving a loss of ${money(-snap.netIncome, sym)}. Directors are said to be studying the numbers.`,
  };
}

const TIER_COPY: Record<string, string> = {
  strong: 'a strong cushion that cheapens its funding',
  adequate: 'an adequate cushion',
  watch: 'a thin cushion that the regulator is watching',
  restricted: 'a cushion so thin that growth is restricted',
  critical: 'a critical shortfall that stops all new lending',
};

const TIER_HEADLINE: Record<string, (bank: string) => string> = {
  strong: (b) => `${b} clears the regulator's bar with room to spare`,
  adequate: (b) => `${b} meets the regulator's capital test`,
  watch: (b) => `Regulator puts ${b} on watch`,
  restricted: (b) => `Regulator restricts growth at ${b}`,
  critical: (b) => `Regulator moves against ${b}`,
};

function capitalStory(snap: WeeklySnapshot, bank: string): Article {
  return {
    id: 'capital',
    section: 'banking',
    icon: 'shield',
    weight: snap.tier === 'critical' || snap.tier === 'restricted' ? 88 : 30,
    headline: (TIER_HEADLINE[snap.tier] ?? ((b: string) => `Regulator reviews ${b}`))(bank),
    body: `With a capital ratio of ${pct(snap.capitalRatio, 1)}, ${bank} shows ${TIER_COPY[snap.tier] ?? 'a steady cushion'}. Deposits fund loans; capital limits growth.`,
  };
}
