// Research team on the Products floor (stage C6c, SIMULATION §16.13): your
// named researchers with what they add to training runs and a Let go button
// (asks first), then the talent market: every researcher who is not yours,
// best first, with where they work and what hiring them costs. Hiring one
// away from a rival costs a higher salary and a signing bonus.
import { useState } from 'preact/hooks';
import { RESEARCHERS, WEEKS_PER_YEAR } from '../../../config/balance';
import * as cmd from '../../../sim/commands';
import type { Researcher } from '../../../sim/state';
import { hireTerms, researchBonus, yourResearchers, allResearchers } from '../../../sim/talent';
import { Card, CoinRating, Confirm, Portrait, Row } from '../../components';
import { moneyFull } from '../../format/format';
import { act, toast, useGame } from '../../store';
import { MODEL_AXES } from './productSelectors';

const SHOWN = 8;

const specialtyName = (r: Researcher) => MODEL_AXES[r.specialty]?.[0] ?? '';

export function ResearchTeamCard() {
  const s = useGame();
  const [letGo, setLetGo] = useState<Researcher | null>(null);
  const [all, setAll] = useState(false);
  const sym = s.settings.currency;
  const team = yourResearchers(s);
  const full = team.length >= RESEARCHERS.maxTeam;
  const market = allResearchers(s)
    .filter((r) => r.employer?.type !== 'player')
    .sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));
  const shown = all ? market : market.slice(0, SHOWN);
  const boost = Math.round(researchBonus(s) * 100);

  const hire = (r: Researcher) => {
    const res = act(cmd.hireResearcher, r.id);
    if (res.ok) toast(`${r.name} joined your research team.`, 'good');
  };

  return (
    <Card class="pf-research">
      <div class="stack">
        <p class="muted small">
          Researchers make your training runs more likely to turn out well, most of all when a run
          focuses on their specialty. They are paid every week. Rival labs may try to hire yours
          away.
        </p>
        <div class="pf-team">
          <span class="field-label">
            Your team: {team.length} of {RESEARCHERS.maxTeam}
          </span>
          <span class="small muted">Training boost: +{boost} points</span>
        </div>
        {team.length === 0 && (
          <p class="muted small">No researchers yet. Hire one from the talent market below.</p>
        )}
        {team.map((r) => (
          <div class="pf-res" key={r.id}>
            <Portrait avatar={r.portrait} size={44} />
            <div class="pf-res-text">
              <div class="pf-res-name">{r.name}</div>
              <CoinRating value={r.stars} showNumber={false} size={12} />
              <div class="small muted">
                {specialtyName(r)} · {moneyFull(r.salary, sym)} a year
              </div>
            </div>
            <button type="button" class="btn btn-secondary btn-small" onClick={() => setLetGo(r)}>
              Let go
            </button>
          </div>
        ))}
        <div class="field-label pf-label">Talent market</div>
        {shown.length === 0 && <p class="muted small">Nobody is on the market right now.</p>}
        {shown.map((r) => {
          const terms = hireTerms(s, r);
          const rival = r.employer?.type === 'rival' ? s.rivals[r.employer.id] : undefined;
          return (
            <div class="pf-res" key={r.id}>
              <Portrait avatar={r.portrait} size={44} />
              <div class="pf-res-text">
                <div class="pf-res-name">{r.name}</div>
                <CoinRating value={r.stars} showNumber={false} size={12} />
                <div class="small muted">
                  {specialtyName(r)} · {rival ? `At ${rival.name}` : 'Available'}
                </div>
                <div class="small muted">
                  {moneyFull(terms.salary, sym)} a year
                  {terms.signing > 0 && ` + ${moneyFull(terms.signing, sym)} signing bonus`}
                </div>
              </div>
              <button
                type="button"
                class="btn btn-primary btn-small"
                disabled={full}
                onClick={() => hire(r)}
              >
                {rival ? 'Poach' : 'Hire'}
              </button>
            </div>
          );
        })}
        {full && (
          <p class="hq-blocker small" role="status">
            Your research team is full ({RESEARCHERS.maxTeam}). Let someone go to make room.
          </p>
        )}
        {market.length > SHOWN && (
          <button type="button" class="btn btn-secondary btn-block" onClick={() => setAll(!all)}>
            {all ? 'Show fewer' : `Show all ${market.length}`}
          </button>
        )}
        {team.length > 0 && (
          <Row
            label="Weekly pay for the team"
            value={moneyFull(
              team.reduce((n, r) => n + r.salary / WEEKS_PER_YEAR, 0),
              sym,
            )}
            tone="dim"
          />
        )}
      </div>
      {letGo && (
        <Confirm
          title={`Let ${letGo.name} go?`}
          body={`${letGo.name} leaves your team and goes back on the talent market. A rival may sign them.`}
          confirmLabel="Let go"
          danger
          onConfirm={() => {
            const id = letGo.id;
            setLetGo(null);
            act(cmd.releaseResearcher, id);
          }}
          onCancel={() => setLetGo(null)}
        />
      )}
    </Card>
  );
}
