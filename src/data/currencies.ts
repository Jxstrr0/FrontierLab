// Currencies (SIMULATION §19.10): one per country, traded as a simple
// "country up or down" investment at investment banks. Volatility is the
// weekly noise of its strength index (FX_VOL in balance.ts scales it).
import type { CountryId } from './types';

export interface CurrencySpec {
  country: CountryId;
  code: string;
  name: string;
  /** Weekly standard deviation of the strength index. */
  vol: number;
  /** Pegged currencies copy another country's index (HK → US). */
  peggedTo?: CountryId;
}

export const CURRENCIES: Record<CountryId, CurrencySpec> = {
  CA: { country: 'CA', code: 'CAD', name: 'Canadian dollar', vol: 0.006 },
  US: { country: 'US', code: 'USD', name: 'US dollar', vol: 0.005 },
  UK: { country: 'UK', code: 'GBP', name: 'Pound sterling', vol: 0.007 },
  EA: { country: 'EA', code: 'EUR', name: 'Euro', vol: 0.006 },
  CH: { country: 'CH', code: 'CHF', name: 'Swiss franc', vol: 0.005 },
  JP: { country: 'JP', code: 'JPY', name: 'Japanese yen', vol: 0.008 },
  AU: { country: 'AU', code: 'AUD', name: 'Australian dollar', vol: 0.009 },
  SG: { country: 'SG', code: 'SGD', name: 'Singapore dollar', vol: 0.004 },
  HK: { country: 'HK', code: 'HKD', name: 'Hong Kong dollar', vol: 0.005, peggedTo: 'US' },
  RU: { country: 'RU', code: 'RUB', name: 'Russian ruble', vol: 0.012 },
};
