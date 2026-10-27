// The tutorial's step machine (SCREENS §27), pure so it can be unit-tested.
// Each step watches what the player actually does: entering a step records a
// baseline (branch count, Plus prices, managers, the API, contracts won,
// campaigns) and the step is done when the game moves past it. Nothing
// advances on a timer. guidance() says where the brass ring should go, as an ordered
// list of targets (closest to done first); the overlay rings the first one
// that is on screen.
import { TUTORIAL, TUTORIAL_STEPS, TUTORIAL_TEXT, type TutorialTarget } from '../../data/tutorial';

/** What the tutorial can see of the game and the UI (built by observe.ts). */
export interface TutorialObs {
  panelType: string | null;
  /** Branch shown in an open branch panel. */
  panelBranchId?: string;
  modalType: string | null;
  running: boolean;
  week: number;
  /** Your branches, oldest first. */
  branches: BranchObs[];
  /** Contracts won so far (underwriting.loansBooked, the AI model's Internal History). */
  loansBooked: number;
  /** New Deal Desk proposal requests waiting at any of your offices. */
  pendingApps: number;
}

export interface BranchObs {
  id: string;
  lotId: string;
  plus: number;
  api: boolean;
  managerId?: string;
  /** Campaign levels as one comparable string, e.g. "mail:1,social:0". */
  campaigns: string;
  /** The manager runs marketing here, so the levels are locked. */
  marketingDelegated: boolean;
}

/** What a step remembers from when it began. */
export interface StepMemo {
  step: number;
  week: number;
  branchCount: number;
  plus: Record<string, number>;
  api: Record<string, boolean>;
  managers: Record<string, string | undefined>;
  loansBooked: number;
  campaigns: Record<string, string>;
  /** Step 5: the weekly results have been on screen. */
  sawWeekly: boolean;
  /** Step 9: the Company summary has been open. */
  sawCompany: boolean;
}

export interface Target {
  key: TutorialTarget;
  line: string;
  /** For 'my-branch': which branch's pin. */
  lotId?: string;
}

export interface Guidance {
  title: string;
  targets: Target[];
  /** Line when no target is on screen. */
  idle: string;
}

export const isActiveStep = (step: number | undefined): step is number =>
  step !== undefined && step >= TUTORIAL.first && step <= TUTORIAL.last;

export function enterStep(step: number, obs: TutorialObs): StepMemo {
  const plus: Record<string, number> = {};
  const api: Record<string, boolean> = {};
  const managers: Record<string, string | undefined> = {};
  const campaigns: Record<string, string> = {};
  for (const b of obs.branches) {
    plus[b.id] = b.plus;
    api[b.id] = b.api;
    managers[b.id] = b.managerId;
    campaigns[b.id] = b.campaigns;
  }
  return {
    step,
    week: obs.week,
    branchCount: obs.branches.length,
    plus,
    api,
    managers,
    loansBooked: obs.loansBooked,
    campaigns,
    sawWeekly: false,
    sawCompany: false,
  };
}

/** Folds in what has happened since the last look (the weekly results or the Company summary showing up). */
export function updateMemo(memo: StepMemo, obs: TutorialObs): StepMemo {
  if (obs.modalType === 'weekly' && !memo.sawWeekly) return { ...memo, sawWeekly: true };
  if (memo.step === 9 && obs.panelType === 'company' && !memo.sawCompany) {
    return { ...memo, sawCompany: true };
  }
  return memo;
}

/**
 * Steps with nothing to do are skipped: every branch already has a manager or
 * the API, or every manager runs the branch's marketing.
 */
export function alreadyDone(memo: StepMemo, obs: TutorialObs): boolean {
  if (obs.branches.length === 0) return false;
  if (memo.step === 4) return obs.branches.every((b) => b.managerId);
  if (memo.step === 6) return obs.branches.every((b) => b.api);
  if (memo.step === 8) return obs.branches.every((b) => b.marketingDelegated);
  return false;
}

/** Whether the player has done what the step asks since it began. */
export function isDone(memo: StepMemo, obs: TutorialObs): boolean {
  switch (memo.step) {
    case 1:
      return obs.panelType === 'storefront' || obs.panelType === 'build';
    case 2:
      return obs.branches.length > memo.branchCount;
    case 3:
      return obs.branches.some((b) => b.id in memo.plus && b.plus !== memo.plus[b.id]);
    case 4:
      return obs.branches.some((b) => b.managerId && b.managerId !== memo.managers[b.id]);
    case 5:
      return memo.sawWeekly && obs.modalType !== 'weekly';
    case 6:
      return obs.branches.some((b) => b.api && memo.api[b.id] === false);
    case 7:
      return obs.loansBooked > memo.loansBooked;
    case 8:
      return obs.branches.some(
        (b) => b.id in memo.campaigns && b.campaigns !== memo.campaigns[b.id],
      );
    case 9:
      return memo.sawCompany && obs.panelType !== 'company';
    default:
      return true;
  }
}

/** The step after `step`: the closing card follows the last step. */
export const nextStep = (step: number): number =>
  step >= TUTORIAL.last ? TUTORIAL.finale : step + 1;

/** The branch the steps point at: the one in the open panel, else your newest. */
export function focusBranch(obs: TutorialObs): BranchObs | undefined {
  return obs.branches.find((b) => b.id === obs.panelBranchId) ?? obs.branches.at(-1);
}

/** Where to put the ring, and what to say there. */
export function guidance(memo: StepMemo, obs: TutorialObs): Guidance {
  const text = TUTORIAL_STEPS[memo.step];
  const title = text?.title ?? '';
  if (!text) return { title, targets: [], idle: '' };
  const lotId = focusBranch(obs)?.lotId;
  const targets: Target[] = [];
  for (const [key, line] of Object.entries(text.lines) as [TutorialTarget, string][]) {
    // Once the clock runs, step 5 only waits for the week (the play button is now pause).
    if (memo.step === 5 && obs.running && (key === 'play' || key === 'panel-close')) continue;
    targets.push(key === 'my-branch' ? { key, line, lotId } : { key, line });
  }
  let idle = text.idle;
  if (memo.step === 5 && !obs.running && obs.modalType !== 'weekly') {
    idle = text.lines.play ?? idle;
  }
  // Another modal is up (an incident, the board, or the weekly results mid-step).
  if (obs.modalType && !(memo.step === 5 && obs.modalType === 'weekly')) {
    if (obs.modalType === 'weekly') {
      return {
        title,
        targets: [{ key: 'weekly-continue', line: TUTORIAL_TEXT.weeklyAside }],
        idle: TUTORIAL_TEXT.weeklyAside,
      };
    }
    return { title, targets: [], idle: TUTORIAL_TEXT.waitModal };
  }
  return { title, targets, idle };
}

/** Step 7 needs a proposal request on the desk; true when the tutorial should ask for one. */
export function needsApplication(memo: StepMemo, obs: TutorialObs): boolean {
  return memo.step === TUTORIAL.loan && obs.pendingApps === 0 && obs.branches.length > 0;
}

/** Step 5 with weekly results switched off: the tutorial opens them itself once the week turns. */
export function shouldOpenWeekly(memo: StepMemo, obs: TutorialObs): boolean {
  return memo.step === 5 && !memo.sawWeekly && obs.week > memo.week && obs.modalType === null;
}
