// Risk & Compliance floor content (SCREENS §10, DESIGN §5.8.7, SIMULATION
// §15): the loss-rate table by product (annualized over the last 13 weeks,
// stacked so it reads on a phone), company delinquency, model performance
// (predicted vs actual default rate as a bar pair) and regulator status (tier
// badge and capital meter, next review's fail chance, last review, failures).
import { REGULATOR_REVIEW, RISK_LOSS_WEEKS } from '../../config/balance';
import { delinquency, lossTable, modelPerformance, regulatorStatus } from '../../sim/riskFloor';
import { Badge, Card, Row, SectionTitle } from '../components';
import { dayOfWeek } from '../branch/selectors';
import { CapitalMeter, TIER_LABEL, TIER_TONE } from '../company/CapitalMeter';
import { capitalRatioText, gameDate, money, pct } from '../format/format';
import { useGame } from '../store';
import {
  lossProductName,
  MODEL_VERDICT_TEXT,
  modelVerdict,
  nextReviewWeek,
  pairBars,
} from './risk/riskView';
import './risk/risk.css';

/** A fail chance above this multiple of the base rate reads as elevated. */
const ELEVATED_FAIL = 2;

export function RiskFloor() {
  return (
    <div class="stack rk-floor">
      <SectionTitle>Losses</SectionTitle>
      <LossCard />
      <SectionTitle>Model performance</SectionTitle>
      <ModelCard />
      <SectionTitle>Regulator</SectionTitle>
      <RegulatorCard />
    </div>
  );
}

function LossCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const rows = lossTable(s);
  const weeks = s.risk.losses.length;
  if (rows.length === 0) {
    return (
      <Card>
        <p class="muted small hq-note">
          No loans on the books yet. Loss rates appear here once lending starts.
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <Row label="Delinquency" value={pct(delinquency(s), 2)} strong />
      <p class="muted small hq-note">
        Share of loan balances in arrears. Rates below are annualized over{' '}
        {weeks < RISK_LOSS_WEEKS
          ? `the ${weeks} weeks so far`
          : `the last ${RISK_LOSS_WEEKS} weeks`}
        .
      </p>
      <ul class="rk-loss-list">
        {rows.map((r) => (
          <li class="rk-loss-row">
            <div class="rk-loss-head">
              <span class="rk-loss-name">{lossProductName(s, r.productId)}</span>
              <span class="muted small">{money(r.avgBalance, sym)} avg</span>
            </div>
            <dl class="rk-loss-figs">
              <div>
                <dt>Loss rate</dt>
                <dd>{pct(r.lossRate, 2)}</dd>
              </div>
              <div>
                <dt>Defaults</dt>
                <dd>{pct(r.defaultRate, 2)}</dd>
              </div>
              <div>
                <dt>Arrears</dt>
                <dd>{pct(r.delinquency, 2)}</dd>
              </div>
            </dl>
            <span class="muted small">Losses {money(r.losses, sym)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ModelCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const m = modelPerformance(s);
  const verdict = modelVerdict(m.predicted, m.actual);
  const [hp, ha] = pairBars(m.predicted, m.actual);
  return (
    <Card>
      {verdict !== 'none' && (
        <div
          class="rk-pair"
          role="img"
          aria-label={`Predicted ${pct(m.predicted)}, actual ${pct(m.actual)}`}
        >
          <PairBar label="Predicted" value={pct(m.predicted)} height={hp} tone="predicted" />
          <PairBar
            label="Actual"
            value={pct(m.actual)}
            height={ha}
            tone={verdict === 'under' ? 'bad' : 'actual'}
          />
        </div>
      )}
      <p class={`small hq-note ${verdict === 'under' ? 'tone-bad' : 'muted'}`}>
        {MODEL_VERDICT_TEXT[verdict]}
      </p>
      {verdict !== 'none' && (
        <>
          <Row label="Expected losses" value={money(m.expectedLoss, sym)} />
          <Row label="Actual losses" value={money(m.actualLoss, sym)} />
          <Row label="Weeks measured" value={String(m.weeks)} tone="dim" />
        </>
      )}
    </Card>
  );
}

function PairBar(p: { label: string; value: string; height: number; tone: string }) {
  return (
    <div class="rk-pair-col">
      <span class="rk-pair-value">{p.value}</span>
      <span class="rk-pair-track" aria-hidden="true">
        <span class={`rk-pair-bar rk-pair-${p.tone}`} style={{ height: `${p.height * 100}%` }} />
      </span>
      <span class="muted small">{p.label}</span>
    </div>
  );
}

function RegulatorCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const r = regulatorStatus(s);
  const next = nextReviewWeek(s.meta.startDate, s.clock.week);
  const last = r.lastReview;
  return (
    <Card>
      <div class="rk-reg-head">
        <div>
          <div class="muted small">Capital ratio</div>
          <div class="hero-number">{capitalRatioText(r.capitalRatio)}</div>
        </div>
        <Badge tone={TIER_TONE[r.tier]}>{TIER_LABEL[r.tier]}</Badge>
      </div>
      <CapitalMeter ratio={r.capitalRatio} tier={r.tier} />
      <div class="rk-reg-rows">
        <Row label="Next review" value={gameDate(s.meta.startDate, dayOfWeek(next))} />
        <Row
          label="Chance it fails"
          value={pct(r.failChance, 1)}
          tone={r.failChance > ELEVATED_FAIL * REGULATOR_REVIEW.failBase ? 'bad' : 'dim'}
          strong
        />
        <Row
          label="Last review"
          value={
            last
              ? `${last.passed ? 'Passed' : `Failed · fined ${money(last.fine, sym)}`}, ${gameDate(s.meta.startDate, dayOfWeek(last.week))}`
              : 'None yet'
          }
          tone={last && !last.passed ? 'bad' : undefined}
        />
        <Row
          label="Failed reviews"
          value={String(r.failedReviews)}
          tone={r.failedReviews > 0 ? 'bad' : 'dim'}
        />
      </div>
      <p class="muted small hq-note">
        A fully staffed Risk team and ethical office managers keep reviews clean. Failures bring a
        fine of up to {pct(REGULATOR_REVIEW.fineRange[1], 1)} of a year's revenue.
      </p>
    </Card>
  );
}
