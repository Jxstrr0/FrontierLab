// Amount slider (SCREENS §10 funding and GPU markets): a native range input styled as a
// brass track with a 44 px thumb, the chosen amount above it and a Max chip.
// The value snaps to a round step; the track ends on the step after the
// maximum and snapAmount clamps to it, so the exact maximum is reachable.
import { money } from '../../format/format';
import { niceStep, snapAmount } from './treasuryView';

export function AmountSlider(p: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  sym: string;
  /** Smallest step (defaults to $1,000). */
  floor?: number;
  disabled?: boolean;
  /** Formats the amount (defaults to money; the GPU market shows GPUs). */
  format?: (v: number) => string;
}) {
  const fmt = p.format ?? ((v: number) => money(v, p.sym));
  const step = niceStep(p.max, p.floor);
  const off = p.disabled || p.max <= 0;
  const set = (raw: number) => p.onChange(snapAmount(raw, p.max, step));
  return (
    <div class={`amount-slider${off ? ' is-disabled' : ''}`}>
      <div class="amount-slider-head">
        <span class="muted small">{p.label}</span>
        <span class="amount-slider-value">{fmt(p.value)}</span>
      </div>
      <div class="amount-slider-body">
        <div class="amount-slider-track">
          <input
            type="range"
            min={0}
            max={Math.max(Math.ceil(p.max / step) * step, 1)}
            step={step}
            value={p.value}
            disabled={off}
            aria-label={p.label}
            aria-valuetext={fmt(p.value)}
            onInput={(e) => set(Number((e.target as HTMLInputElement).value))}
          />
          <div class="amount-slider-scale muted small" aria-hidden="true">
            <span>{fmt(0)}</span>
            <span>{fmt(p.max)}</span>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-secondary btn-small amount-slider-max"
          disabled={off || p.value === p.max}
          onClick={() => p.onChange(p.max)}
        >
          Max
        </button>
      </div>
    </div>
  );
}
