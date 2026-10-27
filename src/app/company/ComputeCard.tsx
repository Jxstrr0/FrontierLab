// Compute card (stage C4a, SCREENS §6, SIMULATION §13.0): the chip market's
// spot price and phase with a two-year index chart, the GPUs your offices used
// last week, the GPUs running in your data centers and rented in lots (C4b),
// the share they covered, what was bought at spot against the spot limit,
// emergency burst and unserved demand with waitlist and outage badges, and the
// pool's real cost against spot (C4c). Shown on the Company screen, on each
// data center's panel and on the Compute floor.
import { COMPUTE } from '../../config/balance';
import { allocation, ownedShare, poolCostFactor, spotCost, spotPrice } from '../../sim/compute';
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
  const a = allocation(s);
  const history = c.history.length > 1 ? c.history : [c.index, c.index];
  const pool = poolCostFactor(s);
  return (
    <Card tutorial="compute-card">
      <div class="cap-head">
        <div>
          <div class="muted small">Spot compute</div>
          <div class="hero-number">{money(spotPrice(s), sym)}</div>
          <div class="muted small">per GPU-week</div>
        </div>
        <div class="cap-badges">
          <Badge tone={phase.tone}>{phase.label}</Badge>
          {c.outageWeeksLeft > 0 ? (
            <Badge tone="bad">Outage</Badge>
          ) : (
            c.crunchWeeks > 0 && <Badge tone="bad">Waitlist</Badge>
          )}
        </div>
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
      <Row
        label="Bought at spot"
        value={`${count(Math.round(a.spot))} of ${count(Math.round(a.spotLimit))} max`}
      />
      {a.burst > 0 && (
        <Row label="Emergency burst" value={`${count(Math.round(a.burst))} GPUs`} tone="bad" />
      )}
      {a.short > 0 && (
        <Row
          label="Not served (waitlist)"
          value={`${count(Math.round(a.short))} GPUs`}
          tone="bad"
        />
      )}
      <Row label="Spot and burst bill" value={`${money(spotCost(s, a), sym)} / week`} strong />
      {c.weekCost > 0 && (
        <Row
          label="Pool cost vs spot"
          value={pct(pool, 0)}
          tone={pool < 1 ? 'good' : pool > 1 ? 'bad' : 'dim'}
        />
      )}
      <p class="muted small cap-note">
        Every seat and API call runs on GPUs. Offices are charged today's spot price for what they
        use; your data centers and reserved GPUs make the real bill cheaper. Clouds only sell so
        much at spot: past that you pay for emergency burst, then new customers wait.
      </p>
    </Card>
  );
}
