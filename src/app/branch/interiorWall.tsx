// Wall pieces of the branch interior (ART_DIRECTION §3, "Branch interior"):
// the vault door in each fit-out's style (steel, time-lock with its dial,
// fortress with bolts), the safe-deposit wall that grows with the vault, and
// the bank's plaque over the counter. Decals in wall units (x along the wall,
// up is −y) for the IsoRoom's back wall.

/** The vault door on the back wall (decal units), by fit-out; the back-office safe has none. */
export function VaultDoor(p: { x: number; s: number; id: string }) {
  const { x, s } = p;
  if (p.id === 'vlt_safe') return null;
  const round = p.id !== 'vlt_steel';
  const r = (p.id === 'vlt_fortress' ? 0.8 : 0.66) * s;
  const cx = x + r;
  const cy = -r - 0.12 * s;
  const spokes = [0, 60, 120]
    .map((a) => {
      const t = (a * Math.PI) / 180;
      const dx = Math.cos(t) * r * 0.32;
      const dy = Math.sin(t) * r * 0.32;
      return `M${(cx - dx).toFixed(1)} ${(cy - dy).toFixed(1)}L${(cx + dx).toFixed(1)} ${(cy + dy).toFixed(1)}`;
    })
    .join('');
  const bolts =
    p.id === 'vlt_fortress'
      ? Array.from({ length: 10 }, (_, n) => {
          const t = (n / 10) * Math.PI * 2;
          return `M${(cx + Math.cos(t) * r * 0.82).toFixed(1)} ${(cy + Math.sin(t) * r * 0.82).toFixed(1)}h0.1`;
        }).join('')
      : '';
  return (
    <g>
      {round ? (
        <g>
          <circle cx={cx} cy={cy} r={r + 2} class="art-solid" />
          <circle cx={cx} cy={cy} r={r} class="art-paper" />
          <circle cx={cx} cy={cy} r={r} class="art-tint" />
          <circle cx={cx} cy={cy} r={r} class="art-line" />
          <circle cx={cx} cy={cy} r={r * 0.62} class="art-line art-fine" />
        </g>
      ) : (
        <g>
          <path d={`M${x} 0V${-2 * r}h${2 * r}V0z`} class="art-paper" />
          <path d={`M${x} 0V${-2 * r}h${2 * r}V0z`} class="art-tint" />
          <path
            d={`M${x} 0V${-2 * r}h${2 * r}V0zM${x + 2} -2V${-2 * r + 2}h${2 * r - 4}V-2`}
            class="art-line"
          />
        </g>
      )}
      <path d={spokes} class="art-line" />
      <circle cx={cx} cy={cy} r={r * 0.12} class="art-solid" />
      {bolts && <path d={bolts} class="art-line" style={{ strokeWidth: 1.6 }} />}
      {p.id === 'vlt_timelock' && (
        <g>
          <circle cx={cx - r - 6} cy={cy - r * 0.5} r="3.2" class="art-paper art-line art-fine" />
          <path d={`M${cx - r - 6} ${cy - r * 0.5}v-2.2`} class="art-line art-fine in-hand" />
        </g>
      )}
    </g>
  );
}

/** Safe-deposit boxes on the wall: a grid of small doors that grows with the vault. */
export function DepositBoxes(p: { x: number; s: number; boxes: number }) {
  if (p.boxes <= 0) return null;
  const cols = p.boxes >= 600 ? 6 : p.boxes >= 300 ? 5 : 4;
  const rows = p.boxes >= 300 ? 5 : 4;
  const cw = 0.22 * p.s;
  const ch = 0.2 * p.s;
  const y0 = -0.35 * p.s - rows * ch;
  const lines: string[] = [];
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const x = p.x + c * cw;
      const y = y0 + r * ch;
      lines.push(
        `M${x.toFixed(1)} ${y.toFixed(1)}h${cw.toFixed(1)}v${ch.toFixed(1)}h${(-cw).toFixed(1)}zM${(x + cw * 0.4).toFixed(1)} ${(y + ch * 0.5).toFixed(1)}h${(cw * 0.2).toFixed(1)}`,
      );
    }
  const box = `M${p.x} ${y0}h${cols * cw}v${rows * ch}h${-cols * cw}z`;
  return (
    <g>
      <path d={box} class="art-paper" />
      <path d={lines.join('')} class="art-line art-fine" />
    </g>
  );
}

/** The bank's plaque over the counter: a medallion in the brand ink with the monogram. */
export function BrandPlaque(p: { x: number; y: number; r: number; ink: string; monogram: string }) {
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={p.r + 1.6} class="art-paper art-line art-fine" />
      <circle cx={p.x} cy={p.y} r={p.r} style={{ fill: p.ink }} class="in-brand" />
      <text x={p.x} y={p.y + 2.4} text-anchor="middle" class="in-brand-text">
        {p.monogram}
      </text>
    </g>
  );
}
