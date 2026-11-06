// Backups (SCREENS §26): the numbers behind the backup file and the gentle
// "back up your lab" reminder, so components hold no magic numbers.

/** Game days played before a never-backed-up game counts as worth a reminder (8 weeks). */
export const BACKUP_REMINDER_MIN_DAY = 56;
/** Real days after the last backup before the reminder comes back. */
export const BACKUP_REMINDER_AFTER_DAYS = 14;
/** How long the reminder stays on screen in game (ms). */
export const BACKUP_REMINDER_TOAST_MS = 12_000;
/** The start of a backup file's name: frontier-lab-backup-YYYY-MM-DD.txt. */
export const BACKUP_FILE_PREFIX = 'frontier-lab-backup-';
/** Wait before freeing a downloaded backup file's temporary link (ms); older Safari needs a moment. */
export const BACKUP_REVOKE_MS = 1000;
