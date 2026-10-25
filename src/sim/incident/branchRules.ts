// Branch incidents (CONTENT §22): robbery, ATM skimming, mis-selling, viral
// complaint, flood, staff walkout and the big-default notice. Each rule gives
// the weekly chance, the rolled amounts, option costs and what each option does.
import { EQUIPMENT_LIFE_WEEKS, HOURS_PER_WEEK, INCIDENTS, WAGE_STEP } from '../../config/balance';
import { EQUIPMENT } from '../../data/equipment';
import { INCIDENT_PARAMS, INCIDENT_SPECS } from '../../data/incidents';
import { isDeposit } from '../../data/products';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { spend } from '../ledger';
import { roundToStep } from '../math';
import { productSpec } from '../products';
import type { Branch, GameState } from '../state';
import { addEffect, incidentPMult } from './effects';
import { bumpMorale, fraudShield, nextVault, num, ratingHit, type IncidentRule } from './helpers';
import { compactMoney } from './text';

const P = INCIDENT_PARAMS;
const baseP = (type: string) => INCIDENT_SPECS[type]?.baseP ?? 0;
const branchOf = (state: GameState, id: string): Branch | undefined => state.branches[id];

/** Chance an incident's press angle reaches The Weekly Ledger. */
function maybeNews(
  state: GameState,
  chance: number,
  rng: { chance(p: number): boolean },
  type: string,
  branch?: Branch,
) {
  if (!rng.chance(chance)) return;
  pushEvent(
    state,
    'INCIDENT_NEWS',
    { bank: state.meta.bankName, type, branchName: branch?.name ?? '', city: branch?.cityId ?? '' },
    3,
    branch?.id,
  );
}

const ROBBERY: IncidentRule = {
  // × (6 − vault security)/3
  chance(state, scope) {
    const b = branchOf(state, scope);
    if (!b) return 0;
    const sec = EQUIPMENT[b.build.vault]?.security ?? 1;
    return (
      baseP('ROBBERY') *
      Math.max(0, (P.ROBBERY.securityRef - sec) / P.ROBBERY.securityDiv) *
      incidentPMult(state, 'ROBBERY', scope)
    );
  },
  roll(state, scope, rng) {
    const sec = Math.max(1, EQUIPMENT[branchOf(state, scope)!.build.vault]?.security ?? 1);
    const loss = rng.range(...P.ROBBERY.loss) / sec;
    return { loss, insured: P.ROBBERY.insured, net: loss * (1 - P.ROBBERY.insured) };
  },
  prepare(state, scope, data) {
    const b = branchOf(state, scope);
    const next = b && nextVault(b);
    data.nextVault = next ? (EQUIPMENT[next]?.name ?? next) : 'stronger vault';
    data.leave = (b?.staff.count ?? 0) * P.ROBBERY.leavePerStaff;
  },
  onRaise(state, inc) {
    spend(state, 'incidents', num(inc.data, 'net'));
  },
  costs(state, scope, data) {
    const b = branchOf(state, scope);
    const next = b && nextVault(b);
    return {
      upgrade: next ? (EQUIPMENT[next]?.cost ?? 0) * P.ROBBERY.upgradeShare : 0,
      leave: num(data, 'leave'),
      usual: 0,
    };
  },
  blocked(state, inc, optionId) {
    const b = branchOf(state, inc.scope);
    if (optionId === 'upgrade' && (!b || !nextVault(b)))
      return 'The vault is already the strongest we can fit.';
    return undefined;
  },
  apply(state, inc, optionId) {
    const b = branchOf(state, inc.scope);
    if (!b) return;
    if (optionId === 'upgrade') {
      const next = nextVault(b);
      const paid = inc.options.find((o) => o.id === 'upgrade')?.cost ?? 0;
      if (next) {
        b.build.vault = next;
        state.company.fixedAssets.push({
          id: newId(state, 'fa'),
          kind: 'equipment',
          slot: 'vault',
          cost: paid,
          lifeWeeks: EQUIPMENT_LIFE_WEEKS,
          ageWeeks: 0,
          ownerId: b.id,
        });
      }
      bumpMorale(b, P.ROBBERY.upgradeMorale);
    } else if (optionId === 'leave') bumpMorale(b, P.ROBBERY.leaveMorale);
    else {
      bumpMorale(b, P.ROBBERY.usualMorale);
      ratingHit(state, b.id, 'branch', P.ROBBERY.usualBranch, P.ROBBERY.usualWeeks);
    }
  },
};

