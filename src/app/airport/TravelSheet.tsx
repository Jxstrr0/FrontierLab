// Travel sheet (SCREENS §0.2 city pill, DESIGN §5.17): where you are, this
// week's free mileage, "Go to the airport" (pans the map to the airport and
// opens its departures) and, with a private jet, "Fly now" from any map.
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import { JETS } from '../../data/jets';
import { Row, Sheet } from '../components';
import { focusLandmark } from '../map/MapView';
import { openPanel, sheet, useGame } from '../store';
import { PlaneIcon } from './AirportMedallion';
import { allowanceText } from './departures';
import './airport.css';

export function TravelSheet() {
  const s = useGame();
  const city = CITIES[s.world.currentCityId]!;
  const home = s.meta.homeCityId === city.id;
  const jet = s.personal.jet ? JETS[s.personal.jet.model] : undefined;
  const allowance = allowanceText(s);
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
    </Sheet>
  );
}
