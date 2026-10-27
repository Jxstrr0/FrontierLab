// Data center panel (SCREENS §5b): the engraved hall outside and in (C8c),
// status, the compute pool (C4a), the three parts with an Upgrade button each,
// weekly costs, which cities get faster service, and Close.
import { useState } from 'preact/hooks';
import { DATA_CENTER } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { DC_PARTS, DC_SLOTS, DC_SLOT_NAMES, dcPartsFor, type DcSlot } from '../../data/dataCenters';
import * as cmd from '../../sim/commands';
import { dataCenterPowerBill, hallGpus, pueOf, runningGpus } from '../../sim/dataCenters';
import { Badge, Card, Confirm, Panel, Row, SectionTitle } from '../components';
import { count, money, moneyFull } from '../format/format';
import { act, closePanel, toast, useGame } from '../store';
import { ComputeCard } from '../company/ComputeCard';
import { DataCenterHero } from './DataCenterHero';
import { DcPartSheet } from './DcPartSheet';
import { partFact } from './dcView';
import '../build/build.css';
import './dataCenter.css';

export function DataCenterPanel(p: { dataCenterId: string }) {
  const s = useGame();
  const [picking, setPicking] = useState<DcSlot | null>(null);
  const [closing, setClosing] = useState(false);
  const dc = s.dataCenters[p.dataCenterId];
  if (!dc) {
    return (
      <Panel title="Data center" onClose={closePanel}>
        <p class="muted">That data center has closed.</p>
      </Panel>
    );
  }
  const sym = s.settings.currency;
  const city = CITIES[dc.cityId]?.name ?? '';
  const place = dc.lotId
    ? s.world.lots[dc.lotId]?.address
    : (s.world.sites[dc.siteId ?? '']?.employer?.name ?? 'Energy site');
  const open = dc.status === 'open';
  const quote = cmd.closeDataCenterQuote(s, dc.id)!;
  const advice = open
    ? `${count(runningGpus(s, dc))} GPUs are running. They serve your customers before any compute is bought at spot. Your sales office in ${city} gets a Service lift, and offices within ${count(DATA_CENTER.nearKm)} km get a smaller one.`
    : `Fit-out has ${dc.weeksLeft} week${dc.weeksLeft === 1 ? '' : 's'} to go. It pays rent meanwhile but no power.`;

  return (
    <>
      <Panel
        title={dc.name}
        subtitle={`${place} · ${city}`}
        onClose={closePanel}
        advisor={{ text: advice }}
        hero={
          <DataCenterHero
            build={dc.build}
            gpus={hallGpus(dc.build)}
            running={runningGpus(s, dc)}
            brandInk={s.meta.brandInk}
            monogram={s.meta.monogram}
            logoShape={s.meta.logoShape}
            energySite={!!dc.siteId}
            fitout={!open}
            ink={CITIES[dc.cityId]?.ink}
          />
        }
      >
        <div class="stack">
          <Card>
            <Row
              label="Status"
              value={
                <Badge tone={open ? 'good' : 'warn'}>
                  {open ? 'Online' : `Fit-out, ${dc.weeksLeft} wk left`}
                </Badge>
              }
            />
            <Row label="GPUs in the hall" value={count(hallGpus(dc.build))} />
            <Row
              label="GPUs running"
              value={count(runningGpus(s, dc))}
              tone={runningGpus(s, dc) < hallGpus(dc.build) ? 'bad' : undefined}
            />
            <Row label="PUE" value={pueOf(dc.build).toFixed(2)} />
          </Card>

          <ComputeCard />

          <SectionTitle>Parts</SectionTitle>
          {DC_SLOTS.map((slot) => {
            const part = DC_PARTS[dc.build[slot]];
            const top = dcPartsFor(slot).every((x) => x.cost <= (part?.cost ?? 0));
            const locked = top || (slot === 'hall' && !open);
            return (
              <button
                type="button"
                class="part-tile"
                disabled={locked}
                onClick={() => setPicking(slot)}
              >
                <span class="part-tile-main">
                  <span class="muted small">{DC_SLOT_NAMES[slot]}</span>
                  <span class="part-tile-name">{part?.name}</span>
                  <span class="small">{partFact(part)}</span>
                </span>
                <span class="part-tile-price">{top ? 'Best fitted' : 'Upgrade'}</span>
              </button>
            );
          })}
          <p class="muted small">
            Power and cooling swap in at once. A bigger hall takes the data center offline for half
            its fit-out.
          </p>

          <SectionTitle>Weekly costs</SectionTitle>
          <Card>
            <Row label="Rent" value={moneyFull(dc.lease.weeklyRent, sym)} />
            <Row
              label="Power"
              value={open ? moneyFull(dataCenterPowerBill(s, dc), sym) : 'None during fit-out'}
            />
          </Card>

          <button type="button" class="btn btn-danger btn-block" onClick={() => setClosing(true)}>
            Close data center
          </button>
        </div>
      </Panel>
      {picking && (
        <DcPartSheet
          slot={picking}
          current={dc.build[picking]}
          sym={sym}
          price={(id) => cmd.partPrice(s, id, dc.cityId)}
          allowed={(id) => !cmd.dcUpgradeBlocker(s, dc.id, picking, id)}
          onSelect={(id) => {
            const slot = picking;
            setPicking(null);
            if (act(cmd.upgradeDataCenter, dc.id, slot, id).ok) {
              toast(
                slot === 'hall'
                  ? `Refit started: back online in ${s.dataCenters[dc.id]?.weeksLeft ?? 0} weeks`
                  : `${DC_PARTS[id]?.name} fitted`,
                'good',
              );
            }
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {closing && (
        <Confirm
          title={`Close ${dc.name}?`}
          confirmLabel="Close data center"
          danger
          body={
            <div class="stack">
              <div>
                <Row label="Equipment sold" value={money(quote.recovery, sym)} />
                {dc.lease.deposit > 0 && (
                  <Row
                    label="Lease deposit back"
                    value={money(dc.lease.deposit - quote.forfeit, sym)}
                  />
                )}
                <Row label="Cash back" value={money(quote.cashBack, sym)} strong />
              </div>
              <p class="small">
                The rest of the equipment's value is written off. This cannot be undone.
              </p>
            </div>
          }
          onCancel={() => setClosing(false)}
          onConfirm={() => {
            setClosing(false);
            const name = dc.name;
            if (act(cmd.closeDataCenter, dc.id).ok) {
              closePanel();
              toast(`${name} is closed. ${money(quote.cashBack, sym)} came back.`);
            }
          }}
        />
      )}
    </>
  );
}