const ATM_SKIM: IncidentRule = {
  // Branches with an ATM: × (1.3 − fraudShield/10)
  chance(state, scope) {
    const b = branchOf(state, scope);
    if (!b || (EQUIPMENT[b.build.atm]?.atmProductivity ?? 0) <= 0) return 0;
    return (
      baseP('ATM_SKIM') *
      Math.max(0, P.ATM_SKIM.shieldBase - fraudShield(state, b) / 10) *
      incidentPMult(state, 'ATM_SKIM', scope)
    );
  },
  roll: (_s, _scope, rng) => ({ refund: rng.range(...P.ATM_SKIM.refund) }),
  costs: (_s, _scope, data) => ({
    refund: num(data, 'refund'),
    firmware: P.ATM_SKIM.firmwareCost,
    deny: 0,
  }),
  apply(state, inc, optionId, rng) {
    const b = branchOf(state, inc.scope);
    if (optionId === 'firmware') {
      addEffect(
        state,
        'incidentP',
        inc.scope,
        P.ATM_SKIM.firmwarePMult,
        P.ATM_SKIM.firmwareWeeks,
        'ATM_SKIM',
      );
    } else if (optionId === 'deny') {
      ratingHit(state, inc.scope, 'service', P.ATM_SKIM.denyService, P.ATM_SKIM.denyWeeks);
      maybeNews(state, P.ATM_SKIM.denyNews, rng, 'ATM_SKIM', b);
    }
  },
};

/** Deposit balances at a branch. */
function branchDeposits(state: GameState, b: Branch): number {
  let total = 0;
  for (const [pid, book] of Object.entries(b.books)) {
    const spec = productSpec(state, pid);
    if (spec && isDeposit(spec)) total += book.balance;
  }
  return total;
}

const MIS_SELLING: IncidentRule = {
  // × sign-up bonus level × (1.6 − ethics/100) × (appetite ≥ 4 ? 1.5 : 1)
  chance(state, scope) {
    const b = branchOf(state, scope);
    const level = b?.campaigns.signup_bonus ?? 0;
    if (!b || level <= 0) return 0;
    const mgr = b.managerId ? state.people.managers[b.managerId] : undefined;
    const ethics = mgr?.skills.ethics ?? INCIDENTS.defaultEthics;
    const appetite =
      state.company.riskAppetite >= P.MIS_SELLING.appetiteFrom ? P.MIS_SELLING.appetiteMult : 1;
    return (
      baseP('MIS_SELLING') *
      level *
      Math.max(0, P.MIS_SELLING.ethicsBase - ethics / 100) *
      appetite *
      incidentPMult(state, 'MIS_SELLING', scope)
    );
  },
  roll(state, scope) {
    // Compensation = 2% of branch deposits ÷ 10
    const comp =
      (branchDeposits(state, branchOf(state, scope)!) * P.MIS_SELLING.compShare) /
      P.MIS_SELLING.compDiv;
    return { comp, fine: comp * P.MIS_SELLING.denyFineMult };
  },
  costs: (_s, _scope, data) => ({
    fire: num(data, 'comp'),
    compensate: num(data, 'comp'),
    deny: 0,
  }),
  blocked(state, inc, optionId) {
    if (optionId === 'fire' && !branchOf(state, inc.scope)?.managerId)
      return 'There is no manager to fire.';
    return undefined;
  },
  expected: (_s, inc, optionId) =>
    optionId === 'deny' ? P.MIS_SELLING.denyFineChance * num(inc.data, 'fine') : 0,
  apply(state, inc, optionId, rng) {
    const b = branchOf(state, inc.scope);
    if (!b) return;
    if (optionId === 'fire' && b.managerId) {
      delete state.people.managers[b.managerId];
      delete b.managerId;
      for (const k of Object.keys(b.delegation) as (keyof Branch['delegation'])[])
        b.delegation[k] = false;
    } else if (optionId === 'deny' && rng.chance(P.MIS_SELLING.denyFineChance)) {
      const fine = num(inc.data, 'fine');
      spend(state, 'fines', fine);
      pushEvent(
        state,
        'REG_FINE',
        { bank: state.meta.bankName, amount: fine, reason: `mis-selling at its ${b.name} branch` },
        2,
        b.id,
      );
      return `The regulator fined us ${compactMoney(fine, state.settings.currency)}.`;
    } else if (optionId === 'deny') return 'The complaints died down without a fine.';
  },
};

