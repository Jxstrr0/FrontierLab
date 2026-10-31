// Frontier projects (post-C8, SIMULATION §16.14): the late game's multi-year
// builds. One runs at a time, paid weekly; a week cash can't cover stalls it,
// and each quarter start it may overrun (more weeks, more cost). A finished
// project's reward lasts for good: breakthroughs raise the model ceiling, the
// Gigawatt Campus adds GPUs to the pool (its power billed weekly), the Safety
// Institute cuts exposure and company incident chances, and the Global Edge
// Network lifts Service in every office. Tick step 7, after training.
import { DATA_CENTER, FRONTIER_PROJECTS, MODEL_RADAR_MAX } from '../config/balance';
import {
  FRONTIER_PROJECT_LIST,
  FRONTIER_PROJECTS_BY_ID,
  type FrontierProject,
} from '../data/frontierProjects';
import { companyArr } from './arr';
import { isQuarterStart } from './calendar';
import { pushEvent } from './events';
import { spend } from './ledger';
import { listPrice } from './nominal';
import { stream } from './rng';
import type { ActiveProject, GameState } from './state';

/** The finished projects' specs. */
function finished(state: GameState): FrontierProject[] {
  return state.projects.done.flatMap((id) => FRONTIER_PROJECTS_BY_ID[id] ?? []);
}

/** The radar's ceiling: MODEL_RADAR_MAX plus every finished breakthrough's lift. */
export function modelCeiling(state: GameState): number {
  let lift = 0;
  for (const p of finished(state)) if (p.reward.kind === 'ceiling') lift += p.reward.lift;
  return MODEL_RADAR_MAX + lift;
}

/** GPUs the finished Gigawatt Campus adds to the compute pool. */
export function projectGpus(state: GameState): number {
  let gpus = 0;
  for (const p of finished(state)) if (p.reward.kind === 'gpus') gpus += p.reward.gpus;
  return gpus;
}

/** The campus's weekly power bill: GPUs × power per GPU-week × campus PUE × energy-site power. */
export function projectPowerBill(state: GameState): number {
  return (
    projectGpus(state) *
    DATA_CENTER.powerPerGpuWeek *
    FRONTIER_PROJECTS.campusPue *
    DATA_CENTER.energySitePower
  );
}

/** The Safety Institute is finished. */
export function hasInstitute(state: GameState): boolean {
  return finished(state).some((p) => p.reward.kind === 'safety');
}

/** Service stars the Global Edge Network adds to every sales office. */
export function edgeServiceLift(state: GameState): number {
  let lift = 0;
  for (const p of finished(state)) if (p.reward.kind === 'service') lift += p.reward.lift;
  return lift;
}

/** The weekly payment on a project under way. */
export function projectWeekly(active: ActiveProject): number {
  return active.cost / active.weeks;
}

/** Why `spec` can't be started now, or undefined when it can (cash checked separately). */
export function projectBlock(state: GameState, spec: FrontierProject): string | undefined {
  if (state.projects.done.includes(spec.id)) return 'Finished.';
  if (state.projects.active?.id === spec.id) return 'Under way.';
  if (spec.requires && !state.projects.done.includes(spec.requires))
    return `Needs ${FRONTIER_PROJECTS_BY_ID[spec.requires]?.name ?? spec.requires} first.`;
  if (companyArr(state) < spec.minArr) return 'ARR too low.';
  if (state.projects.active) return 'Another project is under way.';
  return undefined;
}

/** Today's price of a project: its base cost on the home price list. */
export function projectPrice(state: GameState, projectId: string): number {
  return listPrice(state, FRONTIER_PROJECTS_BY_ID[projectId]?.cost ?? 0);
}

/** Cash a start needs in hand: startWeeks of payments at today's price. */
export function projectUpfront(state: GameState, spec: FrontierProject): number {
  return (projectPrice(state, spec.id) / spec.weeks) * FRONTIER_PROJECTS.startWeeks;
}

/** The first project in list order that could start now, cash included. */
export function nextStartableProject(state: GameState): FrontierProject | undefined {
  return FRONTIER_PROJECT_LIST.find(
    (p) => !projectBlock(state, p) && state.company.cash >= projectUpfront(state, p),
  );
}

/** Starts `spec` at today's price (callers check projectBlock and the cash first). */
export function beginProject(state: GameState, spec: FrontierProject): void {
  const cost = projectPrice(state, spec.id);
  state.projects.active = {
    id: spec.id,
    startWeek: state.clock.week,
    cost,
    weeks: spec.weeks,
    weeksDone: 0,
    spent: 0,
  };
  pushEvent(
    state,
    'PROJECT_STARTED',
    { bank: state.meta.bankName, projectId: spec.id, name: spec.name, cost, weeks: spec.weeks },
    2,
  );
}

/** Tick step 7: pay this week's share, roll an overrun at a quarter start, finish at the last week. */
export function runProjects(state: GameState): void {
  const bill = projectPowerBill(state);
  if (bill > 0) spend(state, 'equipment', bill);
  const active = state.projects.active;
  if (!active) return;
  const spec = FRONTIER_PROJECTS_BY_ID[active.id];
  if (!spec) {
    delete state.projects.active;
    return;
  }
  const bank = state.meta.bankName;
  if (isQuarterStart(state.meta.startDate, state.clock.day)) {
    const rng = stream(state, 'projects');
    if (rng.chance(FRONTIER_PROJECTS.overrunP)) {
      const share = rng.range(...FRONTIER_PROJECTS.overrunShare);
      const extraWeeks = Math.max(1, Math.round(active.weeks * share));
      // Weekly payment stays the same: the extra weeks bring their own cost.
      active.cost += projectWeekly(active) * extraWeeks;
      active.weeks += extraWeeks;
      pushEvent(state, 'PROJECT_OVERRUN', { bank, name: spec.name, weeks: extraWeeks }, 2);
    }
  }
  const pay = projectWeekly(active);
  if (state.company.cash < pay) {
    if (!active.stalled)
      pushEvent(state, 'PROJECT_STALLED', { bank, projectId: spec.id, name: spec.name }, 2);
    active.stalled = true;
    return;
  }
  active.stalled = false;
  spend(state, 'development', pay);
  active.spent += pay;
  active.weeksDone += 1;
  if (active.weeksDone >= active.weeks) {
    delete state.projects.active;
    state.projects.done.push(spec.id);
    pushEvent(state, 'PROJECT_DONE', { bank, projectId: spec.id, name: spec.name }, 1);
  }
}
