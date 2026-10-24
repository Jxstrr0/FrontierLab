// Input controls (SCREENS §0.5): Stepper, Toggle and Segmented.
import { useEffect, useRef, useState } from 'preact/hooks';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Formats the value for display, e.g. pct or money. */
  format?: (v: number) => string;
  /** Converts a typed string back to a value (defaults to Number). */
  parse?: (s: string) => number;
  /** Text shown when the player taps to type, in the units parse expects (e.g. 3.25 for 3.25%). */
  editText?: (v: number) => string;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

/** − value +. Long-press accelerates; tap the value to type one. */
export function Stepper(p: StepperProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const hold = useRef<{ t?: ReturnType<typeof setTimeout>; n: number; v: number }>({ n: 0, v: 0 });
  const fmt = p.format ?? ((v: number) => String(v));
  const clampV = (v: number) => Math.min(p.max, Math.max(p.min, Math.round(v / p.step) * p.step));

  useEffect(() => () => clearTimeout(hold.current.t), []);

  const start = (dir: 1 | -1) => {
    if (p.disabled) return;
    const h = hold.current;
    h.n = 0;
    h.v = p.value;
    const tick = () => {
      const mult = h.n > 20 ? 10 : h.n > 8 ? 4 : 1;
      const next = clampV(h.v + dir * p.step * mult);
      if (next !== h.v) {
        h.v = next;
        p.onChange(next);
      }
      h.n += 1;
      h.t = setTimeout(tick, h.n === 1 ? 400 : 90);
    };
    tick();
  };
  const stop = () => clearTimeout(hold.current.t);

  const commit = () => {
    setEditing(false);
    const raw = (p.parse ?? Number)(text);
    if (Number.isFinite(raw)) p.onChange(clampV(raw));
  };

  return (
    <div class={`stepper${p.disabled ? ' is-disabled' : ''}`}>
      {p.label && <div class="stepper-label">{p.label}</div>}
      <div class="stepper-body">
        <button
          type="button"
          class="stepper-btn"
          aria-label={`Decrease ${p.label ?? ''}`}
          disabled={p.disabled || p.value <= p.min}
          onPointerDown={() => start(-1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          −
        </button>
        {editing ? (
          <input
            class="stepper-input"
            inputMode="decimal"
            value={text}
            autoFocus
            onInput={(e) => setText((e.target as HTMLInputElement).value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
          />
        ) : (
          <button
            type="button"
            class="stepper-value"
            disabled={p.disabled}
            onClick={() => {
              setText((p.editText ?? String)(p.value));
              setEditing(true);
            }}
          >
            {fmt(p.value)}
          </button>
        )}
        <button
          type="button"
          class="stepper-btn"
          aria-label={`Increase ${p.label ?? ''}`}
          disabled={p.disabled || p.value >= p.max}
          onPointerDown={() => start(1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          +
        </button>
      </div>
      {p.hint && <div class="stepper-hint">{p.hint}</div>}
    </div>
  );
}

export function Toggle(p: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label class={`toggle${p.disabled ? ' is-disabled' : ''}`}>
      <span class="toggle-text">
        <span>{p.label}</span>
        {p.hint && <span class="toggle-hint">{p.hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={p.checked}
        disabled={p.disabled}
        onChange={(e) => p.onChange((e.target as HTMLInputElement).checked)}
      />
      <span class="toggle-track" aria-hidden="true">
        <span class="toggle-thumb" />
      </span>
    </label>
  );
}

export function Segmented<T extends string>(p: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div class="segmented" role="radiogroup" aria-label={p.label}>
      {p.options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={o.value === p.value}
          class={`segmented-opt${o.value === p.value ? ' is-active' : ''}`}
          onClick={() => p.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
