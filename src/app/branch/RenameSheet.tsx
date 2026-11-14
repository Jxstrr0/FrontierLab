// The one-field rename sheet (SCREENS §5.5, §5b): a name field, Cancel and
// Save. Sales offices and data centers both use it; `onSave` runs the rename
// command and returns true when the new name stuck, which closes the sheet.
import { useState } from 'preact/hooks';
import { BRANCH_NAME_MAX } from '../../config/balance';
import { Sheet } from '../components';
import './branch.css';

export function RenameSheet(p: {
  title: string;
  label: string;
  name: string;
  onSave: (name: string) => boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(p.name);
  return (
    <Sheet title={p.title} onClose={p.onClose}>
      <form
        class="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (p.onSave(name)) p.onClose();
        }}
      >
        <label class="br-field">
          <span class="muted small">{p.label}</span>
          <input
            class="br-input"
            value={name}
            maxLength={BRANCH_NAME_MAX}
            autoFocus
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </label>
        <div class="btn-row">
          <button type="button" class="btn btn-secondary" onClick={p.onClose}>
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
