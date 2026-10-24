// The office footer on every HQ floor (SCREENS §10): which department sits on
// each floor of the building, its rent, and the two release actions, each with
// a confirm that spells out what happens (staff above the remaining desks let
// go with severance, fit-out written off, the deposit back for a whole office).
import { useState } from 'preact/hooks';
import { DEPARTMENTS } from '../../data/departments';
import * as cmd from '../../sim/commands';
import type { DeptId, Office } from '../../sim/state';
import { Card, Confirm, Row, SectionTitle } from '../components';
import { money } from '../format/format';
import { act, openPanel, useGame } from '../store';
import {
  floorToRelease,
  hqDepts,
  officeAddress,
  releaseFloorPreview,
  releaseOfficePreview,
  SEVERANCE_NOTE,
  usedFloors,
} from './officeSelectors';

export function OfficeCard(p: { office: Office; dept?: DeptId }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [ask, setAsk] = useState<'floor' | 'office' | null>(null);
  const o = p.office;
  const target = p.dept ? floorToRelease(s, o.id, p.dept) : null;
  const floorPreview = target ? releaseFloorPreview(s, target.officeId, target.floor) : null;
  const officePreview = releaseOfficePreview(s, o.id);
  const deptName = p.dept ? DEPARTMENTS[p.dept].name : '';

  const releaseFloor = () => {
    setAsk(null);
    if (!target || !p.dept) return;
    if (act(cmd.releaseFloor, target.officeId, target.floor).ok) {
      const left = hqDepts(s);
      openPanel({ type: 'hq', officeId: o.id, dept: left.includes(p.dept) ? p.dept : left[0] });
    }
  };
  const releaseOffice = () => {
    setAsk(null);
    if (act(cmd.releaseOffice, o.id).ok) openPanel({ type: 'hq' });
  };

  return (
    <section>
      <SectionTitle>Office</SectionTitle>
      <Card>
        <Row label="Address" value={officeAddress(s, o)} />
        <Row label="Floors in use" value={`${usedFloors(o)} of ${o.floors.length}`} />
        <Row label="Weekly rent" value={money(o.weeklyRent, sym)} />
        <ol class="hq-floor-list" aria-label="Floors">
          {o.floors.map((f, i) => (
            <li class={f ? '' : 'muted'}>
              <span>Floor {i + 1}</span>
              <span>{f ? DEPARTMENTS[f].name : 'Empty'}</span>
            </li>
          ))}
        </ol>
      </Card>
      <div class="grid-2 hq-release">
        {p.dept && (
          <button
            type="button"
            class="btn btn-secondary btn-block"
            disabled={!floorPreview}
            onClick={() => setAsk('floor')}
          >
            {p.dept === 'hr' ? 'Close HR floor' : 'Release floor'}
          </button>
        )}
        <button type="button" class="btn btn-secondary btn-block" onClick={() => setAsk('office')}>
          Release office
        </button>
      </div>

      {ask === 'floor' && floorPreview && (
        <Confirm
          title={`Release a ${deptName} floor?`}
          danger
          confirmLabel="Release floor"
          onCancel={() => setAsk(null)}
          onConfirm={releaseFloor}
          body={
            <ul class="hq-confirm-list">
              {floorPreview.closes && floorPreview.letGo === 0 ? (
                <li>{deptName} closes. Nobody is on staff yet.</li>
              ) : floorPreview.closes ? (
                <li>
                  {deptName} closes: all {floorPreview.letGo} staff leave with {SEVERANCE_NOTE} (
                  {money(floorPreview.severance, sym)}).
                </li>
              ) : floorPreview.letGo > 0 ? (
                <li>
                  {floorPreview.desksAfter} desks remain, so {floorPreview.letGo} staff leave with{' '}
                  {SEVERANCE_NOTE} ({money(floorPreview.severance, sym)}).
                </li>
              ) : (
                <li>{floorPreview.desksAfter} desks remain; nobody has to leave.</li>
              )}
              <li>The floor's fit-out is written off ({money(floorPreview.writeOff, sym)}).</li>
              {p.dept === 'hr' && floorPreview.closes && (
                <li>Benefits stay as they are, but you can't change them without an HR floor.</li>
              )}
            </ul>
          }
        />
      )}
      {ask === 'office' && officePreview && (
        <Confirm
          title="Release this office?"
          danger
          confirmLabel="Release office"
          onCancel={() => setAsk(null)}
          onConfirm={releaseOffice}
          body={
            <ul class="hq-confirm-list">
              <li>Every floor here is released and the rent stops.</li>
              {officePreview.letGo > 0 ? (
                <li>
                  {officePreview.letGo} staff leave with {SEVERANCE_NOTE} (
                  {money(officePreview.severance, sym)}).
                </li>
              ) : (
                <li>Nobody has to leave.</li>
              )}
              {officePreview.depts
                .filter((x) => x.closes)
                .map((x) => (
                  <li>{DEPARTMENTS[x.dept].name} closes.</li>
                ))}
              <li>Fit-out written off: {money(officePreview.writeOff, sym)}.</li>
              <li>Your deposit comes back: {money(officePreview.deposit, sym)}.</li>
            </ul>
          }
        />
      )}
    </section>
  );
}
