// Panel shell (SCREENS §0.1): header, advisor bar, optional hero, scrolling
// content and an optional bottom tab bar. Full screen on phones, a right drawer
// at ≥ 900px. Also the bottom Sheet and centred Modal shells.
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export interface Tab<T extends string> {
  id: T;
  label: string;
  badge?: boolean;
}

export function Panel<T extends string>(p: {
  title: string;
  subtitle?: string;
  icon?: ComponentChildren;
  onClose: () => void;
  advisor?: { text: string | string[]; name?: string };
  hero?: ComponentChildren;
  tabs?: Tab<T>[];
  tab?: T;
  onTab?: (t: T) => void;
  footer?: ComponentChildren;
  children: ComponentChildren;
}) {
  useEscape(p.onClose);
  return (
    <section class="panel" role="dialog" aria-label={p.title}>
      <header class="panel-header">
        {p.icon && <span class="panel-icon">{p.icon}</span>}
        <div class="panel-titles">
          <h2 class="panel-title">{p.title}</h2>
          {p.subtitle && <div class="panel-subtitle">{p.subtitle}</div>}
        </div>
        <button type="button" class="icon-btn" aria-label="Close" onClick={p.onClose}>
          ✕
        </button>
      </header>
      {p.advisor && <AdvisorBar text={p.advisor.text} name={p.advisor.name} />}
      <div class="panel-content">
        {p.hero && <div class="panel-hero">{p.hero}</div>}
        {p.children}
      </div>
      {p.footer && <div class="panel-footer">{p.footer}</div>}
      {p.tabs && p.tab && (
        <nav class="panel-tabs" aria-label="Sections">
          {p.tabs.map((t) => (
            <button
              type="button"
              class={`panel-tab${t.id === p.tab ? ' is-active' : ''}`}
              aria-current={t.id === p.tab}
              onClick={() => p.onTab?.(t.id)}
            >
              {t.label}
              {t.badge && <span class="dot" aria-label="needs attention" />}
            </button>
          ))}
        </nav>
      )}
    </section>
  );
}

/**
 * Advisor speech line with an oval engraved portrait placeholder. Given several
 * lines, tapping the bar cycles to the next one.
 */
export function AdvisorBar(p: { text: string | string[]; name?: string }) {
  const lines = typeof p.text === 'string' ? [p.text] : p.text;
  const [i, setI] = useState(0);
  const many = lines.length > 1;
  const line = lines[i % lines.length] ?? '';
  const body = (
    <>
      <svg class="advisor-portrait" viewBox="0 0 28 34" aria-hidden="true">
        <ellipse cx="14" cy="17" rx="13" ry="16" />
        <circle cx="14" cy="13" r="5" />
        <path d="M5 29c2-6 6-8 9-8s7 2 9 8" />
      </svg>
      <p class="advisor-text">
        {p.name && <span class="advisor-name">{p.name}: </span>}
        {line}
      </p>
      {many && (
        <span class="advisor-more" aria-hidden="true">
          {(i % lines.length) + 1}/{lines.length}
        </span>
      )}
    </>
  );
  return many ? (
    <button
      type="button"
      class="advisor advisor-cycle"
      aria-label={`Advisor, ${(i % lines.length) + 1} of ${lines.length}. Tap for the next.`}
      onClick={() => setI(i + 1)}
    >
      {body}
    </button>
  ) : (
    <div class="advisor">{body}</div>
  );
}

/** Bottom sheet over everything; tap the scrim to close. */
export function Sheet(p: { title?: string; onClose: () => void; children: ComponentChildren }) {
  useEscape(p.onClose);
  return (
    <div class="scrim" onClick={(e) => e.target === e.currentTarget && p.onClose()}>
      <div class="sheet" role="dialog" aria-label={p.title}>
        <div class="sheet-grip" aria-hidden="true" />
        {p.title && (
          <header class="sheet-header">
            <h2 class="sheet-title">{p.title}</h2>
            <button type="button" class="icon-btn" aria-label="Close" onClick={p.onClose}>
              ✕
            </button>
          </header>
        )}
        <div class="sheet-content">{p.children}</div>
      </div>
    </div>
  );
}

/** Centred card on desktop, bottom sheet on phones. */
export function Modal(p: {
  title: string;
  onClose?: () => void;
  icon?: ComponentChildren;
  children: ComponentChildren;
  footer?: ComponentChildren;
  class?: string;
}) {
  useEscape(p.onClose);
  return (
    <div class="scrim scrim-modal">
      <div class={`modal${p.class ? ` ${p.class}` : ''}`} role="dialog" aria-label={p.title}>
        <header class="modal-header">
          {p.icon}
          <h2 class="modal-title">{p.title}</h2>
          {p.onClose && (
            <button type="button" class="icon-btn" aria-label="Close" onClick={p.onClose}>
              ✕
            </button>
          )}
        </header>
        <div class="modal-content">{p.children}</div>
        {p.footer && <div class="modal-footer">{p.footer}</div>}
      </div>
    </div>
  );
}

/** Confirmation sheet with a destructive or primary action. */
export function Confirm(p: {
  title: string;
  body: ComponentChildren;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet title={p.title} onClose={p.onCancel}>
      <div class="confirm-body">{p.body}</div>
      <div class="btn-row">
        <button type="button" class="btn btn-secondary" onClick={p.onCancel}>
          Cancel
        </button>
        <button
          type="button"
          class={`btn ${p.danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={p.onConfirm}
        >
          {p.confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

function useEscape(fn?: () => void) {
  useEffect(() => {
    if (!fn) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && fn();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fn]);
}
