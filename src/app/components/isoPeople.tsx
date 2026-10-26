// Engraved people for the isometric interiors (ART_DIRECTION §3): a worker
// seen from behind at a desk, and a standing figure facing the viewer. Bodies
// take the team's mood tone (jade / brass / oxblood) or a plain ink wash for
// customers; hair varies by a stable index so a floor reads as a crowd of
// individuals. Drawn at the origin (feet or chair base on the floor) in screen
// units for a 15-unit cell; callers scale and place them.

export type Mood = 'good' | 'warn' | 'bad' | 'guest';

/** Hair: solid, bun, grey (hatched), long, bald, ponytail. */
const HAIR_STYLES = 6;

function BackHair(p: { v: number; cy: number }) {
  const { cy } = p;
  switch (p.v % HAIR_STYLES) {
    case 0:
      return <circle cx="0" cy={cy} r="2.6" class="art-solid" />;
    case 1:
      return (
        <g class="art-solid">
          <circle cx="0" cy={cy} r="2.6" />
          <circle cx="0" cy={cy - 2.9} r="1.3" />
        </g>
      );
    case 2:
      return (
        <g>
          <circle cx="0" cy={cy} r="2.6" class="art-paper" />
          <path d={`M-2 ${cy - 1.2}h4M-2.4 ${cy}h4.8M-2 ${cy + 1.2}h4`} class="art-line art-fine" />
          <circle cx="0" cy={cy} r="2.6" class="art-line art-fine" />
        </g>
      );
    case 3:
      return <path d={`M-2.6 ${cy}a2.6 2.6 0 0 1 5.2 0l0.4 4.2h-6z`} class="art-solid" />;
    case 4:
      return (
        <g>
          <circle cx="0" cy={cy} r="2.6" class="art-paper" />
          <path d={`M-2.5 ${cy + 0.8}a2.6 2.6 0 0 0 5 0`} class="art-solid" />
          <circle cx="0" cy={cy} r="2.6" class="art-line art-fine" />
        </g>
      );
    default:
      return (
        <g class="art-solid">
          <circle cx="0" cy={cy} r="2.6" />
          <path d={`M-0.6 ${cy + 1.5}q-0.2 2.6 0.8 4l0.9-0.4q-0.6-1.6-0.3-3.6z`} />
        </g>
      );
  }
}

function FrontHair(p: { v: number; cy: number }) {
  const { cy } = p;
  switch (p.v % HAIR_STYLES) {
    case 0:
      return <path d={`M-2.7 ${cy}a2.7 2.7 0 0 1 5.4 0q-2.7-1.4-5.4 0z`} class="art-solid" />;
    case 1:
      return (
        <g class="art-solid">
          <path d={`M-2.7 ${cy}a2.7 2.7 0 0 1 5.4 0q-2.7-1.2-5.4 0z`} />
          <circle cx="0" cy={cy - 3.1} r="1.2" />
        </g>
      );
    case 2:
      return <path d={`M-2.6 ${cy - 0.4}q2.6-3.4 5.2 0`} class="art-line art-fine" />;
    case 3:
      return (
        <path
          d={`M-2.9 ${cy + 3.4}v-3.4a2.9 2.9 0 0 1 5.8 0v3.4l-1-0.3v-2.6q-1.9-1.4-3.8 0v2.6z`}
          class="art-solid"
        />
      );
    case 4:
      return null;
    default:
      return (
        <g class="art-solid">
          <path d={`M-2.7 ${cy}a2.7 2.7 0 0 1 5.4 0q-2.7-1.2-5.4 0z`} />
          <path d={`M2.4 ${cy - 0.6}q1.8 1.4 1 3.6l-0.8-0.2q0.4-1.6-0.6-2.6z`} />
        </g>
      );
  }
}

/** A worker at a desk, seen from behind on a swivel chair; `typing` bobs gently. */
export function SeatedBack(p: { mood: Mood; hair: number; delay?: number }) {
  return (
    <g>
      <g class="in-type" style={{ animationDelay: `${(p.delay ?? 0).toFixed(2)}s` }}>
        <path
          d="M-3.6 -7.5L-3.9 -12.4Q0 -14.6 3.9 -12.4L3.6 -7.5Z"
          class={`in-body in-mood-${p.mood}`}
        />
        <path d="M-3.9 -11.6l-1.6 2.6M3.9 -11.6l1.6 2.6" class="art-line art-fine" />
        <BackHair v={p.hair} cy={-16.2} />
      </g>
      <path d="M-3.4 -3.6h6.8v-5.6h-6.8z" class="art-paper" />
      <path d="M-3.4 -3.6h6.8v-5.6h-6.8zM0 -3.6v3M-2.8 0.4l2.8-1 2.8 1" class="art-line art-fine" />
    </g>
  );
}

