// A flight in progress (SCREENS §18, DESIGN §5.17): which trip the overlay is
// showing, and the three steps of taking off. `startFlight` closes the airport
// (or any) panel and puts the overlay up; once its first frame is on screen
// the overlay calls `performFlight`, which runs the travelTo command (instant
// in the sim, so the destination map rebuilds under the overlay); `landFlight`
// takes the overlay down and toasts the arrival. App-side state only.
import { signal } from '@preact/signals';
import { ARRIVAL_TOAST_MS } from '../../config/mapView';
import { CITIES } from '../../data/cities';
import * as cmd from '../../sim/commands';
import { flightQuote, type FlightQuote } from '../../sim/travel';
import { act, panel, peekGame, sheet, toast } from '../store';
import { arrivalText } from './departures';

export interface Flight {
  key: number;
  from: string;
  to: string;
  /** Fly your own plane (the quote says it reaches). */
  jet: boolean;
  /** The quote when the player tapped; the command charges the same. */
  quote: FlightQuote;
  firstVisit: boolean;
}

export const flight = signal<Flight | null>(null);
let nextKey = 0;

/** Takes off for `to`: closes panels and sheets and starts the overlay. */
export function startFlight(to: string, jet = false): boolean {
  const s = peekGame();
  if (!s || flight.value || !CITIES[to] || to === s.world.currentCityId) return false;
  const quote = flightQuote(s, to, jet);
  panel.value = null;
  sheet.value = null;
  flight.value = {
    key: ++nextKey,
    from: s.world.currentCityId,
    to,
    jet: quote.mode === 'jet',
    quote,
    firstVisit: !s.world.cities[to],
  };
  return true;
}

/** Runs the flight in the sim; on failure (it toasts why) the overlay is dropped. */
export function performFlight(f: Flight): boolean {
  const r = act(cmd.travelTo, f.to, { jet: f.jet });
  if (r.ok) {
    f.quote = { ...f.quote, mode: r.mode, fare: r.fare };
    return true;
  }
  if (flight.value?.key === f.key) flight.value = null;
  return false;
}

/** Takes the overlay down and welcomes you to the destination. */
export function landFlight(f: Flight): void {
  if (flight.value?.key === f.key) flight.value = null;
  const s = peekGame();
  const city = CITIES[f.to];
  if (!s || !city) return;
  const landed = {
    mode: f.quote.mode,
    fare: f.quote.fare,
    bankPays: f.quote.bankPays,
    firstVisit: f.firstVisit,
  };
  toast(arrivalText(city.name, landed, s.settings.currency), 'good', ARRIVAL_TOAST_MS);
}
