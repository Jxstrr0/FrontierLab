// The power deal at an energy site (SCREENS §5b, stage C8a): before signing,
// the fee, contract length, price per GPU and what it brings; once signed,
// health, "Year X of 7", contracted GPUs and their weekly bill, Renew (opens
// in the last year) and Release.
import { useState } from 'preact/hooks';
import {
  PARTNER_CONTRACT_WEEKS,
  PARTNER_RENEWAL,
  POWER_DEAL,
  WEEKS_PER_YEAR,
} from '../../config/balance';
import * as cmd from '../../sim/commands';
import {
  activePowerDeal,
  canRenewDeal,
  dealElapsed,
  powerDealFee,
  powerDealPrice,
  powerDealRenewalFee,
} from '../../sim/powerDeals';
import type { PowerDeal, Site } from '../../sim/state';
import { Card, Confirm, Row, SectionTitle, StatBar } from '../components';
import { count, money, weeksText } from '../format/format';
import { act, toast, useGame } from '../store';

const discountPct = Math.round((1 - POWER_DEAL.powerDiscount) * 100);

export function PowerDealCard(p: { site: Site }) {
  const s = useGame();
  const mine = activePowerDeal(s, p.site.id);
  return (
    <>
      <SectionTitle>Power deal</SectionTitle>
      {mine ? <Yours site={p.site} deal={mine} /> : <Offer site={p.site} />}
    </>
  );
}

function Offer(p: { site: Site }) {
  const s = useGame();
  const sym = s.settings.currency;
  const fee = powerDealFee(s, p.site);
  const blocker = cmd.powerDealBlocker(s, p.site.id);
  const sign = () => {
    const r = act(cmd.signPowerDeal, p.site.id);
    if (r.ok) toast(`Power deal signed at ${p.site.employer?.name ?? 'the site'}.`, 'good');
  };
  return (
    <Card class="pt-deal">
      <p class="muted small">
        A long contract for owned capacity and cheaper power: contracted GPUs join your compute
        pool, and your data centers in this country pay {discountPct}% less for power.
      </p>
      <Row label="Signing fee" value={money(fee, sym)} strong />
      <Row
        label="Contract"
        value={`${Math.round(PARTNER_CONTRACT_WEEKS / WEEKS_PER_YEAR)} years`}
      />
      <Row label="Price per GPU-week" value={money(powerDealPrice(s, p.site), sym)} />
      <p class="muted small">
        GPUs ramp up over the first two years and you pay for every one, used or not.
      </p>
      {blocker && <p class="small tone-bad">{blocker}</p>}
      <button type="button" class="btn btn-primary btn-block" disabled={!!blocker} onClick={sign}>
        Sign · {money(fee, sym)}
      </button>
    </Card>
  );
}

function Yours(p: { site: Site; deal: PowerDeal }) {
  const s = useGame();
  const sym = s.settings.currency;
  const d = p.deal;
  const [confirm, setConfirm] = useState(false);
  const of = Math.round(d.termWeeks / WEEKS_PER_YEAR);
  const year = Math.min(of, Math.floor(Math.max(0, dealElapsed(s, d)) / WEEKS_PER_YEAR) + 1);
  const fee = powerDealRenewalFee(s, p.site, d);
  const renewable = canRenewDeal(s, d);
  const weeksToWindow = d.termWeeks - PARTNER_RENEWAL.windowWeeks - dealElapsed(s, d);
  const renew = () => {
    const r = act(cmd.renewPowerDeal, d.id);
    if (r.ok) toast('Power deal renewed.', 'good');
  };
  const release = () => {
    setConfirm(false);
    const r = act(cmd.releasePowerDeal, d.id);
    if (r.ok) toast('Power deal released. Its GPUs leave over 12 weeks.', 'info');
  };
  return (
    <Card class="pt-deal pt-yours">
      <div class="pt-deal-head">
        <div class="pt-deal-name">Power deal · yours</div>
        <span class="small muted">
          Year {year} of {of}
        </span>
      </div>
      <StatBar label="Health" value={d.health} />
      <Row label="Contracted GPUs" value={count(Math.round(d.gpus))} strong />
      <Row label="Weekly bill" value={money(d.gpus * d.price, sym)} />
      <Row label="Price per GPU-week" value={money(d.price, sym)} />
      <p class="muted small">
        Health rises with a data center of yours in this country and falls with a weak safety tier.
      </p>
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={!renewable || s.company.cash < fee}
        onClick={renew}
      >
        Renew · {money(fee, sym)}
      </button>
      <p class="small pt-center muted">
        {renewable
          ? 'Another full contract from the end of this one.'
          : `Renewal opens in ${weeksText(weeksToWindow)}, in the contract's last year.`}
      </p>
      <button type="button" class="btn btn-secondary btn-block" onClick={() => setConfirm(true)}>
        Release
      </button>
      {confirm && (
        <Confirm
          title="Release the power deal?"
          body="Its GPUs leave your pool over the next 12 weeks and the rest of the signing fee is written off."
          confirmLabel="Release"
          danger
          onConfirm={release}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Card>
  );
}
