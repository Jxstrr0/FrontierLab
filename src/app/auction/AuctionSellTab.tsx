// Auction house Sell tab (SCREENS §19): your collectibles with purchase price,
// fair value and status (Unverified / Appraising / Genuine / Counterfeit, with
// the FAKE stamp), Appraise (shows the fee, works from anywhere) and Consign
// (appraised genuine pieces, at this house) or Withdraw a consignment.
import { useState } from 'preact/hooks';
import { AUCTIONS, COLLECTIBLES_CFG } from '../../config/balance';
import { insuranceWeekly, sellerProceeds } from '../../sim/auctions';
import * as cmd from '../../sim/commands';
import { Badge, Card, Confirm, Row, SectionTitle } from '../components';
import { moneyFull, pct } from '../format/format';
import { act, toast, useGame } from '../store';
import { CollectibleIcon } from './AuctionArt';
import { collectibleRows, saleShortDate, type CollectibleRow, type HouseView } from './auctionView';

const STATUS: Record<
  CollectibleRow['status'],
  { label: string; tone: 'good' | 'bad' | 'warn' | 'info' }
> = {
  unverified: { label: 'Unverified', tone: 'warn' },
  appraising: { label: 'Appraising', tone: 'info' },
  genuine: { label: 'Genuine', tone: 'good' },
  counterfeit: { label: 'Counterfeit', tone: 'bad' },
};

type Ask = { kind: 'appraise' | 'consign'; row: CollectibleRow };

export function AuctionSellTab({ view }: { view: HouseView }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [ask, setAsk] = useState<Ask | null>(null);
  const rows = collectibleRows(s, view);
  const insurance = insuranceWeekly(s);
  const confirm = () => {
    if (!ask) return;
    const { kind, row } = ask;
    setAsk(null);
    if (kind === 'appraise') {
      const r = act(cmd.appraiseCollectible, row.c.id);
      if (r.ok)
        toast(
          `Sent to the appraisers. Their report is due in ${weeks(AUCTIONS.appraiseWeeks)}.`,
          'good',
        );
    } else {
      const r = act(cmd.consignCollectible, row.c.id, view.spec.id);
      if (r.ok)
        toast(`Consigned to ${view.spec.name} for its ${saleShortDate(s, r.week)} sale.`, 'good');
    }
  };
  if (rows.length === 0) {
    return (
      <Card>
        <p class="muted au-note">
          You don't own any collectibles yet. Win a lot on the Buy tab and it will appear here.
        </p>
      </Card>
    );
  }
  return (
    <div class="stack">
      <SectionTitle>Your collectibles</SectionTitle>
      {rows.map((row) => (
        <ItemCard key={row.c.id} row={row} view={view} sym={sym} onAsk={setAsk} />
      ))}
      {insurance > 0 && (
        <p class="small muted au-note">
          Insurance {moneyFull(insurance, sym)} a week from personal cash (
          {pct(COLLECTIBLES_CFG.insuranceRate, 1)} a year of value).
        </p>
      )}
      {ask && (
        <Confirm
          title={ask.kind === 'appraise' ? 'Appraise this piece?' : 'Consign this piece?'}
          body={<AskBody ask={ask} view={view} sym={sym} />}
          confirmLabel={ask.kind === 'appraise' ? 'Appraise' : 'Consign'}
          onConfirm={confirm}
          onCancel={() => setAsk(null)}
        />
      )}
    </div>
  );
}

const weeks = (n: number) => (n === 1 ? 'a week' : `${n} weeks`);

function ItemCard(p: {
  row: CollectibleRow;
  view: HouseView;
  sym: string;
  onAsk: (a: Ask) => void;
}) {
  const s = useGame();
  const { row, sym } = p;
  const st = STATUS[row.status];
  const fake = row.status === 'counterfeit';
  const withdraw = () => {
    const r = act(cmd.withdrawConsignment, row.c.id);
    if (r.ok) toast('Consignment withdrawn.');
  };
  return (
    <Card class={`au-item${fake ? ' is-fake' : ''}`}>
      <div class="au-item-head">
        {row.spec && <CollectibleIcon category={row.spec.category} fake={fake} />}
        <div class="au-item-title">
          <div class="au-lot-name">{row.name}</div>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
      </div>
      <Row label="Purchase price" value={moneyFull(row.c.price, sym)} />
      <Row
        label="Fair value"
        value={moneyFull(row.c.value, sym)}
        strong={!fake}
        tone={fake ? 'bad' : undefined}
      />
      {row.consigned && (
        <Row
          label="Consigned"
          value={`${row.consigned.house}, sale on ${saleShortDate(s, row.consigned.week)}`}
          tone="dim"
        />
      )}
      <div class="btn-row au-actions">
        {row.status === 'unverified' && (
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => p.onAsk({ kind: 'appraise', row })}
          >
            Appraise · {moneyFull(row.fee, sym)}
          </button>
        )}
        {row.consigned ? (
          <button type="button" class="btn btn-secondary" onClick={withdraw}>
            Withdraw
          </button>
        ) : (
          row.status === 'genuine' && (
            <button
              type="button"
              class="btn btn-primary"
              disabled={!!row.consignBlock}
              onClick={() => p.onAsk({ kind: 'consign', row })}
            >
              Consign here
            </button>
          )
        )}
      </div>
      {!row.consigned && row.consignBlock && row.status !== 'unverified' && (
        <p class="small muted au-note">{row.consignBlock}</p>
      )}
    </Card>
  );
}

function AskBody(p: { ask: Ask; view: HouseView; sym: string }) {
  const s = useGame();
  const { row } = p.ask;
  if (p.ask.kind === 'appraise') {
    return (
      <p>
        The appraisers charge {moneyFull(row.fee, p.sym)} ({pct(AUCTIONS.appraiseFee, 0)} of what
        you paid) from personal cash and report in {weeks(AUCTIONS.appraiseWeeks)}. If it turns out
        to be a fake, it's worth nothing.
      </p>
    );
  }
  return (
    <p>
      {row.name} goes into {p.view.spec.name}'s sale on {saleShortDate(s, p.view.house.nextWeek)}.
      At its fair value of {moneyFull(row.c.value, p.sym)} you'd receive about{' '}
      {moneyFull(sellerProceeds(row.c.value), p.sym)} after the {pct(AUCTIONS.sellerFee, 0)}{' '}
      seller's fee; the hammer price can land above or below.
    </p>
  );
}
