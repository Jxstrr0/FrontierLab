// The product resolver (SIMULATION §16.6): base products come from
// src/data/products.ts; developed products are catalog entries whose spec is
// built from their base product plus the template and tier modifiers. Every sim
// system reads products through here, so a developed product flows through
// demand, books, ratings and the P&L like any other.
import { DEV_TIER, INTERCHANGE } from '../config/balance';
import { DEV_TEMPLATES, type DigitalEffect, type TemplateMods } from '../data/devTemplates';
import { PRODUCTS, type DefaultRule, type ProductSpec } from '../data/products';
import { AFFINITY } from '../data/segments';
import { SEGMENTS, type SegmentId } from '../data/types';
import { clamp } from './math';
import type { DevTier, GameState, ProductEntry } from './state';

/** The v1 catalog in data order. */
export const BASE_PRODUCTS: readonly ProductSpec[] = Object.values(PRODUCTS);

/** The base product id: itself for v1 products, the base for developed ones. */
export const baseId = (spec: ProductSpec): string => spec.base ?? spec.id;

/** Default price rule with the template's adjustment and the tier rule (DEV_TIER). */
function devDefaultRule(base: ProductSpec, m: TemplateMods, tier: DevTier): DefaultRule {
  const rule = base.defaultRule;
  const rateAdd = (m.defaultRateAdd ?? 0) + DEV_TIER.rateAdd[tier];
  switch (rule.base) {
    case 'ftpShort':
    case 'ftpLong':
      return { ...rule, spread: rule.spread + rateAdd };
    case 'fixed':
      return { base: 'fixed', value: (m.defaultFee ?? rule.value) * DEV_TIER.feeMult[tier] };
  }
}

function devAffinity(baseProductId: string, m: TemplateMods): Record<SegmentId, number> {
  const out = { ...(AFFINITY[baseProductId] ?? { STU: 0, YP: 0, FAM: 0, RET: 0, BIZ: 0 }) };
  for (const s of SEGMENTS) out[s] = clamp(out[s] + (m.affinity?.[s] ?? 0), 0, 1);
  return out;
}

/** Builds the full spec of a developed catalog entry, or undefined if its data is missing. */
export function developedSpec(entry: ProductEntry): ProductSpec | undefined {
  const base = entry.base ? PRODUCTS[entry.base] : undefined;
  const template = entry.templateId ? DEV_TEMPLATES[entry.templateId] : undefined;
  if (!base || !template) return undefined;
  const m = template.mods;
  const tier = entry.tier ?? 'medium';
  const spec: ProductSpec = {
    ...base,
    id: entry.id,
    name: entry.name ?? template.name,
    base: base.id,
    tenor: m.tenor ?? base.tenor,
    defaultRule: devDefaultRule(base, m, tier),
    ticket: base.ticket * (m.ticketMult ?? 1) * (m.limitMult ?? 1),
    churn: base.churn * (m.churnMult ?? 1),
    startStars: entry.stars,
    affinity: devAffinity(base.id, m),
    takeUpMult: m.takeUpMult ?? 1,
    branchBump: m.reputation ?? 0,
    productsBump: (m.productsBump ?? 0) + DEV_TIER.productsBump[tier],
  };
  if (base.basePd !== undefined) spec.basePd = base.basePd * (m.pdMult ?? 1);
  if (base.baseApproval !== undefined)
    spec.baseApproval = clamp(base.baseApproval + (m.approvalAdd ?? 0), 0, 1);
  if (base.spendPerMonth !== undefined)
    spec.spendPerMonth = base.spendPerMonth * (m.spendMult ?? 1);
  if (base.unitCost !== undefined) spec.unitCost = base.unitCost * (m.unitCostMult ?? 1);
  if (m.annualFee !== undefined) spec.annualFee = m.annualFee;
  if (m.interchangeAdd !== undefined) spec.interchange = INTERCHANGE + m.interchangeAdd;
  if (m.noAdvisorOffice) spec.noAdvisorOffice = true;
  // A template that sets its own fee competes against that kind of product, so
  // its market reference scales with the fee (DESIGN §7 decision log).
  if (m.defaultFee !== undefined && base.defaultRule.base === 'fixed' && base.defaultRule.value > 0)
    spec.refMult = m.defaultFee / base.defaultRule.value;
  return spec;
}

/** Developed catalog entries in creation order. */
export function developedEntries(state: GameState): ProductEntry[] {
  return Object.values(state.products.catalog).filter((e) => e.developed);
}

/** Every product: the v1 catalog in data order, then developed products in creation order. */
export function allProducts(state: GameState): readonly ProductSpec[] {
  const dev = developedEntries(state);
  if (dev.length === 0) return BASE_PRODUCTS;
  const out = [...BASE_PRODUCTS];
  for (const e of dev) {
    const spec = developedSpec(e);
    if (spec) out.push(spec);
  }
  return out;
}

/** The spec for any product id, base or developed; undefined if unknown. */
export function productSpec(state: GameState, id: string): ProductSpec | undefined {
  const base = PRODUCTS[id];
  if (base) return base;
  const entry = state.products.catalog[id];
  return entry?.developed ? developedSpec(entry) : undefined;
}

/** Affinity per segment for a product (CONTENT §4 plus template bumps). */
export function affinityOf(spec: ProductSpec): Record<SegmentId, number> | undefined {
  return spec.affinity ?? AFFINITY[spec.id];
}

/** Quality stars of a product from the catalog. */
export function starsOf(state: GameState, spec: ProductSpec): number {
  return state.products.catalog[spec.id]?.stars ?? spec.startStars;
}

/** Total of a digital effect over completed digital projects (CONTENT §6). */
export function digitalBonus(state: GameState, effect: keyof DigitalEffect): number {
  let total = 0;
  for (const id of state.products.digitalDone ?? [])
    total += DEV_TEMPLATES[id]?.digital?.[effect] ?? 0;
  return total;
}
