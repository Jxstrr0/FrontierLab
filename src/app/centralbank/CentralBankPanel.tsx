// Central bank panel (SCREENS §8) for any country: the institution and city,
// a line from the governor's office, the big policy rate with the last
// decision and the next meeting, the economy's indicators, the yield curve and
// — for your home country only — the standing lending facility (the Treasury
// floor's CentralBankFacility, with its stigma warning on first use).
import { DAYS_PER_WEEK } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import type { CountryId, Phase } from '../../data/types';
import {
  gdpForecast,
  isInverted,
  lastQuarterGdp,
  meetingCountry,
  nextMeetingDay,
  yieldCurve,
} from '../../sim/centralBank';
import { hpiYoY } from '../../sim/macro';
import type { CountryState, GameState } from '../../sim/state';
import { theCountryName } from '../../sim/newsStory';
import { homeCountry } from '../../sim/treasury';
import { Badge, Card, Panel, Row, SectionTitle } from '../components';
import { gameDate, pct, signedPct } from '../format/format';
import { CentralBankFacility } from '../hq/treasury/CentralBankFacility';
import '../hq/treasury/treasury.css';
import { closePanel, useGame } from '../store';
import { CentralBankArt } from './CentralBankArt';
import { CentralBankMedallion } from './CentralBankMedallion';
import { YieldCurveChart } from './YieldCurveChart';
import './centralbank.css';

const PHASE_LABEL: Record<Phase, string> = {
  expansion: 'Expansion',
  slowdown: 'Slowdown',
  recession: 'Recession',
  recovery: 'Recovery',
};

const PHASE_LINE: Record<Phase, string> = {
  expansion: 'The economy is running warm. We watch inflation closely.',
  slowdown: 'Growth is cooling. The committee is weighing its next step.',
  recession: 'Output is falling. Support for the economy comes first.',
  recovery: 'The recovery is taking hold. We will not remove support too early.',
};

/** Plain percent (2.4 = 2.4%), one decimal, with a true minus. */
const pctPlain = (v: number) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;

function subtitleFor(s: GameState, id: CountryId): string {
  const city = CITIES[s.world.currentCityId];
  return city?.country === id ? `${city.name} office` : COUNTRIES[id].name;
}

function decisionText(s: GameState, c: CountryState | undefined): string {
  const d = c?.lastDecision;
  if (!d) return 'No meeting yet';
  const verb =
    d.change > 0
      ? `Raised ${signedPct(d.change)}`
      : d.change < 0
        ? `Cut ${signedPct(d.change)}`
        : 'Held';
  return `${verb} · ${gameDate(s.meta.startDate, d.week * DAYS_PER_WEEK)}`;
}

export function CentralBankPanel(p: { countryId: CountryId }) {
  const s = useGame();
  const spec = COUNTRIES[p.countryId];
  const c = s.world.countries[p.countryId];
  if (!spec || !c) {
    return (
      <Panel title="Central bank" onClose={closePanel}>
        <p class="muted">No figures for this country yet.</p>
      </Panel>
    );
  }
  const home = homeCountry(s).id === p.countryId;
  const licensed = Object.values(s.branches).some((b) => CITIES[b.cityId]?.country === p.countryId);
  const anchorId = meetingCountry(p.countryId);
  const anchor = s.world.countries[anchorId];
  const next = nextMeetingDay(s, p.countryId);
  const curve = yieldCurve(c);
  const inverted = isInverted(curve);
  const yoy = c.hpiHistory.length > 1 ? hpiYoY(c) : undefined;
  const advisor = [
    "The governor's office. Rates are on everyone's mind.",
    PHASE_LINE[c.phase],
    inverted
      ? 'Long rates have dipped below short ones. Markets are bracing for a slowdown.'
      : 'Longer loans cost more than overnight money, as they should.',
  ];

  return (
    <Panel
      title={spec.centralBank}
      subtitle={subtitleFor(s, p.countryId)}
      icon={<CentralBankMedallion size={32} />}
      onClose={closePanel}
      advisor={{ text: advisor }}
      hero={<CentralBankArt />}
    >
      <div class="stack">
        <Card>
          <div class="cb-rate-head">
            <div>
              <div class="cb-rate-label">Policy rate</div>
              <div class="cb-rate">{pct(c.policyRate)}</div>
            </div>
            <Badge
              tone={c.phase === 'recession' ? 'bad' : c.phase === 'slowdown' ? 'warn' : 'good'}
            >
              {PHASE_LABEL[c.phase]}
            </Badge>
          </div>
          {spec.peggedTo && (
            <p class="muted small">
              Pegged to the {COUNTRIES[spec.peggedTo].centralBank}: its rate plus{' '}
              {pct(spec.pegSpread ?? 0)}.
            </p>
          )}
          <Row label="Last decision" value={decisionText(s, anchor)} />
          <Row
            label="Next meeting"
            value={next !== undefined ? gameDate(s.meta.startDate, next) : '—'}
          />
          <Row label="Inflation target" value={pctPlain(spec.inflationTarget || 0)} tone="dim" />
        </Card>

        <div>
          <SectionTitle>Indicators</SectionTitle>
          <Card>
            <Row label="GDP growth, last quarter" value={pctPlain(lastQuarterGdp(c))} />
            <Row label="GDP forecast, this quarter" value={pctPlain(gdpForecast(s, c))} />
            <Row label="Inflation" value={pctPlain(c.inflation)} />
            <Row label="Unemployment" value={pctPlain(c.unemployment)} />
            <Row
              label="House prices, past year"
              value={yoy === undefined ? '—' : signedPct(yoy, 1)}
              tone={yoy === undefined ? 'dim' : yoy < 0 ? 'bad' : 'good'}
            />
          </Card>
        </div>

        <div>
          <SectionTitle>Yield curve</SectionTitle>
          <Card>
            <div class="cb-curve-head">
              <span class="muted small">
                Policy rate plus term premium {signedPct(c.termPremium)}
              </span>
              {inverted && <Badge tone="warn">Inverted</Badge>}
            </div>
            <YieldCurveChart curve={curve} />
          </Card>
        </div>

        {home ? (
          <CentralBankFacility />
        ) : (
          <Card>
            <div class="tr-card-title">Standing lending facility</div>
            <p class="muted small">
              {licensed
                ? `Your treasury banks with the ${COUNTRIES[homeCountry(s).id].centralBank}, so its window is where you borrow in an emergency.`
                : `You have no banking licence in ${theCountryName(p.countryId)} yet, so the ${spec.centralBank} won't lend to you.`}
            </p>
          </Card>
        )}
      </div>
    </Panel>
  );
}
