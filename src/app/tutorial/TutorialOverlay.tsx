// The tutorial on screen (SCREENS §27): an advisor-style bar with the guide's
// engraved portrait, name, step and line, a "Skip tutorial" button, and the
// brass ring around the step's target. The bar docks to the bottom, or to the
// top when the target is low on the screen. Also the returning player's offer
// ("Show me" / "No thanks") and the closing card.
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { TUTORIAL, TUTORIAL_TEXT } from '../../data/tutorial';
import type { AvatarSpec } from '../../sim/state';
import { Portrait } from '../components/Portrait';
import { modal, panel, useGame } from '../store';
import { acceptTutorial, finishTutorial, skipTutorial, tutorialMemo } from './controller';
import { guideOf, observe } from './observe';
import { RingTracker, type Dock } from './ring';
import { guidance, type Guidance, type Target } from './steps';
import './tutorial.css';

const FALLBACK_AVATAR: AvatarSpec = {
  head: 1,
  hair: 3,
  facial: 0,
  glasses: 1,
  attire: 1,
  tone: 2,
  shade: 1,
};

export function TutorialOverlay() {
  const s = useGame();
  const step = s.flags.tutorialStep;
  if (step === undefined || step >= TUTORIAL.done) return null;
  const guide = guideOf(s);
  const who = {
    name: guide?.name ?? TUTORIAL_TEXT.fallbackGuide,
    avatar: guide?.portrait ?? FALLBACK_AVATAR,
  };
  if (step === TUTORIAL.offer) {
    return (
      <Bar who={who} meta="Tutorial" line={TUTORIAL_TEXT.offer} dock="bottom">
        <div class="tut-actions">
          <button type="button" class="btn btn-secondary" onClick={finishTutorial}>
            {TUTORIAL_TEXT.offerNo}
          </button>
          <button type="button" class="btn btn-primary" onClick={acceptTutorial}>
            {TUTORIAL_TEXT.offerYes}
          </button>
        </div>
      </Bar>
    );
  }
  if (step === TUTORIAL.finale) {
    return (
      <Bar who={who} meta="Tutorial complete" line={TUTORIAL_TEXT.finale} dock="bottom">
        <div class="tut-actions">
          <button
            type="button"
            class="btn btn-primary"
            data-tutorial="finale-done"
            onClick={finishTutorial}
          >
            {TUTORIAL_TEXT.finaleDone}
          </button>
        </div>
      </Bar>
    );
  }
  const memo = tutorialMemo.value;
  if (!memo || memo.step !== step) return null;
  const g = guidance(memo, observe(s, panel.value, modal.value));
  return <StepBar who={who} step={step} g={g} />;
}

interface Who {
  name: string;
  avatar: AvatarSpec;
}

function StepBar(p: { who: Who; step: number; g: Guidance }) {
  const bar = useRef<HTMLElement>(null);
  const tracker = useRef<RingTracker | null>(null);
  const [view, setView] = useState<{ index: number; dock: Dock }>({ index: -1, dock: 'bottom' });
  // Only a real change of targets restarts the lookup (guidance() builds a new array each render).
  const key = JSON.stringify(p.g.targets);
  const targets = useMemo(() => JSON.parse(key) as Target[], [key]);

  useEffect(() => {
    const ring = document.createElement('div');
    ring.className = 'tut-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    const t = new RingTracker(
      ring,
      () => bar.current,
      (index, dock) => setView({ index, dock }),
    );
    tracker.current = t;
    t.start();
    return () => {
      t.stop();
      ring.remove();
      tracker.current = null;
    };
  }, []);

  useEffect(() => tracker.current?.setTargets(targets), [targets]);

  const target = view.index >= 0 ? targets[view.index] : undefined;
  const first = p.who.name.split(' ')[0] ?? p.who.name;
  const line = (target?.line ?? p.g.idle).replace('{guide}', first);
  return (
    <Bar
      barRef={bar}
      who={p.who}
      meta={`Step ${p.step} of ${TUTORIAL.last} · ${p.g.title}`}
      line={line}
      dock={view.dock}
      onSkip={skipTutorial}
    />
  );
}

function Bar(p: {
  who: Who;
  meta: string;
  line: string;
  dock: Dock;
  onSkip?: () => void;
  barRef?: { current: HTMLElement | null };
  children?: ComponentChildren;
}) {
  return (
    <aside ref={p.barRef} class={`tut-bar is-${p.dock}`} aria-label="Tutorial">
      <div class="tut-row">
        <span class="tut-portrait">
          <Portrait avatar={p.who.avatar} size={44} />
        </span>
        <div class="tut-body">
          <div class="tut-head">
            <span class="tut-meta">
              <span class="tut-name">{p.who.name}</span>
              <span class="tut-step">{p.meta}</span>
            </span>
            {p.onSkip && (
              <button type="button" class="tut-skip" onClick={p.onSkip}>
                {TUTORIAL_TEXT.skip}
              </button>
            )}
          </div>
          <p class="tut-line" role="status" aria-live="polite">
            {p.line}
          </p>
        </div>
      </div>
      {p.children}
    </aside>
  );
}
