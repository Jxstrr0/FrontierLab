// Save migration 13 → 14 (stage C6a): the underwriting model becomes the AI
// model. Cost per loan application becomes the data licence per customer a
// year (×10), and packaged models take their data vendor's new name. The
// radar keeps its numbers; its axes are now Reasoning, Speed, Breadth,
// Safety and Efficiency.
import { BUREAU_PACKAGES } from '../../data/bureaus';
import type { GameState } from '../state';

/** Bank-era cost per application → licence per customer a year. */
export const COST_PER_CUSTOMER_FROM_APP = 10;

export function migrateModel(state: GameState): void {
  for (const m of Object.values(state.underwriting.models)) {
    const raw = m as unknown as Record<string, unknown>;
    const old = typeof raw.costPerApp === 'number' ? raw.costPerApp : 0;
    delete raw.costPerApp;
    m.costPerCustomer = old * COST_PER_CUSTOMER_FROM_APP;
    const pkg = m.source === 'bureau' ? BUREAU_PACKAGES[m.id] : undefined;
    if (pkg) m.name = pkg.name;
  }
}
