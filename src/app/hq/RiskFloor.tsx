// Safety & Alignment floor content (SCREENS §10, DESIGN §5.8.7, SIMULATION
// §15): regulator status (safety ratio, tier badge and meter, strength vs
// exposure, pause or strict watch, the next safety audit's fail chance, last
// audit, failures).
import { REGULATOR_REVIEW } from '../../config/balance';
import { safetySnapshot, tierLift } from '../../sim/safety';
import { SafetyNotice } from '../company/SafetyNotice';
import { regulatorStatus } from '../../sim/riskFloor';
import { Badge, Card, Row, SectionTitle } from '../components';
import { dayOfWeek } from '../branch/selectors';
import { CapitalMeter, TIER_LABEL, TIER_TONE } from '../company/CapitalMeter';
import { gameDate, money, pct, safetyRatioText } from '../format/format';
import { useGame } from '../store';
import { nextReviewWeek } from './risk/riskView';
import './risk/risk.css';

/** A fail chance above this multiple of the base rate reads as elevated. */
const ELEVATED_FAIL = 2;

export function RiskFloor() {
  return (
    <div class="stack rk-floor">
      <SectionTitle>Regulator and safety</SectionTitle>
      <RegulatorCard />
    </div>
  );
}

function RegulatorCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const r = regulatorStatus(s);
  const next = nextReviewWeek(s.meta.startDate, s.clock.week);
  const last = r.lastReview;
  const snap = safetySnapshot(s);
  return (
    <Card>
      <div class="rk-reg-head">
        <div>
          <div class="muted small">Safety ratio</div>
          <div class="hero-number">{safetyRatioText(r.safetyRatio)}</div>
        </div>
        <Badge tone={TIER_TONE[r.tier]}>{TIER_LABEL[r.tier]}</Badge>
      </div>
      <SafetyNotice s={s} />
      <CapitalMeter ratio={r.safetyRatio} tier={r.tier} kind="safety" lift={tierLift(s)} />
      <div class="rk-reg-rows">
        <Row label="Safety cover" value={safetyRatioText(snap.strength)} />
        <Row label="Model exposure" value={`×${snap.exposure.toFixed(2)}`} />
        <Row label="Next safety audit" value={gameDate(s.meta.startDate, dayOfWeek(next))} />
        <Row
          label="Chance it fails"
          value={pct(r.failChance, 1)}
          tone={r.failChance > ELEVATED_FAIL * REGULATOR_REVIEW.failBase ? 'bad' : 'dim'}
          strong
        />
        <Row
          label="Last safety audit"
          value={
            last
              ? `${last.passed ? 'Passed' : `Failed · fined ${money(last.fine, sym)}`}, ${gameDate(s.meta.startDate, dayOfWeek(last.week))}`
              : 'None yet'
          }
          tone={last && !last.passed ? 'bad' : undefined}
        />
        <Row
          label="Failed audits"
          value={String(r.failedReviews)}
          tone={r.failedReviews > 0 ? 'bad' : 'dim'}
        />
      </div>
      <p class="muted small hq-note">
        A fully staffed Safety team, a safer model and ethical office managers keep audits clean.
        Failures bring a fine of up to {pct(REGULATOR_REVIEW.fineRange[1], 1)} of a year's revenue.
      </p>
    </Card>
  );
}
