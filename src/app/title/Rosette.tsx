// Decorative guilloche rosette drawn behind the title wordmark.
import { rosettePaths } from '../../art/guilloche';

const SIZE = 320;
const C = SIZE / 2;

// Computed once at module load: the geometry never changes.
const OUTER = rosettePaths(C, C, { radius: 156, petals: 18, depth: 0.16 }, 6);
const MIDDLE = rosettePaths(C, C, { radius: 118, petals: 12, depth: 0.3 }, 5);
const INNER = rosettePaths(C, C, { radius: 70, petals: 9, depth: 0.45 }, 4);

export function Rosette() {
  return (
    <svg class="title-rosette" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="0.6">
        {OUTER.map((d) => (
          <path key={d} d={d} />
        ))}
        {MIDDLE.map((d) => (
          <path key={d} d={d} opacity="0.8" />
        ))}
        {INNER.map((d) => (
          <path key={d} d={d} opacity="0.6" />
        ))}
        <circle cx={C} cy={C} r="158" stroke-width="0.8" />
        <circle cx={C} cy={C} r="152" stroke-width="0.4" />
      </g>
    </svg>
  );
}
