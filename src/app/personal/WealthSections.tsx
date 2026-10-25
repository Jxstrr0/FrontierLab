// The Personal Wealth screen's holdings (SCREENS §23): Stocks (your founder
// stake and other shares, with cost basis and gain where known, and Trade for
// listed ones, opening the Trade sheet on the Private account), Real estate
// (buildings with ROI, homes with value and gain; tap to open), and Other
// assets (cars with Sell, collectibles read-only — the auction house handles
// them —, the jet, a club you own and private investments).
import { useState } from 'preact/hooks';
import { FRANCHISES } from '../../data/franchises';
import * as cmd from '../../sim/commands';
import { isListedSecurity, SELF_ID } from '../../sim/securities';
import { Badge, Card, Confirm, Row, SectionTitle } from '../components';
import { count, money, pct } from '../format/format';
import { TradeSheet } from '../investmentBank/TradeSheet';
import { act, openPanel, toast, useGame } from '../store';
import {
  carRows,
  collectibleRows,
  estateRows,
  jetName,
  stockRows,
  wealthSlices,
  type CarRow,
} from './wealthView';

const gainTone = (g: number) => (g > 0 ? 'good' : g < 0 ? 'bad' : 'flat');
const signed = (g: number, sym: string) => `${g > 0 ? '+' : ''}${money(g, sym)}`;

export function StocksSection() {
  const s = useGame();
  const sym = s.settings.currency;
  const rows = stockRows(s);
  const [trading, setTrading] = useState<{ id: string; name: string } | null>(null);
  return (
    <div class="stack">
      <SectionTitle>Stocks</SectionTitle>
      {rows.length === 0 && (
        <p class="muted small">
          You hold no shares personally. Buy some at an investment bank on the map.
        </p>
      )}
      {rows.map((r) => {
        // Your own stake trades as SELF_ID once the bank is public; founder shares
        // of a private bank, and delisted companies, cannot be traded.
        const id = r.key === 'self' ? SELF_ID : r.key;
        const tradable = isListedSecurity(s, id);
        return (
          <Card>
            <div class="pw-card-head">
              <span class="pw-card-name">{r.name}</span>
              <span class="muted small">{r.detail}</span>
            </div>
            <Row label="Shares" value={count(r.shares)} />
            <Row
              label="Cost basis"
              value={r.cost === undefined ? 'Founder shares' : money(r.cost, sym)}
              tone="dim"
            />
            <Row label="Current value" value={money(r.value, sym)} strong />
            {r.gain !== undefined && (
              <Row label="Gain / loss" value={signed(r.gain, sym)} tone={gainTone(r.gain)} />
            )}
            {tradable && (
              <button
                type="button"
                class="btn btn-secondary btn-block pw-trade"
                onClick={() => setTrading({ id, name: r.name })}
              >
                Trade
              </button>
            )}
          </Card>
        );
      })}
      {trading && (
        <TradeSheet
          securityId={trading.id}
          name={trading.name}
          account="personal"
          onClose={() => setTrading(null)}
        />
      )}
    </div>
  );
}

export function RealEstateSection() {
  const s = useGame();
  const sym = s.settings.currency;
  const rows = estateRows(s);
  return (
    <div class="stack">
      <SectionTitle>Real estate</SectionTitle>
      {rows.length === 0 && (
        <p class="muted small">No buildings or homes yet. Look for “For sale” on the map.</p>
      )}
      {rows.map((r) => {
        const body = (
          <>
            <div class="pw-card-head">
              <span class="pw-card-name">{r.name}</span>
              <span class="muted small">{r.detail}</span>
            </div>
            {r.roi !== undefined && <Row label="ROI" value={pct(r.roi, 1)} />}
            <Row label="Value" value={money(r.value, sym)} strong />
            <Row label="Gain / loss" value={signed(r.gain, sym)} tone={gainTone(r.gain)} />
            {r.rebuildIn !== undefined && (
              <Row label="Rebuild" value={`Done in ${r.rebuildIn} wk`} tone="dim" />
            )}
          </>
        );
        const open = r.open;
        return open ? <Card onClick={() => openPanel(open)}>{body}</Card> : <Card>{body}</Card>;
      })}
    </div>
  );
}

export function OtherAssets() {
  const s = useGame();
  const sym = s.settings.currency;
  const [selling, setSelling] = useState<CarRow | null>(null);
  const { nw } = wealthSlices(s);
  const cars = carRows(s);
  const items = collectibleRows(s);
  const jet = jetName(s);
  const clubs = Object.values(s.clubs ?? {}).filter((c) => c.owner === 'personal');
  const privateInv = nw.ventures + nw.ventureDebt + nw.currencies;
  const empty = cars.length + items.length + clubs.length === 0 && !jet && privateInv === 0;
  return (
    <div class="stack">
      <SectionTitle>Other assets</SectionTitle>
      {empty && <p class="muted small">Cars, collectibles, a jet or a club will show here.</p>}
      {cars.map((c) => (
        <Card>
          <div class="pw-card-head">
            <span class="pw-card-name">{c.name}</span>
            {c.classic && <Badge tone="good">Classic</Badge>}
          </div>
          <Row label="Value" value={money(c.value, sym)} strong />
          <Row label="Gain / loss" value={signed(c.gain, sym)} tone={gainTone(c.gain)} />
          <button type="button" class="btn btn-secondary btn-block" onClick={() => setSelling(c)}>
            Sell for {money(c.resale, sym)}
          </button>
        </Card>
      ))}
      {items.length > 0 && (
        <Card>
          <div class="pw-card-head">
            <span class="pw-card-name">Collectibles</span>
            <span class="muted small">
              {nw.collectibles > 0 ? money(nw.collectibles, sym) : ''}
            </span>
          </div>
          {items.map((i) => (
            <Row
              label={`${i.name} · ${i.status}`}
              value={`${money(i.value, sym)} (paid ${money(i.price, sym)})`}
              tone={i.status === 'Counterfeit' ? 'bad' : undefined}
            />
          ))}
          <p class="muted small">Appraise or consign them at an auction house.</p>
        </Card>
      )}
      {(jet || clubs.length > 0 || privateInv > 0) && (
        <Card>
          {jet && <Row label={`Private jet · ${jet}`} value={money(nw.jet, sym)} />}
          {clubs.map((c) => (
            <Row label={FRANCHISES[c.clubId]?.name ?? c.clubId} value={money(c.value, sym)} />
          ))}
          {privateInv > 0 && (
            <Row label="Ventures, venture debt and currencies" value={money(privateInv, sym)} />
          )}
        </Card>
      )}
      {selling && (
        <Confirm
          title={`Sell the ${selling.name}?`}
          body={<p>A dealer pays {money(selling.resale, sym)} into your personal cash.</p>}
          confirmLabel={`Sell for ${money(selling.resale, sym)}`}
          danger
          onCancel={() => setSelling(null)}
          onConfirm={() => {
            const r = act(cmd.sellCar, selling.id);
            setSelling(null);
            if (r.ok) toast(`Sold for ${money(r.price, sym)}`, 'good');
          }}
        />
      )}
    </div>
  );
}
