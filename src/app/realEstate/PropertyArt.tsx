// Hero vignette for a real-estate building (ART_DIRECTION §3): an engraved
// commercial block whose height follows its floor space, with a "For sale"
// board while listed and your bank's seal over the door once you own it.
import { memo } from 'preact/compat';
import { rect } from '../../art/engrave';
import { Face, Hatch, Vignette } from '../components';

/** Floor space per drawn storey, and the storey limits. */
const SQM_PER_STOREY = 1800;
const STOREYS = { min: 2, max: 8, h: 11 } as const;

export const PropertyArt = memo(function PropertyArt(p: {
  sqm: number;
  status: 'owned' | 'listed' | 'none';
  ink?: string;
  monogram?: string;
}) {
  const storeys = Math.max(STOREYS.min, Math.min(STOREYS.max, Math.round(p.sqm / SQM_PER_STOREY)));
  const top = 132 - 14 - storeys * STOREYS.h;
  const x = 104;
  const w = 112;
  const win: string[] = [];
  for (let f = 0; f < storeys; f++) {
    const y = top + f * STOREYS.h + 3;
    for (let c = 0; c < 7; c++) win.push(`M${x + 6 + c * 15.2} ${y}h9v6h-9z`);
  }
  return (
    <Vignette label={`A ${storeys}-storey building${p.status === 'listed' ? ', for sale' : ''}`}>
      <path d="M0 132h320" class="art-line" />
      {/* Neighbours. */}
      <g class="art-faint">
        <Face pts={rect(22, 70, 66, 62)} density="light" angle={90} />
        <Face pts={rect(236, 84, 64, 48)} density="light" angle={90} />
      </g>
      {/* The building: side return, front, cornice and shopfront. */}
      <Face
        pts={[
          [x + w, top],
          [x + w + 10, top - 6],
          [x + w + 10, 132],
          [x + w, 132],
        ]}
        density="medium"
      />
      <Face pts={rect(x, top, w, 132 - top)} />
      <path d={win.join('')} class="art-tint" />
      <path d={win.join('')} class="art-line art-fine" />
      <Face pts={rect(x - 4, top - 6, w + 8, 6)} density="dense" angle={0} />
      <Face pts={rect(x, 118, w, 14)} density="medium" angle={90} />
      <path d={`M${x + 46} 132v-14h20v14`} class="art-paper" />
      <path d={`M${x + 46} 132v-14h20v14M${x + 56} 118v14`} class="art-line art-fine" />
      {p.status === 'owned' && p.ink && (
        <g>
          <circle cx={x + 56} cy="111" r="5" style={{ fill: p.ink }} class="art-brand" />
          <text
            x={x + 56}
            y="113"
            text-anchor="middle"
            class="art-brand-text"
            style={{ fontSize: '4.5px' }}
          >
            {p.monogram}
          </text>
        </g>
      )}
      {p.status === 'listed' && (
        <g>
          <path d="M262 132v-14" class="art-line" />
          <Face pts={rect(240, 96, 46, 22)} outline="fine" />
          <path d="M243 99h40v16h-40z" class="art-line art-fine" />
          <text x="263" y="110" text-anchor="middle" class="art-text">
            For sale
          </text>
        </g>
      )}
      <Hatch pts={rect(x, 126, w, 6)} density="dense" angle={0} />
    </Vignette>
  );
});
