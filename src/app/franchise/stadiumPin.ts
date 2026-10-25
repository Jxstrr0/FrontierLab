// The stadium pins (SCREENS §20): one per club on the city's stadium landmark
// (Sports Teams layer), anchored like landmarkPins.ts. A city with two clubs
// (Toronto) spreads them a little either side of the landmark. Unowned clubs
// carry a "For sale" note; yours are brand-ink crests with the trophy.
import type { CityMap } from '../../art/citygen';
import { franchisesIn } from '../../data/franchises';
import type { GameState } from '../../sim/state';
import { landmarkAnchor } from '../map/landmarkPins';
import type { PinSpec } from '../map/pins';

/** Horizontal spacing (world px) between pins sharing one stadium. */
const SHARED_STADIUM_SPACING = 48;

export function stadiumPins(s: GameState, map: CityMap): PinSpec[] {
  const specs = franchisesIn(map.cityId);
  const at = landmarkAnchor(map, 'stadium');
  if (!at || specs.length === 0) return [];
  return specs.map((spec, i) => {
    const club = s.clubs?.[spec.id];
    const owned = !!club && club.owner !== 'outside';
    const dx = (i - (specs.length - 1) / 2) * SHARED_STADIUM_SPACING;
    const pin: PinSpec = {
      id: `stadium_${spec.id}`,
      kind: 'stadium',
      x: at.x + dx,
      y: at.y,
      label: `${spec.name}, ${spec.stadium}${owned ? ', your club' : ', for sale'}`,
      ink: owned ? s.meta.brandInk : '',
      monogram: '',
      badge: false,
      icon: 'sportsTeams',
      clubId: spec.id,
    };
    if (owned) pin.owned = true;
    else pin.tag = 'For sale';
    return pin;
  });
}
