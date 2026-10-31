// HUD over the map (SCREENS §0.2): lab medallion and cash (→ Company), the
// date pill with speed control and a next-week step, why the game paused, a row
// of status chips (Skip ahead, the quarter's Board meeting, open cases, weeks in
// the red), the Layers button, the city pill (tap for the Travel sheet) and the
// Menu button.
import { CITIES } from '../../data/cities';
import { PlaneIcon } from '../airport/AirportMedallion';
import { Icon, Medallion } from '../components';
import { gameDate, money } from '../format/format';
import { boardChipQuarter, pause, resume, setSpeed, skipAhead, skipping, stepWeek } from '../loop';
import { boardDue, quarterLabel } from '../../sim/governance';
import { FAILURE } from '../../config/balance';
import { CasesChip } from '../incidents/CasesChip';
import { LayerIcon } from '../map/LayerIcon';
import { clockHeld, modal, openPanel, sheet, useGame } from '../store';

const NEXT_SPEED = { 0: 1, 1: 2, 2: 4, 4: 1 } as const;

export function Hud() {
  const s = useGame();
  const paused = s.clock.speed === 0;
  // Any panel, sheet or popup holds the clock (loop.ts), so the pill reads paused too.
  const held = paused || clockHeld();
  const sym = s.settings.currency;
  const city = CITIES[s.world.currentCityId];
  return (
    <>
      <div class="hud-top">
        <button
          type="button"
          class="hud-chip hud-bank"
          data-tutorial="hud-bank"
          onClick={() => openPanel({ type: 'company' })}
        >
          <Medallion
            ink={s.meta.brandInk}
            monogram={s.meta.monogram}
            shape={s.meta.logoShape}
            size={30}
          />
          <span class="hud-cash">
            <span class="hud-cash-label">Cash</span>
            <span class={`hud-cash-value${s.company.cash < 0 ? ' tone-bad' : ''}`}>
              {money(s.company.cash, sym)}
            </span>
          </span>
        </button>
        <div class="hud-right">
          <div class={`hud-chip hud-time${held ? ' is-paused' : ''}`}>
            <button
              type="button"
              class="hud-date"
              aria-label={paused ? 'Resume' : 'Change speed'}
              onClick={() => (paused ? resume() : setSpeed(NEXT_SPEED[s.clock.speed]))}
            >
              <span>{gameDate(s.meta.startDate, s.clock.day)}</span>
              {!held && (
                <span class="hud-speed">{skipping.value ? 'Skip' : `${s.clock.speed}×`}</span>
              )}
            </button>
            <button
              type="button"
              class="hud-pause"
              data-tutorial="play"
              aria-label={paused ? 'Play' : 'Pause'}
              onClick={() => (paused ? resume() : pause())}
            >
              <Icon
                name={held ? 'play' : 'pause'}
                size={20}
                class={held ? 'icon-solid' : undefined}
              />
            </button>
            <button
              type="button"
              class="hud-step"
              aria-label="Next week"
              disabled={!!s.flags.gameOver}
              onClick={stepWeek}
            >
              <NextWeekIcon />
            </button>
          </div>
          {paused && s.clock.pausedReason && !clockHeld() && (
            <div class="hud-reason">{s.clock.pausedReason}</div>
          )}
          <div class="hud-status">
            {s.company.cash < 0 && !s.flags.gameOver && (
              <button
                type="button"
                class="hud-chip hud-red"
                aria-label="Cash below zero. Open Company"
                onClick={() => openPanel({ type: 'company' })}
              >
                In the red {Math.min(s.company.negativeCashWeeks, FAILURE.insolvencyWeeks)}/
                {FAILURE.insolvencyWeeks}
              </button>
            )}
            {boardChipQuarter.value === quarterLabel(s) && boardDue(s) && (
              <button
                type="button"
                class="hud-chip hud-board"
                aria-label="The board is ready to meet. Hold the meeting"
                onClick={() => (modal.value = { type: 'boardMeeting' })}
              >
                Board
              </button>
            )}
            <CasesChip />
            {!s.flags.gameOver && (
              <button
                type="button"
                class={`hud-chip hud-skip${skipping.value ? ' is-on' : ''}`}
                aria-label={skipping.value ? 'Stop skipping' : 'Skip ahead to the end of the month'}
                onClick={skipAhead}
              >
                <SkipIcon />
                <span>{skipping.value ? 'Stop' : 'Skip'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <div class="hud-bottom">
        <button
          type="button"
          class="hud-chip hud-layers"
          aria-label="Map layers"
          onClick={() => (sheet.value = 'layers')}
        >
          <LayerIcon id="branches" size={22} />
          <span>Layers</span>
        </button>
        <button
          type="button"
          class="hud-chip hud-city is-tappable"
          aria-label={`${city?.name ?? ''}. Travel`}
          data-tutorial="hud-travel"
          onClick={() => (sheet.value = 'travel')}
        >
          <PlaneIcon size={16} filled />
          <span>{city?.name ?? ''}</span>
        </button>
        <button
          type="button"
          class="hud-chip hud-menu"
          data-tutorial="hud-menu"
          onClick={() => (sheet.value = 'menu')}
        >
          <Icon name="menu" size={20} />
          <span>Menu</span>
        </button>
      </div>
    </>
  );
}

/** Double-arrow-to-bar glyph for Skip ahead, in SVG so iOS doesn't swap it for an emoji. */
function SkipIcon() {
  return (
    <svg width="20" height="18" viewBox="0 0 20 18" aria-hidden="true">
      <path d="M2 3.5 L8.5 9 L2 14.5 Z M8.5 3.5 L15 9 L8.5 14.5 Z" fill="currentColor" />
      <rect x="15.5" y="3.5" width="2.5" height="11" fill="currentColor" />
    </svg>
  );
}

/** Play-to-bar glyph drawn in SVG so iOS doesn't swap it for an emoji. */
function NextWeekIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 3.5 L11 9 L3 14.5 Z" fill="currentColor" />
      <rect x="12.5" y="3.5" width="2.5" height="11" fill="currentColor" />
    </svg>
  );
}
