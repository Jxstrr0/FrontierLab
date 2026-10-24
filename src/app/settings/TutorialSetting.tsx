// Settings → Tutorial (SCREENS §26–27): in game, "Replay tutorial" starts it
// again from step 1; on the title, the next new game can be set to open with it.
import { useState } from 'preact/hooks';
import { loadTutorialSeen, saveTutorialSeen } from '../saves';
import { closePanel } from '../store';
import { replayTutorial } from '../tutorial/controller';

export function TutorialSetting(p: { inGame: boolean }) {
  const [seen, setSeen] = useState(loadTutorialSeen);
  if (p.inGame) {
    return (
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
    );
  }
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
