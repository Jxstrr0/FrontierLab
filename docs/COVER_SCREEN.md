# Cover screen: "Living skyline" — handoff and design doc

**For:** a Claude Code session working the `Jxstrr0/VaultStreet` repo (now forked as `Jxstrr0/FrontierLab`)
**From:** Kelbo (owner), via a design session on 26 Oct 2026
**Status:** design approved (pitch 3 of 6). Build it.

---

## 0. Paste this into the Claude Code session

> Read `CLAUDE.md`, then this doc (`docs/COVER_SCREEN.md`). Build the "Living skyline" title screen it describes on its own branch, following the repo's branch/PR/auto-merge rules. Keep Continue, New game, Load, Settings, Credits and Check for updates working exactly as they do now. Check it at 390×844 first. Update SCREENS §1, ART_DIRECTION, the DESIGN decision log and PROGRESS.md, and bump the version.

(Save this file into the repo as `docs/COVER_SCREEN.md` first, or paste the whole thing into the session.)

---

## 1. What we're building, in one paragraph

Swap the title screen's top half (now a faint brass rosette behind the wordmark) for a **live engraving of a real Vault Street city**, drawn by the game's own map renderer and printed in that city's ink. The engraving pans slowly left and right. A **returning player** sees the city they're in, with **their lab's flags on the rooftops** of the lots they own. A **new player** sees a different city on each launch. The wordmark, tagline and menu sit underneath on the navy vault background. The cover is the game showing you its best art (the map) before you've even tapped.

## 2. Why this one

- The engraved city map is the game's most memorable art (ART_DIRECTION: "spend the boldness on the map"). The current cover doesn't use it.
- It's mostly built already: `src/art/lab/maplab.ts` renders a full city with player flags from a seed in about 100 lines. The cover is basically a production version of the map lab.
- A returning player sees their own city with their own flags, so Continue feels like coming home.
- On a new install it changes on every launch, which shows off all 20 cities' looks (water, vernacular, signature landmark).

## 3. Layout (phone, 390×844 portrait)

Top to bottom, inside the existing safe-area padding (16 px gutters):

| Block | Spec |
|---|---|
| **Skyline panel** | Full width (358 px), **420 px tall** (about half the screen; on short phones scale it with `clamp(300px, 50svh, 440px)`). Radius 6. Paper `--paper` #E3E9DF. Shows the city render (§5). |
| Panel frame | A 1 px outer rule and a 0.4 px inner rule in the city ink, inset 6 px and 18 px, like the map's microprint border. Top and bottom strips of the frame carry the city name in tiny caps repeated (microprint, 5.5 px, letter-spacing ~1.3), `aria-hidden`. |
| Caption row | 10 px below the panel. Left: "Now showing Saskatoon" (12 px, `--ivory-dim`). Right: 5 small brass dots, the first filled (a quiet hint that it changes; decorative, `aria-hidden`). Returning player: "Northgate Labs · Saskatoon" instead (lab name · current city). |
| Wordmark | "VAULT STREET", **one line**, Bodoni Moda 900, 38 px, letter-spacing 0.08em, uppercase (the one place caps are allowed). |
| Tagline | "Found a lab. Build an empire." 14 px `--ivory-dim`. |
| Menu | Continue (primary brass) and New game (secondary), full width, 48 px tall, 10 px gap. Then **Load / Settings / Credits** in one row of three 44 px pills (secondary, 14 px). With no save: New game is primary and there's no Continue. |
| Footer | One line: "A Longlight Interactive game · v{version}" left (12 px dim), **Check for updates** button right (min 44 px tall, brass-light). Keep the existing `UpdateButton` logic. |

**Wider screens (≥ 900 px):** two columns. The skyline panel on the left at `min(60vw, 760px)` wide and full height minus padding. The wordmark, tagline, menu and footer in a column on the right, vertically centred, max 360 px wide.

**Landscape phone:** same as wide, or stack if the height is under 500 px (panel 45% of the height).

The approved mockup (claude.ai design canvas "Vault Street Cover Pitches", board "3 · Living skyline") used a hand-drawn stand-in skyline. **The real build uses the real renderer**, so it will look better than the mockup. Match the layout, not the stand-in art.

## 4. Behaviour

### 4.1 Which city is shown

| Situation | City | Flags |
|---|---|---|
| A save exists (`latestSlot()` returns one) | The latest save's **current city** (`state.world.currentCityId`; fall back to `state.meta.homeCityId`) | The player's owned lots in that city, in their brand ink. Rival lots in rival inks if cheap to get. |
| No save | Rotate through the 20 storefront cities, one step per launch. Start at Saskatoon. | Three "showcase" flags in Vault Blue #2C4A7A on the free lots nearest the focus, like the map lab does. Or no flags at all. Pick whichever reads better. |

- Store the rotation index as a **per-device preference** (next to `loadPrefs`/`savePrefs` in `src/sim/save/storage.ts`, e.g. a `coverCityIndex` key). It's a convenience. Wrap reads and writes in try/catch and default to 0.
- Use the save's seed so the returning player's city looks exactly like their in-game map.