const VIRAL_COMPLAINT: IncidentRule = {
  chance(state, scope) {
    const b = branchOf(state, scope);
    if (!b || b.ratings.service >= P.VIRAL_COMPLAINT.maxService) return 0;
    return baseP('VIRAL_COMPLAINT') * incidentPMult(state, 'VIRAL_COMPLAINT', scope);
  },
  costs: () => ({ apology: P.VIRAL_COMPLAINT.apologyCost, ignore: 0 }),
  apply(state, inc, optionId, rng) {
    const b = branchOf(state, inc.scope);
    if (!b) return;
    if (optionId === 'apology') {
      const v = P.VIRAL_COMPLAINT;
      ratingHit(state, b.id, 'service', v.apologyService, v.apologyWeeks);
    } else {
      b.awareness = Math.max(0, b.awareness - P.VIRAL_COMPLAINT.ignoreAwareness);
      maybeNews(state, P.VIRAL_COMPLAINT.ignoreNews, rng, 'VIRAL_COMPLAINT', b);
    }
  },
};

const BRANCH_FLOOD: IncidentRule = {
  // Waterfront branches flood three times as often.
  chance(state, scope) {
    const b = branchOf(state, scope);
    if (!b) return 0;
    const waterfront = state.world.lots[b.lotId]?.district === 'waterfront';
    return (
      baseP('BRANCH_FLOOD') *
      (waterfront ? P.BRANCH_FLOOD.waterfrontMult : 1) *
      incidentPMult(state, 'BRANCH_FLOOD', scope)
    );
  },
  costs: () => ({ fast: P.BRANCH_FLOOD.fastCost, slow: P.BRANCH_FLOOD.slowCost }),
  apply(state, inc, optionId) {
    const weeks = optionId === 'fast' ? P.BRANCH_FLOOD.fastWeeks : P.BRANCH_FLOOD.slowWeeks;
    addEffect(state, 'closed', inc.scope, 1, weeks);
  },
};

const STAFF_WALKOUT: IncidentRule = {
  chance(state, scope) {
    const b = branchOf(state, scope);
    if (!b || b.staff.count <= 0 || b.staff.morale >= P.STAFF_WALKOUT.maxMorale) return 0;
    return baseP('STAFF_WALKOUT') * incidentPMult(state, 'STAFF_WALKOUT', scope);
  },
  prepare(state, scope, data) {
    const b = branchOf(state, scope);
    const wage = roundToStep((b?.staff.wage ?? 0) * (1 + P.STAFF_WALKOUT.wageRaise), WAGE_STEP);
    data.wage = `${state.settings.currency}${wage.toFixed(2)}`;
  },
  costs: (state, scope) => ({
    raise: 0,
    bonus: (branchOf(state, scope)?.staff.count ?? 0) * P.STAFF_WALKOUT.bonusPerStaff,
    wait: 0,
  }),
  expected(state, inc, optionId) {
    const b = branchOf(state, inc.scope);
    if (optionId !== 'raise' || !b) return 0;
    const w = P.STAFF_WALKOUT;
    return b.staff.count * b.staff.wage * w.wageRaise * HOURS_PER_WEEK * w.raiseHorizon;
  },
  apply(state, inc, optionId) {
    const b = branchOf(state, inc.scope);
    if (!b) return;
    const w = P.STAFF_WALKOUT;
    if (optionId === 'raise')
      b.staff.wage = roundToStep(b.staff.wage * (1 + w.wageRaise), WAGE_STEP);
    else if (optionId === 'bonus') bumpMorale(b, w.bonusMorale);
    else {
      addEffect(state, 'closed', b.id, 1, w.waitWeeks);
      bumpMorale(b, w.waitMorale);
    }
  },
};

/** Information only: raised by the Loan Desk when a big business loan defaults. */
const BIG_DEFAULT: IncidentRule = { costs: () => ({ ok: 0 }), apply: () => undefined };

export const BRANCH_RULES: Record<string, IncidentRule> = {
  ROBBERY,
  ATM_SKIM,
  MIS_SELLING,
  VIRAL_COMPLAINT,
  BRANCH_FLOOD,
  STAFF_WALKOUT,
  BIG_DEFAULT,
};
