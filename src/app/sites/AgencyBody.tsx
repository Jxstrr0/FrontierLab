// Marketing agency panel body (SCREENS §15, CONTENT §11, SIMULATION §16.10):
// the agency's launch campaigns (B3, 2026-10-30): a banner saying whether a
// model launch is open for booking, then the package cards (name, length,
// cost, total awareness boost, the Prestige package's branch-rating bonus and
// the weeks they hold the launch buzz) for the agency's own city, Buy with
// your corporate cash shown, and the runs from this agency going now. No
// Marketing floor is needed, but buying means being in the agency's city.
import { AGENCIES, type AgencyPackageSpec } from '../../data/brandCampaigns';
import { CITIES } from '../../data/cities';
import * as cmd from '../../sim/commands';
import { agencyPackagePrice } from '../../sim/hqMarketing';
import { launchWindowLeft, launchWindowOpen } from '../../sim/modelLaunch';
import { MODEL_LAUNCH } from '../../config/balance';
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
  const left = launchWindowLeft(s);
  const launched = s.underwriting.launch
    ? s.underwriting.models[s.underwriting.launch.modelId]?.name
    : undefined;
  return (
    <div class="stack mk-floor">
      <p class={`small hq-note ${left > 0 ? 'tone-good' : 'muted'}`} role="status">
        {left > 0
          ? `${launched ?? 'Your new model'} just launched: book a launch campaign in the next ${left} ${left === 1 ? 'week' : 'weeks'}.`
          : `${agency.name} runs launch campaigns. Launch a model you trained (Manage models at HQ), then book within ${MODEL_LAUNCH.windowWeeks} weeks.`}
      </p>
      <SectionTitle>Launch campaigns</SectionTitle>
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
  const here = s.world.currentCityId === p.cityId;
  const branches = Object.values(s.branches).some(
    (b) => b.cityId === p.cityId && b.status !== 'closed',
  );
  const price = agencyPackagePrice(s, pkg);
  const short = price > s.company.cash;
  const open = launchWindowOpen(s);
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
      <Row label="Cost" value={money(price, sym)} strong />
      <Row label="Brand awareness" value={`${pointsText(pkg.boost)} in total`} tone="good" />
      <Row label="Spread over" value={`${pointsText(pkg.boost / pkg.weeks)} /week`} tone="dim" />
      <Row label="Launch buzz" value={`held at full for ${pkg.weeks} weeks`} tone="good" />
      {pkg.branchBonus && (
        <Row
          label="Sales office rating"
          value={`+${pkg.branchBonus.bonus.toFixed(2)} for ${pkg.branchBonus.weeks} weeks`}
          tone="good"
        />
      )}
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={!here || short || !open}
        onClick={buy}
      >
        Buy · {money(price, sym)}
      </button>
      <p class={`small mk-note mk-center ${short ? 'tone-bad' : 'muted'}`}>
        {!open
          ? 'Opens when you launch a model.'
          : !here
            ? `You can buy from this agency once you're in ${p.city}.`
            : branches
              ? `Corporate cash ${money(s.company.cash, sym)}`
              : `Corporate cash ${money(s.company.cash, sym)}. No sales office in ${p.city} yet; the awareness will help your first one.`}
      </p>
    </Card>
  );
}
