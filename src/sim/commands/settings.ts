// Player settings and the founder's look (SCREENS §26). Settings are validated
// as a whole before anything changes, so a bad patch leaves the state untouched.
import { AVATAR_PARTS } from '../../data/avatarParts';
import {
  CURRENCY_SYMBOLS,
  DEFAULT_SPEEDS,
  DISTANCE_UNITS,
  TEXT_SCALES,
  WEEKLY_RESULTS_MODES,
} from '../../data/settingsOptions';
import type { AvatarSpec, GameState, Settings } from '../state';
import { fail, ok } from './result';

const oneOf = (list: readonly unknown[], v: unknown) => list.includes(v);
const isBool = (v: unknown) => typeof v === 'boolean';

/** For each setting: the reason a value is refused, or null when it's fine. */
const CHECKS: { [K in keyof Settings]: (v: unknown) => string | null } = {
  currency: (v) => (oneOf(CURRENCY_SYMBOLS, v) ? null : 'Pick one of the listed currency symbols.'),
  units: (v) => (oneOf(DISTANCE_UNITS, v) ? null : 'Distance units are km or mi.'),
  weeklyResults: (v) =>
    oneOf(WEEKLY_RESULTS_MODES, v) ? null : 'Weekly results can be weekly, quarterly or off.',
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
