// A small sheet about a rival's branch: who they are, how their branch is rated
// and their rate sheet next to ours (SCREENS §2, CONTENT §25 "Rival branch").
import { CITIES } from '../../data/cities';
import { PRODUCTS } from '../../data/products';
import { branchPrice } from '../../sim/branch/pricing';
import { DAYS_PER_WEEK, RIVAL_MARKETING } from '../../config/balance';
import { dateOf } from '../../sim/calendar';
import { campaignWeeksLeft, rivalOverall } from '../../sim/rivalMarketing';
import { rivalPriceInCity } from '../../sim/rivalPrices';
import type { GameState, RivalBank } from '../../sim/state';
import { AdvisorBar, Badge, CoinRating, Medallion, Sheet } from '../components';
import { count, pct } from '../format/format';
import { sizeName } from '../../sim/branch/officeSize';

const STRATEGY_LABEL: Record<RivalBank['strategy'], string> = {
  incumbent: 'Incumbent bank',
  disruptor: 'Disruptor',
  premium: 'Premium bank',
  community: 'Community bank',
};

/** Products shown on the rate sheet, in order. */
const RATE_PRODUCTS = ['savings', 'gic1y', 'personal_loan', 'mortgage'] as const;

/** Our price for a product: our first branch in the city that offers it, else one in its country. */
function ourPrice(s: GameState, cityId: string, productId: string): number | undefined {
  const country = CITIES[cityId]?.country;
  const open = Object.values(s.branches).filter(
    (b) => b.status !== 'closed' && b.offered[productId]?.on,
  );
  const b =
    open.find((x) => x.cityId === cityId) ??
    open.find((x) => CITIES[x.cityId]?.country === country);
  return b ? branchPrice(s, b, productId) : undefined;
}

/** The calendar year of a game week. */
const yearOf = (s: GameState, week: number) =>
  dateOf(s.meta.startDate, week * DAYS_PER_WEEK).getUTCFullYear();

export function RivalSheet(p: { s: GameState; lotId: string; onClose: () => void }) {
  const lot = p.s.world.lots[p.lotId];
  const bank = lot?.occupant ? p.s.rivals[lot.occupant.id] : undefined;
  const branch = bank?.branches.find((b) => b.lotId === p.lotId);
  if (!lot || !bank) {
    return (
      <Sheet title="Rival sales office" onClose={p.onClose}>
        <p class="muted">This office is no longer here.</p>
      </Sheet>
    );
  }
  const adWeeks = campaignWeeksLeft(bank, lot.cityId);
  // C2b: one office per lab per city, sized like yours.
  const office = branch ? `${sizeName(branch.size).toLowerCase()} sales office` : 'sales office';
  const ours = ourPrice(p.s, lot.cityId, 'savings');
  const theirs = rivalPriceInCity(p.s, bank, 'savings', lot.cityId);
  const advice =
    theirs !== undefined && ours !== undefined
      ? `This is ${bank.name}'s ${office}. Their savings rate is ${pct(theirs)}; ours is ${pct(ours)}.`
      : theirs !== undefined
        ? `This is ${bank.name}'s ${office}. Their savings rate is ${pct(theirs)}.`
        : `This is ${bank.name}'s ${office}.`;
  return (
    <Sheet title={bank.name} onClose={p.onClose}>
      <div class="stack">
        <div class="rival-head">
          <Medallion ink={bank.ink} monogram={bank.monogram} size={44} ring />
          <div>
            <div>{STRATEGY_LABEL[bank.strategy]}</div>
            <div class="muted small">{lot.address}</div>
          </div>
          {bank.status !== 'active' && <Badge tone="warn">{bank.status}</Badge>}
        </div>
        <AdvisorBar text={advice} />
        {branch && (
          <div>
            <CoinRating value={rivalOverall(bank, branch)} />
            <div class="muted small">{count(branch.reviewCount)} reviews at this office</div>
            {adWeeks > 0 && (
              <div class="small tone-bad">
                Advertising in this city: +{RIVAL_MARKETING.boost.toFixed(2)} for {adWeeks} more
                week{adWeeks === 1 ? '' : 's'}
              </div>
            )}
            {bank.charteredWeek !== undefined && (
              <div class="muted small">
                A new lab, chartered in {yearOf(p.s, bank.charteredWeek)}
              </div>
            )}
          </div>
        )}
        <div>
          <div class="rate-head">
            <span>Rate sheet</span>
            <span>Theirs</span>
            <span>Ours</span>
          </div>
          {RATE_PRODUCTS.map((id) => {
            const theirRate = rivalPriceInCity(p.s, bank, id, lot.cityId);
            const ourRate = ourPrice(p.s, lot.cityId, id);
            return (
              <div class="rate-row">
                <span class="muted">{PRODUCTS[id]?.name ?? id}</span>
                <span>{theirRate !== undefined ? pct(theirRate) : '—'}</span>
                <span class="muted">{ourRate !== undefined ? pct(ourRate) : '—'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
