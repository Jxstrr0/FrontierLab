// A simple engraved-style empty storefront with an "Available" sign, until the
// procedural vignettes arrive (ART_DIRECTION §4). Line work only.
export function StorefrontArt() {
  return (
    <svg class="storefront-art" viewBox="0 0 320 150" role="img" aria-label="An empty storefront">
      <rect x="0" y="0" width="320" height="150" class="art-ground" />
      <path d="M0 132h320" class="art-line" />
      {/* Building */}
      <path d="M70 132V38h180v94M62 38h196M70 38l6-10h168l6 10" class="art-line" />
      {/* Awning */}
      <path
        d="M84 62h152l8 16H76zM100 62l-4 16M120 62l-2 16M140 62l-1 16M160 62v16M180 62l1 16M200 62l2 16M220 62l4 16"
        class="art-line"
      />
      {/* Window and door */}
      <path d="M88 86h76v46H88zM126 86v46M88 108h76" class="art-line" />
      <path d="M186 86h46v46h-46zM214 110v2" class="art-line" />
      {/* "Available" sign on a post */}
      <path d="M284 116v16M250 94h68v22h-68z" class="art-line" />
      <text x="284" y="108" text-anchor="middle" class="art-text">
        Available
      </text>
      <text x="160" y="52" text-anchor="middle" class="art-text art-sign">
        Vacant
      </text>
    </svg>
  );
}
