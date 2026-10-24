// Startup vignettes (ART_DIRECTION §3, small spot illustrations): one engraved
// line drawing per sector on an 80 × 80 plate with a double guilloche ring,
// like the HR benefit art. Used on venture cards and the startup panel.
import './startup.css';

const ART: Record<string, string> = {
  // A card and a coin.
  fintech: 'M14 26h40v26H14zM14 33h40M20 44h12M60 48a10 10 0 1 0 .1 0M60 42v12M56 46h8',
  // Sun over a tilted panel.
  energy:
    'M40 22a8 8 0 1 0 .1 0M40 8v6M40 38v2M26 22h-6M60 22h-6M30 12l4 4M50 12l-4 4M16 64l10-18h36l-10 18zM21 55h36M36 46l-6 18M48 46l-6 18',
  // A battery with a bolt.
  energyStorage: 'M18 28h40v28H18zM58 36h6v12h-6M40 32l-8 12h8l-4 10 12-14h-8l4-8z',
  // A rocket and a trail.
  space:
    'M40 12c10 8 12 22 8 36H32c-4-14-2-28 8-36zM34 48l-8 10h10M46 48l8 10H44M40 26a4 4 0 1 0 .1 0M36 62c0 6 4 8 4 10 0-2 4-4 4-10',
  // A flask with bubbles.
  biotech:
    'M34 14h12M36 14v16L22 60h36L44 30V14M28 48h24M36 54a2 2 0 1 0 .1 0M46 52a3 3 0 1 0 .1 0',
  // A robot arm.
  robotics:
    'M16 64h24M22 64v-6h12v6M28 58V44l16-12 14 8M58 40l6 6M58 40l6-4M28 44a4 4 0 1 0 .1 0M44 32a4 4 0 1 0 .1 0',
  // A heart with a cross.
  healthtech:
    'M40 62C24 51 16 42 16 33a10 10 0 0 1 24-5 10 10 0 0 1 24 5c0 9-8 18-24 29zM36 30h8v6h6v8h-6v6h-8v-6h-6v-8h6z',
  // A sprout from a furrow.
  agtech:
    'M14 60c8-4 18-4 26 0 8-4 18-4 26 0M40 58V34M40 40c-8 0-14-6-14-14 8 0 14 6 14 14M40 36c7 0 12-5 12-12-7 0-12 5-12 12',
  agFintech:
    'M14 60c8-4 18-4 26 0 8-4 18-4 26 0M40 58V36M40 42c-7 0-12-5-12-12 7 0 12 5 12 12M56 30a8 8 0 1 0 .1 0M56 26v8',
  // An atom.
  quantum:
    'M40 38a3 3 0 1 0 .1 0M16 40c0-6 11-10 24-10s24 4 24 10-11 10-24 10-24-4-24-10zM28 19c5-3 14 4 20 15s8 22 3 25-14-4-20-15-8-22-3-25zM52 19c5 3 3 14-3 25s-15 18-20 15-3-14 3-25 15-18 20-15z',
  // Stacked apartment modules.
  proptech:
    'M18 62h44M22 62V48h16v14M42 62V48h16v14M22 46V32h16v14M42 46V32h16v14M32 30V18h16v12M28 54h4M48 54h4M28 38h4M48 38h4',
  // Earbuds.
  consumer:
    'M26 26a8 8 0 1 0 .1 0M26 34v22a4 4 0 0 0 8 0M54 26a8 8 0 1 0 .1 0M54 34v22a4 4 0 0 1-8 0M18 18c6-6 38-6 44 0',
  // An I-beam over a furnace.
  materials:
    'M16 20h48M16 30h48M36 20v10M44 20v10M20 62V42h40v20M30 62V52h20v10M34 42c0-4 6-4 6-8M44 42c0-4 6-4 6-8',
  // A game controller.
  gaming:
    'M20 36c4-6 36-6 40 0l4 18c1 6-6 8-10 4l-6-6H32l-6 6c-4 4-11 2-10-4zM28 42v8M24 46h8M50 42a2 2 0 1 0 .1 0M56 47a2 2 0 1 0 .1 0',
  // A parcel and a cargo bike wheel.
  logistics:
    'M16 22h26v22H16zM16 30h26M29 22v8M58 56a8 8 0 1 0 .1 0M22 56a8 8 0 1 0 .1 0M30 56h20l-8-14h-12M50 56l6-14',
  // A scooter.
  mobility: 'M22 58a6 6 0 1 0 .1 0M58 58a6 6 0 1 0 .1 0M22 58h30l8-34h8M56 24h-6',
  // A shield with a keyhole.
  cybersecurity:
    'M40 12l22 8v16c0 14-10 24-22 30-12-6-22-16-22-30V20zM40 32a5 5 0 1 0 .1 0M38 37l-2 12h8l-2-12',
};

export function StartupArt(p: { sector: string; size?: number }) {
  const size = p.size ?? 64;
  return (
    <svg class="st-art" width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="38" class="st-art-ring" />
      <circle cx="40" cy="40" r="34.5" class="st-art-ring st-art-ring-fine" />
      <path d={ART[p.sector] ?? ART.fintech} class="st-art-line" />
    </svg>
  );
}
