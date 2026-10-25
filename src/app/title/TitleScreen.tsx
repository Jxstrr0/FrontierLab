// Title screen (docs/SCREENS.md §1): engraved wordmark, main menu, version and
// a "Check for updates" button (handy for the home-screen app on iPhone).
import { useState } from 'preact/hooks';
import { CornerRosette } from './CornerRosette';
import { latestSlot, loadFromSlot } from '../saves';
import { screen, setGame, toast } from '../store';
import { ToastHost } from '../components';
import { openCredits } from '../credits/openCredits';
import { checkForUpdate } from '../pwa/register';
import { Rosette } from './Rosette';
import './title.css';

export function TitleScreen() {
  const latest = latestSlot();
  const resume = () => {
    if (!latest) return;
    try {
      setGame(loadFromSlot(latest.slot));
      screen.value = 'game';
    } catch (e) {
      toast((e as Error).message, 'bad');
    }
  };
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
          {latest && (
            <button class="btn btn-primary" type="button" onClick={resume}>
              Continue
            </button>
          )}
          <button
            class={`btn ${latest ? 'btn-secondary' : 'btn-primary'}`}
            type="button"
            onClick={() => (screen.value = 'newgame')}
          >
            New game
          </button>
          <button class="btn btn-secondary" type="button" onClick={() => (screen.value = 'saves')}>
            Load
          </button>
          <button
            class="btn btn-secondary"
            type="button"
            onClick={() => (screen.value = 'settings')}
          >
            Settings
          </button>
          <button class="btn btn-secondary" type="button" onClick={() => openCredits('title')}>
            Credits
          </button>
        </nav>

        <footer class="title-footer">
          <span>A Longlight Interactive game</span>
          <span class="title-version">v{__APP_VERSION__}</span>
          <UpdateButton />
        </footer>
      </div>
      <ToastHost />
    </main>
  );
}

/** Checks for a new version on demand; when one is found the page reloads into it. */
function UpdateButton() {
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    const found = await checkForUpdate();
    if (found === 'updating') return; // the page is about to reload
    setBusy(false);
    if (found === 'latest') toast(`You have the latest version (v${__APP_VERSION__}).`, 'good');
    else toast('Couldn’t reach the site. Check your connection and try again.', 'bad');
  };
  return (
    <button type="button" class="title-update" disabled={busy} onClick={() => void check()}>
      {busy ? 'Checking…' : 'Check for updates'}
    </button>
  );
}
