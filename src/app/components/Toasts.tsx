// Transient notices above the bottom bar (SCREENS §0.5 Toast).
import { toasts } from '../store';

export function ToastHost() {
  return (
    <div class="toasts" role="status" aria-live="polite">
      {toasts.value.map((t) => (
        <div key={t.id} class={`toast toast-${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
