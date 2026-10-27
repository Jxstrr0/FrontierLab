# Art Direction — "Banknote Deco"

**One idea:** the world is engraved like currency, and the interface is a quiet deco vault.

Spend the boldness on the map and the illustrations, the way a banknote's engraving is the memorable part. Keep the UI disciplined around it. Nothing in this look borrows from the original game's palette, iconography or panel styling.

---

## 1. Tokens

### 1.1 Colour

**UI:**

| Token | Hex | Use |
|---|---|---|
| `--vault` | #131D33 | App background, panel base (a deeper ink-navy since C8c) |
| `--vault-deep` | #0A1222 | Headers, tab bar, modal scrim base |
| `--vault-raised` | #1C2943 | Cards on navy |
| `--vault-band` | #182540 | The advisor bar's band |
| `--vault-pressed` | #263655 | A card or row being pressed |
| `--ivory` | #ECE8DA | Primary text on navy; newspaper paper |
| `--ivory-dim` | #B3B5AE | Secondary text |
| `--brass` | #B8913D | Accent: buttons, coins, active tab, focus ring |
| `--brass-light` | #D9BE7A | Hover/pressed, highlights, chart income bars |
| `--jade` | #3E8A73 | Positive deltas, healthy states |
| `--oxblood` | #9E3D3D | Negative deltas, warnings, counterfeit stamp |
| `--jade-text` / `--oxblood-text` | #6CC3A6 / #E07A7A | Jade and oxblood as text on navy |
| `--signal` | #3AAFBF | The AI accent (C8c): live compute only, as a fill or line (rack and status lights, glowing screens, info badges). Small and sparing; brass stays the lead |
| `--signal-text` | #6FD0DB | The signal as text on navy |
| `--paper` | #DFE7E7 | Map paper (pale blue-grey security paper, cooler since C8c) |

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
| Moscow | Brick Crimson #8C2F2F | St Petersburg | Neva Blue #3E6A8A |

