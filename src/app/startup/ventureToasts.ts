// Toasts for ventures and conventions (SIMULATION §20, CONTENT §19): news
// about startups you back, and conventions coming to the city you're in.
// Spread into loop.ts EVENT_TEXT; an empty string means no toast.
const name = (p: Record<string, unknown>) => String(p.name ?? 'A startup');
const held = (p: Record<string, unknown>) => p.held === true;

export const VENTURE_EVENT_TEXT: Record<string, (p: Record<string, unknown>) => string> = {
  VENTURE_ROUND: (p) =>
    held(p)
      ? `${name(p)} is raising a ${String(p.round)}${p.down === true ? ' at a lower price' : ''}.`
      : '',
  VENTURE_FAILED: (p) => (held(p) ? `${name(p)} has failed. Its shares are written off.` : ''),
  VENTURE_ACQUIRED: (p) => (held(p) ? `${name(p)} was sold. Your stake is paid out in cash.` : ''),
  VENTURE_IPO: (p) =>
    held(p) ? `${name(p)} listed as ${String(p.ticker)}. Your stake is now listed shares.` : '',
  CONVENTION_ANNOUNCED: (p) =>
    p.local === true ? `${String(p.name)} opens in ${String(p.city)} in two weeks.` : '',
  CONVENTION_OPEN: (p) =>
    p.local === true ? `${String(p.name)} is open: visit the conference.` : '',
};

/** Events that read as bad news. */
export const VENTURE_BAD_EVENTS = ['VENTURE_FAILED'];