### 4.2 Getting the data without loading the whole save

Loading and decompressing the full save just to draw the cover would slow the title screen. **Preferred approach:** add optional fields to `SaveMeta` (the slot card record, not `GameState`, so **no schemaVersion bump**):

```ts
// SaveMeta additions (all optional; old slots don't have them)
cover?: {
  cityId: string;      // current city at save time
  seed: number;        // state.meta.seed
  layout: number;      // CityState.layout for that city (1 = old saves, 2 = city looks)
  flags: string[];     // ids of the player's lots/offices (and data-center energy sites) in that city (cap at ~12)
  dataCenters?: string[]; // which of those flags are data centers: printed as low halls, not storefronts
};
```

Fill it in `slotMetaFor()`. On the title screen, build the map like the map lab does (`newGame({ seed, cityId, layout })` → lots → `generateCityMap` → `createMapRenderer` → `setOccupants`).

**Check first:** whether lot ids and positions from a fresh `newGame({seed, cityId, layout})` match the saved game's lots for that city. If they don't (lots added later, a city first visited mid-game, etc.), either:
- (a) store the few tile coordinates you need in `cover.flags` instead of ids and place flags by tile, or
- (b) fall back to no flags for that save.

Don't decompress the save on the title screen. Measure `newGame()` on an iPhone-class CPU. If it costs more than ~40 ms, find the lighter world/lot generator it calls and use that directly.

**Old slots** (no `cover` field): show the brand ink and lab name in the caption, and use the "no save" rotation city for the art. The next autosave fills it in.

### 4.3 Rendering approach (keep it cheap)

Don't run a live pannable map on the title screen. Instead:

1. Create the renderer once for the chosen city.
2. Render **one wide strip** into an offscreen canvas: panel height × (panel width + 2 × pan distance), at `devicePixelRatio`, at a fixed zoom (start at **0.75** and tune between 0.5 and 1). Centre the camera on `map.geo.focus` (the financial district), nudged so the signature landmark is in frame if it's close (`map.landmarks.find(l => l.id === 'signature')`).
3. `render()` returns `true` while chunks are still painting. Keep calling it on `requestAnimationFrame` until it returns `false`, against a 1 × 1 scratch canvas and with `prefetch: false` (no ring around the view, no lower zoom stop), so each frame costs only its chunk work; then render the strip **once** onto the real canvas from the finished chunks and **`dispose()` the renderer** to free the chunk cache. (Repainting the 4 M px strip every frame cost 4–5 s of main-thread blocking on a slow phone; launch re-check, 2026-10-29.)
4. Show that canvas inside the panel and **pan it with a CSS `transform: translateX()` animation**: ±26 px (scale with width), 26 s per sweep, `ease-in-out`, `alternate`, infinite. No canvas redraws while panning.
5. **Memory:** the strip at DPR 3 on a 390 px phone is ~2–3 M px. That's fine, but cap the backing store at ~4 M px (lower the DPR if needed) to stay well inside iOS Safari's canvas limits.

### 4.4 Loading and first paint

- The title screen must **appear as fast as it does now**. Put the skyline in its own lazy chunk (`src/app/lazy.tsx` pattern) so the renderer, citygen and newGame aren't in the title's critical path.
- Until the strip is ready, show the **empty panel**: paper colour, frame rules, microprint, and a faint guilloche wave pattern (reuse `src/art/guilloche.ts` or `printPatterns.ts`) at ~6–12% in the city ink. Then **crossfade** the city in over 400 ms.
- If anything throws (bad meta, unknown city), keep the empty paper panel. Never block the menu, and never show an error on the title.

### 4.5 Motion and settings

- **Reduced motion** (system `prefers-reduced-motion` **or** the in-game setting via saved prefs, the same as `DisplaySync` in `App.tsx` uses): no pan. Show the strip centred and static. Fade-ins become instant or a 200 ms crossfade.
- Pause the pan animation when the page is hidden (`visibilitychange`) to save battery.
- Optional sound: none. The title stays silent, and sound is off by default anyway.

### 4.6 Navigation

- Leaving the title (New game, Load, Settings, Credits, Continue) unmounts the skyline and frees the canvas.
- Coming back to the title (Exit to title) rebuilds it. For a returning player that shows the city they just left, with the flags they just earned.
- The "update ready, reloading" flow in `src/app/pwa/register.ts` must still work from this screen.

## 5. Art rules (from ART_DIRECTION, don't break these)

- City inks come from the city data (`city.ink`). The renderer already handles the tint underprint, hatching, water, landmarks and the city's vernacular. Don't restyle it for the cover.
- Brand flags use the existing `LotOccupant` → roof-flag path. No new flag art.
- No drop shadows, gradients or neon. The panel sits flat on navy.
- Sentence case everywhere except the logotype and the microprint.
- Text contrast: `--ivory-dim` only at ≥ 14 px on navy (the 12 px caption and footer use `--ivory-dim` today, so match the existing footer).
- Add a short subsection to ART_DIRECTION (new §2.2 "The cover") describing this. Note that the slow pan is ambient motion, not a second "signature moment" (the Ledger press keeps that title).

