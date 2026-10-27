// One renewal on the Deal Desk (SCREENS §5.3, SIMULATION §11): a contract due
// at the next quarter start. Your own contract carries an offer you can
// sharpen (keep chance, current vs new value); a rival's can take an offer
// from you or none. Offers are settled in the renewal season (contracts.ts).
import { DAYS_PER_WEEK } from '../../../config/balance';
import {
  contractValueAt,
  currentDiscount,
  isOwnRenewal,
  rfpChance,
} from '../../../sim/branch/dealDesk';
import * as cmd from '../../../sim/commands';
import type { Business, GameState, Rfp } from '../../../sim/state';
import { Card, Row, Toggle } from '../../components';
import { money, monthYear } from '../../format/format';
import { act } from '../../store';
import { DealHead, DiscountStepper } from './dealParts';

export function RenewalCard(p: { s: GameState; rfp: Rfp; b: Business; startDiscount: number }) {
  const { s, rfp, b } = p;
  const sym = s.settings.currency;
  const own = isOwnRenewal(rfp, b);
  const when = monthYear(s.meta.startDate, rfp.dueWeek * DAYS_PER_WEEK);
  const offer = rfp.offer ?? (own ? currentDiscount(b) : undefined);
  const setOffer = (d: number | undefined) => act(cmd.setRenewalOffer, rfp.id, d);
  const rivalName =
    b.vendor?.type === 'rival' ? (s.rivals[b.vendor.id]?.name ?? 'A rival lab') : 'Another lab';

  return (
    <Card class="deal-card">
      <DealHead
        b={b}
        chip={<span class={`chip${own ? ' chip-own' : ''}`}>{own ? 'Yours' : 'Rival'}</span>}
      />
      <div class="deal-sub">
        {own ? 'Your contract' : `Held by ${rivalName}`} · renews {when}
      </div>

      {!own && (
        <Toggle
          label="Make an offer"
          hint="Bid to take this contract when it renews"
          checked={offer !== undefined}
          onChange={(on) => setOffer(on ? p.startDiscount : undefined)}
        />
      )}

      {offer !== undefined && (
        <>
          <DiscountStepper
            label={own ? 'Renewal discount' : 'Your discount'}
            value={offer}
            onChange={setOffer}
            hint={`Chance you ${own ? 'keep it' : 'win'}: ${Math.round(rfpChance(s, rfp, offer) * 100)}%`}
          />
          <div class="deal-rows">
            {b.contractValue !== undefined && (
              <Row
                label={own ? 'Now' : `${rivalName} today`}
                value={`${money(b.contractValue, sym)} a year`}
              />
            )}
            <Row label="Your offer" value={`${money(contractValueAt(b, offer), sym)} a year`} />
          </div>
        </>
      )}
    </Card>
  );
}
