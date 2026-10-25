// One save slot as a certificate card: the bank's medallion, name, game date,
// cash and when it was saved, with the actions that apply on this screen.
import { Card, Medallion } from '../components';
import { money } from '../format/format';
import type { SaveMeta } from '../saves';

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

/** "just now", "5 min ago", "3 h ago", "2 d ago". */
export function savedAgo(savedAt: number, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - savedAt) / MINUTE_MS));
  if (mins < 1) return 'just now';
  if (mins < MINUTES_PER_HOUR) return `${mins} min ago`;
  const hours = Math.round(mins / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `${hours} h ago`;
  return `${Math.round(hours / HOURS_PER_DAY)} d ago`;
}

export function SlotCard(p: {
  label: string;
  meta: SaveMeta | null;
  currency: string;
  /** Shows "Save here"; false for the autosave and on the title screen. */
  canSave: boolean;
  onSave: () => void;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const { meta } = p;
  return (
    <Card class="slot">
      <div class="slot-head">
        {meta ? (
          <Medallion
            ink={meta.brandInk}
            monogram={meta.monogram}
            shape={meta.logoShape}
            size={44}
          />
        ) : (
          <span class="slot-empty-mark" aria-hidden="true" />
        )}
        <div class="slot-titles">
          <div class="slot-label small muted">{p.label}</div>
          <div class="slot-name">{meta ? meta.bankName : 'Empty slot'}</div>
        </div>
      </div>
      {meta && (
        <div class="slot-facts small">
          <span>{meta.date}</span>
          <span>Cash {money(meta.cash, p.currency)}</span>
          <span class="muted">Saved {savedAgo(meta.savedAt)}</span>
        </div>
      )}
      <div class="btn-row slot-actions">
        {p.canSave && (
          <button type="button" class="btn btn-primary btn-small" onClick={p.onSave}>
            Save here
          </button>
        )}
        {meta && (
          <button type="button" class="btn btn-secondary btn-small" onClick={p.onLoad}>
            Load
          </button>
        )}
        {meta && (
          <button type="button" class="btn btn-secondary btn-small" onClick={p.onDelete}>
            Delete
          </button>
        )}
      </div>
    </Card>
  );
}
