// Number, money, rate and date formatting (SCREENS §0.4). Pure functions; the
// currency symbol comes from settings, and money converts to that currency at
// the fixed rates in CURRENCY_RATES.
import { exactMoney, fromCurrency, toCurrency } from '../../data/settingsOptions';
import { dateOf } from '../../sim/calendar';

export { exactMoney, fromCurrency, toCurrency };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Compact money for cards and headlines: $1.48B, $29.8M, $83.7K, $950. */
export function money(x: number, symbol = '$'): string {
  const sign = x < 0 ? '−' : '';
  const a = Math.abs(toCurrency(x, symbol));
  if (a >= 1e9) return `${sign}${symbol}${trim(a / 1e9)}B`;
  if (a >= 1e6) return `${sign}${symbol}${trim(a / 1e6)}M`;
  if (a >= 1e4) return `${sign}${symbol}${trim(a / 1e3)}K`;
  return `${sign}${symbol}${Math.round(a).toLocaleString('en-US')}`;
}

/** Full money for statements: $1,482,140. */
export function moneyFull(x: number, symbol = '$'): string {
  const sign = x < 0 ? '−' : '';
  return `${sign}${symbol}${Math.round(Math.abs(toCurrency(x, symbol))).toLocaleString('en-US')}`;
}

/**
 * Stepper props for a money value: shows it with `show` (moneyFull by default)
 * and lets the player type an amount in the chosen currency.
 */
export function moneyStepper(
  symbol: string,
  show: (x: number, symbol: string) => string = moneyFull,
): {
  format: (v: number) => string;
  editText: (v: number) => string;
  parse: (t: string) => number;
} {
  return {
    format: (v) => show(v, symbol),
    editText: (v) => String(Number(toCurrency(v, symbol).toFixed(2))),
    parse: (t) => fromCurrency(Number(t.replace(/[^0-9.]/g, '')), symbol),
  };
}

/** Statement figure without a symbol: 1,482,140 or (12,500) style negatives as −12,500. */
export function figure(x: number, symbol = '$'): string {
  const sign = x < 0 ? '−' : '';
  return `${sign}${Math.round(Math.abs(toCurrency(x, symbol))).toLocaleString('en-US')}`;
}

function trim(v: number): string {
  return v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
}

/** A decimal rate as a percentage with two decimals: 0.0325 → "3.25%". */
export function pct(rate: number, digits = 2): string {
  return `${(rate * 100).toFixed(digits)}%`;
}

/** Signed percentage points: 0.024 → "+2.40%". */
export function signedPct(rate: number, digits = 2): string {
  const s = rate > 0 ? '+' : rate < 0 ? '−' : '';
  return `${s}${Math.abs(rate * 100).toFixed(digits)}%`;
}

/** Plain count with separators. */
export function count(x: number): string {
  return Math.round(x).toLocaleString('en-US');
}

/** Delta text and tone: "+$1,663 (+3%)" (SCREENS §0.4). */
export function delta(
  now: number,
  prev: number,
  symbol = '$',
): { text: string; tone: 'good' | 'bad' | 'flat' } {
  const d = now - prev;
  const tone = d > 0 ? 'good' : d < 0 ? 'bad' : 'flat';
  const sign = d > 0 ? '+' : d < 0 ? '−' : '';
  const rel = prev !== 0 ? ` (${sign}${Math.abs(Math.round((d / Math.abs(prev)) * 100))}%)` : '';
  const shown = Math.round(Math.abs(toCurrency(d, symbol))).toLocaleString('en-US');
  return { text: `${sign}${symbol}${shown}${rel}`, tone };
}

/** "Mon 4 Jan 2027" style date for a game day. */
export function gameDate(startDate: string, day: number): string {
  const d = dateOf(startDate, day);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Short "4 Jan" date. */
export function shortDate(startDate: string, day: number): string {
  const d = dateOf(startDate, day);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** 0.0325 → "3.25": a rate as an editable percent, without float noise or trailing zeros. */
export function percentText(v: number): string {
  return String(Number((v * 100).toFixed(3)));
}

/**
 * A capital ratio for display. Before much lending, risk-weighted assets are tiny
 * and the true ratio runs to hundreds of percent, so anything above 100% reads "100%+".
 */
export function capitalRatioText(ratio: number): string {
  return ratio > 1 ? '100%+' : pct(ratio, 1);
}
