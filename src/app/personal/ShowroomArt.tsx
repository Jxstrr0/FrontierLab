// Hero vignette for a car dealer (ART_DIRECTION §3: "car dealer (showroom)"):
// a glass showroom with two cars on display, a pennant line and a sign pylon,
// engraved in the city ink on ivory.
import { memo } from 'preact/compat';
import { rect } from '../../art/engrave';
import { Face, Hatch, Vignette } from '../components';

/** The same silhouettes as the showroom cards (CarArt), in a 100 × 50 box. */
const SPORT =
  'M6 40h8a7 7 0 0 1 14 0h44a7 7 0 0 1 14 0h8v-6c0-3-2-5-6-6l-14-3-12-9c-3-2-6-3-10-3H40c-5 0-9 2-13 5l-8 6-9 2c-3 1-4 3-4 6z';
const CLASSIC =
  'M8 40h7a7 7 0 0 1 14 0h40a7 7 0 0 1 14 0h8v-5c0-4-3-6-8-7l-10-2c-4-6-10-10-20-10H44c-8 0-13 4-17 10l-11 2c-5 1-8 4-8 7z';
const PENNANTS = Array.from({ length: 12 }, (_, i) => {
  const x = 66 + i * 16;
  return `M${x} 40l8 9 8-9`;
}).join('');
const MULLIONS = [100, 140, 180, 220].map((x) => `M${x} 58v68`).join('');

function Car(p: { d: string; x: number; flip?: boolean }) {
  const t = `translate(${p.x} 92) scale(${p.flip ? -0.62 : 0.62} 0.62)`;
  return (
    <g transform={t}>
      <path d={p.d} class="art-paper" />
      <path d={p.d} class="art-line" style={{ strokeWidth: 1.6 }} />
      <circle cx="21" cy="40" r="5" class="art-paper" />
      <circle cx="79" cy="40" r="5" class="art-paper" />
      <circle cx="21" cy="40" r="5" class="art-line" />
      <circle cx="79" cy="40" r="5" class="art-line" />
    </g>
  );
}

export const ShowroomArt = memo(function ShowroomArt() {
  return (
    <Vignette label="A car showroom">
      <path d="M0 132h320" class="art-line" />
      {/* Sign pylon. */}
      <Face pts={rect(28, 52, 18, 80)} density="medium" angle={90} />
      <Face pts={rect(22, 38, 30, 18)} outline="fine" />
      <path d="M28 47h18" class="art-line" />
      {/* Showroom: roof slab, glass front, side wall. */}
      <Face
        pts={[
          [256, 56],
          [270, 48],
          [270, 132],
          [256, 132],
        ]}
        density="medium"
      />
      <Face pts={rect(64, 56, 192, 76)} />
      <path d="M68 60h184v66H68z" class="art-tint" />
      <Hatch
        pts={[
          [78, 126],
          [104, 60],
          [116, 60],
          [90, 126],
        ]}
        density="light"
        angle={-40}
      />
      <Hatch
        pts={[
          [196, 126],
          [222, 60],
          [228, 60],
          [202, 126],
        ]}
        density="light"
        angle={-40}
      />
      <Car d={SPORT} x={74} />
      <Car d={CLASSIC} x={248} flip />
      <path d={MULLIONS} class="art-line art-fine" />
      <path d="M68 60h184v66H68z" class="art-line art-fine" />
      <Face pts={rect(58, 48, 216, 8)} density="dense" angle={0} />
      <path d="M64 40h192" class="art-line art-fine" />
      <path d={PENNANTS} class="art-line art-fine" />
      <Face pts={rect(60, 126, 200, 6)} density="light" angle={0} />
    </Vignette>
  );
});
