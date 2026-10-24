// Risk appetite (SCREENS §10, SIMULATION §16.8): a 1–5 switch with the level's
// plain name and a one-line effect on loan volume and defaults.
import * as cmd from '../../../sim/commands';
import { Card, Segmented } from '../../components';
import { act, useGame } from '../../store';
import { RISK_LABELS, riskHint } from './productSelectors';

const LEVELS = RISK_LABELS.map((_, i) => ({ value: String(i + 1), label: String(i + 1) }));

export function RiskAppetite() {
  const s = useGame();
  const level = s.company.riskAppetite;
  return (
    <Card>
      <div class="pf-risk-head">
        <span class="muted small">Risk appetite</span>
        <span class="pf-risk-name">{RISK_LABELS[level - 1]}</span>
      </div>
      <Segmented
        label="Risk appetite, 1 very conservative to 5 very aggressive"
        options={LEVELS}
        value={String(level)}
        onChange={(v) => act(cmd.setRiskAppetite, Number(v))}
      />
      <div class="pf-risk-ends muted small" aria-hidden="true">
        <span>{RISK_LABELS[0]}</span>
        <span>{RISK_LABELS[RISK_LABELS.length - 1]}</span>
      </div>
      <p class="small hq-note">{riskHint(level)}</p>
    </Card>
  );
}
