// The gentle "back up your lab" reminder (SCREENS §26). Shown at most once per
// session, and only at a calm moment: as a small banner on the title screen,
// or as a notice between weeks (it waits for any popup to close). It appears
// when there is real progress and this device has never made a backup, or not
// for a fortnight. Its button opens the Saves screen.
import {
  BACKUP_REMINDER_AFTER_DAYS,
  BACKUP_REMINDER_MIN_DAY,
  BACKUP_REMINDER_TOAST_MS,
} from '../../config/backup';
import { loadLastBackup } from '../saves';
import { notice, openPanel } from '../store';
import { backupReminderDue } from './backupFile';

export const BACKUP_REMINDER_TEXT =
  'Keep your lab safe: save a backup file in case this browser clears its storage.';

let shownThisSession = false;

/**
 * True (once per session) when the reminder should show for a game `gameDay`
 * days in. The caller shows it; asking again later this session says false.
 */
export function takeBackupReminder(gameDay: number | null, now = Date.now()): boolean {
  if (shownThisSession) return false;
  const due = backupReminderDue(
    gameDay,
    loadLastBackup(),
    now,
    BACKUP_REMINDER_MIN_DAY,
    BACKUP_REMINDER_AFTER_DAYS,
  );
  if (due) shownThisSession = true;
  return due;
}

/** In game, after a week's autosave: a quiet notice with a "Back up" button. */
export function remindToBackUpInGame(gameDay: number): void {
  if (!takeBackupReminder(gameDay)) return;
  notice(BACKUP_REMINDER_TEXT, 'info', BACKUP_REMINDER_TOAST_MS, {
    label: 'Back up',
    run: () => openPanel({ type: 'saves' }),
  });
}
