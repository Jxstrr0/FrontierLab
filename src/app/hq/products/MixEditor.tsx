// Mix editor for a custom underwriting model (SCREENS §10 Manage models, §13
// My model): one slider per data input, always adding up to 100% (moving one
// rescales the others, see mixMath.ts), with a live rosette, cost per
// application and any problem with the mix. Internal History stays locked
// until enough loans are booked. Controlled: the parent keeps the percents.
import { DATA_INPUTS } from '../../../data/bureaus';
import type { ModelSource } from '../../../sim/underwriting';
import { previewModel } from '../../../sim/underwriting';
import { Card, Row } from '../../components';
import { count } from '../../format/format';
import { useGame } from '../../store';
import { fromPercents, percentTotal, rebalance, type PercentMix } from './mixMath';
import { ModelRosette } from './ModelRosette';
import { INPUT_IDS, openInputs, radarText } from './productSelectors';

export function MixEditor(p: {
  value: PercentMix;
  onChange: (v: PercentMix) => void;
  source: ModelSource;
}) {
  const s = useGame();
  const sym = s.settings.currency;
  const open = openInputs(s);
  const preview = previewModel(s, fromPercents(p.value), p.source);
  const total = percentTotal(p.value);
  return (
    <div class="stack">
      <Card>
        <ModelRosette radar={preview.radar} label="Preview" />
        <Row label="Cost per application" value={`${sym}${preview.costPerApp.toFixed(2)}`} strong />
        <Row label="Model quality" value={`${radarText(preview.quality)} / 10`} />
        {p.source === 'hosted' && (
          <p class="muted small hq-note">Hosted models carry the bureau's markup.</p>
        )}
      </Card>
      <div class="pf-mix" role="group" aria-label="Data inputs">
        {INPUT_IDS.map((id) => {
          const input = DATA_INPUTS[id]!;
          const locked = !open.includes(id);
          const v = p.value[id] ?? 0;
          return (
            <div class={`pf-mix-row${locked ? ' is-locked' : ''}`}>
              <div class="pf-mix-head">
                <label class="pf-mix-name" for={`mix-${id}`}>
                  {input.name}
                </label>
                <span class="pf-mix-value">{locked ? 'Locked' : `${v}%`}</span>
              </div>
              <input
                id={`mix-${id}`}
                class="pf-range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={v}
                disabled={locked}
                aria-valuetext={`${v}%`}
                onInput={(e) =>
                  p.onChange(
                    rebalance(p.value, id, Number((e.target as HTMLInputElement).value), open),
                  )
                }
              />
              <div class="muted small">
                {locked
                  ? `Unlocks at ${count(input.minLoansBooked ?? 0)} loans booked (${count(s.underwriting.loansBooked)} so far)`
                  : `${sym}${input.costPerApp.toFixed(2)} per application`}
              </div>
            </div>
          );
        })}
      </div>
      <p class={`small ${preview.problem ? 'tone-bad' : 'muted'}`} role="status">
        {preview.problem ?? `Total ${total}%. Moving one input rebalances the others.`}
      </p>
    </div>
  );
}
