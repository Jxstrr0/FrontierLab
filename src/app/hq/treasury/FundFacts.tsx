// Three key figures of a funding lot or offer in a row (label over value),
// laid out to fit a 390 px phone without wrapping into a long list.
export function FundFacts(p: { items: [label: string, value: string][] }) {
  return (
    <dl class="tr-facts">
      {p.items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
