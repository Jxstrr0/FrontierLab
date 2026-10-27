// HQ panel (SCREENS §10): header "{Bank} HQ" with the office's address, an
// Office button (floors, rent and the release actions in a sheet) and an
// office switcher when you lease more than one, the floor's lead as advisor,
// the engraved office interior, and a bottom icon bar with each department you
// have (in the order you arrange in the Office sheet) plus "Add floor". Every floor opens with the shared team
// controls and coverage (the Executive suite hires on the floor itself), then
// that department's own content. Without an office, it explains how to lease
// one.
import { useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { DEPARTMENTS } from '../../data/departments';
import * as cmd from '../../sim/commands';
import type { DeptId } from '../../sim/state';
import { Card, Icon, Medallion, Panel, type Tab } from '../components';
import { LayerMedallion } from '../map/LayerIcon';
import { act, closePanel, openPanel, useGame } from '../store';
import { AddFloorSheet } from './AddFloorSheet';
import { deptAdvisor } from './deptSelectors';
import { DeptStaffing } from './DeptStaffing';
import { FinanceFloor } from './FinanceFloor';
import { ExecutiveFloor } from '../executive/ExecutiveFloor';
import { InvestmentFloor } from '../investment/InvestmentFloor';
import { HrFloor } from './HrFloor';
import { ItFloor } from './ItFloor';
import { MarketingFloor } from './MarketingFloor';
import { OfficeSheet } from './OfficeSheet';
import { OfficeInterior } from './OfficeInterior';
import { ProductsFloor } from './ProductsFloor';
import { RiskFloor } from './RiskFloor';
import { TreasuryFloor } from './TreasuryFloor';
import { hqDepts, officeAddress, officeList, pickOffice, usedFloors } from './officeSelectors';
import { TAB_ICON, TAB_LABEL } from './tabIcons';
import './hq.css';

type TabId = DeptId | 'add';

export function HqPanel(p: { officeId?: string; dept?: DeptId }) {
  const s = useGame();
  const [adding, setAdding] = useState(false);
  const [officeOpen, setOfficeOpen] = useState(false);
  const office = pickOffice(s, p.officeId);
  if (!office) return <NoHq />;
  const offices = officeList(s);
  const depts = hqDepts(s);
  const dept = p.dept && depts.includes(p.dept) ? p.dept : depts[0];
  const tabs: Tab<TabId>[] = [
    ...depts.map((d) => ({ id: d, label: TAB_LABEL[d], icon: TAB_ICON[d] })),
    { id: 'add', label: 'Add floor', icon: 'plus' },
  ];
  const onTab = (t: TabId) => {
    if (t === 'add') setAdding(true);
    else openPanel({ type: 'hq', officeId: office.id, dept: t });
  };
  const city = CITIES[office.cityId]?.name;

  return (
    <Panel
      title={`${s.meta.bankName} HQ`}
      subtitle={[officeAddress(s, office), city].filter(Boolean).join(' · ')}
      icon={
        <Medallion
          ink={s.meta.brandInk}
          monogram={s.meta.monogram}
          shape={s.meta.logoShape}
          size={32}
        />
      }
      actions={
        <button type="button" class="hq-office-btn" onClick={() => setOfficeOpen(true)}>
          <Icon name="office" size={18} />
          Office
        </button>
      }
      onClose={closePanel}
      advisor={
        dept
          ? {
              name: dept === 'executive' ? 'Chief of staff' : `${DEPARTMENTS[dept].name} lead`,
              text: deptAdvisor(s, dept),
            }
          : { text: 'An empty building, ready for its first team.' }
      }
      hero={<OfficeInterior dept={dept} />}
      tabs={dept ? tabs : undefined}
      tab={dept}
      onTab={onTab}
    >
      <div class="stack hq-root">
        {offices.length > 1 && (
          <div class="hq-switcher" role="radiogroup" aria-label="Office">
            {offices.map((o, i) => (
              <button
                type="button"
                role="radio"
                aria-checked={o.id === office.id}
                class={`hq-switch${o.id === office.id ? ' is-active' : ''}`}
                onClick={() => openPanel({ type: 'hq', officeId: o.id, dept })}
              >
                <span class="hq-switch-name">Office {i + 1}</span>
                <span class="small">
                  {officeAddress(s, o)} · {usedFloors(o)}/{o.floors.length} floors
                </span>
              </button>
            ))}
          </div>
        )}
        {dept ? (
          <>
            {/* The Executive suite's desks are you and six executives, hired on the floor itself. */}
            {dept !== 'executive' && <DeptStaffing dept={dept} />}
            {dept === 'finance' && <FinanceFloor />}
            {dept === 'hr' && <HrFloor />}
            {dept === 'it' && <ItFloor />}
            {dept === 'products' && <ProductsFloor />}
            {dept === 'treasury' && <TreasuryFloor />}
            {dept === 'marketing' && <MarketingFloor />}
            {dept === 'risk' && <RiskFloor />}
            {dept === 'executive' && <ExecutiveFloor />}
            {dept === 'investment' && <InvestmentFloor />}
          </>
        ) : (
          <Card>
            <p class="hq-empty">No floors are fitted out yet.</p>
            <button type="button" class="btn btn-primary btn-block" onClick={() => setAdding(true)}>
              Add a floor
            </button>
          </Card>
        )}
      </div>
      {officeOpen && (
        <OfficeSheet office={office} dept={dept} onClose={() => setOfficeOpen(false)} />
      )}
      {adding && <AddFloorSheet office={office} onClose={() => setAdding(false)} />}
    </Panel>
  );
}

/** No office yet: how to get one (Menu → HQ before leasing). */
function NoHq() {
  const s = useGame();
  const showOffices = () => {
    act(cmd.setSettings, { layers: { ...s.settings.layers, offices: true } });
    closePanel();
  };
  return (
    <Panel
      title={`${s.meta.bankName} HQ`}
      subtitle="No head office yet"
      icon={<LayerMedallion id="offices" size={32} />}
      onClose={closePanel}
      advisor={{ text: 'Every growing lab needs a head office. Let’s find one.' }}
    >
      <div class="stack">
        <Card>
          <p class="hq-empty">
            Lease an office building from the map to open your HQ. Office buildings show with the
            Offices layer; tap one to see its floors, desks and rent.
          </p>
          <p class="muted small">
            Each floor holds one department. With two sales offices or fewer nothing is required
            yet, but Finance, HR and the other teams keep a growing lab running.
          </p>
        </Card>
        <button type="button" class="btn btn-primary btn-block" onClick={showOffices}>
          Show offices on the map
        </button>
      </div>
    </Panel>
  );
}
