// Wizard step 4: difficulty, number of rival banks, starting cash and the
// currency money is shown in.
import { COMPETITORS, START_CASH_OPTIONS } from '../../config/balance';
import { CURRENCY_SYMBOLS } from '../../data/settingsOptions';
import { CITIES } from '../../data/cities';
import type { Difficulty } from '../../data/types';
import { SectionTitle, Segmented, Stepper } from '../components';
import { CURRENCY_NAME, DIFFICULTY_BLURB, DIFFICULTY_LABEL, cashLabel } from './choices';
import { usualCompetitors, type Draft } from './draft';

const DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as Difficulty[];

export function StepOptions(p: { draft: Draft; patch: (d: Partial<Draft>) => void }) {
  const { draft, patch } = p;
  const city = CITIES[draft.cityId]!;
  return (
    <div class="stack option-stack">
      <section class="stack">
        <SectionTitle>Difficulty</SectionTitle>
        <Segmented
          label="Difficulty"
          value={draft.difficulty}
          options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
          onChange={(difficulty) => patch({ difficulty })}
        />
        <p class="option-note">{DIFFICULTY_BLURB[draft.difficulty]}</p>
      </section>

      <section class="stack">
        <SectionTitle>Competitors</SectionTitle>
        <Stepper
          label="Rival banks in the city"
          value={draft.competitors}
          min={COMPETITORS.min}
          max={COMPETITORS.max}
          step={1}
          onChange={(competitors) => patch({ competitors })}
          hint={`${city.name} usually has ${usualCompetitors(draft.cityId)}. Fewer rivals means fewer rival branches.`}
        />
      </section>

      <section class="stack">
        <SectionTitle>Starting cash</SectionTitle>
        <Segmented
          label="Starting cash"
          value={String(draft.startCash)}
          options={START_CASH_OPTIONS.map((c) => ({
            value: String(c),
            label: cashLabel(c, draft.currency),
          }))}
          onChange={(v) => patch({ startCash: Number(v) })}
        />
        <p class="option-note">
          Spendable cash to open with. Your charter capital is held separately.
        </p>
      </section>

      <section class="stack">
        <SectionTitle>Currency</SectionTitle>
        <Segmented
          label="Currency"
          value={draft.currency}
          options={CURRENCY_SYMBOLS.map((c) => ({ value: c, label: c }))}
          onChange={(currency) => patch({ currency })}
        />
        <p class="option-note">
          {CURRENCY_NAME[draft.currency]}. This is how money is shown; you can change it later in
          Settings.
        </p>
      </section>
    </div>
  );
}
