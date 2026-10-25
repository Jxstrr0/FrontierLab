// Pure number formatting for The Weekly Ledger's copy (SCREENS §0.4). The sim
// can't import the app's formatters, so this mirrors src/app/format/format.ts:
// compact money ($1.48B, $29.8M, $83.7K, $950), rates with two decimals
// (3.25%) and plain percentages with one (2.4%). No locale calls, so issues
// read the same on every device.

/** Thousands separators without toLocaleString: 12500 → "12,500". */
export function grouped(x: number): string {
  const digits = String(Math.round(Math.abs(x)));
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ',';
    out += digits[i];
  }
  return out;
}

function trim(v: number): string {
  return v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
}

/** Compact money for headlines, the same rule as the app's `money`. */
export function newsMoney(x: number, symbol: string): string {
  const sign = x < 0 ? '−' : '';
  const a = Math.abs(x);
  if (a >= 1e9) return `${sign}${symbol}${trim(a / 1e9)}B`;
  if (a >= 1e6) return `${sign}${symbol}${trim(a / 1e6)}M`;
  if (a >= 1e4) return `${sign}${symbol}${trim(a / 1e3)}K`;
  return `${sign}${symbol}${grouped(a)}`;
}

/** A decimal rate as a percentage: 0.0325 → "3.25%". */
export function newsRate(rate: number, digits = 2): string {
  return `${(rate * 100).toFixed(digits)}%`;
}

/** A plain percent number (2.4 = 2.4%) with one decimal; negatives use a true minus. */
export function newsPct(value: number, digits = 1): string {
  const text = Math.abs(value).toFixed(digits);
  return value < 0 && Number(text) !== 0 ? `−${text}%` : `${text}%`;
}

/** Magnitude only, for copy that already says up or down: −3.24 → "3.2%". */
export function newsAbsPct(value: number, digits = 1): string {
  return `${Math.abs(value).toFixed(digits)}%`;
}

/** A rate change in basis points: 0.0025 → "25". */
export function basisPoints(change: number): string {
  return String(Math.round(Math.abs(change) * 10_000));
}

/** 1 → "1st", 2 → "2nd", 11 → "11th". */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${n % 10 > 3 ? 'th' : suffix}`;
}

/** Fills {tokens} in a template; unknown tokens are left visible so tests catch them. */
export function fillTemplate(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => tokens[key] ?? whole);
}
