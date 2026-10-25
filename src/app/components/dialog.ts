// Keyboard and screen-reader behaviour shared by panels, sheets and modals
// (Stage 10 accessibility pass):
// - focus moves into the dialog when it opens and back to whatever had it
//   when it closes;
// - Escape closes only the top-most dialog (a confirm sheet over a panel
//   closes first);
// - modal dialogs keep Tab inside themselves.
import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

/** Open dialogs' Escape handlers, newest last. */
const stack: { close?: () => void }[] = [];

function onKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  const top = stack[stack.length - 1];
  if (top?.close) {
    e.preventDefault();
    top.close();
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab cycling inside `root`. */
function trapTab(root: HTMLElement, e: KeyboardEvent): void {
  if (e.key !== 'Tab') return;
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    e.preventDefault();
    return;
  }
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === root)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !root.contains(active))) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Wires a dialog element: pass a ref to it (it should have tabIndex={-1}),
 * its close function (if Escape may close it), and whether it is modal.
 */
export function useDialog(
  ref: RefObject<HTMLElement>,
  onClose: (() => void) | undefined,
  modal = false,
): void {
  const entry = useRef<{ close?: () => void }>({});
  entry.current.close = onClose;
  useEffect(() => {
    const me = entry.current;
    const opener = document.activeElement as HTMLElement | null;
    if (stack.length === 0) window.addEventListener('keydown', onKey);
    stack.push(me);
    const el = ref.current;
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
    const trap = (e: KeyboardEvent) => el && trapTab(el, e);
    if (modal) el?.addEventListener('keydown', trap);
    return () => {
      stack.splice(stack.indexOf(me), 1);
      if (stack.length === 0) window.removeEventListener('keydown', onKey);
      if (modal) el?.removeEventListener('keydown', trap);
      // Give focus back to the opener if it's still on screen and nothing else took it.
      const lost = !document.activeElement || document.activeElement === document.body;
      const inside = el?.contains(document.activeElement) ?? false;
      if (opener?.isConnected && opener !== document.body && (lost || inside)) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);
}
