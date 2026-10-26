// Executive profile sheet (SCREENS §10.1): portrait, name, title and hire date;
// Leadership, Expertise and Loyalty bars; the seat's delegation toggles with
// what each does, some with a dial under them (DelegationDials.tsx: the COO's
// morale target and review cadence with the pay premium, the CMO's awareness
// target); the salary stepper with the market hint; the grants list with
// vesting progress, Add grant, and Fire with a confirm showing severance. The
// COO's sheet adds the growth cities their Expansion delegation may build in,
// each with an "Open a branch now" button (GrowthCities.tsx). Seats that give
// branch guidance show what they are telling managers (GuidanceNote.tsx); the
// CREO shows the buildings it manages (PropertyNote.tsx).
import { useState } from 'preact/hooks';
import * as cmd from '../../sim/commands';
import type { ExecSeat } from '../../sim/state';
import {
  Card,
  Confirm,
  SectionTitle,
  Sheet,
  StatBar,
  Stepper,
  Toggle,
  Portrait,
} from '../components';
import { count, exactMoney, gameDate, moneyFull, moneyStepper } from '../format/format';
import { act, toast, useGame } from '../store';
import { DelegationDial } from './DelegationDials';
import { ExecGrantForm } from './ExecGrantForm';
import { GrowthCities } from './GrowthCities';
import { GUIDANCE_SEATS, GuidanceNote } from './GuidanceNote';
import { PropertyNote } from './PropertyNote';
import { dayOf, execSalaryStepper, seatSpec, vestProgress } from './execSelectors';

export function ExecProfileSheet(p: { seat: ExecSeat; onClose: () => void }) {
  const s = useGame();
  const [firing, setFiring] = useState(false);
  const [granting, setGranting] = useState(false);
  const exec = s.executives.seats[p.seat];
  const spec = seatSpec(p.seat);
  if (!exec) return null;
  const sym = s.settings.currency;
  const pay = execSalaryStepper(s);
  const severance = cmd.execSeverance(exec.salary);
  return (
    <>
      <Sheet title={spec.title} onClose={p.onClose}>
        <div class="stack">
          <div class="exec-person">
            <Portrait avatar={exec.portrait} size={72} />
            <div>
              <div class="exec-person-name">{exec.name}</div>
              <div class="muted small">
                {spec.short} since {gameDate(s.meta.startDate, dayOf(exec.hiredWeek))}
              </div>
            </div>
          </div>
          <div>
            <StatBar label="Leadership" value={exec.leadership} />
            <StatBar label="Expertise" value={exec.expertise} />
            <StatBar label="Loyalty" value={exec.loyalty} />
          </div>

          <section>
            <SectionTitle>Delegations</SectionTitle>
            <Card>
              {spec.delegations.map((d) => (
                <>
                  <Toggle
                    label={d.label}
                    hint={d.description}
                    checked={!!exec.delegations[d.id]}
                    onChange={(v) => act(cmd.setExecDelegation, p.seat, d.id, v)}
                  />
                  <DelegationDial s={s} seat={p.seat} id={d.id} />
                </>
              ))}
              {p.seat === 'coo' && <GrowthCities s={s} />}
              {GUIDANCE_SEATS.includes(p.seat) && <GuidanceNote s={s} seat={p.seat} />}
              {p.seat === 'creo' && <PropertyNote s={s} />}
              {p.seat === 'cfo' && (
                <p class="muted small exec-note">
                  Statement delays are halved while a CFO is seated.
                </p>
              )}
              {p.seat === 'cto' && (
                <p class="muted small exec-note">A CTO lifts the app rating by their expertise.</p>
              )}
            </Card>
          </section>

          <Stepper
            label="Annual salary"
            value={exec.salary}
            min={pay.min}
            max={pay.max}
            step={pay.step}
            {...moneyStepper(sym)}
            onChange={(v) => act(cmd.setExecSalary, p.seat, v)}
            hint={`Market ${moneyFull(pay.market, sym)}. Underpaid executives are easier to poach.`}
          />

          <section>
            <SectionTitle>Equity grants</SectionTitle>
            <Card>
              {exec.grants.length === 0 && (
                <p class="muted small exec-note">
                  No grants yet. Unvested grants halve the chance of losing{' '}
                  {exec.name.split(' ')[0]} to a rival.
                </p>
              )}
              <ul class="exec-grants">
                {exec.grants.map((g) => {
                  const progress = vestProgress(s, g);
                  return (
                    <li class="exec-grant">
                      <div class="exec-grant-head">
                        <span>
                          {g.type === 'rsu' ? 'RSU' : 'Stock option'} · {count(g.shares)} shares
                        </span>
                        {g.type === 'option' && (
                          <span class="muted small">Strike {exactMoney(g.strike, sym)}</span>
                        )}
                      </div>
                      <div
                        class="exec-vest"
                        role="meter"
                        aria-label="Vesting progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(progress * 100)}
                      >
                        <span class="exec-vest-fill" style={{ width: `${progress * 100}%` }} />
                      </div>
                      <span class="muted small">
                        {count(g.vested)} of {count(g.shares)} vested
                        {g.type === 'option' && g.vested > g.exercised
                          ? ` · ${count(g.vested - g.exercised)} waiting to be in the money`
                          : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                class="btn btn-secondary btn-block"
                onClick={() => setGranting(!granting)}
                aria-expanded={granting}
              >
                {granting ? 'Close' : 'Add grant'}
              </button>
              {granting && <ExecGrantForm seat={p.seat} onDone={() => setGranting(false)} />}
            </Card>
          </section>

          <button type="button" class="btn btn-secondary btn-block" onClick={() => setFiring(true)}>
            Fire {spec.short}
          </button>
        </div>
      </Sheet>
      {firing && (
        <Confirm
          title={`Fire ${exec.name}?`}
          body={`${exec.name} leaves today with ${moneyFull(severance, sym)} in severance. Unvested grants are forfeited and every delegation comes back to you.`}
          confirmLabel="Fire"
          danger
          onCancel={() => setFiring(false)}
          onConfirm={() => {
            setFiring(false);
            if (act(cmd.fireExec, p.seat).ok) {
              toast(`${exec.name} has left the bank.`);
              p.onClose();
            }
          }}
        />
      )}
    </>
  );
}
