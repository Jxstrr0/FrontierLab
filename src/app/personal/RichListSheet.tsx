// The rich list (SIMULATION §22) as a bottom sheet from the Personal Wealth
// rank chip: the 50 fortunes with you slotted in at today's net worth. The
// official rank (the chip) is set once a year; this list is the live estimate.
import { RICH_LIST } from '../../config/balance';
import { richListRows } from '../../sim/richList';
import { Sheet } from '../components';
import { money } from '../format/format';
import { useGame } from '../store';

export function RichListSheet(p: { onClose: () => void }) {
  const s = useGame();
  const sym = s.settings.currency;
  const rows = richListRows(s);
  const official = s.personal.empire.richList.rank;
  return (
    <Sheet title="The Rich List" onClose={p.onClose}>
      <p class="muted small pw-rich-note">
        {official
          ? `You ranked #${official} at the last year end.`
          : `Ranked each year end. The top ${RICH_LIST.size} only.`}{' '}
        Below: where today’s fortunes stand.
      </p>
      <ol class="pw-rich-list">
        {rows.map((r) => (
          <li class={r.you ? 'is-you' : undefined}>
            <span class="pw-rich-rank">{r.rank <= RICH_LIST.size ? `#${r.rank}` : '—'}</span>
            <span class="pw-rich-who">
              <span class="pw-rich-name">{r.you ? `${r.name} (you)` : r.name}</span>
              <span class="muted small">{r.source}</span>
            </span>
            <span class="pw-rich-worth">{money(r.worth, sym)}</span>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
