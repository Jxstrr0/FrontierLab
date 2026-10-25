// Words for the HR benefits carousel (SCREENS §10, CONTENT §10): the control's
// unit ("$6,000 /employee/yr", "4.0% of salary"), its stepper bounds and the
// effect badges at a value, using the same scaling the simulation applies
// (src/sim/hq.ts scaledEffect and BENEFIT_RULES). Pure; no GameState writes.
import { REMOTE_FRIDAY_STAFF } from '../../config/balance';
import { BENEFIT_RULES, type BenefitSpec } from '../../data/benefits';
import { scaledEffect } from '../../sim/hq';
import { fromCurrency, moneyFull, toCurrency } from '../format/format';

/** The value as the card's stepper shows it. */
export function benefitValueText(spec: BenefitSpec, value: number, sym = '$'): string {
  switch (spec.control) {
    case 'perYear':
      return `${moneyFull(value, sym)} /yr`;
    case 'perWeek':
      return `${moneyFull(value, sym)} /wk`;
    case 'pctSalary':
      return `${(value * 100).toFixed(1)}%`;
    case 'discount':
      return `${(value * 100).toFixed(2).replace(/0$/, '')}% off`;
    case 'toggle':
      return value > 0 ? 'On' : 'Off';
  }
}

/** The unit under the stepper. */
export function benefitUnit(spec: BenefitSpec): string {
  switch (spec.control) {
    case 'perYear':
      return 'per employee per year';
    case 'perWeek':
      return 'per employee per week';
    case 'pctSalary':
      return 'matched share of salary';
    case 'discount':
      return spec.id === 'mortgage_disc' ? 'discount on the mortgage rate' : 'discount on shares';
    case 'toggle':
      return spec.hqOnly ? 'HQ staff only' : 'for everyone';
  }
}

/** Typed text for the stepper's tap-to-type (percent controls take percent). */
export const benefitEditText = (spec: BenefitSpec, v: number, sym = '$'): string =>
  spec.control === 'pctSalary' || spec.control === 'discount'
    ? String(Number((v * 100).toFixed(3)))
    : String(Number(toCurrency(v, sym).toFixed(2)));

export const benefitParse = (spec: BenefitSpec, text: string, sym = '$'): number => {
  const n = Number(text.replace(/[^0-9.-]/g, ''));
  return spec.control === 'pctSalary' || spec.control === 'discount'
    ? n / 100
    : fromCurrency(n, sym);
};

const signed = (n: number, digits = 0) => `+${Number(n.toFixed(digits))}`;

/**
 * Effect badges at a value. With the benefit off, the badges show what it
 * gives at its reference amount, so players can see what they would buy.
 */
export function benefitEffects(spec: BenefitSpec, value: number): string[] {
  const v = value > 0 ? value : spec.ref;
  const out: string[] = [];
  const R = BENEFIT_RULES;
  if (spec.id === 'tuition') {
    const skill = Math.min(R.tuitionSkillMax, (R.tuitionSkillPer1k * v) / 1000);
    out.push(`${signed(skill * 100)}% skill growth`);
    if (v >= R.tuitionAttractionAt) out.push(`${signed(R.tuitionAttraction)} hiring appeal`);
    return out;
  }
  if (spec.id === 'pension') {
    const pts = v * 100;
    out.push(
      `${signed(Math.min(R.pensionRetentionMax, R.pensionRetentionPerPt * pts) * 100)}% retention`,
    );
    out.push(`${signed((pts / 2) * R.pensionMoralePer2Pts, 1)} morale`);
    return out;
  }
  const e = spec.effects;
  const at = (x: number | undefined) => scaledEffect(v, spec.ref, x ?? 0);
  if (e.morale) out.push(`${signed(at(e.morale), 1)} morale${spec.hqOnly ? ' at HQ' : ''}`);
  if (e.retention) out.push(`${signed(at(e.retention) * 100)}% retention`);
  if (e.attraction) out.push(`${signed(at(e.attraction), 1)} hiring appeal`);
  if (e.reputation) out.push(`${signed(at(e.reputation), 2)} branch rating`);
  if (spec.id === 'remote_fri')
    out.push(`${Math.round(REMOTE_FRIDAY_STAFF * 100)}% less HQ output`);
  return out;
}
