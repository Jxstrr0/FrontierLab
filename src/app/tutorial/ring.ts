// The brass ring (SCREENS §27): finds the first of a step's targets that is on
// screen and not covered (by its data-tutorial attribute), and keeps a ring
// around it every frame so it follows pans, scrolls, resizes and panels sliding.
// The ring lives on <body>, outside #app's text-size zoom, so its viewport
// coordinates match getBoundingClientRect. It never takes taps (pointer-events:
// none); a wide translucent shadow dims the rest of the screen lightly.
import type { Target } from './steps';

/** How often the target is looked up again (the ring itself moves every frame). */
const RESOLVE_MS = 250;
/** Space between the target and the ring. */
const RING_PAD = 6;
/** Targets up to this size get a round ring (map pins). */
const ROUND_BELOW = 52;
/** Space between the bar and a modal's content it has pushed down. */
const MODAL_GAP = 8;
/** Targets whose centre is below this share of the screen height put the bar on top. */
const DOCK_TOP_FROM = 0.55;
/** Only targets inside these scroll areas are scrolled into view. */
const SCROLLERS = '.panel-content, .sheet-content, .modal-content, .standalone';
/** A panel, sheet or modal: its own chrome (tab bar, footer) may be scrolled past. */
const SHELLS = '.panel, .sheet, .modal';

export type Dock = 'top' | 'bottom';

const selectorOf = (t: Target) =>
  `[data-tutorial="${t.key}"]${t.lotId ? `[data-lot-id="${CSS.escape(t.lotId)}"]` : ''}`;

export class RingTracker {
  private targets: Target[] = [];
  private el: Element | null = null;
  private index = -1;
  private dock: Dock = 'bottom';
  private raf = 0;
  private lastResolve = 0;
  private scrolled: Element | null = null;
  private pad = 0;

  constructor(
    private ring: HTMLElement,
    /** The tutorial bar: ignored when checking whether a target is covered. */
    private bar: () => Element | null,
    private onChange: (index: number, dock: Dock) => void,
  ) {}

  setTargets(targets: Target[]): void {
    this.targets = targets;
    this.lastResolve = 0;
  }

  start(): void {
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.ring.style.display = 'none';
    document.documentElement.style.removeProperty('--tut-modal-pad');
  }

  private frame = (now: number) => {
    if (now - this.lastResolve > RESOLVE_MS || (this.el && !this.el.isConnected)) {
      this.lastResolve = now;
      this.resolve();
    }
    this.place();
    this.makeRoom();
    this.raf = requestAnimationFrame(this.frame);
  };

  /** Picks the first target on screen; for several matches, keeps the current one or takes the nearest the centre. */
  private resolve(): void {
    let found: Element | null = null;
    let index = -1;
    for (let i = 0; i < this.targets.length && !found; i++) {
      const all = Array.from(document.querySelectorAll(selectorOf(this.targets[i]!)));
      if (this.el && all.includes(this.el) && this.usable(this.el)) {
        found = this.el;
      } else {
        found = nearestCentre(all.filter((e) => this.usable(e)));
      }
      if (found) index = i;
    }
    this.el = found;
    this.update(index);
  }

  /**
   * Visible and on top. A target scrolled out of its panel, or under the
   * panel's own tab bar or footer, is scrolled into view first (once).
   */
  private usable(el: Element): boolean {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cy = r.top + r.height / 2;
    const offscreen = cy < 0 || cy > innerHeight;
    const cover = offscreen ? null : coverOf(el, r, this.bar());
    if (!offscreen && !cover) return true;
    const scroller = el.closest(SCROLLERS);
    const ownChrome = !cover || cover.closest(SHELLS) === el.closest(SHELLS);
    if (!scroller || !ownChrome || this.scrolled === el) return false;
    this.scrolled = el;
    el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    return true;
  }

  private place(): void {
    const el = this.el;
    if (!el || !el.isConnected) {
      this.ring.style.display = 'none';
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0) {
      this.ring.style.display = 'none';
      return;
    }
    const round = r.width <= ROUND_BELOW && r.height <= ROUND_BELOW;
    const size = Math.max(r.width, r.height) + RING_PAD * 2;
    const st = this.ring.style;
    st.display = 'block';
    if (round) {
      st.left = `${r.left + r.width / 2 - size / 2}px`;
      st.top = `${r.top + r.height / 2 - size / 2}px`;
      st.width = st.height = `${size}px`;
      st.borderRadius = '50%';
    } else {
      st.left = `${r.left - RING_PAD}px`;
      st.top = `${r.top - RING_PAD}px`;
      st.width = `${r.width + RING_PAD * 2}px`;
      st.height = `${r.height + RING_PAD * 2}px`;
      st.borderRadius = '12px';
    }
    const dock: Dock = r.top + r.height / 2 > innerHeight * DOCK_TOP_FROM ? 'top' : 'bottom';
    if (dock !== this.dock) {
      this.dock = dock;
      this.onChange(this.index, dock);
    }
  }

  /**
   * With the bar on top of an open modal (the weekly results), pads the modal's
   * content so its first lines can scroll out from under the bar.
   */
  private makeRoom(): void {
    const bar = this.bar();
    const content = document.querySelector('.modal .modal-content');
    const pad =
      this.dock === 'top' && bar && content
        ? Math.max(
            0,
            Math.round(bar.getBoundingClientRect().bottom - content.getBoundingClientRect().top),
          )
        : 0;
    // Padding sits inside the content box, so its top (and this measure) stays put once padded.
    const want = pad > 0 ? pad + MODAL_GAP : 0;
    if (want === this.pad) return;
    this.pad = want;
    document.documentElement.style.setProperty('--tut-modal-pad', `${want}px`);
  }

  private update(index: number): void {
    if (index === this.index) return;
    this.index = index;
    if (index < 0) this.scrolled = null;
    this.onChange(index, this.dock);
  }
}

/**
 * What a tap at the element's centre would hit instead of it, or null when it
 * would hit the element (or one of its children).
 */
function coverOf(el: Element, r: DOMRect, ignore: Element | null): Element | null {
  const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
  const y = r.top + r.height / 2;
  for (const hit of document.elementsFromPoint(x, y)) {
    if (ignore?.contains(hit)) continue;
    return hit === el || el.contains(hit) ? null : hit;
  }
  return document.body;
}

function nearestCentre(els: Element[]): Element | null {
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  let best: Element | null = null;
  let bestD = Infinity;
  for (const e of els) {
    const r = e.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}
