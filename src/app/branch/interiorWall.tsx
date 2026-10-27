// Wall pieces of the sales office interior (ART_DIRECTION §3, "Sales office
// interior"; re-skinned from the bank's vault in C8c): the machine room in each
// fit-out's style (a rack cabinet, or a glazed room of racks with a badge
// reader), the wall of server units that grows with it, and the lab's plaque
// over the counter. Decals in wall units (x along the wall,
// up is −y) for the IsoRoom's back wall.
import { logoPath, logoTextShift } from '../../art/logoShapes';
import type { LogoShape } from '../../data/types';

/** Rack cabinets (and the glazed machine room around them) per secure-room fit-out. */
const MACHINE_ROOM: Record<string, { racks: number; glazed: boolean; reader: boolean }> = {
  vlt_steel: { racks: 1, glazed: false, reader: false },
  vlt_timelock: { racks: 2, glazed: true, reader: true },
  vlt_fortress: { racks: 3, glazed: true, reader: true },
};

/**
 * The machine room on the back wall (decal units), by fit-out (C8c, in place of
 * the bank's vault door): a single rack cabinet with a perforated door, or a
 * glazed room of racks with blinking lights and a badge reader by the door.
 * The back-office option has none (a cabinet stands on the floor instead).
 */
export function MachineRoom(p: { x: number; s: number; id: string }) {
  const { x, s } = p;
  const spec = MACHINE_ROOM[p.id];
  if (!spec) return null;
  const w = (p.id === 'vlt_fortress' ? 1.6 : 1.32) * s;
  const h = 1.5 * s;
  const rw = (w - 0.2 * s) / spec.racks;
  const racks: string[] = [];
  const leds: [number, number][] = [];
  for (let k = 0; k < spec.racks; k++) {
    const rx = x + 0.1 * s + k * rw + rw * 0.12;
    const ww = rw * 0.76;
    const top = -h + 0.2 * s;
    racks.push(`M${rx.toFixed(1)} 0V${top.toFixed(1)}h${ww.toFixed(1)}V0`);
    for (let z = 0.25; z < 1.2; z += 0.18) {
      const y = -z * s;
      racks.push(`M${(rx + ww * 0.12).toFixed(1)} ${y.toFixed(1)}h${(ww * 0.76).toFixed(1)}`);
    }
    leds.push([rx + ww * 0.25, -0.62 * s], [rx + ww * 0.6, -0.98 * s]);
  }
  const frame = `M${x} 0V${-h}h${w}V0`;
  return (
    <g>
      <path d={`${frame}z`} class="art-paper" />
      {spec.glazed ? (
        <path d={`${frame}z`} class="art-glass" />
      ) : (
        <path d={`${frame}z`} class="art-tint" />
      )}
      <path d={racks.join('')} class="art-line art-fine" />
      {leds.map(([cx, cy], n) => (
        <circle
          cx={cx.toFixed(1)}
          cy={cy.toFixed(1)}
          r={(0.05 * s).toFixed(2)}
          class="in-led"
          style={{ animationDelay: `${(n * 0.41).toFixed(2)}s` }}
        />
      ))}
      <path d={frame} class="art-line" />
      {spec.glazed && (
        <path
          d={`M${x + w * 0.62} ${-h + 2}l${w * 0.18} ${h * 0.4}`}
          class="art-line art-fine art-faint"
        />
      )}
      {spec.reader && (
        <g>
          <path
            d={`M${x - 0.22 * s} ${-0.78 * s}h${0.12 * s}v${0.2 * s}h${-0.12 * s}z`}
            class="art-paper art-line art-fine"
          />
          <circle cx={x - 0.16 * s} cy={-0.72 * s} r={0.03 * s} class="in-led" />
        </g>
      )}
    </g>
  );
}

/** A wall of server units: a grid of shelves, each with a vent slit and a status light, that grows with the room. */
export function ServerWall(p: { x: number; s: number; boxes: number }) {
  if (p.boxes <= 0) return null;
  const cols = p.boxes >= 600 ? 6 : p.boxes >= 300 ? 5 : 4;
  const rows = p.boxes >= 300 ? 5 : 4;
  const cw = 0.22 * p.s;
  const ch = 0.2 * p.s;
  const y0 = -0.35 * p.s - rows * ch;
  const lines: string[] = [];
  const leds: [number, number][] = [];
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const x = p.x + c * cw;
      const y = y0 + r * ch;
      lines.push(
        `M${x.toFixed(1)} ${y.toFixed(1)}h${cw.toFixed(1)}v${ch.toFixed(1)}h${(-cw).toFixed(1)}zM${(x + cw * 0.4).toFixed(1)} ${(y + ch * 0.5).toFixed(1)}h${(cw * 0.45).toFixed(1)}`,
      );
      if ((c + r) % 2 === 0) leds.push([x + cw * 0.2, y + ch * 0.5]);
    }
  const box = `M${p.x} ${y0}h${cols * cw}v${rows * ch}h${-cols * cw}z`;
  return (
    <g>
      <path d={box} class="art-paper" />
      <path d={box} class="art-tint" />
      <path d={lines.join('')} class="art-line art-fine" />
      {leds.map(([cx, cy], n) => (
        <circle
          cx={cx.toFixed(1)}
          cy={cy.toFixed(1)}
          r={(0.03 * p.s).toFixed(2)}
          class="in-led"
          style={{ animationDelay: `${((n * 0.37) % 1.3).toFixed(2)}s` }}
        />
      ))}
    </g>
  );
}

/** The lab's plaque over the counter: its mark in the brand ink and logo shape. */
export function BrandPlaque(p: {
  x: number;
  y: number;
  r: number;
  ink: string;
  monogram: string;
  shape: LogoShape;
}) {
  return (
    <g>
      <path d={logoPath(p.shape, p.x, p.y, p.r + 1.6)} class="art-paper art-line art-fine" />
      <path d={logoPath(p.shape, p.x, p.y, p.r)} style={{ fill: p.ink }} class="in-brand" />
      <text
        x={p.x}
        y={p.y + 2.4 + logoTextShift(p.shape, p.r)}
        text-anchor="middle"
        class="in-brand-text"
      >
        {p.monogram}
      </text>
    </g>
  );
}
