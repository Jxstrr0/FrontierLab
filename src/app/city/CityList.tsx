// The city as a list: districts as collapsible sections, each listing its
// storefronts with who is in them. The Stage 2 city view; with the Stage 3 map
// it stays as the accessible "List view" (Layers sheet → List view).
import { useMemo, useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { DISTRICT_SPECS } from '../../data/districts';
import { DISTRICTS, type DistrictId } from '../../data/types';
import type { GameState, Lot } from '../../sim/state';
import { Badge, Medallion, Segmented } from '../components';
import { count, money } from '../format/format';
import { openPanel, useGame } from '../store';
import { average, cityLots } from './lotInfo';
import { RivalSheet } from './RivalSheet';
import './city.css';

type Filter = 'all' | 'lease';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'lease', label: 'Available only' },
];

const naturalOrder = new Intl.Collator('en', { numeric: true });

/** `hideTitle`: inside a panel that already shows the city name. */
export function CityList(p: { hideTitle?: boolean } = {}) {
  const s = useGame();
  const [filter, setFilter] = useState<Filter>('all');
  const [collapsed, setCollapsed] = useState<Set<DistrictId>>(new Set());
  const [rivalLotId, setRivalLotId] = useState<string | null>(null);
  const sym = s.settings.currency;
  const city = CITIES[s.world.currentCityId];

  // Lot objects live for the whole game (only their occupant changes), so group once per city.
  const lots = useMemo(() => cityLots(s), [s.world.lots, s.world.currentCityId]);
  const groups = useMemo(() => groupByDistrict(lots), [lots]);

  const free = lots.filter((l) => !l.occupant).length;
  const mine = lots.filter((l) => l.occupant?.type === 'player').length;
  const rivals = lots.length - free - mine;

  // Applications waiting at each branch (brass dot).
  const pending = pendingByBranch(s);

  const toggle = (id: DistrictId) => {
    const next = new Set(collapsed);
    if (!next.delete(id)) next.add(id);
    setCollapsed(next);
  };

  return (
    <div class="city-list">
      <header class="city-head">
        {!p.hideTitle && <h1 class="city-title">{city?.name ?? 'Your city'}</h1>}
        <p class="muted small">
          {count(lots.length)} storefronts: {count(free)} available, {count(mine)} yours,{' '}
          {count(rivals)} rivals
        </p>
        <Segmented label="Show storefronts" options={FILTERS} value={filter} onChange={setFilter} />
      </header>

      {groups.map(({ id, lots: group }) => {
        const shown = filter === 'lease' ? group.filter((l) => !l.occupant) : group;
        if (shown.length === 0) return null;
        const open = !collapsed.has(id);
        const freeHere = group.filter((l) => !l.occupant).length;
        return (
          <section class="district" key={id}>
            <button
              type="button"
              class="district-head"
              aria-expanded={open}
              onClick={() => toggle(id)}
            >
              <span class="district-caret" aria-hidden="true">
                {open ? '▾' : '▸'}
              </span>
              <span class="district-titles">
                <span class="district-name">{DISTRICT_SPECS[id]?.name ?? id}</span>
                <span class="muted small">
                  {freeHere} free of {group.length} ·{' '}
                  {money(average(group.map((l) => l.weeklyRent)), sym)}/wk ·{' '}
                  {count(average(group.map((l) => l.footTraffic)))} traffic
                </span>
              </span>
            </button>
            {open && (
              <ul class="lot-list">
                {shown.map((lot) => (
                  <li key={lot.id}>
                    <LotRow
                      s={s}
                      lot={lot}
                      sym={sym}
                      pending={pending}
                      onRival={() => setRivalLotId(lot.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {rivalLotId && <RivalSheet s={s} lotId={rivalLotId} onClose={() => setRivalLotId(null)} />}
    </div>
  );
}

function LotRow(p: {
  s: GameState;
  lot: Lot;
  sym: string;
  pending: Record<string, number>;
  onRival: () => void;
}) {
  const { s, lot, sym } = p;
  const facts = `${money(lot.weeklyRent, sym)}/wk · ${count(lot.footTraffic)} foot traffic`;
  const occ = lot.occupant;

  if (occ?.type === 'player') {
    const branch = s.branches[occ.id];
    const waiting = p.pending[occ.id] ?? 0;
    return (
      <button
        type="button"
        class="lot-row"
        onClick={() => openPanel({ type: 'branch', branchId: occ.id })}
        data-tutorial="my-branch"
        data-lot-id={lot.id}
      >
        <Medallion ink={s.meta.brandInk} monogram={s.meta.monogram} size={32} />
        <span class="lot-main">
          <span class="lot-address">{lot.address}</span>
          <span class="lot-occupant">{branch?.name ?? 'Your branch'}</span>
          <span class="muted small">{facts}</span>
        </span>
        <span class="lot-tag">
          {waiting > 0 && <span class="dot" aria-label="Loan applications waiting" />}
          <Badge tone={branch?.status === 'open' ? 'good' : 'warn'}>
            {branch?.status === 'fitout'
              ? 'Building'
              : branch?.status === 'open'
                ? 'Open'
                : 'Closed'}
          </Badge>
        </span>
      </button>
    );
  }

  if (occ?.type === 'rival') {
    const bank = s.rivals[occ.id];
    return (
      <button type="button" class="lot-row" onClick={p.onRival}>
        <Medallion ink={bank?.ink ?? '#888'} monogram={bank?.monogram ?? '?'} size={32} ring />
        <span class="lot-main">
          <span class="lot-address">{lot.address}</span>
          <span class="lot-occupant lot-rival">{bank?.name ?? 'Rival bank'}</span>
          <span class="muted small">{facts}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      class="lot-row"
      onClick={() => openPanel({ type: 'storefront', lotId: lot.id })}
      data-tutorial="open-lot"
    >
      <span class="lot-empty" aria-hidden="true" />
      <span class="lot-main">
        <span class="lot-address">{lot.address}</span>
        <span class="muted small">{facts}</span>
      </span>
      <span class="lot-tag">
        <Badge tone="good">Available</Badge>
      </span>
    </button>
  );
}

/** Lots grouped by district in the standard district order, each sorted by address. */
function groupByDistrict(lots: Lot[]): { id: DistrictId; lots: Lot[] }[] {
  return DISTRICTS.map((id) => ({
    id,
    lots: lots
      .filter((l) => l.district === id)
      .sort((a, b) => naturalOrder.compare(a.address, b.address)),
  })).filter((g) => g.lots.length > 0);
}

function pendingByBranch(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of Object.values(s.loanDesk.applications))
    out[a.branchId] = (out[a.branchId] ?? 0) + 1;
  return out;
}
