// Build data center (SCREENS §5b): pick a GPU hall, a power feed and cooling,
// see the itemized cost and the weekly running costs, then build. Opened from a
// free storefront or a regional energy site.
import { useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import {
  DC_PARTS,
  DC_SLOTS,
  DC_SLOT_NAMES,
  DEFAULT_DC_BUILD,
  type DcBuild,
  type DcSlot,
} from '../../data/dataCenters';
import * as cmd from '../../sim/commands';
import { dealPowerMult, powerBill, usableGpus } from '../../sim/dataCenters';
import { Card, Panel, Row, SectionTitle } from '../components';
import { count, moneyFull } from '../format/format';
import { act, closePanel, openPanel, toast, useGame } from '../store';
import { DcPartSheet } from './DcPartSheet';
import { partFact } from './dcView';
import '../build/build.css';
import './dataCenter.css';

export function BuildDataCenterPanel(p: { lotId?: string; siteId?: string }) {
  const s = useGame();
  const [build, setBuild] = useState<DcBuild>({ ...DEFAULT_DC_BUILD });
  const [picking, setPicking] = useState<DcSlot | null>(null);
  const sym = s.settings.currency;
  const where: cmd.DcWhere = p.lotId ? { lotId: p.lotId } : { siteId: p.siteId ?? '' };
  const lot = p.lotId ? s.world.lots[p.lotId] : undefined;
  const site = p.siteId ? s.world.sites[p.siteId] : undefined;
  const cityId = lot?.cityId ?? site?.cityId;

  if (!cityId) {
    return (
      <Panel title="Build data center" onClose={closePanel}>
        <p class="muted">That site no longer exists.</p>
      </Panel>
    );
  }

  const quote = cmd.dataCenterQuote(s, where, build);
  const blocker = cmd.dataCenterBlocker(s, where, build);
  const short = s.company.cash < quote.total;
  const place = lot?.address ?? site?.employer?.name ?? site?.address ?? '';
  const energy = !!site;

  const doBuild = () => {
    const r = act(cmd.buildDataCenter, { where, build });
    if (!r.ok) return;
    toast(`Fit-out started: online in ${quote.weeks} weeks`, 'good');
    openPanel({ type: 'dataCenter', dataCenterId: r.dataCenterId });
  };

  return (
    <>
      <Panel
        title="Build data center"
        subtitle={`${place} · ${CITIES[cityId]?.name ?? ''}`}
        onClose={closePanel}
        advisor={{
          text: energy
            ? 'Power out here costs half what it does in town. Offices within reach still get faster answers.'
            : 'A data center in town makes your sales office here quicker for customers, and helps nearby cities a little.',
        }}
        footer={
          <div class="stack">
            {blocker && <p class="build-blocker small">{blocker}</p>}
            <button
              type="button"
              class="btn btn-primary btn-block"
              disabled={!!blocker}
              onClick={doBuild}
            >
              Build for {moneyFull(quote.total, sym)}
            </button>
          </div>
        }
      >
        <div class="stack">
          <SectionTitle>Parts</SectionTitle>
          {DC_SLOTS.map((slot) => {
            const part = DC_PARTS[build[slot]];
            return (
              <button type="button" class="part-tile" onClick={() => setPicking(slot)}>
                <span class="part-tile-main">
                  <span class="muted small">{DC_SLOT_NAMES[slot]}</span>
                  <span class="part-tile-name">{part?.name}</span>
                  <span class="small">{partFact(part)}</span>
                </span>
                <span class="part-tile-price">
                  {moneyFull(cmd.partPrice(s, build[slot], cityId), sym)}
                </span>
              </button>
            );
          })}

          <SectionTitle>Running it</SectionTitle>
          <Card>
            <Row label="GPUs running" value={count(usableGpus(build))} />
            <Row
              label="Power bill"
              value={`${moneyFull(powerBill(build, cityId) * dealPowerMult(s, cityId), sym)} /week`}
            />
            <Row label="Rent" value={`${moneyFull(quote.rent, sym)} /week`} />
            <Row label="Fit-out" value={`${quote.weeks} weeks`} />
          </Card>
          {usableGpus(build) < (DC_PARTS[build.hall]?.gpus ?? 0) && (
            <p class="muted small">
              The power feed can't run the whole hall. Pick a bigger feed to use every GPU.
            </p>
          )}

          <SectionTitle>Summary</SectionTitle>
          <Card>
            <Row label="Parts" value={moneyFull(quote.parts, sym)} />
            {quote.deposit > 0 && (
              <Row label="Lease deposit" value={moneyFull(quote.deposit, sym)} />
            )}
            <Row label="First week's rent" value={moneyFull(quote.rent, sym)} />
            <Row label="Total" value={moneyFull(quote.total, sym)} strong />
            <Row
              label="Cash available"
              value={moneyFull(s.company.cash, sym)}
              tone={short ? 'bad' : 'good'}
            />
          </Card>
        </div>
      </Panel>
      {picking && (
        <DcPartSheet
          slot={picking}
          current={build[picking]}
          sym={sym}
          price={(id) => cmd.partPrice(s, id, cityId)}
          onSelect={(id) => {
            setBuild({ ...build, [picking]: id });
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  );
}
