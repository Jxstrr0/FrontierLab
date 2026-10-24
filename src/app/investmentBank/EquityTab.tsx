// Investment bank Equity tab (SCREENS §12): your shares at a glance, then
// while private the private placement and IPO cards, and once listed the
// secondary offering card.
import { founderStake } from '../../sim/shares';
import { Card, Row } from '../components';
import { money, pct } from '../format/format';
import { useGame } from '../store';
import { IpoCard, PlacementCard, SecondaryCard } from './EquityCards';
import { sharePrice } from './marketView';
import './investmentBank.css';

export function EquityTab(p: { bankId: string }) {
  const s = useGame();
  const sym = s.settings.currency;
  const st = s.stock;
  const listed = st.status === 'public';
  return (
    <>
      <Card>
        <Row
          label={listed ? `Share price · ${st.ticker}` : 'Private valuation per share'}
          value={sharePrice(st.price, sym)}
          strong
        />
        <Row
          label={listed ? 'Market cap' : 'Valuation'}
          value={money(st.price * s.company.sharesOutstanding, sym)}
        />
        <Row label="Your stake" value={pct(founderStake(s), 1)} />
        {listed && st.exchange && <Row label="Exchange" value={st.exchange} tone="dim" />}
      </Card>
      {listed ? (
        <SecondaryCard bankId={p.bankId} />
      ) : (
        <>
          <PlacementCard bankId={p.bankId} />
          <IpoCard bankId={p.bankId} />
        </>
      )}
    </>
  );
}
