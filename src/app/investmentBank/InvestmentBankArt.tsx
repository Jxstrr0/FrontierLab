// Hero vignette for an investment bank (ART_DIRECTION §3: "investment bank
// (trading floor)"): a double-height trading floor with a ticker board and
// world clocks on the back wall and two rows of trading desks with screens
// and traders, engraved in the city ink on ivory.
import { memo } from 'preact/compat';
import { rect, type Pt } from '../../art/engrave';
import { Face, Hatch, Vignette } from '../components';

const CLOCKS = [70, 100, 130];
const BOARD = { x: 150, y: 10, w: 132, h: 46 } as const;
/** Ticker rows on the board: little blocks of figures. */
const TICKER = Array.from({ length: 3 }, (_, r) =>
  Array.from(
    { length: 7 },
    (_, c) => `M${BOARD.x + 8 + c * 17} ${BOARD.y + 30 + r * 5}h${10 - ((c + r) % 3) * 2}`,
  ).join(''),
).join('');
const CHART = 'M158 34l10-6 8 4 12-12 10 6 14-10 10 4 14-8 10 2 16-6';

/** One trading desk in perspective: a slab, two or three screens and maybe a trader. */
function Desk(p: { x: number; y: number; s: number; trader: number }) {
  const { x, y, s } = p;
  const top: Pt[] = [
    [x, y],
    [x + 56 * s, y],
    [x + 60 * s, y + 6 * s],
    [x - 4 * s, y + 6 * s],
  ];
  const screens = [0, 1, 2].map((k) => rect(x + (4 + k * 17) * s, y - 13 * s, 14 * s, 10 * s));
  return (
    <g>
      {p.trader > 0 && (
        <g>
          <circle cx={x + 26 * s} cy={y - 20 * s} r={3.4 * s} class="art-paper" />
          <circle cx={x + 26 * s} cy={y - 20 * s} r={3.4 * s} class="art-line art-fine" />
          {p.trader > 1 && (
            <path d={`M${x + 31 * s} ${y - 14 * s}l6 ${-10 * s}`} class="art-line" />
          )}
        </g>
      )}
      {screens.map((sc) => (
        <g>
          <Face pts={sc} density="dense" angle={0} outline="fine" />
          <path d={`M${sc[3]![0] + 6 * s} ${sc[3]![1]}v${3 * s}`} class="art-line art-fine" />
        </g>
      ))}
      <Face pts={top} />
      <Face pts={rect(x - 4 * s, y + 6 * s, 64 * s, 8 * s)} density="medium" angle={90} />
    </g>
  );
}

export const InvestmentBankArt = memo(function InvestmentBankArt() {
  return (
    <Vignette label="A trading floor with a ticker board" bare>
      {/* Back wall, pilasters and the floor. */}
      <Hatch pts={rect(0, 62, 320, 22)} density="light" angle={90} />
      <path d="M0 62h320" class="art-line art-fine" />
      <path d="M0 84h320" class="art-line" />
      {[24, 296].map((x) => (
        <Face pts={rect(x - 8, -8, 16, 92)} density="medium" angle={90} />
      ))}
      {/* World clocks. */}
      {CLOCKS.map((x, i) => (
        <g>
          <circle cx={x} cy="30" r="10" class="art-paper" />
          <circle cx={x} cy="30" r="10" class="art-line" />
          <path d={`M${x} 30v-6M${x} 30l${3 + i} ${2 - i}`} class="art-line art-fine" />
        </g>
      ))}
      {/* The ticker board. */}
      <Face pts={rect(BOARD.x, BOARD.y, BOARD.w, BOARD.h)} density="dense" angle={0} />
      <path
        d={`M${BOARD.x + 4} ${BOARD.y + 4}h${BOARD.w - 8}v20h${-(BOARD.w - 8)}z`}
        class="art-paper"
      />
      <path d={CHART} class="art-line" />
      <path d={TICKER} class="art-line art-fine" style={{ stroke: 'var(--ivory)' }} />
      {/* Floor and two rows of desks, back row first. */}
      <Hatch pts={rect(0, 84, 320, 78)} density="light" angle={-20} />
      {[44, 116, 188].map((x, i) => (
        <Desk x={x} y={98} s={0.85} trader={(i + 1) % 3} />
      ))}
      {[20, 112, 204].map((x, i) => (
        <Desk x={x} y={128} s={1.25} trader={1 + (i % 2)} />
      ))}
    </Vignette>
  );
});
