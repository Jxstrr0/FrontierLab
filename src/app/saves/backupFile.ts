// Backup files (SCREENS §26): the same save code the Saves screen shows, as a
// small text file. On a phone that can share files (iPhone, also from the Home
// Screen app) it goes through the share sheet, where "Save to Files" keeps it;
// elsewhere it downloads. Loading reads a file back as text for the usual
// save-code import, so the same checks and the same confirm step run.
import { BACKUP_FILE_PREFIX, BACKUP_REVOKE_MS } from '../../config/backup';

const MS_PER_DAY = 86_400_000;

/** frontier-lab-backup-YYYY-MM-DD.txt, in the player's local date. */
export function backupFileName(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${BACKUP_FILE_PREFIX}${y}-${m}-${d}.txt`;
}

/**
 * Saves `code` as a backup file. Resolves true when it was handed over (shared
 * or downloaded), false when the player cancelled the share sheet.
 */
export async function saveBackupFile(code: string): Promise<boolean> {
  const name = backupFileName();
  const text = `${code}\n`;
  let file: File | null = null;
  try {
    file = new File([text], name, { type: 'text/plain' });
  } catch {
    // Very old browsers have no File constructor; the download below still works.
  }
  if (file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return true;
    } catch (e) {
      // Cancelling the share sheet: nothing was saved, and nothing to report.
      if ((e as Error).name === 'AbortError') return false;
      // Any other share failure falls back to a download.
    }
  }
  const url = URL.createObjectURL(file ?? new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), BACKUP_REVOKE_MS);
  return true;
}

/** The text of a picked backup file, trimmed of the trailing newline and spaces. */
export async function readBackupFile(file: Blob): Promise<string> {
  return (await file.text()).trim();
}

/**
 * Whether to nudge the player to back up: they have real progress (`gameDay`
 * days into a game) and have never backed up on this device, or not for
 * `afterDays` real days.
 */
export function backupReminderDue(
  gameDay: number | null,
  lastBackup: number | null,
  now: number,
  minDay: number,
  afterDays: number,
): boolean {
  if (gameDay === null || gameDay < minDay) return false;
  if (lastBackup === null) return true;
  return now - lastBackup >= afterDays * MS_PER_DAY;
}
