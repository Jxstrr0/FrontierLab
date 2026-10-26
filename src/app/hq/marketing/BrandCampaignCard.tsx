// One brand campaign card on the Marketing floor (SCREENS §10, CONTENT §11):
// name, a scope Segmented where the campaign runs per city or per country,
// where it would run (the city picked on the floor, or its country) and where
// else it runs, weekly cost and awareness gain, segment boosts, and Start /
// Stop. Campaigns that can't run yet (arena naming rights) show why.
import { useState } from 'preact/hooks';
import { SEGMENT_SPECS } from '../../../data/segments';
import type { BrandCampaignSpec } from '../../../data/brandCampaigns';
import * as cmd from '../../../sim/commands';
import { brandCampaignCost } from '../../../sim/hqMarketing';
import { campaignMult } from '../../../sim/hq';
import type { SegmentId } from '../../../data/types';
import { Badge, Card, Row, Segmented, SpotArt } from '../../components';
import { dayOfWeek } from '../../branch/selectors';
import { money, shortDate } from '../../format/format';
import { act, toast, useGame } from '../../store';
import {
  campaignBlocker,
  pointsText,
  runningAt,
  runningElsewhere,
  SCOPE_LABEL,
  scopeTarget,
  targetName,
  type Scope,
} from './marketingView';

export function BrandCampaignCard({ spec, cityId }: { spec: BrandCampaignSpec; cityId: string }) {
  const s = useGame();
  const sym = s.settings.currency;
  // Open on the scope that's already running, if any.
  const initial =
    spec.scopes.find((sc) => runningAt(s, spec.id, sc, scopeTarget(cityId, sc))) ?? spec.scopes[0]!;
  const [scope, setScope] = useState<Scope>(initial);
  const target = scopeTarget(cityId, scope);
  const running = runningAt(s, spec.id, scope, target);
  const elsewhere = runningElsewhere(s, spec.id, { scope, targetId: target });
  const blocker = campaignBlocker(spec, s, cityId);
  const cost = brandCampaignCost(s, spec, scope);
  const gain = (spec.gainPerWeek[scope] ?? 0) * campaignMult(s);
  const boosts = Object.entries(spec.segmentBoost ?? {}) as [SegmentId, number][];

  const start = () => {
    const r = act(cmd.startBrandCampaign, { campaignId: spec.id, scope, targetId: target });
    if (r.ok) toast(`${spec.name} started in ${targetName(scope, target)}.`, 'good');
  };
  const stop = () => {
    if (!running) return;
    const r = act(cmd.stopBrandCampaign, running.id);
    if (r.ok) toast(`${spec.name} stopped.`, 'info');
  };

  return (
    <Card class={`mk-campaign${blocker ? ' is-locked' : ''}`}>
      <div class="mk-campaign-head">
        <SpotArt group="brand" id={spec.id} size={44} />
        <div class="mk-campaign-name">{spec.name}</div>
        {running ? (
          <Badge tone="good">Running</Badge>
        ) : blocker ? (
          <Badge tone="info">Locked</Badge>
        ) : null}
      </div>
      {spec.scopes.length > 1 ? (
        <Segmented
          label={`${spec.name} scope`}
          options={spec.scopes.map((sc) => ({ value: sc, label: SCOPE_LABEL[sc] }))}
          value={scope}
          onChange={setScope}
        />
      ) : (
        <span class="muted small">{scope === 'city' ? 'Runs per city' : 'Runs countrywide'}</span>
      )}
      <Row label={scope === 'city' ? 'City' : 'Country'} value={targetName(scope, target)} />
      {elsewhere && <Row label="Also running in" value={elsewhere} tone="dim" />}
      <Row label="Cost" value={`${money(cost, sym)} /week`} strong />
      <Row
        label="Brand awareness"
        value={`${pointsText(gain)} /week`}
        tone={blocker ? 'dim' : 'good'}
      />
      {boosts.length > 0 && (
        <div class="mk-boosts">
          {boosts.map(([seg, m]) => (
            <Badge tone="info">
              {SEGMENT_SPECS[seg]?.name ?? seg} +{Math.round((m - 1) * 100)}%
            </Badge>
          ))}
        </div>
      )}
      {blocker ? (
        <p class="muted small mk-note">{blocker}</p>
      ) : running ? (
        <>
          <p class="muted small mk-note">
            Since {shortDate(s.meta.startDate, dayOfWeek(running.startWeek))}. Gains shrink as
            awareness fills up.
          </p>
          <button type="button" class="btn btn-secondary btn-block" onClick={stop}>
            Stop
          </button>
        </>
      ) : (
        <button type="button" class="btn btn-primary btn-block" onClick={start}>
          Start · {money(cost, sym)} /week
        </button>
      )}
    </Card>
  );
}
