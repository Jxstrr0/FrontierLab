// Treasury floor content (SCREENS §10, DESIGN §5.8.4, SIMULATION §13): the
// liquidity gauge with the funding-freeze banner, the treasury policy, the
// funding inventory, the funding
// market and the central bank's standing facility (SCREENS §8 puts its
// Borrow / Repay here) and a card per payroll or student partnership.
import { SectionTitle } from '../components';
import { CentralBankFacility } from './treasury/CentralBankFacility';
import { FundingInventory } from './treasury/FundingInventory';
import { FundingMarket } from './treasury/FundingMarket';
import { LiquidityCard } from './treasury/LiquidityCard';
import { PartnershipCards } from './treasury/PartnershipCards';
import { TreasuryPolicyCard } from './treasury/TreasuryPolicyCard';
import './treasury/treasury.css';

export function TreasuryFloor() {
  return (
    <div class="stack tr-floor">
      <SectionTitle>Liquidity</SectionTitle>
      <LiquidityCard />
      <TreasuryPolicyCard />

      <SectionTitle>Funding inventory</SectionTitle>
      <FundingInventory />

      <SectionTitle>Funding market</SectionTitle>
      <FundingMarket />

      <SectionTitle>Central bank</SectionTitle>
      <CentralBankFacility />

      <SectionTitle>Partnerships</SectionTitle>
      <PartnershipCards />
    </div>
  );
}
