// Founder avatar picker: the engraved portrait (ART_DIRECTION §4) pinned at
// the top of the scrolling area so it stays in view while you scroll, with a
// short description and a Shuffle button; then the parts in three groups
// (Face, Hair, Style), one row per part, and swatch rows for skin, hair and
// outfit colours. Used by the New Game wizard and by Settings. Changes come
// back as a partial AvatarSpec.
import { avatarFromSeed } from '../../art/portraits';
import {
  AVATAR_GROUPS,
  AVATAR_PARTS,
  type AvatarPart,
  type AvatarPartSpec,
} from '../../data/avatarParts';
import { Portrait } from '../components';
import type { AvatarSpec } from '../../sim/state';
import './avatar.css';

function optionName(part: AvatarPart, spec: AvatarSpec): string {
  const names = AVATAR_PARTS.find((x) => x.part === part)!.names;
  return names[spec[part]] ?? '';
}

/** A short description of the chosen look, e.g. "Bob · auburn hair · burgundy hoodie". */
export function avatarSummary(a: AvatarSpec): string {
  const lower = (part: AvatarPart) => optionName(part, a).toLowerCase();
  return [
    `${optionName('hair', a)}, ${lower('hairTone')} hair`,
    a.facial ? lower('facial') : '',
    a.glasses ? `${lower('glasses')} glasses` : '',
    `${lower('outfit')} ${lower('attire')}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** A fresh random face for the Shuffle button (the shading density stays as chosen). */
function shuffled(): Partial<AvatarSpec> {
  // UI-only randomness: the sim only ever sees the parts that come out of it.
  const parts: Partial<AvatarSpec> = avatarFromSeed(Math.floor(Math.random() * 0x7fffffff));
  delete parts.shade;
  return parts;
}

export function AvatarPicker(p: {
  value: AvatarSpec;
  onChange: (parts: Partial<AvatarSpec>) => void;
}) {
  return (
    <div class="avatar-picker">
      <div class="avatar-stage">
        <Portrait avatar={p.value} size={112} label="Your portrait" />
        <div class="avatar-stage-side">
          <p class="avatar-summary small muted">{avatarSummary(p.value)}</p>
          <button
            type="button"
            class="btn btn-secondary btn-small"
            onClick={() => p.onChange(shuffled())}
          >
            Shuffle
          </button>
        </div>
      </div>
      {AVATAR_GROUPS.map((group) => (
        <div class="part-group" key={group.id}>
          <h3 class="part-group-title">{group.label}</h3>
          <div class="part-list">
            {AVATAR_PARTS.filter((spec) => spec.group === group.id).map((spec) =>
              spec.swatches ? (
                <SwatchRow
                  key={spec.part}
                  spec={spec}
                  value={p.value[spec.part]}
                  onPick={(i) => p.onChange({ [spec.part]: i })}
                />
              ) : (
                <PartRow
                  key={spec.part}
                  label={spec.label}
                  name={spec.names[p.value[spec.part]] ?? ''}
                  index={p.value[spec.part]}
                  count={spec.names.length}
                  onPick={(i) => p.onChange({ [spec.part]: i })}
                />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PartRow(p: {
  label: string;
  name: string;
  index: number;
  count: number;
  onPick: (index: number) => void;
}) {
  const step = (d: number) => p.onPick((p.index + d + p.count) % p.count);
  return (
    <div class="part-row">
      <span class="part-label">{p.label}</span>
      <button
        type="button"
        class="icon-btn"
        aria-label={`Previous ${p.label}`}
        onClick={() => step(-1)}
      >
        ‹
      </button>
      <span class="part-name">
        {p.name}
        <span class="part-count">
          {p.index + 1}/{p.count}
        </span>
      </span>
      <button type="button" class="icon-btn" aria-label={`Next ${p.label}`} onClick={() => step(1)}>
        ›
      </button>
    </div>
  );
}

/** A colour part: one round swatch per option, with the chosen one's name. */
function SwatchRow(p: { spec: AvatarPartSpec; value: number; onPick: (index: number) => void }) {
  const { spec } = p;
  return (
    <div class="part-row part-row-tone">
      <span class="part-label">
        {spec.label}
        <span class="part-chosen">{spec.names[p.value]}</span>
      </span>
      <div class="tone-swatches" role="radiogroup" aria-label={spec.label}>
        {spec.swatches!.map((colour, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === p.value}
            aria-label={spec.names[i]}
            class={`tone-swatch${i === p.value ? ' is-active' : ''}`}
            style={{ '--swatch': colour }}
            onClick={() => p.onPick(i)}
          />
        ))}
      </div>
    </div>
  );
}
