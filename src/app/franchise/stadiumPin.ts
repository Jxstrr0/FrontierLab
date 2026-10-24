// The stadium pin (SCREENS §20): on the stadium landmark of a city with a club
// (Sports Teams layer). (Stage 9 stub: built by the franchise engineer; return
// a PinSpec of kind 'stadium' anchored like landmarkPins.ts.)
import type { CityMap } from '../../art/citygen';
import type { GameState } from '../../sim/state';
import type { PinSpec } from '../map/pins';

export function stadiumPins(_s: GameState, _map: CityMap): PinSpec[] {
  return [];
}
