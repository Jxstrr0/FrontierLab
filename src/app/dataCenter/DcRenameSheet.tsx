// Rename sheet for a data center (SCREENS §5b), the same form as renaming a
// sales office: one name field, Cancel and Save.
import { useState } from 'preact/hooks';
import { BRANCH_NAME_MAX } from '../../config/balance';
import * as cmd from '../../sim/commands';
import type { DataCenter } from '../../sim/state';
import { Sheet } from '../components';
import { act } from '../store';
import '../branch/branch.css';

export function DcRenameSheet({ dc, onClose }: { dc: DataCenter; onClose: () => void }) {
  const [name, setName] = useState(dc.name);
  const save = () => {
    if (act(cmd.renameDataCenter, dc.id, name).ok) onClose();
  };
  return (
    <Sheet title="Rename data center" onClose={onClose}>
      <form
        class="stack"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label class="br-field">
          <span class="muted small">Data center name</span>
          <input
            class="br-input"
            value={name}
            maxLength={BRANCH_NAME_MAX}
            autoFocus
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </label>
        <div class="btn-row">
          <button type="button" class="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </Sheet>
  );
}
