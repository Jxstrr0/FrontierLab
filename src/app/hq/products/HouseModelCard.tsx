// House model card on the Products floor (SCREENS §10, DESIGN §5.8.3): the
// model's rosette, name, where it comes from, cost per application (with the
// short-staffing surcharge when the team is short), the "Switching" state
// while the old model blends out, and Manage models.
import { useState } from 'preact/hooks';
import { activeModel, appCost, modelQuality } from '../../../sim/underwriting';
import { Badge, Card, Row } from '../../components';
import { useGame } from '../../store';
import { ManageModelsSheet } from './ManageModelsSheet';
import { ModelRosette } from './ModelRosette';
import { modelSourceText, radarText } from './productSelectors';
import { exactMoney } from '../../format/format';

/** A paid cost this much above the model's list cost reads as a surcharge. */
const SURCHARGE_SHOWN = 0.005;

export function HouseModelCard() {
  const s = useGame();
  const [managing, setManaging] = useState(false);
  const sym = s.settings.currency;
  const u = s.underwriting;
  const model = activeModel(s);
  const stored = u.models[u.activeModelId];
  const from = u.switching ? u.models[u.switching.fromId] : undefined;
  const paid = appCost(s);
  const surcharge = paid - model.costPerApp > SURCHARGE_SHOWN;
  return (
    <Card class="pf-model">
      <div class="pf-model-head">
        <div>
          <div class="pf-model-name">{model.name}</div>
          {stored && <div class="muted small">{modelSourceText(stored)}</div>}
        </div>
        {u.switching && <Badge tone="warn">Switching</Badge>}
      </div>
      <ModelRosette radar={model.radar} label="House model" />
      <Row label="Cost per application" value={exactMoney(paid, sym)} strong />
      {surcharge && (
        <p class="small tone-bad hq-note">
          Includes a short-staffing surcharge: the model lists at {sym}
          {model.costPerApp.toFixed(2)}.
        </p>
      )}
      <Row label="Model quality" value={`${radarText(modelQuality(model))} / 10`} />
      {u.switching && (
        <p class="muted small hq-note" role="status">
          Switching from {from?.name ?? 'the old model'}: {u.switching.weeksLeft}{' '}
          {u.switching.weeksLeft === 1 ? 'week' : 'weeks'} left. Branches feel a blend of both until
          then.
        </p>
      )}
      <button
        type="button"
        class="btn btn-secondary btn-block pf-model-btn"
        onClick={() => setManaging(true)}
      >
        Manage models
      </button>
      {managing && <ManageModelsSheet onClose={() => setManaging(false)} />}
    </Card>
  );
}
