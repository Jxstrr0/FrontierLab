// IT & Security floor content (SCREENS §10, DESIGN §5.8.6): the mobile app
// rating in coins with where the team is steering it (the rating has no
// weekly history yet, so current and target stand in for the 26-week trend),
// a short security posture summary (breaches and outages arrive in Stage 5)
// and a placeholder for digital projects.
import { appRatingTarget } from '../../sim/company';
import { cov } from '../../sim/hq';
import { Card, CoinRating, Row, SectionTitle } from '../components';
import { useGame } from '../store';
import { FloorPlaceholder } from './FloorPlaceholder';

/** UI-only bands for the security summary wording (not simulation tuning). */
const POSTURE = { strong: 1, fair: 0.8 } as const;
/** A rating within this of its target reads as steady. */
const STEADY = 0.05;

export function ItFloor() {
  const s = useGame();
  const rating = s.company.appRating;
  const target = appRatingTarget(s);
  const trend =
    target > rating + STEADY ? 'Rising' : target < rating - STEADY ? 'Slipping' : 'Steady';
  const k = cov(s, 'it');
  const posture =
    k >= POSTURE.strong
      ? 'Patches go out on time and access reviews are up to date.'
      : k >= POSTURE.fair
        ? 'The team keeps up with patches, but reviews are slipping.'
        : 'Too few hands: patches lag and the attack surface is growing.';
  return (
    <div class="stack">
      <SectionTitle>Mobile app</SectionTitle>
      <Card>
        <div class="hq-app-head">
          <span class="hero-number">{rating.toFixed(1)}</span>
          <div>
            <CoinRating value={rating} showNumber={false} size={20} />
            <div
              class={`small tone-${trend === 'Slipping' ? 'bad' : trend === 'Rising' ? 'good' : 'flat'}`}
            >
              {trend}, heading for {target.toFixed(1)}
            </div>
          </div>
        </div>
        <p class="muted small hq-note">
          A better app lifts every branch's Products rating and means fewer trips to the counter.
          The IT team's skill and coverage set where it heads.
        </p>
      </Card>

      <SectionTitle>Security</SectionTitle>
      <Card>
        <Row
          label="Posture"
          value={k >= POSTURE.strong ? 'Strong' : k >= POSTURE.fair ? 'Fair' : 'Weak'}
          strong
        />
        <p class="muted small hq-note">{posture}</p>
      </Card>

      <SectionTitle>Digital projects</SectionTitle>
      <FloorPlaceholder
        title="Digital projects"
        arrives="Arrives with product development"
        body="Run app features and platform upgrades as developments of type Digital."
      />
    </div>
  );
}
