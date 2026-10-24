// Pin clustering for the far zoom (SCREENS §2): nearby pins merge into one
// medallion with a count. Pure and camera-independent: it works in world
// pixels and walks pins in a fixed order, so clusters don't reshuffle while
// panning, only when the cluster zoom level changes.
import { CLUSTER_LEVELS_PER_OCTAVE, CLUSTER_RADIUS_PX } from '../../config/mapView';

export interface ClusterInput {
  id: string;
  /** World position (zoom-1 px). */
  x: number;
  y: number;
}

export interface Cluster<T extends ClusterInput> {
  /** Stable key: the id of the pin that seeded it. */
  key: string;
  /** Mean world position of the members. */
  x: number;
  y: number;
  members: T[];
}

/**
 * Greedy clustering: pins are taken in their given order; each pin not yet
 * claimed seeds a cluster and claims every unclaimed pin within `radius` of it.
 * A spatial grid keeps it near-linear for a few hundred pins.
 */
export function clusterPins<T extends ClusterInput>(pins: T[], radius: number): Cluster<T>[] {
  if (!(radius > 0)) return pins.map((p) => ({ key: p.id, x: p.x, y: p.y, members: [p] }));
  const cell = (v: number) => Math.floor(v / radius);
  const grid = new Map<string, number[]>();
  pins.forEach((p, i) => {
    const k = `${cell(p.x)},${cell(p.y)}`;
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  });

  const claimed = new Uint8Array(pins.length);
  const r2 = radius * radius;
  const out: Cluster<T>[] = [];
  pins.forEach((seed, i) => {
    if (claimed[i]) return;
    claimed[i] = 1;
    const members = [seed];
    const gx = cell(seed.x);
    const gy = cell(seed.y);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const j of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
          if (claimed[j]) continue;
          const p = pins[j]!;
          const ox = p.x - seed.x;
          const oy = p.y - seed.y;
          if (ox * ox + oy * oy <= r2) {
            claimed[j] = 1;
            members.push(p);
          }
        }
      }
    }
    let sx = 0;
    let sy = 0;
    for (const m of members) {
      sx += m.x;
      sy += m.y;
    }
    out.push({ key: seed.id, x: sx / members.length, y: sy / members.length, members });
  });
  return out;
}

/**
 * The zoom clusters are computed at: `zoom` snapped down to one of
 * CLUSTER_LEVELS_PER_OCTAVE steps per doubling, so a pinch regroups pins a few
 * times rather than every frame.
 */
export function clusterLevel(zoom: number): number {
  const n = CLUSTER_LEVELS_PER_OCTAVE;
  return 2 ** (Math.floor(Math.log2(zoom) * n + 1e-9) / n);
}

/** World-space cluster radius for a zoom: CLUSTER_RADIUS_PX on screen. */
export const clusterRadius = (zoom: number): number => CLUSTER_RADIUS_PX / clusterLevel(zoom);
