// Wizard step 1: bank name, monogram, brand ink and a live medallion preview.
import { BRAND_INKS } from '../../data/brandInks';
import { Medallion } from '../components';
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
        <Medallion ink={draft.brandInk} monogram={draft.monogram || '··'} size={104} />
        <div class="preview-text">
          <div class="preview-name">{draft.bankName.trim() || 'Your bank'}</div>
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
          placeholder="Name your bank"
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
    </div>
  );
}