**Brand inks.** The player picks one of 12: eight banknote colours (Vault Blue #2C4A7A, Emerald #2F7D5B, Garnet #8E2F3E, Royal Purple #5A3E7A, Copper #A8643A, Slate #4A5568, Gold #A88A2E, Teal #2A7A80) and four sharper modern ones (Graphite #22262D, Circuit Blue #1E5BD6, Ultraviolet #4B2DB5, Magenta #B0176B). All carry ivory text at ≥ 4.5:1. Rival brand inks are in CONTENT.

**Material washes.** A second, pale printing under the hatching on the branch fronts (§3), the way a banknote's underprint sits under its engraving. Each is laid at about a third strength, so a front still reads as a line drawing with a little colour in it.

| Token | Hex | Use |
|---|---|---|
| `--wash-brick` | #B8694A | Heritage Brick walls |
| `--wash-stone` | #C9AB7A | limestone: columns, cornices, string courses, the Deco tower |
| `--wash-glass` | #6F9BC4 | glazing, with the ink's own tint over it |
| `--wash-slate` | #5F7083 | roof slabs, fascias, the Modern Glass spandrels |
| `--wash-copper` | #5F9A86 | verdigris on the Deco setbacks |
| `--wash-leaf` | #5F8A46 | the planting in every house style's planters |

The brand ink is the sixth wash: awning stripes, the tympanum of the Classic Columns pediment, the canopy of the Modern Glass front and the spandrels and crown of the Deco tower take it, so your colour shows on the building itself and not only on the flag and the door.

**Contrast:** text on `--vault` must reach WCAG AA. Measured on #131D33: `--ivory` 13.7:1, `--ivory-dim` 8.1:1, `--brass` 5.7:1, `--jade-text` 8.0:1, `--oxblood-text` 5.8:1, `--signal-text` 9.4:1; brass on `--vault-raised` 4.9:1 and `--vault-deep` on a brass button 6.4:1. `--ivory-dim` is for ≥ 14 px text only. UI CSS takes every colour from these tokens; no hex values in component styles.

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
  - no flat fills except the paper, the water tint and the city's tint underprint (§2.1)
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
- **Data centers** (C8c, `src/art/buildingsDataCenter.ts`): a low, wide engraved hall instead of a storefront, about 1.2–1.5 storeys with a long parapet roofline, precast wall panels (ribs), a dense louvre band under the parapet, a loading door on the lit face, and a row of rooftop chillers with fan rings (round vents at close zoom). A small fenced substation yard with two transformers sits in front of it, and your brand flag stands on the roof.
- **Energy sites** draw a substation yard (fence, three transformers with bushings, a lattice pylon with cross-arms) beside a small control house; once you build a data center there, the hall replaces the control house. Both looks come only from the tile's art seed and stay inside the tile's draw bounds (tested), so chunk pre-rendering is unchanged; a build only repaints the chunks that tile touches.
- **Pins** (DOM; SCREENS §2). Silhouette first, then colour, then glyph, so a pin reads at a glance and without relying on hue:
  - **Crest** (shield): banks. Yours filled with your brand ink and monogram; rivals ivory with their ink ring and monogram; head offices add a brass crown.
  - **Coin**: open branch locations. A small ivory "$" coin with a milled edge at close zoom; nearer out, a quiet brass dot on the roof with no stem.
  - **Medallion**: places. A round coin filled with the type's own ink (`--type-*` tokens in tokens.css: oxblood, vermilion, teal, cobalt, plum, magenta, forest …) with an ivory glyph. Every glyph and caption on its ink reaches 4.5:1 (tested).
  - **Price tag**: things you rent or buy. A pointed tag with a punched hole: offices in light brass with dark ink, buildings and vacation homes in their type ink. Compact (just the glyph) until close zoom, where it adds its words ("For lease").
  - **Seal**: landmarks (central bank, airport, stadium). 32 px, scalloped.
  - **Yours, one colour:** every place you own (branches, HQ, property, vacation homes, clubs) is a crest in your brand ink. Branches carry your monogram; the rest carry their type glyph, so each reads apart. Partners (employers, universities) keep their type medallion with a small brand-ink tick.
  - **One footprint:** crests (26 × 30), medallions (28), tags (22 high) and seals (32) are all about the same size, so no kind of pin shouts over the others.
  - **Words at close zoom only:** captions, notes ("Sale wk 4", "For sale", "Converting") and tag words appear from close zoom (PIN_CAPTION_FROM_ZOOM); the normal view is symbols only.
  - The same per-type ink marks that type everywhere it appears: map pins, the Layers legend and panel headers.
  - Stacking, bottom to top: coins, tags, places and rivals, landmarks, yours.
- **Performance:**
  - Split the map into square screen-space chunks, 256 CSS px at each zoom stop, rendered once to an offscreen canvas at stop × devicePixelRatio. Each chunk draws every tile whose art touches it, back to front, so buildings overlap correctly across chunk edges.
  - In-between zooms scale the nearest stop's chunks; missing chunks show a scaled copy from another stop (or paper) and are painted about 6 ms per frame, nearest the centre first.
  - Keep at most 40 M px of chunks (least recently used goes first) to stay inside iOS Safari's canvas memory. A building change repaints only the chunks it touches.
  - Cull off-screen chunks.
  - Pins use `transform: translate3d`.

### 2.1 City looks

Every city has its own look (`src/data/cityLooks.ts`), so no two maps read alike:

- **Water** (`water`): none, coast, river, twin rivers, bay, lake, harbour, canals or islands. The shape is defined once and turned and mirrored with the city's district arrangement, so the waterfront always hugs the shore. Narrow water crossed by a street gets an arched **bridge** (deck, railings, piers); wide water gets piers and boats.
- **District arrangement** (`arrange`): the default district centres turned 0–3 quarter turns and optionally mirrored, then fitted to the land (waterfront 4 tiles in from the shore).
- **Big park** (`bigPark`): New York and Montréal get a park of 2×2 or 2×3 blocks between the financial district and the university.
- **Skyline** (`skyline`): scales the storeys of financial and downtown filler buildings.
- **Local style** (`style`): one of 14 vernaculars (prairie, glass, brick, painted, coastal, terrace, mansard, timber, canal, alpine, dense, colonial, tropical, outback). It changes rooflines (gables, mansards, stepped and bell gables, flat roofs with tanks), proportions, facade marks (chimney stacks, bay windows, fire escapes, shutters, verandahs, half-timbering, arcades), suburban houses, towers, industry and trees. Rows on neighbouring tiles join into continuous terraces around a court.
- **Signature landmark** (`signature`): one engraved one-of-a-kind building per city, described generically (a giant observation wheel, an iron lattice tower, a tall broadcast tower, a shell-roofed harbour hall, a stepped stone tower with a needle spire, a church crowned with onion domes …), never by a real name. Drawn with heavier lines so it reads at zoom 0.5. Water's-edge kinds sit on the block with the most open water beside them. Heights per kind are `SIGNATURE_HEIGHT_PX`.
- **Tint underprint** (`tint`): a pale second ink, like a banknote's underprint. Roof slopes get hatching over tinted paper, flat roofs a tinted fill, and lawns, yards and tree crowns a see-through wash. It stays restrained (about a third of the way from paper to tint) so the map still reads as an engraving.
- **Street life:** tree-lined avenues, plazas with fountains, and park furniture (paths, a fountain, pond, bandstand or statue in the middle of each park block).
- **Old saves:** cities generated before this change keep their original map (layout 1, see DATA_MODEL `CityState.layout`); new games and cities first visited later use these looks (layout 2).

### 2.2 The cover

The title screen leads with the map, the game's boldest art ("Living skyline", docs/COVER_SCREEN.md, SCREENS §1):

- **What it shows:** a strip of a real city printed by the map renderer, untouched: its ink, tint underprint, water, vernacular and signature landmark. A returning player sees the city they're in with their own roof flags (the usual `LotOccupant` flags, no new art); a new player sees a different city each launch.
- **Framing:** the panel is flat map paper on navy with no shadow or gradient, a 1 px outer rule and a hairline inner rule in the city ink, and the city name as all-caps microprint between them (the microprint and the logotype are the only all-caps text on the screen).
- **Motion:** a slow sideways drift of the printed strip (CSS only, nothing redraws). It's ambient motion, not a second signature moment; the Ledger press keeps that title. Reduced motion holds the strip still.
- **Before it prints:** paper, the rules and a faint guilloche in the city ink, then a 400 ms crossfade to the city.

## 3. Vignettes (panel hero art)

- **Format:** procedural SVG scenes at 16:9 in the city ink on ivory, with the same hatching rules.
- **Branch exterior:** one composition per exterior option, so the player sees what they built:
  - Plain Storefront: awning and big window
  - Heritage Brick: arched windows
  - Modern Glass: mullion grid
  - Classic Columns: pediment and four columns
  - Deco Tower Front: stepped crown and sunburst over the door
  - Lattice Pavilion: a thin roof slab floating over a box of smoked glass crossed by a diagrid, the seal hanging in the glazing, and a light wall in the brand ink beside the door with a ticker of dashes running down it
  - **Colour** (§1.1 material washes): each front is engraved over pale material colour, with the hatching kept on top: terracotta brick, warm limestone, cool glass, slate roofs and fascias, verdigris on the Deco setbacks, leaf green in the planters, and the brand ink on the awning stripes, pediment, canopy and spandrels. The Deco sunburst is brass.
  - **Logo shape** (CONTENT §7b), chosen on New Game: the bank's mark is one outline everywhere (`art/logoShapes.ts`), so the medallion in the top bar, the seal on the front, the plaque over the counter and the mark on an owned building all match. Round, shield, lozenge, hexagon, cut-corner plaque, a twelve-scallop rosette, a sharp tile, a rounded pebble or an octagon; rivals stay round.
  - **House style** (CONTENT §7a), chosen on New Game, dresses whichever option you built: the name sign (with the bank's full name), the door, the lamps, the planters and the roof flag. **Quant Noir** is the modern one: a graphite sign with the name in lower-case, widely spaced sans and a light strip in the brand ink, recessed light bars with a soft cone of light, graphite cube planters with clipped spheres, a frameless glass door with a glowing seam, and a slim light blade on the roof that pulses instead of a cloth flag (`branch/houseStyleQuant.tsx`). Each composition marks where they go (`FacadeAnchors` in `branch/houseStyleArt.tsx`), so a style reads the same on every front and no two banks on a street look alike.
  - Street life: two passers-by stroll the pavement, the flag stirs and garden lanterns and plants sway; all of it stops with reduced motion.
- **HQ floors:** an isometric cut-away office. **Desks and people reflect actual staffing** (filled desks vs empty), so understaffing is visible at a glance.
  - The room: plank floor (carpet for the Executive suite), walls with skirting and cornice, cut tops inked solid like an architect's section, mullioned windows throwing pale daylight across the floor, a clock and a door.
  - Workers sit at screens facing away from the viewer, each with their own hair and desk clutter, tinted by team mood; empty desks are dashed with the chair pushed in.
  - Each department furnishes its floor: Finance cabinets and certificates, HR a water cooler and pinboard, Products a whiteboard sketch, Treasury and IT a live ticker (IT also blinking storage bays), Marketing posters and an easel, Risk a safe and a chart, the Executive suite books, a sofa, a painting and a huddle table.
  - Busy floors come alive: someone walks the front aisle with a folder, two colleagues chat at the back, and a well-staffed floor's huddle table has people at it.
- **Data center** (C8c, the hero on the data center panel and the build preview, with an Outside / Inside toggle):
  - **Exterior** (`dataCenter/DataCenterArt.tsx`): a low precast hall that widens with the hall size (a split line on twin halls, a second hall behind a campus), a louvre band, a glazed entrance with a brand-ink canopy and your seal, roller doors, and rooftop units by cooling (air: fan rings; liquid: dry coolers and a pipe run; immersion: three low units). A fenced transformer yard stands to the left; at an energy site a pylon and faint wind turbines behind it. During fit-out a crane lowers the last chiller.
  - **GPU hall interior** (`dataCenter/GpuHallArt.tsx`): an isometric cut-away on a raised tile floor with no windows. Rows of rack cabinets (2×6, 3×7 or 3×9 by hall) under a ladder cable tray; lit racks show running GPUs with signal-cyan lights, idle racks stay dark and dense, so the share running reads at a glance (the caption says "X of Y GPUs running"). Cooling dresses the room (air grilles and a CRAH unit, liquid hoses and pipes, or immersion tanks instead of racks), and the switchgear on the left wall grows with the power option. A technician walks the front aisle; fit-out shows dashed empty rack outlines and a ladder.
- **Sales office interior** (the Inside view on a sales office or the build preview; re-skinned from the bank's hall in C8c): an isometric cut-away lab storefront and workspace drawn from the fit-out.
  - The teller line takes its option's shape: a glazed counter (Two-Window, Standard), an open express counter, separate service pods, or concierge desks with seated staff and clients.
  - The lobby sets the floor (tiles, planks, carpet, a marble checker) and the number of glass advisor offices along the left wall.
  - The secure-room option puts a machine room on the back wall (one rack cabinet; a glazed room of two racks with a badge reader; a wider glazed room of three) beside a wall of server units that grows with the box count, or a single floor-standing rack for the back-office option. Demo kiosks with a chat screen stand by the left wall, and the lab's monogram plaque hangs over the counter in the brand ink. The build options keep their ids (`vlt_*`, `atm_*`), so saves are unaffected.
  - Live figures fill it: tellers first, then advisors, then a greeter, tinted by staff morale, and a queue as long as the wait behind brass posts and a rope, with a sofa of waiting customers when it is busy. A branch in fit-out shows a ladder and boxes and nobody inside.
- **Interior motion:** quiet and small. People breathe and type (under a pixel), screens flicker, rack and IT lights blink in `--signal`, plants sway, clock hands turn, and a walker or arriving customer crosses the room. All of it stops with reduced motion (system or in-game setting).
- **Other buildings:** one composition each — investment bank (trading floor), central bank (dome and steps), credit bureau (storage bays and filing cabinets), airport (terminal and tail fins), auction house (gallery with podium), car dealer (showroom), convention (hall with booths), university (quad), employer (by type), stadium.
- **Products, campaigns and benefits:** small spot illustrations (80×80) in a single ink.

## 4. Portraits

- **Frame:** an oval vignette with a guilloche border, like a banknote portrait.
- **Generator** (`src/art/portraits.ts`, with `portraitParts`, `portraitFace`, `portraitTrim` and `portraitAttire`), drawn in fine hatch lines from parts:
  - head shapes 4, hair 12, facial hair 4, glasses 4 (none, round, square, half-rim)
  - eyes 4 (almond, round, hooded, upturned), brows 3 (soft arch, straight, bold), mouth 3 (smile, composed, grin), age 3 (fresh, seasoned, veteran)
  - attire: suit, blouse, sweater, turtleneck
  - shading density 3
- **Face detail (v0.10.18):** eyes are paper whites with an ink iris, a pupil and a catchlight, a heavier upper lid with a lash flick and a faint lower lid; brows are tapered strips of hair strokes; the nose has a bridge shadow on the shadow side, wings and nostrils; lips have a cupid's bow and a hatched lower lip with a chin shadow beneath. Age adds smile lines, crow's feet and forehead lines, and veterans get pouches, hollow cheeks, neck lines and silver hair (a fainter fill, wider hatching). Ears show an inner helix. Light comes from the upper left: the right cheek, jaw, temple, eye socket and shoulder carry the shade.
- **Hair:** tinted fill, engraved hatching in the style's direction, and sparser strand lines over it; close crops are stippled.
- **Attire detail:** the suit has a knotted tie with cross-hatching, a shaded right lapel, buttons, a pocket square and sleeve seams; the blouse has shoulder folds and a pendant; the sweater a cross-knit texture and a shirt collar under the crew band; the turtleneck fold lines and a band of shade under the collar.
- **Background:** ruled horizontal lines behind the figure, denser in a band at the rim, so the plate fades toward the frame like a banknote vignette.
- **Tiny plates (under 44 px):** the coarse plate keeps the whites, iris, pupil, lids, brows, nose, mouth and attire shapes and drops the catchlight, strands, age lines, seams, glints and the ruled ground, with heavier strokes.
- **Skin tone:** a subtle ink-tinted fill under the hatching. Offer 6 tones; never render tone by line density alone.
- **Diversity:** the name pools and portrait parts are diverse. Pick parts deterministically from `people` RNG plus the person id; eyes, brows, mouth and age hash from the other parts (`people.ts` faceDetail) so the stream stays as it was.
- **Founder avatar:** the player chooses the parts in the wizard, in two groups (Face: head, eyes, brows, mouth, age, skin tone; Style: hair, facial hair, glasses, attire), with a Shuffle button for a random face.

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

## 6. The Weekly Ledger

- **Paper:** ivory with grain. The masthead "The Weekly Ledger" is Bodoni Moda 900, tight tracking, centered, between a double rule with the date at the right.
- **Tabs:** text links with a brass underline on the active tab.
- **Articles:**
  - two columns separated by a hairline
  - a small single-ink vignette icon per article type (bank façade, dome for central banks, chart line, gavel, trophy…)
  - headlines in Bodoni 20 px; body in Public Sans 14 px on ivory with dark ink text #22252B

## 7. Icons

- **Style:** custom set on a 24 px grid, 1.5 px stroke, rounded caps and joins. Drawn in brass on navy and ink on ivory, and ivory on the type inks in map pins (§2).
- **Distinct at a glance:** no two glyphs share a silhouette at 20 px (data vendor = database cylinder, rival lab = shopfront with a beacon mast, lobbying firm = podium with microphone, convention = lanyard badge, vacation home = palm on an island).
- **AI re-skin (C8c), ids kept:** `branch` is a shopfront with a scalloped awning (sales office), `bureau` a database (data vendor), `bank` a rival lab with a beacon mast, `vault` a lockable rack cabinet, `atm` a kiosk with a chat screen, `teller` a counter with a person. New: `gpu` (a chip with pins; the Compute floor tab) and `model` (a radar rosette; the Products floor tab).
- **Starter list:** gpu, model, branch, office, real estate, bureau, bank, investment bank, agency, convention, lobby, stadium, car, gavel, university, employer, airport, plane, coin, vault, ATM, teller, chart, shield, warning, person, people, settings, save, menu, layers, close, pause, play, fast, trade, handshake, key, leaf.

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
- use drop-shadowed SaaS cards, gradients or neon accents (the one cool `--signal` accent is for small status lights and screens only, never large fills or glows)
- use all-caps eyebrow labels
- use generic stock illustrations
