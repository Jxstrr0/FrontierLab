// Build branch (SCREENS §4): five part tiles, a picker sheet per tile and an
// itemized summary. Build runs the buildBranch command, then opens the new branch.
import { useState } from 'preact/hooks';
import { BUILD_SLOTS, EQUIPMENT, type BuildSlot, type BuildSpec } from '../../data/equipment';
import * as cmd from '../../sim/commands';
import { districtName } from '../city/lotInfo';
import { Card, CoinRating, Panel, Row, SectionTitle } from '../components';
import { moneyFull } from '../format/format';
import { act, closePanel, openPanel, toast, useGame } from '../store';
import { defaultBuild, SLOT_LABEL } from './builds';
import { PartPicker } from './PartPicker';
import { SlotIcon } from './SlotIcon';
import './build.css';
import { BranchArt } from '../branch/BranchArt';
import { CITIES } from '../../data/cities';
import { ATTENTION } from '../../config/balance';
import { cashCoverWeeks } from '../../sim/cashCover';
import { coverText } from '../company/CompanyPanel';

export function BuildPanel(p: { lotId: string }) {
  const s = useGame();
  const lot = s.world.lots[p.lotId];
  const [build, setBuild] = useState<BuildSpec>(() => defaultBuild(s, p.lotId));
  const [picking, setPicking] = useState<BuildSlot | null>(null);
  const sym = s.settings.currency;

  if (!lot) {
    return (
      <Panel title="Build branch" onClose={closePanel}>
        <p class="muted">That storefront no longer exists.</p>
      </Panel>
    );
  }

  const quote = cmd.buildQuote(s, p.lotId, build);
  const blocker = cmd.buildBlocker(s, p.lotId, build);
  const short = s.company.cash < quote.total;
  const after = s.company.cash - quote.total;
  const cover = short ? null : cashCoverWeeks(s, after);
  const thin = cover !== null && cover < ATTENTION.cashCoverWeeks;

  const doBuild = () => {
    const r = act(cmd.buildBranch, { lotId: p.lotId, build });
    if (!r.ok) return;
    toast('Opening in 1 week', 'good');
    openPanel({ type: 'branch', branchId: r.branchId });
  };

  return (
    <>
      <Panel
        title="Build branch"
        subtitle={`${lot.address} · ${districtName(lot)}`}
        onClose={closePanel}
        hero={
          <BranchArt
            exterior={build.exterior}
            brandInk={s.meta.brandInk}
            monogram={s.meta.monogram}
            ink={CITIES[lot.cityId]?.ink}
          />
        }
        footer={
          <div class="stack">
            {blocker && <p class="build-blocker small">{blocker}</p>}
            <button
              type="button"
              class="btn btn-primary btn-block"
              disabled={!!blocker}
              onClick={doBuild}
              data-tutorial="build-confirm"
            >
              Build for {moneyFull(quote.total, sym)}
            </button>
          </div>
        }
      >
        <div class="stack">
          <SectionTitle>Parts</SectionTitle>
          {BUILD_SLOTS.map((slot) => {
            const part = EQUIPMENT[build[slot]]!;
            return (
              <button type="button" class="part-tile" onClick={() => setPicking(slot)}>
                <SlotIcon slot={slot} />
                <span class="part-tile-main">
                  <span class="muted small">{SLOT_LABEL[slot]}</span>
                  <span class="part-tile-name">{part.name}</span>
                  <CoinRating
                    value={slot === 'vault' ? (part.security ?? 0) : part.quality}
                    size={12}
                    showNumber={false}
                  />
                </span>
                <span class="part-tile-price">
                  {part.cost === 0 ? 'Free' : moneyFull(part.cost, sym)}
                </span>
              </button>
            );
          })}

          <SectionTitle>Summary</SectionTitle>
          <Card>
            {BUILD_SLOTS.map((slot) => (
              <Row
                label={EQUIPMENT[build[slot]]!.name}
                value={
                  EQUIPMENT[build[slot]]!.cost === 0
                    ? 'Free'
                    : moneyFull(EQUIPMENT[build[slot]]!.cost, sym)
                }
              />
            ))}
            <Row label="Parts subtotal" value={moneyFull(quote.parts, sym)} />
            <Row label="Lease deposit" value={moneyFull(quote.deposit, sym)} />
            <Row label="First week's rent" value={moneyFull(quote.rent, sym)} />
            <Row label="Total" value={moneyFull(quote.total, sym)} strong />
            <Row
              label="Cash available"
              value={moneyFull(s.company.cash, sym)}
              tone={short ? 'bad' : 'good'}
            />
            <Row
              label="Cash after build"
              value={short ? 'Short' : moneyFull(after, sym)}
              tone={short || thin ? 'bad' : 'good'}
              strong
            />
            {cover !== null && (
              <Row
                label="Cash cover after"
                value={`${coverText(cover)} of costs`}
                tone={thin ? 'bad' : 'dim'}
              />
            )}
          </Card>
          <p class="muted small">
            The branch opens after a one-week fit-out.
            {thin &&
              ` A new branch loses money for its first couple of months; this would leave under ${ATTENTION.cashCoverWeeks} weeks of running costs in hand.`}
          </p>
        </div>
      </Panel>
      {picking && (
        <PartPicker
          slot={picking}
          current={build[picking]}
          sym={sym}
          onSelect={(id) => {
            setBuild({ ...build, [picking]: id });
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  );
}
