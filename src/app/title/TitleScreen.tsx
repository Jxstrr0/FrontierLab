// Title screen (docs/SCREENS.md §1): engraved wordmark, main menu and version.
// In Stage 0 the menu buttons are shown but disabled until the game loop exists.
import { FEATURES } from '../../config/balance';
import { CornerRosette } from './CornerRosette';
import { Rosette } from './Rosette';
import './title.css';

export function TitleScreen() {
  const playable = FEATURES.playableLoop;
  return (
    <main class="title">
      <div class="title-frame">
        <CornerRosette corner="tl" />
        <CornerRosette corner="tr" />
        <CornerRosette corner="bl" />
        <CornerRosette corner="br" />

        <div class="title-lockup">
          <Rosette />
          <div class="title-words">
            <h1 class="title-wordmark">
              <span>Vault</span>
              <span>Street</span>
            </h1>
            <div class="title-rule" aria-hidden="true">
              <span>◆</span>
            </div>
            <p class="title-tagline">Found a bank. Build an empire.</p>
          </div>
        </div>

        <nav class="title-menu" aria-label="Main menu">
          <button class="btn btn-primary" type="button" disabled={!playable}>
            New game
          </button>
          <button class="btn btn-secondary" type="button" disabled={!playable}>
            Continue
          </button>
          {!playable && <p class="title-soon">The doors open soon.</p>}
        </nav>

        <footer class="title-footer">
          <span>A Longlight Interactive game</span>
          <span class="title-version">v{__APP_VERSION__}</span>
        </footer>
      </div>
    </main>
  );
}
