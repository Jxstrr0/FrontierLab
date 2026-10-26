// HQ tab order (SCREENS §10, DATA_MODEL schema v22): tabs follow DEPT_ORDER
// until you move one; moves swap neighbours among the floors you have and
// skip departments without a floor; a floor added later slots in where
// DEPT_ORDER puts it; a v21 save starts with the usual order.
import { describe, expect, it } from 'vitest';
import { DEPT_ORDER } from '../../src/data/departments';
import * as cmd from '../../src/sim/commands';
import { hqTabOrder, visibleHqTabs } from '../../src/sim/hqTabs';
import { newGame } from '../../src/sim/newGame';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';
import { execGame } from '../helpers/executives';

describe('HQ tab order', () => {
  it('follows DEPT_ORDER until you move a tab', () => {
    const s = execGame(['finance', 'hr', 'risk']);
    expect(hqTabOrder(s)).toEqual([...DEPT_ORDER]);
    expect(visibleHqTabs(s)).toEqual(['finance', 'hr', 'risk', 'executive']);
    expect(cmd.hqTabsRearranged(s)).toBe(false);
  });

  it('moves a tab past its visible neighbour, skipping floors you lack', () => {
    const s = execGame(['finance', 'hr', 'risk']);
    expect(cmd.moveHqTab(s, 'risk', -1).ok).toBe(true);
    expect(visibleHqTabs(s)).toEqual(['finance', 'risk', 'hr', 'executive']);
    expect(cmd.moveHqTab(s, 'executive', -1).ok).toBe(true);
    expect(cmd.moveHqTab(s, 'executive', -1).ok).toBe(true);
    expect(visibleHqTabs(s)).toEqual(['finance', 'executive', 'risk', 'hr']);
    expect(cmd.hqTabsRearranged(s)).toBe(true);
    // Moving the first tab up, or the last down, changes nothing.
    expect(cmd.moveHqTab(s, 'finance', -1).ok).toBe(true);
    expect(cmd.moveHqTab(s, 'hr', 1).ok).toBe(true);
    expect(visibleHqTabs(s)).toEqual(['finance', 'executive', 'risk', 'hr']);
  });

  it('keeps unbuilt departments in DEPT_ORDER around the ones you moved', () => {
    const s = execGame(['finance', 'hr', 'risk']);
    cmd.moveHqTab(s, 'executive', -1);
    cmd.moveHqTab(s, 'executive', -1);
    cmd.moveHqTab(s, 'executive', -1);
    const order = hqTabOrder(s);
    expect(order[0]).toBe('executive');
    expect(order.filter((d) => d !== 'executive')).toEqual(
      DEPT_ORDER.filter((d) => d !== 'executive'),
    );
    expect(new Set(order).size).toBe(DEPT_ORDER.length);
  });

  it('refuses unknown departments and ones without a floor, and resets', () => {
    const s = execGame(['finance']);
    expect(cmd.moveHqTab(s, 'lobby' as never, 1).ok).toBe(false);
    expect(cmd.moveHqTab(s, 'marketing', 1).ok).toBe(false);
    cmd.moveHqTab(s, 'executive', -1);
    expect(visibleHqTabs(s)).toEqual(['executive', 'finance']);
    expect(cmd.resetHqTabOrder(s).ok).toBe(true);
    expect(s.settings.hqTabOrder).toEqual([]);
    expect(visibleHqTabs(s)).toEqual(['finance', 'executive']);
  });

  it('validates the setting as a list of distinct departments', () => {
    const s = newGame({ seed: 2, cityId: 'cal' });
    expect(cmd.setSettings(s, { hqTabOrder: ['risk', 'finance'] }).ok).toBe(true);
    expect(cmd.setSettings(s, { hqTabOrder: ['risk', 'risk'] }).ok).toBe(false);
    expect(cmd.setSettings(s, { hqTabOrder: ['lobby'] as never }).ok).toBe(false);
  });

  it('gives v21 saves the usual order', () => {
    const s = newGame({ seed: 7, cityId: 'cal' });
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & {
      schemaVersion: number;
    };
    delete (raw.settings as Partial<GameState['settings']>).hqTabOrder;
    raw.schemaVersion = 21;
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.settings.hqTabOrder).toEqual([]);
  });
});
