// Product development templates (docs/CONTENT.md §6). Each template names a
// base product and a set of modifiers; a finished development becomes a new
// catalog product built from PRODUCTS[base] plus these modifiers and the target
// tier (src/sim/products.ts). Digital templates have no base: they apply a
// one-time company effect instead and need an IT floor.
import type { SegmentId } from './types';

/** Modifiers a template applies on top of its base product. Absent = unchanged. */
export interface TemplateMods {
  /** Added to the base affinity per segment (CONTENT §4). */
  affinity?: Partial<Record<SegmentId, number>>;
  /** × base PD. */
  pdMult?: number;
  /** × annual churn. */
  churnMult?: number;
  /** × ticket (seats per plan sign-up, or monthly usage for API products). */
  ticketMult?: number;
  /** × credit limit, which scales the drawn balance of revolving products. */
  limitMult?: number;
  /** Added to base approval. */
  approvalAdd?: number;
  /** × take-up probability q (SIMULATION §9.6). */
  takeUpMult?: number;
  /** × compute cost per unit used (usage products). */
  unitCostMult?: number;
  /** × card spend per month (interchange). */
  spendMult?: number;
  /** Card annual fee in $. */
  annualFee?: number;
  /** Added to the interchange rate on card spend. */
  interchangeAdd?: number;
  /** Added to the default rate (rate products), e.g. −0.001 = −0.10pp. */
  defaultRateAdd?: number;
  /** Replaces the default price (plans, API, apps). The market reference scales with it. */
  defaultFee?: number;
  tenor?: 'short' | 'long';
  /** Branch rating bump at branches that offer it ("reputation"). */
  reputation?: number;
  /** Products rating bump at branches that offer it. */
  productsBump?: number;
  /** Wealth products that work without advisor offices. */
  noAdvisorOffice?: boolean;
}

export interface DigitalEffect {
  /** One-time app rating gain (SIMULATION §16.9 digitalProjectBonus). */
  appRating?: number;
  /** Added to the house model's Speed (1–10). */
  modelSpeed?: number;
}

export interface DevTemplate {
  id: string;
  name: string;
  /** Base product id in PRODUCTS; absent for digital projects. */
  base?: string;
  mods: TemplateMods;
  digital?: DigitalEffect;
  /** Not offered on the New product form any more; kept so old saves' products still work. */
  retired?: boolean;
}