/** An empty swivel chair, pushed in. */
export function EmptyChair() {
  return (
    <path
      d="M-3 -3.2h6v-4.6h-6zM0 -3.2v2.8M-2.6 0.2l2.6-0.9 2.6 0.9"
      class="art-line art-fine in-empty"
    />
  );
}

/**
 * A standing figure facing the viewer. `carry` adds a folder (staff on the
 * move) or a bag (customers); `wave` raises an arm (a greeter).
 */
export function Standing(p: {
  mood: Mood;
  hair: number;
  carry?: 'folder' | 'bag';
  wave?: boolean;
}) {
  return (
    <g>
      <path d="M-1.5 0v-7.4M1.5 0v-7.4" class="art-line" />
      <path
        d="M-3.4 -6.8L-3.9 -14.2Q0 -16.4 3.9 -14.2L3.4 -6.8Z"
        class={`in-body in-mood-${p.mood}`}
      />
      {p.wave ? (
        <path d="M-3.9 -13.6l-1.2 6.2M3.9 -13.6l2.6 -4.2" class="art-line art-fine" />
      ) : (
        <path d="M-3.9 -13.6l-0.9 6.4M3.9 -13.6l0.9 6.4" class="art-line art-fine" />
      )}
      {p.carry === 'folder' && <path d="M2.6 -10.6h3.4v4.4h-3.4z" class="art-solid" />}
      {p.carry === 'bag' && (
        <g>
          <path d="M3.6 -8.2h3v3.6h-3z" class="art-paper" />
          <path d="M3.6 -8.2h3v3.6h-3zM4.4 -8.2q0.7-1.4 1.4 0" class="art-line art-fine" />
        </g>
      )}
      <circle cx="0" cy="-18.4" r="2.7" class="art-paper" />
      <circle cx="0" cy="-18.4" r="2.7" class="art-line art-fine" />
      <FrontHair v={p.hair} cy={-18.4} />
    </g>
  );
}

/** A person seated facing the viewer (a client in a chair, an advisor). */
export function SeatedFront(p: { mood: Mood; hair: number }) {
  return (
    <g>
      <path d="M-3.4 -9.6h6.8v-4.4h-6.8z" class="art-paper" />
      <path d="M-3.4 -9.6h6.8v-4.4h-6.8z" class="art-line art-fine" />
      <path
        d="M-3.2 -5.4L-3.6 -12.2Q0 -14.2 3.6 -12.2L3.2 -5.4Z"
        class={`in-body in-mood-${p.mood}`}
      />
      <path d="M-3.4 -5.4h6.8v1.6h-6.8zM-2.8 -3.8v3.8M2.8 -3.8v3.8" class="art-line art-fine" />
      <circle cx="0" cy="-15.8" r="2.6" class="art-paper" />
      <circle cx="0" cy="-15.8" r="2.6" class="art-line art-fine" />
      <FrontHair v={p.hair} cy={-15.8} />
    </g>
  );
}

/** A standing figure seen from behind (a customer at the counter or in line). */
export function StandingBack(p: { mood: Mood; hair: number; carry?: 'bag' }) {
  return (
    <g>
      <path d="M-1.5 0v-7.4M1.5 0v-7.4" class="art-line" />
      <path
        d="M-3.4 -6.8L-3.9 -14.2Q0 -16.4 3.9 -14.2L3.4 -6.8Z"
        class={`in-body in-mood-${p.mood}`}
      />
      <path d="M-3.9 -13.6l-0.7 6.4M3.9 -13.6l0.7 6.4" class="art-line art-fine" />
      {p.carry === 'bag' && (
        <g>
          <path d="M-6.8 -8.4h3v3.6h-3z" class="art-paper" />
          <path d="M-6.8 -8.4h3v3.6h-3zM-6 -8.4q0.7-1.4 1.4 0" class="art-line art-fine" />
        </g>
      )}
      <BackHair v={p.hair} cy={-18.4} />
    </g>
  );
}
