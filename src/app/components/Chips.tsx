// A row of pill chips that scrolls sideways (SCREENS §0.5): one choice out of
// a list that can grow long, such as cities or countries. 44 px tall, radio
// semantics, no hover-only states.
import './chips.css';

export function Chips<T extends string>(p: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div class="chips" role="radiogroup" aria-label={p.label}>
      {p.options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === p.value}
          class={`chip${o.value === p.value ? ' is-active' : ''}`}
          onClick={() => p.onChange(o.value)}
        >
          {o.label}
          {o.hint && <span class="chip-hint">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}
