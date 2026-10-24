// Wizard step 3: four start-city cards (DESIGN §5.2). Each shows how the market
// reads: rents, usual rivals, size and the central bank's starting policy rate.
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import { Row } from '../components';
import { pct } from '../format/format';
import { CITY_FLAVOUR, SIZE_WORD, START_CITY_IDS, rentWord } from './choices';
import { usualCompetitors, type Draft } from './draft';

export function StepCity(p: { draft: Draft; patch: (d: Partial<Draft>) => void }) {
  // Changing city resets the rival count to that city's usual number.
  const pick = (cityId: string) => {
    if (cityId !== p.draft.cityId) p.patch({ cityId, competitors: usualCompetitors(cityId) });
  };
  return (
    <div class="stack" role="radiogroup" aria-label="Start city">
      <p class="muted step-intro">
        Where will your first branch open? Each market has its own character.
      </p>
      {START_CITY_IDS.map((id) => {
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
            <span class="city-flavour">{CITY_FLAVOUR[id]}</span>
            <span class="city-facts">
              <Row label="Rents" value={rentWord(city.rentIndex)} />
              <Row label="Usual rival banks" value={city.rivals} />
              <Row label="Market size" value={SIZE_WORD[city.size]} />
              <Row label="Policy rate" value={pct(COUNTRIES[city.country].startPolicy)} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
