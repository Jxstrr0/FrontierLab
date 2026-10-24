// Every command returns { ok: true } or { ok: false, reason } (DATA_MODEL §11).
// The UI shows `reason` verbatim, so write it as a plain sentence.

export type CommandResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; reason: string };

export const ok = <T extends object>(extra?: T): { ok: true } & T => ({
  ok: true,
  ...(extra ?? ({} as T)),
});
export const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason });

/** Plain money text for reasons, e.g. "$332,000". */
export const money = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;
