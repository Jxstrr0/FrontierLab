// HUD over the map (SCREENS §0.2): bank medallion and cash (→ Company), the
// date pill with speed control, the city pill and the Menu button.
import { CITIES } from '../../data/cities';
import { Medallion } from '../components';
import { gameDate, money } from '../format/format';
import { pause, setSpeed } from '../loop';
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
        <div class={`hud-chip hud-time${paused ? ' is-paused' : ''}`}>
          <button
            type="button"
            class="hud-date"
            aria-label={paused ? 'Resume' : 'Change speed'}
            onClick={() => setSpeed(paused ? s.settings.defaultSpeed : NEXT_SPEED[s.clock.speed])}
          >
            <span>{gameDate(s.meta.startDate, s.clock.day)}</span>
            <span class="hud-speed">{paused ? '❚❚' : `${s.clock.speed}×`}</span>
          </button>
          <button
            type="button"
            class="hud-pause"
            aria-label={paused ? 'Play' : 'Pause'}
            onClick={() => (paused ? setSpeed(s.settings.defaultSpeed) : pause())}
          >
            {paused ? '▶' : '❚❚'}
          </button>
        </div>
      </div>
      <div class="hud-bottom">
        <div class="hud-chip hud-city">{city?.name ?? ''}</div>
        <button type="button" class="hud-chip hud-menu" onClick={() => (sheet.value = 'menu')}>
          Menu
        </button>
      </div>
    </>
  );
}
