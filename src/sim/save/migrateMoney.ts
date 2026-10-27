// Save migration 6 → 7 (stage C3b): the money model's new lines. Every stored
// P&L record gains the compute line, office P&L rows move onto the AI lines
// (plan fees, API, apps, Loan Desk interest), and wholesale and central bank
// funding that once carried Loan Desk loans is repaid from reserves, then cash,
// now that the desk only lends what reserves hold. Equity is unchanged.
import type { GameState } from '../state';

type OldRow = { revenue?: number; lines?: Record<string, number> };

/** An old bank office P&L row on the new lines; the old funding transfers drop out. */
function convertRow(row: OldRow): void {
  const l = row.lines ?? {};
  if ('plans' in l) return;
  const v = (k: string) => l[k] ?? 0;
  const lines = {
    plans: v('fees'),
    api: v('wealthServices'),
    apps: 0,
    loanDesk: v('loanInterest'),
    otherIncome: 0,
    compute: 0,
    losses: v('losses'),
    staff: v('staff'),
    manager: v('manager'),
    rent: v('rent'),
    marketing: v('marketing'),
    equipment: v('equipment'),
    servicing: v('servicing') + v('depositInterest'),
    overhead: v('overhead'),
  };
  row.revenue = lines.plans + lines.api + lines.loanDesk;
  row.lines = lines;
}

export function migrateMoney(state: GameState): void {
  state.ledger.pnl.compute ??= 0;
  for (const w of state.history?.weekly ?? []) w.pnl.compute ??= 0;
  for (const b of Object.values(state.branches ?? {})) {
    for (const row of b.pnl ?? []) {
      const old = row as unknown as OldRow;
      const income = row.income;
      convertRow(old);
      // Income stays as it was closed: the transfers it dropped netted out company-wide.
      row.income = income;
    }
  }
  const t = state.treasury;
  const owed = t.overnight + t.window;
  t.reserves -= owed;
  t.overnight = 0;
  t.window = 0;
  if (t.reserves < 0) {
    state.company.cash += t.reserves;
    t.reserves = 0;
  }
}
