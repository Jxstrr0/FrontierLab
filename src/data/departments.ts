// HQ departments (docs/CONTENT.md §9): names, descriptions, desks and market
// salaries. Requirement formulas live in balance.ts (DEPT_REQUIREMENTS); the
// effects of a shortfall are wired in src/sim/hq.ts and the systems they touch.
import type { FeatureId } from '../config/balance';
import type { DeptId, HqDeptId } from './types';

export interface DepartmentSpec {
  id: DeptId;
  name: string;
  /** One line for the Add floor sheet and the office listing. */
  description: string;
  /** Annual market salary before city.wageIndex. */
  marketSalary: number;
  /** Fixed desks for special floors; otherwise the building's desks per floor. */
  fixedDesks?: number;
  /** The stage that makes this floor available. */
  feature: FeatureId;
}

export const DEPARTMENTS: Record<DeptId, DepartmentSpec> = {
  finance: {
    id: 'finance',
    name: 'Finance',
    description: 'Company statements on time, capital and liquidity reporting.',
    marketSalary: 82_000,
    feature: 'hq',
  },
  hr: {
    id: 'hr',
    name: 'HR',
    description: 'Hiring speed and morale for every sales office and floor; staff benefits.',
    marketSalary: 68_000,
    feature: 'hq',
  },
  products: {
    id: 'products',
    name: 'Products',
    description: 'House underwriting models, the company lineup and product development.',
    marketSalary: 90_000,
    feature: 'hq',
  },
  treasury: {
    id: 'treasury',
    name: 'Treasury',
    description: 'Liquidity policy, the lending fund and the wholesale funding market.',
    marketSalary: 95_000,
    feature: 'hq',
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing',
    description: 'Brand campaigns by city or country; boosts every campaign you run.',
    marketSalary: 72_000,
    feature: 'hq',
  },
  it: {
    id: 'it',
    name: 'Platform & Security',
    description: 'Your app rating, platform projects and security.',
    marketSalary: 98_000,
    feature: 'hq',
  },
  risk: {
    id: 'risk',
    name: 'Safety & Alignment',
    description: 'Safety reviews with the regulator, loss tracking and sharper loan estimates.',
    marketSalary: 88_000,
    feature: 'hq',
  },
  executive: {
    id: 'executive',
    name: 'Executive',
    description: 'Senior executives and the quarterly board meeting.',
    marketSalary: 0,
    fixedDesks: 8,
    feature: 'capitalMarkets',
  },
  investment: {
    id: 'investment',
    name: 'Investment',
    description: 'Stocks, ventures and venture debt.',
    marketSalary: 120_000,
    fixedDesks: 32,
    feature: 'investments',
  },
};

/** Floor order in the HQ tab bar (SCREENS §10). */
export const DEPT_ORDER: readonly DeptId[] = [
  'finance',
  'hr',
  'products',
  'treasury',
  'marketing',
  'it',
  'risk',
  'executive',
  'investment',
];

/** Departments with requirements and coverage (everything but Executive and Investment). */
export const HQ_DEPTS: readonly HqDeptId[] = [
  'finance',
  'hr',
  'products',
  'treasury',
  'marketing',
  'it',
  'risk',
];
