// Data-centre and power deals (stage C8a, SIMULATION §13.7a): signing at an
// energy site, contracted GPUs joining the compute pool and their take-or-pay
// bill, the power discount for data centers in the country, health and the
// safety tier, renewal, release and runoff, the payroll block at energy
// sites, and the 17 → 18 migration.
import { describe, expect, it } from 'vitest';
import {
  PARTNER_CONTRACT_WEEKS,
  PARTNER_RENEWAL,
  PARTNER_RUNOFF_WEEKS,
  POWER_DEAL,
} from '../../src/config/balance';
import { DEFAULT_DC_BUILD } from '../../src/data/dataCenters';
import { intangibleAssets } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { ownedGpus } from '../../src/sim/compute';
import { dataCenterPowerBill, dealPowerMult, powerBill } from '../../src/sim/dataCenters';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { listLevel } from '../../src/sim/nominal';
import {
  dealGpuTarget,
  dealGpus,
  powerDealFee,
  powerDealHealthTarget,
} from '../../src/sim/powerDeals';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState, Site } from '../../src/sim/state';
import { addCapital, identityGap } from '../helpers/mergers';
import { freeLot } from '../helpers/scenario';

/** A rich lab in Calgary, travelled to the Fort McMurray energy site. */
function atEnergySite(): { s: GameState; site: Site } {
  const s = newGame({ seed: 7, cityId: 'cal', startCash: 3_500_000 });
  addCapital(s, 60_000_000);
  cmd.travelTo(s, 'fmm');
  const site = Object.values(s.world.sites).find((x) => x.cityId === 'fmm' && x.employer)!;
  return { s, site };
}

function signed() {
  const { s, site } = atEnergySite();
  const r = cmd.signPowerDeal(s, site.id);
  if (!r.ok) throw new Error(r.reason);
  return { s, site, d: s.powerDeals[r.dealId]! };
}

describe('signing a power deal', () => {
  it('charges employees × the per-employee fee and books it as an intangible', () => {
    const { s, site } = atEnergySite();
    const fee = powerDealFee(s, site);
    expect(fee).toBeCloseTo(
      site.employer!.employees * POWER_DEAL.feePerEmployee * listLevel(s, 'fmm'),
    );
    const cash = s.company.cash;
    const { d } = (() => {
      const r = cmd.signPowerDeal(s, site.id);
      if (!r.ok) throw new Error(r.reason);
      return { d: s.powerDeals[r.dealId]! };
    })();
    expect(s.company.cash).toBeCloseTo(cash - fee);
    expect(d.termWeeks).toBe(PARTNER_CONTRACT_WEEKS);
    expect(intangibleAssets(s)).toBeCloseTo(fee);
    expect(cmd.powerDealBlocker(s, site.id)).toMatch(/already/);
    expect(s.events.log.some((e) => e.type === 'POWER_DEAL_SIGNED')).toBe(true);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('is only signed at an energy site you have travelled to', () => {
    const { s, site } = atEnergySite();
    cmd.travelTo(s, 'cal');
    expect(cmd.powerDealBlocker(s, site.id)).toMatch(/Travel/);
    const city = Object.values(s.world.sites).find((x) => x.cityId === 'cal' && x.employer);
    if (city) expect(cmd.powerDealBlocker(s, city.id)).toMatch(/energy sites/);
  });

  it('replaces payroll partnerships at energy sites', () => {
    const { s, site } = atEnergySite();
    expect(cmd.signBlocker(s, site.id, 'x', 'x')).toMatch(/power deals/);
  });
});

describe('a running power deal', () => {
  it('ramps contracted GPUs into the owned pool and pays for each one', () => {
    const { s, site, d } = signed();
    advanceWeeks(s, 60);
    expect(d.gpus).toBeGreaterThan(0);
    expect(dealGpus(s)).toBeCloseTo(d.gpus);
    expect(ownedGpus(s)).toBeGreaterThanOrEqual(d.gpus);
    expect(s.compute.ownedGpus).toBeGreaterThan(0);
    // The ramp heads for employees × GPUs per employee × participation × health factor.
    const peak = dealGpuTarget(site, 1, 100);
    expect(peak).toBeCloseTo(site.employer!.employees * POWER_DEAL.gpusPerEmployee * 1.1);
    expect(d.gpus).toBeLessThan(peak);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('cuts the power bill of your data centers in the same country', () => {
    const { s, d } = signed();
    expect(dealPowerMult(s, 'cal')).toBe(POWER_DEAL.powerDiscount);
    expect(dealPowerMult(s, 'nyc')).toBe(1); // another country
    cmd.travelTo(s, 'cal');
    const r = cmd.buildDataCenter(s, { where: { lotId: freeLot(s).id }, build: DEFAULT_DC_BUILD });
    if (!r.ok) throw new Error(r.reason);
    const dc = s.dataCenters[r.dataCenterId]!;
    expect(dataCenterPowerBill(s, dc)).toBeCloseTo(
      powerBill(dc.build, dc.cityId) * POWER_DEAL.powerDiscount,
    );
    cmd.releasePowerDeal(s, d.id);
    expect(dataCenterPowerBill(s, dc)).toBeCloseTo(powerBill(dc.build, dc.cityId));
  });

  it('health rises with a data center in the country and falls with a weak safety tier', () => {
    const { s, site } = signed();
    const base = powerDealHealthTarget(s, site);
    expect(base).toBe(POWER_DEAL.healthBase - POWER_DEAL.tierPenalty[s.company.tier]);
    s.company.tier = 'critical';
    expect(powerDealHealthTarget(s, site)).toBe(
      POWER_DEAL.healthBase - POWER_DEAL.tierPenalty.critical,
    );
  });

  it('renews in its last year and runs off when released', () => {
    const { s, d } = signed();
    expect(cmd.renewPowerDeal(s, d.id).ok).toBe(false);
    d.startWeek -= PARTNER_CONTRACT_WEEKS - PARTNER_RENEWAL.windowWeeks;
    const r = cmd.renewPowerDeal(s, d.id);
    expect(r.ok).toBe(true);
    expect(d.termWeeks).toBe(2 * PARTNER_CONTRACT_WEEKS);
    d.gpus = 1_000;
    expect(cmd.releasePowerDeal(s, d.id).ok).toBe(true);
    expect(d.status).toBe('runoff');
    expect(d.unamortized).toBe(0);
    advanceWeeks(s, PARTNER_RUNOFF_WEEKS);
    expect(s.powerDeals[d.id]).toBeUndefined();
    expect(identityGap(s)).toBeLessThan(1);
  });
});

describe('save migration 17 → 18', () => {
  it('adds an empty power-deal book', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const raw = s as unknown as Record<string, unknown>;
    delete raw.powerDeals;
    migrations[17]!(raw as never);
    expect(s.powerDeals).toEqual({});
  });
});
