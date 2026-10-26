// Toasts for M&A events (SIMULATION §19.8): the answer to your offer arrives
// at the next weekly tick, so say it out loud. Spread into loop.ts EVENT_TEXT.
const name = (p: Record<string, unknown>) => String(p.bank ?? 'The lab');

export const MNA_EVENT_TEXT: Record<string, (p: Record<string, unknown>) => string> = {
  ACQUISITION_CLOSED: (p) => `Deal closed: ${name(p)} is yours. Its branches start converting.`,
  MERGER_REJECTED: (p) => `${name(p)} turned down your offer.`,
  MERGER_BLOCKED: (p) => `The regulator blocked your offer for ${name(p)}.`,
  MERGER_LAPSED: (p) => `Your deal for ${name(p)} fell through. ${String(p.reason ?? '')}`.trim(),
  CONVERSION_DONE: (p) => `The former ${name(p)} branches now carry your name.`,
};

/** Events that read as bad news. */
export const MNA_BAD_EVENTS = ['MERGER_BLOCKED', 'MERGER_LAPSED'];
