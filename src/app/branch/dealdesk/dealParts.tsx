// Pieces shared by the Deal Desk cards (SCREENS §5.3): the business header
// (sector glyph, name, sector · size, a chip on the right) and the discount
// stepper (0 to DEAL.discountMax in DEAL.discountStep steps).
import type { ComponentChildren } from 'preact';
import { DEAL } from '../../../config/balance';
import { sectorOf } from '../../../sim/businesses';
import type { Business } from '../../../sim/state';
import { SIZE_LABEL } from '../../business/businessView';
import { Stepper } from '../../components';
import { pct } from '../../format/format';
import { SectorIcon } from './sectorIcons';

export function DealHead(p: { b: Business; chip?: ComponentChildren }) {
  return (
    <header class="deal-head">
      <span class="deal-icon">
        <SectorIcon sector={p.b.sector} />
      </span>
      <div class="deal-title">
        <h4 class="deal-name">{p.b.name}</h4>
        <div class="muted small">
          {sectorOf(p.b).name} · {SIZE_LABEL[p.b.size]}
        </div>
      </div>
      {p.chip}
    </header>
  );
}

/** A discount as a whole percent: 0.12 → "12%". */
export const discountText = (d: number) => pct(d, 0);

export function DiscountStepper(p: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <Stepper
      label={p.label}
      value={p.value}
      min={0}
      max={DEAL.discountMax}
      step={DEAL.discountStep}
      format={discountText}
      parse={(t) => Number(t.replace('%', '')) / 100}
      editText={(v) => String(Math.round(v * 100))}
      onChange={p.onChange}
      hint={p.hint}
      disabled={p.disabled}
    />
  );
}
