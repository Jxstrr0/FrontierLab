// Every command returns { ok: true } or { ok: false, reason } (DATA_MODEL §11).
// The UI shows `reason` verbatim, so write it as a plain sentence.
import { toCurrency } from '../../data/settingsOptions';

export type CommandResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; reason: string };

export const ok = <T extends object>(extra?: T): { ok: true } & T => ({
  ok: true,
  ...(extra ?? ({} as T)),
});
export const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason });

/**
 * Plain money text for reasons in the player's chosen currency, e.g. "$332,000"
 * or "£265,600" (the setting's fixed rate, like the app's moneyFull).
 */
export const money = (state: { settings?: { currency?: string } }, x: number) => {
  const symbol = state.settings?.currency ?? '$';
  const v = Math.round(toCurrency(x, symbol));
  return `${v < 0 ? '−' : ''}${symbol}${Math.abs(v).toLocaleString('en-US')}`;
};
