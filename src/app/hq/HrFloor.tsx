// HR floor content (SCREENS §10, DESIGN §5.8.2): the employee benefits
// carousel (vignette, name, description, a control in the benefit's own unit,
// estimated weekly cost and an effect badge) and the totals: weekly benefits
// cost and employees covered. The Employee Stock Plan waits for a listing.
import { BENEFIT_ORDER, BENEFITS, type BenefitSpec } from '../../data/benefits';
import * as cmd from '../../sim/commands';
import { benefitsWeeklyCost, benefitWeeklyCost, employeeCount, hqStaff } from '../../sim/hq';
import { Badge, Card, Carousel, Row, SectionTitle, Stepper, Toggle } from '../components';
import { count, money } from '../format/format';
import { act, useGame } from '../store';
import {
  benefitEditText,
  benefitEffects,
  benefitParse,
  benefitUnit,
  benefitValueText,
} from './benefitText';
import { BenefitArt } from './BenefitArt';

export function HrFloor() {
  const s = useGame();
  const sym = s.settings.currency;
  return (
    <div class="stack">
      <SectionTitle>Employee benefits</SectionTitle>
      <Card>
        <Row label="Benefits cost" value={`${money(benefitsWeeklyCost(s), sym)} /week`} strong />
        <Row label="Employees covered" value={count(employeeCount(s))} />
        <Row label="Of them at HQ" value={count(hqStaff(s))} tone="dim" />
      </Card>
      <Carousel label="Employee benefits" class="hq-benefits">
        {BENEFIT_ORDER.map((id) => (
          <BenefitCard spec={BENEFITS[id]!} />
        ))}
      </Carousel>
      <p class="muted small">
        Benefits apply to everyone on the payroll, branches included, unless a card says HQ only.
      </p>
    </div>
  );
}

const sentence = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function BenefitCard({ spec }: { spec: BenefitSpec }) {
  const s = useGame();
  const sym = s.settings.currency;
  const value = s.people.benefits[spec.id] ?? 0;
  const locked = !!spec.publicOnly && s.stock.status !== 'public';
  const set = (v: number) => act(cmd.setBenefit, spec.id, v);
  const cost = benefitWeeklyCost(s, spec.id, value);
  const effects = benefitEffects(spec, value);
  return (
    <Card class={`hq-benefit${locked ? ' is-locked' : ''}`}>
      <div class="hq-benefit-head">
        <BenefitArt id={spec.id} />
        <div>
          <h4 class="hq-benefit-name">{spec.name}</h4>
          <p class="muted small hq-benefit-desc">{spec.description}</p>
        </div>
      </div>
      {spec.control === 'toggle' ? (
        <Toggle
          label={spec.name}
          hint={benefitUnit(spec)}
          checked={value > 0}
          onChange={(on) => set(on ? 1 : 0)}
        />
      ) : (
        <Stepper
          label={sentence(benefitUnit(spec))}
          value={value}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          format={(v) => benefitValueText(spec, v, sym)}
          editText={(v) => benefitEditText(spec, v)}
          parse={(t) => benefitParse(spec, t)}
          onChange={set}
          hint={locked ? 'Once listed' : undefined}
          disabled={locked}
        />
      )}
      <div class="hq-benefit-foot">
        <span class="small">
          {locked
            ? 'Available once your bank is listed'
            : value > 0
              ? `About ${money(cost, sym)} /week`
              : 'Off'}
        </span>
        <span class="hq-benefit-effects">
          {effects.map((e) => (
            <Badge tone={value > 0 && !locked ? 'good' : 'info'}>{e}</Badge>
          ))}
        </span>
      </div>
      {value === 0 && !locked && spec.control !== 'toggle' && (
        <p class="muted small hq-benefit-ref">
          Effects shown at {benefitValueText(spec, spec.ref, sym)}.
        </p>
      )}
    </Card>
  );
}
