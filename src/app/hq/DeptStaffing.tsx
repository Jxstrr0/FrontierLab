// The part every HQ department floor shares (SCREENS §10): Employees stepper
// (`18 / 24`) with an Open positions chip, Annual salary with the market hint
// (and a note when the COO's Pay reviews set it), staff figures tinted by mood, Skill and Morale bars, and the coverage meter
// ("Needs 21 · Coverage 86%").
import { HQ_COVERAGE } from '../../config/balance';
import * as cmd from '../../sim/commands';
import { deptDesks } from '../../sim/hq';
import type { DeptId } from '../../sim/state';
import { Badge, Card, SectionTitle, StatBar, Stepper } from '../components';
import { moneyFull, moneyStepper } from '../format/format';
import { act, useGame } from '../store';
import { coverageView, isHqDept, salaryBounds } from './deptSelectors';
import { TeamFigures } from './TeamFigures';

export function DeptStaffing(p: { dept: DeptId }) {
  const s = useGame();
  const d = s.departments[p.dept];
  if (!d) return null;
  const sym = s.settings.currency;
  const desks = deptDesks(s, p.dept);
  const open = Math.max(0, d.target - d.staff);
  const pay = salaryBounds(s, p.dept);
  const reviews = !!s.executives.seats.coo?.delegations.payReviews;
  return (
    <section>
      <SectionTitle>Team</SectionTitle>
      <Card>
        <div class="stack">
          <div class="hq-staff-head">
            <span class="muted small">
              {d.staff} on staff · {desks} desks
            </span>
            {open > 0 ? (
              <Badge tone="warn">Open positions: {open}</Badge>
            ) : (
              <Badge tone="good">No open positions</Badge>
            )}
          </div>
          <div class="grid-2">
            <Stepper
              label="Employees"
              value={d.target}
              min={0}
              max={desks}
              step={1}
              format={(v) => `${v} / ${desks}`}
              onChange={(v) => act(cmd.setDeptTarget, p.dept, v)}
              hint={d.target < d.staff ? 'Lower targets let staff go' : 'Hiring target'}
            />
            <Stepper
              label="Annual salary"
              value={d.salary}
              min={pay.min}
              max={pay.max}
              step={pay.step}
              {...moneyStepper(sym)}
              onChange={(v) => act(cmd.setDeptSalary, p.dept, v)}
              hint={`Market ${moneyFull(pay.market, sym)}`}
            />
          </div>
          {reviews && (
            <p class="muted small">
              Your COO reviews this pay{' '}
              {s.executives.payReviewCadence === 'annual' ? 'once a year' : 'once a quarter'}.
            </p>
          )}
          <TeamFigures staff={d.staff} target={d.target} morale={d.morale} />
          <div>
            <StatBar label="Skill" value={d.skill} />
            <StatBar label="Morale" value={d.morale} />
          </div>
        </div>
      </Card>
      {isHqDept(p.dept) && <CoverageMeter dept={p.dept} />}
    </section>
  );
}

/** Coverage bar from 0 to 120% with a mark at 100% (fully staffed). */
function CoverageMeter(p: { dept: Parameters<typeof coverageView>[1] }) {
  const s = useGame();
  const c = coverageView(s, p.dept);
  const max = HQ_COVERAGE.kMax;
  const tone = c.status === 'short' ? 'bad' : c.status === 'ok' ? 'good' : 'flat';
  return (
    <Card class="hq-coverage" tutorial="hq-coverage">
      <div class="hq-coverage-head">
        <span class="hq-coverage-title">Coverage</span>
        <span class={`hq-coverage-text tone-${tone}`}>{c.text}</span>
      </div>
      <div
        class="hq-meter"
        role="meter"
        aria-label="Coverage"
        aria-valuemin={0}
        aria-valuemax={max * 100}
        aria-valuenow={Math.round(c.share * 100)}
      >
        <span
          class={`hq-meter-fill hq-meter-${c.status}`}
          style={{ width: `${(c.share / max) * 100}%` }}
        />
        <span class="hq-meter-full" style={{ left: `${(1 / max) * 100}%` }} aria-hidden="true" />
      </div>
      <p class="muted small hq-note">{c.note}</p>
    </Card>
  );
}
