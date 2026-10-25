// Floor furniture for the engraved interiors (ART_DIRECTION §3): plants,
// cabinets, bookcases, a water cooler, server racks, an easel, a safe,
// benches and a huddle table. Props take grid cells (i, j) on an Iso
// projection; leaf sprays are drawn for a 15-unit cell and scaled by the
// room's step. Wall pieces live in isoWall.tsx.
import { IsoBox, isoPt, type Iso } from './isoKit';
import { EmptyChair, SeatedBack } from './isoPeople';

const k = (g: Iso) => g.step / 15;
const at = (g: Iso, i: number, j: number, z = 0) => {
  const [x, y] = isoPt(g, i, j, z);
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k(g).toFixed(3)})`;
};

/** One almond leaf from the origin at `deg` (0 = straight up), `len` long. */
function leaf(deg: number, len: number): string {
  const r = (deg * Math.PI) / 180;
  const tx = Math.sin(r) * len;
  const ty = -Math.cos(r) * len;
  const nx = Math.cos(r) * len * 0.22;
  const ny = Math.sin(r) * len * 0.22;
  const f = (v: number) => v.toFixed(1);
  return `M0 0Q${f(tx / 2 + nx)} ${f(ty / 2 + ny)} ${f(tx)} ${f(ty)}Q${f(tx / 2 - nx)} ${f(ty / 2 - ny)} 0 0Z`;
}

const FERN = [-70, -45, -20, 5, 30, 55, 75].map((a, n) => leaf(a, 7 + (n % 3) * 1.5)).join('');
const PALM_STEM = 'M0 0q-0.4-4 0.6-8';
const PALM = [-100, -70, -40, -12, 15, 42, 70, 100]
  .map((a, n) => leaf(a, 9 + (n % 3) * 1.6))
  .join('');

/** A potted plant; `tall` is a floor palm on a stem, otherwise a bushy fern. */
export function Plant(p: { g: Iso; i: number; j: number; tall?: boolean }) {
  const { g } = p;
  return (
    <g transform={at(g, p.i, p.j)}>
      <path d="M-3.6 -6.5L-2.7 0h5.4l0.9-6.5z" class="art-paper" />
      <path d="M-3.6 -6.5L-2.7 0h5.4l0.9-6.5" class="art-line art-fine" />
      <path d="M-3 -4.5L-2.6 -0.6M-1.5 -5L-1.2 -0.4" class="art-hatch" />
      <ellipse cx="0" cy="-6.5" rx="3.6" ry="1.3" class="art-paper art-line art-fine" />
      <g class="in-sway" style={{ animationDelay: `${((p.i * 1.7 + p.j) % 3).toFixed(2)}s` }}>
        {p.tall ? (
          <g transform="translate(0 -7)">
            <path d={PALM_STEM} class="art-line art-fine" />
            <g transform="translate(0.6 -8)">
              <path d={PALM} class="art-tint" />
              <path d={PALM} class="art-line art-fine" />
            </g>
          </g>
        ) : (
          <g transform="translate(0 -7)">
            <path d={FERN} class="art-tint" />
            <path d={FERN} class="art-line art-fine" />
          </g>
        )}
      </g>
    </g>
  );
}

/** A filing cabinet (drawers on its front face). */
export function Cabinet(p: { g: Iso; i: number; j: number; h?: number }) {
  const { g } = p;
  const h = p.h ?? 0.9;
  const drawers = Math.round(h / 0.3);
  const lines: string[] = [];
  for (let n = 1; n < drawers; n++) {
    const a = isoPt(g, p.i, p.j + 0.5, (h * n) / drawers);
    const b = isoPt(g, p.i + 0.7, p.j + 0.5, (h * n) / drawers);
    lines.push(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`);
  }
  return (
    <g>
      <IsoBox g={g} i={p.i} j={p.j} w={0.7} d={0.5} h={h} left="light" fine />
      <path d={lines.join('')} class="art-line art-fine" />
    </g>
  );
}

