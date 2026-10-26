// Marketing floor content (SCREENS §10, DESIGN §5.8.5, SIMULATION §16.10):
// total weekly brand spend, brand awareness by city (bars), the brand
// campaign cards with a picker for the city (and so country) they target, and
// the agency packages running now. Packages are bought at a marketing
// agency's office on the map (SCREENS §15).
import { useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { BRAND_CAMPAIGNS } from '../../data/brandCampaigns';
import { campaignMult } from '../../sim/hq';
import { brandCampaignsWeeklyCost, cityBrandBonus } from '../../sim/hqMarketing';
import { Card, Chips, Row, SectionTitle } from '../components';
import { money, pct } from '../format/format';
import { useGame } from '../store';
import { BrandCampaignCard } from './marketing/BrandCampaignCard';
import {
  awarenessRows,
  CAMPAIGN_ORDER,
  pointsText,
  runNames,
  targetCities,
} from './marketing/marketingView';
import './marketing/marketing.css';

export function MarketingFloor() {
  const s = useGame();
  const sym = s.settings.currency;
  const mult = campaignMult(s);
  const targets = targetCities(s);
  const [picked, setPicked] = useState(targets.initial);
  const cityId = targets.ids.includes(picked) ? picked : targets.initial;
  return (
    <div class="stack mk-floor">
      <SectionTitle>Brand spend</SectionTitle>
      <Card>
        <Row
          label="Brand campaigns"
          value={`${money(brandCampaignsWeeklyCost(s), sym)} /week`}
          strong
        />
        <Row label="Running" value={String(s.marketing.campaigns.length)} />
        <Row label="Campaign strength" value={pct(mult, 0)} tone={mult < 1 ? 'bad' : 'dim'} />
        <p class="muted small hq-note">
          Campaign strength follows the Marketing team's coverage. Agency packages need no staff.
        </p>
      </Card>

      <SectionTitle>Brand awareness</SectionTitle>
      <AwarenessCard />

      <SectionTitle>Brand campaigns</SectionTitle>
      {targets.ids.length > 1 && (
        <Chips
          label="City to run campaigns in"
          options={targets.ids.map((id) => ({ value: id, label: CITIES[id]?.name ?? id }))}
          value={cityId}
          onChange={setPicked}
        />
      )}
      {CAMPAIGN_ORDER.map((id) => (
        <BrandCampaignCard key={`${id}:${cityId}`} spec={BRAND_CAMPAIGNS[id]!} cityId={cityId} />
      ))}

      <SectionTitle>Agency packages</SectionTitle>
      <AgencyRunsCard />
    </div>
  );
}

function AwarenessCard() {
  const s = useGame();
  const rows = awarenessRows(s);
  return (
    <Card>
      <ul class="mk-aw-list">
        {rows.map((r) => (
          <li class="mk-aw-row">
            <div class="mk-aw-head">
              <span class="mk-aw-city">{r.name}</span>
              <span class="mk-aw-value">{pct(r.awareness, 0)}</span>
            </div>
            <span
              class="mk-aw-track"
              role="meter"
              aria-label={`${r.name} brand awareness`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(r.awareness * 100)}
            >
              <span class="mk-aw-fill" style={{ width: `${r.awareness * 100}%` }} />
            </span>
            <span class={`small ${r.rise > 0 ? 'tone-good' : 'muted'}`}>
              {r.rise > 0 ? `${pointsText(r.rise)} /week from campaigns` : 'No campaigns here'}
            </span>
          </li>
        ))}
      </ul>
      <p class="muted small hq-note">
        Brand awareness helps every sales office in the city win new customers. Sales offices add a
        little each week; without campaigns it slowly fades.
      </p>
    </Card>
  );
}

function AgencyRunsCard() {
  const s = useGame();
  const runs = s.marketing.packages;
  const bonuses = Object.keys(s.marketing.cityBonus).filter((id) => cityBrandBonus(s, id) > 0);
  if (runs.length === 0 && bonuses.length === 0) {
    return (
      <Card>
        <p class="muted small hq-note">
          No packages running. Tap a marketing agency on the map (Marketing Agencies layer) to buy
          one.
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <ul class="mk-aw-list">
        {runs.map((r) => {
          const n = runNames(r);
          const done = r.weeksTotal - r.weeksLeft;
          return (
            <li class="mk-aw-row">
              <div class="mk-aw-head">
                <span class="mk-aw-city">{n.pkg}</span>
                <span class="small">
                  {r.weeksLeft} of {r.weeksTotal} weeks left
                </span>
              </div>
              <span class="mk-aw-track" aria-hidden="true">
                <span class="mk-aw-fill" style={{ width: `${(done / r.weeksTotal) * 100}%` }} />
              </span>
              <span class="muted small">
                {n.agency} · {n.city} · {pointsText(r.boostPerWeek)} /week
              </span>
            </li>
          );
        })}
      </ul>
      {bonuses.map((id) => (
        <Row
          label={`Sales office rating bonus, ${awarenessRows(s).find((r) => r.cityId === id)?.name ?? id}`}
          value={`+${cityBrandBonus(s, id).toFixed(2)} · ${s.marketing.cityBonus[id]!.weeksLeft} wk`}
          tone="good"
        />
      ))}
    </Card>
  );
}
