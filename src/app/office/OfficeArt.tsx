// Office building vignette (ART_DIRECTION §3): an engraved front elevation
// with one window row per leasable floor, a glazed lobby, a stepped crown and,
// while it's vacant, a "To let" banner. Line art only, like StorefrontArt.
const W = 320;
const H = 150;
/** Building geometry in SVG units. */
const B = { x: 104, w: 112, ground: 136, lobby: 16, crown: 10, maxStorey: 11 } as const;

export function OfficeArt(p: { floors: number; desksPerFloor: number; vacant: boolean }) {
  const top = 22;
  const storey = Math.min(B.maxStorey, (B.ground - B.lobby - B.crown - top) / p.floors);
  const shaftTop = B.ground - B.lobby - storey * p.floors;
  const cols = p.desksPerFloor > 24 ? 8 : 6;
  const colW = B.w / cols;
  const x1 = B.x + B.w;
  const windows: string[] = [];
  for (let f = 0; f < p.floors; f++) {
    const y = shaftTop + f * storey + storey * 0.22;
    for (let c = 0; c < cols; c++) {
      const x = B.x + c * colW + colW * 0.22;
      windows.push(
        `M${x.toFixed(1)} ${y.toFixed(1)}h${(colW * 0.56).toFixed(1)}v${(storey * 0.56).toFixed(1)}h${(-colW * 0.56).toFixed(1)}z`,
      );
    }
  }
  const floorLines = Array.from({ length: p.floors }, (_, f) => {
    const y = shaftTop + f * storey;
    return `M${B.x} ${y.toFixed(1)}H${x1}`;
  }).join('');
  return (
    <svg
      class="office-art"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`An office building with ${p.floors} floors${p.vacant ? ', to let' : ''}`}
    >
      <rect x="0" y="0" width={W} height={H} class="art-ground" />
      <path d={`M0 ${B.ground}h${W}`} class="art-line" />
      {/* Neighbours, kept faint so the office reads first. */}
      <path
        d={`M24 ${B.ground}V78h56v58M36 90h32M36 102h32M36 114h32M240 ${B.ground}V96h58v40M252 108h34M252 120h34`}
        class="art-line art-faint"
      />
      {/* Crown and shaft. */}
      <path
        d={`M${B.x + 14} ${shaftTop - B.crown}h${B.w - 28}v${B.crown}M${B.x - 4} ${shaftTop}h${B.w + 8}M${B.x + 30} ${shaftTop - B.crown}v-8h${B.w - 60}v8M${B.x + B.w / 2} ${shaftTop - B.crown - 8}v-8`}
        class="art-line"
      />
      <path d={`M${B.x} ${B.ground}V${shaftTop}H${x1}V${B.ground}`} class="art-line" />
      <path d={floorLines} class="art-line art-fine" />
      <path d={windows.join('')} class="art-line art-fine" />
      {/* Lobby: glass bays and a revolving door. */}
      <path
        d={`M${B.x} ${B.ground - B.lobby}H${x1}M${B.x + 16} ${B.ground}v${-B.lobby}M${x1 - 16} ${B.ground}v${-B.lobby}M${B.x + B.w / 2 - 10} ${B.ground}v${-B.lobby + 3}h20v${B.lobby - 3}M${B.x + B.w / 2} ${B.ground}v${-B.lobby + 3}`}
        class="art-line"
      />
      {p.vacant && (
        <g>
          <path
            d={`M${x1 + 6} ${shaftTop + 6}h34v40h-34zM${x1} ${shaftTop + 10}h6M${x1} ${shaftTop + 40}h6`}
            class="art-line"
          />
          <text x={x1 + 23} y={shaftTop + 24} text-anchor="middle" class="art-text">
            To let
          </text>
          <text x={x1 + 23} y={shaftTop + 36} text-anchor="middle" class="art-text art-small">
            {p.floors} floors
          </text>
        </g>
      )}
    </svg>
  );
}
