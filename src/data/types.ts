// Shared primitive types for content tables and game state (docs/DATA_MODEL.md §1).

export type Id = string;
export type Money = number;
/** Decimal annual rate: 0.0325 = 3.25%. */
export type Rate = number;
/** Weeks since game start (0-based). */
export type Week = number;
/** 1.0–5.0 */
export type Stars = number;
/** 0–100 (skill, morale, health). */
export type Score = number;
/** 0–1 */
export type Pct = number;
export type CountryId = 'CA' | 'US' | 'UK' | 'EA' | 'CH' | 'JP' | 'AU' | 'SG' | 'HK' | 'RU';
export type SegmentId = 'STU' | 'YP' | 'FAM' | 'RET' | 'BIZ';
export type SegmentMix = Record<SegmentId, number>;
export type CategoryId = 'deposits' | 'lending' | 'cards';
export type DistrictId =
  'financial' | 'downtown' | 'midtown' | 'university' | 'suburbs' | 'industrial' | 'waterfront';
export type DeptId =
  | 'finance'
  | 'hr'
  | 'products'
  | 'treasury'
  | 'marketing'
  | 'it'
  | 'risk'
  | 'executive'
  | 'investment';
/** Departments with staffing requirements and coverage effects. */
export type HqDeptId = 'finance' | 'hr' | 'products' | 'treasury' | 'marketing' | 'it' | 'risk';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type Phase = 'expansion' | 'slowdown' | 'recession' | 'recovery';
export type Tier = 'strong' | 'adequate' | 'watch' | 'restricted' | 'critical';
export type RatingCategory = 'rates' | 'products' | 'service' | 'branch';
/** Five scores, 1–10. Axis order is documented where each is used. */
export type Pentagon = [number, number, number, number, number];

export const SEGMENTS: readonly SegmentId[] = ['STU', 'YP', 'FAM', 'RET', 'BIZ'];
export const DISTRICTS: readonly DistrictId[] = [
  'financial',
  'downtown',
  'midtown',
  'university',
  'suburbs',
  'industrial',
  'waterfront',
];
