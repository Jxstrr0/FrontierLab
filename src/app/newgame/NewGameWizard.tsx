// New Game wizard (SCREENS §1): five steps with Back and Next and a step
// indicator. Nothing touches the simulation until "Open the doors" on step 5.
import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { screen } from '../store';
import { initialDraft, randomSeed, type Draft } from './draft';
import { StepBank } from './StepBank';
import { StepCity } from './StepCity';
import { StepConfirm } from './StepConfirm';
import { StepFounder } from './StepFounder';
import { StepOptions } from './StepOptions';
import { startGame } from './startGame';
import './fields.css';
import './newgame.css';

interface StepSpec {
  title: string;
  View: ComponentType<{ draft: Draft; patch: (d: Partial<Draft>) => void }>;
  /** Why the player can't move on yet, or null when the step is complete. */
  blocker: (d: Draft) => string | null;
}

const STEPS: StepSpec[] = [
  {
    title: 'Your bank',
    View: StepBank,
    blocker: (d) => (d.bankName.trim() && d.monogram ? null : 'Name your bank to continue.'),
  },
  {
    title: 'Founder',
    View: StepFounder,
    blocker: (d) => (d.founderName.trim() ? null : 'Add your name to continue.'),
  },
  { title: 'Start city', View: StepCity, blocker: () => null },
  { title: 'Game options', View: StepOptions, blocker: () => null },
  { title: 'Confirm', View: StepConfirm, blocker: () => null },
];

export function NewGameWizard() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initialDraft);
  const body = useRef<HTMLDivElement>(null);
  const patch = (d: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...d }));

  useEffect(() => body.current?.scrollTo({ top: 0 }), [step]);

  const spec = STEPS[step]!;
  const last = step === STEPS.length - 1;
  const blocker = spec.blocker(draft);
  const back = () => (step === 0 ? (screen.value = 'title') : setStep(step - 1));
  const next = () => (last ? open() : setStep(step + 1));
  const open = () =>
    startGame({
      seed: draft.seed,
      cityId: draft.cityId,
      bankName: draft.bankName.trim(),
      monogram: draft.monogram,
      brandInk: draft.brandInk,
      houseStyle: draft.houseStyle,
      founderName: draft.founderName.trim(),
      founderAvatar: draft.avatar,
      difficulty: draft.difficulty,
      competitors: draft.competitors,
      startCash: draft.startCash,
      currency: draft.currency,
    });
  const quickStart = () => startGame({ seed: randomSeed(), cityId: 'cal' });

  return (
    <main class="wizard">
      <header class="wizard-header">
        <h1 class="wizard-title">New game</h1>
        <button
          type="button"
          class="icon-btn"
          aria-label="Cancel"
          onClick={() => (screen.value = 'title')}
        >
          ✕
        </button>
      </header>

      <nav class="steps" aria-label="Progress">
        <div class="wizard-column">
          <ol class="steps-bar">
            {STEPS.map((s, i) => (
              <li
                class={`steps-dot${i === step ? ' is-current' : i < step ? ' is-done' : ''}`}
                aria-current={i === step ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${s.title}`}
              />
            ))}
          </ol>
          <div class="steps-label">
            <span class="muted">
              Step {step + 1} of {STEPS.length}
            </span>
            <h2 class="steps-name">{spec.title}</h2>
          </div>
        </div>
      </nav>

      <div class="wizard-body" ref={body}>
        <div class="wizard-column">
          <spec.View draft={draft} patch={patch} />
          {step === 0 && (
            <button type="button" class="link-btn" onClick={quickStart}>
              Quick start with a ready-made bank in Calgary
            </button>
          )}
        </div>
      </div>

      <footer class="wizard-footer">
        <div class="wizard-column">
          {blocker && <p class="wizard-blocker small muted">{blocker}</p>}
          <div class="btn-row">
            <button type="button" class="btn btn-secondary" onClick={back}>
              Back
            </button>
            <button
              type="button"
              class="btn btn-primary"
              disabled={blocker !== null}
              onClick={next}
            >
              {last ? 'Open the doors' : 'Next'}
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
