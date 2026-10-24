// Text field for naming a product or a model, reusing the wizard's field
// styles (16 px text so iOS Safari doesn't zoom in) with a character count.
import '../../newgame/fields.css';

export function NameField(p: {
  label: string;
  value: string;
  max: number;
  placeholder?: string;
  onInput: (v: string) => void;
}) {
  return (
    <label class="field">
      <span class="field-label">{p.label}</span>
      <input
        class="field-input"
        type="text"
        value={p.value}
        maxLength={p.max}
        placeholder={p.placeholder}
        autoComplete="off"
        autoCapitalize="words"
        onInput={(e) => p.onInput((e.target as HTMLInputElement).value)}
      />
      <span class="field-hint">
        {p.value.length} of {p.max} characters
      </span>
    </label>
  );
}
