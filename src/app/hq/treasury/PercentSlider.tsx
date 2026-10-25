// Percent slider for the treasury policy (SCREENS §10: target LR slider, bonds
// share slider). A native range input styled like the funding market's amount
// slider (brass track, 44 px touch height), with the current value beside the
// label and the bounds under the track. The input works in whole hundredths so
// steps stay exact (0.07, never 0.07000000000000001).
import { pct } from '../../format/format';

/** Rates to whole hundredths of the range input, and back. */
const toUnits = (rate: number) => Math.round(rate * 100);
const fromUnits = (units: number) => units / 100;

export function PercentSlider(p: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div class="amount-slider">
      <div class="amount-slider-head">
        <span class="muted small">{p.label}</span>
        <span class="amount-slider-value">{pct(p.value, 0)}</span>
      </div>
      <div class="amount-slider-body">
        <div class="amount-slider-track">
          <input
            type="range"
            min={toUnits(p.min)}
            max={toUnits(p.max)}
            step={toUnits(p.step)}
            value={toUnits(p.value)}
            aria-label={p.label}
            aria-valuetext={pct(p.value, 0)}
            onInput={(e) => {
              const v = fromUnits(Number((e.target as HTMLInputElement).value));
              if (v !== p.value) p.onChange(v);
            }}
          />
          <div class="amount-slider-scale muted small" aria-hidden="true">
            <span>{pct(p.min, 0)}</span>
            <span>{pct(p.max, 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
