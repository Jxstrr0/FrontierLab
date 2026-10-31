// Per-incident numbers for the veteran's desk (CONTENT §22c): costs before the
// lab-size scale, effect sizes and durations. Merged into INCIDENT_PARAMS.

export const VETERAN_PARAMS = {
  HEARING_SUMMONS: {
    prepCost: 60_000,
    awareness: 0.05,
    gaffeChance: 0.2,
    gaffeOverall: -0.15,
    gaffeWeeks: 8,
    declineOverall: -0.2,
    declineWeeks: 12,
  },
  OPEN_LETTER: {
    signCoverage: 0.1,
    signCoverageWeeks: 26,
    signProducts: -0.1,
    signProductsWeeks: 12,
    ignoreOverall: -0.1,
    ignoreWeeks: 12,
  },
  SENTIENCE_CLAIM: {
    studyCost: 80_000,
    leaveMorale: -8,
    talkAwareness: 0.06,
    talkOverall: -0.1,
    talkWeeks: 8,
  },
  DOCUMENTARY: { awareness: 0.1, unkindChance: 0.3, unkindOverall: -0.15, unkindWeeks: 12 },
  REUNION: { partyCost: 30_000, morale: 10 },
  SAFETY_AUDIT_ASK: {
    auditCost: 120_000,
    product: 'api',
    auditTakeup: 1.15,
    auditWeeks: 26,
    refuseTakeup: 0.85,
    refuseWeeks: 12,
  },
} as const;
