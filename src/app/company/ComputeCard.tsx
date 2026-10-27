// Compute card (stage C4a, SCREENS §6, SIMULATION §13.0): the chip market's
// spot price and phase with a two-year index chart, the GPUs your offices used
// last week, the GPUs running in your data centers and rented in lots (C4b), the share they covered,
// and what the rest costs at spot. Shown on the Company screen and on each
// data center's panel.
import { COMPUTE } from '../../config/balance';
import { capacityGpus, ownedShare, spotPrice } from '../../sim/compute';
import type { ChipPhase } from '../../sim/state';
import { Badge, Card, LineChart, Row } from '../components';
import { count, money, pct } from '../format/format';
import { useGame } from '../store';

const PHASES: Record<ChipPhase, { label: string; tone: 'good' | 'info' | 'bad' }> = {
  glut: { label: 'Chip glut', tone: 'good' },
  normal: { label: 'Normal market', tone: 'info' },
  shortage: { label: 'Chip shortage', tone: 'bad' },
};

export function ComputeCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const c = s.compute;
  const phase = PHASES[c.phase];
  const spotGpus = Math.max(0, c.demandGpus - capacityGpus(s));
  const history = c.history.length > 1 ? c.history : [c.index, c.index];
  return (
    <Card>
      <div class="cap-head">
        <div>
          <div class="muted small">Spot compute</div>
          <div class="hero-number">{money(spotPrice(s), sym)}</div>
          <div class="muted small">per GPU-week</div>
        </div>
        <Badge tone={phase.tone}>{phase.label}</Badge>
      </div>
      <LineChart
        label="Compute price index"
        series={[{ label: 'Price index', values: history, tone: 'brass' }]}
        max={Math.max(COMPUTE.targets.shortage + 0.2, ...history)}
        startLabel={`${history.length} wk ago`}
        endLabel="Now"
      />
      <Row label="GPUs your customers used" value={count(Math.round(c.demandGpus))} />
      <Row label="GPUs in your data centers" value={count(c.ownedGpus)} />
      {c.rentedGpus > 0 && <Row label="GPUs rented in lots" value={count(c.rentedGpus)} />}
      <Row
        label="Covered by your GPUs"
        value={c.demandGpus > 0 ? pct(ownedShare(s), 0) : '—'}
        tone="dim"
      />
      <Row label="Bought at spot" value={`${money(spotGpus * spotPrice(s), sym)} / week`} strong />
      <p class="muted small cap-note">
        Every seat and API call runs on GPUs. Your own data centers and reserved GPUs serve them
        first; the rest is rented at the spot price, which swings with the chip market.
      </p>
    </Card>
  );
}
