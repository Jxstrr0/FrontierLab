// Placeholder cards for floor content that later Stage 4 passes fill in
// (Products, Treasury, Marketing and Risk floors, digital projects, the credit
// bureau and marketing agency sites). Each says what is coming and with what,
// so the floor is honest about what works today.
//
// PLACEHOLDER: replace each <FloorPlaceholder> (and the PLACEHOLDER_FLOORS
// table) with the real floor content as its simulation lands.
import type { DeptId } from '../../sim/state';
import { Card } from '../components';

export function FloorPlaceholder(p: { title: string; arrives: string; body: string }) {
  return (
    <Card class="hq-placeholder">
      <div class="hq-placeholder-head">
        <span class="hq-placeholder-title">{p.title}</span>
        <span class="hq-placeholder-tag">{p.arrives}</span>
      </div>
      <p class="muted small hq-note">{p.body}</p>
    </Card>
  );
}

interface PlaceholderSpec {
  title: string;
  arrives: string;
  body: string;
}

/** What each not-yet-built floor will hold (SCREENS §10). */
export const PLACEHOLDER_FLOORS: Partial<Record<DeptId, PlaceholderSpec[]>> = {
  products: [
    {
      title: 'House model',
      arrives: 'Arrives with the Products update',
      body: 'Your underwriting model, its rosette and cost per application, and Manage models.',
    },
    {
      title: 'Product lineup and developments',
      arrives: 'Arrives with the Products update',
      body: 'Risk appetite, the company lineup with "Apply rates to all branches", the deposits and loans trend, and new product developments.',
    },
  ],
  treasury: [
    {
      title: 'Liquidity and funding',
      arrives: 'Arrives with the Treasury update',
      body: 'The liquidity gauge and policy, government bonds, your funding inventory and the funding market.',
    },
  ],
  marketing: [
    {
      title: 'Brand campaigns',
      arrives: 'Arrives with the Marketing update',
      body: 'Brand awareness by city, TV, billboard, podcast and creator campaigns, and your agency packages.',
    },
  ],
  risk: [
    {
      title: 'Losses and the regulator',
      arrives: 'Arrives with the Risk update',
      body: 'Loss rates by product, delinquency, model performance and regulator reviews.',
    },
  ],
  executive: [
    {
      title: 'Board and executives',
      arrives: 'Arrives with governance',
      body: 'Quarterly board meetings and seven senior executive seats.',
    },
  ],
  investment: [
    {
      title: 'Portfolio and ventures',
      arrives: 'Arrives with investments',
      body: 'Stocks, ventures, real estate and venture debt.',
    },
  ],
};

export function PlaceholderFloor(p: { dept: DeptId }) {
  return (
    <div class="stack">
      {(PLACEHOLDER_FLOORS[p.dept] ?? []).map((x) => (
        <FloorPlaceholder title={x.title} arrives={x.arrives} body={x.body} />
      ))}
    </div>
  );
}
