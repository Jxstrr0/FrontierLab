// Per-incident numbers (CONTENT §22): probabilities' multipliers, rolled ranges,
// option costs, effect sizes and durations. The catalog is incidents.ts.

/** Per-incident numbers (CONTENT §22). Probabilities are weekly. */
export const INCIDENT_PARAMS = {
  ROBBERY: {
    securityRef: 6,
    securityDiv: 3,
    loss: [20_000, 150_000] as [number, number],
    insured: 0.8,
    upgradeShare: 0.5,
    upgradeMorale: 5,
    leavePerStaff: 2_000,
    leaveMorale: 10,
    usualMorale: -15,
    usualBranch: -0.3,
    usualWeeks: 8,
  },
  ATM_SKIM: {
    shieldBase: 1.3,
    refund: [5_000, 40_000] as [number, number],
    firmwareCost: 15_000,
    firmwarePMult: 0.5,
    firmwareWeeks: 26,
    denyService: -0.4,
    denyWeeks: 8,
    denyNews: 0.3,
  },
  DATA_BREACH: {
    itSlope: 2,
    ctoBase: 1.2,
    affectedShare: [0.05, 0.3] as [number, number],
    minAffected: 100,
    notifyPerCustomer: 15,
    notifyOverall: -0.1,
    notifyWeeks: 4,
    quietDiscover: 0.4,
    quietFineShare: 0.02,
    quietOverall: -0.4,
    quietWeeks: 12,
    forensicCost: 500_000,
    forensicPMult: 0.5,
    forensicWeeks: 52,
  },
  MIS_SELLING: {
    ethicsBase: 1.6,
    appetiteFrom: 4,
    appetiteMult: 1.5,
    /** Refunds: this share of the sales office's ARR (C8f; was a share of deposits). */
    compShare: 0.02,
    denyFineChance: 0.4,
    denyFineMult: 5,
  },
  REGULATOR_AUDIT: {
    appealWin: 0.5,
    appealLoseMult: 1.5,
    consultantShare: 0.5,
    consultantCoverage: 0.2,
    consultantWeeks: 26,
  },
  VIRAL_COMPLAINT: {
    maxService: 2.5,
    apologyCost: 10_000,
    apologyService: 0.2,
    apologyWeeks: 8,
    ignoreAwareness: 0.05,
    ignoreNews: 0.3,
  },
  BRANCH_FLOOD: {
    waterfrontMult: 3,
    fastCost: 80_000,
    fastWeeks: 1,
    slowCost: 30_000,
    slowWeeks: 4,
  },
  CARD_FRAUD: {
    /** The base product whose ARR the ring abuses (C3a: the API). */
    product: 'api',
    shieldBase: 1.3,
    lossShare: 0.02,
    takeupMult: 0.5,
    takeupWeeks: 4,
  },
  STAFF_WALKOUT: {
    maxMorale: 25,
    wageRaise: 0.1,
    /** Weeks of the extra wages a manager counts when weighing the raise. */
    raiseHorizon: 26,
    bonusPerStaff: 1_000,
    bonusMorale: 20,
    waitWeeks: 1,
    waitMorale: 10,
  },
  PRICE_WAR: { matchCut: 0.1, matchWeeks: 26 },

  // ─── AI-native cases (2026-10-27; catalog in incidentsAi.ts) ────────────────
  JAILBREAK: {
    /** p × (safetyBase − model Safety axis/10): a safer model is jailbroken less. */
    safetyBase: 1.3,
    patchCost: 150_000,
    patchProducts: -0.2,
    patchWeeks: 4,
    /** Ignoring it: Safety coverage′ and the Overall rating take a hit, and the press may run it. */
    ignoreSafety: -0.15,
    ignoreSafetyWeeks: 12,
    ignoreOverall: -0.2,
    ignoreWeeks: 8,
    ignoreNews: 0.5,
    postMortemCost: 250_000,
    postMortemSafety: 0.1,
    postMortemWeeks: 26,
  },
  HALLUCINATION_SUIT: {
    /** p × (reasoningBase − model Reasoning axis/10). */
    reasoningBase: 1.3,
    /** Settlement: this share of company ARR, at least minSettle. */
    settleShare: 0.01,
    minSettle: 50_000,
    fightWin: 0.5,
    /** Losing in court costs loseMult × the settlement and dents the Overall rating. */
    loseMult: 2.5,
    loseOverall: -0.3,
    loseWeeks: 12,
    /** Disclaimers: a small Products dip that never expires (coded as a century of weeks). */
    disclaimerProducts: -0.1,
    disclaimerWeeks: 5_200,
  },
  COPYRIGHT_SUIT: {
    /** Licence fee per trained model generation. */
    licencePerModel: 400_000,
    /** Odds of winning: base + csoSlope × CSO expertise/100 + safetySlope × Safety coverage′. */
    fightBase: 0.25,
    fightCsoSlope: 0.35,
    fightSafetySlope: 0.3,
    /** Losing costs loseMult × the licence fee. */
    loseMult: 2,
    /** Retraining without the data: every trained model's Breadth axis. */
    breadthHit: 0.3,
  },
  WEIGHTS_LEAK: {
    /** Like DATA_BREACH: × (1 + itSlope(1 − Platform & Security coverage′)) × (ctoBase − CTO expertise/100). */
    itSlope: 2,
    ctoBase: 1.2,
    rotateCost: 300_000,
    /** Staying quiet: chance the leak surfaces later, and the Overall hit when it does. */
    quietExposed: 0.35,
    exposedOverall: -0.4,
    exposedWeeks: 12,
  },
  DEEPFAKE: {
    /** The plan whose misuse the story blames. */
    product: 'creative_suite',
    watermarkCost: 60_000,
    watermarkService: 0.1,
    watermarkWeeks: 8,
    pullWeeks: 8,
    statementAwareness: 0.05,
    statementNews: 0.4,
  },
  DC_FIRE: {
    /** Emergency repair per usable GPU in the hall. */
    repairPerGpu: 150,
    /** Otherwise this share of the hall's GPUs is out for derateWeeks. */
    derate: 0.3,
    derateWeeks: 12,
  },
  GRID_FAILURE: {
    /** Diesel backup per running GPU for the week. */
    dieselPerGpu: 25,
    /** Otherwise the lab is in outage (§13.0 churn, contract losses) for this many weeks. */
    outageWeeks: 1,
  },
} as const;
