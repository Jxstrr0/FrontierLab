// Code-splitting helper (Stage 10 performance pass): wraps a dynamic import()
// as a component that renders nothing until its chunk arrives (a few
// milliseconds once the offline cache has it), plus preload() to fetch the
// chunk ahead of time while the player is still on another screen.
import type { ComponentType, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export interface LazyComponent<P> {
  (props: P): JSX.Element | null;
  preload(): Promise<unknown>;
}

export function lazy<P extends object>(load: () => Promise<ComponentType<P>>): LazyComponent<P> {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  const preload = () =>
    (pending ??= load().then(
      (c) => (loaded = c),
      (e: unknown) => {
        pending = null; // let a later attempt retry
        throw e;
      },
    ));

  function Lazy(props: P) {
    const [, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
      if (loaded) return;
      let live = true;
      preload().then(
        () => live && setReady(true),
        () => live && setFailed(true),
      );
      return () => {
        live = false;
      };
    }, []);
    if (loaded) {
      const C = loaded as ComponentType<object>;
      return <C {...props} />;
    }
    return failed ? <LoadFailed /> : null;
  }
  Lazy.preload = preload;
  return Lazy;
}

/** Runs `fn` when the browser is idle (or after a short delay where unsupported). */
export function whenIdle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 3000 });
  else setTimeout(fn, 500);
}

/** Shown if a chunk can't be downloaded (offline before the cache was filled). */
function LoadFailed() {
  return (
    <div class="lazy-failed" role="alert">
      <p>This part of the game didn't load. Check your connection and try again.</p>
      <button type="button" class="btn btn-primary" onClick={() => location.reload()}>
        Reload
      </button>
    </div>
  );
}
