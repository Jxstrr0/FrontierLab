// Executives (SIMULATION §17.2), tick step 8: candidate pools, weekly payroll
// (P&L execPay, cash), equity grants (execGrants.ts), the delegations each
// executive has switched on (execDelegations*.ts) and resignations, which raise
// the EXEC_POACHED incident. Hiring, firing and grants are player commands in
// commands/executives.ts; seat lookups other systems read are in execSeats.ts.
import { WEEKS_PER_YEAR } from '../config/balance';
import { EXEC_SEATS } from '../data/executives';
import { refreshExecCandidates } from './execCandidates';
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
import { runGrants } from './execGrants';
import { delegationOn, execMarketSalary, resignChance, seatedExecs } from './execSeats';
import { raiseIncident } from './incidents';
import { spend } from './ledger';
import { stream } from './rng';
import type { ExecSeat, GameState } from './state';

/** Delegations in the order they run each week: [seat, toggle id, routine]. */
const DELEGATIONS: [ExecSeat, string, (s: GameState) => void][] = [
  ['coo', 'branchOps', cooBranchOps],
  ['coo', 'hrDivision', cooDivision],
  ['coo', 'hrBenefits', cooBenefits],
  ['cfo', 'treasury', cfoTreasury],
  ['cto', 'digital', ctoDigital],
  ['cpo', 'developments', cpoDevelopments],
  ['cpo', 'models', cpoModels],
  ['cpo', 'pricing', cpoPricing],
  ['cmo', 'brand', cmoBrand],
  ['cro', 'appetite', croAppetite],
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
  rollResignations(state);
}

/** §17.2: each seated executive may be poached this week (EXEC_POACHED decides). */
function rollResignations(state: GameState): void {
  const execs = seatedExecs(state);
  if (execs.length === 0) return;
  const rng = stream(state, 'execs');
  const market = execMarketSalary(state);
  const rivals = Object.values(state.rivals)
    .filter((r) => r.status === 'active')
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const exec of execs) {
    if (!rng.chance(resignChance(exec, market))) continue;
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
