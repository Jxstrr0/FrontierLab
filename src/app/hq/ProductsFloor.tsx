// Products floor content (SCREENS §10, DESIGN §5.8.3), under the shared team
// controls: the house underwriting model with Manage models, the company deposits and loans trend, the company product lineup with
// "Apply rates to all branches", and product developments with New product.
import { Card, SectionTitle } from '../components';
import { useGame } from '../store';
import { CompanyTrend } from './products/CompanyTrend';
import { Developments } from './products/Developments';
import { HouseModelCard } from './products/HouseModelCard';
import { LeaderboardCard } from './products/LeaderboardCard';
import { ProductLineup } from './products/ProductLineup';
import { ResearchTeamCard } from './products/ResearchTeamCard';
import { TrainingCard } from './products/TrainingCard';
import './products/products.css';

export function ProductsFloor() {
  const s = useGame();
  if (!s.departments.products) {
    return (
      <Card>
        <p class="muted">Add a Products floor to manage models, the lineup and developments.</p>
      </Card>
    );
  }
  return (
    <div class="stack">
      <SectionTitle>AI model</SectionTitle>
      <HouseModelCard />

      <SectionTitle>Training run</SectionTitle>
      <TrainingCard />

      <SectionTitle>Research team</SectionTitle>
      <ResearchTeamCard />

      <SectionTitle>Leaderboard</SectionTitle>
      <LeaderboardCard />

      <SectionTitle>Deposits and loans</SectionTitle>
      <CompanyTrend />

      <SectionTitle>Product lineup</SectionTitle>
      <ProductLineup />

      <SectionTitle>Product developments</SectionTitle>
      <Developments />
    </div>
  );
}
