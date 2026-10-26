// The tutorial on screen (SCREENS §27): an advisor-style bar with the guide's
// engraved portrait, name, step and line, a "Skip" button, and the brass ring
// around the step's target. The bar docks to the bottom, or to the top when
// the target is low on the screen. Also the returning player's offer ("Show
// me" / "No thanks"), the closing card, and Part 2: the guides for later
// mechanics and the first-look tips, which end on "Got it".
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CHAPTERS, LESSON_TEXT, tipText } from '../../data/lessons';
import { TUTORIAL, TUTORIAL_TEXT } from '../../data/tutorial';
import type { AvatarSpec } from '../../sim/state';
import { Portrait } from '../components/Portrait';
import { modal, panel, sheet, useGame } from '../store';
import { acceptTutorial, finishTutorial, skipTutorial, tutorialMemo } from './controller';
import { ackChapterStep, chapterMemo, dismissTip, skipChapter, tipShown } from './lessonController';
import { chapterGuidance, tipDocksTop } from './lessons';
import { guideOf, observe, observeLessons } from './observe';
import { RingTracker, type Dock, type Target } from './ring';
import { guidance } from './steps';
import './tutorial.css';

const FALLBACK_AVATAR: AvatarSpec = {
  head: 1,
  hair: 3,
  facial: 0,
  glasses: 1,
  attire: 1,
  tone: 2,
  shade: 1,
  eyes: 0,
  brows: 0,
  mouth: 0,
  age: 1,
};

export function TutorialOverlay() {
  const s = useGame();
  const step = s.flags.tutorialStep;
  const guide = guideOf(s);
  const who = {
    name: guide?.name ?? TUTORIAL_TEXT.fallbackGuide,
    avatar: guide?.portrait ?? FALLBACK_AVATAR,
  };
  if (step === undefined || step >= TUTORIAL.done) return <LessonOverlay who={who} />;
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
  return (
    <StepBar
      who={who}
      meta={`Step ${step} of ${TUTORIAL.last} · ${g.title}`}
      targets={g.targets}
      idle={g.idle}
      onSkip={skipTutorial}
      skipLabel={TUTORIAL_TEXT.skip}
    />
  );
}

/** Part 2 (SCREENS §27.2): a guide step, or else the first-look tip for this screen. */
function LessonOverlay(p: { who: Who }) {
  const s = useGame();
  const tip = tipShown.value;
  const memo = chapterMemo.value;
  // A popup the guide isn't about hides it until you've dealt with it; its own tip may show.
  if (memo && !modal.value) {
    const o = observeLessons(s, panel.value, modal.value, sheet.value);
    const g = chapterGuidance(memo, o);
    const total = CHAPTERS[memo.id].steps.length;
    const steps = total > 1 ? ` · ${memo.step + 1} of ${total}` : '';
    return (
      <StepBar
        who={p.who}
        meta={`${LESSON_TEXT.meta} · ${g.title}${steps}`}
        targets={g.targets}
        idle={g.idle}
        onSkip={skipChapter}
        skipLabel={LESSON_TEXT.skip}
      >
        {g.ack && <GotIt onClick={ackChapterStep} />}
      </StepBar>
    );
  }
  const text = tip ? tipText(tip) : undefined;
  if (!tip || !text) return null;
  return (
    <StepBar
      key={tip}
      who={p.who}
      meta={`${LESSON_TEXT.tipMeta} · ${text.title}`}
      targets={[]}
      idle={text.line}
      idleDock={tipDocksTop(tip) ? 'top' : 'bottom'}
    >
      <GotIt onClick={dismissTip} />
    </StepBar>
  );
}

function GotIt(p: { onClick: () => void }) {
  return (
    <div class="tut-actions">
      <button type="button" class="btn btn-primary" data-tutorial="got-it" onClick={p.onClick}>
        {LESSON_TEXT.gotIt}
      </button>
    </div>
  );
}

interface Who {
  name: string;
  avatar: AvatarSpec;
}

function StepBar(p: {
  who: Who;
  meta: string;
  targets: Target[];
  idle: string;
  idleDock?: Dock;
  onSkip?: () => void;
  skipLabel?: string;
  children?: ComponentChildren;
}) {
  const bar = useRef<HTMLElement>(null);
  const tracker = useRef<RingTracker | null>(null);
  const idleDock = p.idleDock ?? 'bottom';
  const [view, setView] = useState<{ index: number; dock: Dock }>({ index: -1, dock: idleDock });
  // Only a real change of targets restarts the lookup (guidance() builds a new array each render).
  const key = JSON.stringify(p.targets);
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
  useEffect(() => tracker.current?.setIdleDock(idleDock), [idleDock]);

  const target = view.index >= 0 ? targets[view.index] : undefined;
  const first = p.who.name.split(' ')[0] ?? p.who.name;
  const line = (target?.line ?? p.idle).replace('{guide}', first);
  return (
    <Bar
      barRef={bar}
      who={p.who}
      meta={p.meta}
      line={line}
      dock={view.dock}
      onSkip={p.onSkip}
      skipLabel={p.skipLabel}
    >
      {p.children}
    </Bar>
  );
}

function Bar(p: {
  who: Who;
  meta: string;
  line: string;
  dock: Dock;
  onSkip?: () => void;
  skipLabel?: string;
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
                {p.skipLabel ?? TUTORIAL_TEXT.skip}
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
