// STUB — to be built in Stage 2: the temporary city list (districts → lots) in
// place of the map (ROADMAP Stage 2).
import { openPanel, useGame } from '../store';

export function CityList() {
  const s = useGame();
  const lots = Object.values(s.world.lots).slice(0, 20);
  return (
    <div class="stack">
      {lots.map((l) => (
        <button
          type="button"
          class="btn btn-secondary"
          onClick={() =>
            l.occupant?.type === 'player'
              ? openPanel({ type: 'branch', branchId: l.occupant.id })
              : openPanel({ type: 'storefront', lotId: l.id })
          }
        >
          {l.address} · {l.district}
        </button>
      ))}
    </div>
  );
}
