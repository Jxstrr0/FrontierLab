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
import { DEV_PAYMENT, DEV_REROLL, DEV_STAFF } from '../../config/balance';
import {
  devPayment,
  setDevNoBankruptcy,
  setDevRerolls,
  setDevStaff,
  setFounderAvatar,
  setSettings,
} from '../../sim/commands';
import { DEFAULT_SETTINGS } from '../../sim/newGame';
import type { Settings } from '../../sim/state';
import { Panel, Row, SectionTitle, Segmented, Sheet, Toggle } from '../components';
import { AvatarPicker } from '../newgame/AvatarPicker';
import { money } from '../format/format';
import { loadDevTools, loadPrefs, saveDevTools, savePrefs } from '../saves';
import { openCredits } from '../credits/openCredits';
import { play, unlockAudio } from '../sound/sound';
import { act, bump, closePanel, openPanel, peekGame, rev, screen, toast } from '../store';
import { TutorialSetting } from './TutorialSetting';
import './settings.css';
import './standalone.css';

/** The developer tools only show with `?debug` in the address, or once already switched on. */
const DEBUG_URL =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

const WEEKLY_LABEL: Record<Settings['weeklyResults'], string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  off: 'Off',
};

export function SettingsScreen(p: { inGame?: boolean }) {
  void rev.value;
  const game = p.inGame ? peekGame() : null;
  const s: Settings = game ? game.settings : { ...DEFAULT_SETTINGS, ...loadPrefs() };
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [devTools, setDevTools] = useState(loadDevTools);

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
          <Setting label="Results">
            <Segmented
              label="Results"
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
            label="Pause for expiring proposal requests"
            hint="Stops time when a business's request for a proposal is about to lapse."
            checked={s.autoPauseApplications}
            onChange={(autoPauseApplications) => change({ autoPauseApplications })}
          />
          <Toggle
            label="Pause for incidents"
            hint="Stops time when something goes wrong that needs a decision. Notices that need no decision show as a message instead."
            checked={s.autoPauseIncidents}
            onChange={(autoPauseIncidents) => change({ autoPauseIncidents })}
          />
          <Toggle
            label="Open the annual report"
            hint="Shows the year's report at each year end. Off, it waits in The Ledger's archive."
            checked={s.annualReport}
            onChange={(annualReport) => change({ annualReport })}
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

          {(DEBUG_URL || devTools) && <SectionTitle>Developer</SectionTitle>}
          {(DEBUG_URL || devTools) && (
            <Toggle
              label="Developer tools"
              hint="Testing shortcuts. Saved on this device only."
              checked={devTools}
              onChange={(on) => {
                saveDevTools(on);
                setDevTools(on);
              }}
            />
          )}
          {devTools &&
            (game ? (
              <>
                <button
                  type="button"
                  class="btn btn-secondary btn-block"
                  onClick={() => {
                    if (act(devPayment).ok) {
                      toast(`${money(DEV_PAYMENT, s.currency)} added to company cash.`, 'good');
                    }
                  }}
                >
                  Add {money(DEV_PAYMENT, s.currency)} to company cash
                </button>
                <Toggle
                  label="Top staff"
                  hint={`Holds every team's skill and morale at ${DEV_STAFF.skill} or better, so you can test a high-staff game. Saved with this game.`}
                  checked={!!game.flags.devStaff}
                  onChange={(on) => act(setDevStaff, on)}
                />
                <Toggle
                  label="Free top rerolls"
                  hint={`New candidates for managers and executives cost nothing, and every one rolls ${DEV_REROLL.minSkill}–${DEV_REROLL.maxSkill} in each skill. Saved with this game.`}
                  checked={!!game.flags.devRerolls}
                  onChange={(on) => act(setDevRerolls, on)}
                />
                <Toggle
                  label="No bankruptcy"
                  hint="Weeks in the red never end the game. Cash can still go negative. Saved with this game."
                  checked={!!game.flags.devNoBankruptcy}
                  onChange={(on) => act(setDevNoBankruptcy, on)}
                />
              </>
            ) : (
              <p class="muted small">
                Open Settings from inside a game to use the developer tools.
              </p>
            ))}

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
            onChange={(parts) => act(setFounderAvatar, parts)}
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
