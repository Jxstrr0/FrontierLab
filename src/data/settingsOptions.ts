// The values each player setting can take (SCREENS §26). The settings command
// validates against these and the settings screen builds its controls from them.
export const CURRENCY_SYMBOLS = ['$', 'C$', '£', '€', '¥'] as const;
export type CurrencySymbol = (typeof CURRENCY_SYMBOLS)[number];

/**
 * What one game dollar shows as in each currency (SCREENS §0.4). The books are
 * kept in one money; the symbol you pick converts every amount on screen at
 * these fixed rates, so every currency starts you with the same real value.
 */
export const CURRENCY_RATES: Record<CurrencySymbol, number> = {
  $: 1,
  C$: 1.35,
  '£': 0.8,
  '€': 0.9,
  '¥': 150,
};

/** Decimal places for exact prices: yen has no cents. */
export const CURRENCY_DECIMALS: Record<CurrencySymbol, number> = {
  $: 2,
  C$: 2,
  '£': 2,
  '€': 2,
  '¥': 0,
};

/** A game amount in the chosen currency (unknown symbols pass through 1:1). */
export function toCurrency(x: number, symbol: string): number {
  return x * (CURRENCY_RATES[symbol as CurrencySymbol] ?? 1);
}

/** An amount typed in the chosen currency, back in game money. */
export function fromCurrency(x: number, symbol: string): number {
  return x / (CURRENCY_RATES[symbol as CurrencySymbol] ?? 1);
}

/** An exact price in the chosen currency: "$4.50", "¥675". */
export function exactMoney(x: number, symbol: string): string {
  const digits = CURRENCY_DECIMALS[symbol as CurrencySymbol] ?? 2;
  const sign = x < 0 ? '−' : '';
  const v = Math.abs(toCurrency(x, symbol));
  return `${sign}${symbol}${v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
export const DISTANCE_UNITS = ['km', 'mi'] as const;
export const WEEKLY_RESULTS_MODES = ['weekly', 'monthly', 'quarterly', 'off'] as const;
export const DEFAULT_SPEEDS = [1, 2, 4] as const;
export const TEXT_SCALES = [1, 1.15, 1.3] as const;
