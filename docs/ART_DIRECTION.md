# Art Direction — "Banknote Deco"

**One idea:** the world is engraved like currency, and the interface is a quiet deco vault.

Spend the boldness on the map and the illustrations, the way a banknote's engraving is the memorable part. Keep the UI disciplined around it. Nothing in this look borrows from the original game's palette, iconography or panel styling.

---

## 1. Tokens

### 1.1 Colour

**UI:**

| Token | Hex | Use |
|---|---|---|
| `--vault` | #18233A | App background, panel base |
| `--vault-deep` | #0F1828 | Headers, tab bar, modal scrim base |
| `--vault-raised` | #22304A | Cards on navy |
| `--ivory` | #EEE7D3 | Primary text on navy; newspaper paper |
| `--ivory-dim` | #B9B3A2 | Secondary text |
| `--brass` | #B8913D | Accent: buttons, coins, active tab, focus ring |
| `--brass-light` | #D9BE7A | Hover/pressed, highlights, chart income bars |
| `--jade` | #3E8A73 | Positive deltas, healthy states |
| `--oxblood` | #9E3D3D | Negative deltas, warnings, counterfeit stamp |
| `--paper` | #E3E9DF | Map paper (pale sage security paper) |

**City inks.** Each city's map is printed in its own ink, like a banknote denomination. Use the ink for linework, with 3 hatch densities derived from it.

| City | Ink | City | Ink |
|---|---|---|---|
| Saskatoon | Prairie Ochre #8A6A2C | London | Sterling Plum #5B3B66 |
| Calgary | Foothill Olive #5B6B34 | Paris | Lumière Rose #9A4F62 |
| Vancouver | Harbour Blue #2F5D8A | Frankfurt | Mint Grey #4F6E64 |
| Toronto | Polymer Teal #2C6E7F | Amsterdam | Canal Blue #3D6584 |
| Montréal | Rose Granite #8A4E5C | Zürich | Alpine Slate #4A5A6E |
| New York | Federal Green #2E5E4E | Tokyo | Indigo #2E3F78 |
| Chicago | Lake Steel #3F5F78 | Sydney | Coral #A65A45 |
| San Francisco | Fog Violet #5E5878 | Singapore | Orchid #7A4A85 |
| Seattle | Evergreen #355E45 | Hong Kong | Jade Harbour #2F7A6A |

**Brand inks.** The player picks one of 8: Vault Blue #2C4A7A, Emerald #2F7D5B, Garnet #8E2F3E, Royal Purple #5A3E7A, Copper #A8643A, Slate #4A5568, Gold #A88A2E, Teal #2A7A80. Rival brand inks are in CONTENT.

**Contrast:** text on `--vault` must reach WCAG AA. `--ivory` on `--vault` ≈ 12:1. `--ivory-dim` is for ≥ 14 px text only.

### 1.2 Type
- **Display:** Bodoni Moda (@fontsource/bodoni-moda), weights 500/700/900. Used for panel titles, big hero numbers (≥ 28 px), the Ledger masthead and headlines, and the title logo. It uses lining figures.
- **UI:** Public Sans (@fontsource/public-sans), weights 400/500/600/700. Used for everything else. Numbers use `font-variant-numeric: tabular-nums`.
- **Scale (px):** 12 · 14 · 16 · 20 · 24 · 32 · 44. Body 16 / 1.45.
- **Case:** sentence case everywhere, with no all-caps labels. The only exceptions are tickers (SLVS) and the engraved logotype.

### 1.3 Shape, line and depth
- **Cards:** "certificate" style — a 1 px `--brass` hairline at 40% opacity, an inner second hairline 3 px inside, and small SVG corner rosettes. Radius 6 px.
- **Pills and buttons:** radius 999. The primary button is a brass fill with `--vault-deep` text; the secondary is a brass outline.
- **Depth:** no drop shadows. Use the double rule, a paper-grain overlay (2% noise) on ivory surfaces, and a 1 px top highlight on raised cards.
- **Dividers:** a thin brass rule with a centered diamond ◆ on section breaks only.

### 1.4 Motion
- **One signature moment:** the weekly results Ledger slides up and lands with a soft "press" (a scale from 1.02 to 1 and an ink-darken flash, 220 ms).
- **Responsive motion:**
  - coin fills animate when ratings change
  - steppers tick
  - panels slide (200 ms, ease-out)
- **Planes** follow a dotted arc during travel.
- **Reduced motion:** honour `prefers-reduced-motion` and the in-game setting by turning animations into crossfades.

## 2. The map

- **Projection:** 2:1 isometric. Tile footprint 64×32 px at zoom 1. Three zoom stops (0.5, 1, 2), with pinch interpolating between them.
- **Paper:** the `--paper` base, a faint guilloche wave pattern across the whole map at 6% opacity, and a microprint border ring with the city name repeated in tiny caps like banknote microtext.
- **Linework:**
  - every building outline in the city ink, 1.25 px at zoom 1
  - faces shaded with 45° hatching at three densities: light for faces toward the light, medium, and dense
  - no flat fills except the paper and the water tint
- **Procedural buildings** (`src/art/buildings.ts`), by district:

  | District | Buildings |
  |---|---|
  | Financial | tall towers with vertical window ribs and setback crowns |
  | Downtown | mid-rise with cornices |
  | Midtown | rowhouses |
  | Suburbs | gabled houses with yards |
  | University | quad with a clock tower |
  | Industrial | sawtooth roofs and stacks |
  | Waterfront | piers and glass |

  Seeded per lot, so each city looks consistent between sessions.
