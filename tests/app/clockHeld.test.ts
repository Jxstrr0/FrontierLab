// Time passes only on the map (DESIGN §5.1): the loop asks clockHeld() before
// advancing a day, so any open panel, sheet or modal holds the clock.
import { afterEach, describe, expect, it } from 'vitest';
import { clockHeld, modal, panel, sheet } from '../../src/app/store';

afterEach(() => {
  panel.value = null;
  sheet.value = null;
  modal.value = null;
});

describe('clockHeld', () => {
  it('runs on the bare map', () => {
    expect(clockHeld()).toBe(false);
  });

  it('holds while a panel, a sheet or a modal is open', () => {
    panel.value = { type: 'company' };
    expect(clockHeld()).toBe(true);
    panel.value = null;
    sheet.value = 'menu';
    expect(clockHeld()).toBe(true);
    sheet.value = null;
    modal.value = { type: 'weekly', week: 3 };
    expect(clockHeld()).toBe(true);
  });
});
