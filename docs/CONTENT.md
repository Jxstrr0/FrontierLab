# Content Tables

Data for `src/data/*.ts`. All names are original and fictional: no real AI companies, models or people. Index values are relative to 1.00 (Toronto-like). Extend lists freely. Keep new entries original and match the field shapes in DATA_MODEL.md.

Many ids keep their bank-era names so saves keep working (a sales office is a `branch`, a product category `deposits` is Plans, and so on). The tables give the AI meaning; the ids are what the code uses.

---

## 1. Countries and central banks
Starting values are fictional. Meeting weeks are weeks of the year.

| id | Country | Central bank | Start policy | Neutral | Infl. target | Corp. tax | Meeting weeks | Notes |
|---|---|---|---|---|---|---|---|---|
| CA | Canada | Bank of Canada | 3.25% | 2.75% | 2.0% | 26% | 4, 10, 17, 23, 30, 36, 43, 49 | |
| US | United States | Federal Reserve | 4.50% | 3.00% | 2.0% | 25% | 5, 11, 18, 24, 31, 38, 44, 50 | |
| UK | United Kingdom | Bank of England | 4.25% | 3.00% | 2.0% | 25% | 6, 12, 19, 25, 32, 37, 45, 51 | |
| EA | Eurozone | European Central Bank | 2.75% | 2.25% | 2.0% | 25% | 4, 9, 16, 23, 29, 37, 43, 50 | Paris, Frankfurt, Amsterdam |
| CH | Switzerland | Swiss National Bank | 1.25% | 1.25% | 1.0% | 18% | 12, 25, 38, 51 | |
| JP | Japan | Bank of Japan | 0.75% | 1.00% | 2.0% | 30% | 3, 11, 17, 25, 30, 38, 43, 51 | |
| AU | Australia | Reserve Bank of Australia | 3.60% | 3.00% | 2.5% | 30% | 7, 13, 20, 27, 33, 40, 46, 50 | |
| SG | Singapore | Monetary Authority of Singapore | 3.00% | 2.50% | 2.0% | 17% | 4, 17, 30, 43 | |
| HK | Hong Kong | Hong Kong Monetary Authority | — | — | — | 16.5% | follows US | `peggedTo: US`, spread +0.25% |
| RU | Russia | Bank of Russia | 6.00% | 5.00% | 2.0% | 25% | 6, 12, 17, 24, 30, 38, 43, 51 | Moscow, St Petersburg. A high-rate economy. `ownStream`: its cycle and currency use their own RNG streams (`macro:RU`, `fx:RU`), so adding it left existing worlds unchanged |

## 2. Cities (v1)

| id | City | Country | Size | Tiles | Lat, Lon | rentIndex | wageIndex | incomeIndex | costIndex | Incumbent | Rivals | Ink | Original start |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sas | Saskatoon | CA | S | 40 | 52.13, −106.67 | 0.55 | 0.88 | 0.95 | 0.85 | 0.25 | 2 | Prairie Ochre | yes |
| cal | Calgary | CA | M | 52 | 51.05, −114.07 | 0.75 | 0.98 | 1.10 | 0.95 | 0.32 | 3 | Foothill Olive | yes |
| van | Vancouver | CA | M | 56 | 49.28, −123.12 | 1.10 | 1.02 | 1.10 | 1.05 | 0.35 | 3 | Harbour Blue | |
| tor | Toronto | CA | L | 68 | 43.65, −79.38 | 1.15 | 1.05 | 1.15 | 1.05 | 0.40 | 4 | Polymer Teal | yes |
| mtl | Montréal | CA | M | 56 | 45.50, −73.57 | 0.80 | 0.95 | 1.00 | 0.95 | 0.35 | 3 | Rose Granite | |
| nyc | New York | US | XL | 80 | 40.71, −74.01 | 1.60 | 1.20 | 1.35 | 1.30 | 0.45 | 5 | Federal Green | yes |
| chi | Chicago | US | L | 68 | 41.88, −87.63 | 1.00 | 1.05 | 1.10 | 1.00 | 0.40 | 4 | Lake Steel | |
| sfo | San Francisco | US | L | 64 | 37.77, −122.42 | 1.55 | 1.25 | 1.45 | 1.30 | 0.40 | 4 | Fog Violet | |
| sea | Seattle | US | M | 56 | 47.61, −122.33 | 1.15 | 1.15 | 1.30 | 1.10 | 0.35 | 3 | Evergreen | |
| lon | London | UK | XL | 80 | 51.51, −0.13 | 1.55 | 1.15 | 1.25 | 1.30 | 0.45 | 5 | Sterling Plum | |
| par | Paris | EA | L | 68 | 48.86, 2.35 | 1.30 | 1.05 | 1.10 | 1.15 | 0.42 | 4 | Lumière Rose | |
| fra | Frankfurt | EA | M | 52 | 50.11, 8.68 | 1.00 | 1.05 | 1.15 | 1.05 | 0.40 | 3 | Mint Grey | |
| ams | Amsterdam | EA | M | 52 | 52.37, 4.90 | 1.10 | 1.02 | 1.15 | 1.05 | 0.38 | 3 | Canal Blue | |
| zur | Zürich | CH | M | 48 | 47.38, 8.54 | 1.50 | 1.40 | 1.60 | 1.40 | 0.45 | 3 | Alpine Slate | |
| tyo | Tokyo | JP | XL | 80 | 35.68, 139.69 | 1.20 | 0.95 | 1.10 | 1.10 | 0.45 | 5 | Indigo | |
| syd | Sydney | AU | L | 64 | −33.87, 151.21 | 1.25 | 1.10 | 1.20 | 1.15 | 0.40 | 4 | Coral | |
| sin | Singapore | SG | L | 60 | 1.35, 103.82 | 1.40 | 1.05 | 1.30 | 1.20 | 0.42 | 4 | Orchid | |
| hkg | Hong Kong | HK | L | 60 | 22.32, 114.17 | 1.60 | 1.00 | 1.25 | 1.25 | 0.45 | 4 | Jade Harbour | |
| mos | Moscow | RU | XL | 84 | 55.76, 37.62 | 1.05 | 0.70 | 0.85 | 0.80 | 0.50 | 5 | Brick Crimson | density 1.35 |
| spb | St Petersburg | RU | L | 64 | 59.94, 30.31 | 0.85 | 0.65 | 0.90 | 0.75 | 0.42 | 4 | Neva Blue | density 1.15 |

**Density** (optional, default 1): how crowded a city is. It multiplies every lot's foot traffic and the city-wide customer pool (`CITY_MARKET`, SIMULATION §9.2) and `CITY_BRANCH_GUIDE` (how far a sales office's reach grows with its size), so each office reaches more people. Rent still follows `rentIndex`.

### Regional sites
Each site is a small map with an airport and 1–2 employers. There are no storefronts. These are the **energy sites**: you can build up to three data centers on each (cheaper power and land) and sign a data-centre and power deal with its employer (§14).

| id | Site | Country | Lat, Lon | Employer |
|---|---|---|---|---|
| fmm | Fort McMurray | CA | 56.73, −111.38 | Athabasca Sands Camp |
| plb | Pilbara (Port Hedland) | AU | −20.31, 118.58 | Red Range Iron |
| mid | Midland | US | 31.99, −102.08 | Permian Basin Field Services |

Regional maps are 28 tiles, size S, with their own ink (Boreal Umber, Iron Red, Permian Tan). Their employer is a Resource Camp (3,000 staff, income ×1.5).

## 3. Districts
Each city's generator mixes these districts in proportions set by city size.

| District | Foot traffic/wk | Base rent/wk | STU | YP | FAM | RET | BIZ | Income | Homeowners | Market rent $/m²/yr |
|---|---|---|---|---|---|---|---|---|---|---|
| Financial | 14,000 | 3,200 | .05 | .40 | .10 | .05 | .40 | 1.40 | .35 | 780 |
| Downtown | 18,000 | 2,200 | .15 | .40 | .15 | .10 | .20 | 1.10 | .30 | 620 |
| Midtown | 9,000 | 1,300 | .10 | .30 | .35 | .15 | .10 | 1.00 | .55 | 420 |
| University | 11,000 | 900 | .55 | .25 | .08 | .05 | .07 | 0.70 | .20 | 340 |
| Suburbs | 6,000 | 750 | .05 | .15 | .50 | .25 | .05 | 1.05 | .75 | 260 |
| Industrial | 3,000 | 500 | .03 | .20 | .25 | .07 | .45 | 0.90 | .50 | 180 |
| Waterfront | 10,000 | 1,800 | .05 | .35 | .20 | .30 | .10 | 1.50 | .60 | 700 |

**How many storefronts** (2026-10-25): `round(LOTS_BASE[size] + LOTS_PER_RIVAL[size] × rival labs in the city)`, with `LOTS_BASE = { S: 12, M: 18, L: 24, XL: 32 }` and `LOTS_PER_RIVAL = { S: 4, M: 4.5, L: 5, XL: 6 }`. With the usual rival count that is about 20 / 32 / 44 / 62 storefronts (it was 36 / 56 / 80 / 110), so good corners feel slightly scarce and a city with more competitors has more of them. About half of each district's free storefronts then become customer businesses (§21b), always leaving at least one free; rivals take more as they grow. Cities already on the map in a save (layout 1) keep their original count.

