// Branch operating costs and the branch P&L (SIMULATION §12). Turns a
// BranchWeek into the branch's income statement row and posts the real
// (non-transfer) items to the company ledger and corporate cash.
import {
  COMPUTE,
  ATM_FEE,
  BRANCH_OVERHEAD,
  BRANCH_PNL_WEEKS,
  EQUIP_MAINT,
  FITOUT_UPKEEP,
  HOURS_PER_WEEK,
  WEEKS_PER_YEAR,
} from '../../config/balance';
import { CITIES } from '../../data/cities';
import { EQUIPMENT, isFitout, BUILD_SLOTS } from '../../data/equipment';
import { internalComputePrice } from '../compute';
import { earn, postPnl, spend } from '../ledger';
import { listLevel } from '../nominal';
import type { Branch, BranchPnl, GameState } from '../state';
import type { CampaignEffects } from './marketing';
import { managerOf } from './staff';
import type { BranchWeek } from './week';
import { sizeMult, slotMult } from './officeSize';

/** Wages, manager, rent, campaigns, upkeep, overhead and ATM fees for the week. */
export function addBranchCosts(
  state: GameState,
  branch: Branch,
  fx: CampaignEffects,
  wk: BranchWeek,
  newDepositAccounts: number,
): void {
  const city = CITIES[branch.cityId];
  wk.staff += branch.staff.count * branch.staff.wage * HOURS_PER_WEEK;
  wk.manager += (managerOf(state, branch)?.salary ?? 0) / WEEKS_PER_YEAR;
  wk.rent += branch.lease.weeklyRent;
  wk.marketing += fx.weeklyCost + fx.perNewDepositAccount * newDepositAccounts;
  // Upkeep and overhead follow today's price list in the branch's country (§4.6).
  const level = listLevel(state, branch.cityId);
  for (const slot of BUILD_SLOTS) {
    const cost = (EQUIPMENT[branch.build[slot]]?.cost ?? 0) * level * slotMult(slot, branch.size);
    wk.equipment += (cost * (isFitout(slot) ? FITOUT_UPKEEP : EQUIP_MAINT)) / WEEKS_PER_YEAR;
  }
  const mult = sizeMult(branch);
  wk.overhead += BRANCH_OVERHEAD * (city?.costIndex ?? 1) * level * mult;
  wk.atmFees +=
    (EQUIPMENT[branch.build.atm]?.atmProductivity ?? 0) * mult * ATM_FEE.usage * ATM_FEE.fee;
}

/** Records the office P&L row (C3b: revenue by product line, then the compute bill) and posts company lines. */
export function closeBranchWeek(state: GameState, branch: Branch, wk: BranchWeek): BranchPnl {
  // §13.0: compute so far is at base spot prices; count it in GPU-weeks, then
  // charge it at the internal price, today's spot (C4c). The compute pool books
  // the gap to what the lab actually paid (settleCompute).
  const gpus = wk.compute / COMPUTE.spotPerGpuWeek;
  wk.compute *= internalComputePrice(state);
  const otherIncome = wk.atmFees;
  const servicing = wk.servicing + wk.underwriting;
  const lines = {
    plans: wk.accountFees,
    api: wk.serviceFees,
    apps: wk.cardFees,
    loanDesk: wk.loanInterest,
    otherIncome,
    compute: wk.compute,
    losses: wk.losses,
    staff: wk.staff,
    manager: wk.manager,
    rent: wk.rent,
    marketing: wk.marketing,
    equipment: wk.equipment,
    servicing,
    overhead: wk.overhead,
  };
  const revenue = lines.plans + lines.api + lines.apps + lines.loanDesk + otherIncome;
  const expenses =
    wk.compute +
    wk.losses +
    wk.staff +
    wk.manager +
    wk.rent +
    wk.marketing +
    wk.equipment +
    servicing +
    wk.overhead;
  const row: BranchPnl = {
    week: state.clock.week,
    revenue,
    income: revenue - expenses,
    lines,
    gpus,
  };
  branch.pnl.push(row);
  if (branch.pnl.length > BRANCH_PNL_WEEKS)
    branch.pnl.splice(0, branch.pnl.length - BRANCH_PNL_WEEKS);

  earn(state, 'loanInterest', wk.loanInterest);
  earn(state, 'accountFees', wk.accountFees);
  earn(state, 'cardFees', wk.cardFees);
  earn(state, 'atmFees', wk.atmFees);
  earn(state, 'serviceFees', wk.serviceFees);
  spend(state, 'branchStaff', wk.staff);
  spend(state, 'managers', wk.manager);
  spend(state, 'rent', wk.rent);
  spend(state, 'marketing', wk.marketing);
  spend(state, 'equipment', wk.equipment);
  spend(state, 'overhead', wk.overhead);
  spend(state, 'servicing', wk.servicing);
  spend(state, 'compute', wk.compute);
  spend(state, 'underwriting', wk.underwriting);
  postPnl(state, 'loanLosses', wk.losses);
  return row;
}
