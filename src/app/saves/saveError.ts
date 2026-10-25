// Tells the player a save failed. When storage is full the toast carries an
// "Export save" button that opens the Save game panel, where the save can be
// copied out as a code before a slot is deleted.
import { STORAGE_FULL } from '../saves';
import { openPanel, screen, toast } from '../store';

const LONG_TOAST_MS = 8000;

export function reportSaveError(err: string): void {
  const exportable = err === STORAGE_FULL && screen.value === 'game';
  toast(
    err,
    'bad',
    LONG_TOAST_MS,
    exportable ? { label: 'Export save', run: () => openPanel({ type: 'saves' }) } : undefined,
  );
}
