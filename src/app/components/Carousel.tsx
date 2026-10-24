// Carousel (SCREENS §0.5): a horizontal scroll-snap strip of cards with page
// dots under it. The dots follow the scroll position and tapping one scrolls
// to that card, so it works by swipe, tap or keyboard.
import { toChildArray, type ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { motionReduced } from '../settings/display';

export function Carousel(p: { children: ComponentChildren; label: string; class?: string }) {
  const strip = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const items = toChildArray(p.children);

  const onScroll = () => {
    const el = strip.current;
    if (!el) return;
    // The card whose centre is nearest the strip's centre is the current page.
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const c = el.children[i] as HTMLElement;
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best !== page) setPage(best);
  };
  const go = (i: number) =>
    (strip.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({
      behavior: motionReduced() ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });

  return (
    <div class={`carousel-wrap${p.class ? ` ${p.class}` : ''}`}>
      <div
        class="carousel"
        ref={strip}
        onScroll={onScroll}
        role="group"
        aria-label={p.label}
        tabIndex={0}
      >
        {items}
      </div>
      {items.length > 1 && (
        <div class="carousel-dots">
          {items.map((_, i) => (
            <button
              type="button"
              class={`carousel-dot${i === page ? ' is-active' : ''}`}
              aria-label={`Card ${i + 1} of ${items.length}`}
              aria-current={i === page}
              onClick={() => go(i)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
