// Area map on the storefront panel (SCREENS §3): the blocks around a lot as a
// small engraved plate in the city ink on map paper (ART_DIRECTION §2), with
// districts in ink tones, parks in the city's tint, water, open lots outlined,
// your branches and rivals' as dots, the nearby-competition ring and this lot
// in brass. Look only; the model comes from areaMap.ts.
import { useMemo } from 'preact/hooks';
import { generateCityMap } from '../../art/citygen';
import { CITIES } from '../../data/cities';
import { cityLook } from '../../data/cityLooks';
import { DISTRICTS } from '../../data/types';
import type { GameState, Lot } from '../../sim/state';
import { cityLots } from '../city/lotInfo';
import { mapPlaces, sceneFor } from '../map/mapScene';
import { useGame } from '../store';
import { AREA_BOX, areaMapModel, diamondsPath, type AreaGrid } from './areaMap';

/** Tile gaps (share of a diamond) so blocks read as engraved cells. */
const BUILDING_INSET = 0.14;
const OPEN_LOT_INSET = 0.22;

/** The current city's map is shared with MapView (memoised); another city's is generated here. */
function useGrid(s: GameState, lot: Lot): AreaGrid | undefined {
  const city = CITIES[lot.cityId];
  const here = lot.cityId === s.world.currentCityId;
  const other = useMemo(() => {
    if (!city || here) return undefined;
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === city.id);
    return generateCityMap(city, s.meta.seed, lots, mapPlaces(s, city.id));
  }, [city, here, s.meta.seed]);
  if (!city) return undefined;
  return here ? sceneFor(city, s.meta.seed, cityLots(s), mapPlaces(s, city.id)).map : other;
}

export function AreaMiniMap(p: { lot: Lot }) {
  const s = useGame();
  const grid = useGrid(s, p.lot);
  const city = CITIES[p.lot.cityId];
  if (!grid || !city) return null;
  const m = areaMapModel(s, p.lot, grid);
  const { centre, half, ring } = m;
  const path = (key: keyof typeof m.layers, inset = 0) =>
    diamondsPath(m.layers[key] ?? [], half, inset);
  const own = m.dots.some((d) => d.kind === 'own');
  const rival = m.dots.some((d) => d.kind === 'rival');

  return (
    <figure class="area-map">
      <svg
        class="area-map-svg"
        viewBox={`0 0 ${AREA_BOX.w} ${AREA_BOX.h}`}
        role="img"
        aria-label={`Map of the blocks around ${p.lot.address}, with nearby sales offices`}
        style={{ '--am-ink': city.ink, '--am-tint': cityLook(city.id).tint }}
      >
        <defs>
          {/* Water: wavy guilloche lines over a pale wash of the ink (ART_DIRECTION §2). */}
          <pattern id="am-waves" width="12" height="5" patternUnits="userSpaceOnUse">
            <path d="M0 2.5Q3 0.8 6 2.5T12 2.5" class="am-wave" />
          </pattern>
        </defs>
        <path d={path('water')} class="am-water" />
        <path d={path('water')} fill="url(#am-waves)" />
        <path d={path('park')} class="am-park" />
        {DISTRICTS.map((d) => (
          <path d={path(d, BUILDING_INSET)} class={`am-block am-d-${d}`} />
        ))}
        <path d={path('landmark', BUILDING_INSET)} class="am-landmark" />
        <path d={path('open', OPEN_LOT_INSET)} class="am-open" />
        <ellipse cx={centre.x} cy={centre.y} rx={ring.rx} ry={ring.ry} class="am-ring" />
        {m.labels.map((l) => (
          <text x={l.x} y={l.y} text-anchor="middle" dominant-baseline="middle" class="am-label">
            {l.text}
          </text>
        ))}
        {m.dots.map((d) => (
          <circle
            cx={d.x}
            cy={d.y}
            r={d.kind === 'own' ? 4.2 : 3.4}
            class={`am-dot am-dot-${d.kind}`}
            style={{ '--dot-ink': d.ink }}
          />
        ))}
        <circle cx={centre.x} cy={centre.y} r={half.w + 3} class="am-here-ring" />
        <path d={diamondsPath([[centre.x, centre.y]], half)} class="am-here" />
        <rect x="3.5" y="3.5" width={AREA_BOX.w - 7} height={AREA_BOX.h - 7} class="am-frame" />
      </svg>
      <figcaption class="area-map-key small">
        <span>
          <i class="am-key am-key-here" aria-hidden="true" />
          This lot
        </span>
        {own && (
          <span>
            <i
              class="am-key am-key-own"
              style={{ '--dot-ink': s.meta.brandInk }}
              aria-hidden="true"
            />
            Your sales offices
          </span>
        )}
        {rival && (
          <span>
            <i class="am-key am-key-rival" aria-hidden="true" />
            Rival sales offices
          </span>
        )}
        <span>
          <i class="am-key am-key-ring" aria-hidden="true" />
          {ring.tiles}-tile radius
        </span>
      </figcaption>
    </figure>
  );
}
