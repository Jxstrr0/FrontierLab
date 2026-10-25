// Founder avatar picker: the engraved portrait (ART_DIRECTION §4) updating
// live, plus one row per part and the six skin-tone swatches. Used by the New
// Game wizard and by Settings.
import { SKIN_TONES } from '../../art/portraits';
import { AVATAR_PARTS, type AvatarPart } from '../../data/avatarParts';
import { Portrait } from '../components';
import type { AvatarSpec } from '../../sim/state';
import './avatar.css';

function optionName(part: AvatarPart, spec: AvatarSpec): string {
  const names = AVATAR_PARTS.find((x) => x.part === part)!.names;
  return names[spec[part]] ?? '';
}

/** One-line description of the chosen parts, e.g. "Oval head · Hair style 3 · …". */
export function avatarSummary(a: AvatarSpec): string {
  return [
    `${optionName('head', a)} head`,
    `hair ${optionName('hair', a).toLowerCase()}`,
    `facial hair: ${optionName('facial', a).toLowerCase()}`,
    `glasses: ${optionName('glasses', a).toLowerCase()}`,
    optionName('attire', a).toLowerCase(),
    optionName('tone', a).toLowerCase(),
  ].join(' · ');
}

export function AvatarPicker(p: {
  value: AvatarSpec;
  onChange: (part: AvatarPart, index: number) => void;
}) {
  return (
    <div class="avatar-picker">
      <div class="avatar-stage">
        <Portrait avatar={p.value} size={120} label="Your portrait" />
        <p class="avatar-summary small muted">{avatarSummary(p.value)}</p>
      </div>
      <div class="part-list">
        {AVATAR_PARTS.map((spec) =>
          spec.part === 'tone' ? (
            <ToneRow
              value={p.value.tone}
              count={spec.names.length}
              onPick={(i) => p.onChange('tone', i)}
            />
          ) : (
            <PartRow
              label={spec.label}
              name={spec.names[p.value[spec.part]] ?? ''}
              index={p.value[spec.part]}
              count={spec.names.length}
              onPick={(i) => p.onChange(spec.part, i)}
            />
          ),
        )}
      </div>
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
      <span class="part-name">{p.name}</span>
      <button type="button" class="icon-btn" aria-label={`Next ${p.label}`} onClick={() => step(1)}>
        ›
      </button>
    </div>
  );
}

function ToneRow(p: { value: number; count: number; onPick: (index: number) => void }) {
  return (
    <div class="part-row part-row-tone">
      <span class="part-label">Skin tone</span>
      <div class="tone-swatches" role="radiogroup" aria-label="Skin tone">
        {Array.from({ length: p.count }, (_, i) => (
          <button
            type="button"
            role="radio"
            aria-checked={i === p.value}
            aria-label={`Tone ${i + 1}`}
            class={`tone-swatch${i === p.value ? ' is-active' : ''}`}
            style={{ '--swatch': SKIN_TONES[i] }}
            onClick={() => p.onPick(i)}
          />
        ))}
      </div>
    </div>
  );
}
