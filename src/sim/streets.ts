// Street addresses for generated buildings (CONTENT §26): "{number} {name} {kind}"
// from the city's street set (src/data/streetNames.ts). Always three draws from
// the given stream (number, name, kind), whatever the set, so changing the
// word lists never moves anything else a city's stream places.
import { CITYGEN } from '../config/balance';
import { CITIES } from '../data/cities';
import { streetSetFor } from '../data/streetNames';
import type { Rng } from './rng';

export function streetAddress(rng: Rng, cityId: string): string {
  const n = rng.int(1, CITYGEN.maxStreetNumber);
  const set = streetSetFor(cityId, CITIES[cityId]?.country);
  const name = rng.pick(set.names);
  const kind = rng.pick(set.kinds);
  if (set.joined) return `${n} ${name}${kind}`;
  if (set.kindFirst) return `${n} ${kind} ${name}`;
  return `${n} ${name} ${kind}`;
}
