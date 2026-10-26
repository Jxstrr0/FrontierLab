// Wall pieces for the engraved interiors (ART_DIRECTION §3): a clock, framed
// engravings and certificates, boards (pinned notes, a whiteboard sketch, a
// chart, a live ticker) and a panelled door. They are decals in wall units
// (x along the wall from its corner, up is −y) placed inside an IsoRoom's
// back or left wall.

export function WallClock(p: { x: number; y: number }) {
  return (
    <g>
      <circle cx={p.x} cy={p.y} r="4.2" class="art-paper" />
      <circle cx={p.x} cy={p.y} r="4.2" class="art-line art-fine" />
      <path d={`M${p.x} ${p.y}v-2.4`} class="art-line art-fine" />
      <path d={`M${p.x} ${p.y}v-3.4`} class="art-line art-fine in-hand" />
    </g>
  );
}

/** A framed engraving (a little landscape) or a certificate. */
export function Frame(p: { x: number; y: number; w: number; h: number; kind?: 'scene' | 'text' }) {
  const { x, y, w, h } = p;
  const box = `M${x} ${y}h${w}v${h}h${-w}z`;
  const inner =
    p.kind === 'text'
      ? `M${x + 2} ${y + 2.5}h${w - 4}M${x + 2} ${y + 4.5}h${w - 6}M${x + w / 2 - 1.5} ${y + h - 2.5}h3`
      : `M${x + 1.5} ${y + h - 2}l${w * 0.3} ${-h * 0.45}l${w * 0.2} ${h * 0.25}l${w * 0.2} ${-h * 0.35}l${w * 0.25} ${h * 0.55}`;
  return (
    <g>
      <path d={box} class="art-paper" />
      <path
        d={`${box}M${x + 1} ${y + 1}h${w - 2}v${h - 2}h${-(w - 2)}z${inner}`}
        class="art-line art-fine"
      />
    </g>
  );
}

/** A pinboard with notes (HR), a whiteboard sketch (products) or a chart (risk, treasury). */
export function Board(p: {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'notes' | 'sketch' | 'chart' | 'ticker';
}) {
  const { x, y, w, h } = p;
  const box = `M${x} ${y}h${w}v${h}h${-w}z`;
  let inner = '';
  if (p.kind === 'notes') {
    for (let n = 0; n < 5; n++)
      inner += `M${x + 2 + (n % 3) * (w / 3.2)} ${y + 2 + Math.floor(n / 3) * (h / 2.2)}h${w / 4.2}v${h / 3}h${-w / 4.2}z`;
  } else if (p.kind === 'sketch') {
    inner = `M${x + 3} ${y + h - 3}h${w * 0.3}v${-h * 0.4}h${w * 0.3}M${x + w * 0.62} ${y + 3}a3 3 0 1 0 0.1 0M${x + 3} ${y + 4}h${w * 0.3}`;
  } else {
    const pts = [0.75, 0.6, 0.68, 0.42, 0.5, 0.3, 0.36, 0.2];
    inner = pts
      .map(
        (v, n) =>
          `${n ? 'L' : 'M'}${(x + 2 + (n * (w - 4)) / (pts.length - 1)).toFixed(1)} ${(y + v * h).toFixed(1)}`,
      )
      .join('');
  }
  return (
    <g>
      <path d={box} class={p.kind === 'ticker' ? 'art-solid' : 'art-paper'} />
      {p.kind === 'ticker' && <path d={box} class="art-paper" style={{ opacity: 0.12 }} />}
      <path d={box} class="art-line art-fine" />
      <path
        d={inner}
        class={p.kind === 'ticker' ? 'in-ticker' : 'art-line art-fine'}
        style={
          p.kind === 'ticker'
            ? { fill: 'none', stroke: 'var(--brass)', strokeWidth: 0.8 }
            : undefined
        }
      />
    </g>
  );
}

/** A panelled door with a handle, ajar when `open`. */
export function Door(p: { x: number; w: number; h: number; open?: boolean }) {
  const { x, w, h } = p;
  const box = `M${x} 0V${-h}h${w}V0`;
  return (
    <g>
      <path d={`M${x} 0V${-h}h${w}V0z`} class="art-paper" />
      {p.open && <path d={`M${x + w * 0.15} 0V${-h + 1}h${w * 0.85}V0z`} class="art-tint" />}
      <path
        d={`${box}M${x + 2} -2V${-h + 2}h${w - 4}V-2M${x + w - 3.5} ${-h * 0.48}h1.6`}
        class="art-line art-fine"
      />
    </g>
  );
}
