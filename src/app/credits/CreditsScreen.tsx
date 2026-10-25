// Credits (ROADMAP Stage 10): who made the game, the typefaces and the
// libraries it ships with and their licences. Reached from the title screen
// and from Settings (on the title, or in game where it opens as a panel).
import { Card, Panel, Rule, SectionTitle } from '../components';
import { openPanel, screen } from '../store';
import { creditsReturn } from './openCredits';
import '../settings/standalone.css';
import './credits.css';

/** The runtime libraries in package.json "dependencies" (fonts are listed under Type). */
const LIBRARIES = [
  { name: 'Preact', use: 'the interface', licence: 'MIT License' },
  { name: 'Preact Signals', use: 'the game state the screens read', licence: 'MIT License' },
  { name: 'lz-string', use: 'compact save codes', licence: 'MIT License' },
];

const TYPEFACES = [
  { name: 'Bodoni Moda', use: 'titles and headline numbers' },
  { name: 'Public Sans', use: 'everything else' },
];

export function CreditsScreen(p: { inGame?: boolean }) {
  const back = p.inGame
    ? () => openPanel({ type: 'settings' })
    : () => (screen.value = creditsReturn());
  return (
    <div class={p.inGame ? undefined : 'standalone'}>
      <Panel title="Credits" onClose={back}>
        <div class="stack credits">
          <Card class="credits-card">
            <h1 class="credits-wordmark">Vault Street</h1>
            <Rule />
            <p class="credits-lead">A Longlight Interactive game</p>
            <p class="credits-role">
              Designed and produced by <strong>Kelbo</strong>
            </p>
            <p class="credits-role">Built with Claude Code</p>
          </Card>

          <SectionTitle>Type</SectionTitle>
          <ul class="credits-list">
            {TYPEFACES.map((t) => (
              <li>
                <span class="credits-name">{t.name}</span>
                <span class="muted small">
                  For {t.use}. SIL Open Font License 1.1, bundled with Fontsource.
                </span>
              </li>
            ))}
          </ul>

          <SectionTitle>Software</SectionTitle>
          <ul class="credits-list">
            {LIBRARIES.map((l) => (
              <li>
                <span class="credits-name">{l.name}</span>
                <span class="muted small">
                  For {l.use}. {l.licence}.
                </span>
              </li>
            ))}
          </ul>
          <p class="muted small">
            Made with Vite and TypeScript. Sounds are synthesized in your browser; the map, art and
            portraits are drawn by the game's own code.
          </p>

          <SectionTitle>Thanks</SectionTitle>
          <p class="small">
            Inspired by the tycoon genre and every late night spent building an empire one tap at a
            time. Every bank, company and person in the game is invented; any resemblance is a
            coincidence.
          </p>

          <button type="button" class="btn btn-secondary btn-block" onClick={back}>
            Back
          </button>
        </div>
      </Panel>
    </div>
  );
}
