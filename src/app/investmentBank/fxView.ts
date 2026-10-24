// Read-only views for the Currencies list (SIMULATION §19.10): each foreign
// currency's rate against your home currency, its change, what's driving it
// and your positions.
import { WEEKS_PER_YEAR } from '../../config/balance';
import { COUNTRIES } from '../../data/countries';
import { CURRENCIES } from '../../data/currencies';
import type { CountryId } from '../../data/types';
import { fxRate, homeCurrency } from '../../sim/fx';
import type { GameState } from '../../sim/state';

export interface CurrencyView {
  country: CountryId;
  code: string;
  name: string;
  countryName: string;
  rate: number;
  history: number[];
  /** Change over the last year (or since the start). */
  change: number;
  /** One-line "why it's moving": growth, rate and cycle. */
  drivers: string;
  pegged?: string;
  company: number;
  personal: number;
}

const PHASE_WORD = {
  expansion: 'expanding',
  slowdown: 'slowing',
  recession: 'in recession',
  recovery: 'recovering',
} as const;

export function currencyViews(s: GameState): CurrencyView[] {
  const home = homeCurrency(s);
  const out: CurrencyView[] = [];
  for (const spec of Object.values(CURRENCIES)) {
    if (spec.country === home) continue;
    const c = s.world.countries[spec.country];
    const history = s.fx.history[spec.country] ?? [];
    const recent = history.slice(-(WEEKS_PER_YEAR + 1));
    const rate = fxRate(s, spec.country);
    const first = recent[0] ?? rate;
    const value = (account: 'company' | 'personal') =>
      (s.fx.positions[account][spec.country]?.units ?? 0) * rate;
    out.push({
      country: spec.country,
      code: spec.code,
      name: spec.name,
      countryName: COUNTRIES[spec.country].name,
      rate,
      history,
      change: first > 0 ? rate / first - 1 : 0,
      drivers: c
        ? `Growth ${c.gdp.toFixed(1)}% · rate ${(c.policyRate * 100).toFixed(2)}% · ${PHASE_WORD[c.phase]}`
        : '',
      pegged: spec.peggedTo ? CURRENCIES[spec.peggedTo].name : undefined,
      company: value('company'),
      personal: value('personal'),
    });
  }
  return out;
}
