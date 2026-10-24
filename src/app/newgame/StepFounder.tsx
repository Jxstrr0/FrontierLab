// Wizard step 2: the founder's name and portrait parts.
import type { AvatarPart } from '../../data/avatarParts';
import { AvatarPicker } from './AvatarPicker';
import { NAME_MAX, type Draft } from './draft';

export function StepFounder(p: { draft: Draft; patch: (d: Partial<Draft>) => void }) {
  const { draft, patch } = p;
  const setPart = (part: AvatarPart, index: number) =>
    patch({ avatar: { ...draft.avatar, [part]: index } });
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
      <AvatarPicker value={draft.avatar} onChange={setPart} />
    </div>
  );
}
