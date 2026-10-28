// How lively the city on screen is (ART_DIRECTION §2.3), read from GameState
// for the moving layer (src/art/lifeLayer.ts): the home economy sets how busy
// the streets are, each of your and rivals' offices draws people in line with
// its trade, and your data centers get trucks and steam in line with their
// compute load. Read-only; a key string tells MapView when it changed.
import type { LifeMood } from '../../art/lifeMovers';
import { LIFE_BUSY_RANGE, LIFE_GDP_BUSY_PER_PT, LIFE_PHASE_BUSY } from '../../config/cityLife';
import { CITIES } from '../../data/cities';
import type { GameState } from '../../sim/state';

/** Levels are rounded to this step so the key (and the crowd) changes only on real moves. */
const STEP = 0.1;
/** A struggling rival office: losing money this many weeks running. */
const RIVAL_STRUGGLE_WEEKS = 4;
/** Activity of offices that never report trade: your HQ floors, a quiet rival. */
const HQ_LEVEL = 0.6;
const QUIET_LEVEL = 0.1;
/** A data center being fitted out still gets building deliveries. */
const FITOUT_TRUCKS = 0.5;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const snap = (v: number) => Math.round(clamp01(v) / STEP) * STEP;

export function cityMood(s: GameState): LifeMood {
  const cityId = s.world.currentCityId;
  const country = s.world.countries[CITIES[cityId]?.country as keyof typeof s.world.countries];
  let busy = 1;
  if (country) {
    busy = LIFE_PHASE_BUSY[country.phase] * (1 + country.gdp * LIFE_GDP_BUSY_PER_PT);
  }
  busy = Math.round(Math.max(LIFE_BUSY_RANGE[0], Math.min(LIFE_BUSY_RANGE[1], busy)) * 20) / 20;
  const offices: LifeMood['offices'] = [];
  const dataCenters: LifeMood['dataCenters'] = [];
  const tileOf = (lotId: string) => s.world.lots[lotId]?.tile;
  for (const b of Object.values(s.branches)) {
    if (b.cityId !== cityId || b.status !== 'open') continue;
    const tile = tileOf(b.lotId);
    // Busy offices are the ones near capacity.
    const level = 0.25 + 0.75 * clamp01(b.last.served / Math.max(1, b.capacity));
    if (tile) offices.push({ ...tile, level: snap(level) });
  }
  for (const o of Object.values(s.world.officeListings)) {
    if (o.cityId === cityId && o.officeId) offices.push({ ...o.tile, level: HQ_LEVEL });
  }
  for (const r of Object.values(s.rivals)) {
    for (const rb of r.branches) {
      if (rb.cityId !== cityId) continue;
      const tile = tileOf(rb.lotId);
      if (!tile) continue;
      const struggling =
        r.status !== 'active' || rb.negativeWeeks >= RIVAL_STRUGGLE_WEEKS || rb.contribution < 0;
      const level = struggling ? QUIET_LEVEL : 0.3 + 0.6 * clamp01(rb.overall / 5);
      offices.push({ ...tile, level: snap(level) });
    }
  }
  const owned = Math.max(1, s.compute.ownedGpus);
  const load = clamp01(s.compute.demandGpus / owned);
  for (const d of Object.values(s.dataCenters)) {
    if (d.cityId !== cityId) continue;
    const tile = d.lotId ? tileOf(d.lotId) : d.siteId ? s.world.sites[d.siteId]?.tile : undefined;
    if (!tile) continue;
    const fitout = d.status !== 'open';
    dataCenters.push({
      ...tile,
      level: fitout ? FITOUT_TRUCKS : snap(0.3 + 0.7 * load),
      steam: !fitout,
      ink: s.meta.brandInk,
    });
  }
  return { busy, offices, dataCenters };
}

export function moodKey(m: LifeMood): string {
  const at = (p: { x: number; y: number; level: number }) => `${p.x},${p.y},${p.level}`;
  return [
    m.busy,
    m.offices.map(at).join(';'),
    m.dataCenters.map((d) => `${at(d)},${d.steam ? 1 : 0},${d.ink}`).join(';'),
  ].join('|');
}
