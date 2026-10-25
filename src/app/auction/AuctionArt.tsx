// Auction house art (ART_DIRECTION §3): a small brass icon per collectible
// category for lot and item cards, the red "FAKE" stamp laid over a
// counterfeit, and the saleroom vignette (rostrum, easel and raised paddles)
// engraved in the city ink for the panel hero.
import { rect } from '../../art/engrave';
import type { CollectibleSpec } from '../../data/collectibles';
import { Face, Hatch, Vignette } from '../components';
import '../storefront/storefront.css';

const ICONS: Record<CollectibleSpec['category'], string> = {
  // Ball with seams.
  sports: 'M28 10a18 18 0 1 0 .1 0M14 18c8 6 20 6 28 0M14 38c8-6 20-6 28 0M28 10v36',
  // Gilt frame with a portrait.
  art: 'M10 10h36v36H10zM15 15h26v26H15zM28 22a4 4 0 1 0 .1 0M20 38c2-6 5-8 8-8s6 2 8 8',
  // Coin with milled edge and a profile.
  coins: 'M28 10a18 18 0 1 0 .1 0M28 15a13 13 0 1 0 .1 0M24 22c4-2 8 0 8 4s-3 5-3 8h-5',
  // Figure on a stepped plinth.
  sculpture:
    'M28 10a3 3 0 1 0 .1 0M28 15v14M28 18l-9-5M28 18l9-5M24 38l4-9 4 9M18 38h20v4H18zM15 42h26v4H15z',
  // Wristwatch.
  watches: 'M22 8h12l1 9M22 8l-1 9M21 39l1 9h12l1-9M28 17a11 11 0 1 0 .1 0M28 22v6l4 3M40 26h2',
  // Scroll with lines of writing.
  memorabilia: 'M14 12h26v32H18a4 4 0 0 1-4-4zM14 12a4 4 0 0 0-4 4v4h4M20 20h14M20 26h14M20 32h10',
  // Closed book with a ribbon.
  books: 'M14 10h26v36H14zM18 10v36M24 18h12M24 23h9M34 46v4l-2-2-2 2v-4',
  // Lidded vase.
  antiques: 'M24 8h8M23 11h10l-2 5c7 3 9 10 8 17-1 6-5 11-11 11s-10-5-11-11c-1-7 1-14 8-17z',
};

export function CollectibleIcon(p: { category: CollectibleSpec['category']; fake?: boolean }) {
  return (
    <span class="au-icon">
      <svg viewBox="0 0 56 56" role="img" aria-label={`${p.category} piece`}>
        <rect width="56" height="56" class="art-ground" />
        <path d={ICONS[p.category]} class="art-line" />
      </svg>
      {p.fake && <FakeStamp />}
    </span>
  );
}

/** The red rubber stamp over a counterfeit (REFERENCE_NOTES: "FAKE", value 0). */
export function FakeStamp() {
  return (
    <span class="au-stamp" aria-label="Counterfeit">
      FAKE
    </span>
  );
}

const PADDLES = [52, 92, 228, 268];

export function AuctionArt() {
  return (
    <Vignette label="A saleroom with a rostrum">
      <g transform="translate(0 16)">
        <path d="M0 116h320" class="art-line" />
        {/* Panelled back wall and a chandelier. */}
        <Hatch pts={rect(20, 90, 280, 26)} density="light" angle={90} />
        <path d="M20 90h280" class="art-line art-fine" />
        <path d="M20 116V24h280v92M20 24l20-12h240l20 12" class="art-line art-fine" />
        {[40, 100, 196, 256].map((x) => (
          <path d={`M${x} 40h28v40h-28z`} class="art-paper" />
        ))}
        {[40, 100, 196, 256].map((x) => (
          <path d={`M${x} 40h28v40h-28zM${x + 4} 44h20v32h-20z`} class="art-line art-fine" />
        ))}
        <path d="M160 12v10M146 30h28M150 30l-4 8M170 30l4 8M160 22v8" class="art-line art-fine" />
        {/* Rostrum with the auctioneer and gavel. */}
        <Face pts={rect(136, 78, 48, 38)} density="medium" angle={90} />
        <Face pts={rect(132, 74, 56, 4)} />
        <path d="M144 92h32" class="art-line art-fine" />
        <path d="M160 52a6 6 0 1 0 .1 0M150 78c1-10 5-14 10-14s9 4 10 14" class="art-line" />
        <path d="M172 62l10-6M180 52l6 8" class="art-line" />
        {/* Easel with the lot on view. */}
        <path d="M214 116l12-50 12 50M226 66v50M210 50h32v26h-32z" class="art-line" />
        <Face pts={rect(216, 56, 20, 14)} density="dense" angle={-30} outline="fine" />
        {/* Bidders with raised paddles. */}
        {PADDLES.map((x, i) => (
          <g key={x}>
            <path
              d={`M${x} 98a5 5 0 1 0 .1 0M${x - 9} 116c1-8 4-11 9-11s8 3 9 11`}
              class="art-line art-fine"
            />
            {i % 2 === 0 && (
              <path d={`M${x + 8} 104l4-14M${x + 9} 84a5 5 0 1 0 .1 0`} class="art-line" />
            )}
          </g>
        ))}
      </g>
    </Vignette>
  );
}
