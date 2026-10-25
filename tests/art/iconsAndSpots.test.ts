import { describe, expect, it } from 'vitest';
import { ICON_NAMES, ICON_PATHS } from '../../src/art/icons';
import { BRAND_SPOTS, CAMPAIGN_SPOTS, PRODUCT_SPOTS, spotPath } from '../../src/art/spots';
import { BRAND_CAMPAIGNS } from '../../src/data/brandCampaigns';
import { CAMPAIGNS } from '../../src/data/campaigns';
import { PRODUCTS } from '../../src/data/products';
import { barPath } from '../../src/app/components/Visuals';
import { sectorPts } from '../../src/app/components/Donut';

/** ART_DIRECTION §7 starter list, in the set's names. */
const STARTER = (
  'branch office realEstate bureau bank investmentBank agency convention lobby stadium car ' +
  'gavel university employer airport plane coin vault atm teller chart shield warning person ' +
  'people settings save menu layers close pause play fast trade handshake key leaf'
).split(' ');

describe('icon set', () => {
  it('covers the starter list with path data on the 24 px grid', () => {
    for (const name of STARTER) expect(ICON_NAMES).toContain(name);
    for (const d of Object.values(ICON_PATHS)) {
      expect(d).toMatch(/^M/);
      const nums = d.match(/-?\d*\.?\d+/g)!.map(Number);
      for (const n of nums) expect(Math.abs(n)).toBeLessThanOrEqual(24);
    }
  });
});

describe('spot illustrations', () => {
  it('draws every product, branch campaign and brand campaign', () => {
    for (const id of Object.keys(PRODUCTS)) expect(PRODUCT_SPOTS[id], id).toBeTruthy();
    for (const id of Object.keys(CAMPAIGNS)) expect(CAMPAIGN_SPOTS[id], id).toBeTruthy();
    for (const id of Object.keys(BRAND_CAMPAIGNS)) expect(BRAND_SPOTS[id], id).toBeTruthy();
  });

  it('falls back to a coin for unknown ids', () => {
    expect(spotPath('product', 'nope')).toBe(spotPath('campaign', 'also-nope'));
  });
});

describe('chart geometry', () => {
  it('rounds only the outer end of a bar and skips empty bars', () => {
    expect(barPath(0, 10, 10, 0)).toBe('');
    const up = barPath(0, 10, 10, 30);
    expect(up.startsWith('M0 40')).toBe(true);
    expect(up).toContain('q0 -2 2 -2');
    const down = barPath(0, 40, 10, 20, true);
    expect(down.startsWith('M0 40h10')).toBe(true);
  });

  it('builds donut sectors between the inner and outer radius', () => {
    const pts = sectorPts(0, Math.PI / 2, 60, 44);
    for (const [x, y] of pts) {
      const r = Math.hypot(x - 70, y - 70);
      expect(r).toBeGreaterThan(43.9);
      expect(r).toBeLessThan(60.1);
    }
  });
});
