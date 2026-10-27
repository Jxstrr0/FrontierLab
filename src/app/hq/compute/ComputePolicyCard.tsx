// Compute policy (stage C4c, SCREENS §10 Compute, SIMULATION §13.0): banners
// for a capacity crunch or an outage, the spot and burst limits this week, the
// burst stigma, and the auto spot-buy toggle.
import { OUTAGE, SPOT } from '../../../config/balance';
import * as cmd from '../../../sim/commands';
import { allocation } from '../../../sim/compute';
import { Card, Row, Toggle } from '../../components';
import { count, pct } from '../../format/format';
import { act, useGame } from '../../store';

/** The outage or capacity-crunch banner, shown at the top of the Compute floor. */
export function ComputeBanner() {
  const c = useGame().compute;
  if (c.outageWeeksLeft > 0) {
    return (
      <div class="tr-banner" role="alert">
        <strong>Outage.</strong> Demand has outrun your GPUs for weeks, and customers are leaving
        faster than usual. Reserve GPUs below or build a data center to end it.
      </div>
    );
  }
  if (c.crunchWeeks > 0) {
    return (
      <div class="tr-banner" role="alert">
        <strong>Capacity crunch.</strong> You can't serve everyone, so new customers are on a
        waitlist. If it lasts {OUTAGE.afterWeeks} weeks, outages start.
      </div>
    );
  }
  return null;
}

export function ComputePolicyCard() {
  const s = useGame();
  const c = s.compute;
  const a = allocation(s);
  return (
    <Card>
      <Row label="Spot limit this week" value={`${count(Math.round(a.spotLimit))} GPUs`} />
      <Row label="Emergency burst on top" value={`${count(Math.round(a.burstLimit))} GPUs`} />
      {c.burstStigmaWeeks > 0 && (
        <Row
          label="After an emergency burst"
          value={`GPU offers +${pct(SPOT.stigmaMarkup, 0)}`}
          tone="bad"
        />
      )}
      <p class="muted small hq-note">
        The spot limit grows with what you've been buying, shrinks in a chip shortage, and never
        tops {count(SPOT.maxGpus)} GPUs: past that, own or reserve.
      </p>
      <Toggle
        label="Auto spot-buy"
        hint={
          c.autoSpotBuy
            ? 'Buys any shortfall at spot, then emergency burst at a premium'
            : 'Runs on your own and reserved GPUs only; any shortfall goes on a waitlist'
        }
        checked={c.autoSpotBuy}
        onChange={(v) => act(cmd.setAutoSpotBuy, v)}
      />
    </Card>
  );
}
