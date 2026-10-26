// Lobbying firm panel (SCREENS §15): campaign cards with cost, success %,
// exposure risk % and Lobby (with a confirmation), a note when a campaign
// can't start (e.g. no buffer bill pending), the campaigns under way with
// weeks left, wins still in force and past outcomes.
import { useState } from 'preact/hooks';
import { LOBBYING } from '../../config/balance';
import { LOBBY_FIRMS, type LobbyCampaignSpec } from '../../data/lobbying';
import * as cmd from '../../sim/commands';
import { lobbyingPrice } from '../../sim/lobbying';
import { Badge, Card, Confirm, Panel, Row, SectionTitle } from '../components';
import { moneyFull, pct } from '../format/format';
import { LayerMedallion } from '../map/LayerIcon';
import { act, closePanel, toast, useGame } from '../store';
import {
  campaignCards,
  pastCampaigns,
  pendingCampaigns,
  winsInForce,
  type CampaignRow,
} from './lobbyingView';
import './lobbying.css';
import { LobbyingArt } from './LobbyingArt';

const weeksText = (n: number) => (n === 1 ? '1 week' : `${n} weeks`);

export function LobbyingFirmPanel(p: { siteId: string }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  const firm = site ? LOBBY_FIRMS[site.refId] : undefined;
  const [asking, setAsking] = useState<LobbyCampaignSpec | null>(null);
  if (!site || !firm) {
    return (
      <Panel title="Lobbying firm" onClose={closePanel}>
        <p class="muted">That firm is no longer on the map.</p>
      </Panel>
    );
  }
  const sym = s.settings.currency;
  const cards = campaignCards(s, site.id);
  const pending = pendingCampaigns(s);
  const past = pastCampaigns(s);
  const wins = winsInForce(s);
  const [lo, hi] = LOBBYING.resolveWeeks;
  const lobby = () => {
    if (!asking) return;
    const spec = asking;
    setAsking(null);
    const r = act(cmd.startLobbying, site.id, spec.id);
    if (r.ok) toast(`${firm.name} is on it. Expect news in ${lo}–${hi} weeks.`, 'good');
  };
  return (
    <Panel
      title={firm.name}
      subtitle={`Lobbying firm · ${site.address}`}
      icon={<LayerMedallion id="lobbyingFirms" size={32} />}
      onClose={closePanel}
      advisor={{
        text: 'We know the right people. Results take a few weeks, and discretion is never guaranteed.',
      }}
      hero={<LobbyingArt />}
    >
      <div class="stack">
        <SectionTitle>Campaigns</SectionTitle>
        {cards.map(({ spec, blocked }) => (
          <Card key={spec.id}>
            <div class="lb-title">{spec.title}</div>
            <p class="muted small lb-desc">{spec.description}</p>
            <Row label="Cost" value={moneyFull(lobbyingPrice(s, spec, site.cityId), sym)} strong />
            <Row label="Success chance" value={pct(spec.success, 0)} />
            <Row label="Exposure risk" value={pct(spec.exposure, 0)} tone="bad" />
            <Row label="Outcome" value={`in ${lo}–${hi} weeks`} tone="dim" />
            <button
              type="button"
              class="btn btn-primary btn-block lb-btn"
              disabled={!!blocked}
              onClick={() => setAsking(spec)}
            >
              Lobby · {moneyFull(lobbyingPrice(s, spec, site.cityId), sym)}
            </button>
            {blocked && <p class="small muted lb-center">{blocked}</p>}
          </Card>
        ))}

        {wins.length > 0 && (
          <>
            <SectionTitle>In force</SectionTitle>
            <Card>
              <ul class="lb-list">
                {wins.map((w) => (
                  <li key={w} class="small">
                    {w}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}

        <SectionTitle>Under way</SectionTitle>
        <Card>
          {pending.length === 0 ? (
            <p class="muted small lb-center">No campaigns running.</p>
          ) : (
            pending.map((r) => (
              <Row
                key={r.campaign.id}
                label={r.title}
                value={r.weeksLeft === 0 ? 'this week' : weeksText(r.weeksLeft)}
              />
            ))
          )}
        </Card>

        {past.length > 0 && (
          <>
            <SectionTitle>Past campaigns</SectionTitle>
            <Card>
              {past.map((r) => (
                <PastRow key={r.campaign.id} row={r} sym={sym} />
              ))}
            </Card>
          </>
        )}
      </div>
      {asking && (
        <Confirm
          title="Hire the firm?"
          body={
            <p>
              {asking.title} for {moneyFull(lobbyingPrice(s, asking, site.cityId), sym)}, paid now.
              It works {pct(asking.success, 0)} of the time, and there's a {pct(asking.exposure, 0)}{' '}
              chance The Weekly Inference finds out: a fine of {pct(LOBBYING.exposeFine, 0)} of the
              fee and a dent in your brand.
            </p>
          }
          confirmLabel="Lobby"
          onConfirm={lobby}
          onCancel={() => setAsking(null)}
        />
      )}
    </Panel>
  );
}

function PastRow({ row, sym }: { row: CampaignRow; sym: string }) {
  const c = row.campaign;
  return (
    <div class="lb-past">
      <span class="lb-past-title small">{row.title}</span>
      <span class="lb-past-badges">
        <Badge tone={c.status === 'won' ? 'good' : 'bad'}>
          {c.status === 'won' ? 'Won' : 'Lost'}
        </Badge>
        {c.exposed && <Badge tone="warn">Exposed</Badge>}
      </span>
      <span class="muted small">{moneyFull(c.cost, sym)}</span>
    </div>
  );
}
