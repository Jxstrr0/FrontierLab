// The progress bar under a product development or a training run: percent done
// and weeks left at the team's pace, or "Paused" while there's no Products floor.
export function ProjectProgress(p: {
  label: string;
  share: number;
  left: number;
  paused: boolean;
}) {
  const pctDone = Math.round(p.share * 100);
  return (
    <>
      <div
        class="pf-progress"
        role="progressbar"
        aria-label={p.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pctDone}
      >
        <span class="pf-progress-fill" style={{ width: `${p.share * 100}%` }} />
      </div>
      <div class="pf-dev-meta small">
        <span>{pctDone}% done</span>
        <span class={p.paused ? 'tone-bad' : ''}>
          {p.paused
            ? 'Paused: no Products floor'
            : `${p.left} ${p.left === 1 ? 'week' : 'weeks'} left`}
        </span>
      </div>
    </>
  );
}
