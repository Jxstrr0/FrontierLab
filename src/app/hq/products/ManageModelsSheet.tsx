// Manage models sheet (SCREENS §10 Products floor): every model you hold, with
// "Use" to make it the AI model (a two-week blend; a trained model's first
// switch is its launch, §16.15), "Open weights" on trained models (§16.16, with
// a confirm step), and a new custom model
// built from the data input sliders with a live rosette and cost. Save keeps
// it for later; Save & use switches to it straight away. Custom models need a
// Products floor; vendor packages and hosted models come from data vendors.
import { useState } from 'preact/hooks';
import { MODEL_NAME_MAX, OPEN_WEIGHTS } from '../../../config/balance';
import * as cmd from '../../../sim/commands';
import { modelQuality, previewModel } from '../../../sim/underwriting';
import { Badge, Sheet } from '../../components';
import { act, toast, useGame } from '../../store';
import { MixEditor } from './MixEditor';
import { fromPercents, toPercents, type PercentMix } from './mixMath';
import { NameField } from './NameField';
import { INPUT_IDS, modelSourceText, radarText } from './productSelectors';

export function ManageModelsSheet(p: { onClose: () => void }) {
  const s = useGame();
  const sym = s.settings.currency;
  const u = s.underwriting;
  const models = Object.values(u.models);
  const customCount = models.filter((m) => m.source === 'custom').length;
  const [name, setName] = useState(`Custom model ${customCount + 1}`);
  const [mix, setMix] = useState<PercentMix>(() =>
    toPercents(u.models[u.activeModelId]?.mix ?? {}, INPUT_IDS),
  );
  const hasFloor = !!s.departments.products;
  const problem = previewModel(s, fromPercents(mix), 'custom').problem;
  const [opening, setOpening] = useState<string | null>(null);
  const openModel = opening ? u.models[opening] : undefined;

  const save = (use: boolean) => {
    const r = act(cmd.saveCustomModel, { name, mix: fromPercents(mix) });
    if (!r.ok) return;
    if (use) {
      if (act(cmd.activateModel, r.modelId).ok) {
        toast(`Switching to ${name.trim()} over the next two weeks.`, 'good');
        p.onClose();
      }
    } else {
      toast(`${name.trim()} saved.`, 'good');
      setName(`Custom model ${customCount + 2}`);
    }
  };

  return (
    <Sheet title="Manage models" onClose={p.onClose}>
      <div class="stack">
        <ul class="pf-model-list" aria-label="Your models">
          {models.map((m) => {
            const active = m.id === u.activeModelId;
            return (
              <li class="pf-model-item">
                <div class="pf-model-item-text">
                  <span class="pf-model-item-name">{m.name}</span>
                  <span class="muted small">{modelSourceText(m)}</span>
                  <span class="small">
                    {sym}
                    {m.costPerCustomer.toFixed(2)} per customer a year · quality{' '}
                    {radarText(modelQuality(m))}
                  </span>
                </div>
                <div class="pf-model-item-actions">
                  {active ? (
                    <Badge tone="good">{u.switching ? 'Switching in' : 'In use'}</Badge>
                  ) : (
                    <button
                      type="button"
                      class="btn btn-secondary pf-item-btn"
                      aria-label={`Use ${m.name} as the lab's AI model`}
                      onClick={() => {
                        const launch = m.source === 'trained' && m.launchedWeek === undefined;
                        if (act(cmd.activateModel, m.id).ok && launch)
                          toast(`${m.name} launches: the paper has the story.`, 'good');
                      }}
                    >
                      {m.source !== 'trained'
                        ? 'Use'
                        : m.launchedWeek === undefined
                          ? 'Launch'
                          : 'Use as AI model'}
                    </button>
                  )}
                  {m.source === 'trained' &&
                    (m.openWeek !== undefined ? (
                      <Badge tone="info">Open weights</Badge>
                    ) : (
                      <button
                        type="button"
                        class="btn btn-secondary pf-item-btn"
                        aria-label={`Release ${m.name} as open weights`}
                        onClick={() => setOpening(m.id)}
                      >
                        Open weights
                      </button>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
        <p class="muted small">
          Switching takes two weeks: sales offices feel a blend of the old and new model meanwhile.
          Data vendors sell packaged models and host custom ones.
        </p>

        {openModel && (
          <div class="pf-open-confirm" role="alertdialog" aria-label="Release open weights">
            <p class="small">
              Publish {openModel.name}'s weights for anyone to run? Developers love it: awareness
              rises at every sales office and API sign-ups pick up for half a year. But while your
              AI model is within {OPEN_WEIGHTS.nearGap} quality points of it, API customers won't
              pay as much over market. This can't be undone.
            </p>
            <div class="btn-row">
              <button type="button" class="btn btn-secondary" onClick={() => setOpening(null)}>
                Keep closed
              </button>
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => {
                  if (act(cmd.openWeights, openModel.id).ok)
                    toast(`${openModel.name} is now open weights.`, 'good');
                  setOpening(null);
                }}
              >
                Release weights
              </button>
            </div>
          </div>
        )}

        <h3 class="section-title">New custom model</h3>
        {hasFloor ? (
          <>
            <NameField label="Model name" value={name} max={MODEL_NAME_MAX} onInput={setName} />
            <MixEditor value={mix} onChange={setMix} source="custom" />
            <div class="btn-row">
              <button
                type="button"
                class="btn btn-secondary"
                disabled={!!problem || !name.trim()}
                onClick={() => save(false)}
              >
                Save
              </button>
              <button
                type="button"
                class="btn btn-primary"
                disabled={!!problem || !name.trim()}
                onClick={() => save(true)}
              >
                Save &amp; use
              </button>
            </div>
          </>
        ) : (
          <p class="muted">Custom models need a Products floor at HQ.</p>
        )}
      </div>
    </Sheet>
  );
}
