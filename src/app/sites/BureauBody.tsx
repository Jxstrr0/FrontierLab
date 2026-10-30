// Data vendor panel body (SCREENS §13): this bureau's packaged models in a
// carousel (name, rosette, data licence per customer a year, "Use as AI model",
// the current AI model marked). Buying needs you to be in the bureau's city.
// Custom mixes are built on the HQ Products floor (Manage models) only; the
// vendor's own mixer went on 2026-10-30 (owner's review, B2).
import { BUREAU_PACKAGES, type BureauPackageSpec } from '../../data/bureaus';
import * as cmd from '../../sim/commands';
import type { Site } from '../../sim/state';
import { modelQuality, mixRadar } from '../../sim/underwriting';
import { Badge, Card, Carousel, Row, SectionTitle } from '../components';
import { ModelRosette } from '../hq/products/ModelRosette';
import { radarText } from '../hq/products/productSelectors';
import { act, toast, useGame } from '../store';
import '../hq/products/products.css';
import { exactMoney } from '../format/format';

export function BureauBody(p: { site: Site }) {
  const s = useGame();
  const bureau = p.site.refId;
  const here = s.world.currentCityId === p.site.cityId;
  const packages = Object.values(BUREAU_PACKAGES).filter((x) => x.bureau === bureau);
  return (
    <div class="stack">
      {!here && (
        <p class="hq-blocker small" role="status">
          You can buy from {bureau} once you're in this city.
        </p>
      )}
      <SectionTitle>Packaged models</SectionTitle>
      {packages.length > 1 ? (
        <Carousel label={`${bureau} packaged models`} class="bu-models">
          {packages.map((pkg) => (
            <PackageCard pkg={pkg} here={here} />
          ))}
        </Carousel>
      ) : (
        packages.map((pkg) => <PackageCard pkg={pkg} here={here} />)
      )}
      <p class="muted small hq-note">
        Want your own mix of training data? Build it on the Products floor at HQ (Manage models).
      </p>
    </div>
  );
}

/** One packaged model: name, rosette, cost, quality and "Use as AI model". */
function PackageCard(p: { pkg: BureauPackageSpec; here: boolean }) {
  const s = useGame();
  const sym = s.settings.currency;
  const { pkg } = p;
  const current = s.underwriting.activeModelId === pkg.id;
  const radar = mixRadar(pkg.mix);
  return (
    <Card class={`bu-model${current ? ' is-current' : ''}`}>
      <div class="bu-model-head">
        <div class="pf-model-name">{pkg.name}</div>
        {current && <Badge tone="good">AI model</Badge>}
      </div>
      <ModelRosette radar={radar} label={pkg.name} />
      <Row
        label="Data licence per customer a year"
        value={exactMoney(pkg.costPerCustomer, sym)}
        strong
      />
      <Row label="Model quality" value={`${radarText(modelQuality({ radar }))} / 10`} />
      {current ? (
        <p class="muted small hq-note">Current AI model.</p>
      ) : (
        <button
          type="button"
          class="btn btn-primary btn-block"
          disabled={!p.here}
          onClick={() => {
            if (act(cmd.buyBureauModel, pkg.id).ok)
              toast(`Switching to ${pkg.name} over the next two weeks.`, 'good');
          }}
        >
          Use as AI model
        </button>
      )}
    </Card>
  );
}
