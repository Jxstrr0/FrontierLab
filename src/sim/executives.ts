// Executives (SIMULATION §17.2), tick step 8: candidate pools, weekly payroll
// (P&L execPay, cash), equity grants (execGrants.ts), the delegations each
// executive has switched on (execDelegations*.ts, payReviews.ts; the CREO's
// rents in execDelegationsProperty.ts, the CFO's investing in execInvesting.ts), the CFO and
// CRO's branch guidance (branchGuidance.ts) and resignations, which raise the
// EXEC_POACHED incident. Hiring, firing and grants are player commands in
// commands/executives.ts; seat lookups other systems read are in execSeats.ts.
import { WEEKS_PER_YEAR } from '../config/balance';
import { EXEC_SEATS } from '../data/executives';
import { BENEFIT_RULES } from '../data/benefits';
import { refreshExecCandidates } from './execCandidates';
import { cfoCapital, cfoShares } from './execDelegationsCapital';
import { cooExpansion } from './execDelegationsGrowth';
import { creoBankRents, creoPrivateRents } from './execDelegationsProperty';
import { creoBankBuys, creoPrivateBuys } from './execBuying';
import { cfoBankInvests, cfoPrivateInvests } from './execInvesting';
import {
  cfoTreasury,
  cpoDevelopments,
  cpoModels,
  cpoPricing,
  ctoDigital,
} from './execDelegationsFinance';
import {
  cmoBrand,
  cooBenefits,
  cooBranchOps,
  cooDivision,
  croAppetite,
} from './execDelegationsPeople';
import { runBranchGuidance } from './branchGuidance';
import { runGrants } from './execGrants';
import { cooPayReviews } from './payReviews';
import { delegationOn, execMarketSalary, resignChance, seatedExecs } from './execSeats';
import { raiseIncident } from './incidents';
import { spend } from './ledger';
import { stream } from './rng';
import type { ExecSeat, GameState } from './state';

/** Delegations in the order they run each week: [seat, toggle id, routine]. */
const DELEGATIONS: [ExecSeat, string, (s: GameState) => void][] = [
  ['coo', 'expansion', cooExpansion],
  ['coo', 'branchOps', cooBranchOps],
  ['coo', 'hrDivision', cooDivision],
  ['coo', 'hrBenefits', cooBenefits],
  ['coo', 'payReviews', cooPayReviews],
  ['cfo', 'treasury', cfoTreasury],
  ['cfo', 'capital', cfoCapital],
  ['cfo', 'shares', cfoShares],
  ['cfo', 'bankInvests', cfoBankInvests],
  ['cfo', 'privateInvests', cfoPrivateInvests],
  ['cto', 'digital', ctoDigital],
  ['cpo', 'developments', cpoDevelopments],
  ['cpo', 'models', cpoModels],
  ['cpo', 'pricing', cpoPricing],
  ['cmo', 'brand', cmoBrand],
  ['cro', 'appetite', croAppetite],
  ['creo', 'bankRents', creoBankRents],
  ['creo', 'privateRents', creoPrivateRents],
  ['creo', 'bankBuys', creoBankBuys],
  ['creo', 'privateBuys', creoPrivateBuys],
];

/** Weekly cost of every seated executive's salary. */
export function execPayroll(state: GameState): number {
  return seatedExecs(state).reduce((sum, e) => sum + e.salary / WEEKS_PER_YEAR, 0);
}

/** Tick step 8 (corporate items): executives. */
export function runExecutives(state: GameState): void {
  refreshExecCandidates(state);
  const pay = execPayroll(state);
  if (pay > 0) spend(state, 'execPay', pay);
  runGrants(state);
  for (const [seat, id, run] of DELEGATIONS) if (delegationOn(state, seat, id)) run(state);
  runBranchGuidance(state);
  rollResignations(state);
}

/** §17.2: each seated executive may be poached this week (EXEC_POACHED decides). */
function rollResignations(state: GameState): void {
  const execs = seatedExecs(state);
  if (execs.length === 0) return;
  const rng = stream(state, 'execs');
  const market = execMarketSalary(state);
  const espp = state.stock.status === 'public' && (state.people.benefits.espp ?? 0) > 0;
  const loyaltyBonus = espp ? BENEFIT_RULES.esppLoyalty : 0;
  const rivals = Object.values(state.rivals)
    .filter((r) => r.status === 'active')
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const exec of execs) {
    if (!rng.chance(resignChance(exec, market, loyaltyBonus))) continue;
    const rival = rivals.length > 0 ? rng.pick(rivals).name : 'A rival bank';
    raiseIncident(state, 'EXEC_POACHED', 'company', exec.seat, {
      seat: exec.seat,
      execId: exec.id,
      name: exec.name,
      title: EXEC_SEATS[exec.seat].title,
      rival,
    });
  }
}