/** An open bookcase: two shelves of books of mixed heights, a few lying flat. */
export function Shelf(p: { g: Iso; i: number; j: number; w: number }) {
  const { g } = p;
  const d = 0.35;
  const h = 0.8;
  const shelves = [0.06, 0.42];
  const face = (i: number, z: number) => isoPt(g, p.i + i, p.j + d, z);
  const rules = [...shelves, h - 0.04]
    .map((z) => {
      const a = face(0.04, z);
      const b = face(p.w - 0.04, z);
      return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
    })
    .join('');
  const books: { d: string; solid: boolean }[] = [];
  shelves.forEach((z0, row) => {
    let i = 0.08;
    let n = row * 5;
    while (i < p.w - 0.12) {
      const bw = 0.06 + (((n * 37) % 5) / 5) * 0.05;
      const bh = 0.2 + (((n * 53) % 7) / 7) * 0.1;
      if ((n * 29) % 9 === 4) {
        i += 0.12;
      } else {
        const pts = [face(i, z0), face(i + bw, z0), face(i + bw, z0 + bh), face(i, z0 + bh)];
        books.push({
          d:
            pts.map(([x, y], m) => `${m ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('') +
            'Z',
          solid: n % 4 === 1,
        });
        i += bw + 0.015;
      }
      n++;
    }
  });
  return (
    <g>
      <IsoBox g={g} i={p.i} j={p.j} w={p.w} d={d} h={h} left="none" fine />
      <path
        d={books
          .filter((b) => b.solid)
          .map((b) => b.d)
          .join('')}
        class="art-solid"
      />
      <path
        d={books
          .filter((b) => !b.solid)
          .map((b) => b.d)
          .join('')}
        class="art-tint"
      />
      <path d={books.map((b) => b.d).join('') + rules} class="art-line art-fine" />
    </g>
  );
}

export function WaterCooler(p: { g: Iso; i: number; j: number }) {
  const { g } = p;
  const [x, y] = isoPt(g, p.i + 0.2, p.j + 0.2, 0.75);
  return (
    <g>
      <IsoBox g={g} i={p.i} j={p.j} w={0.4} d={0.4} h={0.75} fine />
      <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k(g).toFixed(3)})`}>
        <path d="M-3 0v-5a3 3 0 0 1 6 0v5z" class="art-tint" />
        <path d="M-3 0v-5a3 3 0 0 1 6 0v5z" class="art-line art-fine" />
      </g>
    </g>
  );
}

/** A server rack with blinking status lights. */
export function Rack(p: { g: Iso; i: number; j: number; seed: number }) {
  const { g } = p;
  const leds = [0.3, 0.55, 0.8, 1.05].map((z, n) => {
    const [x, y] = isoPt(g, p.i + 0.15 + (n % 2) * 0.3, p.j + 0.5, z);
    return (
      <circle
        cx={x.toFixed(1)}
        cy={y.toFixed(1)}
        r={(0.7 * k(g)).toFixed(2)}
        class="in-led"
        style={{ animationDelay: `${((p.seed * 0.37 + n * 0.53) % 1.3).toFixed(2)}s` }}
      />
    );
  });
  return (
    <g>
      <IsoBox g={g} i={p.i} j={p.j} w={0.6} d={0.5} h={1.25} left="dense" right="medium" fine />
      {leds}
    </g>
  );
}

/** An easel with a poster on it (marketing). */
export function Easel(p: { g: Iso; i: number; j: number }) {
  const { g } = p;
  return (
    <g transform={at(g, p.i, p.j)}>
      <path d="M-4 0l3-17M4 0l-3-17M0 -17v17" class="art-line art-fine" />
      <path d="M-6 -8h12v-10h-12z" class="art-paper" />
      <path d="M-6 -8h12v-10h-12zM-4 -15h8M-4 -12.5h5M-4 -10h6" class="art-line art-fine" />
      <circle cx="3" cy="-11.5" r="1.6" class="in-glow" />
    </g>
  );
}

/** A strongbox with a dial (risk floor, a back-office safe). */
export function Safe(p: { g: Iso; i: number; j: number }) {
  const { g } = p;
  const [x, y] = isoPt(g, p.i + 0.3, p.j + 0.6, 0.35);
  return (
    <g>
      <IsoBox g={g} i={p.i} j={p.j} w={0.6} d={0.6} h={0.7} left="dense" right="light" />
      <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={(2.2 * k(g)).toFixed(2)} class="art-paper" />
      <circle
        cx={x.toFixed(1)}
        cy={y.toFixed(1)}
        r={(2.2 * k(g)).toFixed(2)}
        class="art-line art-fine"
      />
    </g>
  );
}

/** A bench, or with `soft` a sofa with arms and cushions. */
export function Bench(p: { g: Iso; i: number; j: number; w: number; soft?: boolean }) {
  const { g } = p;
  const arm = p.soft ? 0.14 : 0;
  return (
    <g>
      <IsoBox g={g} i={p.i} j={p.j} w={p.w} d={0.14} h={p.soft ? 0.62 : 0.55} left="light" fine />
      {p.soft && <IsoBox g={g} i={p.i} j={p.j + 0.14} w={arm} d={0.4} h={0.45} left="light" fine />}
      <IsoBox
        g={g}
        i={p.i + arm}
        j={p.j + 0.14}
        w={p.w - arm * 2}
        d={0.4}
        h={0.3}
        top={p.soft ? 'tint' : 'paper'}
        left="light"
        fine
      />
      {p.soft && (
        <IsoBox
          g={g}
          i={p.i + p.w - arm}
          j={p.j + 0.14}
          w={arm}
          d={0.4}
          h={0.45}
          left="light"
          fine
        />
      )}
    </g>
  );
}

/** A round table with chairs, for a huddle corner. */
export function Huddle(p: { g: Iso; i: number; j: number; people: number; hair: number }) {
  const { g } = p;
  const kk = k(g).toFixed(3);
  const [x, y] = isoPt(g, p.i, p.j, 0.36);
  const [bx, by] = isoPt(g, p.i, p.j);
  const rx = 0.55 * g.step;
  return (
    <g>
      <path d={`M${bx.toFixed(1)} ${by.toFixed(1)}V${y.toFixed(1)}`} class="art-line" />
      <ellipse
        cx={x.toFixed(1)}
        cy={y.toFixed(1)}
        rx={rx.toFixed(1)}
        ry={(rx / 2).toFixed(1)}
        class="art-paper"
      />
      <ellipse
        cx={x.toFixed(1)}
        cy={y.toFixed(1)}
        rx={rx.toFixed(1)}
        ry={(rx / 2).toFixed(1)}
        class="art-line art-fine"
      />
      <path
        d={`M${(x - rx * 0.3).toFixed(1)} ${(y - 1).toFixed(1)}h${(rx * 0.35).toFixed(1)}l1 1.2h${(-rx * 0.35).toFixed(1)}z`}
        class="art-tint art-line art-fine"
      />
      {p.people === 0 && (
        <g>
          <g
            transform={`translate(${isoPt(g, p.i, p.j + 0.7)
              .map((v) => v.toFixed(1))
              .join(' ')}) scale(${kk})`}
          >
            <EmptyChair />
          </g>
          <g
            transform={`translate(${isoPt(g, p.i + 0.7, p.j)
              .map((v) => v.toFixed(1))
              .join(' ')}) scale(${kk})`}
          >
            <EmptyChair />
          </g>
        </g>
      )}
      {p.people > 0 && (
        <g
          transform={`translate(${isoPt(g, p.i, p.j + 0.7)
            .map((v) => v.toFixed(1))
            .join(' ')}) scale(${kk})`}
        >
          <g class="in-breathe">
            <SeatedBack mood="good" hair={p.hair} />
          </g>
        </g>
      )}
      {p.people > 1 && (
        <g
          transform={`translate(${isoPt(g, p.i + 0.7, p.j)
            .map((v) => v.toFixed(1))
            .join(' ')}) scale(${kk})`}
        >
          <g class="in-breathe" style={{ animationDelay: '1.3s' }}>
            <SeatedBack mood="good" hair={p.hair + 3} />
          </g>
        </g>
      )}
    </g>
  );
}