## 6. Accessibility

- The skyline panel is decorative but meaningful. Wrap it in a `role="img"` with an `aria-label` such as: "An engraved map of Saskatoon printed in prairie ochre, with your lab's flags on three rooftops." For a new player, drop the flags clause.
- The microprint and dots are `aria-hidden`.
- Every menu button is a real `<button>`, ≥ 44 px tall. Focus order: Continue, New game, Load, Settings, Credits, Check for updates.

## 7. Files you'll probably touch

| File | Change |
|---|---|
| `src/app/title/TitleScreen.tsx` | New layout. Mount `<CoverSkyline/>` (lazy). Drop the rosette lockup (keep `Rosette.tsx` if used elsewhere, delete it if not). |
| `src/app/title/title.css` | New layout, wide-screen columns, reduced-motion rule, pan keyframes. |
| `src/app/title/CoverSkyline.tsx` (new) | Panel, placeholder, canvas strip, crossfade, pan. |
| `src/app/title/coverCity.ts` (new, pure) | `pickCoverCity(meta, prefs, cityIds)` and `coverCamera(map, panelSize, zoom)`. No DOM, so it can be unit-tested. |
| `src/sim/save/storage.ts` | `SaveMeta.cover?` and filling it in `slotMetaFor()`. Pref key for the rotation index. |
| `src/config/map.ts` (or a new `src/config/cover.ts`) | Every cover number: `COVER_ZOOM`, `COVER_PAN_PX`, `COVER_PAN_SECONDS`, `COVER_PANEL_HEIGHT`, `COVER_MAX_PIXELS`, `COVER_FADE_MS`. No magic numbers in components. |
| `docs/SCREENS.md` §1 | Rewrite the title screen bullet list to this layout. |
| `docs/ART_DIRECTION.md` | New §2.2 "The cover". |
| `docs/DESIGN.md` | Decision log line: "Title screen shows a live engraving of your current city (Living skyline); rotates cities for new players." |
| `docs/PROGRESS.md` | Session entry in plain language for the owner. |
| `package.json` | Version bump: minor if it feels like a feature (0.11.0), otherwise a patch. Check what landed on `main` first. |

## 8. Tests

- `coverCity.ts`: a save with `cover` → its city. A save without `cover` → the rotation city. No save → index 0 is Saskatoon, the index wraps after 20, and an unknown city id falls back safely.
- `coverCamera`: the camera keeps the strip inside the map bounds, and it's centred on the focus when the map is smaller than the strip.
- Storage: `slotMetaFor()` includes `cover`. An old meta without it still loads in `allSlotMeta()` and on the Saves screen.
- The existing determinism, save round-trip and balance tests stay green. No sim code should change.

## 9. Acceptance checklist (Definition of done)

- [ ] At 390×844 in iOS Safari and in Chrome mobile emulation, the layout matches §3. No horizontal scroll, and safe areas are respected.
- [ ] With no save: Saskatoon on first launch, then a different city on each relaunch.
- [ ] With a save: the current city appears with brand-ink flags on owned lots. Continue resumes the game.
- [ ] The menu shows instantly. The city fades in once painted. A slow device never blocks a tap.
- [ ] Reduced motion (system or in-game) means no pan.
- [ ] Leaving the title frees the canvas, and returning rebuilds it.
- [ ] Check for updates still works, including the auto-reload when a new version is ready.
- [ ] Wide-screen two-column layout at ≥ 900 px.
- [ ] No console errors. `npm run lint`, `npm test -- --run` and `npm run build` pass.
- [ ] Docs updated (SCREENS, ART_DIRECTION, DESIGN log, PROGRESS), version bumped, PR opened with auto-merge on.

## 10. Nice-to-haves (only if the core is done and solid)

1. **Ticker band:** a thin navy strip under the panel with rival tickers, your stock once public, and the policy rate, scrolling slowly (pitch 6). Returning players only, with numbers from the save's meta (add them to `cover`). Deltas as text with signs, no arrows.
2. **Night print:** if the device clock is between 20:00 and 06:00, render the strip with the paper dimmed slightly. Only if the renderer supports a paper override cleanly through `MapStyle.paper`.
3. **Tap the panel** to open Continue (returning) or New game (new player). Keep the buttons as the main path.

## 11. Things not to do

- Don't load or decompress a full save on the title screen.
- Don't import sim internals into the UI beyond what `maplab.ts` already uses (types, `newGame`, data tables). If you need more, add a small selector or helper.
- Don't add dependencies.
- Don't use real city landmarks' names anywhere in labels. The renderer's signatures are already generic.
- Don't commit straight to `main`.

**Data centers and energy sites (2026-10-27).** The cover draws what the live map draws: your data centers as low halls (from `cover.dataCenters`; older cards without it fall back to storefronts) and every energy site in a regional city as a substation yard.
