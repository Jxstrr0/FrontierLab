// The Weekly Ledger's Stage 9 stories (SIMULATION §24): your club's season
// finish (CONTENT §23 SPORTS), buying or selling a club, putting your bank on
// the shirt, and a signing. Only your clubs make the paper here; the national
// leagues have their own sports desk (newsSports.ts).
import { NEWS_PRIORITY as P } from '../config/balance';
import { CITIES } from '../data/cities';
import { FRANCHISES } from '../data/franchises';
import type { CountryId } from '../data/types';
import { newsMoney, ordinal } from './newsFormat';
import { num, str, theCountryName, type NewsContext, type Story } from './newsStory';
import type { GameEvent } from './state';

/** Your club news ranks above other sports, below the bank's own headlines. */
const CLUB_BOOST = { season: 30, signing: 20, kit: 25 };
const MOOD_WORDS: [number, string][] = [
  [3, 'delighted'],
  [7, 'satisfied'],
  [10, 'unhappy'],
];

export function franchiseStories(ctx: NewsContext): Story[] {
  const out: Story[] = [];
  for (const e of ctx.events) {
    const s = fromEvent(ctx, e);
    if (s) out.push(s);
  }
  return out;
}

function ownerText(ctx: NewsContext, owner: unknown): string {
  return owner === 'company' ? ctx.bank : ctx.state.meta.founderName;
}

function fromEvent(ctx: NewsContext, e: GameEvent): Story | undefined {
  const p = e.payload;
  const clubId = str(p.clubId);
  const club = clubOf(ctx, clubId);
  const spec = FRANCHISES[clubId];
  const base = { club: str(p.club, spec?.name ?? 'the club'), league: spec?.league ?? '' };
  switch (e.type) {
    case 'CLUB_SEASON': {
      const pos = num(p.pos);
      return {
        key: 'CLUB_SEASON',
        subject: clubId,
        tab: 'sports',
        icon: 'trophy',
        priority: P.sports + CLUB_BOOST.season,
        tokens: {
          ...base,
          pos: ordinal(pos),
          record: str(p.record),
          owner: ownerText(ctx, club?.owner),
          mood: MOOD_WORDS.find(([max]) => pos <= max)?.[1] ?? 'furious',
        },
      };
    }
    case 'CLUB_BOUGHT':
    case 'CLUB_SOLD':
      return {
        key: e.type,
        subject: clubId,
        tab: 'business',
        icon: 'handshake',
        priority: P.company,
        tokens: {
          ...base,
          owner: ownerText(ctx, p.owner),
          price: newsMoney(num(p.price), ctx.sym),
        },
      };
    case 'NAMING_RIGHTS':
      return {
        key: 'NAMING_RIGHTS',
        subject: clubId,
        tab: 'sports',
        icon: 'trophy',
        priority: P.sports + CLUB_BOOST.kit,
        tokens: { ...base, bank: ctx.bank, stadium: spec?.stadium ?? 'the stadium' },
      };
    case 'KIT_SPONSOR': {
      if (p.on !== true) return undefined;
      const country = CITIES[spec?.cityId ?? '']?.country;
      return {
        key: 'KIT_SPONSOR',
        subject: clubId,
        tab: 'sports',
        icon: 'spark',
        priority: P.sports + CLUB_BOOST.kit,
        tokens: {
          ...base,
          bank: ctx.bank,
          theCountry: country ? theCountryName(country as CountryId) : 'the country',
        },
      };
    }
    case 'CLUB_SIGNED':
      return {
        key: 'CLUB_SIGNED',
        subject: `${clubId}:${str(p.player)}`,
        tab: 'sports',
        icon: 'person',
        priority: P.sports + CLUB_BOOST.signing,
        tokens: {
          ...base,
          player: str(p.player),
          position: str(p.position, 'player').toLowerCase(),
          fee: newsMoney(num(p.fee), ctx.sym),
        },
      };
    default:
      return undefined;
  }
}

const clubOf = (ctx: NewsContext, clubId: string) => ctx.state.clubs?.[clubId];
