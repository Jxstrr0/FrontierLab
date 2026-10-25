import { describe, expect, it } from 'vitest';
import { CITIES } from '../../src/data/cities';
import { CITY_LOOKS, cityLook } from '../../src/data/cityLooks';

describe('city looks', () => {
  it('gives every city a look', () => {
    for (const id of Object.keys(CITIES)) expect(CITY_LOOKS[id], id).toBeDefined();
  });

  it('keeps water off landlocked cities and signatures off regional sites', () => {
    for (const [id, city] of Object.entries(CITIES)) {
      const l = cityLook(id);
      if (!city.water) expect(l.water, id).toBe('none');
      if (city.regional) expect(l.signature, id).toBe('none');
      else expect(l.signature, id).not.toBe('none');
    }
  });

  it('gives each storefront city its own signature landmark', () => {
    const sigs = Object.keys(CITIES)
      .filter((id) => !CITIES[id]!.regional)
      .map((id) => cityLook(id).signature);
    expect(new Set(sigs).size).toBe(sigs.length);
  });
});
