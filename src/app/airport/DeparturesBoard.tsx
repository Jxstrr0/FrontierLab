// Departures board (SCREENS §18, REFERENCE_NOTES §11): split-flap styled rows
// on a dark board, nearest first, each a tap target. The airport code sits in
// flap tiles; the right side shows the distance and "Free", "Jet" or the
// one-way fare. Rows past the allowance stay tappable (travel is never blocked).
import { distanceText, fareLabel, rowNote, type DepartureRow, type Units } from './departures';

export function DeparturesBoard(p: {
  rows: DepartureRow[];
  units: Units;
  symbol: string;
  onPick: (row: DepartureRow) => void;
}) {
  return (
    <div class="dep-board" role="list" aria-label="Departures">
      <div class="dep-head" aria-hidden="true">
        <span>Flight</span>
        <span>Destination</span>
        <span class="dep-head-right">Distance</span>
      </div>
      {p.rows.length === 0 && <p class="dep-empty">No departures to this region.</p>}
      {p.rows.map((r) => {
        const fare = fareLabel(r.quote, p.symbol);
        const dist = distanceText(r.km, p.units);
        return (
          <div role="listitem" key={r.id}>
            <button
              type="button"
              class="dep-row"
              aria-label={`${r.name}, ${rowNote(r)}${r.isNew ? ', new' : ''}, ${dist}, ${fare}`}
              onClick={() => p.onPick(r)}
            >
              <Flaps text={r.code} />
              <span class="dep-main">
                <span class="dep-name">
                  {r.name}
                  {r.isNew && <span class="dep-new">New</span>}
                </span>
                <span class="dep-note">{rowNote(r)}</span>
              </span>
              <span class="dep-right">
                <span class="dep-dist">{dist}</span>
                <span class={`dep-fare is-${r.quote.mode}`}>{fare}</span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** A word in split-flap tiles: one tile per character with the hinge line across. */
export function Flaps(p: { text: string }) {
  return (
    <span class="flaps" aria-hidden="true">
      {p.text.split('').map((ch) => (
        <span class="flap">{ch}</span>
      ))}
    </span>
  );
}
