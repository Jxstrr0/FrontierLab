// Hero vignette for the central bank (ART_DIRECTION §3): an engraved domed
// hall with a pediment, six columns and broad steps. Line art only, in the
// same classes as the other building vignettes (sites.css).
import '../sites/sites.css';

const COLUMNS = [104, 126, 148, 172, 194, 216];

export function CentralBankArt() {
  return (
    <svg class="site-art" viewBox="0 0 320 150" role="img" aria-label="A domed central bank">
      <rect x="0" y="0" width="320" height="150" class="art-ground" />
      <path d="M0 132h320" class="art-line" />
      {/* Dome, drum and lantern. */}
      <path
        d="M118 52a42 34 0 0 1 84 0M112 52h96M114 58h92M160 18v-8M154 20h12v-2h-12z"
        class="art-line"
      />
      {[124, 138, 152, 168, 182, 196].map((x) => (
        <path d={`M${x} 52v6`} class="art-line art-fine" />
      ))}
      {/* Pediment and entablature. */}
      <path d="M92 76 160 58l68 18zM90 76h140v6H90z" class="art-line" />
      <path d="M150 70h20" class="art-line art-fine" />
      {/* Columns. */}
      {COLUMNS.map((x) => (
        <path d={`M${x} 82v34M${x + 8} 82v34M${x - 2} 82h12M${x - 2} 116h12`} class="art-line" />
      ))}
      {/* Steps. */}
      <path d="M86 116h148v5H86zM80 121h160v5H80zM74 126h172v6H74z" class="art-line" />
      {/* Flanking wings with windows. */}
      <path d="M30 132V90h44v42M246 132V90h44v42" class="art-line" />
      {[40, 56, 256, 272].map((x) => (
        <path d={`M${x} 98h8v12h-8zM${x} 116h8v10h-8z`} class="art-line art-fine" />
      ))}
    </svg>
  );
}
