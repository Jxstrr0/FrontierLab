// "Where to look" (SCREENS §24): the top few things that need you, worst first,
// each a tap away. Reads the pure ranking in src/sim/attention.ts; the
// Company screen shows it above the capital meter.
import { ATTENTION } from '../../config/balance';
import { attentionItems, type AttentionRoute } from '../../sim/attention';
import type { GameState } from '../../sim/state';
import { Badge, Card, SectionTitle } from '../components';
import { modal, openPanel } from '../store';

const TONE_LABEL = { bad: 'Urgent', warn: 'Watch', info: 'Note' } as const;

/** Opens the screen an item points at; the Company screen itself needs no move. */
function go(route: AttentionRoute): void {
  switch (route.kind) {
    case 'branch':
      openPanel({ type: 'branch', branchId: route.branchId });
      break;
    case 'branches':
      openPanel({ type: 'branches' });
      break;
    case 'hq':
      openPanel(route.dept ? { type: 'hq', dept: route.dept } : { type: 'hq' });
      break;
    case 'incidents':
      modal.value = { type: 'incident' };
      break;
    case 'company':
      break;
  }
}

export function WhereToLook(p: { s: GameState }) {
  const items = attentionItems(p.s);
  const shown = items.slice(0, ATTENTION.shown);
  const more = items.length - shown.length;
  return (
    <div>
      <SectionTitle>Where to look</SectionTitle>
      <Card>
        {shown.length === 0 ? (
          <p class="attn-clear">
            <Badge tone="good">All clear</Badge> Nothing needs you right now.
          </p>
        ) : (
          <ul class="attn-list">
            {shown.map((it) => {
              const here = it.route.kind === 'company';
              const body = (
                <>
                  <span class="attn-head">
                    <Badge tone={it.tone}>{TONE_LABEL[it.tone]}</Badge>
                    <span class="attn-title">{it.title}</span>
                  </span>
                  <span class="muted small">{it.detail}</span>
                </>
              );
              return (
                <li key={it.id}>
                  {here ? (
                    <div class="attn-row">{body}</div>
                  ) : (
                    <button type="button" class="attn-row attn-tap" onClick={() => go(it.route)}>
                      {body}
                      <span class="attn-arrow" aria-hidden="true">
                        ›
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {more > 0 && (
          <p class="muted small attn-more">
            {more} more {more === 1 ? 'item' : 'items'} further down the list.
          </p>
        )}
      </Card>
    </div>
  );
}
