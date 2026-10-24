// Branch operating costs and the branch P&L (SIMULATION §12). Turns a
// BranchWeek into the branch's income statement row and posts the real
// (non-transfer) items to the company ledger and corporate cash.
import {
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
import { earn, postPnl, spend } from '../ledger';
import type { Branch, BranchPnl, GameState } from '../state';
import type { CampaignEffects } from './marketing';
import { managerOf } from './staff';
import type { BranchWeek } from './week';

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
  for (const slot of BUILD_SLOTS) {
    const cost = EQUIPMENT[branch.build[slot]]?.cost ?? 0;
    wk.equipment += (cost * (isFitout(slot) ? FITOUT_UPKEEP : EQUIP_MAINT)) / WEEKS_PER_YEAR;
  }
  wk.overhead += BRANCH_OVERHEAD * (city?.costIndex ?? 1);
  wk.atmFees += (EQUIPMENT[branch.build.atm]?.atmProductivity ?? 0) * ATM_FEE.usage * ATM_FEE.fee;
}

/** Records the branch P&L row and posts company lines. Funding credit/charge are internal and net out. */
export function closeBranchWeek(state: GameState, branch: Branch, wk: BranchWeek): BranchPnl {
  const fees = wk.accountFees + wk.cardFees + wk.originationFees + wk.atmFees;
  const wealthServices = wk.wealthFees + wk.serviceFees;
  const row: BranchPnl = {
    week: state.clock.week,
    revenue: wk.loanInterest + wk.fundingCredit + fees + wealthServices,
    income: 0,
    lines: {
      loanInterest: wk.loanInterest,
      fundingCredit: wk.fundingCredit,
      fees,
      wealthServices,
      depositInterest: wk.depositInterest,
      fundingCharge: wk.fundingCharge,
      losses: wk.losses,
      staff: wk.staff,
      manager: wk.manager,
      rent: wk.rent,
      marketing: wk.marketing,
      equipment: wk.equipment,
      servicing: wk.servicing + wk.underwriting,
      overhead: wk.overhead,
    },
  };
  const expenses =
    wk.depositInterest +
    wk.fundingCharge +
    wk.losses +
    wk.staff +
    wk.manager +
    wk.rent +
    wk.marketing +
    wk.equipment +
    wk.servicing +
    wk.underwriting +
    wk.overhead;
  row.income = row.revenue - expenses;
  branch.pnl.push(row);
  if (branch.pnl.length > BRANCH_PNL_WEEKS)
    branch.pnl.splice(0, branch.pnl.length - BRANCH_PNL_WEEKS);

  earn(state, 'loanInterest', wk.loanInterest);
  earn(state, 'accountFees', wk.accountFees);
  earn(state, 'cardFees', wk.cardFees);
  earn(state, 'originationFees', wk.originationFees);
  earn(state, 'atmFees', wk.atmFees);
  earn(state, 'wealthFees', wk.wealthFees);
  earn(state, 'serviceFees', wk.serviceFees);
  spend(state, 'depositInterest', wk.depositInterest);
  spend(state, 'branchStaff', wk.staff);
  spend(state, 'managers', wk.manager);
  spend(state, 'rent', wk.rent);
  spend(state, 'marketing', wk.marketing);
  spend(state, 'equipment', wk.equipment);
  spend(state, 'overhead', wk.overhead);
  spend(state, 'servicing', wk.servicing);
  spend(state, 'underwriting', wk.underwriting);
  postPnl(state, 'loanLosses', wk.losses);
  return row;
}