export const DEV_TEMPLATES: Record<string, DevTemplate> = {
  // ─── Plans ──────────────────────────────────────────────────────────────────
  student_plus: {
    id: 'student_plus',
    name: 'Student Plus',
    base: 'plus',
    mods: { affinity: { STU: 0.15 }, defaultFee: 10 },
  },
  // Retired 2026-10-30 (owner's review, B6): the Researcher, Family and Carbon-Neutral
  // plans were bank-era segment variants of Plus; the last duplicated the Green
  // Compute Pledge campaign. Old saves keep the products they developed.
  golden_years: {
    id: 'golden_years',
    // Keeps its bank-era id; the RET segment is now Researchers.
    name: 'Researcher Plan',
    retired: true,
    base: 'plus',
    mods: { affinity: { RET: 0.15 }, defaultFee: 12 },
  },
  family_plan: {
    id: 'family_plan',
    name: 'Family Plan',
    retired: true,
    base: 'plus',
    // Priced per seat; a family signs up four at once.
    mods: { affinity: { FAM: 0.15 }, ticketMult: 4, defaultFee: 12 },
  },
  plus_annual: {
    id: 'plus_annual',
    name: 'Plus Annual',
    base: 'plus',
    mods: { churnMult: 0.5, takeUpMult: 0.85 },
  },
  carbon_neutral: {
    id: 'carbon_neutral',
    name: 'Carbon-Neutral Plan',
    retired: true,
    base: 'plus',
    mods: { reputation: 0.05, affinity: { YP: 0.05 } },
  },
  max_plan: {
    id: 'max_plan',
    name: 'Max',
    base: 'pro',
    mods: { defaultFee: 200, productsBump: 0.1, affinity: { YP: 0.05, BIZ: 0.05 } },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    base: 'team',
    // Big contracts: many seats a sign-up, but far fewer prospects sign (polish pass).
    mods: {
      affinity: { BIZ: 0.2 },
      ticketMult: 5,
      churnMult: 0.6,
      defaultFee: 45,
      takeUpMult: 0.2,
    },
  },
  // ─── API ────────────────────────────────────────────────────────────────────
  realtime_api: {
    id: 'realtime_api',
    name: 'Realtime API',
    base: 'api',
    mods: { defaultFee: 6, takeUpMult: 1.1, affinity: { YP: 0.05, BIZ: 0.05 } },
  },
  dedicated_capacity: {
    id: 'dedicated_capacity',
    name: 'Dedicated Capacity',
    base: 'api',
    mods: { affinity: { BIZ: 0.2 }, ticketMult: 4, churnMult: 0.5, takeUpMult: 0.3 },
  },
  research_credits: {
    id: 'research_credits',
    name: 'Research Credits',
    base: 'api',
    mods: { affinity: { STU: 0.15 }, defaultFee: 1.5 },
  },
  embeddings_api: {
    id: 'embeddings_api',
    name: 'Embeddings API',
    base: 'batch_api',
    // Embeddings are cheap to serve, so the low price keeps a margin.
    mods: { defaultFee: 0.5, ticketMult: 3, unitCostMult: 0.2 },
  },
  // ─── Apps & Services ────────────────────────────────────────────────────────
  study_buddy: {
    id: 'study_buddy',
    name: 'Study Buddy',
    base: 'creative_suite',
    mods: { affinity: { STU: 0.2 }, defaultFee: 8 },
  },
  voice_companion: {
    id: 'voice_companion',
    name: 'Voice Companion',
    base: 'creative_suite',
    mods: { affinity: { RET: 0.1, FAM: 0.1 }, takeUpMult: 1.15 },
  },
  contract_copilot: {
    id: 'contract_copilot',
    name: 'Contract Copilot',
    base: 'agent_studio',
    mods: { affinity: { BIZ: 0.15 }, defaultFee: 149, reputation: 0.05 },
  },
  mobile_app_v2: {
    id: 'mobile_app_v2',
    name: 'Mobile App 2.0',
    mods: {},
    digital: { appRating: 0.3 },
  },
  instant_decisions: {
    id: 'instant_decisions',
    name: 'Fast Inference',
    mods: {},
    digital: { modelSpeed: 2 },
  },
  model_playground: {
    id: 'model_playground',
    name: 'Model Playground',
    mods: {},
    digital: { appRating: 0.1 },
  },
  usage_dashboard: {
    id: 'usage_dashboard',
    name: 'Usage Dashboard',
    mods: {},
    digital: { appRating: 0.1 },
  },
  status_page: {
    id: 'status_page',
    name: 'Status Page',
    mods: {},
    digital: { appRating: 0.05 },
  },
  prompt_library: {
    id: 'prompt_library',
    name: 'Prompt Library',
    mods: {},
    digital: { appRating: 0.1 },
  },
  sso_audit: {
    id: 'sso_audit',
    name: 'SSO & Audit Logs',
    mods: {},
    digital: { appRating: 0.1 },
  },
  developer_console: {
    id: 'developer_console',
    name: 'Developer Console',
    mods: {},
    digital: { appRating: 0.15 },
  },
  agent_marketplace: {
    id: 'agent_marketplace',
    name: 'Agent Marketplace',
    mods: {},
    digital: { appRating: 0.1 },
  },
  streaming_runtime: {
    id: 'streaming_runtime',
    name: 'Streaming Runtime',
    mods: {},
    digital: { modelSpeed: 1 },
  },
};

/** Templates on offer (retired ones stay in DEV_TEMPLATES for old saves). */
export const DEV_TEMPLATE_IDS = Object.keys(DEV_TEMPLATES).filter(
  (id) => !DEV_TEMPLATES[id]!.retired,
);

export const isDigital = (t: DevTemplate) => t.digital !== undefined;
