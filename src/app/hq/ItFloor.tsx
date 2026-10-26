// IT & Security floor content (SCREENS §10, DESIGN §5.8.6): the mobile app
// rating in coins with where the team is steering it, its 26-week trend and
// the drag of an empty CTO seat, a short security posture summary with this
// week's data-breach odds as a yearly figure, and the digital projects
// (developments of type Digital).
import { appRatingTarget } from '../../sim/company';
import { cov } from '../../sim/hq';
import { Card, CoinRating, LineChart, Row, SectionTitle } from '../components';
import { dayOfWeek } from '../branch/selectors';
import { pct, shortDate } from '../format/format';
import { useGame } from '../store';
import { appRatingTrend, breachRiskYear, ctoVacancyDrag } from './itView';
import { DigitalProjects } from './products/DigitalProjects';

/** UI-only bands for the security summary wording (not simulation tuning). */
const POSTURE = { strong: 1, fair: 0.8 } as const;
/** A rating within this of its target reads as steady. */
const STEADY = 0.05;
/** The app rating chart's scale runs to five coins. */
const MAX_STARS = 5;
/** Yearly breach odds under this read as "under 1%". */
const ODDS_FLOOR = 0.01;

export function ItFloor() {
  const s = useGame();
  const rating = s.company.appRating;
  const target = appRatingTarget(s);
  const trend =
    target > rating + STEADY ? 'Rising' : target < rating - STEADY ? 'Slipping' : 'Steady';
  const drag = ctoVacancyDrag(s);
  const k = cov(s, 'it');
  const risk = breachRiskYear(s);
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
        {drag > 0 && (
          <p class="small tone-bad hq-note">
            The CTO seat is empty: the app's target sits {drag.toFixed(1)} stars lower until you
            hire a new CTO.
          </p>
        )}
        <AppTrend />
        <p class="muted small hq-note">
          A better app lifts every sales office's Products rating and means fewer trips to the
          counter. The IT team's skill and coverage set where it heads.
        </p>
      </Card>

      <SectionTitle>Security</SectionTitle>
      <Card>
        <Row
          label="Posture"
          value={k >= POSTURE.strong ? 'Strong' : k >= POSTURE.fair ? 'Fair' : 'Weak'}
          strong
        />
        <Row
          label="Breach risk"
          value={risk < ODDS_FLOOR ? 'Under 1% a year' : `≈ ${pct(risk, 0)} a year`}
        />
        <p class="muted small hq-note">{posture}</p>
        <p class="muted small hq-note">
          The breach risk is the chance of at least one data breach over a year at this week's odds.
          A stronger IT team and a CTO bring it down.
        </p>
      </Card>

      <SectionTitle>Digital projects</SectionTitle>
      <DigitalProjects />
    </div>
  );
}

/** The app rating at each of the last 26 weekly closes. */
function AppTrend() {
  const s = useGame();
  const points = appRatingTrend(s.history.weekly);
  if (points.length < 2) {
    return <p class="muted small hq-note">The trend appears after a couple of weekly closes.</p>;
  }
  const date = (week: number) => shortDate(s.meta.startDate, dayOfWeek(week));
  return (
    <LineChart
      label="App rating by week"
      series={[{ label: 'App rating', values: points.map((x) => x.rating), tone: 'brass' }]}
      max={MAX_STARS}
      startLabel={date(points[0]!.week)}
      endLabel={date(points[points.length - 1]!.week)}
    />
  );
}
