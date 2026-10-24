// Saves (SCREENS §26): the autosave and three manual slots, plus save codes.
// From the title it loads and deletes; in game it can also save over a slot.
// Anything that would lose progress asks first.
import { useState } from 'preact/hooks';
import type { GameState } from '../../sim/state';
import { Confirm, Panel, SectionTitle } from '../components';
import { startLoop } from '../loop';
import { allSlotMeta, deleteSlot, loadFromSlot, saveToSlot, SLOTS, type SlotId } from '../saves';
import { closePanel, peekGame, screen, setGame, toast } from '../store';
import '../settings/standalone.css';
import { CodeTransfer } from './CodeTransfer';
import { SlotCard } from './SlotCard';
import './saves.css';

const SLOT_LABEL: Record<SlotId, string> = {
  auto: 'Autosave',
  '1': 'Slot 1',
  '2': 'Slot 2',
  '3': 'Slot 3',
};

type Pending =
  | { kind: 'overwrite'; slot: SlotId }
  | { kind: 'delete'; slot: SlotId }
  | { kind: 'replace'; state: GameState; what: string };

export function SavesScreen(p: { inGame?: boolean }) {
  const inGame = p.inGame === true;
  const [, setVersion] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const metas = allSlotMeta();
  const currency = peekGame()?.settings.currency ?? '$';
  const refresh = () => setVersion((v) => v + 1);

  /** Makes `state` the running game and opens the game screen. */
  const play = (state: GameState) => {
    setGame(state);
    screen.value = 'game';
    // The loop keeps running while the game screen stays up, so restart it
    // against the new game.
    if (inGame) startLoop();
  };
  /** Loading from the title is safe; in game it replaces unsaved progress. */
  const replaceWith = (state: GameState, what: string) =>
    inGame ? setPending({ kind: 'replace', state, what }) : play(state);

  const saveHere = (slot: SlotId) => {
    const game = peekGame();
    if (!game) return;
    const err = saveToSlot(slot, game);
    if (err) toast(err, 'bad');
    else toast(`Saved to ${SLOT_LABEL[slot].toLowerCase()}.`, 'good');
    refresh();
  };
  const load = (slot: SlotId) => {
    try {
      replaceWith(loadFromSlot(slot), SLOT_LABEL[slot].toLowerCase());
    } catch (e) {
      toast((e as Error).message, 'bad');
    }
  };

  const confirm = () => {
    const c = pending;
    setPending(null);
    if (!c) return;
    if (c.kind === 'overwrite') saveHere(c.slot);
    else if (c.kind === 'delete') {
      deleteSlot(c.slot);
      refresh();
    } else play(c.state);
  };

  return (
    <div class={inGame ? undefined : 'standalone'}>
      <Panel
        title={inGame ? 'Save game' : 'Load game'}
        subtitle={inGame ? undefined : 'Pick up where you left off'}
        onClose={inGame ? closePanel : () => (screen.value = 'title')}
      >
        <div class="saves">
          <SlotCard
            label={SLOT_LABEL.auto}
            meta={metas.auto}
            currency={currency}
            canSave={false}
            onSave={() => undefined}
            onLoad={() => load('auto')}
            onDelete={() => setPending({ kind: 'delete', slot: 'auto' })}
          />
          <SectionTitle>Your slots</SectionTitle>
          {SLOTS.filter((s) => s !== 'auto').map((slot) => (
            <SlotCard
              key={slot}
              label={SLOT_LABEL[slot]}
              meta={metas[slot]}
              currency={currency}
              canSave={inGame}
              onSave={() =>
                metas[slot] ? setPending({ kind: 'overwrite', slot }) : saveHere(slot)
              }
              onLoad={() => load(slot)}
              onDelete={() => setPending({ kind: 'delete', slot })}
            />
          ))}
          <CodeTransfer inGame={inGame} onLoad={(state) => replaceWith(state, 'the save code')} />
        </div>
      </Panel>

      {pending?.kind === 'overwrite' && (
        <Confirm
          title="Save over this slot?"
          body={`${SLOT_LABEL[pending.slot]} already holds ${metas[pending.slot]?.bankName ?? 'a game'}. Saving replaces it.`}
          confirmLabel="Save over it"
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.kind === 'delete' && (
        <Confirm
          title="Delete this save?"
          body={`${SLOT_LABEL[pending.slot]} (${metas[pending.slot]?.bankName ?? 'empty'}) will be gone for good.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.kind === 'replace' && (
        <Confirm
          title="Replace your current game?"
          body={`Loading ${pending.what} swaps out the game you're playing. Anything since your last save is lost.`}
          confirmLabel="Load it"
          danger
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
