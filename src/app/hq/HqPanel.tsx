// HQ panel (SCREENS §10): header "{Bank} HQ" with the office's address and an
// office switcher when you lease more than one, the floor's lead as advisor,
// the engraved office interior, and bottom tabs for each department you have
// (in DEPT_ORDER) plus "+ Add floor". Every floor opens with the shared team
// controls and coverage; Finance, HR and IT have their own content, the other
// floors hold placeholders until their systems land. Without an office, it
// explains how to lease one.
import { useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { DEPARTMENTS } from '../../data/departments';
import * as cmd from '../../sim/commands';
import type { DeptId } from '../../sim/state';
import { Card, Medallion, Panel, type Tab } from '../components';
import { LayerMedallion } from '../map/LayerIcon';
import { act, closePanel, openPanel, useGame } from '../store';
import { AddFloorSheet } from './AddFloorSheet';
import { deptAdvisor } from './deptSelectors';
import { DeptStaffing } from './DeptStaffing';
import { FinanceFloor } from './FinanceFloor';
import { PlaceholderFloor } from './FloorPlaceholder';
import { HrFloor } from './HrFloor';
import { ItFloor } from './ItFloor';
import { OfficeCard } from './OfficeCard';
import { OfficeInterior } from './OfficeInterior';
import { ProductsFloor } from './ProductsFloor';
import { hqDepts, officeAddress, officeList, pickOffice, usedFloors } from './officeSelectors';
import './hq.css';

type TabId = DeptId | 'add';

/** Short tab labels (SCREENS §10 bottom tabs). */
const TAB_LABEL: Record<DeptId, string> = {
  finance: 'Finance',
  hr: 'HR',
  products: 'Products',
  treasury: 'Treasury',
  marketing: 'Marketing',
  it: 'IT',
  risk: 'Risk',
  executive: 'Executive',
  investment: 'Investment',
};

export function HqPanel(p: { officeId?: string; dept?: DeptId }) {
  const s = useGame();
  const [adding, setAdding] = useState(false);
  const office = pickOffice(s, p.officeId);
  if (!office) return <NoHq />;
  const offices = officeList(s);
  const depts = hqDepts(s);
  const dept = p.dept && depts.includes(p.dept) ? p.dept : depts[0];
  const tabs: Tab<TabId>[] = [
    ...depts.map((d) => ({ id: d, label: TAB_LABEL[d] })),
    { id: 'add', label: '+ Add floor' },
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
      icon={<Medallion ink={s.meta.brandInk} monogram={s.meta.monogram} size={32} />}
      onClose={closePanel}
      advisor={
        dept
          ? { name: `${DEPARTMENTS[dept].name} lead`, text: deptAdvisor(s, dept) }
          : { text: 'An empty building, ready for its first team.' }
      }
      hero={dept ? <OfficeInterior dept={dept} /> : undefined}
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
            <DeptStaffing dept={dept} />
            {dept === 'finance' && <FinanceFloor />}
            {dept === 'hr' && <HrFloor />}
            {dept === 'it' && <ItFloor />}
            {dept === 'products' && <ProductsFloor />}
            {dept !== 'finance' && dept !== 'hr' && dept !== 'it' && dept !== 'products' && (
              <PlaceholderFloor dept={dept} />
            )}
          </>
        ) : (
          <Card>
            <p class="hq-empty">No floors are fitted out yet.</p>
            <button type="button" class="btn btn-primary btn-block" onClick={() => setAdding(true)}>
              Add a floor
            </button>
          </Card>
        )}
        <OfficeCard office={office} dept={dept} />
      </div>
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
      advisor={{ text: 'Every growing bank needs a head office. Let’s find one.' }}
    >
      <div class="stack">
        <Card>
          <p class="hq-empty">
            Lease an office building from the map to open your HQ. Office buildings show with the
            Offices layer; tap one to see its floors, desks and rent.
          </p>
          <p class="muted small">
            Each floor holds one department. With two branches or fewer nothing is required yet, but
            Finance, HR and the other teams keep a growing bank running.
          </p>
        </Card>
        <button type="button" class="btn btn-primary btn-block" onClick={showOffices}>
          Show offices on the map
        </button>
      </div>
    </Panel>
  );
}
