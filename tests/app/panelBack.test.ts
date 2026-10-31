// The panel Back trail (src/app/store.ts): a panel opened from another stacks
// it, moving within one kind of screen (an HQ floor) replaces rather than
// stacks, Back returns to the screen before, and closing ends the trail.
import { afterEach, describe, expect, it } from 'vitest';
import { backPanel, closePanel, openPanel, panel, panelHistory } from '../../src/app/store';

afterEach(() => closePanel());

describe('panel Back', () => {
  it('stacks screens opened from another panel and walks back through them', () => {
    openPanel({ type: 'branches' });
    openPanel({ type: 'branch', branchId: 'b1' });
    openPanel({ type: 'hq', dept: 'finance' });
    openPanel({ type: 'hq', dept: 'hr' });
    expect(panelHistory.value.map((r) => r.type)).toEqual(['branches', 'branch']);
    backPanel();
    expect(panel.value).toEqual({ type: 'branch', branchId: 'b1' });
    backPanel();
    expect(panel.value).toEqual({ type: 'branches' });
    expect(panelHistory.value).toEqual([]);
  });

  it('ends the trail when the panel closes', () => {
    openPanel({ type: 'company' });
    openPanel({ type: 'milestones' });
    closePanel();
    expect(panelHistory.value).toEqual([]);
    openPanel({ type: 'projects' });
    expect(panelHistory.value).toEqual([]);
  });
});
