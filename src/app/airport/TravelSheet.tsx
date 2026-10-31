// Travel sheet (SCREENS §0.2 city pill, DESIGN §5.17): where you are, this
// week's free mileage and the departures board itself, so a trip is one tap
// (a fare asks first; with a private jet the board quotes your plane), then
// "Go to the airport" for the terminal and the jet card.
import { useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import { JETS } from '../../data/jets';
import { Row, Sheet } from '../components';
import { focusLandmark } from '../map/MapView';
import { openPanel, sheet, useGame } from '../store';
import { PlaneIcon } from './AirportMedallion';
import { DeparturesBoard } from './DeparturesBoard';
import { allowanceText, departureRows, type DepartureRow } from './departures';
import { FareConfirm } from './FareConfirm';
import { startFlight } from './flight';
import './airport.css';

export function TravelSheet() {
  const s = useGame();
  const city = CITIES[s.world.currentCityId]!;
  const home = s.meta.homeCityId === city.id;
  const jet = s.personal.jet ? JETS[s.personal.jet.model] : undefined;
  const allowance = allowanceText(s);
  const [asking, setAsking] = useState<DepartureRow | null>(null);
  const rows = departureRows(s, !!jet, 'all');
  const pick = (row: DepartureRow) => {
    if (row.quote.mode === 'fare') setAsking(row);
    else startFlight(row.id, !!jet);
  };
  const close = () => (sheet.value = null);
  const toAirport = () => {
    focusLandmark('airport');
    openPanel({ type: 'airport' });
  };
  return (
    <Sheet title="Travel" onClose={close}>
      <p class="travel-where">
        You're in <strong>{city.name}</strong>, {COUNTRIES[city.country].name}
        {home ? ' (home)' : city.regional ? ' (regional site)' : ''}.
      </p>
      <Row label="Flown this week" value={allowance.flown} />
      <Row label="Free mileage left" value={allowance.remaining} />
      <DeparturesBoard
        rows={rows}
        units={s.settings.units}
        symbol={s.settings.currency}
        onPick={pick}
      />
      <nav class="menu-list travel-actions">
        <button
          type="button"
          class="menu-item travel-item"
          data-tutorial="travel-airport"
          onClick={toAirport}
        >
          <PlaneIcon size={20} />
          Go to the airport
          <span class="travel-item-note">{city.airport.code}</span>
        </button>
        {jet && (
          <button
            type="button"
            class="menu-item travel-item"
            onClick={() => openPanel({ type: 'airport', jet: true })}
          >
            <PlaneIcon size={20} filled />
            Fly now
            <span class="travel-item-note">{jet.name}</span>
          </button>
        )}
      </nav>
      {asking && <FareConfirm row={asking} jet={!!jet} onClose={() => setAsking(null)} />}
    </Sheet>
  );
}
