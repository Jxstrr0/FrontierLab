// "Fly to …?" (SCREENS §18): the confirm a fare row asks before take-off,
// showing the one-way ticket and how personal cash and the lab split it. Used
// by the airport's departures and the Travel sheet.
import { flightQuote } from '../../sim/travel';
import { Confirm, Row } from '../components';
import { money } from '../format/format';
import { useGame } from '../store';
import type { DepartureRow } from './departures';
import { startFlight } from './flight';

export function FareConfirm(p: { row: DepartureRow; jet: boolean; onClose: () => void }) {
  const s = useGame();
  const sym = s.settings.currency;
  // Re-quote at confirm time so the sheet shows today's split.
  const q = flightQuote(s, p.row.id, p.jet);
  return (
    <Confirm
      title={`Fly to ${p.row.name}?`}
      body={
        <div class="ap-fare">
          <p>
            This week's free mileage won't reach {p.row.name}, so it's a one-way ticket of{' '}
            {money(q.fare, sym)}.
          </p>
          <Row label="From your personal cash" value={money(q.personalPays, sym)} />
          {q.bankPays > 0 && (
            <Row label="The lab pays (travel expense)" value={money(q.bankPays, sym)} tone="bad" />
          )}
        </div>
      }
      confirmLabel="Buy ticket"
      onCancel={p.onClose}
      onConfirm={() => {
        p.onClose();
        startFlight(p.row.id, p.jet);
      }}
    />
  );
}
