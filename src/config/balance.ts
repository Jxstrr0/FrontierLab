// Every tuning constant for Vault Street lives here (CLAUDE.md non-negotiable 5).
// Names match the CAPS names used in docs/SIMULATION.md §26. Stage 0 only holds
// the feature flags; the simulation constants arrive with Stage 1.

/**
 * Feature flags, one per ROADMAP stage. A stage's systems stay switched off on
 * `main` until they are fully wired, so the live site is always shippable.
 */
export const FEATURES = {
  /** Stage 1: headless simulation core. */
  simulation: false,
  /** Stage 2: playable founder loop in plain UI (enables New Game / Continue). */
  playableLoop: false,
  /** Stage 3: engraved isometric city map. */
  cityMap: false,
  /** Stage 4: HQ offices, departments and operations depth. */
  hq: false,
  /** Stage 5: rival AI, macro for every country, The Daily Ledger, incidents. */
  competition: false,
  /** Stage 6: governance, executives and capital markets. */
  capitalMarkets: false,
  /** Stage 7: ventures, conventions and real estate. */
  investments: false,
  /** Stage 8: every city, airports and travel. */
  multiCity: false,
  /** Stage 9: personal wealth, homes, cars, auctions, franchise. */
  personalEmpire: false,
  /** Stage 10: art pass, tutorial, sound, PWA. */
  polish: false,
} as const;

export type FeatureId = keyof typeof FEATURES;
