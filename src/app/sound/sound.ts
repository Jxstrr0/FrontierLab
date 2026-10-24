// Optional sound (ART_DIRECTION §8): play(name) plays one of four synthesized
// sounds, and does nothing while Sound is off in Settings (off by default).
// iOS only lets a page start audio from a tap, so the AudioContext is created
// and resumed inside the first tap after Sound is switched on (unlockAudio,
// also called straight from the Settings toggle).
import { DEFAULT_SETTINGS } from '../../sim/newGame';
import type { Settings } from '../../sim/state';
import { loadPrefs } from '../saves';
import { peekGame } from '../store';
import { makeNoise, RECIPES, type SoundName, type Voice } from './synth';

export type { SoundName } from './synth';

/** Overall level: these are accents, never louder than a phone's keyboard clicks. */
const MASTER_GAIN = 0.45;
/** The same sound twice within this many seconds plays once (rapid panel taps). */
const REPEAT_GAP_S = 0.06;

/** Whether sound is on: the loaded game's setting, or the saved preference on the title screens. */
export function soundEnabled(
  game: { settings: Pick<Settings, 'sound'> } | null,
  prefs: Partial<Settings>,
): boolean {
  return game ? game.settings.sound : (prefs.sound ?? DEFAULT_SETTINGS.sound);
}

type ContextFactory = () => AudioContext | null;

function browserContext(): AudioContext | null {
  const w = globalThis as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  try {
    return Ctor ? new Ctor() : null;
  } catch {
    return null;
  }
}

let factory: ContextFactory = browserContext;
let voice: Voice | null = null;
let ctx: AudioContext | null = null;
const lastPlayed: Partial<Record<SoundName, number>> = {};
let plays = 0;

/** Tests swap in a fake AudioContext; null restores the browser's. */
export function setAudioFactory(f: ContextFactory | null): void {
  factory = f ?? browserContext;
  ctx = null;
  voice = null;
  for (const k of Object.keys(lastPlayed)) delete lastPlayed[k as SoundName];
}

const isOn = () => soundEnabled(peekGame(), loadPrefs());

/**
 * Creates (once) and resumes the AudioContext. Call from inside a tap or key
 * handler: that is when iOS Safari allows audio to start.
 */
export function unlockAudio(): AudioContext | null {
  if (!ctx) {
    ctx = factory();
    if (!ctx) return null;
    const out = ctx.createGain();
    out.gain.value = MASTER_GAIN;
    out.connect(ctx.destination);
    voice = { ctx, out, noise: makeNoise(ctx) };
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
}

/**
 * Plays a sound `delay` seconds from now. A no-op while Sound is off, and until
 * a tap has unlocked audio (creating the context outside a tap only earns a
 * browser warning and silence).
 */
export function play(name: SoundName, delay = 0): void {
  if (!isOn() || !ctx || !voice) return;
  const c = ctx;
  const t = c.currentTime + delay;
  const last = lastPlayed[name];
  if (last !== undefined && Math.abs(t - last) < REPEAT_GAP_S) return;
  lastPlayed[name] = t;
  plays++;
  try {
    RECIPES[name](voice, t);
  } catch {
    // A broken audio device must never break the game.
  }
}

/** For the debug hook and tests: whether a context exists and how many sounds have played. */
export function audioStatus(): { context: string; plays: number } {
  return { context: ctx ? ctx.state : 'none', plays };
}

let unlockInstalled = false;

/** Unlocks audio on the first tap or key press while Sound is on (iOS needs a gesture). */
export function installAudioUnlock(): void {
  if (unlockInstalled || typeof window === 'undefined') return;
  unlockInstalled = true;
  const events = ['pointerdown', 'touchend', 'keydown'] as const;
  const handler = () => {
    if (!isOn()) return;
    const c = unlockAudio();
    if (c && c.state === 'running') {
      for (const e of events) window.removeEventListener(e, handler, true);
      unlockInstalled = false;
    }
  };
  for (const e of events) window.addEventListener(e, handler, { capture: true, passive: true });
}
