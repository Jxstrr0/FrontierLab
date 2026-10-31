// Compute floor content (stage C4b, SCREENS §10, SIMULATION §13.0; the old
// Treasury floor keeps its `treasury` id): the compute pool with its spot
// limits and auto spot-buy (C4c), rented GPU lots, the GPU market and a card
// per student partnership.
import { ComputeCard } from '../company/ComputeCard';
import { SectionTitle } from '../components';
import { ComputeBanner, ComputePolicyCard } from './compute/ComputePolicyCard';
import { GpuInventory } from './compute/GpuInventory';
import { GpuMarket } from './compute/GpuMarket';
import { PartnershipCards } from './treasury/PartnershipCards';
import './treasury/treasury.css';

export function TreasuryFloor() {
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

      <SectionTitle>Student partnerships</SectionTitle>
      <PartnershipCards />
    </div>
  );
}
