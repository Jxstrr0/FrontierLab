// Branches list (SCREENS §25): every branch with its rating, deposits, loans,
// weekly income and issues, sortable and filterable by city (chips that scroll
// sideways). Across countries, rows are grouped under each country and every
// city carries its country code. Tap a row to open it, from any city.
// Data centers (C2c) are listed underneath.
import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import { Badge, Card, Chips, CoinRating, Panel, SectionTitle, Segmented } from '../components';
import { count, money } from '../format/format';
import { usableGpus } from '../../sim/dataCenters';
import { closePanel, openPanel, useGame } from '../store';
import {
  branchRows,
  countryOrder,
  filterCities,
  groupByCountry,
  sortRows,
  type BranchRow,
  type SortKey,
} from './branchRows';
import './company.css';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'rating', label: 'Rating' },
  { value: 'deposits', label: 'Deposits' },
  { value: 'loans', label: 'Loans' },
  { value: 'income', label: 'Income' },
];

export function BranchesPanel() {
  const s = useGame();
  const sym = s.settings.currency;
  const [sort, setSort] = useState<SortKey>('name');
  const [flip, setFlip] = useState(false);
  const [city, setCity] = useState<string>('all');

  const all = branchRows(s);
  const cityIds = filterCities(s, all);
  const order = countryOrder(s, all);
  const abroad = order.length > 1;
  const rows = sortRows(city === 'all' ? all : all.filter((r) => r.cityId === city), sort, flip);
  const groups =
    abroad && city === 'all'
      ? groupByCountry(order, rows).filter((g) => g.rows.length > 0)
      : [{ country: null, rows }];
  const cityLabel = (id: string) => {
    const name = CITIES[id]?.name ?? id;
    return abroad ? `${name}, ${CITIES[id]?.country ?? ''}` : name;
  };

  // Tapping the active sort flips its direction; tapping another starts fresh.
  const choose = (key: SortKey) => {
    setFlip(key === sort ? !flip : false);
    setSort(key);
  };
  // Names run A to Z by default (↑); figures run high to low (↓).
  const arrow = (sort === 'name') !== flip ? ' ↑' : ' ↓';
  const sortOptions = SORTS.map((o) => ({
    ...o,
    label: o.value === sort ? `${o.label}${arrow}` : o.label,
  }));

  return (
    <Panel
      title="Sales offices"
      subtitle={all.length === 1 ? '1 sales office' : `${all.length} sales offices`}
      onClose={closePanel}
    >
      {all.length === 0 ? (
        <Card>
          <p class="branches-empty">
            You have no sales offices yet. Pick a storefront on the city list, build it out and your
            first sales office will appear here.
          </p>
        </Card>
      ) : (
        <div class="stack co-stack">
          {cityIds.length > 1 && (
            <Chips
              label="Filter by city"
              value={city}
              onChange={setCity}
              options={[
                { value: 'all', label: 'All cities' },
                ...cityIds.map((id) => ({
                  value: id,
                  label: CITIES[id]?.name ?? id,
                  hint: abroad ? CITIES[id]?.country : undefined,
                })),
              ]}
            />
          )}
          <div class="sort-seg">
            <Segmented
              label="Sort sales offices"
              value={sort}
              onChange={choose}
              options={sortOptions}
            />
          </div>
          {groups.map((g) => (
            <Fragment key={g.country ?? 'all'}>
              {g.country && (
                <SectionTitle>
                  {COUNTRIES[g.country].name} · {g.rows.length}
                </SectionTitle>
              )}
              {g.rows.map((r) => (
                <BranchCard key={r.id} r={r} city={cityLabel(r.cityId)} sym={sym} />
              ))}
            </Fragment>
          ))}
          {rows.length === 0 && <p class="muted">No sales offices in this city.</p>}
        </div>
      )}
      <DataCenterList />
    </Panel>
  );
}

function BranchCard(p: { r: BranchRow; city: string; sym: string }) {
  const { r, sym } = p;
  return (
    <Card class="branch-row" onClick={() => openPanel({ type: 'branch', branchId: r.id })}>
      <div class="branch-row-head">
        <span class="branch-row-name">{r.name}</span>
        <CoinRating value={r.rating} size={14} />
      </div>
      <div class="branch-row-city muted small">{p.city}</div>
      <div class="branch-row-stats">
        <Stat label="Deposits" value={money(r.deposits, sym)} />
        <Stat label="Loans" value={money(r.loans, sym)} />
        <Stat
          label="Income a week"
          value={`${r.income < 0 ? '−' : ''}${money(Math.abs(r.income), sym)}`}
          tone={r.income > 0 ? 'good' : r.income < 0 ? 'bad' : undefined}
        />
      </div>
      <div class="branch-row-issues">
        {r.issues.length === 0 ? (
          <Badge tone="good">No issues</Badge>
        ) : (
          r.issues.map((i) => (
            <Badge key={i.text} tone={i.tone}>
              {i.text}
            </Badge>
          ))
        )}
      </div>
    </Card>
  );
}

/** Your data centers (C2c), wherever they are: energy sites have no storefront on the city list. */
function DataCenterList() {
  const s = useGame();
  const dcs = Object.values(s.dataCenters);
  if (dcs.length === 0) return null;
  return (
    <div class="stack co-stack">
      <SectionTitle>Data centers · {dcs.length}</SectionTitle>
      {dcs.map((dc) => (
        <Card
          key={dc.id}
          class="branch-row"
          onClick={() => openPanel({ type: 'dataCenter', dataCenterId: dc.id })}
        >
          <div class="branch-row-head">
            <span class="branch-row-name">{dc.name}</span>
            <Badge tone={dc.status === 'open' ? 'good' : 'warn'}>
              {dc.status === 'open' ? `${count(usableGpus(dc.build))} GPUs` : 'Fit-out'}
            </Badge>
          </div>
          <div class="branch-row-city muted small">{CITIES[dc.cityId]?.name ?? dc.cityId}</div>
        </Card>
      ))}
    </div>
  );
}

function Stat(p: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div class="branch-stat">
      <span class={`branch-stat-value${p.tone ? ` tone-${p.tone}` : ''}`}>{p.value}</span>
      <span class="branch-stat-label">{p.label}</span>
    </div>
  );
}
