// Credit bureau (SCREENS §13) and marketing agency (SCREENS §15) panels:
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

const COPY: Record<HqSiteKind, { advisor: string; title: string; arrives: string; body: string }> =
  {
    bureau: {
      advisor: 'Better data, fewer defaults. What can we score for you?',
      title: 'Scoring models',
      arrives: 'Arrives with the Products update',
      body: 'Packaged underwriting models to use as your house model, and custom models the bureau can build and host for you.',
    },
    agency: {
      advisor: "Let's put your name on every billboard in town.",
      title: 'Campaign packages',
      arrives: 'Arrives with the Marketing update',
      body: 'One-off packages that lift your brand across the city for a few weeks.',
    },
  };

export function SitePanel(p: { siteId: string; kind: HqSiteKind }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  const label = p.kind === 'bureau' ? 'Credit bureau' : 'Marketing agency';
  if (!site) {
    return (
      <Panel title={label} onClose={closePanel}>
        <p class="muted">That building is no longer on the map.</p>
      </Panel>
    );
  }
  const copy = COPY[p.kind];
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
      advisor={{ text: copy.advisor }}
      hero={<SiteArt kind={site.kind} />}
    >
      <div class="stack">
        {site.kind === 'bureau' ? <BureauBody site={site} /> : <AgencyBody site={site} />}
      </div>
    </Panel>
  );
}
