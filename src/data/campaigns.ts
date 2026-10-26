// Branch marketing campaigns (docs/CONTENT.md §8). Weekly costs scale by
// city.costIndex; per-account costs don't.
import type { RatingCategory, SegmentId } from './types';

export type CampaignCost =
  | { type: 'weekly'; amount: number }
  | { type: 'perNewDepositAccount'; amount: number }
  | { type: 'perAccount'; amount: number };

export interface CampaignLevel {
  label: string;
  cost: CampaignCost;
  awareness?: number;
  bumps?: Partial<Record<RatingCategory, number>>;
  segments?: Partial<Record<SegmentId, number>>;
  capacity?: number;
  depositTakeUp?: number;
  /** Cohort churn multiplier applied for `weeks` (Sign-Up Bonus). */
  churn?: { mult: number; weeks: number };
  loanDesk?: number;
}

export interface CampaignSpec {
  id: string;
  name: string;
  effectHint: string;
  levels: CampaignLevel[];
}

const weekly = (amount: number): CampaignCost => ({ type: 'weekly', amount });

export const CAMPAIGNS: Record<string, CampaignSpec> = {
  lobby_coffee: {
    id: 'lobby_coffee',
    name: 'Free Lobby Coffee',
    effectHint: 'Branch rating + · Awareness +',
    levels: [
      { label: 'Drip', cost: weekly(120), bumps: { branch: 0.2 }, awareness: 0.004 },
      { label: 'Espresso bar', cost: weekly(260), bumps: { branch: 0.4 }, awareness: 0.008 },
    ],
  },
  charging: {
    id: 'charging',
    name: 'Charging Station',
    effectHint: 'Branch rating + · Young professionals +',
    levels: [{ label: 'On', cost: weekly(80), bumps: { branch: 0.1 }, segments: { YP: 1.05 } }],
  },
  saturday: {
    id: 'saturday',
    name: 'Saturday Hours',
    effectHint: 'Capacity + · Service +',
    levels: [
      {
        label: 'Mornings',
        cost: weekly(600),
        capacity: 1.1,
        bumps: { service: 0.15 },
        segments: { FAM: 1.05, YP: 1.05 },
      },
      {
        label: 'Full day',
        cost: weekly(1100),
        capacity: 1.2,
        bumps: { service: 0.3 },
        segments: { FAM: 1.1, YP: 1.1 },
      },
    ],
  },
  signup_bonus: {
    id: 'signup_bonus',
    name: 'Sign-Up Bonus',
    effectHint: 'New deposits ++ · Churn +',
    levels: [
      {
        label: '$50',
        cost: { type: 'perNewDepositAccount', amount: 50 },
        depositTakeUp: 1.15,
        churn: { mult: 1.15, weeks: 26 },
        bumps: { rates: 0.1 },
      },
      {
        label: '$150',
        cost: { type: 'perNewDepositAccount', amount: 150 },
        depositTakeUp: 1.3,
        churn: { mult: 1.3, weeks: 26 },
        bumps: { rates: 0.2 },
      },
      {
        label: '$300',
        cost: { type: 'perNewDepositAccount', amount: 300 },
        depositTakeUp: 1.5,
        churn: { mult: 1.45, weeks: 26 },
        bumps: { rates: 0.3 },
      },
    ],
  },
  paperless: {
    id: 'paperless',
    name: 'Paperless Pledge',
    effectHint: 'Products rating + · Students and young professionals +',
    levels: [
      {
        label: 'Half',
        cost: { type: 'perAccount', amount: 0.05 },
        bumps: { products: 0.1 },
        segments: { YP: 1.05, STU: 1.05 },
      },
      {
        label: 'Full',
        cost: { type: 'perAccount', amount: 0.1 },
        bumps: { products: 0.2 },
        segments: { YP: 1.1, STU: 1.1 },
      },
    ],
  },
  direct_mail: {
    id: 'direct_mail',
    name: 'Direct Mail',
    effectHint: 'Awareness + · Retirees and families +',
    levels: [
      { label: 'Light', cost: weekly(300), awareness: 0.01, segments: { RET: 1.08, FAM: 1.08 } },
      { label: 'Heavy', cost: weekly(700), awareness: 0.02, segments: { RET: 1.15, FAM: 1.15 } },
    ],
  },
  workshops: {
    id: 'workshops',
    name: 'Money Workshops',
    effectHint: 'Awareness + · Service +',
    levels: [
      {
        label: 'Monthly',
        cost: weekly(250),
        awareness: 0.006,
        segments: { STU: 1.08, YP: 1.08 },
        bumps: { service: 0.1 },
      },
      {
        label: 'Weekly',
        cost: weekly(600),
        awareness: 0.012,
        segments: { STU: 1.15, YP: 1.15 },
        bumps: { service: 0.1 },
      },
    ],
  },
  sponsors: {
    id: 'sponsors',
    name: 'Community Sponsors',
    effectHint: 'Awareness ++ · Branch rating + · Families and businesses +',
    levels: [
      {
        label: 'Modest',
        cost: weekly(300),
        awareness: 0.01,
        bumps: { branch: 0.05 },
        segments: { FAM: 1.1, BIZ: 1.08 },
      },
      {
        label: 'Generous',
        cost: weekly(800),
        awareness: 0.022,
        bumps: { branch: 0.1 },
        segments: { FAM: 1.1, BIZ: 1.15 },
      },
    ],
  },
  social: {
    id: 'social',
    name: 'Social Media',
    effectHint: 'Awareness ++ · Students and young professionals +',
    levels: [
      { label: 'Steady', cost: weekly(400), awareness: 0.012, segments: { STU: 1.1, YP: 1.1 } },
      { label: 'Viral push', cost: weekly(900), awareness: 0.026, segments: { STU: 1.2, YP: 1.2 } },
    ],
  },
  search: {
    id: 'search',
    name: 'Local Paid Search',
    effectHint: 'Awareness ++ · Loan Desk +',
    levels: [
      {
        label: 'Moderate',
        cost: weekly(450),
        awareness: 0.014,
        segments: { YP: 1.08, BIZ: 1.08 },
        loanDesk: 1.1,
      },
      {
        label: 'Aggressive',
        cost: weekly(1000),
        awareness: 0.03,
        segments: { YP: 1.15, BIZ: 1.15 },
        loanDesk: 1.2,
      },
    ],
  },
};

export const CAMPAIGN_IDS = Object.keys(CAMPAIGNS);
