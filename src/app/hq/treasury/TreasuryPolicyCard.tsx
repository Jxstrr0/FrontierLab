// Treasury policy (SCREENS §10, SIMULATION §13.3–13.5): the target liquidity
// ratio slider and the auto-funding toggle. Government bonds were removed in
// stage C3c.
import { LIQ_TARGET_RANGE } from '../../../config/balance';
import * as cmd from '../../../sim/commands';
import { Card, Toggle } from '../../components';
import { act, useGame } from '../../store';
import { PercentSlider } from './PercentSlider';

/** The target slider moves in whole percentage points. */
const TARGET_STEP = 0.01;

export function TreasuryPolicyCard() {
  const s = useGame();
  const t = s.treasury;
  const [lo, hi] = LIQ_TARGET_RANGE;
  return (
    <Card>
      <div class="tr-card-title">Treasury policy</div>
      <div class="tr-policy">
        <PercentSlider
          label="Target liquidity"
          value={t.liqTarget}
          min={lo}
          max={hi}
          step={TARGET_STEP}
          onChange={(v) => act(cmd.setTreasuryPolicy, { liqTarget: v })}
        />
      </div>
      <Toggle
        label="Auto-funding"
        hint={
          t.autoFunding
            ? 'Borrows overnight to hold the target; the central bank covers the minimum'
            : 'Nothing tops up the target; a fall under the minimum freezes lending'
        }
        checked={t.autoFunding}
        onChange={(v) => act(cmd.setTreasuryPolicy, { autoFunding: v })}
      />
    </Card>
  );
}
