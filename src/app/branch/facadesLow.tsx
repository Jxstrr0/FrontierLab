// Branch exteriors, part 1 (ART_DIRECTION §3, CONTENT §7): Plain Storefront
// (awning and big window), Heritage Brick (arched windows) and Modern Glass
// (mullion grid), drawn in the vignette's 320 × 150 box with the ground at
// y = 132. The name sign, lamps and planters come from the house style.
import { hatch, poly, rect, type Pt } from '../../art/engrave';
import { Face, Hatch } from '../components/Vignette';
import { arch, Glass, Seal, type Brand } from './facadeParts';

// ─── Plain Storefront ───────────────────────────────────────────────────
const AWNING_STRIPES = Array.from({ length: 8 }, (_, k) => [
  [96 + 16 * k, 78],
  [112 + 16 * k, 78],
  [106 + 18 * k, 94],
  [88 + 18 * k, 94],
]) as Pt[][];
const SCALLOPS = `M88 94${'q4.5 5 9 0'.repeat(16)}`;

export function Storefront(_b: Brand) {
  return (
    <g>
      <Face
        pts={[
          [228, 56],
          [240, 50],
          [240, 132],
          [228, 132],
        ]}
        density="medium"
      />
      <Face pts={rect(92, 56, 136, 76)} />
      <Face pts={rect(88, 50, 144, 6)} density="medium" />
      <Face
        pts={[
          [96, 78],
          [224, 78],
          [232, 94],
          [88, 94],
        ]}
      />
      {AWNING_STRIPES.filter((_, k) => k % 2 === 0).map((s) => (
        <Hatch pts={s} density="dense" angle={-60} />
      ))}
      <path d={SCALLOPS} class="art-line art-fine" />
      <Hatch pts={rect(92, 98, 136, 4)} density="dense" />
      <Glass pts={rect(100, 104, 84, 26)} />
      <Hatch
        pts={[
          [112, 128],
          [128, 106],
          [134, 106],
          [118, 128],
        ]}
        density="light"
        angle={-30}
      />
      <Hatch
        pts={[
          [150, 128],
          [166, 106],
          [170, 106],
          [154, 128],
        ]}
        density="light"
        angle={-30}
      />
      <path d="M142 104v26M98 130h88" class="art-line" />
      <Face pts={rect(194, 102, 26, 30)} density="light" angle={90} />
      <Glass pts={rect(198, 106, 18, 12)} fine />
      <path d="M214 120v4" class="art-line" />
    </g>
  );
}

// ─── Heritage Brick ─────────────────────────────────────────────────────
const BRICK_WALL = rect(84, 44, 152, 88);
const BRICK_COURSES = hatch(BRICK_WALL, 4, 0);
const BRICK_JOINTS = Array.from({ length: 22 }, (_, r) => {
  const y = 44 + r * 4;
  const out: string[] = [];
  for (let x = 84 + (r % 2) * 6 + 6; x < 236; x += 12) out.push(`M${x} ${y}v4`);
  return out.join('');
}).join('');
const DENTILS = Array.from({ length: 26 }, (_, i) => `M${83 + i * 6} 44h3v3h-3z`).join('');
const UPPER = [108, 140, 180, 212];

export function Brick(b: Brand) {
  return (
    <g>
      <Face
        pts={[
          [236, 42],
          [246, 36],
          [246, 132],
          [236, 132],
        ]}
        density="dense"
      />
      <Face pts={BRICK_WALL} />
      <path d={BRICK_COURSES + BRICK_JOINTS} class="art-hatch" style={{ opacity: 0.45 }} />
      <Face pts={rect(80, 36, 160, 8)} density="medium" angle={0} />
      <path d={DENTILS} class="art-line art-fine" />
      <Face pts={rect(84, 84, 152, 4)} />
      {UPPER.map((x) => (
        <g>
          <path d={poly(arch(x - 11, 79, 22, 30))} class="art-paper" />
          <path d={poly(arch(x - 11, 79, 22, 30))} class="art-line art-fine" />
          <Glass pts={arch(x - 8, 78, 16, 26)} />
          <path d={`M${x} 52v26M${x - 8} 66h16M${x - 2} 49h4l-1 4h-2z`} class="art-line art-fine" />
        </g>
      ))}
      {[112, 208].map((x) => (
        <g>
          <Glass pts={arch(x - 17, 128, 34, 34)} />
          <path d={`M${x} 94v34M${x - 17} 112h34M${x - 19} 128h38`} class="art-line art-fine" />
        </g>
      ))}
      <Face pts={arch(147, 132, 26, 30)} density="dense" angle={90} />
      <path d="M151 130v-14h7v14M162 130v-14h7v14M160 102.5v3" class="art-line art-fine" />
      <path d="M236 62h18M250 62v3" class="art-line" />
      <Seal x={250} y={72} r={7} brand={b} />
      <Face pts={rect(142, 128, 36, 4)} />
    </g>
  );
}

// ─── Modern Glass ───────────────────────────────────────────────────────
const MULLIONS =
  [112, 128, 144, 176, 192, 208].map((x) => `M${x} 28V96`).join('') +
  [38, 48, 58, 68, 78, 88].map((y) => `M96 ${y}H224`).join('');

export function GlassFront(b: Brand) {
  return (
    <g>
      <Face
        pts={[
          [224, 28],
          [238, 22],
          [238, 132],
          [224, 132],
        ]}
        density="medium"
      />
      <path d="M231 25v107" class="art-line art-fine" />
      <Face
        pts={[
          [92, 22],
          [106, 16],
          [242, 16],
          [228, 22],
        ]}
        density="light"
      />
      <Face pts={rect(92, 22, 136, 6)} density="dense" angle={0} />
      <Glass pts={rect(96, 28, 128, 104)} />
      <Hatch
        pts={[
          [100, 96],
          [128, 30],
          [144, 30],
          [116, 96],
        ]}
        density="light"
        angle={-40}
      />
      <Hatch
        pts={[
          [170, 96],
          [196, 30],
          [204, 30],
          [178, 96],
        ]}
        density="light"
        angle={-40}
      />
      <path d={MULLIONS} class="art-line art-fine" />
      <path d="M96 48H224M96 68H224M96 88H224" class="art-line" />
      <Seal x={160} y={58} r={8} brand={b} />
      <Face pts={rect(124, 96, 72, 4)} density="dense" angle={0} />
      <Hatch pts={rect(124, 100, 72, 4)} density="medium" />
      <path d="M148 132v-26h24v26M160 106v26M152 116c4 6 12 6 16 0" class="art-line art-fine" />
      <path d="M62 132v-14M62 104a9 9 0 1 0 .1 0M62 108a5 5 0 1 0 .1 0" class="art-line art-fine" />
    </g>
  );
}
