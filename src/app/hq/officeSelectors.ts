// Read-only views of your offices for the HQ and Office for lease panels
// (SCREENS §9, §10): which departments you have, floor desks, which floors can
// be added, and what releasing a floor or a whole office would do (staff let go
// with severance, fit-out written off, deposit back). Nothing here mutates
// GameState; the release previews mirror src/sim/commands/hq.ts.
import { FEATURES, SEVERANCE_WEEKS, WEEKS_PER_YEAR, type FeatureId } from '../../config/balance';
import { DEPARTMENTS, DEPT_ORDER } from '../../data/departments';
import { assetBookValue } from '../../sim/balanceSheet';
import { deptAvailable } from '../../sim/commands';
import { deptDesks } from '../../sim/hq';
import { visibleHqTabs } from '../../sim/hqTabs';
import type { DeptId, GameState, Office } from '../../sim/state';

/** Your offices, oldest lease first. */
export function officeList(s: GameState): Office[] {
  return Object.values(s.offices).sort(
    (a, b) => a.sinceWeek - b.sinceWeek || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** The office an HQ route shows: the one asked for, else the first. */
export function pickOffice(s: GameState, officeId?: string): Office | undefined {
  return (officeId ? s.offices[officeId] : undefined) ?? officeList(s)[0];
}

export function officeAddress(s: GameState, office: Office): string {
  return s.world.officeListings[office.listingId]?.address ?? 'Head office';
}

/** Departments with at least one floor, in your tab order (SCREENS §10). */
export function hqDepts(s: GameState): DeptId[] {
  return visibleHqTabs(s);
}

/** Desks one floor of this department gives in this office. */
export function floorDesks(office: Pick<Office, 'desksPerFloor'>, dept: DeptId): number {
  return DEPARTMENTS[dept].fixedDesks ?? office.desksPerFloor;
}

/** Departments whose floors can be fitted out in this build (HQ on, and each floor's stage on). */
export function addableDepts(features: Record<FeatureId, boolean> = FEATURES): DeptId[] {
  if (!features.hq) return [];
  return DEPT_ORDER.filter((d) => deptAvailable(d) && features[DEPARTMENTS[d].feature]);
}

export function usedFloors(office: Office): number {
  return office.floors.filter((f) => f !== null).length;
}

/** Book value of a floor's fit-out: what releasing it writes off. */
export function fitoutBookValue(s: GameState, officeId: string, floor: number): number {
  const slot = `floor${floor}`;
  return s.company.fixedAssets
    .filter((a) => a.ownerId === officeId && a.slot === slot)
    .reduce((sum, a) => sum + assetBookValue(a), 0);
}

/** The floor "Release floor" acts on: this department's top floor here, else in another office. */
export function floorToRelease(
  s: GameState,
  officeId: string | undefined,
  dept: DeptId,
): { officeId: string; floor: number } | null {
  const order = officeList(s).sort((a, b) => (a.id === officeId ? -1 : b.id === officeId ? 1 : 0));
  for (const o of order) {
    const floor = o.floors.lastIndexOf(dept);
    if (floor >= 0) return { officeId: o.id, floor };
  }
  return null;
}

export interface ReleaseImpact {
  dept: DeptId;
  /** Desks the department keeps elsewhere. */
  desksAfter: number;
  letGo: number;
  severance: number;
  /** The department disappears (no floors left). */
  closes: boolean;
}

function impact(s: GameState, dept: DeptId, desksLost: number): ReleaseImpact {
  const d = s.departments[dept];
  const desksAfter = Math.max(0, deptDesks(s, dept) - desksLost);
  const staff = d?.staff ?? 0;
  const letGo = desksAfter === 0 ? staff : Math.max(0, staff - desksAfter);
  const salary = d?.salary ?? 0;
  return {
    dept,
    desksAfter,
    letGo,
    severance: (letGo * salary * SEVERANCE_WEEKS) / WEEKS_PER_YEAR,
    closes: desksAfter === 0,
  };
}

/** What releasing one floor would do. */
export function releaseFloorPreview(s: GameState, officeId: string, floor: number) {
  const office = s.offices[officeId];
  const dept = office?.floors[floor];
  if (!office || !dept) return null;
  return {
    ...impact(s, dept, floorDesks(office, dept)),
    writeOff: fitoutBookValue(s, officeId, floor),
  };
}

/** What releasing a whole office would do: every floor at once, deposit back. */
export function releaseOfficePreview(s: GameState, officeId: string) {
  const office = s.offices[officeId];
  if (!office) return null;
  const lost = new Map<DeptId, number>();
  office.floors.forEach((d) => {
    if (d) lost.set(d, (lost.get(d) ?? 0) + floorDesks(office, d));
  });
  const depts = [...lost].map(([d, desks]) => impact(s, d, desks));
  const writeOff = office.floors.reduce((sum, _, i) => sum + fitoutBookValue(s, officeId, i), 0);
  return {
    depts,
    letGo: depts.reduce((n, x) => n + x.letGo, 0),
    severance: depts.reduce((n, x) => n + x.severance, 0),
    writeOff,
    deposit: office.deposit,
  };
}

export const SEVERANCE_NOTE = `${SEVERANCE_WEEKS} weeks' severance`;