**Cities grow** (2026-10-26): every `CITY_GROWTH.everyYears` (2) at the year end, each generated city (not a regional site) adds `CITY_GROWTH.share` (10%) of the storefronts it started with, at least one, drawn by district share from the city's own `citygrow:{cityId}` stream and placed on free street frontage like the originals, until it has added `maxGrowth` (1.5×) its starting count or runs out of frontage. The paper reports it ("{city} grows: {n} new storefronts"). Rivals expand into the new corners the same way they do into free ones (SIMULATION §18.4).

How a lot's values are derived:
- **Traffic:** district value × city density (default 1) × U(0.65, 1.35).
- **Rent:** base × city.rentIndex × (traffic / (district traffic × density))^0.6 × U(0.9, 1.1) × today's price list (SIMULATION §4.6; 1 at the start). Every rent, free or leased, moves with the price list at each year end; a lease deposit stays as paid.
- **Deposit:** 6 × rent.
- **incomeIndex:** district income × city.incomeIndex × U(0.9, 1.1).
- **Position:** a point drawn around the district centre (balance `CITYGEN.layout`), snapped to the nearest free tile facing a street. Streets run every 4th row and column (`CITY_LAYOUT.block`); water cities have a wavy shoreline near the far edge (`CITY_LAYOUT.shore`).

## 4. Segments

The five segment ids are bank-era (`STU`, `YP`, `FAM`, `RET`, `BIZ`); the screens show the names below.

| id | Segment | sensFee | API usage mult |
|---|---|---|---|
| STU | Students | 1.2 | 0.3 |
| YP | Developers | 0.8 | 1.0 |
| FAM | Consumers | 0.7 | 0.3 |
| RET | Researchers | 0.5 | 1.5 |
| BIZ | Small shops | 0.5 | 2.0 |

- **sensFee:** how strongly the segment reacts to a price above the market. Every product in the catalog is fee-priced or usage-priced, so this is the price sensitivity that counts.
- **API usage mult** (`ticketMult.lending`): × the API usage a sign-up brings. Plans and apps sign a fixed number of seats, so their multiplier is 1.
- `sensDep` and `sensLoan` are still in `src/data/segments.ts` but only rate-priced products read them, and none are left.

### Affinity matrix
Base probability that a new customer in the segment opens the product, before modifiers (`AFFINITY` in `src/data/segments.ts`, raised about 1.4× from the first draft in tuning).

| Product | STU | YP | FAM | RET | BIZ |
|---|---|---|---|---|---|
| free_tier | .75 | .60 | .65 | .50 | .20 |
| plus | .18 | .42 | .35 | .40 | .15 |
| pro | .03 | .16 | .05 | .20 | .08 |
| team | 0 | .08 | 0 | .07 | .60 |
| campus_plan | .55 | 0 | 0 | .12 | 0 |
| api | .08 | .45 | .03 | .28 | .30 |
| batch_api | .02 | .14 | 0 | .20 | .15 |
| fine_tuning | 0 | .08 | 0 | .10 | .12 |
| code_assistant | .15 | .55 | .03 | .14 | .15 |
| agent_studio | 0 | .08 | 0 | .05 | .30 |
| creative_suite | .15 | .10 | .25 | .04 | .08 |
| priority_support | 0 | .04 | 0 | .07 | .22 |

