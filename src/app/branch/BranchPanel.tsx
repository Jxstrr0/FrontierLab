// Branch panel (SCREENS §5): header "{Bank} — {branch}", the manager's advisor
// line and the five tabs; an acquired branch shows a converting banner. The active tab lives in the panel route so it
// survives re-renders and reopening.
import { MERGERS } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { DISTRICT_SPECS } from '../../data/districts';
import { DEFAULT_LOGO_SHAPE } from '../../data/logoShapes';
import { managerOf } from '../../sim/branch/staff';
import { Medallion, Panel, type Tab } from '../components';
import { gameDate } from '../format/format';
import { closePanel, openPanel, useGame, type BranchTab } from '../store';
import { FinanceTab } from './FinanceTab';
import { LoanDeskTab } from './LoanDeskTab';
import { MarketingTab } from './MarketingTab';
import { ProductsTab } from './ProductsTab';
import { BranchHero } from './BranchHero';
import { advisorLines, businessLoans, openingDay } from './selectors';
import { ServiceTab } from './ServiceTab';
import './branch.css';

export function BranchPanel(p: { branchId: string; tab: BranchTab }) {
  const s = useGame();
  const branch = s.branches[p.branchId];
  if (!branch) return null;
  const lot = s.world.lots[branch.lotId];
  const district = lot ? DISTRICT_SPECS[lot.district]?.name : undefined;
  const mgr = managerOf(s, branch);
  const opening = gameDate(s.meta.startDate, openingDay(s, branch));
  const pending = businessLoans(s, branch.id).pending > 0;
  // An acquired branch converting to your brand (§19.8) still wears the old bank's colours.
  const conv = branch.converting;
  const tabs: Tab<BranchTab>[] = [
    { id: 'service', label: 'Service' },
    { id: 'products', label: 'Products' },
    { id: 'loandesk', label: 'Loan Desk', badge: pending },
    { id: 'marketing', label: 'Marketing' },
    { id: 'finance', label: 'Finance' },
  ];
  const setTab = (tab: BranchTab) => openPanel({ type: 'branch', branchId: branch.id, tab });

  return (
    <Panel
      title={`${s.meta.bankName} — ${branch.name}`}
      subtitle={[lot?.address, district !== branch.name ? district : undefined]
        .filter(Boolean)
        .join(' · ')}
      icon={
        <Medallion
          ink={conv?.ink ?? s.meta.brandInk}
          monogram={conv?.monogram ?? s.meta.monogram}
          shape={conv ? DEFAULT_LOGO_SHAPE : s.meta.logoShape}
          size={32}
        />
      }
      onClose={closePanel}
      advisor={{
        name: mgr?.name ?? 'Branch advisor',
        text: advisorLines(s, branch, opening),
        avatar: mgr?.portrait,
      }}
      hero={
        <BranchHero
          build={branch.build}
          bankName={conv?.name ?? s.meta.bankName}
          style={s.meta.houseStyle}
          brandInk={conv?.ink ?? s.meta.brandInk}
          monogram={conv?.monogram ?? s.meta.monogram}
          logoShape={conv ? DEFAULT_LOGO_SHAPE : s.meta.logoShape}
          ink={CITIES[branch.cityId]?.ink}
          live={{
            status: branch.status,
            staff: branch.staff.count,
            morale: branch.staff.morale,
            waitIndex: branch.waitIndex,
          }}
        />
      }
      tabs={tabs}
      tab={p.tab}
      onTab={setTab}
    >
      <div class="br-root">
        {branch.status === 'fitout' && (
          <div class="br-opening" role="status">
            <span class="br-opening-title">Opening on {opening}</span>
            <span class="muted small">
              The fit-out is under way. Set staff, prices and campaigns now; customers arrive when
              the doors open.
            </span>
          </div>
        )}
        {conv && (
          <div class="br-opening br-converting" role="status">
            <span class="br-opening-title">
              Converting from {conv.name}: {conv.weeksLeft} week{conv.weeksLeft === 1 ? '' : 's'}{' '}
              left
            </span>
            <span class="muted small">
              Signs, systems and uniforms switch to {s.meta.bankName} over {MERGERS.conversionWeeks}{' '}
              weeks. The branch already works as yours.
            </span>
          </div>
        )}
        {p.tab === 'service' && <ServiceTab branch={branch} />}
        {p.tab === 'products' && (
          <ProductsTab branch={branch} onLoanDesk={() => setTab('loandesk')} />
        )}
        {p.tab === 'loandesk' && <LoanDeskTab branchId={branch.id} />}
        {p.tab === 'marketing' && <MarketingTab branch={branch} />}
        {p.tab === 'finance' && <FinanceTab branch={branch} />}
      </div>
    </Panel>
  );
}
