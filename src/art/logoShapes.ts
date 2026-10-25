// The outline of the bank's logo shape (CONTENT §7b) as an SVG path, centred
// on (cx, cy) and fitting a circle of radius r. The Medallion, the seal on the
// branch fronts and the plaque over the counter all draw this same outline, so
// the shape chosen at New Game reads the same everywhere it appears.
import type { LogoShape } from '../data/types';

const f = (n: number) => +n.toFixed(2);

function polygon(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('') + 'Z';
}

/** Twelve shallow scallops around a circle, like the edge of a wax seal. */
function rosette(cx: number, cy: number, r: number): string {
  const n = 12;
  const rr = r * 0.87;
  const arc = r * 0.25;
  let d = '';
  for (let k = 0; k <= n; k++) {
    const a = (Math.PI * 2 * k) / n - Math.PI / 2;
    const x = f(cx + rr * Math.cos(a));
    const y = f(cy + rr * Math.sin(a));
    d += k === 0 ? `M${x} ${y}` : `A${f(arc)} ${f(arc)} 0 0 1 ${x} ${y}`;
  }
  return d + 'Z';
}

export function logoPath(shape: LogoShape, cx: number, cy: number, r: number): string {
  switch (shape) {
    case 'shield': {
      const w = r * 0.94;
      const top = f(cy - r * 0.86);
      const waist = f(cy + r * 0.05);
      const bulge = f(cy + r * 0.72);
      return (
        `M${f(cx - w)} ${top}H${f(cx + w)}V${waist}` +
        `Q${f(cx + w)} ${bulge} ${f(cx)} ${f(cy + r)}` +
        `Q${f(cx - w)} ${bulge} ${f(cx - w)} ${waist}Z`
      );
    }
    case 'lozenge':
      return polygon([
        [cx, cy - r],
        [cx + r * 0.94, cy],
        [cx, cy + r],
        [cx - r * 0.94, cy],
      ]);
    case 'hex':
      return polygon(
        Array.from({ length: 6 }, (_, k) => {
          const a = (Math.PI / 3) * k;
          return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        }),
      );
    case 'plaque': {
      const h = r * 0.92;
      const c = r * 0.32;
      return polygon([
        [cx - h + c, cy - h],
        [cx + h - c, cy - h],
        [cx + h, cy - h + c],
        [cx + h, cy + h - c],
        [cx + h - c, cy + h],
        [cx - h + c, cy + h],
        [cx - h, cy + h - c],
        [cx - h, cy - h + c],
      ]);
    }
    case 'rosette':
      return rosette(cx, cy, r);
    default:
      return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  }
}

/** Where the monogram sits best: a shield's visual centre is a little high. */
export function logoTextShift(shape: LogoShape, r: number): number {
  return shape === 'shield' ? -r * 0.07 : 0;
}
