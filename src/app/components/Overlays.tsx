// The overlay layer: sheets and modals render here, at the top of #app, rather
// than inside the screen that opens them. On iPhone a fixed-position sheet left
// inside a panel's scrolling content is clipped to that content and scrolls
// with it, so the sheet's header vanished under the panel's and two scrollers
// fought over each swipe (owner's recording, v0.10.1). Being inside #app keeps
// the text-size zoom and #app-scoped styles.
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useLayoutEffect, useState } from 'preact/hooks';

const ROOT_ID = 'overlay-root';

/** The empty layer every overlay mounts into; App renders it once, last. */
export function OverlayRoot() {
  return <div id={ROOT_ID} />;
}

/**
 * Renders its children in a host of their own inside the overlay layer, so each
 * sheet stacks above the ones opened before it. Without a DOM (or before the
 * layer exists) it falls back to the overlay layer's parent, then <body>.
 */
export function Overlay(p: { children: ComponentChildren }) {
  const [host] = useState(() =>
    typeof document === 'undefined' ? null : document.createElement('div'),
  );
  useLayoutEffect(() => {
    if (!host) return;
    host.className = 'overlay-host';
    (document.getElementById(ROOT_ID) ?? document.body).appendChild(host);
    return () => host.remove();
  }, [host]);
  return host ? createPortal(<>{p.children}</>, host) : <>{p.children}</>;
}
