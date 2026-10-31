// Player settings and the founder's look (SCREENS §26), and the order of the
// HQ tabs (SCREENS §10). Settings are validated as a whole before anything
// changes, so a bad patch leaves the state untouched.
import { AVATAR_PARTS } from '../../data/avatarParts';
import { DEPARTMENTS, DEPT_ORDER } from '../../data/departments';
import { hqTabOrder, visibleHqTabs } from '../hqTabs';
import {
  CURRENCY_SYMBOLS,
  DEFAULT_SPEEDS,
  DISTANCE_UNITS,
  TEXT_SCALES,
  WEEKLY_RESULTS_MODES,
} from '../../data/settingsOptions';
import type { AvatarSpec, DeptId, GameState, Settings } from '../state';
import { fail, ok } from './result';

const oneOf = (list: readonly unknown[], v: unknown) => list.includes(v);
const isBool = (v: unknown) => typeof v === 'boolean';

/** For each setting: the reason a value is refused, or null when it's fine. */
const CHECKS: { [K in keyof Settings]: (v: unknown) => string | null } = {
  currency: (v) => (oneOf(CURRENCY_SYMBOLS, v) ? null : 'Pick one of the listed currency symbols.'),
  units: (v) => (oneOf(DISTANCE_UNITS, v) ? null : 'Distance units are km or mi.'),
  weeklyResults: (v) =>
    oneOf(WEEKLY_RESULTS_MODES, v) ? null : 'Results can be weekly, monthly, quarterly or off.',
  defaultSpeed: (v) => (oneOf(DEFAULT_SPEEDS, v) ? null : 'Default speed is 1×, 2× or 4×.'),
  autoPauseIncidents: (v) => (isBool(v) ? null : 'Auto-pause on incidents is on or off.'),
  autoPauseApplications: (v) => (isBool(v) ? null : 'Auto-pause on applications is on or off.'),
  sound: (v) => (isBool(v) ? null : 'Sound is on or off.'),
  reducedMotion: (v) => (isBool(v) ? null : 'Reduced motion is on or off.'),
  textScale: (v) => (oneOf(TEXT_SCALES, v) ? null : 'Text size is 100%, 115% or 130%.'),
  layers: (v) =>
    v && typeof v === 'object' && Object.values(v).every(isBool)
      ? null
      : 'Each map layer is on or off.',
  hqTabOrder: (v) =>
    Array.isArray(v) &&
    v.every((d) => typeof d === 'string' && d in DEPARTMENTS) &&
    new Set(v).size === v.length
      ? null
      : 'The HQ tab order lists each department at most once.',
  guides: (v) => (isBool(v) ? null : 'Guides are on or off.'),
  annualReport: (v) => (isBool(v) ? null : 'The annual report popup is on or off.'),
};

/** Changes one or more settings. */
export function setSettings(state: GameState, patch: Partial<Settings>) {
  for (const [key, value] of Object.entries(patch)) {
    const check = CHECKS[key as keyof Settings];
    if (!check) return fail(`"${key}" is not a setting.`);
    const reason = check(value);
    if (reason) return fail(reason);
  }
  Object.assign(state.settings, patch);
  return ok();
}

/**
 * Moves an HQ tab one place up (−1) or down (+1) among the floors you have:
 * it is lifted out of the full order and set down just past its visible
 * neighbour, so departments without a floor keep their places and slot in
 * where DEPT_ORDER puts them when you add them.
 */
export function moveHqTab(state: GameState, dept: DeptId, dir: -1 | 1) {
  if (!(dept in DEPARTMENTS)) return fail('Unknown department.');
  const visible = visibleHqTabs(state);
  const at = visible.indexOf(dept);
  if (at < 0) return fail('That department has no floor yet.');
  const other = visible[at + dir];
  if (!other) return ok();
  const order = hqTabOrder(state).filter((d) => d !== dept);
  order.splice(order.indexOf(other) + (dir > 0 ? 1 : 0), 0, dept);
  state.settings.hqTabOrder = order;
  return ok();
}

/** Puts the HQ tabs back in DEPT_ORDER. */
export function resetHqTabOrder(state: GameState) {
  state.settings.hqTabOrder = [];
  return ok();
}

/** True when the tabs are not in DEPT_ORDER. */
export function hqTabsRearranged(state: GameState): boolean {
  return hqTabOrder(state).some((d, i) => d !== DEPT_ORDER[i]);
}

/** Changes the founder's portrait parts; `shade` keeps its current value. */
export function setFounderAvatar(state: GameState, parts: Partial<Omit<AvatarSpec, 'shade'>>) {
  for (const [key, value] of Object.entries(parts)) {
    const spec = AVATAR_PARTS.find((p) => p.part === key);
    if (!spec) return fail(`"${key}" is not a portrait part.`);
    if (!Number.isInteger(value) || value < 0 || value >= spec.names.length) {
      return fail(`${spec.label} must be one of the ${spec.names.length} options.`);
    }
  }
  Object.assign(state.meta.founderAvatar, parts);
  return ok();
}