- **Water:** horizontal wavy guilloche lines in the ink at 50%, over a pale tint of the ink.
- **Parks:** stipple dots plus lollipop trees drawn with spiral strokes.
- **Streets:** paper-coloured, with dashed centrelines in the ink at 30%.
- **Your branches** add a small brand-ink flag on the roof.
- **Pins** (DOM): 30 px medallions with a brass rim and an engraved inner ring.
  - Inside: a type icon (24 px grid).
  - Yours: filled with your brand ink plus your monogram.
  - Rivals: an ivory fill with their ink ring and monogram.
  - For lease: a rectangular ivory tag with a brass outline, "For lease".
- **Performance:**
  - Split the map into square screen-space chunks, 256 CSS px at each zoom stop, rendered once to an offscreen canvas at stop × devicePixelRatio. Each chunk draws every tile whose art touches it, back to front, so buildings overlap correctly across chunk edges.
  - In-between zooms scale the nearest stop's chunks; missing chunks show a scaled copy from another stop (or paper) and are painted about 6 ms per frame, nearest the centre first.
  - Keep at most 40 M px of chunks (least recently used goes first) to stay inside iOS Safari's canvas memory. A building change repaints only the chunks it touches.
  - Cull off-screen chunks.
  - Pins use `transform: translate3d`.

## 3. Vignettes (panel hero art)

- **Format:** procedural SVG scenes at 16:9 in the city ink on ivory, with the same hatching rules.
- **Branch exterior:** one composition per exterior option, so the player sees what they built:
  - Plain Storefront: awning and big window
  - Heritage Brick: arched windows
  - Modern Glass: mullion grid
  - Classic Columns: pediment and four columns
  - Deco Tower Front: stepped crown and sunburst over the door
- **HQ floors:** an isometric cut-away office. **Desks and people reflect actual staffing** (filled desks vs empty), so understaffing is visible at a glance.
- **Other buildings:** one composition each — investment bank (trading floor), central bank (dome and steps), credit bureau (server racks and filing cabinets), airport (terminal and tail fins), auction house (gallery with podium), car dealer (showroom), convention (hall with booths), university (quad), employer (by type), stadium.
- **Products, campaigns and benefits:** small spot illustrations (80×80) in a single ink.

## 4. Portraits

- **Frame:** an oval vignette with a guilloche border, like a banknote portrait.
- **Generator** (`src/art/portraits.ts`), drawn in fine hatch lines from parts:
  - head shapes 4, hair 12, facial hair 4, glasses 3
  - attire: suit, blouse, sweater, turtleneck
  - shading density 3
- **Skin tone:** a subtle ink-tinted fill under the hatching. Offer 6 tones; never render tone by line density alone.
- **Diversity:** the name pools and portrait parts are diverse. Pick parts deterministically from `people` RNG plus the person id.
- **Founder avatar:** the player chooses the parts in the wizard.

## 5. Data visuals

- **RadarRosette:**
  - The pentagon grid is drawn as 4 concentric guilloche wave-rings, not straight polygons.
  - The data polygon is filled with brass at 25% and stroked in brass at 1.5 px.
  - Vertex dots are 3 px.
  - Labels are Public Sans 12 px, outside the shape.
- **CoinRating:** five 18 px brass coins with a tiny star emboss. Partial fill uses a clip-path. Empty coins are a brass outline at 35% opacity.
- **Bars:** revenue in ivory, income in brass. Rounded tops of 2 px. Show values on tap.
- **RingGauge:** a 6 px brass ring on a 6 px `--vault-raised` track, with the % in Bodoni 20 px in the center.
- **Donut:** segments in a palette derived from the city inks, with fine diagonal engraving lines inside each segment.
- **Line charts:** 1.5 px strokes, no area fills, and a dotted brass marker for "now".

## 6. The Daily Ledger

- **Paper:** ivory with grain. The masthead "The Daily Ledger" is Bodoni Moda 900, tight tracking, centered, between a double rule with the date at the right.
- **Tabs:** text links with a brass underline on the active tab.
- **Articles:**
  - two columns separated by a hairline
  - a small single-ink vignette icon per article type (bank façade, dome for central banks, chart line, gavel, trophy…)
  - headlines in Bodoni 20 px; body in Public Sans 14 px on ivory with dark ink text #22252B

## 7. Icons

- **Style:** custom set on a 24 px grid, 1.5 px stroke, rounded caps and joins. Drawn in brass on navy and ink on ivory.
- **Starter list:** branch, office, real estate, bureau, bank, investment bank, agency, convention, lobby, stadium, car, gavel, university, employer, airport, plane, coin, vault, ATM, teller, chart, shield, warning, person, people, settings, save, menu, layers, close, pause, play, fast, trade, handshake, key, leaf.

## 8. Sound (optional, Stage 10)
- coin clink on positive weekly results
- paper slide for the Ledger
- soft stamp for approvals and counterfeit reveals
- vault latch for opening panels

Keep everything under 30 KB each, off by default on first launch, and toggleable.

## 9. Do and don't

**Do:**
- let engraving carry the personality
- keep panels calm and readable
- show real state in the art (desks, rooftop flags, coins)

**Don't:**
- use browns or coffee palettes
- copy the original's icons or layouts pixel-for-pixel
- use drop-shadowed SaaS cards, gradients or neon accents
- use all-caps eyebrow labels
- use generic stock illustrations