The segment ticket multipliers above apply to usage products only (a month of API usage scales with the segment and the lot's incomeIndex). Plans sign a fixed number of seats.

## 5. Products (v1 catalog)

The three categories keep their bank-era ids (`deposits`, `lending`, `cards`) so every table keyed by category carries over; the screens call them **Plans**, **API** and **Apps & Services** (`CATEGORY_NAMES`).

- **Plan** products bill seats. A sign-up brings `ticket` seats; the book balance is ARR = seats × price × billing periods (12 for a monthly fee, 1 for a yearly fee).
- **Usage** products bill per million tokens. A sign-up brings `ticket × incomeIndex × segment API usage mult` million tokens a month; the book balance is a year of that usage at today's price.
- **Enterprise contracts** (id `sbl`) is the switch that opens the Deal Desk (§21b). Bids are a discount off each business's budget, so its price fields are unused.

| id | Name | Category | Kind | Price type | Default price | Range / step | Ticket | Churn/yr | Compute $/seat/wk | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| free_tier | Free Tier | Plans | plan | fee $/mo | $0 | 0–5 / 1 | 1 seat | 25% | 0.05 | 12%/yr upgrade to Plus |
| plus | Plus | Plans | plan | fee $/mo | $20 | 5–60 / 1 | 1 seat | 14% | 1.00 | rateChurnSens 0.3; starts 3.0★ |
| pro | Pro | Plans | plan | fee $/mo | $60 | 20–250 / 5 | 1 seat | 12% | 3.00 | rateChurnSens 0.3 |
| team | Team | Plans | plan | fee $/mo | $30 | 10–90 / 1 | 6 seats | 8% | 6.00 | rateChurnSens 0.2 |
| campus_plan | Campus Plan | Plans | plan | fee $/mo | $8 | 0–20 / 1 | 1 seat | 20% | 0.60 | the student partnership package |
| api | Standard API | API | usage | $ per M tokens | $3 | 0.5–15 / 0.25 | 40 M tok/mo | 10% | 0.50 | compute $1.00/unit; organic +25%/yr; starts 3.0★ |
| batch_api | Batch API | API | usage | $ per M tokens | $1.50 | 0.25–6 / 0.25 | 80 M tok/mo | 9% | 0.50 | compute $0.50/unit; organic +20%/yr |
| fine_tuning | Fine-tuning | API | usage | $ per M tokens | $8 | 2–30 / 0.5 | 5 M tok/mo | 10% | 1.50 | compute $3.00/unit; organic +15%/yr |
| sbl | Enterprise contracts | API | Deal Desk | — | — | — | — | — | 1.20 | opens the Deal Desk (§21b) |
| code_assistant | Code Assistant | Apps & Services | plan | fee $/mo | $19 | 5–60 / 1 | 1 seat | 13% | 0.90 | rateChurnSens 0.3 |
| agent_studio | Agent Studio | Apps & Services | plan | fee $/mo | $99 | 25–400 / 5 | 1 seat | 10% | 4.00 | rateChurnSens 0.2 |
| creative_suite | Creative Suite | Apps & Services | plan | fee $/mo | $15 | 5–50 / 1 | 1 seat | 14% | 0.80 | rateChurnSens 0.3 |
| priority_support | Priority Support | Apps & Services | plan | fee $/yr | $1,500 | 300–6,000 / 50 | 1 seat | 8% | 1.00 | billed yearly |

Starting quality: every product starts at 2.5 stars, except Free Tier, Plus and the Standard API at 3.0. All products carry risk weight 0. The compute column is the weekly compute cost per seat or account (`servicing`); usage products also pay compute per unit used (`unitCost`). Both are posted to the compute line (SIMULATION §12).

Plans and Enterprise contracts start switched on in a new sales office; the API and Apps & Services wait for the player.

## 6. Product development templates

Prices in the tier column are the default price × 0.85 / 1 / 1.25 for Low / Medium / Premium (`DEV_TIER.feeMult`); Premium also adds +0.05 Products rating where offered. A template that sets its own default price scales the market reference with it.

| id | Name | Base | Effect |
|---|---|---|---|
| student_plus | Student Plus | plus | STU affinity +0.15; default $10 |
| golden_years | Golden Years Plan | plus | RET affinity +0.15; default $12 |
| family_plan | Family Plan | plus | FAM affinity +0.15; 4 seats per sign-up; default $12 per seat |
| plus_annual | Plus Annual | plus | churn ×0.5; take-up ×0.85 |
| carbon_neutral | Carbon-Neutral Plan | plus | reputation +0.05; YP +0.05 |
| max_plan | Max | pro | default $200; Products +0.1 where offered; YP/BIZ +0.05 |
| enterprise | Enterprise | team | BIZ +0.2; ticket ×5; churn ×0.6; default $45 |
| realtime_api | Realtime API | api | default $6; take-up ×1.1; YP/BIZ +0.05 |
| dedicated_capacity | Dedicated Capacity | api | BIZ +0.2; ticket ×4; churn ×0.5 |
| research_credits | Research Credits | api | STU +0.15; default $1.50 |
| embeddings_api | Embeddings API | batch_api | default $0.50; ticket ×3 |
| study_buddy | Study Buddy | creative_suite | STU +0.2; default $8 |
| voice_companion | Voice Companion | creative_suite | RET/FAM +0.1; take-up ×1.15 |
| contract_copilot | Contract Copilot | agent_studio | BIZ +0.15; default $149; reputation +0.05 |
| mobile_app_v2 | Mobile App 2.0 (Digital) | — | app rating +0.3 (one-time); requires the Platform & Security floor |
| instant_decisions | Instant Decisions (Digital) | — | model Speed +2; requires the Platform & Security floor |

Training runs for new model generations are separate from these templates; their numbers are `TRAINING` in balance.ts (SIMULATION §16.12).

## 7. Sales office build options

The five slots keep their bank-era ids; the screens show the AI names. Exterior and lobby are fit-out (10-year depreciation); the other three are equipment (5 years). Office size (Starter ×1 to Flagship ×9) multiplies the interior's cost and capacity; the exterior is one piece at every size.

| Slot id | On screen | What it does |
|---|---|---|
| `exterior` | Exterior | Office rating |
| `lobby` | Lobby | Office rating; meeting rooms add sales seats |
| `teller` | Sales desks | Seats × interactions per week: how many prospects the office serves |
| `vault` | Machine room | Security (lowers break-in odds) |
| `atm` | Demo kiosks | Extra self-serve capacity; an office with a kiosk can suffer an API key leak |

**Exterior:**

| id | Name | Quality | Cost |
|---|---|---|---|
| ext_storefront | Plain Storefront | 1.5 | 45,000 |
| ext_brick | Heritage Brick | 2.5 | 70,000 |
| ext_glass | Modern Glass | 3.5 | 120,000 |
| ext_columns | Classic Columns | 4.5 | 210,000 |
| ext_deco | Deco Tower Front | 5.0 | 340,000 |
| ext_lattice | Lattice Pavilion | 5.0 | 340,000 |

**Lobby:**

| id | Name | Quality | Meeting rooms | Cost |
|---|---|---|---|---|
| lob_basic | Basic Lobby | 1.5 | 0 | 90,000 |
| lob_comfort | Comfort Lobby | 2.5 | 1 | 145,000 |
| lob_advice | Demo Lounge | 3.5 | 2 | 220,000 |
| lob_marble | Showcase Hall | 4.5 | 3 | 340,000 |
| lob_private | Executive Briefing Suite | 5.0 | 4 | 520,000 |

Meeting rooms are `advisorOffices` in code.

**Sales desks** (`tel_*`):

| id | Name | Quality | Productivity coins | Seats × /wk | Cost |
|---|---|---|---|---|---|
| tel_counter | Two-Seat Counter | 2 | 2 | 2 × 70 | 24,000 |
| tel_standard | Standard Sales Floor | 3 | 3 | 3 × 80 | 48,000 |
| tel_pods | Service Pods | 4 | 3 | 3 × 95 | 82,000 |
| tel_express | Express Desks | 3 | 5 | 5 × 90 | 115,000 |
| tel_concierge | Concierge Desks | 5 | 4 | 4 × 110 | 160,000 |

**Machine room** (`vlt_*`):

| id | Name | Quality | Security | Cost |
|---|---|---|---|---|
| vlt_safe | Floor Rack | 1 | 1 | 18,000 |
| vlt_steel | Machine Room | 3 | 3 | 55,000 |
| vlt_timelock | Glazed Machine Room | 4 | 4 | 95,000 |
| vlt_fortress | Showcase Machine Room | 5 | 5 | 180,000 |

The code still gives each one a `boxes` count (0 / 150 / 300 / 600) from the bank's safe deposit boxes; no product uses it any more.

**Demo kiosks** (`atm_*`):

| id | Name | Quality | Productivity /wk | Cost |
|---|---|---|---|---|
| atm_none | No Kiosk | — | 0 | 0 |
| atm_wall | Wall Kiosk | 2 | 120 | 14,000 |
| atm_dual | Dual Kiosk | 3 | 240 | 28,000 |
| atm_smart | Self-Serve Kiosk | 4 | 300 | 46,000 |
| atm_lobby | 24/7 Demo Lobby | 5 | 480 | 78,000 |

Reference builds (Starter size):
- **Basic:** $177k (Plain Storefront, Basic Lobby, Two-Seat Counter, Floor Rack, No Kiosk).
- **Mid:** $332k (Heritage Brick, Comfort Lobby, Standard Sales Floor, Machine Room, Wall Kiosk).
- **Premium:** $883k (Classic Columns, Showcase Hall, Concierge Desks, Glazed Machine Room, 24/7 Demo Lobby).

### 7c. Data center parts (`src/data/dataCenters.ts`)

| Slot | Part | Cost | Does | Fit-out |
|---|---|---|---|---|
| GPU hall | Row hall | $4M | holds 2,000 GPUs | 8 weeks |
| GPU hall | Twin hall | $11M | holds 6,000 GPUs | 12 weeks |
| GPU hall | Campus hall | $26M | holds 15,000 GPUs | 16 weeks |
| Power | Grid feed | $0.8M | runs 3,000 GPUs | — |
| Power | Own substation | $2.5M | runs 8,000 GPUs | — |
| Power | Plant tie-in | $6M | runs 20,000 GPUs | — |
| Cooling | Air handlers | $0.5M | PUE 1.5 | — |
| Cooling | Liquid loops | $2M | PUE 1.25 | — |
| Cooling | Immersion tanks | $5M | PUE 1.1 | — |

The default (and cheapest) build is Row hall, Grid feed, Air handlers. Default name "{City} Data Center", numbered when taken.

### 7a. House styles

Chosen on New Game (`src/data/houseStyles.ts`); every sales office front wears it, whatever the exterior option. A game started without a style, and saves from before styles existed, draw one of the first five from the seed (`SEEDED_HOUSE_STYLE_IDS`), so adding a style never changes an old game.

| id | Name | Sign | Lamps | Planters | Door | Flag |
|---|---|---|---|---|---|---|
| heritage | Old Exchange | gilt serif on a dark fascia | carriage lanterns | box trees | brand ink, panelled | rectangle |
| deco | Jazz Age | stepped board, capitals, chevrons | globe lamps | tall urns with spiky plants | glazed with brass bands and a sunburst | swallowtail |
| modern | Clean Line | lower-case sans with a brand-ink tile | light bars | long trough of grasses | glass with a slim pull | hanging banner |
| garden | Market Street | rounded painted board, italic | hanging lanterns | pots of flowers in the brand ink | brand ink with a wreath | pennant |
| civic | Civic Stone | capitals cut into a stone band | sconces (lamp standards on the steps of Classic Columns) | classical urns | dark bronze, panelled | bordered rectangle |
| quant | Quant Noir | graphite slab, lower-case spaced sans, a brand-ink pixel and light strip | recessed light bars in the brand ink | graphite cubes with clipped spheres | frameless glass with a glowing seam and a keypad | a slim pulsing light blade |

### 7b. Logo shapes

Chosen on New Game (`src/data/logoShapes.ts`); the outline of the lab's mark everywhere it appears: the medallion in the top bar and panel icons, the seal on every sales office front, the plaque over the counter and the mark over an owned building's door. Rivals keep the round medallion. Outlines are drawn by `src/art/logoShapes.ts`.

| id | Name | Outline |
|---|---|---|
| round | Coin | the classic round medallion (the default, and what every company wore before logo shapes existed) |
| shield | Shield | heraldic shield, square-topped, pointed foot |
| lozenge | Lozenge | a diamond on its point |
| hex | Hexagon | six sides, flat top and bottom |
| plaque | Plaque | a square with cut corners |
| rosette | Rosette | twelve scallops, like a wax seal |
| tile | Tile | a sharp square, flat on |
| pebble | Pebble | a softly rounded square |
| octagon | Octagon | eight sides, flat top and bottom |

## 8. Sales office campaigns

| id | Name | Levels: label (cost) | Effects per level |
|---|---|---|---|
| lobby_coffee | Coffee & Live Demos | Drip ($120/wk) · Espresso bar ($260/wk) | Office +0.20 / +0.40; awareness +0.004 / +0.008 |
| charging | Hack Nights | On ($80/wk) | Office +0.10; YP boost ×1.05 |
| saturday | Weekend Support | Mornings ($600/wk) · Full day ($1,100/wk) | capacity ×1.10 / ×1.20; Service +0.15 / +0.30; FAM, YP ×1.05 / ×1.10 |
| signup_bonus | Sign-Up Credits | $50 · $150 · $300 per new plan sign-up | plan take-up ×1.15 / 1.30 / 1.50; cohort churn ×1.15 / 1.30 / 1.45 for 26 weeks; Price +0.10 / 0.20 / 0.30 |
| paperless | Green Compute Pledge | Half (+$0.05/acct/wk) · Full (+$0.10/acct/wk) | Products +0.10 / +0.20; YP, STU ×1.05 / ×1.10 |
| direct_mail | Research Newsletter | Light ($300/wk) · Heavy ($700/wk) | awareness +0.010 / +0.020; RET, FAM ×1.08 / ×1.15 |
| workshops | AI Workshops | Monthly ($250/wk) · Weekly ($600/wk) | awareness +0.006 / +0.012; STU, YP ×1.08 / ×1.15; Service +0.10 |
| sponsors | Community Sponsors | Modest ($300/wk) · Generous ($800/wk) | awareness +0.010 / +0.022; Office +0.05 / +0.10; FAM ×1.1, BIZ ×1.08 / ×1.15 |
| social | Social Media | Steady ($400/wk) · Viral push ($900/wk) | awareness +0.012 / +0.026; STU, YP ×1.10 / ×1.20 |
| search | Local Paid Search | Moderate ($450/wk) · Aggressive ($1,000/wk) | awareness +0.014 / +0.030; YP, BIZ ×1.08 / ×1.15; Deal Desk requests ×1.10 / ×1.20 |

Weekly campaign costs scale by city.costIndex. Per-account costs don't. In code the Office rating is `branch`, the Price rating `rates`, and the Deal Desk request boost `loanDesk`.

Each campaign has its own job: Coffee & Live Demos lifts the Office rating, Green Compute Pledge lifts Products, Research Newsletter reaches researchers and consumers, and Community Sponsors adds small shops and a small Office lift on top of consumers.

## 9. HQ floors

Department ids keep their bank-era names; the screens show the AI names. "Units" are office units: each sales office counts its size's `hqUnits` (Starter 1, Standard 2, Large 3, Flagship 4).

| Dept id | On screen | Desks | Market salary | Required staff | Effects when short (k′ < 1) |
|---|---|---|---|---|---|
| finance | Finance | 24 | 82,000 | 2 + 0.35 × units + 1 per $2B assets (+4 if public) | statement delay `ceil((0.9 − k′) × 10)` weeks; IR discount; public & k′ < 0.6 → late filing fine of 0.02% of revenue per quarter; IPO needs k′ ≥ 0.8 |
| hr | HR | 24 | 68,000 | 1 + employees / 80 | hiring ×k′; morale −(1 − k′) × 15 company-wide |
| products | Products | 24 | 90,000 | 2 + 0.2 × units + 2 per active development | development time ÷ max(0.3, k′); data licence +(1 − k′) × 30% |
| treasury | Compute | 24 | 95,000 | 1 (+1 per $1B of old deposits and wholesale funding, which a lab no longer has) | fewer GPU offers, priced up to 10% higher |
| marketing | Marketing | 24 | 72,000 | 1 + 0.15 × units + 2 per active brand campaign | all campaign effects ×(0.5 + 0.5k′) |
| it | Platform & Security | 24 | 98,000 | 2 + 0.25 × units + 1 per $5B assets | app rating target ×k′; breach and outage odds ×(1 + 2(1 − k′)) |
| risk | Safety & Alignment | 24 | 88,000 | 2 + 0.15 × units + 1 per $50M of ARR | sets the safety ratio's strength (SIMULATION §15); audit odds ×(1 + 3(1 − k′)) |
| executive | Executive | 8 (suite) | (per exec) | — | enables executives: COO, CFO, CPO, CMO, CTO, CSO, CIO, Chief Scientist |
| investment | Investment | 32 | 120,000 | optional | ventures shown = 1 + floor(staff / 4), max 8 |

Shortfall effects read effect(k′) = k′^0.7. Requirements phase in with the founder ramp (SIMULATION §16.3). The cuts from Stage 4 tuning still hold: a lab without an HQ ends a 6-year steady run clearly behind one with a staffed HQ (balance strategy `nohq`).

Salaries scale by city.wageIndex. Desks per floor come from the building (24 or 32); Investment floors are always 32 and the Executive suite 8.

## 10. Benefits

| id | Name | Control (range) | Cost | Effects |
|---|---|---|---|---|
| tuition | Tuition Support | $/employee/yr (0–15,000, step 1,000) | as set | skill growth +3% per $1k (max +40%); attraction +2 at ≥ $8k |
| pension | Pension Match | % of salary (0–8%) | salary × % | retention +5% per pt (max +30%); morale +1 per 2 pts |
| espp | Employee Stock Plan | discount (0–15%), public only | 0.5% of payroll per discount point, in cash (dilution not modelled) | executive loyalty +5; morale +2 at ≥ 10% |
| childcare | Childcare Support | $/employee/yr (0–10,000) | as set | morale +3 at $6k; retention +10% |
| lunch | Free Lunch & Snacks | $/employee/wk (0–100) | as set | morale +4 at $60 |
| volunteer | Volunteer Days | $/employee/wk (0–150) | as set | morale +3 at $100; reputation +0.05 on all sales offices |
| mortgage_disc | Compute Allowance | discount (0–2%) | employees × 0.3 × 340,000 × discount / yr (the bank-era mortgage formula, kept) | morale +3; attraction +3 |
| wellness | Wellness Program | $/employee/yr (0–2,500) | as set | morale +2; quits −15% |
| remote_fri | Remote Fridays | on/off (HQ only) | 0 | HQ morale +3; HQ effective staff −3% |

Benefit effects scale linearly up to the stated amount, then flatten (capped at 1.5× the stated effect).

## 11. HQ brand campaigns and agencies

| id | Name | Scope | Cost/wk | Brand gain/wk | Notes |
|---|---|---|---|---|---|
| tv | TV Spots | city / country | 25,000 / 120,000 | +0.020 / +0.012 per city | |
| billboards | Billboards | city | 8,000 | +0.012 | |
| podcasts | Podcast Ads | country | 5,000 | +0.006 per city | YP ×1.05 |
| creators | Creator Partnerships | country | 12,000 | +0.010 per city | STU, YP ×1.08 |
| naming | Arena Naming Rights | city | 40,000 | +0.030 | needs a sports franchise in the city; news event |

**Agencies** sell one-off packages that apply a brand boost evenly over the package length:

| Agency | Package | Length | Cost | Total brand boost |
|---|---|---|---|---|
| Brightwell Creative | City Blitz | 8 wk | 180,000 | +0.25 |
| Northwind & Pike | Street Team | 2 wk | 45,000 | +0.10 (one city) |
| Studio Halcyon | Prestige Campaign | 12 wk | 420,000 | +0.30, plus Office +0.1 in that city for 26 weeks |

## 12. Funding types (old saves only)

The bank's wholesale funding market is gone from new games. `src/data/fundingTypes.ts` keeps Overnight Interbank, Term Interbank and the Central Bank Window so an old save that still carries deposits or funding lots can run them off; their cards show on the Compute floor only for such a save. The GPU reservations of §12b replaced them.

## 12b. GPU reservations (Compute floor; `src/data/gpuLots.ts`)

Radar: Cost, Term, Reliability, Flexibility, Latency (1–10, higher is better for you).

| type | Name | Term (wk) | Discount on spot | GPUs (× scale) | Weight | Cost | Term | Reliability | Flexibility | Latency |
|---|---|---|---|---|---|---|---|---|---|---|
| reserved_6m | 6-month reservation | 26 | 10% | 100–800 | 5 | 5 | 3 | 7 | 7 | 6 |
| reserved_1y | 1-year reservation | 52 | 18% | 200–1,500 | 4 | 7 | 6 | 8 | 4 | 6 |
| reserved_3y | 3-year reservation | 156 | 28% | 500–4,000 | 2 | 9 | 9 | 8 | 1 | 6 |

Provider names (fictional GPU clouds): Northbeam Cloud · Halcyon Compute · Stratus Forge · Ironleaf Racks · Cobalt Grid · Lumen Hollow · Tidewater Compute · Saltmarsh Cloud · Kestrel Silicon · Bramblewood GPU.

## 13. The AI model's training data

**Training datasets** (Reasoning, Speed, Breadth, Safety, Efficiency; licence per customer a year). Ids are the bank-era ones (the model is `underwriting` in code, data vendors are `bureau` sites).

| id | Dataset | Profile | $/customer/yr | Requirement |
|---|---|---|---|---|
| bureau | Web Crawl | 6, 8, 4, 4, 7 | 12 | — |
| cashflow | Licensed Books & Papers | 8, 5, 7, 5, 7 | 24 | — |
| altdata | Forum & Social Data | 5, 7, 9, 3, 4 | 9 | — |
| internal | Customer Feedback | 4→9, 9, 6, 6, 7 | 2 | ≥ 5,000 customers |
| fraud | Red-Team Data | 5, 4, 4, 10, 6 | 11 | — |

**Data vendor packages:**

| Package | Vendor | Mix | $/customer/yr |
|---|---|---|---|
| Clearline Web Base (default) | Clearline | bureau 100 | 12 |
| Clearline Scholar | Clearline | bureau 70 / cashflow 30 | 19.50 |
| Northscore Open Voices | Northscore | bureau 40 / altdata 60 | 13.50 |
| Sentinel Guardrails | Sentinel Data | bureau 60 / fraud 40 | 17 |
| TrueMark Complete | TrueMark | bureau 40 / cashflow 30 / fraud 30 | 26 |

**Vendor locations:**
- Clearline: Toronto, New York, London.
- Northscore: Saskatoon, Calgary, Chicago.
- Sentinel Data: San Francisco, Frankfurt, Singapore.
- TrueMark: every XL city plus Sydney.

## 13b. Model names

Rival model families (one per lab, numbered by generation, starting at 2): Wren, Lantern, Cobalt, Kestrel, Fathom, Juniper, Halyard, Tessel, Sable, Quarry, Marlin, Ember. Your trained models take the name you give them (the strategies use "Gen N").

## 13c. Researchers and the Chief Scientist

Researchers take names and portraits from the shared person generator (the same lists as managers and executives), so every one is fictional. The Chief Scientist (short CSci) is the ninth executive seat, with one delegation, **Routine training runs**. A rival bidding for one of yours raises **Researcher poached**: "{rival} is trying to hire away our researcher {name}." It offers *Counter-offer* (their salary +25%) or *Let them go* (they join the rival lab, and its next models get better).

## 14. Employers (staff plan partnerships)

Employers sit on the Businesses layer (layer id `employers`). Each is also an anchor account for the Deal Desk (§21b). The partnership kind keeps its bank-era id `payroll`.

| Type | Employees | Income mult | Notes |
|---|---|---|---|
| Hospital | 2,000 | 1.10 | |
| University | 3,500 staff | 1.00 | also offers the student partnership |
| Auto Plant | 2,500 | 1.00 | |
| Tech Campus | 1,800 | 1.60 | |
| City Hall | 5,000 | 1.05 | one per city |
| Port Authority | 1,500 | 1.00 | waterfront cities |
| Potash Mine | 1,200 | 1.40 | Saskatoon: "Prairie Potash Co." |
| Resource Camp | 3,000 | 1.50 | regional energy sites |
| Oil Sands Camp | 4,000 | 1.60 | Fort McMurray |
| Iron Ore Mine | 3,000 | 1.70 | Pilbara |
| Shale Field Services | 2,500 | 1.50 | Midland |

- **Signing fee:** employees × $160 × income mult × city.incomeIndex.
- **Contract:** 364 weeks ("Year X of 7").
- **ARR per participating employee:** $300 (`ARR_PER_EMPLOYEE`; about a Team seat). Student deals: $80 per participating student. The package is a plan (Team for staff, Campus Plan for students by default). The employer panel shows the current "Plans partner".
- **Generation:** 2–4 employers per city.
- **Energy sites:** the regional sites (the mine, camp and field rows) sign data-centre and power deals instead: fee employees × $500 × the price list, 1.5 contracted GPUs per employee at full participation, $20 per GPU-week fixed at signing, and 25% off power for your data centers in the country (`POWER_DEAL`, SIMULATION §13.7a).

## 15. Rivals

| id | Name | Strategy | Home | Brand ink | Listed |
|---|---|---|---|---|---|
| harbourline | Harbourline AI | Incumbent | CA | #1F3A5F navy | yes (HBL) |
| maplecrown | Maple Crown Intelligence | Incumbent | CA | #8E2C2C crimson | yes (MCF) |
| prairiemutual | Prairie Open Models | Community | CA | #B08A3E wheat | no |
| nimbus | Nimbus Labs | Disruptor | CA, US | #2AA6B8 cyan | no |
| granville | Granville Research | Premium | CA | #2B2B2B black/gold | no |
| libertyridge | Liberty Ridge Labs | Incumbent | US | #27466E | yes (LRB) |
| eastgate | Eastgate Intelligence | Incumbent | US | #4A6B3A | yes (EGF) |
| copperfield | Copperfield Collective | Community | US | #A8643A | no |
| fizz | Fizz | Disruptor | US, UK | #E2557A | no |
| whitmore | Whitmore Institute | Premium | US | #3B3355 | yes (WMT) |
| kingsbury | Kingsbury Cognition | Incumbent | UK | #2C3E66 | yes (KBY) |
| thameside | Thameside Open Lab | Community | UK | #3E7A6E | no |
| albion | Albion Machine Works | Incumbent | UK | #6B2D4A | no |
| belgrave | Belgrave Research | Premium | UK | #1E1E28 | no |
| lumiere | Lumière IA | Incumbent | EA (Paris) | #7A2E46 | yes (BLU) |
| rheinmark | Rheinmark KI | Incumbent | EA (Frankfurt) | #34495E | yes (RMB) |
| oranjeburg | Oranjeburg Labs | Incumbent | EA (Amsterdam) | #C0652A | yes (OBG) |
| volt | Volt | Disruptor | EA | #5B4BD6 | no |
| alpenhaus | Alpenhaus Research | Premium | CH | #2F3B45 | yes (APH) |
| helvetic | Helvetic Open Models | Community | CH | #B03A3A | no |
| sakuragi | Sakuragi Intelligence | Incumbent | JP | #A0425A | yes (SKT) |
| hoshino | Hoshino Labs | Incumbent | JP | #2E3F78 | yes (HSB) |
| komorebi | Komorebi AI | Disruptor | JP | #4E9A5A | no |
| southerncross | Southern Cross AI | Incumbent | AU | #22476B | yes (SXS) |
| wattle | Wattle Collective | Community | AU | #C99A2E | no |
| tide | Tidewater AI | Disruptor | AU, SG | #1E9BB0 | no |
| lionport | Lionport Labs | Incumbent | SG | #9C2F2F | yes (LPB) |
| jadeharbour | Jade Harbour AI | Incumbent | HK | #2F7A6A | yes (JHB) |
| peak | Peak Research | Premium | HK, SG | #3A3A4A | no |
| volgastate | Volga State Labs | Incumbent | RU | #7A2430 | yes (VSB) |
| birchcrest | Birchcrest AI | Incumbent | RU | #3A5A40 | yes (BCB) |
| komet | Komet | Disruptor | RU | #E0663A | no |
| ambermark | Ambermark Research | Premium | RU | #4A3A5A | no |
| nevasavings | Neva Open Models | Community | RU | #4A7A9A | no |

**Strategy profiles** (`STRATEGY_PROFILES` in `src/data/rivals.ts`):

| Strategy | Fees | Price / Products / Service / Office | App |
|---|---|---|---|
| Incumbent | +10% | 2.8 / 3.6 / 3.2 / 3.6 | 3.6 |
| Disruptor | −60% | 4.3 / 3.4 / 3.0 / 2.5 | 4.6 |
| Premium | +40% | 2.4 / 4.0 / 4.4 / 4.6 | 4.0 |
| Community | −20% | 3.6 / 3.0 / 4.0 / 3.0 | 2.8 |

- **Fees** move a rival's plan, API and app prices against the default. (The profile also keeps a `loans` rate offset from the bank era; nothing priced as a rate is left for it to move.)
- Each rival lab holds one sales office per city it serves, with a size (SIMULATION §18.4). At the start a city's rivals draw S 3–5, M 6–10, L 10–16 or XL 16–24 bank-sized branches in total (`RIVAL_BRANCHES_BY_SIZE`; disruptors 1–2 each), and each lab's draw folds into one office sized to match.
- Every rival has a named model (§13b) and a bench of a CFO, a COO and a Chief Safety Officer.

### New labs (2026-10-26)
New labs founded during a game (SIMULATION §18.7) take an invented name from `src/data/rivalCharters.ts`: a place-style stem (Ashcombe, Copperleaf, Glenhaven, Lanternhill, Wrenfield and others) with a suffix by strategy (incumbent: AI, Labs, Intelligence; premium: Research, Institute, & Partners; community: Collective, Open Models, Open Lab), or for a disruptor a one-word brand (Zephly, Pocketwell, Quillo, Lumio, Nuvra, Sprigly, Taffel, Glimmr, Vantlo, Ottery, Brisko, Pennyloop). 40% of new labs (`NAME_GEN.listedName`) use these listed stems and brands; the rest get a generated one from `src/data/nameParts.ts`: a stem from a head and a tail (Ash + combe, Raven + sford, Maple + water: 40 × 30 combinations), or a coined brand from an onset, vowel, coda and ending (Quinly, Naloop, Polwell), 4–8 letters, with awkward clusters redrawn. Names never repeat in a save. Inks come from a ten-colour palette. Their ids are `charter1`, `charter2`, … (the code calls them charters); they have no head-office building on the map.

## 16. Other map buildings

- **Investment banks:**

  | Name | City | Fee | IPO pop | Notes |
  |---|---|---|---|---|
  | Ashgrove Capital | Toronto, Calgary | 4.55% | 0–10% | |
  | Whitlock & Rowe | New York, Chicago | 5.25% | 5–20% | |
  | Meridian Partners | London, Paris | 4.80% | 0–15% | |
  | Hollis Crane & Co. | Zürich, San Francisco | 6.00% | 10–25% | |
  | Sakura Bridge Securities | Tokyo, Singapore, Hong Kong | 4.40% | 0–10% | |
  | Southern Gate Advisory | Sydney, Vancouver | 4.70% | 0–12% | |

  Cities not listed borrow the nearest house: Saskatoon and Montréal → Ashgrove Capital, Seattle → Whitlock & Rowe, Frankfurt, Amsterdam, Moscow and St Petersburg → Meridian Partners. Implemented in `src/data/investmentBanks.ts`.
- **Marketing agencies:** Brightwell Creative, Northwind & Pike, Studio Halcyon. Present in L and XL cities; M cities get one.
- **Lobbying firms:** Capitol Bridge Advisors (US), Parliament Row Partners (CA, UK), Rue Royale Affairs (EA, and CH by borrowing), Harbourline Policy Group (AU, SG, HK, and JP by borrowing), Granite Quay Advisors (RU). Campaigns are in SIMULATION §21.6.
- **Universities:**
  - Named: Prairie State University (Saskatoon), Kingsley University (Toronto), Bow River University (Calgary), Pacific Crest University (Vancouver), Hudson Polytechnic (New York).
  - Elsewhere, generate as "University of {City}" or "{City} Institute of Technology".
- **Auction houses:**
  - Marlowe & Finch (London, New York): 4% counterfeit odds
  - Harrowgate Auctions (Toronto, Chicago): 8%
  - Kanazawa Auctions (Tokyo, Hong Kong): 6%
  - Sokolov & Lind (Moscow, St Petersburg): 9%
- **Convention centre:** one per L and XL city, plus every city that hosts a convention (Saskatoon, Calgary). Venue names are in `src/data/conventions.ts`; other cities use "{City} Convention Centre".
- **Property buildings:** 6 / 9 / 12 / 15 per S / M / L / XL city, in any district; towers (over 5,000 m²) only in the financial, downtown and waterfront districts, and the biggest only in L and XL cities (SIMULATION §21.5).
- **Office listings:** 2 / 2 / 3 / 4 per S / M / L / XL city (SIMULATION §16.1).
- **Airports** (code, name): SAS Saskatoon Regional · CAL Calgary International · VAN Vancouver International · TOR Toronto Pearson-style "Lakeshore International" · MTL Montréal-Mercier · NYC Liberty International · CHI O'Hare-style "Lakefront International" · SFO Bayview International · SEA Sound International · LON Thameshaven · PAR Charles-Lumière · FRA Rhein-Main · AMS Polder International · ZUR Kloten-Alpen · TYO Haneda-Bay · SYD Harbour Kingsford · SIN Changi-Garden · HKG Lantau Harbour · MOW Vnukovo Fields · LED Pulkovo-Neva. Regional sites: FMM Athabasca Field · PHE Port Hedland Strip · MAF Permian Regional. All fictional names; use the city name in UI where clearer.

## 17. Stock market (listed companies outside AI)

| Ticker | Company | Sector | Start price | Shares | EPS | Growth | Vol | Div. yield |
|---|---|---|---|---|---|---|---|---|
| SLVS | Silverline Semiconductors | Technology | 142 | 820M | 5.10 | 14% | 38% | 0.4% |
| BRLP | Brightloop Software | Technology | 88 | 610M | 2.40 | 18% | 34% | 0% |
| ORBN | Orbitra Networks | Technology | 41 | 1,100M | 2.05 | 6% | 24% | 2.6% |
| CBAI | Cobalt AI | Technology | 230 | 400M | 3.10 | 35% | 55% | 0% |
| PXBY | Pixelbay | Technology | 19 | 900M | 0.70 | 9% | 40% | 0% |
| NRE | Northern Ridge Energy | Energy | 58 | 1,500M | 5.20 | 2% | 30% | 4.8% |
| SLCR | Solace Renewables | Energy | 27 | 700M | 0.90 | 16% | 42% | 1.0% |
| TDWP | Tidewater Petroleum | Energy | 73 | 1,200M | 7.40 | 1% | 32% | 5.5% |
| VNTR | Vantor Motors | Auto | 36 | 2,000M | 4.10 | 3% | 28% | 3.4% |
| KSLR | Kessler Automotive | Auto | 112 | 450M | 9.30 | 5% | 26% | 2.9% |
| LUMN | Lumen Motors | Auto | 64 | 900M | 0.80 | 30% | 60% | 0% |
| DBRK | Daybreak Coffee Co. | Retail | 94 | 1,150M | 3.60 | 8% | 22% | 2.4% |
| HRTH | Hearthside Markets | Retail | 52 | 800M | 3.20 | 4% | 18% | 3.1% |
| TRHD | Trailhead Outfitters | Retail | 33 | 300M | 1.70 | 7% | 30% | 1.5% |
| GSQR | Granite Square REIT | Real estate | 24 | 900M | 1.40 | 3% | 20% | 5.8% |
| HBFP | Harbourfront Properties | Real estate | 47 | 350M | 2.90 | 4% | 22% | 4.1% |

The **AI labs** sector (id `banking`) lists the rivals marked "Listed" in §15, and your lab once it lists.

Implemented in `src/data/stocks.ts`, with a home exchange per company and beta by sector (Technology 1.3, Auto 1.2, AI labs 1.1, Energy 0.9, Retail 0.8, Real estate 0.7). **Exchanges** (fictional, one per country): CA Maple Exchange · US Union Exchange · UK Thames Exchange · EA Rhine Bourse · CH Alpine Exchange · JP Sakura Exchange · AU Coral Exchange · SG Lion City Exchange · HK Pearl Exchange · RU Neva Exchange. **Index:** the Inference Composite.

**Sector μ by phase** (annual, Expansion / Slowdown / Recession / Recovery):

| Sector | Expansion | Slowdown | Recession | Recovery |
|---|---|---|---|---|
| Technology | +12% | 0% | −22% | +25% |
| Energy | +6% | +2% | −15% | +12% |
| Auto | +7% | −3% | −25% | +20% |
| Retail | +6% | +1% | −10% | +10% |
| Real estate | +5% | 0% | −14% | +9% |
| AI labs | +8% | −2% | −24% | +22% |

## 18. Startups (seed list; generate more from templates)

Pentagon order: Management, Product maturity, Market size, Competitiveness, Financial health.

| Name | Sector | Founded | Stage | Pentagon | Post-money | One-line description |
|---|---|---|---|---|---|---|
| Ledgerly | Fintech | 2025 | A | 6, 5, 7, 6, 4 | 18M | AI bookkeeping that closes a small business's books overnight |
| Paywave | Fintech | 2024 | B | 7, 6, 7, 5, 5 | 60M | Tap-to-pay terminals for street vendors and markets |
| Quillvault | Fintech | 2026 | Seed | 5, 3, 5, 6, 3 | 4M | Digital wills and estate vaults for families |
| GreenGrid Solar | Energy | 2023 | C | 7, 7, 8, 6, 5 | 240M | Rooftop solar on subscription, no upfront cost |
| TideTurbine | Energy | 2025 | A | 6, 4, 6, 7, 3 | 22M | Micro tidal turbines for coastal towns |
| Orbital Freight | Space | 2022 | C | 8, 6, 8, 6, 4 | 520M | Reusable cargo capsules for low orbit |
| BioHarbor | Biotech | 2024 | B | 6, 5, 7, 6, 4 | 85M | Lab-grown collagen for medicine and cosmetics |
| Cartwheel Robotics | Robotics | 2023 | B | 7, 6, 7, 5, 5 | 110M | Warehouse picking robots that learn new shelves in a day |
| Nimbus Health | Healthtech | 2025 | A | 6, 5, 6, 5, 4 | 30M | Walk-in telehealth booths in pharmacies |
| Fieldnote AI | Agtech | 2024 | A | 6, 5, 6, 6, 4 | 26M | Drones that spot crop disease before it spreads |
| QuantaCore | Quantum | 2021 | C | 8, 5, 9, 7, 3 | 900M | Error-corrected qubits in a fridge-sized machine |
| Stackhouse | Proptech | 2023 | B | 6, 6, 7, 5, 5 | 95M | Factory-built apartment modules stacked in weeks |
| Wavelength Audio | Consumer | 2025 | Seed | 5, 4, 5, 5, 4 | 6M | Earbuds that tune themselves to your hearing |
| Ferrous Labs | Materials | 2022 | B | 7, 5, 8, 6, 4 | 140M | Low-carbon steel from hydrogen furnaces |
| Driftwood Games | Gaming | 2025 | Seed | 6, 4, 5, 5, 4 | 5M | A small studio making cozy co-op games |
| Coldchain One | Logistics | 2024 | A | 6, 6, 6, 5, 5 | 28M | Solar-powered cold storage for vaccines and food |
| MetroGlide | Mobility | 2023 | B | 5, 6, 6, 4, 3 | 70M | Shared e-scooters with swappable batteries |
| Polar Batteries | Energy storage | 2022 | C | 7, 6, 8, 6, 4 | 380M | Sodium-ion batteries for grid storage |
| Clarion Security | Cybersecurity | 2023 | B | 7, 7, 7, 6, 6 | 120M | Identity verification built for banks |
| Harvest Ledger | Agtech/Fintech | 2025 | A | 6, 5, 6, 6, 5 | 20M | A marketplace that finances farmers against future harvests |

**Sector growth μ** (quarterly mean; mature margin, P/S multiple and listed sector are in `src/data/startups.ts`): Energy storage 0.06, Agtech/Fintech 0.065, Fintech 0.08, Energy 0.06, Space 0.07, Biotech 0.05, Robotics 0.07, Healthtech 0.06, Agtech 0.05, Quantum 0.06, Proptech 0.05, Consumer 0.06, Materials 0.05, Gaming 0.05, Logistics 0.05, Mobility 0.04, Cybersecurity 0.07.


### Generated startups (2026-10-26)
Startups generated during a game (conventions and the Investment floor pipeline, SIMULATION §20.1) take names and descriptions from templates, so a pipeline keeps showing new companies:
- **Names** (`src/data/nameParts.ts`, `NAME_GEN.startupPatterns`): half are a word and a suffix that fits the sector (Cobalt Grid, Mosaic Arcade, Echo Volt); a quarter are coined brands (Quindra, Zandwell); a quarter a coined brand with a sector suffix (Tremio Shield). 50 words; 6 suffixes for each of the 17 sectors. A name already used by a startup or listed company is drawn again.
- **Descriptions** (`src/data/startupBlurbs.ts`): "{offer} for {customer}" from six offers and six customers per sector (36 per sector), e.g. "Cold-chain trucking for pharmacies"; 15% of the time one of the sector's handwritten lines instead. A description already used by a startup still in the pipeline is drawn again.
## 19. Conferences (yearly calendar)

| Event | City | Week |
|---|---|---|
| Alpine Inference Forum | Zürich | 3 |
| Model Makers North | Toronto | 15 |
| Big Apple AI Days | New York | 19 |
| Thameside Alignment Summit | London | 24 |
| Foothills Founders Fair | Calgary | 28 |
| Prairie Dev Days | Saskatoon | 33 |
| Bay Builders Week | San Francisco | 38 |
| Harbour Dev Summit | Sydney | 41 |
| Asia Compute Forum | Singapore | 45 |

Announced in the paper 4 weeks before. Active for 4 weeks (was 2 and 1 until 2026-10-26, so monthly results never miss one). Calgary's fair is our addition so every start city has a conference before travel arrives. The code calls conferences `conventions`.

### 19a. Currencies (SIMULATION §19.10)

| Country | Code | Name | Weekly vol | Notes |
|---|---|---|---|---|
| CA | CAD | Canadian dollar | 0.6% | |
| US | USD | US dollar | 0.5% | |
| UK | GBP | Pound sterling | 0.7% | |
| EA | EUR | Euro | 0.6% | |
| CH | CHF | Swiss franc | 0.5% | |
| JP | JPY | Japanese yen | 0.8% | |
| AU | AUD | Australian dollar | 0.9% | |
| SG | SGD | Singapore dollar | 0.4% | |
| HK | HKD | Hong Kong dollar | 0.5% | pegged to USD |
| RU | RUB | Russian ruble | 1.2% | the most volatile |

## 20. Personal purchases

**Homes:**

| Home | Region | Price |
|---|---|---|
| Muskoka Lake House | CA | 4.8M |
| Whistler Ski Chalet | CA | 6.5M |
| Okanagan Vineyard Estate | CA | 9.2M |
| Hamptons Beach Estate | US | 28M |
| Aspen Ridge Retreat | US | 14M |
| Côte d'Azur Villa | EA | 35M |
| Lake Como Villa | EA | 22M |
| Swiss Alpine Chalet | CH | 18M |
| Kyoto Garden House | JP | 6M |
| Byron Bay Clifftop | AU | 9M |

**Cars** (fictional marques):

| Car | Price | Notes |
|---|---|---|
| Kestrel Roadster | 95,000 | |
| Lumen Apex EV | 180,000 | |
| Ridgeline Spectre (SUV) | 240,000 | |
| Montclair GT Spider | 310,000 | |
| Arcadia Veloce V12 | 420,000 | |
| Valkyr Hypercar | 3,200,000 | limited |
| Castellan 1962 Classic | 2,100,000 | classic, appreciates |

**Jets:**
- Corvid 600: 24M, 6,000 km range.
- Albatross 8000: 68M, global range.

**Collectibles** (estimates):
- 1987 Championship Game Ball, signed — 450k
- Portrait of a Merchant Banker, oil, 1890s — 3.8M
- First-Strike Gold Sovereign, 1817 — 1.2M
- Bronze "Liberty in Flight", deco sculpture — 2.6M
- 1950s Racing Chronograph — 1.6M
- Annotated Lunar Flight Plan — 2.2M
- Original Banknote Engraving Plate, 1923 — 950k
- Rookie card of fictional centre "Jack Morrow", mint — 5.2M
- Imperial Jade Seal, 19th c. — 1.9M
- Signed First Edition of a classic detective novel — 380k
- Deco Mantel Clock by "Atelier Vautrin" — 640k
- Prototype Racing Helmet, 1970s — 520k

**Sports franchises:**

| Club | City | Sport | Value |
|---|---|---|---|
| Saskatoon Harvest | Saskatoon | Hockey | 320M |
| Calgary Bighorns | Calgary | Hockey | 900M |
| Toronto Lakehawks | Toronto | Hockey | 2.4B |
| Toronto Ravens FC | Toronto | Football | 650M |
| New York Empire FC | New York | Football | 1.9B |
| Chicago Ironmen | Chicago | Basketball | 3.1B |
| London Kingsbridge FC | London | Football | 3.6B |
| Paris Lumière FC | Paris | Football | 2.8B |
| Tokyo Tide | Tokyo | Baseball | 1.4B |
| Sydney Breakers | Sydney | Rugby | 480M |

## 21. Loan Desk sectors (removed)

The Loan Desk and its sector table were removed in C5b. The Deal Desk's businesses use the deal sectors of §21b.

## 21b. Deal sectors

Customer businesses on spare storefronts (`src/data/dealSectors.ts`). Pentagon order: AI readiness, Budget, Data sensitivity, Switching cost, Financial health. Names are a prefix (28 invented words such as the ones in the file) plus one of the sector's business words.

| Sector | Budget mult | Term (quarters) | Pentagon profile | Districts |
|---|---|---|---|---|
| Café & restaurant | 0.5 | 2–4 | 3, 3, 3, 3, 4 | Downtown, University |
| Retail | 0.8 | 2–4 | 5, 5, 4, 4, 5 | Downtown, Midtown |
| Construction | 0.9 | 4–8 | 3, 5, 4, 5, 5 | Suburbs, Industrial |
| Logistics | 1.3 | 4–8 | 6, 6, 4, 6, 5 | Industrial |
| Health care | 1.2 | 4–8 | 5, 6, 9, 7, 7 | Midtown, Suburbs |
| Software | 1.6 | 2–4 | 9, 6, 5, 3, 4 | University, Financial |
| Manufacturing | 1.4 | 4–8 | 5, 6, 6, 7, 6 | Industrial |
| Farm & agri (S/M cities only) | 0.7 | 4–8 | 3, 4, 3, 5, 5 | Suburbs |
| Professional services | 1.1 | 4–6 | 7, 7, 8, 5, 7 | Financial |
| Finance & insurance | 2.0 | 4–8 | 6, 8, 9, 7, 7 | Financial, Downtown |
| Media & design | 0.9 | 2–4 | 8, 5, 3, 3, 4 | Downtown, University, Waterfront |
| Hotel & hospitality | 1.0 | 4–6 | 4, 5, 5, 5, 4 | Waterfront, Downtown |
| Major employer (anchor) | 1 | 8–12 | 5, 8, 7, 8, 7 | employer sites |

Sizes (`BUSINESS.sizes` in balance.ts): small, mid and large weigh 0.55 / 0.33 / 0.12 with base budgets of $6k / $25k / $90k a year; anchors start at $360k scaled by headcount (per 2,500 staff) and pay. About half the businesses (70% of anchors) start on a rival lab's contract. Big contracts ($250k a year or more) make the paper when won from a rival or lost.

## 22. Incidents
Implemented in `src/data/incidents.ts` (texts and options) and `src/data/incidentParams.ts` (numbers). The case ids are bank-era; the title column is what the player sees.

Default cooldown: 8 weeks per scope. Office cases go to a manager trusted with Sales office troubles; company and city cases to a COO trusted with Company troubles (SIMULATION §17.2), except those marked **yours** below (EXEC_POACHED, RESEARCHER_POACHED, BANK_RUN, RECAP_OFFER), which always reach you. `penaltyWeeks` on an option is how a delegated decider values its non-cash effects, in weeks of revenue.

| id | Title | Scope | Weekly base p | Condition / multiplier | Options (cost → effect) |
|---|---|---|---|---|---|
| ROBBERY | Server-room break-in | office | 0.0015 | × (6 − machine room security)/3 | Upgrade the secure room (50% of the next machine room's price → morale +5) · Paid leave ($2k × staff → morale +10) · Business as usual (morale −15, Office −0.3 for 8 wk). Loss: $20k–150k ÷ security, 80% insured. |
| ATM_SKIM | API key leak | office with a demo kiosk | 0.002 | × (1.3 − model Safety/10) | Refund customers ($5k–40k) · Rotate every key ($15k; p ×0.5 for 26 wk) · Deny liability (Service −0.4 for 8 wk; 30% news) |
| DATA_BREACH | Data breach | company | 0.002 | × (1 + 2(1 − Platform & Security coverage′)) × (1.2 − CTO expertise/100) | Notify and monitor ($15 × affected; Overall −0.1 for 4 wk) · Quiet fix (40% discovered → fine 2% of annual revenue, Overall −0.4 for 12 wk, news) · Forensic firm ($500k; breach p −50% for 52 wk) |
| MIS_SELLING | Capability over-claim | office | 0.001 | × Sign-Up Credits level × (1.6 − ethics/100) × (risk appetite ≥ 4 ? 1.5 : 1) | Fire the manager and compensate · Compensate only · Deny it (40% chance of a fine of 5× compensation; news). Compensation is 2% of the office's deposit books ÷ 10 (see note below). |
| REGULATOR_AUDIT | Safety audit | company | quarterly (SIMULATION §15) | fail only | Pay the fine · Appeal (50%: fine ×0 or ×1.5) · Pay and hire consultants ($ = 0.5 × fine; Safety coverage +0.2 for 26 wk) |
| VIRAL_COMPLAINT | Viral complaint | office | 0.01 | Service < 2.5 | Apologise and fix it ($10k; Service +0.2) · Ignore it (awareness −0.05; 30% news) |
| EXEC_POACHED | Executive poached | company | SIMULATION §17.2 | per exec | Counter-offer (+25% salary, loyalty +10) · Let them go |
| RESEARCHER_POACHED | Researcher poached | company | quarterly rival bid (§13c) | per researcher | Counter-offer (their salary +25%) · Let them go (they join the rival, whose next models get better) |
| BRANCH_FLOOD | Heatwave | office | 0.0005 | Waterfront ×3 | Fast repair ($80k; closed 1 wk) · Slow repair ($30k; closed 4 wk) |
| BANK_RUN | Outage rumour | company | SIMULATION §13.8 | very poor ratings and a Restricted or Critical safety tier | Central bank window (bank-era: lends a share of deposits, so nothing for a lab; stigma) · Cut plan prices 10% everywhere for 8 wk (`planCut`) · Public statement (success 30% + 5% per credit-ratio point above 8%; success ends the rumour) |
| CARD_FRAUD | Abuse ring | company offering the API | 0.0015 | × (1.3 − model Safety/10) | Absorb the losses (2% of API ARR) · Freeze API sign-ups for a week (API take-up −50% for 4 wk) · Absorb and call a fraud firm |
| STAFF_WALKOUT | Staff walkout | office | 0.03 | morale < 25 | Raise wages 10% · Pay a bonus ($1,000 per staff, morale +20) · Wait it out (closed 1 wk, then morale +10) |
| DIVIDEND_DUE | Dividend due | company | 3 weeks before payment | info | OK |
| PRICE_WAR | Price war | city | SIMULATION §18.6 | — | Match it (plan prices −10% at your office in the city for 26 wk, `planCut`) · Hold our prices |
| BIG_DEFAULT | Big customer failure | office | — | no longer raised; big contract losses make the paper instead (§23) | OK |
| INSIDER_PROBE | Insider trading probe | personal | SIMULATION §22 | — | Settle (fine) · Fight it (50%: cleared, or fine ×2 and news) |
| REGULATOR_LETTER | Letter from the regulator | company | on entering the Restricted safety tier | info | OK (explains how to lift the safety ratio) |
| RECAP_OFFER | Mandated pause | company | SIMULATION §15 | — | Accept the pause (fee 2% of trailing revenue, at least $250k) · Decline (the licence is revoked) |

Note: the over-claim compensation still reads the office's deposit books, which a lab no longer has, so it comes out at $0. The same goes for the outage rumour's central bank window. Both are bank-era leftovers in the code.

## 23. Ledger headline templates
The paper is The Weekly Inference; the code calls it the Ledger, and event types keep bank-era ids (`NEW_BRANCH`, `BANK_RUN` and so on). Tokens are in {braces}; `{bank}` is a lab's name. Write 2–4 variants per type in code. The full set lives in `src/data/ledgerTemplates.ts` and its siblings: `ledgerTemplatesRivals.ts`, `ledgerTemplatesWorld.ts`, `ledgerTemplatesGlobe.ts` (§23.1 World desk: 35 beats), `ledgerTemplatesGlobeMore.ts` (26 more World desk beats), `ledgerTemplatesDesk.ts` (§23.2 company desk, §23.3 Money Column, §23.4 elections) and `ledgerTemplatesCalendar.ts` (§23.5 commodities, §23.6 world calendar, §23.7 the archive), plus the markets, mergers, ventures, personal and other files. The fictional leagues, parties and policies are in `src/data/newsWorld.ts`, and the World desk's beat rules (country, months, phase, condition, number ranges), share-move reasons by sector and launch products in `src/data/newsWorldBeats.ts` (and `newsWorldBeatsMore.ts` with its invented book, game, show, species, dish and record names); commodities in `src/data/commodities.ts`; the Nations Cup and World Games nations, fixtures, prize fields and films in `src/data/worldCalendar.ts`. Every place, person and company in them is invented or a game city.

Examples:

| Type | Headline | Body |
|---|---|---|
| NEW_BRANCH | New sales office: {bank} opens in {district}, {city} | {bank} signed for {address} this week. Fitters are in and the doors open within days. |
| CB_HOLD | {cb} holds its rate at {rate} | At this week's meeting the {cb} kept its policy rate at {rate}. GDP growth was {gdp} last quarter; it expects {fc} this quarter. |
| CB_RAISE / CB_CUT | {cb} {raises\|cuts} rate to {rate} | The {cb} moved its policy rate by {bp} basis points to {rate}, citing inflation of {infl} and growth of {gdp}. |
| CONTRACT_WON_BIG | {bank} wins {business} from {rival} | The {sector} account, worth {amount} a year, switched at its renewal, leaving {rival}. |
| CONTRACT_LOST_BIG | {business} drops {bank} | The {sector} account, worth {amount} a year, {why}. |
| COMPUTE_OUTAGE | {bank} goes down under the load | Customers report errors and timeouts as demand outruns the lab's GPUs. Some are already shopping around. |
| MODEL_TRAINED | {bank} finishes training {name} | The new model scores {score} on the benchmark board and is ready to switch on in Manage Models. |
| RIVAL_MODEL_RELEASED | {bank} ships {model} | The new release scores {score} on the benchmark board. |
| SAFETY_PAUSE | {bank} agrees to a {weeks}-week safety pause | Regulators will sit alongside the lab's safety team. No new customers or training runs until they leave. |
| POWER_DEAL_SIGNED | {bank} signs a power deal at {site} | The {fee} contract brings cheap power and contracted GPUs to the lab over seven years. |
| FASTEST_GROWING | The fastest growing labs of {year} | {bank} tops this year's list after growing assets {pct}. |
| RICH_LIST | {name} enters the rich list at #{rank} | The {bank} founder's fortune is estimated at {worth}. |
| REG_FINE | Regulator fines {bank} {amount} | The penalty follows {reason}. |
| BANK_FAILURE | Regulators seize {bank} | {bank}'s {n} sales offices will be offered to buyers. |
| ACQUISITION_CLOSED | {bank} buys {target} for {price} | {target}'s {n} sales offices join {bank}. Signs come down over the next eight weeks. |
| IPO_LISTED | {bank} opens at {open} on its first day | Shares priced at {price} {pop} as {ticker} began trading on the {exchange}. The listing raised {raised}. |
| BREACH | {bank} discloses data breach | About {n} customers may be affected. |
| BANK_RUN | Queues form outside {bank} | (bank-era wording about depositors; the outage rumour, §22) |
| AUCTION_PREVIEW | {house} unveils {lots} lots for its next sale | (see `ledgerTemplatesAuctions.ts`) |
| SPORTS_RESULT | {winner} beat {loser} {score} | A {margin} win in the {league}{extra}. {winner} are now {record} on the season. |
| POLICY_PROPOSED | {country} government proposes {policy} | The proposal from the {party} would {effect} if passed. A vote is due within weeks. |

## 24. Review card templates

Pick by category and sentiment. Use campaign-specific lines when the campaign is active. The full lists live in `src/data/reviews.ts` (examples below).

- **Price +**
  - "Pro costs less here than anywhere else I tried. Switched the whole team."
  - "API pricing is cheap enough to leave a batch job running all night."
- **Price −**
  - "Forty a month for Plus? The lab across the street charges half."
  - "Ran one big job and the API bill made me sit down."
- **Service +**
  - "Support answered in five minutes and fixed it in ten."
  - "Someone at the office walked me through the whole setup."
- **Service −**
  - "Three days waiting on a support ticket."
  - "Nobody at the front desk for ages."
- **Office +**
  - "Beautiful office. Felt like visiting the future."
  - "Bright, quiet demo room. Nice place to try the new model."
- **Office −**
  - "Office looks like it hasn't been redone since the 90s."
  - "The demo kiosk froze. Again."
- **Products +**
  - "The code assistant writes half my pull requests now."
  - "They had exactly the plan my startup needed."
- **Products −**
  - "No campus plan? Come on."
  - "The model got my simple question confidently wrong."
- **Campaigns:**
  - Coffee & Live Demos: "Free espresso while they set up my account? Fine, you win."
  - Hack Nights: "Charged my laptop while I waited. Small thing, big difference."
  - Weekend Support: "Open Saturday mornings. Thank you!"
  - Sign-Up Credits: "Came for the free credits. Might stay."
  - AI Workshops: "The prompting workshop finally made it click for me."

## 25. Advisor lines (contextual)

Fill these per panel and state.

- **Office manager:**
  - "Morning, boss. Drawers are balanced and the coffee's on." (bank-era wording still in code)
  - Busy: "We're slammed. The line's out the door."
  - Quiet: "Quiet week. Want to sharpen our rates?"
  - Low morale: "The team's frustrated about pay."
- **Storefront for lease:**
  - "{traffic: Foot traffic is heavy / steady / light here}, {rent: and the rent's steep / fair / cheap}."
  - Plus a demographic hint ("lots of researchers nearby").
- **Office for lease:** "Plenty of desks here. We can bring more teams in-house."
- **HQ (no office yet):** "Every growing lab needs a head office. Let's find one."
- **Company summary:** "Grow recurring revenue; watch the compute bill."
- **Rival sales office:** "This is {rival}'s sales office. Their Plus plan is {x}; ours is {y}."
- **Rival lab HQ:** "Welcome to {rival}. We lend to businesses — even competitors."
- **Central bank:** "The governor's office. Rates are on everyone's mind."
- **Investment bank:** "Welcome to {name}. Raising capital or buying a competitor?"
- **Data vendor:** "Better data, better models. What can we train for you?"
- **Employer:** "{n} people work here, and their team could use our plans."
- **Energy site employer:** "{n} people work here, on a site with power to spare for a data center."
- **Business:** "{business} spends about {budget} a year on AI and has no vendor yet." / "{business} runs on our models." / "{rival} serves {business} today."
- **Airport:** "Welcome to {airport}. Where are we headed?"
- **Auction house:** "Exceptional pieces this season. Buying or selling?"
- **Car dealer:** "Our finest machines. Something for the weekend?"
- **University:** "Our graduates would love to join a growing lab."
- **Lobbying firm:** "We know the right people. Results take a few weeks, and discretion is never guaranteed."
- **Marketing agency:** "Let's put your name on every billboard in town."
- **Vacation home:** "A place to get away from it all — bought with your own money."

## 26. Name pools

- **First names:** Avery, Malik, Sofia, Kenji, Amara, Liam, Priya, Mateo, Chloé, Tariq, Hannah, Diego, Mei, Oluwaseun, Freya, Arjun, Isabel, Noah, Zainab, Lucas, Yuki, Elena, Kwame, Grace, Rafael, Aisha, Oscar, Leila, Dmitri, Nora, Santiago, Ingrid, Hamza, Camille, Ethan, Sakura, Omar, Bianca, Theo, Imani.
- **Last names:** Bennett, Okafor, Laurent, Tanaka, Haddad, Novak, Fraser, Mendes, Kowalski, Singh, Achebe, Moreau, Lindqvist, Park, Delgado, Whitfield, Nakamura, Osei, Brennan, Rossi, Chen, Abara, Duval, MacLeod, Petrov, Ahmed, Sorensen, Kaur, Ibarra, Gallagher, Hoffmann, Mensah, Calloway, Ferreira, Varga, Kimura, Nwosu, Ashford, Castillo, Holm.
- **Investor and fund names:** Hardwick Capital, Wren & Lowe, Saltmarsh Ventures, Northgate Partners, Lindenhall Fund, Bluewater Equity, Corbel Asset Management, Fenwick Family Office.
