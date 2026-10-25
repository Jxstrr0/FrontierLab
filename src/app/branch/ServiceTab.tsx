// Branch Service tab (SCREENS §5.1): customer reviews, staff controls and the
// branch manager card.
import { avatarFromSeed } from '../../art/portraits';
import * as cmd from '../../sim/commands';
import type { Branch, ReviewCard } from '../../sim/state';
import { Badge, Card, CoinRating, SectionTitle, StatBar, Stepper, Portrait } from '../components';
import { count, shortDate } from '../format/format';
import { act, useGame } from '../store';
import { ManagerCard } from './ManagerCard';
import { dayOfWeek, moodTone, staffBounds, wageBounds, waitLabel } from './selectors';

const CATEGORY_LABELS = {
  rates: 'Rates',
  products: 'Products',
  service: 'Service',
  branch: 'Branch',
};

export function ServiceTab(p: { branch: Branch }) {
  return (
    <div class="stack">
      <Reviews branch={p.branch} />
      <Staff branch={p.branch} />
      <ManagerCard branch={p.branch} />
    </div>
  );
}

function Reviews({ branch }: { branch: Branch }) {
  const r = branch.ratings;
  const cards = [...branch.reviewCards].reverse();
  return (
    <section>
      <SectionTitle>Customer reviews</SectionTitle>
      <Card>
        <div class="br-reviews-head">
          <span class="hero-number">{r.overall.toFixed(1)}</span>
          <div>
            <CoinRating value={r.overall} showNumber={false} size={20} />
            <div class="muted small">{count(r.reviewCount)} reviews</div>
          </div>
        </div>
        <div class="br-rating-rows">
          {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((k) => (
            <div class="br-rating-row">
              <span class="muted">{CATEGORY_LABELS[k]}</span>
              <CoinRating value={r[k]} size={14} />
            </div>
          ))}
        </div>
      </Card>
      {cards.length > 0 ? (
        <div class="carousel br-review-carousel">
          {cards.map((c) => (
            <ReviewCardView card={c} />
          ))}
        </div>
      ) : (
        <p class="muted small">Reviews start once customers come through the door.</p>
      )}
    </section>
  );
}

export function ReviewCardView({ card }: { card: ReviewCard }) {
  const s = useGame();
  return (
    <Card class="br-review">
      <div class="br-review-head">
        <MiniPortrait seed={card.portraitSeed} />
        <div>
          <CoinRating value={card.stars} size={14} showNumber={false} />
          <div class="muted small">
            {CATEGORY_LABELS[card.category]} · {shortDate(s.meta.startDate, dayOfWeek(card.week))}
          </div>
        </div>
      </div>
      <p class="br-review-quote">“{card.text}”</p>
    </Card>
  );
}

/** The reviewer's small engraved portrait, drawn from the card's seed. */
function MiniPortrait({ seed }: { seed: number }) {
  return <Portrait avatar={avatarFromSeed(seed)} size={32} />;
}

function Staff({ branch }: { branch: Branch }) {
  const s = useGame();
  const st = branch.staff;
  const { needed, max } = staffBounds(branch);
  const wage = wageBounds(branch.cityId);
  const sym = s.settings.currency;
  const wait = waitLabel(branch.waitIndex);
  const locked = branch.delegation.staffing;
  const lockHint = 'Your manager handles this';
  const mood = moodTone(st.morale);
  return (
    <section>
      <SectionTitle>Staff</SectionTitle>
      <Card>
        <div class="stack">
          <div class="br-staff-head">
            <StaffFigures count={st.count} target={st.target} mood={mood} />
            {branch.status === 'open' && <Badge tone={wait.tone}>Wait: {wait.text}</Badge>}
          </div>
          <div class="grid-2">
            <Stepper
              label="Staff"
              value={st.target}
              min={0}
              max={max}
              step={1}
              onChange={(v) => act(cmd.setStaffTarget, branch.id, v)}
              hint={locked ? lockHint : `Needed ${needed} · ${st.count} on staff`}
              disabled={locked}
            />
            <Stepper
              label="Hourly wage"
              value={st.wage}
              min={wage.min}
              max={wage.max}
              step={wage.step}
              format={(v) => `${sym}${v.toFixed(2)}`}
              onChange={(v) => act(cmd.setWage, branch.id, v)}
              hint={locked ? lockHint : `Market ${sym}${wage.market.toFixed(2)}`}
              disabled={locked}
            />
          </div>
          <div>
            <StatBar label="Staff skill" value={st.skill} />
            <StatBar label="Staff morale" value={st.morale} />
          </div>
        </div>
      </Card>
    </section>
  );
}

/** One figure per person on staff, coloured by morale; outlines for open positions. */
function StaffFigures(p: { count: number; target: number; mood: 'good' | 'warn' | 'bad' }) {
  const open = Math.max(0, p.target - p.count);
  const figures = [
    ...Array.from({ length: p.count }, () => `br-fig br-fig-${p.mood}`),
    ...Array.from({ length: open }, () => 'br-fig br-fig-open'),
  ];
  return (
    <div class="br-figures" aria-label={`${p.count} staff, ${open} open positions`}>
      {figures.map((cls) => (
        <svg class={cls} viewBox="0 0 12 18" aria-hidden="true">
          <circle cx="6" cy="4" r="3" />
          <path d="M1 17c0-6 2-8 5-8s5 2 5 8z" />
        </svg>
      ))}
    </div>
  );
}
