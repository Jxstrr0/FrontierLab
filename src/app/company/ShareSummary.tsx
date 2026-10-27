// Company summary share section (SCREENS §24): share price (or private
// valuation) with its 52-week range, market cap, your stake, the top
// shareholders, and your personal line: cash plus your holdings, totalling
// netWorth() like the Personal Wealth screen.
import { PRIVATE_VALUATION } from '../../config/balance';
import { topHolders } from '../../sim/marketHolders';
import { netWorth } from '../../sim/netWorth';
import { holdingsValue } from '../../sim/securities';
import { founderStake, sharesHeld, FOUNDER_ID } from '../../sim/shares';
import type { GameState } from '../../sim/state';
import { revenueMultiple } from '../../sim/valuation';
import { Card, Row, SectionTitle } from '../components';
import { money, pct } from '../format/format';
import { sharePrice } from '../investmentBank/marketView';

export function ShareSummary(p: { s: GameState }) {
  const { s } = p;
  const sym = s.settings.currency;
  const st = s.stock;
  const listed = st.status === 'public';
  const ownShares = sharesHeld(s, FOUNDER_ID) * st.price;
  const stocks = holdingsValue(s, 'personal');
  return (
    <div>
      <SectionTitle>{listed ? 'Shares' : 'Valuation'}</SectionTitle>
      <Card>
        <Row
          label={listed ? `Share price · ${st.ticker ?? ''}` : 'Private valuation per share'}
          value={sharePrice(st.price, sym)}
          strong
        />
        <Row
          label="52-week range"
          value={`${sharePrice(st.low52, sym)} – ${sharePrice(st.high52, sym)}`}
          tone="dim"
        />
        <Row
          label={listed ? 'Market cap' : 'Valuation'}
          value={money(st.price * s.company.sharesOutstanding, sym)}
        />
        <Row label="Your stake" value={pct(founderStake(s), 1)} />
        {st.ipo && <Row label="IPO" value="Lists at quarter-end" tone="dim" />}
        <div class="co-holders">
          <div class="muted small">Top shareholders</div>
          {topHolders(s, 'self', 4).map((h) => (
            <Row label={h.name} value={pct(h.pct, 1)} tone={h.you ? undefined : 'dim'} />
          ))}
        </div>
        {!listed && (
          <p class="muted small cap-note">
            Investors value a private lab at {revenueMultiple(s).toFixed(1)}× its ARR (faster
            revenue growth and a model ahead of the market raise the multiple), less a{' '}
            {pct(1 - PRIVATE_VALUATION.discount, 0)} private discount, and never below book value.
          </p>
        )}
      </Card>
      <Card>
        <Row label="Personal cash" value={money(s.personal.cash, sym)} />
        <Row label="Stocks you hold" value={money(stocks, sym)} />
        <Row label="Your shares in the lab" value={money(ownShares, sym)} />
        <Row
          label="Homes, property and other assets"
          value={money(netWorth(s).total - s.personal.cash - stocks - ownShares, sym)}
        />
        <Row label="Personal total" value={money(netWorth(s).total, sym)} strong />
      </Card>
    </div>
  );
}
