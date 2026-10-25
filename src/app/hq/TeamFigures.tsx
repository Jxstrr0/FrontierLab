// The HQ team's staff figures (SCREENS §10, like the branch Service tab's
// §5.1): one figure per person on staff tinted by the department's mood band
// (jade / brass / oxblood), then dashed outlines for open positions, capped
// so a large department stays one tidy row on a phone, with "+n" for the rest.
import { moodTone } from '../branch/selectors';
import { staffFigures } from './deptSelectors';

/** The mood band in words, for the figures' accessible label. */
const MOOD_WORD = { good: 'good', warn: 'middling', bad: 'low' } as const;

export function TeamFigures(p: { staff: number; target: number; morale: number }) {
  const mood = moodTone(p.morale);
  const f = staffFigures(p.staff, p.target);
  const figures = [
    ...Array.from({ length: f.filled }, () => `hq-fig hq-fig-${mood}`),
    ...Array.from({ length: f.open }, () => 'hq-fig hq-fig-open'),
  ];
  return (
    <div
      class="hq-figures"
      role="img"
      aria-label={`${p.staff} staff, ${f.staffOpen} open positions, morale ${MOOD_WORD[mood]}`}
    >
      {figures.map((cls) => (
        <svg class={cls} viewBox="0 0 12 18" aria-hidden="true">
          <circle cx="6" cy="4" r="3" />
          <path d="M1 17c0-6 2-8 5-8s5 2 5 8z" />
        </svg>
      ))}
      {f.more > 0 && <span class="hq-fig-more small muted">+{f.more}</span>}
    </div>
  );
}
