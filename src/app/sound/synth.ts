// The four sounds (ART_DIRECTION §8), synthesized with the Web Audio API at
// play time: no audio files to download. Each recipe schedules a few short
// oscillator and filtered-noise notes from time `t` into `out`.
//   coin   two bright inharmonic pings, like a coin landing on a counter
//   paper  a soft band-passed noise sweep, a sheet sliding across a desk
//   stamp  a low thump with a muffled slap, a rubber stamp
//   latch  two metallic clicks with a dull clunk, a vault door's latch

export type SoundName = 'coin' | 'paper' | 'stamp' | 'latch';

export interface Voice {
  ctx: BaseAudioContext;
  out: AudioNode;
  /** Half a second of white noise, made once per context. */
  noise: AudioBuffer;
}

/** Inharmonic partials of a small struck disc: [frequency ratio, level, decay seconds]. */
const COIN_PARTIALS: [number, number, number][] = [
  [1, 0.3, 0.35],
  [2.76, 0.16, 0.2],
  [5.4, 0.07, 0.1],
];
/** The two pings: [delay, base frequency]. */
const COIN_HITS: [number, number][] = [
  [0, 2350],
  [0.085, 2790],
];
const SILENT = 0.0001;

export const RECIPES: Record<SoundName, (v: Voice, t: number) => void> = {
  coin(v, t) {
    for (const [delay, base] of COIN_HITS) {
      for (const [ratio, level, decay] of COIN_PARTIALS) {
        tone(v, t + delay, { freq: base * ratio, level, decay, type: 'sine' });
      }
    }
  },
  paper(v, t) {
    noise(v, t, { dur: 0.3, level: 0.22, attack: 0.08, type: 'bandpass', freq: 1700, to: 3800 });
    noise(v, t + 0.26, { dur: 0.06, level: 0.12, attack: 0.005, type: 'highpass', freq: 4200 });
  },
  stamp(v, t) {
    tone(v, t, { freq: 150, to: 55, level: 0.55, decay: 0.16, type: 'sine' });
    noise(v, t, { dur: 0.07, level: 0.3, attack: 0.002, type: 'lowpass', freq: 900 });
    noise(v, t + 0.02, { dur: 0.05, level: 0.06, attack: 0.002, type: 'highpass', freq: 3000 });
  },
  latch(v, t) {
    noise(v, t, { dur: 0.025, level: 0.35, attack: 0.001, type: 'highpass', freq: 2600 });
    tone(v, t, { freq: 430, to: 260, level: 0.16, decay: 0.07, type: 'triangle' });
    noise(v, t + 0.075, { dur: 0.035, level: 0.3, attack: 0.001, type: 'bandpass', freq: 1800 });
    tone(v, t + 0.075, { freq: 180, to: 110, level: 0.22, decay: 0.11, type: 'triangle' });
  },
};

interface ToneSpec {
  freq: number;
  /** Glide to this frequency over the decay. */
  to?: number;
  level: number;
  decay: number;
  type: OscillatorType;
}

function tone(v: Voice, t: number, s: ToneSpec): void {
  const o = v.ctx.createOscillator();
  o.type = s.type;
  o.frequency.setValueAtTime(s.freq, t);
  if (s.to) o.frequency.exponentialRampToValueAtTime(s.to, t + s.decay);
  const g = envelope(v, t, s.level, 0.004, s.decay);
  o.connect(g);
  o.start(t);
  o.stop(t + s.decay + 0.02);
}

interface NoiseSpec {
  dur: number;
  level: number;
  attack: number;
  type: BiquadFilterType;
  freq: number;
  /** Sweep the filter to this frequency over the duration. */
  to?: number;
}

function noise(v: Voice, t: number, s: NoiseSpec): void {
  const src = v.ctx.createBufferSource();
  src.buffer = v.noise;
  const f = v.ctx.createBiquadFilter();
  f.type = s.type;
  f.frequency.setValueAtTime(s.freq, t);
  if (s.to) f.frequency.exponentialRampToValueAtTime(s.to, t + s.dur);
  src.connect(f);
  f.connect(envelope(v, t, s.level, s.attack, s.dur));
  src.start(t);
  src.stop(t + s.dur + 0.02);
}

/** A gain node that swells to `level` over `attack`, then fades out by `end` seconds. */
function envelope(v: Voice, t: number, level: number, attack: number, end: number): GainNode {
  const g = v.ctx.createGain();
  g.gain.setValueAtTime(SILENT, t);
  g.gain.exponentialRampToValueAtTime(level, t + attack);
  g.gain.exponentialRampToValueAtTime(SILENT, t + end);
  g.connect(v.out);
  return g;
}

/** White noise from a fixed-seed generator, so every play sounds the same. */
export function makeNoise(ctx: BaseAudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate / 2), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let x = 0x2545f491;
  for (let i = 0; i < data.length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    data[i] = ((x >>> 0) / 0xffffffff) * 2 - 1;
  }
  return buf;
}
