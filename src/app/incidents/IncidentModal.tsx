// Incident modal (SCREENS §22): "Incident" with the case's scope, the advisor
// telling the story, a "Case 1 of N" pager, two or three choices with their cost
// and effect, and for branch cases a link to hand them to the branch manager.
import { useEffect, useState } from 'preact/hooks';
import { avatarFromSeed } from '../../art/portraits';
import { INCIDENT_SPECS } from '../../data/incidents';
import * as cmd from '../../sim/commands';
import { optionBlocker, troublesDelegated } from '../../sim/incidents';
import type { GameState, Incident } from '../../sim/state';
import { Medallion, Modal, Portrait } from '../components';
import { gameDate, money } from '../format/format';
import { act, modal, openPanel, toast, useGame } from '../store';
import './incidents.css';

export function IncidentModal() {
  const s = useGame();
  const cases = s.incidents.active;
  const [index, setIndex] = useState(0);
  const close = () => (modal.value = null);
  // Every case closed (a deadline, say): nothing left to show.
  useEffect(() => {
    if (cases.length === 0) close();
  }, [cases.length]);
  if (cases.length === 0) return null;
  const i = Math.min(index, cases.length - 1);
  const inc = cases[i]!;
  const spec = INCIDENT_SPECS[inc.type];
  const where = scopeLabel(s, inc);

  const choose = (optionId: string) => {
    const r = act(cmd.resolveIncident, inc.id, optionId);
    if (!r.ok) return;
    const label = inc.options.find((o) => o.id === optionId)?.label ?? '';
    toast(r.outcome ?? `${spec?.title ?? 'Case'}: ${label}.`, r.outcome ? 'info' : 'good');
    if (s.flags.gameOver) modal.value = { type: 'gameover' };
    else if (s.incidents.active.length === 0) close();
  };

  return (
    <Modal
      title="Incident"
      class="incident-modal"
      onClose={close}
      icon={
        <Medallion
          ink={s.meta.brandInk}
          monogram={s.meta.monogram}
          shape={s.meta.logoShape}
          size={30}
        />
      }
      footer={
        inc.scopeKind === 'branch' ? (
          <button
            type="button"
            class="inc-delegate"
            onClick={() => {
              close();
              openPanel({ type: 'branch', branchId: inc.scope, tab: 'service' });
            }}
          >
            Your manager can handle these
          </button>
        ) : undefined
      }
    >
      <div class="inc-bar">
        <span class="inc-scope">{where}</span>
        <Pager i={i} n={cases.length} onPage={setIndex} />
      </div>
      <section class="inc-case" aria-live="polite">
        <div class="inc-teller">
          <Portrait avatar={tellerAvatar(s, inc)} size={44} />
          <div>
            <h3 class="inc-title">{spec?.title ?? inc.type}</h3>
            <div class="inc-teller-name">{tellerName(s, inc)}</div>
          </div>
        </div>
        <p class="inc-text">{String(inc.data.text ?? '')}</p>
      </section>
      <div class="inc-options">
        {inc.options.map((o) => {
          const blocked = optionBlocker(s, inc, o.id);
          return (
            <button
              type="button"
              key={o.id}
              class="inc-option"
              disabled={!!blocked}
              aria-describedby={`inc-${inc.id}-${o.id}`}
              onClick={() => choose(o.id)}
            >
              <span class="inc-option-head">
                <span class="inc-option-label">{o.label}</span>
                {!spec?.info && (
                  <span class="inc-option-cost">
                    {o.cost > 0 ? money(o.cost, s.settings.currency) : 'No cost'}
                  </span>
                )}
              </span>
              <span class="inc-option-effect" id={`inc-${inc.id}-${o.id}`}>
                {blocked ?? o.effect}
              </span>
            </button>
          );
        })}
      </div>
      {!spec?.info && (
        <p class="inc-deadline">
          Decide by {gameDate(s.meta.startDate, inc.deadlineWeek * 7)}, or we go with “
          {inc.options.find((o) => o.id === spec?.worst)?.label}”.
        </p>
      )}
    </Modal>
  );
}

function Pager(p: { i: number; n: number; onPage: (i: number) => void }) {
  return (
    <span class="inc-pager">
      {p.n > 1 && (
        <button
          type="button"
          class="inc-page"
          aria-label="Previous case"
          disabled={p.i === 0}
          onClick={() => p.onPage(p.i - 1)}
        >
          ‹
        </button>
      )}
      <span class="inc-count">
        Case {p.i + 1} of {p.n}
      </span>
      {p.n > 1 && (
        <button
          type="button"
          class="inc-page"
          aria-label="Next case"
          disabled={p.i >= p.n - 1}
          onClick={() => p.onPage(p.i + 1)}
        >
          ›
        </button>
      )}
    </span>
  );
}

function scopeLabel(s: GameState, inc: Incident): string {
  if (inc.scopeKind === 'branch') return s.branches[inc.scope]?.name ?? 'A branch';
  if (inc.scopeKind === 'city') return String(inc.data.city ?? inc.scope);
  return s.meta.bankName;
}

function tellerName(s: GameState, inc: Incident): string {
  if (inc.scopeKind !== 'branch') return 'Your chief of staff';
  const b = s.branches[inc.scope];
  const mgr = b?.managerId ? s.people.managers[b.managerId] : undefined;
  if (!mgr) return 'Head teller';
  return troublesDelegated(s, inc.scope) ? `${mgr.name}, branch manager` : mgr.name;
}

/** The speaker's portrait: the branch manager's own, otherwise one drawn from the role. */
function tellerAvatar(s: GameState, inc: Incident) {
  const b = inc.scopeKind === 'branch' ? s.branches[inc.scope] : undefined;
  const mgr = b?.managerId ? s.people.managers[b.managerId] : undefined;
  return mgr?.portrait ?? avatarFromSeed(`${tellerName(s, inc)}:${inc.scope}`);
}
