// Training run card on the Products floor (SIMULATION §16.12, stage C6b):
// pick a name, a focus, a training time and a weekly budget, see the odds of
// each star result and the lift it gives, then start. While a run is under
// way it shows progress, weeks left and money spent, with Cancel (asks first).
import { useState } from 'preact/hooks';
import { DEV_TERMS, MODEL_NAME_MAX, TRAINING } from '../../../config/balance';
import * as cmd from '../../../sim/commands';
import { devSpeed } from '../../../sim/development';
import type { TrainingRun } from '../../../sim/state';
import { trainingLift, trainingOdds, trainingWeeksLeft } from '../../../sim/training';
import { Card, CoinRating, Confirm, Row, Stepper } from '../../components';
import { moneyFull, moneyStepper } from '../../format/format';
import { act, toast, useGame } from '../../store';
import { NameField } from './NameField';
import { MODEL_AXES, oddsRows, TERM_OPTIONS } from './productSelectors';

type Term = (typeof DEV_TERMS)[number];

const axisName = (i: number) => MODEL_AXES[i]?.[0] ?? '';

export function TrainingCard() {
  const s = useGame();
  const run = s.training.run;
  return <Card class="pf-dev pf-train">{run ? <RunningRun run={run} /> : <NewRun />}</Card>;
}

function NewRun() {
  const s = useGame();
  const sym = s.settings.currency;
  const suggested = `Gen ${s.training.generation + 1}`;
  const [name, setName] = useState(suggested);
  const [focus, setFocus] = useState(0);
  const [weeks, setWeeks] = useState<Term>(DEV_TERMS[1]);
  const [budget, setBudget] = useState<number>(TRAINING.minWeekly);
  const short = s.company.cash < budget;
  const pace = Math.ceil(weeks / devSpeed(s));
  const rows = oddsRows(trainingOdds(s, weeks, budget));

  const start = () => {
    const r = act(cmd.startTrainingRun, { name, focus, weeks, weeklyBudget: budget });
    if (r.ok) toast(`${name.trim()}: training started.`, 'good');
  };

  return (
    <div class="stack">
      <p class="muted small">
        Train the next version of your AI model. It starts from the model you use now and gets
        better on every measure, most of all on the focus you pick. A longer run, a bigger budget
        and a skilled team make a great result more likely.
      </p>
      <NameField label="New model name" value={name} max={MODEL_NAME_MAX} onInput={setName} />
      <div>
        <div class="field-label pf-label">Focus</div>
        <div class="pf-focus" role="radiogroup" aria-label="Focus">
          {MODEL_AXES.map((a, i) => (
            <button
              type="button"
              role="radio"
              aria-checked={i === focus}
              class={`pf-focus-opt${i === focus ? ' is-active' : ''}`}
              onClick={() => setFocus(i)}
            >
              {a[0]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div class="field-label pf-label">Training time</div>
        <div class="segmented" role="radiogroup" aria-label="Training time">
          {TERM_OPTIONS.map((o) => (
            <button
              type="button"
              role="radio"
              aria-checked={o.value === String(weeks)}
              class={`segmented-opt${o.value === String(weeks) ? ' is-active' : ''}`}
              onClick={() => setWeeks(Number(o.value) as Term)}
            >
              {o.label}
            </button>
          ))}
        </div>
        {pace !== weeks && (
          <p class="muted small hq-note">About {pace} weeks at the Products team’s current pace.</p>
        )}
      </div>
      <div>
        <Stepper
          label="Weekly budget"
          value={budget}
          min={TRAINING.minWeekly}
          max={TRAINING.maxBudgetScoreAt}
          step={TRAINING.budgetStep}
          {...moneyStepper(sym)}
          onChange={setBudget}
        />
        <Row label="Total cost" value={moneyFull(budget * weeks, sym)} strong />
      </div>
      <div class="pf-odds pf-train-odds" role="table" aria-label="Outcome estimate">
        <div class="field-label pf-label" role="caption">
          Outcome estimate and what each result adds
        </div>
        {rows.map((r) => {
          const lift = trainingLift(r.stars, focus);
          return (
            <div class="pf-odds-row" role="row">
              <span role="rowheader" aria-label={`${r.stars} stars`}>
                <CoinRating value={r.stars} showNumber={false} size={12} />
              </span>
              <span class="pf-odds-pct" role="cell">
                {r.pct}%
              </span>
              <span class="small muted" role="cell">
                +{lift[(focus + 1) % 5]!.toFixed(1)} on all, +
                {(lift[focus]! - lift[(focus + 1) % 5]!).toFixed(1)} more {axisName(focus)}
              </span>
            </div>
          );
        })}
      </div>
      {short && (
        <p class="hq-blocker small" role="status">
          You need {moneyFull(budget, sym)} in cash for the first week.
        </p>
      )}
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={short || !name.trim()}
        onClick={start}
      >
        Start training
      </button>
    </div>
  );
}

function RunningRun(p: { run: TrainingRun }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [cancelling, setCancelling] = useState(false);
  const r = p.run;
  const share = r.weeks > 0 ? r.progress / r.weeks : 0;
  const left = trainingWeeksLeft(s, r);
  const paused = !s.departments.products;
  return (
    <>
      <div class="pf-dev-title">
        <span class="pf-dev-name">{r.name}</span>
        <span class="muted small">Training · focus on {axisName(r.focus)}</span>
      </div>
      <div
        class="pf-progress"
        role="progressbar"
        aria-label={`${r.name} training progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(share * 100)}
      >
        <span class="pf-progress-fill" style={{ width: `${share * 100}%` }} />
      </div>
      <div class="pf-dev-meta small">
        <span>{Math.round(share * 100)}% done</span>
        <span class={paused ? 'tone-bad' : ''}>
          {paused ? 'Paused: no Products floor' : `${left} ${left === 1 ? 'week' : 'weeks'} left`}
        </span>
      </div>
      <Row label="Weekly budget" value={moneyFull(r.weeklyBudget, sym)} />
      <Row label="Spent so far" value={moneyFull(r.spent, sym)} tone="dim" />
      <button
        type="button"
        class="btn btn-secondary btn-block pf-dev-cancel"
        onClick={() => setCancelling(true)}
      >
        Cancel training
      </button>
      {cancelling && (
        <Confirm
          title={`Stop training ${r.name}?`}
          body={`The ${moneyFull(r.spent, sym)} spent so far is gone, and the run stops for good.`}
          confirmLabel="Stop training"
          danger
          onConfirm={() => {
            setCancelling(false);
            act(cmd.cancelTrainingRun);
          }}
          onCancel={() => setCancelling(false)}
        />
      )}
    </>
  );
}
