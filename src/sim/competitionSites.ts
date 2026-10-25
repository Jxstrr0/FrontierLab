// Stage 5 map buildings: each rival bank's head office in the city (Banks
// layer), 2–4 employers (Employers layer) and one university (CONTENT §14, §16).
// Seeded from the `sites5:{cityId}` stream so lots, offices and Stage 4 sites
// never move, and placed on free street-facing tiles like hqSites.ts.
import { CITYGEN, EMPLOYER_PARTNER_CHANCE } from '../config/balance';
import { CITIES } from '../data/cities';
import {
  COMMON_EMPLOYER_TYPES,
  EMPLOYER_NAMES,
  EMPLOYER_TYPES,
  EMPLOYERS_PER_CITY,
  NAMED_EMPLOYERS,
  NAMED_UNIVERSITIES,
  UNIVERSITY_PATTERNS,
} from '../data/employers';
import { STREET_KINDS, STREET_NAMES } from '../data/names';
import type { DistrictId } from '../data/types';
import { geometryFor, placeNear } from './cityPlacement';
import { stream, type Rng } from './rng';
import type { EmployerInfo, GameState, Site, SiteKind } from './state';

/** Adds the city's rival head offices, employers and university. Safe to call once per city. */
export function generateCompetitionSites(state: GameState, cityId: string): void {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  const rng = stream(state, `sites5:${cityId}`);
  const used = new Set<string>();
  const mark = (t: { x: number; y: number }) => used.add(`${t.x},${t.y}`);
  for (const lot of Object.values(state.world.lots)) if (lot.cityId === cityId) mark(lot.tile);
  for (const o of Object.values(state.world.officeListings)) if (o.cityId === cityId) mark(o.tile);
  for (const s of Object.values(state.world.sites)) if (s.cityId === cityId) mark(s.tile);

  const geo = geometryFor(state, cityId);
  const place = (district: DistrictId) => {
    const d = district === 'waterfront' && !city.water ? 'industrial' : district;
    return { tile: placeNear(city, geo, d, rng, used), district: d };
  };
  const add = (kind: SiteKind, refId: string, district: DistrictId, employer?: EmployerInfo) => {
    const { tile, district: d } = place(district);
    const site: Site = {
      id: `site_${cityId}_${kind}_${refId.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      cityId,
      kind,
      refId,
      tile,
      district: d,
      address: address(rng),
      buildingSeed: rng.int(0, CITYGEN.maxSeed),
    };
    if (employer) site.employer = employer;
    state.world.sites[site.id] = site;
  };

  const rivals = Object.values(state.rivals)
    .filter((r) => r.cities.includes(cityId))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const r of rivals) add('rivalHq', r.id, 'financial');

  const partner = () =>
    rivals.length > 0 && rng.chance(EMPLOYER_PARTNER_CHANCE) ? rng.pick(rivals).id : undefined;
  const info = (type: string, name: string): EmployerInfo => {
    const spec = EMPLOYER_TYPES[type]!;
    const e: EmployerInfo = {
      type,
      name,
      employees: spec.employees,
      incomeMult: spec.incomeMult,
    };
    const rival = partner();
    if (rival) e.partnerRivalId = rival;
    return e;
  };
  const named = (type: string) =>
    rng.pick(EMPLOYER_NAMES[type] ?? [EMPLOYER_TYPES[type]!.label]).replace('{city}', city.name);

  // A regional site has only its named employers (CONTENT §2).
  if (city.regional) {
    for (const e of city.regional.employers)
      add('employer', e.name, EMPLOYER_TYPES[e.type]!.district, info(e.type, e.name));
    return;
  }

  // City Hall always, a port in waterfront cities, named employers, then common types.
  const types: [string, string][] = [['cityHall', named('cityHall')]];
  if (city.water) types.push(['port', named('port')]);
  types.push(...(NAMED_EMPLOYERS[cityId] ?? []));
  const want = rng.int(...EMPLOYERS_PER_CITY);
  const pool = [...COMMON_EMPLOYER_TYPES] as string[];
  while (types.length < want && pool.length > 0) {
    const type = pool.splice(rng.int(0, pool.length - 1), 1)[0]!;
    types.push([type, named(type)]);
  }
  for (const [type, name] of types)
    add('employer', name, EMPLOYER_TYPES[type]!.district, info(type, name));

  const uniName =
    NAMED_UNIVERSITIES[cityId] ?? rng.pick(UNIVERSITY_PATTERNS).replace('{city}', city.name);
  add('university', uniName, 'university', info('university', uniName));
}

function address(rng: Rng): string {
  return `${rng.int(1, CITYGEN.maxStreetNumber)} ${rng.pick(STREET_NAMES)} ${rng.pick(STREET_KINDS)}`;
}
