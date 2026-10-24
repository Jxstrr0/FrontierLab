// New product sheet (SCREENS §10 New product form, SIMULATION §16.6): name,
// product type grid, target price tier, development time, weekly budget with
// the total cost, the Products team's open positions, the live 5★…1★ odds
// table and Start development. Digital projects (IT floor) are templates too;
// they skip the name and tier and run once each.
import { useState } from 'preact/hooks';
import {
  DEV_BUDGET_STEP,
  DEV_MAX_BUDGET_SCORE_AT,
  DEV_MIN_WEEKLY,
  DEV_TERMS,
  PRODUCT_NAME_MAX,
} from '../../../config/balance';
import { DEV_TEMPLATE_IDS, DEV_TEMPLATES, isDigital } from '../../../data/devTemplates';
import { PRODUCTS } from '../../../data/products';
import * as cmd from '../../../sim/commands';
import { devOdds, devSpeed } from '../../../sim/development';
import type { DevTier } from '../../../sim/state';
import { Badge, CoinRating, Row, Segmented, Sheet, Stepper } from '../../components';
import { moneyFull } from '../../format/format';
import { act, toast, useGame } from '../../store';
import { NameField } from './NameField';
import {
  digitalEffectText,
  oddsRows,
  templateBlocker,
  TERM_OPTIONS,
  tierHint,
  TIERS,
} from './productSelectors';
import { TemplateIcon } from './TemplateIcon';

type Term = (typeof DEV_TERMS)[number];
const DEFAULT_TERM: Term = DEV_TERMS[0];

export function NewProductSheet(p: { initialTemplate?: string; onClose: () => void }) {
  const s = useGame();
  const sym = s.settings.currency;
  const first = p.initialTemplate ?? DEV_TEMPLATE_IDS[0]!;
  // Opened from the IT floor on a digital project: only the digital templates.
  const digitalOnly = !!DEV_TEMPLATES[first]?.digital;
  const ids = DEV_TEMPLATE_IDS.filter((id) => !digitalOnly || isDigital(DEV_TEMPLATES[id]!));
  const [templateId, setTemplateId] = useState(first);
  const [name, setName] = useState(DEV_TEMPLATES[first]?.name ?? '');
  const [named, setNamed] = useState(false);
  const [tier, setTier] = useState<DevTier>('medium');
  const [weeks, setWeeks] = useState<Term>(DEFAULT_TERM);
  const [budget, setBudget] = useState(DEV_MIN_WEEKLY);
  const template = DEV_TEMPLATES[templateId];
  const digital = !!template?.digital;
  const dept = s.departments.products;
  const open = dept ? Math.max(0, dept.target - dept.staff) : 0;
  const blocker = template ? templateBlocker(s, template) : 'Pick a product type';
  const short = s.company.cash < budget;
  const pace = dept ? Math.ceil(weeks / devSpeed(s)) : weeks;

  const pick = (id: string) => {
    setTemplateId(id);
    if (!named) setName(DEV_TEMPLATES[id]?.name ?? '');
  };
  const start = () => {
    const r = act(cmd.startDevelopment, {
      name: digital ? (template?.name ?? '') : name,
      templateId,
      tier,
      weeks,
      weeklyBudget: budget,
    });
    if (r.ok) {
      toast(`${digital ? template?.name : name.trim()}: development started.`, 'good');
      p.onClose();
    }
  };

  return (
    <Sheet title={digitalOnly ? 'New digital project' : 'New product'} onClose={p.onClose}>
      <div class="stack">
        {!dept && (
          <p class="hq-blocker small" role="status">
            Product development needs a Products floor at HQ.
          </p>
        )}
        <fieldset class="pf-fieldset">
          <legend class="field-label">{digitalOnly ? 'Project' : 'Product type'}</legend>
          <div class="pf-type-grid">
            {ids.map((id) => {
              const t = DEV_TEMPLATES[id]!;
              const why = templateBlocker(s, t);
              const base = t.base ? PRODUCTS[t.base]?.name : 'Digital project';
              return (
                <button
                  type="button"
                  class={`pf-type${id === templateId ? ' is-active' : ''}`}
                  aria-pressed={id === templateId}
                  disabled={!!why}
                  onClick={() => pick(id)}
                >
                  <TemplateIcon templateId={id} />
                  <span class="pf-type-text">
                    <span class="pf-type-name">{t.name}</span>
                    <span class="pf-type-base">{why ?? base}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {digital ? (
          <p class="muted small">{template && digitalEffectText(template)}. Runs once.</p>
        ) : (
          <>
            <NameField
              label="Product name"
              value={name}
              max={PRODUCT_NAME_MAX}
              onInput={(v) => {
                setName(v);
                setNamed(true);
              }}
            />
            <div>
              <div class="field-label pf-label">Target price</div>
              <Segmented label="Target price" options={TIERS} value={tier} onChange={setTier} />
              <p class="muted small hq-note">{tierHint(template, tier)}</p>
            </div>
          </>
        )}

        <div>
          <div class="field-label pf-label">Development time</div>
          <Segmented
            label="Development time"
            options={TERM_OPTIONS}
            value={String(weeks)}
            onChange={(v) => setWeeks(Number(v) as Term)}
          />
          {dept && pace !== weeks && (
            <p class="muted small hq-note">
              About {pace} weeks at the Products team’s current pace.
            </p>
          )}
        </div>

        <div>
          <Stepper
            label="Weekly budget"
            value={budget}
            min={DEV_MIN_WEEKLY}
            max={DEV_MAX_BUDGET_SCORE_AT}
            step={DEV_BUDGET_STEP}
            format={(v) => moneyFull(v, sym)}
            onChange={setBudget}
          />
          <Row label="Total cost" value={moneyFull(budget * weeks, sym)} strong />
        </div>

        <div class="pf-team">
          <span class="muted small">Products team</span>
          {open > 0 ? (
            <Badge tone="warn">Open positions: +{open}</Badge>
          ) : (
            <Badge tone="good">Fully hired</Badge>
          )}
        </div>

        {digital ? (
          <p class="muted small">
            Digital projects have no star rating: when the work is done, the effect applies.
          </p>
        ) : (
          <OddsTable odds={devOdds(s, weeks, budget)} />
        )}

        {short && (
          <p class="hq-blocker small" role="status">
            You need {moneyFull(budget, sym)} in cash for the first week.
          </p>
        )}
        <button
          type="button"
          class="btn btn-primary btn-block"
          disabled={!dept || !!blocker || short || (!digital && !name.trim())}
          onClick={start}
        >
          Start development
        </button>
      </div>
    </Sheet>
  );
}

/** Live outcome odds, 5★ first, as bars with whole percents. */
function OddsTable(p: { odds: number[] }) {
  return (
    <div class="pf-odds" role="table" aria-label="Outcome estimate">
      <div class="field-label pf-label" role="caption">
        Outcome estimate
      </div>
      {oddsRows(p.odds).map((r) => (
        <div class="pf-odds-row" role="row">
          <span role="rowheader" aria-label={`${r.stars} stars`}>
            <CoinRating value={r.stars} showNumber={false} size={12} />
          </span>
          <span class="pf-odds-track" aria-hidden="true">
            <span class="pf-odds-fill" style={{ width: `${r.pct}%` }} />
          </span>
          <span class="pf-odds-pct" role="cell">
            {r.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}
