// Toasts for auctions (SIMULATION §22): your wins and losses at a sale (saying
// so when personal cash couldn't cover a winning bid), consignment proceeds and
// appraisal verdicts. Spread into loop.ts EVENT_TEXT; '' means no toast.
import { peekGame } from '../store';
import { money } from '../format/format';

const item = (p: Record<string, unknown>) => String(p.item ?? 'The lot');
const cash = (x: unknown) => money(Number(x) || 0, peekGame()?.settings.currency ?? '$');

export const AUCTION_EVENT_TEXT: Record<string, (p: Record<string, unknown>) => string> = {
  AUCTION_WON: (p) => `You won ${item(p)} for ${cash(p.price)}, premium included.`,
  AUCTION_LOST: (p) =>
    p.reason === 'cash'
      ? `${item(p)} fell to you at ${cash(p.price)}, but personal cash couldn't cover it. It went to the underbidder.`
      : `${item(p)} sold for ${cash(p.price)}, above your max bid.`,
  AUCTION_SOLD: (p) =>
    `${item(p)} sold for ${cash(p.price)}. You receive ${cash(p.proceeds)} after fees.`,
  APPRAISAL_DONE: (p) =>
    p.genuine === true
      ? `Appraisal: ${item(p)} is genuine.`
      : `Appraisal: ${item(p)} is a counterfeit. It's worth nothing.`,
};

/** Events that read as bad news. */
export const AUCTION_BAD_EVENTS = ['AUCTION_LOST'];
