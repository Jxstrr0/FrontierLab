// Data vendor (SCREENS §13) and marketing agency (SCREENS §15) panels:
// header with the address, the advisor's line and the vignette. The agency's
// body is its package cards (AgencyBody); the bureau's is its packaged models
// and "My model" (BureauBody).
import { DISTRICT_SPECS } from '../../data/districts';
import { Panel } from '../components';
import { LayerMedallion } from '../map/LayerIcon';
import { siteName } from '../map/pins';
import { closePanel, useGame } from '../store';
import { BureauBody } from './BureauBody';
import { AgencyBody } from './AgencyBody';
import { SiteArt } from './SiteArt';
import './sites.css';

type HqSiteKind = 'bureau' | 'agency';

/** The advisor's line for each building. */
const ADVISOR: Record<HqSiteKind, string> = {
  bureau: 'Better data, better models. What can we train for you?',
  agency: "Let's put your name on every billboard in town.",
};

export function SitePanel(p: { siteId: string; kind: HqSiteKind }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  const label = p.kind === 'bureau' ? 'Data vendor' : 'Marketing agency';
  if (!site) {
    return (
      <Panel title={label} onClose={closePanel}>
        <p class="muted">That building is no longer on the map.</p>
      </Panel>
    );
  }
  const district = DISTRICT_SPECS[site.district]?.name;
  return (
    <Panel
      title={siteName(s, site)}
      subtitle={[site.address, district].filter(Boolean).join(' · ')}
      icon={
        <LayerMedallion
          id={site.kind === 'bureau' ? 'creditBureaus' : 'marketingAgencies'}
          size={32}
        />
      }
      onClose={closePanel}
      advisor={{ text: ADVISOR[p.kind] }}
      hero={<SiteArt kind={site.kind} />}
    >
      <div class="stack">
        {site.kind === 'bureau' ? <BureauBody site={site} /> : <AgencyBody site={site} />}
      </div>
    </Panel>
  );
}
