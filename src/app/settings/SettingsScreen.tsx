// Settings (SCREENS §26). In game, changes go through the setSettings command and
// are saved with the game. From the title they edit the saved preferences, which
// every new game starts with.
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import {
  CURRENCY_SYMBOLS,
  DEFAULT_SPEEDS,
  DISTANCE_UNITS,
  TEXT_SCALES,
  WEEKLY_RESULTS_MODES,
} from '../../data/settingsOptions';
import { setFounderAvatar, setSettings } from '../../sim/commands';
import { DEFAULT_SETTINGS } from '../../sim/newGame';
import type { Settings } from '../../sim/state';
import { Panel, Row, SectionTitle, Segmented, Sheet, Toggle } from '../components';
import { AvatarPicker } from '../newgame/AvatarPicker';
import { loadPrefs, savePrefs } from '../saves';
import { openCredits } from '../credits/CreditsScreen';
import { play, unlockAudio } from '../sound/sound';
import { act, bump, closePanel, openPanel, peekGame, rev, screen } from '../store';
import { TutorialSetting } from './TutorialSetting';
import './settings.css';
import './standalone.css';

const WEEKLY_LABEL: Record<Settings['weeklyResults'], string> = {
  weekly: 'Weekly',
  quarterly: 'Quarterly',
  off: 'Off',
};

export function SettingsScreen(p: { inGame?: boolean }) {
  void rev.value;
  const game = p.inGame ? peekGame() : null;
  const s: Settings = game ? game.settings : { ...DEFAULT_SETTINGS, ...loadPrefs() };
  const [editingAvatar, setEditingAvatar] = useState(false);

  const change = (patch: Partial<Settings>) => {
    if (game) act(setSettings, patch);
    else {
      savePrefs({ ...loadPrefs(), ...patch });
      bump();
    }
  };

  return (
    <div class={p.inGame ? undefined : 'standalone'}>
      <Panel
        title="Settings"
        subtitle={game ? undefined : 'Used for every new game'}
        onClose={p.inGame ? closePanel : () => (screen.value = 'title')}
      >
        <div class="stack settings">
          <SectionTitle>Display</SectionTitle>
          <Setting label="Currency symbol">
            <Segmented
              label="Currency symbol"
              value={s.currency}
              options={CURRENCY_SYMBOLS.map((c) => ({ value: c, label: c }))}
              onChange={(currency) => change({ currency })}
            />
          </Setting>
          <Setting label="Distance units">
            <Segmented
              label="Distance units"
              value={s.units}
              options={DISTANCE_UNITS.map((u) => ({ value: u, label: u }))}
              onChange={(units) => change({ units })}
            />
          </Setting>
          <Setting label="Text size">
            <Segmented
              label="Text size"
              value={String(s.textScale)}
              options={TEXT_SCALES.map((t) => ({
                value: String(t),
                label: `${Math.round(t * 100)}%`,
              }))}
              onChange={(v) => change({ textScale: Number(v) as Settings['textScale'] })}
            />
          </Setting>
          <Toggle
            label="Reduced motion"
            hint="Skips slides and fades."
            checked={s.reducedMotion}
            onChange={(reducedMotion) => change({ reducedMotion })}
          />

          <SectionTitle>Play</SectionTitle>
          <Setting label="Weekly results">
            <Segmented
              label="Weekly results"
              value={s.weeklyResults}
              options={WEEKLY_RESULTS_MODES.map((m) => ({ value: m, label: WEEKLY_LABEL[m] }))}
              onChange={(weeklyResults) => change({ weeklyResults })}
            />
          </Setting>
          <Setting label="Default speed">
            <Segmented
              label="Default speed"
              value={String(s.defaultSpeed)}
              options={DEFAULT_SPEEDS.map((v) => ({ value: String(v), label: `${v}×` }))}
              onChange={(v) => change({ defaultSpeed: Number(v) as Settings['defaultSpeed'] })}
            />
          </Setting>
          <Toggle
            label="Pause for expiring applications"
            hint="Stops time when a loan application is about to lapse."
            checked={s.autoPauseApplications}
            onChange={(autoPauseApplications) => change({ autoPauseApplications })}
          />
          <Toggle
            label="Pause for incidents"
            hint="Stops time when something goes wrong. Incidents arrive in a later stage."
            checked={s.autoPauseIncidents}
            onChange={(autoPauseIncidents) => change({ autoPauseIncidents })}
          />
          <Toggle
            label="Sound"
            hint="Soft clinks, stamps and latches. Off until you switch it on."
            checked={s.sound}
            onChange={(sound) => {
              change({ sound });
              // Inside the tap, so iOS lets audio start; a clink confirms it works.
              if (sound) {
                unlockAudio();
                play('coin');
              }
            }}
          />

          <SectionTitle>Tutorial</SectionTitle>
          <TutorialSetting inGame={!!game} />

          <SectionTitle>Founder</SectionTitle>
          {game ? (
            <>
              <Row label="Founder" value={game.meta.founderName} />
              <button
                type="button"
                class="btn btn-secondary btn-block"
                onClick={() => setEditingAvatar(true)}
              >
                Edit founder avatar
              </button>
            </>
          ) : (
            <p class="muted small">
              Choose your founder's look when you start a new game. You can change it later from
              Settings.
            </p>
          )}

          <SectionTitle>About</SectionTitle>
          <button
            type="button"
            class="btn btn-secondary btn-block"
            onClick={() => (game ? openPanel({ type: 'credits' }) : openCredits('settings'))}
          >
            Credits
          </button>
        </div>
      </Panel>
      {game && editingAvatar && (
        <Sheet title="Founder avatar" onClose={() => setEditingAvatar(false)}>
          <AvatarPicker
            value={game.meta.founderAvatar}
            onChange={(part, index) => act(setFounderAvatar, { [part]: index })}
          />
          <button
            type="button"
            class="btn btn-primary btn-block settings-done"
            onClick={() => setEditingAvatar(false)}
          >
            Done
          </button>
        </Sheet>
      )}
    </div>
  );
}

/** A label above a control. */
function Setting(p: { label: string; children: ComponentChildren }) {
  return (
    <div class="setting">
      <div class="setting-label">{p.label}</div>
      {p.children}
    </div>
  );
}
