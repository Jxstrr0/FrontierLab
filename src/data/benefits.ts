// HR benefits (docs/CONTENT.md §10). Each has a control (amount per employee,
// a % of salary, a discount or on/off), a weekly cost rule and effects stated
// at a reference amount. Effects scale linearly up to `ref`, then flatten
// (half slope) to at most BENEFIT_CAP × the stated effect. Rules marked
// "explicit" in the effect list have their own scaling from CONTENT.

export type BenefitControl = 'perYear' | 'perWeek' | 'pctSalary' | 'discount' | 'toggle';

export interface BenefitEffects {
  /** Morale points for every employee (or HQ only, see hqOnly). */
  morale?: number;
  /** Hiring attraction points (+1 = +1% attraction). */
  attraction?: number;
  /** Share of quits avoided (0.1 = 10% fewer quits). */
  retention?: number;
  /** Reputation (Branch rating) added at every branch. */
  reputation?: number;
}

export interface BenefitSpec {
  id: string;
  name: string;
  description: string;
  control: BenefitControl;
  min: number;
  max: number;
  step: number;
  /** Amount at which `effects` apply in full. */
  ref: number;
  effects: BenefitEffects;
  /** Only staff at HQ feel it. */
  hqOnly?: boolean;
  /** Only once the bank is listed (Stage 6). */
  publicOnly?: boolean;
}

export const BENEFITS: Record<string, BenefitSpec> = {
  tuition: {
    id: 'tuition',
    name: 'Tuition Support',
    description: 'Courses and certifications paid for. Skills grow faster.',
    control: 'perYear',
    min: 0,
    max: 15_000,
    step: 1_000,
    ref: 8_000,
    // Explicit: skill growth +3% per $1k (max +40%); attraction +2 at ≥ $8k.
    effects: {},
  },
  pension: {
    id: 'pension',
    name: 'Pension Match',
    description: 'Matched retirement savings, as a share of salary.',
    control: 'pctSalary',
    min: 0,
    max: 0.08,
    step: 0.005,
    ref: 0.08,
    // Explicit: retention +5% per point (max 30%); morale +1 per 2 points.
    effects: {},
  },
  espp: {
    id: 'espp',
    name: 'Employee Stock Plan',
    description: 'Staff buy shares at a discount. Available once you are listed.',
    control: 'discount',
    min: 0,
    max: 0.15,
    step: 0.01,
    ref: 0.1,
    effects: { morale: 2 },
    publicOnly: true,
  },
  childcare: {
    id: 'childcare',
    name: 'Childcare Support',
    description: 'Help with daycare costs for working parents.',
    control: 'perYear',
    min: 0,
    max: 10_000,
    step: 500,
    ref: 6_000,
    effects: { morale: 3, retention: 0.1 },
  },
  lunch: {
    id: 'lunch',
    name: 'Free Lunch & Snacks',
    description: 'A stocked kitchen at every branch and floor.',
    control: 'perWeek',
    min: 0,
    max: 100,
    step: 5,
    ref: 60,
    effects: { morale: 4 },
  },
  volunteer: {
    id: 'volunteer',
    name: 'Volunteer Days',
    description: 'Paid days helping local causes. Neighbours notice.',
    control: 'perWeek',
    min: 0,
    max: 150,
    step: 10,
    ref: 100,
    effects: { morale: 3, reputation: 0.05 },
  },
  mortgage_disc: {
    id: 'mortgage_disc',
    name: 'Staff Mortgage Discount',
    description: 'Cheaper home loans for your own people.',
    control: 'discount',
    min: 0,
    max: 0.02,
    step: 0.0025,
    ref: 0.01,
    effects: { morale: 3, attraction: 3 },
  },
  wellness: {
    id: 'wellness',
    name: 'Wellness Program',
    description: 'Gym passes, counselling and health checks.',
    control: 'perYear',
    min: 0,
    max: 2_500,
    step: 250,
    ref: 1_500,
    effects: { morale: 2, retention: 0.15 },
  },
  remote_fri: {
    id: 'remote_fri',
    name: 'Remote Fridays',
    description: 'HQ staff work from home on Fridays. A little less gets done.',
    control: 'toggle',
    min: 0,
    max: 1,
    step: 1,
    ref: 1,
    effects: { morale: 3 },
    hqOnly: true,
  },
};

export const BENEFIT_ORDER: readonly string[] = Object.keys(BENEFITS);

/** Explicit benefit rules from CONTENT §10. */
export const BENEFIT_RULES = {
  tuitionSkillPer1k: 0.03,
  tuitionSkillMax: 0.4,
  tuitionAttractionAt: 8_000,
  tuitionAttraction: 2,
  pensionRetentionPerPt: 0.05,
  pensionRetentionMax: 0.3,
  pensionMoralePer2Pts: 1,
  /** Staff mortgage: employees × share with a mortgage × ticket × discount per year. */
  mortgageShare: 0.3,
  mortgageTicket: 340_000,
  esppPayrollCost: 0.5,
  /** Executive loyalty bonus while the Employee Stock Plan runs (public only, CONTENT §10). */
  esppLoyalty: 5,
} as const;
