// Hero vignette for a lobbying firm (ART_DIRECTION §3, "Other buildings"): a
// discreet terraced townhouse with a fanlight door, railings and a brass
// plate, the legislature's dome rising behind the rooftops. City ink on ivory.
import { memo } from 'preact/compat';
import { rect, type Pt } from '../../art/engrave';
import { Face, Hatch, Vignette } from '../components';

const DOME: Pt[] = Array.from({ length: 17 }, (_, i) => {
  const t = Math.PI + (i / 16) * Math.PI;
  return [246 + 34 * Math.cos(t), 54 + 30 * Math.sin(t)] as Pt;
});
const WINDOWS = [
  [112, 50],
  [148, 50],
  [184, 50],
  [112, 80],
  [184, 80],
] as const;
const RAILING = Array.from({ length: 23 }, (_, i) => `M${92 + i * 6} 132v-12`).join('');

export const LobbyingArt = memo(function LobbyingArt() {
  return (
    <Vignette label="A townhouse office with the legislature's dome behind">
      <path d="M0 132h320" class="art-line" />
      {/* The legislature behind, kept faint. */}
      <g class="art-faint">
        <Face pts={DOME} density="light" angle={0} />
        <Face pts={rect(204, 54, 84, 30)} density="medium" angle={90} />
        <path d="M246 24v-10M242 14h8" class="art-line" />
      </g>
      {/* Neighbouring terraces. */}
      <Face pts={rect(20, 44, 72, 88)} density="light" angle={90} />
      <Face pts={rect(228, 60, 76, 72)} density="light" angle={90} />
      {/* The townhouse. */}
      <Face pts={rect(92, 34, 136, 98)} />
      <Face pts={rect(88, 28, 144, 6)} density="dense" angle={0} />
      <path d="M92 70h136" class="art-line art-fine" />
      {WINDOWS.map(([x, y]) => (
        <g>
          <Face pts={rect(x, y, 22, 16)} density="dense" angle={90} outline="fine" />
          <path
            d={`M${x + 11} ${y}v16M${x} ${y + 8}h22M${x - 2} ${y + 16}h26`}
            class="art-line art-fine"
          />
        </g>
      ))}
      {/* Door with a fanlight and a brass plate. */}
      <Face pts={rect(148, 92, 24, 40)} density="dense" angle={90} />
      <path d="M146 92a14 12 0 0 1 28 0z" class="art-paper" />
      <path
        d="M146 92a14 12 0 0 1 28 0zM160 80v12M152 84l8 8M168 84l-8 8"
        class="art-line art-fine"
      />
      <Face pts={rect(178, 104, 10, 7)} density="light" angle={0} outline="fine" />
      <path d={RAILING} class="art-line art-fine" />
      <path d="M90 120h52M178 120h52" class="art-line" />
      <Hatch pts={rect(92, 124, 136, 8)} density="medium" angle={0} />
      {/* A street lamp. */}
      <path d="M270 132V92M264 92h12l-2-8h-8z" class="art-line" />
    </Vignette>
  );
});
