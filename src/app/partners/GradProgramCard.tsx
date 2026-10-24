// Graduate program card (SCREENS §15): yearly cost, what it does, and Start or
// End. One program runs at a time; another university's shows as the blocker.
import { useState } from 'preact/hooks';
import { DAYS_PER_WEEK, GRAD_PROGRAM } from '../../config/balance';
import * as cmd from '../../sim/commands';
import { gradProgramCost } from '../../sim/partnerships';
import type { Site } from '../../sim/state';
import { Card, Confirm, Row } from '../components';
import { money, shortDate } from '../format/format';
import { act, toast, useGame } from '../store';

export function GradProgramCard(p: { site: Site }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [confirm, setConfirm] = useState(false);
  const cost = gradProgramCost(p.site);
  const g = s.company.gradProgram;
  const here = g?.siteId === p.site.id;
  const elsewhere = g && !here ? s.world.sites[g.siteId] : undefined;
  const short = s.company.cash < cost;
  const name = p.site.employer?.name ?? p.site.refId;

  const start = () => {
    const r = act(cmd.startGradProgram, p.site.id);
    if (r.ok) toast(`Graduate program started with ${name}.`, 'good');
  };
  const end = () => {
    setConfirm(false);
    const r = act(cmd.endGradProgram);
    if (r.ok) toast('Graduate program ended.', 'info');
  };
  const note =
    here && g
      ? `Next year's fee is due ${shortDate(s.meta.startDate, g.renewWeek * DAYS_PER_WEEK)}.`
      : elsewhere
        ? `You already run a program with ${elsewhere.employer?.name ?? elsewhere.refId}.`
        : short
          ? `Not enough cash: you need ${money(cost, sym)}.`
          : `Corporate cash ${money(s.company.cash, sym)}`;

  return (
    <Card class="pt-deal">
      <div class="pt-deal-head">
        <div class="pt-deal-name">Graduate program{here ? ' · yours' : ''}</div>
        <span class="small muted">Paid yearly</span>
      </div>
      <Row label="Cost" value={`${money(cost, sym)} a year`} strong />
      <Row label="Manager candidates" value={`+${GRAD_PROGRAM.skillBonus} skill`} tone="good" />
      <Row label="Hiring" value={`+${GRAD_PROGRAM.hireBonus} hire a week`} tone="good" />
      {here ? (
        <button type="button" class="btn btn-secondary btn-block" onClick={() => setConfirm(true)}>
          End program
        </button>
      ) : (
        <button
          type="button"
          class="btn btn-primary btn-block"
          disabled={!!g || short}
          onClick={start}
        >
          Start · {money(cost, sym)}
        </button>
      )}
      <p class={`small pt-center ${!here && (short || elsewhere) ? 'tone-bad' : 'muted'}`}>
        {note}
      </p>
      {confirm && (
        <Confirm
          title="End the graduate program?"
          body="This year's fee isn't refunded, and new candidates lose the graduate bonus."
          confirmLabel="End program"
          danger
          onConfirm={end}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Card>
  );
}
