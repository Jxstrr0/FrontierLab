// Settings → Tutorial (SCREENS §26–27): in game, "Replay tutorial" starts
// Part 1 again from step 1, the Guides switch turns Part 2 on or off, and "Show
// the guides again" lets every guide and first-look tip show once more. On the
// title, the next new game can be set to open with the tutorial.
import { useState } from 'preact/hooks';
import * as cmd from '../../sim/commands';
import { Toggle } from '../components';
import { loadTutorialSeen, saveTutorialSeen } from '../saves';
import { act, closePanel, peekGame, toast, useGame } from '../store';
import { replayTutorial } from '../tutorial/controller';

export function TutorialSetting(p: { inGame: boolean }) {
  const [seen, setSeen] = useState(loadTutorialSeen);
  if (p.inGame && peekGame()) return <InGame />;
  return seen ? (
    <button
      type="button"
      class="btn btn-secondary btn-block"
      onClick={() => {
        saveTutorialSeen(false);
        setSeen(false);
      }}
    >
      Show the tutorial in my next game
    </button>
  ) : (
    <p class="muted small">Your next new game starts with the tutorial.</p>
  );
}

function InGame() {
  const s = useGame();
  const seenSome = s.flags.lessonsDone.length > 0;
  return (
    <div class="stack">
      <button
        type="button"
        class="btn btn-secondary btn-block"
        onClick={() => {
          closePanel();
          replayTutorial();
        }}
      >
        Replay tutorial
      </button>
      <Toggle
        label="Guides"
        hint="Show me each new part of the game when it opens up, and explain new screens the first time."
        checked={s.settings.guides}
        onChange={(v) => act(cmd.setSettings, { guides: v })}
      />
      {seenSome && (
        <button
          type="button"
          class="btn btn-secondary btn-block"
          onClick={() => {
            act(cmd.resetLessons);
            toast('The guides will show again as you play.', 'good');
          }}
        >
          Show the guides again
        </button>
      )}
    </div>
  );
}
