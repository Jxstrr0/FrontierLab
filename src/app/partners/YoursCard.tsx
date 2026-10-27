// Your partnership (SCREENS §14 "Yours"): health bar, "Year X of 7", ARR
// and accounts, the host and package, the contract curve with a "you are here"
// marker, Renew (shows the fee; opens in the last year) and Release.
import { useState } from 'preact/hooks';
import { PARTNER_RENEWAL } from '../../config/balance';
import { CITIES } from '../../data/cities';
import * as cmd from '../../sim/commands';
import { canRenew, elapsedWeeks, renewalFee, yearOfTerm } from '../../sim/partnerships';
import type { Partnership, Site } from '../../sim/state';
import { Card, Confirm, LineChart, Row, StatBar } from '../components';
import { branchPrice } from '../../sim/branch/pricing';
import { productSpec } from '../../sim/products';
import { count, money } from '../format/format';
import { priceText } from '../branch/selectors';
import { act, toast, useGame } from '../store';
import { contractCurve, productName } from './partnerView';

export function YoursCard(p: { site: Site; partnership: Partnership }) {
  const s = useGame();
  const sym = s.settings.currency;
  const { site, partnership: ps } = p;
  const [confirm, setConfirm] = useState(false);
  const host = s.branches[ps.hostBranchId];
  const spec = productSpec(s, ps.productId);
  const { year, of } = yearOfTerm(s, ps);
  const curve = contractCurve(s, site, ps);
  const fee = renewalFee(s, site, ps);
  const renewable = canRenew(s, ps);
  const weeksToWindow = ps.termWeeks - PARTNER_RENEWAL.windowWeeks - elapsedWeeks(s, ps);
  const renewNote = renewable
    ? s.company.cash < fee
      ? `Not enough cash: you need ${money(fee, sym)}.`
      : 'Another full contract from the end of this one.'
    : `Renewal opens in ${count(weeksToWindow)} weeks, in the contract's last year.`;
  const name = site.employer?.name ?? site.refId;

  const renew = () => {
    const r = act(cmd.renewPartnership, ps.id);
    if (r.ok) toast(`Renewed with ${name}.`, 'good');
  };
  const release = () => {
    setConfirm(false);
    const r = act(cmd.releasePartnership, ps.id);
    if (r.ok) toast(`Released ${name}. Their seats leave over 12 weeks.`, 'info');
  };

  return (
    <Card class="pt-deal pt-yours">
      <div class="pt-deal-head">
        <div class="pt-deal-name">
          {ps.kind === 'student' ? 'Student plans' : 'Staff plans'} · yours
        </div>
        <span class="small muted">
          Year {year} of {of}
        </span>
      </div>
      <StatBar label="Health" value={ps.health} />
      <Row label="ARR" value={money(ps.balance, sym)} strong />
      <Row label="Seats" value={count(ps.accounts)} />
      <Row
        label="Host sales office"
        value={
          !host
            ? 'None'
            : host.cityId === p.site.cityId
              ? host.name
              : `${host.name} · ${CITIES[host.cityId]?.name ?? host.cityId}`
        }
      />
      <Row
        label="Package"
        value={
          host && spec
            ? `${productName(s, ps.productId)} · ${priceText(spec, branchPrice(s, host, ps.productId), s.settings.currency)}`
            : productName(s, ps.productId)
        }
      />
      <LineChart
        label="Expected ARR over this contract, with where you are now"
        series={[{ label: 'Expected ARR · you are here', values: curve.values, tone: 'brass' }]}
        startLabel={`Year 1`}
        endLabel={`Year ${of}`}
        markerIndex={curve.marker}
      />
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={!renewable || s.company.cash < fee}
        onClick={renew}
      >
        Renew · {money(fee, sym)}
      </button>
      <p class={`small pt-center ${renewable && s.company.cash < fee ? 'tone-bad' : 'muted'}`}>
        {renewNote}
      </p>
      <button type="button" class="btn btn-secondary btn-block" onClick={() => setConfirm(true)}>
        Release
      </button>
      {confirm && (
        <Confirm
          title={`Release ${name}?`}
          body="Their seats leave over the next 12 weeks and the rest of the signing fee is written off."
          confirmLabel="Release"
          danger
          onConfirm={release}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Card>
  );
}
