// Hero vignette for a vacation home (ART_DIRECTION §3): a lakeside retreat
// under engraved mountains, with pines and rippled water. Once you have
// rebuilt it, the cabin becomes a larger two-storey house with a glass gable,
// so the art shows what you own.
import { memo } from 'preact/compat';
import { rect, waveLine, type Pt } from '../../art/engrave';
import { Face, Hatch, Vignette } from '../components';

const MOUNTAINS: Pt[] = [
  [0, 96],
  [40, 52],
  [70, 74],
  [112, 34],
  [150, 70],
  [196, 44],
  [240, 78],
  [282, 50],
  [320, 80],
  [320, 106],
  [0, 106],
];
const WATER = [140, 146, 152, 158].map((y, i) => waveLine(0, 320, y, 1, 22 + i * 4, i)).join('');

function Pine(p: { x: number; h: number }) {
  const { x, h } = p;
  const pts: Pt[] = [
    [x, 132 - h],
    [x + h * 0.32, 132 - 8],
    [x - h * 0.32, 132 - 8],
  ];
  return (
    <g>
      <Face pts={pts} density="medium" angle={-35} outline="fine" />
      <path d={`M${x} 132v-8`} class="art-line" />
    </g>
  );
}

function Cabin() {
  return (
    <g>
      <Face pts={rect(120, 92, 72, 40)} />
      <Hatch pts={rect(120, 92, 72, 40)} density="light" angle={0} />
      <Face
        pts={[
          [112, 94],
          [156, 62],
          [200, 94],
        ]}
        density="dense"
        angle={-30}
      />
      <Face pts={rect(130, 104, 18, 14)} outline="fine" />
      <path d="M130 104h18v14h-18z" class="art-tint" />
      <Face pts={rect(164, 104, 16, 28)} density="medium" angle={90} />
      <path d="M180 74v-14h8v20" class="art-line" />
    </g>
  );
}

function Villa() {
  return (
    <g>
      <Face pts={rect(96, 70, 128, 62)} />
      <Hatch pts={rect(176, 70, 48, 62)} density="light" angle={0} />
      <Face
        pts={[
          [88, 72],
          [136, 34],
          [184, 72],
        ]}
        density="dense"
        angle={-30}
      />
      <Face
        pts={[
          [104, 70],
          [136, 44],
          [168, 70],
        ]}
      />
      <path d="M104 70l32-26 32 26z" class="art-tint" />
      <path d="M136 44v26M120 57v13M152 57v13M104 70h64" class="art-line art-fine" />
      <Face
        pts={[
          [176, 70],
          [232, 70],
          [228, 60],
          [180, 60],
        ]}
        density="medium"
        angle={0}
      />
      {[104, 136].map((x) => (
        <g>
          <path d={`M${x} 84h24v18h-24z`} class="art-tint" />
          <path d={`M${x} 84h24v18h-24zM${x + 12} 84v18`} class="art-line art-fine" />
        </g>
      ))}
      <Face pts={rect(188, 98, 18, 34)} density="medium" angle={90} />
      <path d="M86 112h148M86 118h148" class="art-line art-fine" />
      {[90, 120, 150, 180, 210, 230].map((x) => (
        <path d={`M${x} 112v20`} class="art-line art-fine" />
      ))}
    </g>
  );
}

export const VacationHomeArt = memo(function VacationHomeArt(p: { rebuilt?: boolean }) {
  return (
    <Vignette label={p.rebuilt ? 'A rebuilt lakeside house' : 'A lakeside cabin'} bare>
      <Face pts={MOUNTAINS} density="light" angle={60} outline="fine" />
      <Hatch
        pts={[
          [112, 34],
          [150, 70],
          [132, 70],
        ]}
        density="medium"
      />
      <Hatch
        pts={[
          [196, 44],
          [240, 78],
          [214, 78],
        ]}
        density="medium"
      />
      <path d="M0 132h320" class="art-line" />
      <path d="M0 132h320v30H0z" class="art-tint" />
      <path d={WATER} class="art-line art-fine" />
      <Pine x={44} h={64} />
      <Pine x={70} h={48} />
      <Pine x={262} h={70} />
      <Pine x={290} h={52} />
      {p.rebuilt ? <Villa /> : <Cabin />}
      {/* A jetty into the lake. */}
      <path d="M226 136h50M232 136v8M252 136v8M272 136v8" class="art-line" />
    </Vignette>
  );
});
