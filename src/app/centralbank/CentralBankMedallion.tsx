// The central bank's own medallion (ART_DIRECTION §2, Pins): a navy coin with
// a double brass rim and an engraved columned dome in brass, so the domed
// landmark reads apart from rival head offices (ivory type medallions with the
// "banks" icon) and from the plain "$" branch locations. Used by the map pin
// and the panel header.

export function CentralBankMedallion(p: { size?: number }) {
  const size = p.size ?? 30;
  return (
    <svg
      class="medallion cb-medallion"
      width={size}
      height={size}
      viewBox="0 0 30 30"
      aria-hidden="true"
    >
      <circle cx="15" cy="15" r="14" fill="var(--vault)" stroke="var(--brass)" stroke-width="1.5" />
      <circle cx="15" cy="15" r="11.6" fill="none" stroke="var(--brass-light)" stroke-width="0.7" />
      <g
        fill="none"
        stroke="var(--brass-light)"
        stroke-width="1.1"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        {/* Lantern, dome and drum. */}
        <path d="M15 6.6v1.6M11 13a4 3.6 0 0 1 8 0M10.2 13h9.6" />
        {/* Four columns on a stepped base. */}
        <path d="M11.2 13.6v5.4M13.7 13.6v5.4M16.3 13.6v5.4M18.8 13.6v5.4M9.6 19.4h10.8M8.8 21.2h12.4" />
      </g>
    </svg>
  );
}
