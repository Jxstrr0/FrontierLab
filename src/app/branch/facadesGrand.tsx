// Branch exteriors, part 2 (ART_DIRECTION §3, CONTENT §7): Classic Columns
// (pediment and four columns) and Deco Tower Front (stepped crown with a
// sunburst over the door), in the same 320 × 150 vignette box.
import { hatch, poly, rect, type Pt } from '../../art/engrave';
import { Face, Hatch } from '../components/Vignette';
import { arch, Seal, type Brand } from './facadeParts';

// ─── Classic Columns ────────────────────────────────────────────────────
const COLUMNS = [104, 136, 184, 216];

export function Columns(b: Brand) {
  return (
    <g>
      <Face pts={rect(96, 64, 128, 50)} density="dense" angle={90} />
      <Face pts={rect(148, 80, 24, 33)} />
      <path
        d="M152 84h7v12h-7zM161 84h7v12h-7zM152 100h7v10h-7zM161 100h7v10h-7z"
        class="art-line art-fine"
      />
      {COLUMNS.map((x) => (
        <g>
          <Face pts={rect(x - 6, 68, 12, 43)} outline="fine" />
          <Hatch pts={rect(x + 2, 68, 4, 43)} density="medium" angle={90} />
          <path d={`M${x - 3} 69v41M${x} 69v41`} class="art-line art-fine" />
          <Face pts={rect(x - 8, 63, 16, 5)} density="light" angle={0} />
          <Face pts={rect(x - 7, 111, 14, 2)} />
        </g>
      ))}
      <Face pts={rect(86, 54, 148, 9)} />
      <path d="M86 58h148" class="art-line art-fine" />
      <Face
        pts={[
          [82, 54],
          [160, 26],
          [238, 54],
        ]}
      />
      <Hatch
        pts={[
          [98, 51],
          [160, 31],
          [222, 51],
        ]}
        density="light"
      />
      <path
        d={poly([
          [98, 51],
          [160, 31],
          [222, 51],
        ])}
        class="art-line art-fine"
      />
      <Seal x={160} y={43} r={6} brand={b} />
      <Face pts={rect(88, 113, 144, 5)} />
      <Face pts={rect(82, 118, 156, 6)} />
      <Face pts={rect(76, 124, 168, 8)} />
      <Hatch pts={rect(220, 118, 18, 14)} density="medium" angle={0} />
    </g>
  );
}

// ─── Deco Tower Front ───────────────────────────────────────────────────
const TOWER: Pt[] = [
  [108, 132],
  [108, 46],
  [118, 46],
  [118, 34],
  [128, 34],
  [128, 22],
  [140, 22],
  [140, 10],
  [180, 10],
  [180, 22],
  [192, 22],
  [192, 34],
  [202, 34],
  [202, 46],
  [212, 46],
  [212, 132],
];
const PIERS = [116, 132, 148, 172, 188, 204];
const RAYS = Array.from({ length: 11 }, (_, k) => {
  const t = Math.PI + (k / 10) * Math.PI;
  return `M${160 + 7 * Math.cos(t)} ${104 + 7 * Math.sin(t)}L${(160 + 19 * Math.cos(t)).toFixed(1)} ${(104 + 19 * Math.sin(t)).toFixed(1)}`;
}).join('');
const CHEVRONS = Array.from({ length: 5 }, (_, i) => `M${144 + i * 8} 18l4-5 4 5`).join('');

export function Deco(b: Brand) {
  return (
    <g>
      {[70, 212].map((x) => (
        <g>
          <Face pts={rect(x, 84, 38, 48)} />
          <path d={hatch(rect(x, 84, 38, 48), 6, 0)} class="art-hatch" style={{ opacity: 0.5 }} />
        </g>
      ))}
      <Face pts={TOWER} />
      {[
        rect(202, 46, 10, 86),
        rect(192, 34, 10, 12),
        rect(180, 22, 12, 12),
        rect(170, 10, 10, 12),
      ].map((r) => (
        <Hatch pts={r} density="medium" />
      ))}
      {PIERS.slice(0, -1).map((x, i) => {
        const w = (PIERS[i + 1] ?? x) - x - 4;
        return w > 4 ? (
          <Face pts={rect(x + 2, 52, w, 30)} density="dense" angle={90} outline="fine" />
        ) : null;
      })}
      <path d="M118 62h84M118 72h84" class="art-line art-fine" />
      <path d={CHEVRONS} class="art-line art-fine" />
      <path d="M118 40h84M128 28h64" class="art-line art-fine" />
      <path d={poly(arch(140, 104, 40, 20))} class="art-line art-fine" />
      <path d={RAYS} class="art-line art-fine" />
      <Seal x={160} y={98} r={5} brand={b} />
      <Face pts={rect(146, 104, 28, 28)} density="dense" angle={90} />
      <path d="M160 104v28M144 104h32" class="art-line" />
    </g>
  );
}
