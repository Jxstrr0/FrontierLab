// Departures board view (SCREENS §18): rows, order, labels, units and jet mode.
import { describe, expect, it } from 'vitest';
import {
  arrivalText,
  departureRows,
  distanceText,
  fareLabel,
  rowNote,
} from '../../src/app/airport/departures';
import { FLIGHT_FARE, TRAVEL_KM_PER_WEEK } from '../../src/config/balance';
import { CITIES, DESTINATIONS } from '../../src/data/cities';
import * as cmd from '../../src/sim/commands';
import { cityDistanceKm } from '../../src/sim/geo';
import { newGame } from '../../src/sim/newGame';
import { openScriptedBranch } from '../helpers/scenario';

const game = () => newGame({ seed: 42, cityId: 'cal', bankName: 'Board Bank' });

describe('departure rows', () => {
  it('lists every destination but here, nearest first, with real distances', () => {
    const s = game();
    const rows = departureRows(s);
    expect(rows).toHaveLength(DESTINATIONS.length - 1);
    expect(rows.some((r) => r.id === 'cal')).toBe(false);
    for (let i = 1; i < rows.length; i++)
      expect(rows[i]!.km).toBeGreaterThanOrEqual(rows[i - 1]!.km);
    const van = rows.find((r) => r.id === 'van')!;
    expect(van.km).toBe(cityDistanceKm('cal', 'van'));
    expect(van.code).toBe('VAN');
    expect(rows[0]!.id).toBe('sas'); // Saskatoon is the closest airport to Calgary.
  });

  it('marks new places, regional sites and your branches', () => {
    const s = game();
    openScriptedBranch(s, 'midtown');
    cmd.travelTo(s, 'van');
    const rows = departureRows(s);
    const cal = rows.find((r) => r.id === 'cal')!;
    expect(cal.isNew).toBe(false);
    expect(cal.branches).toBe(1);
    expect(rowNote(cal)).toBe('Canada · 1 branch');
    const fmm = rows.find((r) => r.id === 'fmm')!;
    expect(fmm.isNew).toBe(true);
    expect(fmm.regional).toBe(true);
    expect(rowNote(fmm)).toBe('Canada · regional site');
  });

  it('turns free rows into fares once the weekly mileage is used', () => {
    const s = game();
    const free = departureRows(s).find((r) => r.id === 'lon')!;
    expect(free.quote.mode).toBe('free');
    expect(fareLabel(free.quote, 'C$')).toBe('Free');
    s.world.travel.kmThisWeek = TRAVEL_KM_PER_WEEK - 100;
    const row = departureRows(s).find((r) => r.id === 'lon')!;
    expect(row.quote.mode).toBe('fare');
    const fare = Math.round(FLIGHT_FARE * CITIES.lon!.costIndex);
    expect(row.quote.fare).toBe(fare);
    expect(fareLabel(row.quote, 'C$')).toBe('C$104K ticket');
  });

  it('quotes the jet within its range and the normal rules beyond', () => {
    const s = game();
    s.personal.cash = 30_000_000;
    expect(cmd.buyJet(s, 'corvid600').ok).toBe(true);
    s.world.travel.kmThisWeek = TRAVEL_KM_PER_WEEK;
    const rows = departureRows(s, true);
    expect(rows.find((r) => r.id === 'tor')!.quote.mode).toBe('jet');
    expect(fareLabel(rows.find((r) => r.id === 'tor')!.quote, '$')).toBe('Jet');
    expect(rows.find((r) => r.id === 'syd')!.quote.mode).toBe('fare');
    // Without jet mode, the same board charges tickets.
    expect(departureRows(s).find((r) => r.id === 'tor')!.quote.mode).toBe('fare');
  });

  it('filters by part of the world', () => {
    const s = game();
    const eu = departureRows(s, false, 'europe').map((r) => r.id);
    expect(eu.sort()).toEqual(['ams', 'fra', 'lon', 'par', 'zur']);
    expect(departureRows(s, false, 'asiaPacific').every((r) => r.region === 'asiaPacific')).toBe(
      true,
    );
  });
});

describe('labels', () => {
  it('shows distances in km or miles', () => {
    expect(distanceText(24_140, 'km')).toBe('24,140 km');
    expect(distanceText(1_609, 'mi')).toBe('1,000 mi');
    expect(distanceText(0, 'mi')).toBe('0 mi');
  });

  it('writes the arrival toast', () => {
    expect(
      arrivalText('Vancouver', { mode: 'free', fare: 0, bankPays: 0, firstVisit: true }, '$'),
    ).toBe('Welcome to Vancouver · first visit');
    expect(
      arrivalText(
        'London',
        { mode: 'fare', fare: 124_000, bankPays: 84_000, firstVisit: false },
        'C$',
      ),
    ).toBe('Welcome to London · Ticket C$124K (the bank paid C$84.0K)');
    expect(
      arrivalText('Tokyo', { mode: 'jet', fare: 0, bankPays: 0, firstVisit: false }, '$'),
    ).toBe('Welcome to Tokyo');
  });
});
