// Compute floor content (stage C4b, SCREENS §10, SIMULATION §13.0; the old
// Treasury floor keeps its `treasury` id): the compute pool with its spot
// limits and auto spot-buy (C4c), rented GPU lots,
// the GPU market and a card per partnership. The bank-era liquidity, funding
// market and central bank cards show only for saves that still carry
// deposits, wholesale lots or central bank borrowing.
import { ComputeCard } from '../company/ComputeCard';
import { SectionTitle } from '../components';
import { useGame } from '../store';
import { ComputeBanner, ComputePolicyCard } from './compute/ComputePolicyCard';
import { GpuInventory } from './compute/GpuInventory';
import { GpuMarket } from './compute/GpuMarket';
import { CentralBankFacility } from './treasury/CentralBankFacility';
import { FundingInventory } from './treasury/FundingInventory';
import { FundingMarket } from './treasury/FundingMarket';
import { LiquidityCard } from './treasury/LiquidityCard';
import { PartnershipCards } from './treasury/PartnershipCards';
import { TreasuryPolicyCard } from './treasury/TreasuryPolicyCard';
import { hasLegacyFunding } from './treasury/legacyFunding';
import './treasury/treasury.css';

export function TreasuryFloor() {
  const s = useGame();
  return (
    <div class="stack tr-floor">
      <ComputeBanner />
      <SectionTitle>Compute pool</SectionTitle>
      <ComputeCard />
      <ComputePolicyCard />

      <SectionTitle>Rented GPUs</SectionTitle>
      <GpuInventory />

      <SectionTitle>GPU market</SectionTitle>
      <GpuMarket />

      {hasLegacyFunding(s) && (
        <>
          <SectionTitle>Liquidity</SectionTitle>
          <LiquidityCard />
          <TreasuryPolicyCard />

          <SectionTitle>Funding inventory</SectionTitle>
          <FundingInventory />

          <SectionTitle>Funding market</SectionTitle>
          <FundingMarket />

          <SectionTitle>Central bank</SectionTitle>
          <CentralBankFacility />
        </>
      )}

      <SectionTitle>Student partnerships</SectionTitle>
      <PartnershipCards />
    </div>
  );
}
