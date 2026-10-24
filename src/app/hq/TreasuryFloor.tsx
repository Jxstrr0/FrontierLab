// Treasury floor content (SCREENS §10, DESIGN §5.8.4, SIMULATION §13): the
// liquidity gauge with the funding-freeze banner and cash transfers, the
// treasury policy, government bonds, the funding inventory, the funding
// market and the central bank's standing facility (SCREENS §8 puts its
// Borrow / Repay here). Payroll partnerships arrive with Employers.
import { SectionTitle } from '../components';
import { CentralBankFacility } from './treasury/CentralBankFacility';
import { FundingInventory } from './treasury/FundingInventory';
import { FundingMarket } from './treasury/FundingMarket';
import { LiquidityCard } from './treasury/LiquidityCard';
import { BondsCard, TreasuryPolicyCard } from './treasury/PolicyAndBonds';
import { FloorPlaceholder } from './FloorPlaceholder';
import './treasury/treasury.css';

export function TreasuryFloor() {
  return (
    <div class="stack tr-floor">
      <SectionTitle>Liquidity</SectionTitle>
      <LiquidityCard />
      <TreasuryPolicyCard />
      <BondsCard />

      <SectionTitle>Funding inventory</SectionTitle>
      <FundingInventory />

      <SectionTitle>Funding market</SectionTitle>
      <FundingMarket />

      <SectionTitle>Central bank</SectionTitle>
      <CentralBankFacility />

      <SectionTitle>Partnerships</SectionTitle>
      <FloorPlaceholder
        title="Payroll partnerships"
        arrives="Arrives with Employers (Stage 5)"
        body="Deals with large employers that bring their staff's salary accounts to your bank."
      />
    </div>
  );
}
