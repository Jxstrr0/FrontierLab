// HUD over the map (SCREENS §0.2): bank medallion and cash (→ Company), the
// date pill with speed control and a next-week step, the Layers button (with the map), the city
// pill (Stage 8: tap for the Travel sheet) and the Menu button.
import { FEATURES } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { PlaneIcon } from '../airport/AirportMedallion';
import { Medallion } from '../components';
import { gameDate, money } from '../format/format';
import { pause, setSpeed, stepWeek } from '../loop';
import { CasesChip } from '../incidents/CasesChip';
import { LayerIcon } from '../map/LayerIcon';
import { openPanel, sheet, useGame } from '../store';

const NEXT_SPEED = { 0: 1, 1: 2, 2: 4, 4: 1 } as const;

export function Hud() {
  const s = useGame();
  const paused = s.clock.speed === 0;
  const sym = s.settings.currency;
  const city = CITIES[s.world.currentCityId];
  return (
    <>
      <div class="hud-top">
        <button
          type="button"
          class="hud-chip hud-bank"
          onClick={() => openPanel({ type: 'company' })}
        >
          <Medallion ink={s.meta.brandInk} monogram={s.meta.monogram} size={30} />
          <span class="hud-cash">
            <span class="hud-cash-label">Cash</span>
            <span class={`hud-cash-value${s.company.cash < 0 ? ' tone-bad' : ''}`}>
              {money(s.company.cash, sym)}
            </span>
          </span>
        </button>
        <div class="hud-right">
          <div class={`hud-chip hud-time${paused ? ' is-paused' : ''}`}>
            <button
              type="button"
              class="hud-date"
              aria-label={paused ? 'Resume' : 'Change speed'}
              onClick={() => setSpeed(paused ? s.settings.defaultSpeed : NEXT_SPEED[s.clock.speed])}
            >
              <span>{gameDate(s.meta.startDate, s.clock.day)}</span>
              {!paused && <span class="hud-speed">{s.clock.speed}×</span>}
            </button>
            <button
              type="button"
              class="hud-pause"
              data-tutorial="play"
              aria-label={paused ? 'Play' : 'Pause'}
              onClick={() => (paused ? setSpeed(s.settings.defaultSpeed) : pause())}
            >
              {paused ? '▶' : '❚❚'}
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
          {FEATURES.competition && <CasesChip />}
        </div>
      </div>
      <div class="hud-bottom">
        {FEATURES.cityMap && (
          <button
            type="button"
            class="hud-chip hud-layers"
            aria-label="Map layers"
            onClick={() => (sheet.value = 'layers')}
          >
            <LayerIcon id="branches" size={22} />
            <span>Layers</span>
          </button>
        )}
        {FEATURES.multiCity ? (
          <button
            type="button"
            class="hud-chip hud-city is-tappable"
            aria-label={`${city?.name ?? ''}. Travel`}
            onClick={() => (sheet.value = 'travel')}
          >
            <PlaneIcon size={16} filled />
            <span>{city?.name ?? ''}</span>
          </button>
        ) : (
          <div class="hud-chip hud-city">{city?.name ?? ''}</div>
        )}
        <button type="button" class="hud-chip hud-menu" onClick={() => (sheet.value = 'menu')}>
          Menu
        </button>
      </div>
    </>
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
