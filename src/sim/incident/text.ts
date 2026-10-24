// Case text for incidents: fills a catalog template's {tokens} from the rolled
// data, formatting the keys the spec lists as money or percentages. Kept in the
// sim because option effect previews are stored on the incident (DATA_MODEL §6).
import type { IncidentSpec } from '../../data/incidents';

/** Compact money like the HUD: $1.48B, $29.8M, $83.7K, $950. */
export function compactMoney(x: number, symbol: string): string {
  const sign = x < 0 ? '−' : '';
  const a = Math.abs(x);
  const trim = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
  if (a >= 1e9) return `${sign}${symbol}${trim(a / 1e9)}B`;
  if (a >= 1e6) return `${sign}${symbol}${trim(a / 1e6)}M`;
  if (a >= 1e4) return `${sign}${symbol}${trim(a / 1e3)}K`;
  return `${sign}${symbol}${Math.round(a).toLocaleString('en-US')}`;
}

/** A decimal as a percentage: 0.8 → "80%", 0.0015 → "0.15%". */
export function percent(x: number): string {
  const v = x * 100;
  return `${Number.isInteger(Math.round(v * 100) / 100) ? v.toFixed(0) : v.toFixed(2)}%`;
}

/** Replaces {key} with the formatted data value; unknown keys stay as written. */
export function fillTemplate(
  template: string,
  spec: IncidentSpec,
  data: Record<string, number | string>,
  symbol: string,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const v = data[key];
    if (v === undefined) return whole;
    if (typeof v === 'string') return v;
    if (spec.money?.includes(key)) return compactMoney(v, symbol);
    if (spec.pct?.includes(key)) return percent(v);
    return Math.round(v).toLocaleString('en-US');
  });
}
