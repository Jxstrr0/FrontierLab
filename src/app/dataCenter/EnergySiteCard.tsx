// The energy site section of a regional employer's panel (SCREENS §5b): the
// data centers you run here and a Build data center button.
import { DATA_CENTER } from '../../config/balance';
import { DEFAULT_DC_BUILD } from '../../data/dataCenters';
import * as cmd from '../../sim/commands';
import { Card, Row, SectionTitle } from '../components';
import { openPanel, useGame } from '../store';

export function EnergySiteCard(p: { siteId: string }) {
  const s = useGame();
  const here = cmd.dataCentersAtSite(s, p.siteId);
  const blocker = cmd.dataCenterBlocker(s, { siteId: p.siteId }, DEFAULT_DC_BUILD);
  return (
    <>
      <SectionTitle>Energy site</SectionTitle>
      <p class="muted small">
        Power here costs half the city rate. Room for {DATA_CENTER.perEnergySite} data centers.
      </p>
      {here.map((dc) => (
        <Card onClick={() => openPanel({ type: 'dataCenter', dataCenterId: dc.id })}>
          <Row label={dc.name} value={dc.status === 'open' ? 'Online' : 'Fit-out'} />
        </Card>
      ))}
      {blocker && <p class="muted small">{blocker}</p>}
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={!!blocker}
        onClick={() => openPanel({ type: 'buildDataCenter', siteId: p.siteId })}
      >
        Build data center
      </button>
    </>
  );
}
