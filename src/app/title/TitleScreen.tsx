// Title screen (docs/SCREENS.md §1, docs/COVER_SCREEN.md): the "Living skyline"
// cover (an engraved map of your current city, or a different city each launch
// for a new player), the wordmark and tagline, the main menu, and a footer with
// the version and a "Check for updates" button (handy for the home-screen app
// on iPhone). Two columns on wide screens.
import { useMemo, useState } from 'preact/hooks';
import { CITIES, START_CITIES } from '../../data/cities';
import { COVER_DOTS } from '../../config/cover';
import { latestSlot, loadCoverIndex, loadFromSlot, saveCoverIndex } from '../saves';
import { screen, setGame, toast } from '../store';
import { ToastHost } from '../components';
import { openCredits } from '../credits/openCredits';
import { checkForUpdate } from '../pwa/register';
import { nextCoverIndex, pickCoverCity, type CoverChoice } from './coverCity';
import { CoverSkyline } from './CoverSkyline';
import './title.css';

/** The rotation city for this launch: read once per page load, and the next one stored. */
let launchIndex: number | null = null;
function coverIndexThisLaunch(): number {
  if (launchIndex === null) {
    launchIndex = loadCoverIndex();
    saveCoverIndex(nextCoverIndex(launchIndex, START_CITIES.length));
  }
  return launchIndex;
}

export function TitleScreen() {
  const latest = latestSlot();
  const choice = useMemo(() => pickCoverCity(latest, coverIndexThisLaunch(), START_CITIES), []);
  const resume = async () => {
    if (!latest) return;
    try {
      setGame(await loadFromSlot(latest.slot));
      screen.value = 'game';
    } catch (e) {
      toast((e as Error).message, 'bad');
    }
  };
  return (
    <main class="title">
      <section class="title-cover">
        <CoverSkyline choice={choice} />
        <div class="title-caption">
          <Caption choice={choice} />
          <span class="title-dots" aria-hidden="true">
            {Array.from({ length: COVER_DOTS }, (_, i) => (
              <span class={i === 0 ? 'on' : undefined} />
            ))}
          </span>
        </div>
      </section>

      <div class="title-side">
        <div class="title-words">
          <h1 class="title-wordmark">Vault Street</h1>
          <p class="title-tagline">Found a bank. Build an empire.</p>
        </div>

        <nav class="title-menu" aria-label="Main menu">
          {latest && (
            <button class="btn btn-primary title-main" type="button" onClick={resume}>
              Continue
            </button>
          )}
          <button
            class={`btn title-main ${latest ? 'btn-secondary' : 'btn-primary'}`}
            type="button"
            onClick={() => (screen.value = 'newgame')}
          >
            New game
          </button>
          <div class="title-row">
            <button
              class="btn btn-secondary"
              type="button"
              onClick={() => (screen.value = 'saves')}
            >
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
          </div>
        </nav>

        <footer class="title-footer">
          <span>A Longlight Interactive game · v{__APP_VERSION__}</span>
          <UpdateButton />
        </footer>
      </div>
      <ToastHost />
    </main>
  );
}

/** "Now showing Saskatoon", or your bank and its city for a returning player. */
function Caption(p: { choice: CoverChoice }) {
  const city = CITIES[p.choice.cityId]?.name ?? '';
  const { bankName, brandInk, cover } = p.choice;
  if (!bankName) return <span class="title-now">Now showing {city}</span>;
  return (
    <span class="title-now">
      <span class="title-swatch" style={{ background: brandInk }} aria-hidden="true" />
      {bankName} · {cover ? city : `Now showing ${city}`}
    </span>
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
