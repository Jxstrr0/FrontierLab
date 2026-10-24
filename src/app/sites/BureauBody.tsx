// Credit bureau panel body (SCREENS §13): this bureau's packaged models in a
// carousel (name, rosette, cost per application, "Use as house model", the
// current house model marked) and My model, a custom mix the bureau builds
// and hosts (no Products floor needed; hosted quality and pricing). Buying
// or commissioning needs you to be in the bureau's city.
import { useState } from 'preact/hooks';
import { MODEL_NAME_MAX } from '../../config/balance';
import { BUREAU_PACKAGES, type BureauPackageSpec } from '../../data/bureaus';
import * as cmd from '../../sim/commands';
import type { Site } from '../../sim/state';
import { modelQuality, mixRadar, previewModel } from '../../sim/underwriting';
import { Badge, Card, Carousel, Row, SectionTitle } from '../components';
import { MixEditor } from '../hq/products/MixEditor';
import { fromPercents, toPercents, type PercentMix } from '../hq/products/mixMath';
import { ModelRosette } from '../hq/products/ModelRosette';
import { NameField } from '../hq/products/NameField';
import { INPUT_IDS, radarText } from '../hq/products/productSelectors';
import { act, toast, useGame } from '../store';
import '../hq/products/products.css';

export function BureauBody(p: { site: Site }) {
  const s = useGame();
  const bureau = p.site.refId;
  const here = s.world.currentCityId === p.site.cityId;
  const packages = Object.values(BUREAU_PACKAGES).filter((x) => x.bureau === bureau);
  const [name, setName] = useState(`${bureau} custom`);
  const [mix, setMix] = useState<PercentMix>(() =>
    toPercents(packages[0]?.mix ?? { bureau: 1 }, INPUT_IDS),
  );
  const problem = previewModel(s, fromPercents(mix), 'hosted').problem;

  const commission = () => {
    const r = act(cmd.commissionBureauModel, { bureau, name, mix: fromPercents(mix) });
    if (r.ok) toast(`${name.trim()} commissioned. Switching over the next two weeks.`, 'good');
  };

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

      <SectionTitle>My model</SectionTitle>
      <p class="muted small">
        Pick the data and {bureau} builds and hosts the model for you. No Products floor needed;
        hosted models score a little lower and cost a little more than ones your own team builds.
      </p>
      <NameField label="Model name" value={name} max={MODEL_NAME_MAX} onInput={setName} />
      <MixEditor value={mix} onChange={setMix} source="hosted" />
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={!here || !!problem || !name.trim()}
        onClick={commission}
      >
        Commission and use
      </button>
    </div>
  );
}

/** One packaged model: name, rosette, cost, quality and "Use as house model". */
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
        {current && <Badge tone="good">House model</Badge>}
      </div>
      <ModelRosette radar={radar} label={pkg.name} />
      <Row label="Cost per application" value={`${sym}${pkg.costPerApp.toFixed(2)}`} strong />
      <Row label="Model quality" value={`${radarText(modelQuality({ radar }))} / 10`} />
      {current ? (
        <p class="muted small hq-note">Current house model.</p>
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
          Use as house model
        </button>
      )}
    </Card>
  );
}
