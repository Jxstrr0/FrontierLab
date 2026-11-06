// Backup files and the backup reminder (src/app/saves/backupFile.ts,
// src/sim/save/storage.ts): the file name, when the reminder is due, and the
// last-backup time kept on the device.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backupFileName, backupReminderDue, readBackupFile } from '../../src/app/saves/backupFile';
import { loadLastBackup, markBackedUp } from '../../src/sim/save/storage';

const DAY = 86_400_000;

describe('backup files', () => {
  it('names the file after the local date', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 30))).toBe('frontier-lab-backup-2026-01-05.txt');
    expect(backupFileName(new Date(2026, 10, 16))).toBe('frontier-lab-backup-2026-11-16.txt');
  });

  it('reads a file back without its trailing newline or spaces', async () => {
    const file = new Blob(['  FL39:abc\n\n'], { type: 'text/plain' });
    expect(await readBackupFile(file)).toBe('FL39:abc');
  });
});

describe('backup reminder', () => {
  const now = 100 * DAY;
  const due = (day: number | null, last: number | null) =>
    backupReminderDue(day, last, now, 56, 14);

  it('waits for real progress', () => {
    expect(due(null, null)).toBe(false);
    expect(due(55, null)).toBe(false);
    expect(due(56, null)).toBe(true);
  });

  it('comes back a fortnight after the last backup', () => {
    expect(due(400, now - 13 * DAY)).toBe(false);
    expect(due(400, now - 14 * DAY)).toBe(true);
  });
});

describe('last backup time', () => {
  let items: Map<string, string>;
  beforeEach(() => {
    items = new Map();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => items.get(k) ?? null,
        setItem: (k: string, v: string) => void items.set(k, v),
        removeItem: (k: string) => void items.delete(k),
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is empty until a backup is made, then remembered under the game prefix', () => {
    expect(loadLastBackup()).toBeNull();
    markBackedUp(1234);
    expect(loadLastBackup()).toBe(1234);
    expect([...items.keys()]).toEqual(['frontierlab.lastBackup']);
  });

  it('never throws when storage is missing', () => {
    vi.stubGlobal('window', undefined);
    expect(loadLastBackup()).toBeNull();
    expect(() => markBackedUp()).not.toThrow();
  });
});
