// SCREENS §20 For sale: club and sport, league, last-season finish, owner,
// valuation, Company | Private, an offer stepper and Offer purchase (disabled
// with the reason when you're not in the city or short of cash).
import { useState } from 'preact/hooks';
import { SPORT_LABEL } from '../../data/franchises';
import * as cmd from '../../sim/commands';
import { ordinal } from '../../sim/newsFormat';
import { Card, Row, SectionTitle, Segmented, Stepper } from '../components';
import { money, moneyFull, pct } from '../format/format';
import { act, toast, useGame } from '../store';
import { offerBounds, type ClubView } from './franchiseView';

export function ClubForSale({ view }: { view: ClubView }) {
  const s = useGame();
  const sym = s.settings.currency;
  const { spec, club } = view;
  const bounds = offerBounds(club.value);
  const [account, setAccount] = useState<cmd.ClubAccount>('personal');
  const [offer, setOffer] = useState(bounds.max);
  const cash = account === 'company' ? s.company.cash : s.personal.cash;
  const blocker = !view.inCity
    ? `You need to be in ${view.city} to buy this club.`
    : offer > cash
      ? `Not enough ${account === 'company' ? 'corporate' : 'personal'} cash.`
      : null;
  const submit = () => {
    const r = act(cmd.buyClub, spec.id, offer, account);
    if (r.ok) toast(`The ${spec.name} are yours.`, 'good');
  };
  return (
    <div class="stack">
      <Card>
        <Row label="Club" value={spec.name} />
        <Row label="Sport" value={SPORT_LABEL[spec.sport]} />
        <Row label="League" value={spec.league} />
        <Row
          label="Last season"
          value={club.lastFinish ? `${ordinal(club.lastFinish)} place` : '—'}
        />
        <Row label="Owner" value={view.ownerLabel} />
        <Row label="Valuation" value={moneyFull(club.value, sym)} strong />
      </Card>
      <SectionTitle>Make an offer</SectionTitle>
      <Card>
        <div class="stack fr-offer">
          <Segmented
            label="Buy as"
            options={[
              { value: 'company', label: 'Company' },
              { value: 'personal', label: 'Private' },
            ]}
            value={account}
            onChange={setAccount}
          />
          <p class="muted small fr-center">
            {account === 'company' ? 'Corporate cash' : 'Personal cash'} {money(cash, sym)}
          </p>
          <Stepper
            label="Offer price"
            value={offer}
            min={bounds.min}
            max={bounds.max}
            step={bounds.step}
            onChange={setOffer}
            format={(v) => moneyFull(v, sym)}
            hint={`${pct(offer / club.value, 0)} of valuation`}
          />
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={!!blocker}
            onClick={submit}
          >
            Offer purchase
          </button>
          {blocker && <p class="small tone-bad fr-center">{blocker}</p>}
          <p class="muted small fr-center">
            {account === 'company'
              ? 'Owned by the bank: the club sits on the balance sheet and its income and costs go through the company books.'
              : 'Owned by you: the club’s profit or loss goes to your personal cash each week.'}
          </p>
        </div>
      </Card>
    </div>
  );
}
