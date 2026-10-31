// Number, money, rate and date formatting (SCREENS §0.4). Pure functions; the
// currency symbol comes from settings, and money converts to that currency at
// the fixed rates in CURRENCY_RATES.
import { exactMoney, fromCurrency, toCurrency } from '../../data/settingsOptions';
import { dateOf } from '../../sim/calendar';

export { exactMoney, fromCurrency, toCurrency };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Compact money for cards and headlines: $2.10T, $1.48B, $29.8M, $83.7K, $950. */
export function money(x: number, symbol = '$'): string {
  const a = Math.abs(toCurrency(x, symbol));
  // Pick the unit after rounding, so 999,999 reads $1.00M, not $1000K.
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  let body = String(Math.round(a).toLocaleString('en-US'));
  for (const [size, unit] of units) {
    if (a < (unit === 'K' ? 1e4 : size * 0.9995)) continue;
    const t = trim(a / size);
    if (Number(t) >= 1000 && unit !== 'T') continue;
    body = `${t}${unit}`;
    break;
  }
  const sign = x < 0 && body.replace(/[^1-9]/g, '') !== '' ? '−' : '';
  return `${sign}${symbol}${body}`;
}

/** Full money for statements: $1,482,140. */
export function moneyFull(x: number, symbol = '$'): string {
  const v = Math.round(Math.abs(toCurrency(x, symbol)));
  const sign = x < 0 && v > 0 ? '−' : '';
  return `${sign}${symbol}${v.toLocaleString('en-US')}`;
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

const SUFFIX: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

/**
 * Rewrites dollar amounts the simulation wrote into a sentence ("$1,250",
 * "$18.2M", "$4.50") in the chosen currency, so command reasons, incident
 * text and labels follow the currency setting. Unchanged for "$".
 */
export function localizeMoney(text: string, symbol: string): string {
  if (symbol === '$') return text;
  return text.replace(
    /(?<![A-Za-z])\$(\d(?:[\d,]*\d)?(?:\.\d+)?)([KkMBT](?![a-z]))?/g,
    (_, n, suf) => {
      const v = Number(String(n).replace(/,/g, '')) * (suf ? SUFFIX[suf.toUpperCase()]! : 1);
      if (suf) return money(v, symbol);
      return String(n).includes('.') ? exactMoney(v, symbol) : moneyFull(v, symbol);
    },
  );
}

/** Three significant figures, judged after rounding (99.96 → "100", not "100.0"). */
function trim(v: number): string {
  if (Number(v.toFixed(1)) >= 100) return v.toFixed(0);
  if (Number(v.toFixed(2)) >= 10) return v.toFixed(1);
  return v.toFixed(2);
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
/** A week count with its noun: "1 week", "3 weeks". */
export function weeksText(n: number): string {
  return `${count(n)} ${n === 1 ? 'week' : 'weeks'}`;
}

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

/** "October 2027" for a game day. */
export function monthYear(startDate: string, day: number): string {
  const d = dateOf(startDate, day);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
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

/** Runway for display (SIMULATION §15): "Not burning cash" with no burn, else months. */
export function runwayText(months: number | null): string {
  if (months === null) return 'Not burning cash';
  if (months >= 120) return '10 years+';
  const m = months < 10 ? Math.floor(months * 10) / 10 : Math.floor(months);
  return `${m} month${m === 1 ? '' : 's'}`;
}

/** Weeks of running costs cash would cover: 0.4 → "Under 1 week", 7.6 → "7 weeks", 52+ → "A year or more". */
export function coverText(weeks: number): string {
  if (weeks < 1) return 'Under 1 week';
  if (weeks >= 52) return 'A year or more';
  const n = Math.floor(weeks);
  return `${n} week${n === 1 ? '' : 's'}`;
}

/** A safety ratio as a whole percent: 0.963 → "96%". */
export function safetyRatioText(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
