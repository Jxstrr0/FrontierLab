// Launch posture (SCREENS §10, SIMULATION §16.8; code id riskAppetite): a 1–5
// switch with the level's plain name, a one-line effect on deal odds, safety
// exposure and over-claims, and a note when the CSO or the CFO is steering it too.
import * as cmd from '../../../sim/commands';
import { Card, Segmented } from '../../components';
import { act, useGame } from '../../store';
import { RISK_LABELS, riskHint, riskSteering } from './riskSelectors';
import './finance.css';

const LEVELS = RISK_LABELS.map((_, i) => ({ value: String(i + 1), label: String(i + 1) }));

export function RiskAppetite() {
  const s = useGame();
  const level = s.company.riskAppetite;
  const steering = riskSteering(s);
  return (
    <Card>
      <div class="fin-risk-head">
        <span class="muted small">Launch posture</span>
        <span class="fin-risk-name">{RISK_LABELS[level - 1]}</span>
      </div>
      <Segmented
        label="Launch posture, 1 very cautious to 5 very bold"
        options={LEVELS}
        value={String(level)}
        onChange={(v) => act(cmd.setRiskAppetite, Number(v))}
      />
      <div class="fin-risk-ends muted small" aria-hidden="true">
        <span>{RISK_LABELS[0]}</span>
        <span>{RISK_LABELS[RISK_LABELS.length - 1]}</span>
      </div>
      <p class="small hq-note">{riskHint(level)}</p>
      {steering && <p class="small muted">{steering}</p>}
    </Card>
  );
}
