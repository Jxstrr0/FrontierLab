// Certificate card (ART_DIRECTION §1.3): brass hairline, an inner hairline 3px
// inside and small engraved corner rosettes (components.css), plus the section
// rule with its centred diamond, section titles, rows and badges.
import type { ComponentChildren } from 'preact';

export function Card(props: { children: ComponentChildren; class?: string; onClick?: () => void }) {
  const cls = `card${props.onClick ? ' card-tap' : ''}${props.class ? ` ${props.class}` : ''}`;
  if (props.onClick) {
    return (
      <button type="button" class={cls} onClick={props.onClick}>
        {props.children}
      </button>
    );
  }
  return <div class={cls}>{props.children}</div>;
}

/** Thin brass rule with a centred diamond, for section breaks only. */
export function Rule() {
  return (
    <div class="rule" aria-hidden="true">
      <svg width="9" height="9" viewBox="0 0 10 10">
        <path d="M5 0.5 9.5 5 5 9.5 0.5 5z" fill="currentColor" />
      </svg>
    </div>
  );
}

/** Section title in Bodoni. */
export function SectionTitle(props: { children: ComponentChildren }) {
  return <h3 class="section-title">{props.children}</h3>;
}

/** A label/value row; `tone` colours the value. */
export function Row(props: {
  label: ComponentChildren;
  value: ComponentChildren;
  tone?: 'good' | 'bad' | 'flat' | 'dim';
  strong?: boolean;
}) {
  return (
    <div class={`row${props.strong ? ' row-strong' : ''}`}>
      <span class="row-label">{props.label}</span>
      <span class={`row-value${props.tone ? ` tone-${props.tone}` : ''}`}>{props.value}</span>
    </div>
  );
}

export function Badge(props: {
  children: ComponentChildren;
  tone?: 'good' | 'bad' | 'warn' | 'info';
}) {
  return <span class={`badge badge-${props.tone ?? 'info'}`}>{props.children}</span>;
}
