// Wizard step 2: the founder's name and portrait parts.
import type { AvatarSpec } from '../../sim/state';
import { AvatarPicker } from './AvatarPicker';
import { NAME_MAX, type Draft } from './draft';

export function StepFounder(p: { draft: Draft; patch: (d: Partial<Draft>) => void }) {
  const { draft, patch } = p;
  const setParts = (parts: Partial<AvatarSpec>) => patch({ avatar: { ...draft.avatar, ...parts } });
  return (
    <div class="stack">
      <label class="field">
        <span class="field-label">Founder name</span>
        <input
          class="field-input"
          type="text"
          value={draft.founderName}
          maxLength={NAME_MAX}
          placeholder="Your name"
          autoComplete="off"
          autoCapitalize="words"
          onInput={(e) => patch({ founderName: (e.target as HTMLInputElement).value })}
        />
      </label>
      <AvatarPicker value={draft.avatar} onChange={setParts} />
    </div>
  );
}
