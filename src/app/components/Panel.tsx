// Panel shell (SCREENS §0.1): header, advisor bar, optional hero, scrolling
// content and an optional bottom tab bar. Full screen on phones, a right drawer
// at ≥ 900px. Also the bottom Sheet and centred Modal shells.
import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { avatarFromSeed } from '../../art/portraits';
import type { AvatarSpec } from '../../sim/state';
import { useDialog } from './dialog';
import { Icon } from './Icon';
import { PanelTabs, type Tab } from './PanelTabs';
import { Portrait } from './Portrait';

export type { Tab };

export function Panel<T extends string>(p: {
  title: string;
  subtitle?: string;
  icon?: ComponentChildren;
  /** Extra header buttons, before Close. */
  actions?: ComponentChildren;
  onClose: () => void;
  advisor?: { text: string | string[]; name?: string; avatar?: AvatarSpec };
  hero?: ComponentChildren;
  tabs?: Tab<T>[];
  tab?: T;
  onTab?: (t: T) => void;
  footer?: ComponentChildren;
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLElement>(null);
  useDialog(ref, p.onClose);
  return (
    <section class="panel" role="dialog" aria-label={p.title} tabIndex={-1} ref={ref}>
      <header class="panel-header">
        {p.icon && <span class="panel-icon">{p.icon}</span>}
        <div class="panel-titles">
          <h2 class="panel-title">{p.title}</h2>
          {p.subtitle && <div class="panel-subtitle">{p.subtitle}</div>}
        </div>
        {p.actions}
        <button
          type="button"
          class="icon-btn"
          aria-label="Close"
          onClick={p.onClose}
          data-tutorial="panel-close"
        >
          <Icon name="close" size={20} />
        </button>
      </header>
      {p.advisor && (
        <AdvisorBar text={p.advisor.text} name={p.advisor.name} avatar={p.advisor.avatar} />
      )}
      <div class="panel-content" tabIndex={0}>
        {p.hero && <div class="panel-hero">{p.hero}</div>}
        {p.children}
      </div>
      {p.footer && <div class="panel-footer">{p.footer}</div>}
      {p.tabs && p.tab && <PanelTabs tabs={p.tabs} tab={p.tab} onTab={p.onTab} />}
    </section>
  );
}

/**
 * Advisor speech line with the speaker's engraved portrait (theirs when they
 * are a person in the game, otherwise one drawn from their name). Given
 * several lines, tapping the bar cycles to the next one.
 */
export function AdvisorBar(p: { text: string | string[]; name?: string; avatar?: AvatarSpec }) {
  const lines = typeof p.text === 'string' ? [p.text] : p.text;
  const [i, setI] = useState(0);
  const many = lines.length > 1;
  const line = lines[i % lines.length] ?? '';
  const body = (
    <>
      <Portrait
        avatar={p.avatar ?? avatarFromSeed(p.name ?? 'advisor')}
        size={32}
        class="advisor-portrait"
      />
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
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, p.onClose, true);
  return (
    <div class="scrim" onClick={(e) => e.target === e.currentTarget && p.onClose()}>
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={p.title}
        tabIndex={-1}
        ref={ref}
      >
        <div class="sheet-grip" aria-hidden="true" />
        {p.title && (
          <header class="sheet-header">
            <h2 class="sheet-title">{p.title}</h2>
            <button type="button" class="icon-btn" aria-label="Close" onClick={p.onClose}>
              <Icon name="close" size={20} />
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
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, p.onClose, true);
  return (
    <div class="scrim scrim-modal">
      <div
        class={`modal${p.class ? ` ${p.class}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={p.title}
        tabIndex={-1}
        ref={ref}
      >
        <header class="modal-header">
          {p.icon}
          <h2 class="modal-title">{p.title}</h2>
          {p.onClose && (
            <button type="button" class="icon-btn" aria-label="Close" onClick={p.onClose}>
              <Icon name="close" size={20} />
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
