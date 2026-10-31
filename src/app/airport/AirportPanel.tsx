// Airport panel (SCREENS §18, DESIGN §5.17): the airport's name and code, the
// advisor's welcome, a terminal vignette, this week's flying against the free
// allowance, the departures board (filtered by part of the world) and the
// private jet card. Free rows fly at once; a fare row asks first, showing what
// personal cash pays and what the bank covers. In jet mode ("Fly now") the
// board quotes your own plane where it reaches.
import { useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { JETS } from '../../data/jets';
import { kmRemaining } from '../../sim/travel';
import { Card, Panel, Row, Segmented, SectionTitle } from '../components';
import { money } from '../format/format';
import { closePanel, openPanel, useGame } from '../store';
import { AirportArt } from './AirportArt';
import { AirportMedallion } from './AirportMedallion';
import { DeparturesBoard } from './DeparturesBoard';
import { JetCard, rangeText } from './JetCard';
import {
  allowanceText,
  departureRows,
  REGION_OPTIONS,
  type DepartureRow,
  type RegionId,
} from './departures';
import { FareConfirm } from './FareConfirm';
import { startFlight } from './flight';
import './airport.css';

export function AirportPanel(p: { jet?: boolean }) {
  const s = useGame();
  const city = CITIES[s.world.currentCityId]!;
  const sym = s.settings.currency;
  const jetSpec = s.personal.jet ? JETS[s.personal.jet.model] : undefined;
  const jetMode = !!p.jet && !!jetSpec;
  const [region, setRegion] = useState<RegionId>('all');
  const [asking, setAsking] = useState<DepartureRow | null>(null);
  const rows = departureRows(s, jetMode, region);
  const allowance = allowanceText(s);
  const usedUp = kmRemaining(s) <= 0;

  const pick = (row: DepartureRow) => {
    if (row.quote.mode === 'fare') setAsking(row);
    else startFlight(row.id, jetMode);
  };

  const advisor = jetMode
    ? [
        `Your ${jetSpec!.name} is fuelled and waiting. Where to?`,
        jetSpec!.rangeKm === null
          ? 'She flies anywhere without a stop, and never needs a ticket.'
          : `Anywhere within ${rangeText(jetSpec!, s.settings.units)} flies free. Further than that, we buy a ticket.`,
      ]
    : [
        `Welcome to ${city.airport.name}. Where are we headed?`,
        usedUp
          ? "You've used this week's free mileage. Tickets come from your personal cash, and the lab covers any shortfall."
          : 'Flights within your weekly mileage are free. Past it, a one-way ticket comes from your personal cash.',
        'Opening sales offices and buying buildings means being in that city. Your sales offices run everywhere at once.',
      ];

  return (
    <Panel
      title={jetMode ? 'Fly now' : city.airport.name}
      subtitle={
        jetMode
          ? `${jetSpec!.name} · from ${city.name}`
          : `${city.airport.code} · ${city.name}${city.regional ? ' · regional site' : ''}`
      }
      icon={<AirportMedallion size={32} />}
      onClose={closePanel}
      advisor={{ text: advisor }}
      hero={jetMode ? undefined : <AirportArt />}
    >
      <div class="stack">
        <Card>
          <div class="ap-stats">
            <div>
              <div class="ap-stat-label">Flown this week</div>
              <div class="ap-stat">{allowance.flown}</div>
            </div>
            <div>
              <div class="ap-stat-label">Free mileage left</div>
              <div class={`ap-stat${usedUp ? ' tone-bad' : ''}`}>{allowance.remaining}</div>
            </div>
          </div>
          <Row label="Personal cash" value={money(s.personal.cash, sym)} tone="dim" />
        </Card>

        <div>
          <SectionTitle>Departures</SectionTitle>
          <Segmented
            label="Part of the world"
            options={REGION_OPTIONS}
            value={region}
            onChange={setRegion}
          />
          <DeparturesBoard rows={rows} units={s.settings.units} symbol={sym} onPick={pick} />
        </div>

        {!jetMode && <JetCard onFlyNow={() => openPanel({ type: 'airport', jet: true })} />}
      </div>

      {asking && <FareConfirm row={asking} jet={jetMode} onClose={() => setAsking(null)} />}
    </Panel>
  );
}
