// Partnership cards on the Treasury floor (SCREENS §10 Treasury): one card per
// payroll or student partnership with the employer or university, the people
// it covers, "Year X of Y", ARR, seats and a health bar. Tapping a
// card opens that employer's or university's panel (SCREENS §14–15). With no
// partnerships it points the player to the Employers layer on the map.
import { Badge, Card, Row, StatBar } from '../../components';
import { count, money } from '../../format/format';
import { openPanel, useGame } from '../../store';
import { partnershipCards, type PartnershipCardView } from './partnershipCardsView';

export function PartnershipCards() {
  const s = useGame();
  const cards = partnershipCards(s);
  if (cards.length === 0) {
    return (
      <Card>
        <p class="muted small hq-note">
          No partnerships yet. Turn on the Employers layer on the map and tap a large employer to
          offer a payroll deal that brings its staff's salary accounts to your lab.
        </p>
      </Card>
    );
  }
  return (
    <div class="stack">
      {cards.map((c) => (
        <PartnershipCard key={c.id} card={c} sym={s.settings.currency} />
      ))}
    </div>
  );
}

function PartnershipCard({ card: c, sym }: { card: PartnershipCardView; sym: string }) {
  const route = c.route;
  return (
    <Card class="tr-partner" onClick={route ? () => openPanel(route) : undefined}>
      <div class="tr-fund-head">
        <div>
          <div class="tr-fund-name">{c.name}</div>
          <div class="muted small">{c.kindLabel}</div>
        </div>
        {c.active ? (
          <span class="small muted tr-partner-term">{c.termText}</span>
        ) : (
          <Badge tone="warn">{c.termText}</Badge>
        )}
      </div>
      <Row label={c.peopleLabel} value={count(c.people)} />
      <Row label="ARR" value={money(c.balance, sym)} strong />
      <Row label="Seats" value={count(c.accounts)} />
      <StatBar label="Health" value={c.health} />
      {route && <span class="small tr-partner-link">Open partnership →</span>}
    </Card>
  );
}
