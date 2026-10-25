// Panel bottom tab bar (SCREENS §0.1). The current tab sits in a brass pill and
// is scrolled to the middle whenever it changes, so it is never off screen.
// When there are more tabs than fit, the bar scrolls sideways and the hidden
// side fades out under a chevron; tapping the chevron pages that way.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { IconName } from '../../art/icons';
import { motionReduced } from '../settings/display';
import { Icon } from './Icon';

export interface Tab<T extends string> {
  id: T;
  label: string;
  badge?: boolean;
  /** Drawn over the label; when any tab has one the bar becomes an icon bar. */
  icon?: IconName;
}

/** Pixels of hidden tabs before a side counts as scrollable. */
const EDGE_SLACK_PX = 4;
/** A chevron tap scrolls by this share of the bar's width. */
const PAGE_SHARE = 0.7;

export function PanelTabs<T extends string>(p: { tabs: Tab<T>[]; tab: T; onTab?: (t: T) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });
  const first = useRef(true);
  const icons = p.tabs.some((t) => t.icon);

  const measure = () => {
    const el = track.current;
    if (!el) return;
    const left = el.scrollLeft > EDGE_SLACK_PX;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_SLACK_PX;
    setMore((m) => (m.left === left && m.right === right ? m : { left, right }));
  };

  // Centre the current tab: at once on opening, smoothly on later changes.
  useLayoutEffect(() => {
    const el = track.current;
    const cur = el?.querySelector<HTMLElement>('.panel-tab.is-active');
    if (!el || !cur) return;
    const left = cur.offsetLeft - (el.clientWidth - cur.offsetWidth) / 2;
    el.scrollTo({ left, behavior: first.current || motionReduced() ? 'auto' : 'smooth' });
    first.current = false;
    measure();
  }, [p.tab, p.tabs.length]);

  useEffect(() => {
    const el = track.current;
    if (!el || typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({
      left: dir * el.clientWidth * PAGE_SHARE,
      behavior: motionReduced() ? 'auto' : 'smooth',
    });
  };

  return (
    <nav
      class={`panel-tabs${icons ? ' has-icons' : ''}${more.left ? ' more-left' : ''}${more.right ? ' more-right' : ''}`}
      aria-label="Sections"
    >
      <div class="panel-tabs-track" ref={track} onScroll={measure}>
        {p.tabs.map((t) => (
          <button
            type="button"
            class={`panel-tab${t.id === p.tab ? ' is-active' : ''}`}
            aria-current={t.id === p.tab}
            onClick={() => p.onTab?.(t.id)}
            data-tutorial={`tab-${t.id}`}
          >
            <span class="panel-tab-pill">
              {t.icon ? <Icon name={t.icon} size={24} class="panel-tab-icon" /> : t.label}
            </span>
            {t.icon && <span class="panel-tab-label">{t.label}</span>}
            {t.badge && <span class="dot" aria-label="needs attention" />}
          </button>
        ))}
      </div>
      {/* Mouse and touch helpers only; the tabs themselves stay reachable by keyboard. */}
      {more.left && (
        <button
          type="button"
          class="panel-tabs-more is-left"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => page(-1)}
        >
          <Icon name="chevronLeft" size={20} />
        </button>
      )}
      {more.right && (
        <button
          type="button"
          class="panel-tabs-more is-right"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => page(1)}
        >
          <Icon name="chevronRight" size={20} />
        </button>
      )}
    </nav>
  );
}
