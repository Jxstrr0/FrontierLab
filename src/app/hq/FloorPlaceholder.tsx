// Placeholder cards for floors whose systems arrive in later stages
// (Investment in Stage 7). Each says what is coming, so a floor is
// honest about what works today. Replace an entry when its floor is built.
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
