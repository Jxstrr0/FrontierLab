// Manage models sheet (SCREENS §10 Products floor): every model you hold, with
// "Use" to make it the house model (a two-week blend), and a new custom model
// built from the data input sliders with a live rosette and cost. Save keeps
// it for later; Save & use switches to it straight away. Custom models need a
// Products floor; bureau packages and hosted models come from credit bureaus.
import { useState } from 'preact/hooks';
import { MODEL_NAME_MAX } from '../../../config/balance';
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
                    {m.costPerApp.toFixed(2)} per application · quality {radarText(modelQuality(m))}
                  </span>
                </div>
                {active ? (
                  <Badge tone="good">{u.switching ? 'Switching in' : 'In use'}</Badge>
                ) : (
                  <button
                    type="button"
                    class="btn btn-secondary pf-item-btn"
                    aria-label={`Use ${m.name} as the house model`}
                    onClick={() => act(cmd.activateModel, m.id)}
                  >
                    Use
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p class="muted small">
          Switching takes two weeks: sales offices feel a blend of the old and new model meanwhile.
          Credit bureaus sell packaged models and host custom ones.
        </p>

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
