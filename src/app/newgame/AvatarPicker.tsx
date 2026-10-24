// Founder avatar picker: a placeholder oval portrait plus one row per part.
// The engraved portrait generator (ART_DIRECTION §4) doesn't exist yet, so the
// oval reflects skin tone and head shape and the part names are listed beneath.
// Used by the New Game wizard and by Settings.
import { AVATAR_PARTS, type AvatarPart } from '../../data/avatarParts';
import type { AvatarSpec } from '../../sim/state';
import './avatar.css';

/** Head shape → width of the oval, as a share of its height. */
const HEAD_WIDTH = [0.5, 0.58, 0.54, 0.44];

export function FounderPortrait(p: { avatar: AvatarSpec; size?: number }) {
  const w = p.size ?? 120;
  const h = Math.round(w * 1.25);
  const head = HEAD_WIDTH[p.avatar.head] ?? HEAD_WIDTH[0]!;
  return (
    <svg
      class="founder-portrait"
      width={w}
      height={h}
      viewBox="0 0 120 150"
      role="img"
      aria-label="Founder portrait placeholder"
    >
      <ellipse cx="60" cy="75" rx="56" ry="71" class="portrait-frame" />
      <ellipse cx="60" cy="75" rx="51" ry="66" class="portrait-frame-inner" />
      <clipPath id="portrait-clip">
        <ellipse cx="60" cy="75" rx="50" ry="65" />
      </clipPath>
      <g clip-path="url(#portrait-clip)">
        <rect x="0" y="0" width="120" height="150" class="portrait-ground" />
        <path d="M10 150c4-30 24-44 50-44s46 14 50 44z" class="portrait-shoulders" />
        <ellipse
          cx="60"
          cy="64"
          rx={head * 68}
          ry="34"
          style={{ fill: `var(--tone-${p.avatar.tone})` }}
          class="portrait-head"
        />
      </g>
    </svg>
  );
}

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
        <FounderPortrait avatar={p.value} />
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
            style={{ '--swatch': `var(--tone-${i})` }}
            onClick={() => p.onPick(i)}
          />
        ))}
      </div>
    </div>
  );
}
