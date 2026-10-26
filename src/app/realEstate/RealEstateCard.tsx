// The Company panel's Real estate section (SCREENS §16, §24): the bank's
// buildings with value and weekly net (tap to open one), and foreclosed homes
// per city with units, value, weekly carrying cost and Rent / Sell all
// (Sell all asks for confirmation; once started it can't be called off).
import { useState } from 'preact/hooks';
import { REO } from '../../config/balance';
import * as cmd from '../../sim/commands';
import type { ReoPool } from '../../sim/state';
import { Badge, Card, Confirm, Row, SectionTitle, Segmented } from '../components';
import { count, money } from '../format/format';
import { act, openPanel, toast, useGame } from '../store';
import { ownedBuildings, reoRows, type ReoRow } from './realEstateView';
import './realEstate.css';

type Mode = ReoPool['mode'];

export function RealEstateCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const buildings = ownedBuildings(s, 'company');
  const reo = reoRows(s);
  return (
    <div class="stack re-company">
      <SectionTitle>Real estate</SectionTitle>
      {buildings.length === 0 ? (
        <Card>
          <p class="muted small re-note">
            The lab owns no buildings yet. Buildings for sale show on the map under Real Estate.
          </p>
        </Card>
      ) : (
        buildings.map((b) => (
          <Card key={b.siteId} onClick={() => openPanel({ type: 'property', siteId: b.siteId })}>
            <div class="re-row-head">
              <span class="re-row-name">{b.address}</span>
              {b.forSale && <Badge tone="warn">Selling</Badge>}
            </div>
            <Row label={b.city} value={money(b.value, sym)} />
            <Row
              label="Weekly net rent"
              value={money(b.net, sym)}
              tone={b.net >= 0 ? 'good' : 'bad'}
            />
          </Card>
        ))
      )}
      <h4 class="re-sub">Foreclosed homes</h4>
      {reo.length === 0 ? (
        <Card>
          <p class="muted small re-note">
            None. Homes repossessed from defaulted mortgages collect here, city by city.
          </p>
        </Card>
      ) : (
        reo.map((r) => <ReoCard key={r.cityId} row={r} sym={sym} />)
      )}
    </div>
  );
}

function ReoCard({ row, sym }: { row: ReoRow; sym: string }) {
  const [confirm, setConfirm] = useState(false);
  const set = (mode: Mode) => {
    if (mode === 'selling') setConfirm(true);
    else act(cmd.setReoMode, row.cityId, mode);
  };
  const sellAll = () => {
    setConfirm(false);
    const r = act(cmd.setReoMode, row.cityId, 'selling');
    if (r.ok) toast(`Selling the foreclosed homes in ${row.city}.`, 'good');
  };
  const { pool } = row;
  return (
    <Card>
      <div class="re-row-head">
        <span class="re-row-name">{row.city}</span>
        <span class="small muted">{count(row.units)} homes</span>
      </div>
      <Row label="Value" value={money(pool.value, sym)} />
      {pool.mode !== 'selling' && (
        <Row label="Weekly carrying cost" value={money(-row.carrying, sym)} tone="bad" />
      )}
      {pool.mode === 'rent' && (
        <Row label="Weekly rent income" value={money(row.rent, sym)} tone="good" />
      )}
      {pool.mode === 'selling' ? (
        <p class="small re-note">
          <Badge tone="warn">Selling</Badge> Settles in{' '}
          {row.sellsIn === 1 ? '1 week' : `${row.sellsIn} weeks`} for about{' '}
          {money(pool.value * REO.sellPrice, sym)}.
        </p>
      ) : (
        <Segmented
          label={`Foreclosed homes in ${row.city}`}
          options={[
            { value: 'rent', label: 'Rent' },
            { value: 'selling', label: 'Sell all' },
          ]}
          value={pool.mode}
          onChange={set}
        />
      )}
      {confirm && (
        <Confirm
          title={`Sell all homes in ${row.city}?`}
          body={
            <p>
              {count(row.units)} foreclosed homes sell in one lot for about{' '}
              {money(pool.value * REO.sellPrice, sym)}, {Math.round((1 - REO.sellPrice) * 100)}%
              under their value, within {REO.sellWeeks[0]}–{REO.sellWeeks[1]} weeks. The sale can't
              be called off once it starts.
            </p>
          }
          confirmLabel="Sell all"
          danger
          onConfirm={sellAll}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Card>
  );
}
