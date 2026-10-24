// A small sheet about a rival's branch: who they are, how their branch is rated
// and their rate sheet next to ours (SCREENS §2, CONTENT §25 "Rival branch").
import { PRODUCTS } from '../../data/products';
import type { GameState, RivalBank } from '../../sim/state';
import { AdvisorBar, Badge, CoinRating, Medallion, Sheet } from '../components';
import { count, pct } from '../format/format';

const STRATEGY_LABEL: Record<RivalBank['strategy'], string> = {
  incumbent: 'Incumbent bank',
  disruptor: 'Disruptor',
  premium: 'Premium bank',
  community: 'Community bank',
};

/** Products shown on the rate sheet, in order. */
const RATE_PRODUCTS = ['savings', 'gic1y', 'personal_loan', 'mortgage'] as const;

/** Our price for a product: the first branch we run that offers it. */
function ourPrice(s: GameState, productId: string): number | undefined {
  for (const b of Object.values(s.branches)) {
    const o = b.offered[productId];
    if (b.status !== 'closed' && o?.on)
      return s.company.applyRatesToAll ? (s.company.companyPrices[productId] ?? o.price) : o.price;
  }
  return undefined;
}

export function RivalSheet(p: { s: GameState; lotId: string; onClose: () => void }) {
  const lot = p.s.world.lots[p.lotId];
  const bank = lot?.occupant ? p.s.rivals[lot.occupant.id] : undefined;
  const branch = bank?.branches.find((b) => b.lotId === p.lotId);
  if (!lot || !bank) {
    return (
      <Sheet title="Rival branch" onClose={p.onClose}>
        <p class="muted">This branch is no longer here.</p>
      </Sheet>
    );
  }
  const ours = ourPrice(p.s, 'savings');
  const theirs = bank.prices.savings;
  const advice =
    theirs !== undefined && ours !== undefined
      ? `This is ${bank.name}'s branch. Their savings rate is ${pct(theirs)}; ours is ${pct(ours)}.`
      : theirs !== undefined
        ? `This is ${bank.name}'s branch. Their savings rate is ${pct(theirs)}.`
        : `This is ${bank.name}'s branch.`;
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
            <CoinRating value={branch.overall} />
            <div class="muted small">{count(branch.reviewCount)} reviews at this branch</div>
          </div>
        )}
        <div>
          <div class="rate-head">
            <span>Rate sheet</span>
            <span>Theirs</span>
            <span>Ours</span>
          </div>
          {RATE_PRODUCTS.map((id) => {
            const theirRate = bank.prices[id];
            const ourRate = ourPrice(p.s, id);
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
