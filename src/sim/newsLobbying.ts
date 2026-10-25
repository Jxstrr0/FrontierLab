// Lobbying stories in The Weekly Ledger (Stage 7, SIMULATION §24): an exposé
// when the paper uncovers one of your campaigns (front page), and a brief when
// a campaign quietly wins or loses.
import { NEWS_PRIORITY as P } from '../config/balance';
import type { CountryId } from '../data/types';
import { newsMoney } from './newsFormat';
import { num, str, theCountryName, type NewsContext, type Story } from './newsStory';
import type { GameEvent } from './state';

/** Lower-case first letter, for a campaign title mid-sentence. */
const midSentence = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export function lobbyingStories(ctx: NewsContext): Story[] {
  const out: Story[] = [];
  for (const e of ctx.events) {
    const s = fromEvent(ctx, e);
    if (s) out.push(s);
  }
  return out;
}

function fromEvent(ctx: NewsContext, e: GameEvent): Story | undefined {
  const p = e.payload;
  const tokens = {
    bank: ctx.bank,
    firm: str(p.firm, 'a lobbying firm'),
    campaign: midSentence(str(p.title, 'a change in the rules')),
    theCountry: theCountryName(str(p.country) as CountryId),
  };
  const subject = str(p.campaignId);
  switch (e.type) {
    case 'LOBBY_EXPOSED':
      return {
        key: 'LOBBY_EXPOSED',
        subject,
        tab: 'politics',
        icon: 'gavel',
        priority: P.companyAlarm,
        tokens: { ...tokens, fine: newsMoney(num(p.fine), ctx.sym) },
      };
    case 'LOBBY_WON':
    case 'LOBBY_LOST':
      return {
        key: e.type,
        subject,
        tab: 'politics',
        icon: 'ballot',
        priority: P.companyWeek,
        tokens,
      };
    default:
      return undefined;
  }
}
