// Branch Marketing tab (SCREENS §5.4): a two-column grid of campaign cards, each
// with a level selector (Off + levels), its cost and an effect hint.
import { CAMPAIGNS, type CampaignSpec } from '../../data/campaigns';
import { CITIES } from '../../data/cities';
import { campaignEffects } from '../../sim/branch/marketing';
import * as cmd from '../../sim/commands';
import type { Branch } from '../../sim/state';
import { Card, Row } from '../components';
import { SpotArt } from '../components/SpotArt';
import { money } from '../format/format';
import { act, useGame } from '../store';
import { campaignCostText } from './selectors';

export function MarketingTab({ branch }: { branch: Branch }) {
  const s = useGame();
  const sym = s.settings.currency;
  const fx = campaignEffects(branch);
  const last = branch.pnl[branch.pnl.length - 1];
  return (
    <div class="stack">
      <Card>
        <Row label="Fixed campaign costs" value={`${money(fx.weeklyCost, sym)}/wk`} />
        <Row
          label="Marketing last week"
          value={last ? money(last.lines.marketing, sym) : '—'}
          tone="dim"
        />
      </Card>
      {branch.delegation.marketing && <p class="muted small">Your manager runs marketing here.</p>}
      <div class="grid-2 br-campaigns">
        {Object.values(CAMPAIGNS).map((c) => (
          <CampaignCard branch={branch} spec={c} />
        ))}
      </div>
    </div>
  );
}

function CampaignCard({ branch, spec }: { branch: Branch; spec: CampaignSpec }) {
  const s = useGame();
  const level = branch.campaigns[spec.id] ?? 0;
  const costIndex = CITIES[branch.cityId]?.costIndex ?? 1;
  const active = level > 0 ? spec.levels[level - 1] : undefined;
  const first = spec.levels[0];
  const cost = active
    ? campaignCostText(active.cost, costIndex, s.settings.currency)
    : first
      ? `From ${campaignCostText(first.cost, costIndex, s.settings.currency)}`
      : '';
  const locked = branch.delegation.marketing;
  const options = ['Off', ...spec.levels.map((l) => l.label)];
  return (
    <Card class={`br-campaign${active ? ' is-on' : ''}`}>
      <div class="br-campaign-head">
        <SpotArt group="campaign" id={spec.id} size={40} />
        <div class="br-campaign-name">{spec.name}</div>
      </div>
      <div class="br-levels" role="radiogroup" aria-label={`${spec.name} level`}>
        {options.map((label, i) => (
          <button
            type="button"
            role="radio"
            aria-checked={i === level}
            class={`br-level${i === level ? ' is-active' : ''}`}
            disabled={locked}
            onClick={() => act(cmd.setCampaignLevel, branch.id, spec.id, i)}
          >
            {label}
          </button>
        ))}
      </div>
      <div class="small">{cost}</div>
      <div class="muted small">{spec.effectHint}</div>
    </Card>
  );
}
