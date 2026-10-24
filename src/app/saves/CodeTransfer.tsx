// Save codes (SCREENS §26): export a game as a text code to copy or share, and
// import one pasted from another device. The code carries the save's version, so
// a code from a newer game is refused with a clear message.
import { useRef, useState } from 'preact/hooks';
import { exportCode, importCode } from '../../sim/save/serialize';
import type { GameState } from '../../sim/state';
import { loadFromSlot, slotMeta, type SlotId } from '../saves';
import { peekGame, toast } from '../store';
import { SectionTitle, Segmented } from '../components';

type Source = 'current' | SlotId;

const SOURCE_LABEL: Record<Source, string> = {
  current: 'This game',
  auto: 'Autosave',
  '1': 'Slot 1',
  '2': 'Slot 2',
  '3': 'Slot 3',
};
const SOURCE_ORDER: Source[] = ['current', 'auto', '1', '2', '3'];
const BYTES_PER_KB = 1024;

export function CodeTransfer(p: {
  inGame: boolean;
  /** Replaces the running game (or starts this one, from the title). */
  onLoad: (state: GameState) => void;
}) {
  const sources = SOURCE_ORDER.filter((s) => (s === 'current' ? p.inGame : slotMeta(s) !== null));
  return (
    <>
      <SectionTitle>Move a save to another device</SectionTitle>
      <Export sources={sources} />
      <Import inGame={p.inGame} onLoad={p.onLoad} />
    </>
  );
}

function Export(p: { sources: Source[] }) {
  const [source, setSource] = useState<Source | null>(null);
  const [code, setCode] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  const chosen = source && p.sources.includes(source) ? source : p.sources[0];

  if (!chosen) {
    return <p class="muted small">Nothing to export yet. Save a game first.</p>;
  }

  const make = () => {
    try {
      const state = chosen === 'current' ? peekGame() : loadFromSlot(chosen);
      if (!state) throw new Error('There is no game to export.');
      setCode(exportCode(state));
    } catch (e) {
      toast((e as Error).message, 'bad');
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast('Save code copied.', 'good');
    } catch {
      // Clipboard access can be blocked; leave the code selected to copy by hand.
      box.current?.select();
      toast('Select the code and copy it by hand.', 'info');
    }
  };
  const share = () => {
    navigator.share({ title: 'Vault Street save code', text: code }).catch(() => {
      // Dismissing the share sheet rejects; nothing to report.
    });
  };

  return (
    <div class="stack transfer">
      <div class="small muted">Export a save code</div>
      <div class="export-row">
        {p.sources.length > 1 && (
          <Segmented
            label="Save to export"
            value={chosen}
            options={p.sources.map((s) => ({ value: s, label: SOURCE_LABEL[s] }))}
            onChange={(s) => {
              setSource(s);
              setCode('');
            }}
          />
        )}
        <button type="button" class="btn btn-secondary btn-block" onClick={make}>
          Create save code
        </button>
      </div>
      {code && (
        <>
          <textarea
            ref={box}
            class="code-box"
            readOnly
            rows={4}
            value={code}
            aria-label="Save code"
            onFocus={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <div class="small muted">{Math.ceil(code.length / BYTES_PER_KB)} KB of text</div>
          <div class="btn-row">
            <button type="button" class="btn btn-primary btn-small" onClick={copy}>
              Copy
            </button>
            {typeof navigator.share === 'function' && (
              <button type="button" class="btn btn-secondary btn-small" onClick={share}>
                Share
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Import(p: { inGame: boolean; onLoad: (state: GameState) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    try {
      p.onLoad(importCode(text));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const paste = async () => {
    try {
      setText(await navigator.clipboard.readText());
      setError(null);
    } catch {
      toast('Paste into the box by hand.', 'info');
    }
  };

  return (
    <div class="stack transfer">
      <div class="small muted">Import a save code</div>
      <textarea
        class="code-box"
        rows={4}
        value={text}
        placeholder="Paste a save code here. It starts with VS."
        aria-label="Save code to import"
        aria-invalid={error !== null}
        onInput={(e) => {
          setText((e.target as HTMLTextAreaElement).value);
          setError(null);
        }}
      />
      {error && (
        <p class="form-error" role="alert">
          {error}
        </p>
      )}
      <div class="btn-row">
        <button type="button" class="btn btn-secondary btn-small" onClick={paste}>
          Paste
        </button>
        <button
          type="button"
          class="btn btn-primary btn-small"
          disabled={!text.trim()}
          onClick={load}
        >
          Load code
        </button>
      </div>
    </div>
  );
}
