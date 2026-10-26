// HR floor content (SCREENS §10, DESIGN §5.8.2): the switch for HR hiring
// branch managers (SIMULATION §16.11), then the employee benefits carousel (vignette, name, description, a control in the benefit's own unit,
// estimated weekly cost and an effect badge) and the totals: weekly benefits
// cost and employees covered. The Employee Stock Plan waits for a listing.
import { BENEFIT_ORDER, BENEFITS, type BenefitSpec } from '../../data/benefits';
import * as cmd from '../../sim/commands';
import { delegationOn } from '../../sim/execSeats';
import { benefitsWeeklyCost, benefitWeeklyCost, employeeCount, hqStaff } from '../../sim/hq';
import { unstaffedBranches } from '../../sim/hrHiring';
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
      <ManagerHiring />
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
        Benefits apply to everyone on the payroll, sales offices included, unless a card says HQ
        only.
      </p>
    </div>
  );
}

/** HR hires a manager for every open branch without one, each week (§16.11). */
function ManagerHiring() {
  const s = useGame();
  const empty = unstaffedBranches(s).length;
  const coo = delegationOn(s, 'coo', 'branchOps');
  return (
    <>
      <SectionTitle>Office managers</SectionTitle>
      <Card>
        <Toggle
          label="Hire managers for empty sales offices"
          hint="Each week, the strongest candidate in the city"
          checked={s.people.hrHiring}
          onChange={(on) => act(cmd.setHrHiring, on)}
        />
        <Row
          label="Sales offices without a manager"
          value={count(empty)}
          tone={empty > 0 ? undefined : 'dim'}
        />
        {coo && (
          <p class="muted small">
            Your COO’s Sales office operations hires first and also turns on the sales office’s
            delegation.
          </p>
        )}
      </Card>
    </>
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
          editText={(v) => benefitEditText(spec, v, sym)}
          parse={(t) => benefitParse(spec, t, sym)}
          onChange={set}
          hint={locked ? 'Once listed' : undefined}
          disabled={locked}
        />
      )}
      <div class="hq-benefit-foot">
        <span class="small">
          {locked
            ? 'Available once your lab is listed'
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
