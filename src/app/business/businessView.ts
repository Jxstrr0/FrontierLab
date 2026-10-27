// Display helpers for customer businesses (stage C5a, SCREENS §14b): who serves
// a business, in whose ink, and the labels for its size and pentagon. Read-only
// views of GameState.
import { rivalShortName } from '../map/markers';
import type { Business, GameState } from '../../sim/state';

/** Pentagon axis names, in stored order. */
export const BUSINESS_AXES = [
  'AI readiness',
  'Budget',
  'Data sensitivity',
  'Switching cost',
  'Financial health',
] as const;

export const SIZE_LABEL: Record<Business['size'], string> = {
  small: 'Small business',
  mid: 'Mid-size company',
  large: 'Large company',
  anchor: 'Anchor account',
};

/** The vendor's ink: your brand ink, the rival's ink, or undefined with no vendor. */
export function vendorInk(s: GameState, b: Business | undefined): string | undefined {
  if (!b?.vendor) return undefined;
  if (b.vendor.type === 'player') return s.meta.brandInk;
  return s.rivals[b.vendor.id]?.ink;
}

/** "Your lab", the rival's name, or "No AI vendor yet". */
export function vendorName(s: GameState, b: Business): string {
  if (!b.vendor) return 'No AI vendor yet';
  if (b.vendor.type === 'player') return s.meta.bankName;
  return s.rivals[b.vendor.id]?.name ?? 'A rival lab';
}

/** The pin caption: the rival's short name, or nothing (yours wear a seal; open ones the type's caption). */
export function vendorCaption(s: GameState, b: Business): string | undefined {
  if (b.vendor?.type !== 'rival') return undefined;
  return rivalShortName(s.rivals[b.vendor.id]?.name ?? 'Rival lab');
}
