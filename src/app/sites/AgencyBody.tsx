// Marketing agency panel body (SCREENS §15, CONTENT §11, SIMULATION §16.10):
// the agency's package cards (name, length, cost, total awareness boost and
// the Prestige package's branch-rating bonus) for the agency's own city, Buy
// with your corporate cash shown, and the runs from this agency going now.
// No Marketing floor is needed.
import { AGENCIES, type AgencyPackageSpec } from '../../data/brandCampaigns';
import { CITIES } from '../../data/cities';
import * as cmd from '../../sim/commands';
import type { Site } from '../../sim/state';
import { Card, Row, SectionTitle } from '../components';
import { money } from '../format/format';
import { pointsText } from '../hq/marketing/marketingView';
import { act, toast, useGame } from '../store';
import '../hq/marketing/marketing.css';

export function AgencyBody({ site }: { site: Site }) {
  const s = useGame();
  const agency = AGENCIES[site.refId];
  if (!agency) return <p class="muted">This agency isn't taking clients right now.</p>;
  const runs = s.marketing.packages.filter((r) => r.agencyId === agency.id);
  const city = CITIES[site.cityId]?.name ?? site.cityId;
  return (
    <div class="stack mk-floor">
      <SectionTitle>Packages</SectionTitle>
      {agency.packages.map((p) => (
        <PackageCard key={p.id} agencyId={agency.id} pkg={p} cityId={site.cityId} city={city} />
      ))}
      <SectionTitle>Running with {agency.name}</SectionTitle>
      <Card>
        {runs.length === 0 ? (
          <p class="muted small hq-note">Nothing running yet.</p>
        ) : (
          <ul class="mk-aw-list">
            {runs.map((r) => {
              const name = agency.packages.find((p) => p.id === r.packageId)?.name ?? r.packageId;
              return (
                <li class="mk-aw-row">
                  <div class="mk-aw-head">
                    <span class="mk-aw-city">{name}</span>
                    <span class="small">
                      {r.weeksLeft} of {r.weeksTotal} weeks left
                    </span>
                  </div>
                  <span class="mk-aw-track" aria-hidden="true">
                    <span
                      class="mk-aw-fill"
                      style={{ width: `${((r.weeksTotal - r.weeksLeft) / r.weeksTotal) * 100}%` }}
                    />
                  </span>
                  <span class="muted small">
                    {CITIES[r.cityId]?.name ?? r.cityId} · {pointsText(r.boostPerWeek)} /week
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function PackageCard(p: {
  agencyId: string;
  pkg: AgencyPackageSpec;
  cityId: string;
  city: string;
}) {
  const s = useGame();
  const sym = s.settings.currency;
  const { pkg } = p;
  const operating = !!s.world.cities[p.cityId];
  const short = pkg.cost > s.company.cash;
  const buy = () => {
    const r = act(cmd.buyAgencyPackage, {
      agencyId: p.agencyId,
      packageId: pkg.id,
      cityId: p.cityId,
    });
    if (r.ok) toast(`${pkg.name} booked for ${p.city}.`, 'good');
  };
  return (
    <Card class="mk-campaign">
      <div class="mk-campaign-head">
        <div class="mk-campaign-name">{pkg.name}</div>
        <span class="small muted">{pkg.weeks} weeks</span>
      </div>
      <Row label="City" value={p.city} />
      <Row label="Cost" value={money(pkg.cost, sym)} strong />
      <Row label="Brand awareness" value={`${pointsText(pkg.boost)} in total`} tone="good" />
      <Row label="Spread over" value={`${pointsText(pkg.boost / pkg.weeks)} /week`} tone="dim" />
      {pkg.branchBonus && (
        <Row
          label="Branch rating"
          value={`+${pkg.branchBonus.bonus.toFixed(2)} for ${pkg.branchBonus.weeks} weeks`}
          tone="good"
        />
      )}
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={!operating || short}
        onClick={buy}
      >
        Buy · {money(pkg.cost, sym)}
      </button>
      <p class={`small mk-note mk-center ${short ? 'tone-bad' : 'muted'}`}>
        {operating
          ? `Corporate cash ${money(s.company.cash, sym)}`
          : "Your bank doesn't operate in this city yet."}
      </p>
    </Card>
  );
}
