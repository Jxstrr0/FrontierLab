// Wizard step 3: the start city (DESIGN §5.2). Region tabs keep the list short
// on a phone; each card shows how the market reads: rents, usual rivals, size
// and the home central bank's starting policy rate.
import { useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import { Row, Segmented } from '../components';
import { pct } from '../format/format';
import {
  CITY_FLAVOUR,
  REGION_OPTIONS,
  SIZE_WORD,
  citiesIn,
  nationOf,
  regionOf,
  rentWord,
  type StartRegion,
} from './choices';
import { usualCompetitors, type Draft } from './draft';

export function StepCity(p: { draft: Draft; patch: (d: Partial<Draft>) => void }) {
  const [region, setRegion] = useState<StartRegion>(() => regionOf(p.draft.cityId));
  // Changing city resets the rival count to that city's usual number.
  const pick = (cityId: string) => {
    if (cityId !== p.draft.cityId) p.patch({ cityId, competitors: usualCompetitors(cityId) });
  };
  return (
    <div class="stack">
      <p class="muted step-intro">
        Where will your first sales office open? Its country becomes your lab's home: the interest
        rates you borrow at, the taxes you pay and the exchange you list on.
      </p>
      <Segmented label="Region" options={REGION_OPTIONS} value={region} onChange={setRegion} />
      <div class="stack" role="radiogroup" aria-label="Start city">
        {citiesIn(region).map((id) => {
          const city = CITIES[id]!;
          const selected = id === p.draft.cityId;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              class={`card card-tap city-card${selected ? ' is-selected' : ''}`}
              onClick={() => pick(id)}
            >
              <span class="city-head">
                <span class="city-ink" style={{ background: city.ink }} aria-hidden="true" />
                <span class="city-name">{city.name}</span>
                {selected && <span class="city-check">Chosen</span>}
              </span>
              <span class="city-nation">{nationOf(id)}</span>
              <span class="city-flavour">{CITY_FLAVOUR[id]}</span>
              <span class="city-facts">
                <Row label="Rents" value={rentWord(city.rentIndex)} />
                <Row label="Usual rival labs" value={city.rivals} />
                <Row label="Market size" value={SIZE_WORD[city.size]} />
                <Row label="Policy rate" value={pct(COUNTRIES[city.country].startPolicy)} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
