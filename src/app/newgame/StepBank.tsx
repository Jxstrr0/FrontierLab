// Wizard step 1: bank name, monogram, logo shape and brand ink with a live
// medallion preview, then the house style every branch front will share, with
// a live front.
import { BRAND_INKS } from '../../data/brandInks';
import { Medallion } from '../components';
import { CITIES } from '../../data/cities';
import { HOUSE_STYLES } from '../../data/houseStyles';
import { LOGO_SHAPES } from '../../data/logoShapes';
import { BranchArt } from '../branch/BranchArt';
import { MONOGRAM_LENGTH, NAME_MAX, monogramFor, type Draft } from './draft';

export function StepBank(p: { draft: Draft; patch: (d: Partial<Draft>) => void }) {
  const { draft, patch } = p;
  const setName = (bankName: string) =>
    patch({
      bankName,
      ...(draft.monogramEdited ? {} : { monogram: monogramFor(bankName) }),
    });
  const setMonogram = (raw: string) =>
    patch({
      monogram: raw
        .replace(/[^\p{L}]/gu, '')
        .toUpperCase()
        .slice(0, MONOGRAM_LENGTH),
      monogramEdited: true,
    });
  const inkName = BRAND_INKS.find((i) => i.hex === draft.brandInk)?.name ?? '';

  return (
    <div class="stack">
      <div class="preview">
        <Medallion
          ink={draft.brandInk}
          monogram={draft.monogram || '··'}
          shape={draft.logoShape}
          size={104}
        />
        <div class="preview-text">
          <div class="preview-name">{draft.bankName.trim() || 'Your lab'}</div>
          <div class="small muted">{inkName} ink</div>
        </div>
      </div>

      <label class="field">
        <span class="field-label">Bank name</span>
        <input
          class="field-input"
          type="text"
          value={draft.bankName}
          maxLength={NAME_MAX}
          placeholder="Name your lab"
          autoComplete="off"
          autoCapitalize="words"
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
        <span class="field-hint">
          {draft.bankName.length} of {NAME_MAX} characters
        </span>
      </label>

      <label class="field">
        <span class="field-label">Monogram</span>
        <input
          class="field-input field-input-short"
          type="text"
          value={draft.monogram}
          maxLength={MONOGRAM_LENGTH}
          autoComplete="off"
          autoCapitalize="characters"
          onInput={(e) => setMonogram((e.target as HTMLInputElement).value)}
        />
        <span class="field-hint">Two letters for your medallion. Filled in from the name.</span>
      </label>

      <fieldset class="field">
        <legend class="field-label">Logo shape</legend>
        <div class="logo-grid" role="radiogroup" aria-label="Logo shape">
          {LOGO_SHAPES.map((l) => (
            <button
              type="button"
              role="radio"
              aria-checked={l.id === draft.logoShape}
              class={`ink${l.id === draft.logoShape ? ' is-active' : ''}`}
              onClick={() => patch({ logoShape: l.id })}
            >
              <Medallion
                ink={draft.brandInk}
                monogram={draft.monogram || '··'}
                shape={l.id}
                size={36}
              />
              <span class="ink-name">{l.name}</span>
            </button>
          ))}
        </div>
        <span class="field-hint">
          {LOGO_SHAPES.find((l) => l.id === draft.logoShape)?.description}
        </span>
      </fieldset>

      <fieldset class="field">
        <legend class="field-label">Brand ink</legend>
        <div class="ink-grid" role="radiogroup" aria-label="Brand ink">
          {BRAND_INKS.map((ink) => (
            <button
              type="button"
              role="radio"
              aria-checked={ink.hex === draft.brandInk}
              class={`ink${ink.hex === draft.brandInk ? ' is-active' : ''}`}
              onClick={() => patch({ brandInk: ink.hex })}
            >
              <span class="ink-swatch" style={{ background: ink.hex }} />
              <span class="ink-name">{ink.name}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset class="field">
        <legend class="field-label">House style</legend>
        <span class="field-hint">
          How every branch front looks: the sign, lamps, planters and flag.
        </span>
        <div class="style-preview">
          <BranchArt
            exterior="ext_storefront"
            bankName={draft.bankName.trim() || 'Your lab'}
            style={draft.houseStyle}
            brandInk={draft.brandInk}
            monogram={draft.monogram || '··'}
            logoShape={draft.logoShape}
            ink={CITIES[draft.cityId]?.ink}
          />
        </div>
        <div class="style-grid" role="radiogroup" aria-label="House style">
          {HOUSE_STYLES.map((h) => (
            <button
              type="button"
              role="radio"
              aria-checked={h.id === draft.houseStyle}
              class={`style-chip${h.id === draft.houseStyle ? ' is-active' : ''}`}
              onClick={() => patch({ houseStyle: h.id })}
            >
              {h.name}
            </button>
          ))}
        </div>
        <span class="field-hint">
          {HOUSE_STYLES.find((h) => h.id === draft.houseStyle)?.description}
        </span>
      </fieldset>
    </div>
  );
}
