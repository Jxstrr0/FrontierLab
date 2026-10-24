// Wizard step 5: a summary of the choices, with the seed and start date tucked
// into an advanced disclosure.
import { START_DATE } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { Card, Medallion, Row } from '../components';
import { gameDate } from '../format/format';
import { FounderPortrait } from './AvatarPicker';
import { DIFFICULTY_LABEL, cashLabel } from './choices';
import { randomSeed, type Draft } from './draft';

export function StepConfirm(p: { draft: Draft; patch: (d: Partial<Draft>) => void }) {
  const { draft, patch } = p;
  const city = CITIES[draft.cityId]!;
  return (
    <div class="stack">
      <Card class="summary">
        <div class="summary-head">
          <Medallion ink={draft.brandInk} monogram={draft.monogram} size={72} />
          <div class="summary-titles">
            <div class="summary-name">{draft.bankName.trim()}</div>
            <div class="small muted">Founded by {draft.founderName.trim()}</div>
          </div>
          <FounderPortrait avatar={draft.avatar} size={48} />
        </div>
        <Row label="Start city" value={city.name} />
        <Row label="Rival banks" value={draft.competitors} />
        <Row label="Difficulty" value={DIFFICULTY_LABEL[draft.difficulty]} />
        <Row label="Starting cash" value={cashLabel(draft.startCash)} />
      </Card>

      <details class="advanced">
        <summary>Advanced</summary>
        <div class="stack advanced-body">
          <label class="field">
            <span class="field-label">Seed</span>
            <span class="seed-row">
              <input
                class="field-input"
                type="text"
                inputMode="numeric"
                value={draft.seed}
                onInput={(e) => {
                  const n = Number((e.target as HTMLInputElement).value.replace(/\D/g, ''));
                  patch({ seed: Number.isSafeInteger(n) ? n : draft.seed });
                }}
              />
              <button
                type="button"
                class="btn btn-secondary"
                onClick={() => patch({ seed: randomSeed() })}
              >
                Roll again
              </button>
            </span>
            <span class="field-hint">
              The same seed and the same choices give the same city and rivals.
            </span>
          </label>
          <Row label="Start date" value={gameDate(START_DATE, 0)} />
        </div>
      </details>
    </div>
  );
}
