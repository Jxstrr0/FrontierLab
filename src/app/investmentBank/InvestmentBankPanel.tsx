// Investment bank panel (SCREENS §12): tabs Market · Equity · M&A. You deal
// with the bank, you never own it, so its pin is a type medallion. Market
// (MarketTab.tsx) trades listed shares; Equity (EquityTab.tsx) raises capital
// and lists your bank; M&A (MnaTab.tsx) buys rival banks.
import { INVESTMENT_BANKS } from '../../data/investmentBanks';
import { DISTRICT_SPECS } from '../../data/districts';
import { LayerMedallion } from '../map/LayerIcon';
import { Panel, type Tab } from '../components';
import { closePanel, openPanel, useGame, type InvestmentBankTab } from '../store';
import { EquityTab } from './EquityTab';
import { MarketTab } from './MarketTab';
import { MnaTab } from './MnaTab';
import { InvestmentBankArt } from './InvestmentBankArt';

const TABS: Tab<InvestmentBankTab>[] = [
  { id: 'market', label: 'Market' },
  { id: 'equity', label: 'Equity' },
  { id: 'mna', label: 'M&A' },
];

export function InvestmentBankPanel(p: { siteId: string; tab: InvestmentBankTab }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  const bank = site ? INVESTMENT_BANKS[site.refId] : undefined;
  if (!site || !bank) {
    return (
      <Panel title="Investment bank" onClose={closePanel}>
        <p class="muted">That building is no longer on the map.</p>
      </Panel>
    );
  }
  const district = DISTRICT_SPECS[site.district]?.name;
  const setTab = (tab: InvestmentBankTab) =>
    openPanel({ type: 'investmentBank', siteId: site.id, tab });
  return (
    <Panel
      title={bank.name}
      subtitle={['Investment bank', site.address, district].filter(Boolean).join(' · ')}
      icon={<LayerMedallion id="investmentBanks" size={32} />}
      onClose={closePanel}
      advisor={{ text: `Welcome to ${bank.name}. Raising capital or buying a competitor?` }}
      hero={<InvestmentBankArt />}
      tabs={TABS}
      tab={p.tab}
      onTab={setTab}
    >
      <div class="stack">
        {p.tab === 'market' && <MarketTab bankId={bank.id} />}
        {p.tab === 'equity' && <EquityTab bankId={bank.id} />}
        {p.tab === 'mna' && <MnaTab bankId={bank.id} />}
      </div>
    </Panel>
  );
}
