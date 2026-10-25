// Branch manager card (SCREENS §5.1): skills, salary, the five delegation
// toggles and Fire; with no manager, a Hire button that opens the candidate sheet.
import { useState } from 'preact/hooks';
import { MANAGER_POOL_REFRESH_WEEKS } from '../../config/balance';
import { managerOf } from '../../sim/branch/staff';
import * as cmd from '../../sim/commands';
import type { Branch, Delegation, Manager } from '../../sim/state';
import {
  Card,
  Confirm,
  Portrait,
  SectionTitle,
  Sheet,
  StatBar,
  Stepper,
  Toggle,
} from '../components';
import { gameDate, moneyFull } from '../format/format';
import { act, toast, useGame } from '../store';
import { dayOfWeek, salaryBounds, SALARY_STEP } from './selectors';

const DELEGATIONS: [keyof Delegation, string][] = [
  ['staffing', 'Staffing & wages'],
  ['products', 'Products & rates'],
  ['marketing', 'Branch marketing'],
  ['troubles', 'Branch troubles'],
  ['loans', 'Loan approvals'],
];

export function ManagerCard({ branch }: { branch: Branch }) {
  const s = useGame();
  const mgr = managerOf(s, branch);
  const [hiring, setHiring] = useState(false);
  const [firing, setFiring] = useState(false);
  const sym = s.settings.currency;

  if (!mgr) {
    return (
      <section>
        <SectionTitle>Branch manager</SectionTitle>
        <Card>
          <p class="br-mgr-empty muted">
            No manager. Service and morale suffer a little, and nothing can be delegated.
          </p>
          <button type="button" class="btn btn-primary btn-block" onClick={() => setHiring(true)}>
            Hire a manager
          </button>
        </Card>
        {hiring && <HireSheet branch={branch} onClose={() => setHiring(false)} />}
      </section>
    );
  }

  const salary = salaryBounds(branch.cityId);
  return (
    <section>
      <SectionTitle>Branch manager</SectionTitle>
      <Card>
        <div class="stack">
          <div class="br-mgr-head">
            <Portrait avatar={mgr.portrait} size={48} />
            <div>
              <div class="br-mgr-name">{mgr.name}</div>
              <div class="muted small">
                Manager since {gameDate(s.meta.startDate, dayOfWeek(mgr.sinceWeek))}
              </div>
            </div>
          </div>
          <Skills mgr={mgr} />
          <Stepper
            label="Annual salary"
            value={mgr.salary}
            min={salary.min}
            max={salary.max}
            step={SALARY_STEP}
            format={(v) => moneyFull(v, sym)}
            onChange={(v) => act(cmd.setManagerSalary, branch.id, v)}
            hint={`${moneyFull(salary.min, sym)} to ${moneyFull(salary.max, sym)}`}
          />
          <div>
            <div class="muted small">Let your manager handle</div>
            {DELEGATIONS.map(([key, label]) => (
              <Toggle
                label={label}
                checked={branch.delegation[key]}
                onChange={(v) => act(cmd.setDelegation, branch.id, key, v)}
              />
            ))}
          </div>
          <button type="button" class="btn btn-secondary btn-block" onClick={() => setFiring(true)}>
            Fire manager
          </button>
        </div>
      </Card>
      {firing && (
        <Confirm
          title="Fire manager?"
          body={`${mgr.name} leaves today, and every delegated task comes back to you.`}
          confirmLabel="Fire"
          danger
          onCancel={() => setFiring(false)}
          onConfirm={() => {
            setFiring(false);
            if (act(cmd.fireManager, branch.id).ok) toast(`${mgr.name} has left the branch.`);
          }}
        />
      )}
    </section>
  );
}

function Skills({ mgr }: { mgr: Manager }) {
  return (
    <div>
      <StatBar label="People" value={mgr.skills.people} />
      <StatBar label="Product" value={mgr.skills.product} />
      <StatBar label="Marketing" value={mgr.skills.marketing} />
      <StatBar label="Ethics" value={mgr.skills.ethics} />
    </div>
  );
}

function HireSheet({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const s = useGame();
  const pool = s.people.managerCandidates[branch.cityId] ?? [];
  const sym = s.settings.currency;
  const since = s.people.candidatesRefreshWeek[branch.cityId] ?? s.clock.week;
  const weeks = Math.max(1, since + MANAGER_POOL_REFRESH_WEEKS - s.clock.week);
  return (
    <Sheet title="Hire a manager" onClose={onClose}>
      <div class="stack">
        {pool.length === 0 && <p class="muted">No candidates right now.</p>}
        {pool.map((m) => (
          <Card>
            <div class="stack">
              <div class="br-mgr-head">
                <Portrait avatar={m.portrait} size={48} />
                <div>
                  <div class="br-mgr-name">{m.name}</div>
                  <div class="muted small">Asks {moneyFull(m.salary, sym)} a year</div>
                </div>
              </div>
              <Skills mgr={m} />
              <button
                type="button"
                class="btn btn-primary btn-block"
                onClick={() => {
                  if (act(cmd.hireManager, branch.id, m.id).ok) {
                    toast(`${m.name} now runs ${branch.name}.`, 'good');
                    onClose();
                  }
                }}
              >
                Hire
              </button>
            </div>
          </Card>
        ))}
        <p class="muted small">
          New candidates in {weeks} {weeks === 1 ? 'week' : 'weeks'}.
        </p>
      </div>
    </Sheet>
  );
}
