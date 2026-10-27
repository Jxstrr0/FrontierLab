// A partnership deal at an employer or university (SCREENS §14): the signing
// fee and contract length, the expected-ARR curve, the package and host
// branch pickers and Sign, with the reason shown when it can't be signed. Once
// signed it shows the Yours card instead (YoursCard.tsx). Used for payroll at
// employers and universities, and for the university's student partnership.
import { useState } from 'preact/hooks';
import { PARTNER_CONTRACT_WEEKS, WEEKS_PER_YEAR } from '../../config/balance';
import * as cmd from '../../sim/commands';
import {
  hostCandidates,
  packageOptions,
  signingFee,
  type PartnershipKind,
} from '../../sim/partnerships';
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import type { Branch, Site } from '../../sim/state';
import { Card, LineChart, Row } from '../components';
import { count, money } from '../format/format';
import { act, toast, useGame } from '../store';
import { defaultHost, defaultPackage, expectedCurve, productName } from './partnerView';
import { YoursCard } from './YoursCard';

export function DealCard(p: { site: Site; kind: PartnershipKind; people: number }) {
  const s = useGame();
  const mine = cmd.activePartnership(s, p.site.id, p.kind);
  if (mine) return <YoursCard site={p.site} partnership={mine} />;
  return <Deal {...p} />;
}

function Deal(p: { site: Site; kind: PartnershipKind; people: number }) {
  const s = useGame();
  const sym = s.settings.currency;
  const { site, kind } = p;
  const hosts = hostCandidates(s, site.cityId);
  const [hostPick, setHost] = useState<string | undefined>(undefined);
  const hostId = hosts.some((b) => b.id === hostPick) ? hostPick : defaultHost(s, site);
  const host = hostId ? s.branches[hostId] : undefined;
  const options = host ? packageOptions(s, host) : [];
  const [pkgPick, setPkg] = useState<string | undefined>(undefined);
  const pkg = pkgPick && options.includes(pkgPick) ? pkgPick : defaultPackage(s, hostId, kind);
  const fee = signingFee(s, site, kind);
  const curve = expectedCurve(site, kind);
  const regional = CITIES[site.cityId]?.regional ? CITIES[site.cityId]!.country : undefined;
  const blocker =
    hosts.length === 0
      ? regional
        ? `You need an open sales office in ${COUNTRIES[regional].name} to host the plans.`
        : 'You need an open sales office in this city to host the plans.'
      : cmd.signBlocker(s, site.id, hostId ?? '', pkg ?? '', kind);
  // Hosts in other cities (a regional site's) carry their city's name.
  const hostLabel = (b: Branch) =>
    b.cityId === site.cityId ? b.name : `${b.name} · ${CITIES[b.cityId]?.name ?? b.cityId}`;
  const years = Math.round(PARTNER_CONTRACT_WEEKS / WEEKS_PER_YEAR);

  const sign = () => {
    if (!hostId || !pkg) return;
    const r = act(cmd.signPartnership, site.id, hostId, pkg, kind);
    if (r.ok) toast(`Partnership signed with ${site.employer?.name ?? site.refId}.`, 'good');
  };

  return (
    <Card class="pt-deal">
      <div class="pt-deal-head">
        <div class="pt-deal-name">{kind === 'student' ? 'Student plans' : 'Staff plans'}</div>
        <span class="small muted">
          {count(p.people)} {kind === 'student' ? 'students' : 'staff'}
        </span>
      </div>
      <Row label="Signing fee" value={money(fee, sym)} strong />
      <Row label="Contract" value={`${years} years`} />
      <Row label="Peak ARR" value={money(Math.max(...curve), sym)} tone="good" />
      <LineChart
        label="Expected ARR over the contract"
        series={[{ label: 'Expected ARR', values: curve, tone: 'brass' }]}
        startLabel="Year 1"
        endLabel={`Year ${years}`}
        markerIndex={0}
      />
      {hosts.length > 0 && (
        <>
          <Picker
            label="Host sales office"
            value={hostId}
            options={hosts.map((b) => ({ value: b.id, label: hostLabel(b) }))}
            onChange={(v) => {
              setHost(v);
              setPkg(undefined);
            }}
          />
          {options.length > 0 ? (
            <Picker
              label="Package"
              value={pkg}
              options={options.map((pid) => ({ value: pid, label: productName(s, pid) }))}
              onChange={setPkg}
            />
          ) : (
            <p class="small tone-bad">This sales office offers no plans to package.</p>
          )}
        </>
      )}
      <button type="button" class="btn btn-primary btn-block" disabled={!!blocker} onClick={sign}>
        Sign partnership · {money(fee, sym)}
      </button>
      <p class={`small pt-center ${blocker ? 'tone-bad' : 'muted'}`}>
        {blocker ?? `Corporate cash ${money(s.company.cash, sym)}`}
      </p>
    </Card>
  );
}

/** Wrapping choice buttons (44 px tall) for the host and package. */
function Picker(p: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div class="pt-picker">
      <div class="small muted">{p.label}</div>
      <div class="pt-choices" role="radiogroup" aria-label={p.label}>
        {p.options.map((o) => (
          <button
            type="button"
            role="radio"
            aria-checked={o.value === p.value}
            class={`pt-choice${o.value === p.value ? ' is-active' : ''}`}
            onClick={() => p.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
