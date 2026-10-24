// Branches list (SCREENS §25): every branch with its rating, deposits, loans,
// weekly income and issues, sortable and filterable by city (chips that scroll
// sideways). Across countries, rows are grouped under each country and every
// city carries its country code. Tap a row to open it, from any city.
import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import { Badge, Card, Chips, CoinRating, Panel, SectionTitle, Segmented } from '../components';
import { money } from '../format/format';
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
      title="Branches"
      subtitle={all.length === 1 ? '1 branch' : `${all.length} branches`}
      onClose={closePanel}
    >
      {all.length === 0 ? (
        <Card>
          <p class="branches-empty">
            You have no branches yet. Pick a storefront on the city list, build it out and your
            first branch will appear here.
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
            <Segmented label="Sort branches" value={sort} onChange={choose} options={sortOptions} />
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
          {rows.length === 0 && <p class="muted">No branches in this city.</p>}
        </div>
      )}
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

function Stat(p: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div class="branch-stat">
      <span class={`branch-stat-value${p.tone ? ` tone-${p.tone}` : ''}`}>{p.value}</span>
      <span class="branch-stat-label">{p.label}</span>
    </div>
  );
}
