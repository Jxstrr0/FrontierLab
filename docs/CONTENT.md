# Content Tables

Data for `src/data/*.ts`. All names are original. Index values are relative to 1.00 (Toronto-like). Extend lists freely. Keep new entries original and match the field shapes in DATA_MODEL.md.

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

**Density** (optional, default 1): how crowded a city is. It multiplies every lot's foot traffic and the city-wide customer pool (`CITY_MARKET`, SIMULATION §9.2) and the branch guide, so each branch's catchment holds more people. Rent still follows `rentIndex`.

### Regional sites
Each site is a small map with an airport and 1–2 employers. There are no storefronts.

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

**How many storefronts** (2026-10-25): `round(LOTS_BASE[size] + LOTS_PER_RIVAL[size] × rival banks in the city)`, with `LOTS_BASE = { S: 12, M: 18, L: 24, XL: 32 }` and `LOTS_PER_RIVAL = { S: 4, M: 4.5, L: 5, XL: 6 }`. With the usual rival count that is about 20 / 32 / 44 / 62 storefronts (it was 36 / 56 / 80 / 110), so good corners feel slightly scarce and a city with more competitors has more of them. At the start about three times the advised branch count (SIMULATION §9.2) is free; rivals take more as they grow. Cities already on the map in a save (layout 1) keep their original count.

**Cities grow** (2026-10-26): every `CITY_GROWTH.everyYears` (2) at the year end, each generated city (not a regional site) adds `CITY_GROWTH.share` (10%) of the storefronts it started with, at least one, drawn by district share from the city's own `citygrow:{cityId}` stream and placed on free street frontage like the originals, until it has added `maxGrowth` (1.5×) its starting count or runs out of frontage. The paper reports it ("{city} grows: {n} new storefronts"). Rivals expand into the new corners the same way they do into free ones (SIMULATION §18.4).

How a lot's values are derived:
- **Traffic:** district value × city density (default 1) × U(0.65, 1.35).
- **Rent:** base × city.rentIndex × (traffic / (district traffic × density))^0.6 × U(0.9, 1.1) × today's price list (SIMULATION §4.6; 1 at the start). Every rent, free or leased, moves with the price list at each year end; a lease deposit stays as paid.
- **Deposit:** 6 × rent.
- **incomeIndex:** district income × city.incomeIndex × U(0.9, 1.1).
- **Position:** a point drawn around the district centre (balance `CITYGEN.layout`), snapped to the nearest free tile facing a street. Streets run every 4th row and column (`CITY_LAYOUT.block`); water cities have a wavy shoreline near the far edge (`CITY_LAYOUT.shore`).

## 4. Segments

| id | Segment | sensDep | sensLoan | sensFee | Ticket mult: deposits | Ticket mult: lending | Ticket mult: cards |
|---|---|---|---|---|---|---|---|
| STU | Students | 0.3 | 0.6 | 1.2 | 0.25 | 0.40 | 0.50 |
| YP | Developers | 0.6 | 0.7 | 0.8 | 0.80 | 0.90 | 0.90 |
| FAM | Consumers | 0.5 | 0.9 | 0.7 | 1.00 | 1.10 | 1.00 |
| RET | Researchers | 1.0 | 0.4 | 0.5 | 1.80 | 0.70 | 1.10 |
| BIZ | Small shops | 0.4 | 0.7 | 0.5 | 1.50 | 1.00 | 1.40 |

### Affinity matrix
Base probability that a new customer in the segment opens the product, before modifiers.

| Product | STU | YP | FAM | RET | BIZ |
|---|---|---|---|---|---|
| chequing | .55 | .85 | .85 | .70 | .10 |
| savings | .20 | .50 | .45 | .55 | .10 |
| gic1y | .02 | .10 | .18 | .45 | .05 |
| student | .80 | .05 | 0 | 0 | 0 |
| business_acct | .02 | .05 | .03 | .02 | .90 |
| personal_loan | .06 | .12 | .10 | .04 | 0 |
| auto_loan | .03 | .10 | .12 | .05 | 0 |
| mortgage | 0 | .05 | .09 | .02 | 0 |
| loc | .04 | .12 | .12 | .06 | .20 |
| credit_card | .35 | .45 | .40 | .25 | .30 |
| wealth | 0 | .04 | .08 | .20 | .05 |
| safe_box | 0 | .02 | .05 | .12 | .06 |
| fx | .10 | .12 | .08 | .06 | .35 |

The `business_acct` deposit ticket multiplier for BIZ is 1.0, since the base ticket is already business-sized.

## 5. Products (v1 catalog)

| id | Name | Category | Price type | Tenor | Default price | Range / step | Base ticket | Term (wk) | Base PD/yr | LGD | Risk weight | Base approval | Churn/yr | Servicing $/acct/wk | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chequing | Everyday Chequing | deposits | fee $/mo | short | $12 | 0–30 / 1 | 3,000 | — | — | — | 0 | — | 8% | 0.45 | pays 0.05%; organic +3%/yr; rateChurnSens 0.1 |
| savings | High-Interest Savings | deposits | rate | short | FTP − 1.00% (floor 0.10%) | 0–8% / 0.05 | 9,000 | — | — | — | 0 | — | 14% | 0.30 | rateChurnSens 0.6 |
| gic1y | 1-Year GIC | deposits | rate | long | FTP_long − 0.15% | 0–9% / 0.05 | 16,000 | 52 | — | — | 0 | — | (maturity) | 0.20 | renewal base 72% |
| student | Student Account | deposits | fee $/mo | short | $0 | 0–10 / 1 | 900 | — | — | — | 0 | — | 12% | 0.35 | 8%/yr convert to chequing |
| business_acct | Business Account | deposits | fee $/mo | short | $25 | 0–80 / 1 | 15,000 | — | — | — | 0 | — | 9% | 0.90 | pays 0.25% |
| personal_loan | Personal Loan | lending | rate | short | FTP + 6.00% | 3–25% / 0.05 | 11,000 | 156 | 3.0% | 0.70 | 0.75 | 0.62 | — | 0.40 | |
| auto_loan | Auto Loan | lending | rate | long | FTP_long + 3.40% | 2–18% / 0.05 | 27,000 | 260 | 1.6% | 0.40 | 0.75 | 0.70 | — | 0.30 | prepay applies |
| mortgage | Mortgage (5-yr fixed) | lending | rate | long | FTP_long + 1.45% | 1.5–12% / 0.05 | 340,000 | 1,300 amort. | 0.35% | 0.20 | 0.35 | 0.48 | — | 0.60 | origination fee 0.5%; reprices 1/260 per wk |
| loc | Line of Credit | lending | rate | short | FTP + 5.00% | 3–20% / 0.05 | drawn 8,800 | revolving | 2.0% | 0.60 | 0.75 | 0.60 | 6% | 0.25 | limit 16,000 × incomeIndex |
| sbl | Small Business Loan | lending | rate | short | FTP + 4.50% | 3–20% / 0.05 | Loan Desk | 52–364 | pentagon | collateral | 1.00 | — | — | 1.20 | individual loans |
| credit_card | Credit Card | cards | rate (APR) | — | 20.99% | 9.99–29.99% / 0.25 | drawn 2,400 | revolving | 4.5% | 0.85 | 0.75 | 0.60 | 7% | 0.35 | spend 1,300/mo; annual fee $0 |
| wealth | Wealth Advice | cards | fee %AUM | — | 1.00% | 0.25–2.5% / 0.05 | AUM 50,000 | — | — | — | 0 | — | 8% | 1.50 | needs ≥ 1 advisor office |
| safe_box | Safe Deposit Box | cards | fee $/yr | — | $120 | 40–400 / 5 | — | — | — | — | 0 | — | 6% | 0.10 | capped by vault boxes |
| fx | FX & Wires | cards | markup % | — | 2.50% | 0.5–5% / 0.1 | 1,800/customer/yr | — | — | — | 0 | — | — | 0 | volume-based |

Starting quality: every v1 product starts at 2.5 stars, except chequing and savings at 3.0.

Lending approvals are tuned so company loans settle near 80% of deposits. If the balance report drifts, adjust mortgage approval first.

Stage 1 tuning (2026-10-24): base tickets for savings (14,000 → 9,000), GIC (24,000 → 16,000), business account (38,000 → 15,000) and wealth AUM (120,000 → 50,000) were lowered so a mature branch lands near SIMULATION §12.1's deposit mix. Mortgage approval moved 0.42 → 0.48 to hold loans near 80% of deposits.

## 6. Product development templates

| id | Name | Base | Effect | Tier effect (Low / Medium / Premium) |
|---|---|---|---|---|
| senior_saver | Senior Saver | savings | RET affinity +0.15 | default rate −0.10 / 0 / +0.15pp |
| kids_savings | Kids Savings | savings | FAM affinity +0.10, ticket ×0.3 | |
| notice_acct | 31-Day Notice | savings | churn ×0.6; tenor long | |
| green_gic | Green GIC | gic1y | Branch +0.05 reputation; YP +0.05 | |
| first_home | First-Home Mortgage | mortgage | YP/FAM affinity +0.04; base PD ×1.1 | |
| green_mortgage | Green Mortgage | mortgage | reputation +; rate −0.10pp default | |
| ev_auto | EV Auto Loan | auto_loan | YP +0.04; base PD ×0.9 | |
| student_loc | Student Line of Credit | loc | STU affinity +0.10; base PD ×1.3 | |
| consolidation | Debt Consolidation Loan | personal_loan | approval +0.05; base PD ×1.15 | |
| cashback_card | Cashback Card | credit_card | take-up +15%; interchange share −0.3% | |
| travel_card | Travel Rewards Card | credit_card | annual fee $120; spend ×1.6; YP/RET +0.05 | |
| student_card | Student Card | credit_card | STU +0.15; limit ×0.4 | |
| secured_card | Secured Card | credit_card | approval +0.25; base PD ×0.6; spend ×0.5 | |
| business_card | Business Card | credit_card | BIZ +0.25; spend ×3 | |
| robo_advisor | Robo-Advisor | wealth | no advisor office needed; fee 0.40% default; AUM ×0.25 | |
| premium_pkg | Premium Banking Package | chequing | fee $30 default; Products +0.1 at branch; RET/high-income take-up +0.1 | |
| mobile_app_v2 | Mobile App 2.0 (Digital) | — | app rating +0.3 (one-time) | requires IT floor |
| instant_decisions | Instant Decisions (Digital) | — | model speed +2 | requires IT floor |

## 7. Branch build options

**Exterior** (fit-out, 10-year depreciation):

| id | Name | Quality | Cost |
|---|---|---|---|
| ext_storefront | Plain Storefront | 1.5 | 45,000 |
| ext_brick | Heritage Brick | 2.5 | 70,000 |
| ext_glass | Modern Glass | 3.5 | 120,000 |
| ext_columns | Classic Columns | 4.5 | 210,000 |
| ext_deco | Deco Tower Front | 5.0 | 340,000 |
| ext_lattice | Lattice Pavilion | 5.0 | 340,000 |

**Lobby** (fit-out):

| id | Name | Quality | Advisor offices | Cost |
|---|---|---|---|---|
| lob_basic | Basic Lobby | 1.5 | 0 | 90,000 |
| lob_comfort | Comfort Lobby | 2.5 | 1 | 145,000 |
| lob_advice | Advice Centre | 3.5 | 2 | 220,000 |
| lob_marble | Marble Hall | 4.5 | 3 | 340,000 |
| lob_private | Private Banking Suite | 5.0 | 4 | 520,000 |

**Teller line** (equipment, 5-year depreciation):

| id | Name | Quality | Productivity coins | Stations × /wk | Cost |
|---|---|---|---|---|---|
| tel_counter | Two-Window Counter | 2 | 2 | 2 × 70 | 24,000 |
| tel_standard | Standard Teller Line | 3 | 3 | 3 × 80 | 48,000 |
| tel_pods | Service Pods | 4 | 3 | 3 × 95 | 82,000 |
| tel_express | Express Line | 3 | 5 | 5 × 90 | 115,000 |
| tel_concierge | Concierge Desks | 5 | 4 | 4 × 110 | 160,000 |

**Vault** (equipment):

| id | Name | Quality | Security | Boxes | Cost |
|---|---|---|---|---|---|
| vlt_safe | Back-Office Safe | 1 | 1 | 0 | 18,000 |
| vlt_steel | Steel Vault | 3 | 3 | 150 | 55,000 |
| vlt_timelock | Time-Lock Vault | 4 | 4 | 300 | 95,000 |
| vlt_fortress | Fortress Vault | 5 | 5 | 600 | 180,000 |

**ATM** (equipment):

| id | Name | Quality | Productivity /wk | Cost |
|---|---|---|---|---|
| atm_none | No ATM | — | 0 | 0 |
| atm_wall | Wall ATM | 2 | 120 | 14,000 |
| atm_dual | Dual ATM | 3 | 240 | 28,000 |
| atm_smart | Smart ATM (deposits) | 4 | 300 | 46,000 |
| atm_lobby | 24/7 ATM Lobby | 5 | 480 | 78,000 |

Reference builds:
- **Basic:** $177k (storefront, basic lobby, counter, safe, no ATM).
- **Mid:** $332k (brick, comfort, standard, steel, wall ATM).
- **Premium:** $883k (columns, marble, concierge, time-lock, ATM lobby).

### 7a. House styles

Chosen on New Game (`src/data/houseStyles.ts`); every branch front wears it, whatever the exterior option. A game started without a style, and saves from before styles existed, draw one of the first five from the seed (`SEEDED_HOUSE_STYLE_IDS`), so adding a style never changes an old game.

| id | Name | Sign | Lamps | Planters | Door | Flag |
|---|---|---|---|---|---|---|
| heritage | Old Exchange | gilt serif on a dark fascia | carriage lanterns | box trees | brand ink, panelled | rectangle |
| deco | Jazz Age | stepped board, capitals, chevrons | globe lamps | tall urns with spiky plants | glazed with brass bands and a sunburst | swallowtail |
| modern | Clean Line | lower-case sans with a brand-ink tile | light bars | long trough of grasses | glass with a slim pull | hanging banner |
| garden | Market Street | rounded painted board, italic | hanging lanterns | pots of flowers in the brand ink | brand ink with a wreath | pennant |
| civic | Civic Stone | capitals cut into a stone band | sconces (lamp standards on the steps of Classic Columns) | classical urns | dark bronze, panelled | bordered rectangle |
| quant | Quant Noir | graphite slab, lower-case spaced sans, a brand-ink pixel and light strip | recessed light bars in the brand ink | graphite cubes with clipped spheres | frameless glass with a glowing seam and a keypad | a slim pulsing light blade |

### 7b. Logo shapes

Chosen on New Game (`src/data/logoShapes.ts`); the outline of the bank's mark everywhere it appears: the medallion in the top bar and panel icons, the seal on every branch front, the plaque over the counter and the mark over an owned building's door. Rivals keep the round medallion. Outlines are drawn by `src/art/logoShapes.ts`.

| id | Name | Outline |
|---|---|---|
| round | Coin | the classic round medallion (the default, and what every bank wore before v20) |
| shield | Shield | heraldic shield, square-topped, pointed foot |
| lozenge | Lozenge | a diamond on its point |
| hex | Hexagon | six sides, flat top and bottom |
| plaque | Plaque | a square with cut corners |
| rosette | Rosette | twelve scallops, like a wax seal |
| tile | Tile | a sharp square, flat on |
| pebble | Pebble | a softly rounded square |
| octagon | Octagon | eight sides, flat top and bottom |

## 8. Branch campaigns

| id | Name | Levels: label (cost) | Effects per level |
|---|---|---|---|
| lobby_coffee | Coffee & Live Demos | Drip ($120/wk) · Espresso bar ($260/wk) | Branch +0.20 / +0.40; awareness +0.004 / +0.008 |
| charging | Hack Nights | On ($80/wk) | Branch +0.10; YP boost ×1.05 |
| saturday | Weekend Support | Mornings ($600/wk) · Full day ($1,100/wk) | capacity ×1.10 / ×1.20; Service +0.15 / +0.30; FAM, YP ×1.05 / ×1.10 |
| signup_bonus | Sign-Up Credits | $50 · $150 · $300 per new deposit account | deposit take-up ×1.15 / 1.30 / 1.50; cohort churn ×1.15 / 1.30 / 1.45 for 26 weeks; Rates +0.10 / 0.20 / 0.30 |
| paperless | Green Compute Pledge | Half (+$0.05/acct/wk) · Full (+$0.10/acct/wk) | Products +0.10 / +0.20; YP, STU ×1.05 / ×1.10 |
| direct_mail | Research Newsletter | Light ($300/wk) · Heavy ($700/wk) | awareness +0.010 / +0.020; RET, FAM ×1.08 / ×1.15 |
| workshops | AI Workshops | Monthly ($250/wk) · Weekly ($600/wk) | awareness +0.006 / +0.012; STU, YP ×1.08 / ×1.15; Service +0.10 |
| sponsors | Community Sponsors | Modest ($300/wk) · Generous ($800/wk) | awareness +0.010 / +0.022; Branch +0.05 / +0.10; FAM ×1.1, BIZ ×1.08 / ×1.15 |
| social | Social Media | Steady ($400/wk) · Viral push ($900/wk) | awareness +0.012 / +0.026; STU, YP ×1.10 / ×1.20 |
| search | Local Paid Search | Moderate ($450/wk) · Aggressive ($1,000/wk) | awareness +0.014 / +0.030; YP, BIZ ×1.08 / ×1.15; Loan Desk λ ×1.10 / ×1.20 |

Weekly campaign costs scale by city.costIndex. Per-account costs don't.

Content trim (2026-10-25): each campaign now has its own job. Coffee & Live Demos lifts Branch, Green Compute Pledge lifts Products (it used to repeat Lobby Coffee's Branch bump), Research Newsletter reaches researchers and families, and Community Sponsors adds businesses and a small Branch lift to its families (it used to be a cheaper Research Newsletter: awareness and families only). A version with Research Newsletter on researchers alone plus a deposit take-up boost was tried and dropped: it pulled first-year loans/deposits under the 75% floor. So was moving Community Sponsors from families to businesses outright (merged 2026-10-26): businesses bring deposits but borrow little, and the 20-city median of first-year loans/deposits fell from 77.0% to 73.9%; keeping families and adding businesses holds 76.2%.

## 9. HQ floors

| Dept | Desks | Market salary | Required staff | Effects when short (k′ < 1) |
|---|---|---|---|---|
| finance | 24 | 82,000 | 2 + 0.35 × branches + 1 per $2B assets (+4 if public) | statement delay `ceil((0.9 − k′) × 10)` weeks; IR discount; public & k′ < 0.6 → late filing fine of 0.02% of revenue per quarter; IPO needs k′ ≥ 0.8 |
| hr | 24 | 68,000 | 1 + employees / 80 | hiring ×k′; morale −(1 − k′) × 15 company-wide |
| products | 24 | 90,000 | 2 + 0.2 × branches + 2 per active development | dev duration ÷ max(0.3, k′); model cost +(1 − k′) × 30% |
| treasury | 24 | 95,000 | 1 + 1 per $1B (deposits + wholesale) | funding spread +(1 − k′) × 0.50%; fewer market offers |
| marketing | 24 | 72,000 | 1 + 0.15 × branches + 2 per active brand campaign | all campaign effects ×(0.5 + 0.5k′) |
| it | 24 | 98,000 | 2 + 0.25 × branches + 1 per $5B assets | app rating target ×k′; breach and outage odds ×(1 + 2(1 − k′)) |
| risk | 24 | 88,000 | 2 + 0.15 × branches + 1 per $750M loans | PD ×(1 + 1.5(1 − k′)); fine odds ×(1 + 3(1 − k′)); weaker loan estimates |
| executive | 8 (suite) | (per exec) | — | enables executives: COO, CFO, CPO, CMO, CTO, CSO, CREO |
| investment | 32 | 120,000 | optional | ventures shown = 1 + floor(staff / 4), max 8 |

Stage 4 tuning (2026-10-24): per-branch requirements were cut by about 40% and the Risk PD penalty raised from 0.4 to 1.5 so that a bank without an HQ ends a 6-year steady run clearly behind one with a staffed HQ (balance strategy `nohq`), instead of ahead of it. Shortfall effects read effect(k′) = k′^0.7.

Salaries scale by city.wageIndex. Desks per floor come from the building (24 or 32); Investment floors are always 32 and the Executive suite 7.

## 10. Benefits

| id | Name | Control (range) | Cost | Effects |
|---|---|---|---|---|
| tuition | Tuition Support | $/employee/yr (0–15,000, step 1,000) | as set | skill growth +3% per $1k (max +40%); attraction +2 at ≥ $8k |
| pension | Pension Match | % of salary (0–8%) | salary × % | retention +5% per pt (max +30%); morale +1 per 2 pts |
| espp | Employee Stock Plan | discount (0–15%), public only | 0.5% of payroll per discount point, in cash (dilution not modelled) | executive loyalty +5; morale +2 at ≥ 10% |
| childcare | Childcare Support | $/employee/yr (0–10,000) | as set | morale +3 at $6k; retention +10% |
| lunch | Free Lunch & Snacks | $/employee/wk (0–100) | as set | morale +4 at $60 |
| volunteer | Volunteer Days | $/employee/wk (0–150) | as set | morale +3 at $100; reputation +0.05 on all branches |
| mortgage_disc | Compute Allowance | rate discount (0–2%) | employees × 0.3 × 340,000 × discount / yr | morale +3; attraction +3 |
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
| Studio Halcyon | Prestige Campaign | 12 wk | 420,000 | +0.30, plus Branch +0.1 in that city for 26 weeks |

## 12. Funding types (Treasury)

| type | Name | Basis | Spread | Term (wk) | Size (× scale) | Cost | Term | Stability | Flexibility | Discretion |
|---|---|---|---|---|---|---|---|---|---|---|
| overnight | Overnight Interbank | policy | +0.20% | 1 (auto-roll) | — | 8 | 1 | 3 | 10 | 8 |
| term_interbank | Term Interbank | policy | +0.50% | 26–104 | 2–50M | 7 | 5 | 5 | 5 | 7 |
| covered_bond | Covered Bond | FTP_long | +0.85% | 156–520 | 25–500M | 5 | 9 | 9 | 2 | 9 |
| cb_window | Central Bank Window | policy | +1.00% | 1 | unlimited | 5 | 1 | 10 | 10 | 1 |

Content trim (2026-10-25): Brokered Deposits merged into Term Interbank and Senior Bond into Covered Bond, each new type keeping the pair's combined offer weight (8 and 4). Covered bonds still need mortgage cover (SIMULATION §13.6).

Counterparty names: Harbor Clearing Bank · Meridian Treasury · Atlas Money Markets · Pinecrest Capital · Northwind Securities · Bellwether Funding · Granite Bay Trust · Cobalt Street Markets · Ironbridge Capital · Silverpine Partners.

## 13. Underwriting

**Data inputs** (Accuracy, Speed, Inclusion, FraudShield, Fairness; cost per application):

| id | Input | Profile | $/app | Requirement |
|---|---|---|---|---|
| bureau | Bureau Score | 6, 8, 4, 4, 7 | 1.20 | — |
| cashflow | Cash-flow Data | 8, 5, 7, 5, 7 | 2.40 | — |
| altdata | Alternative Data | 5, 7, 9, 3, 4 | 0.90 | — |
| internal | Internal History | 4→9, 9, 6, 6, 7 | 0.20 | ≥ 5,000 loans booked |
| fraud | Fraud Signals | 5, 4, 4, 10, 6 | 1.10 | — |

**Credit bureau packages:**

| Package | Bureau | Mix | $/app |
|---|---|---|---|
| Clearline Basic Score (default) | Clearline | bureau 100 | 1.20 |
| Clearline Premium Score | Clearline | bureau 70 / cashflow 30 | 1.95 |
| Northscore Inclusion+ | Northscore | bureau 40 / altdata 60 | 1.35 |
| Sentinel FraudGuard | Sentinel Data | bureau 60 / fraud 40 | 1.70 |
| TrueMark Complete | TrueMark | bureau 40 / cashflow 30 / fraud 30 | 2.60 |

**Bureau locations:**
- Clearline: Toronto, New York, London.
- Northscore: Saskatoon, Calgary, Chicago.
- Sentinel Data: San Francisco, Frankfurt, Singapore.
- TrueMark: every XL city plus Sydney.

## 14. Employers (payroll partnerships)

| Type | Employees | Income mult | Notes |
|---|---|---|---|
| Hospital | 2,000 | 1.10 | |
| University | 3,500 staff | 1.00 | also offers the student partnership |
| Auto Plant | 2,500 | 1.00 | |
| Tech Campus | 1,800 | 1.60 | |
| City Hall | 5,000 | 1.05 | one per city |
| Port Authority | 1,500 | 1.00 | waterfront cities |
| Potash Mine | 1,200 | 1.40 | Saskatoon: "Prairie Potash Co." |
| Oil Sands Camp | 4,000 | 1.60 | Fort McMurray |
| Iron Ore Mine | 3,000 | 1.70 | Pilbara |
| Shale Field Services | 2,500 | 1.50 | Midland |

- **Signing fee:** employees × $160 × income mult × city.incomeIndex.
- **Contract:** 364 weeks ("Year X of 7").
- **Deposit per employee:** $4,500.
- **Generation:** 2–4 employers per city.

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

**Strategy offsets and quality profiles:**

| Strategy | Savings | GIC | Loans | Mortgage | Card APR | Fees | Rates / Products / Service / Branch | App |
|---|---|---|---|---|---|---|---|---|
| Incumbent | −0.20pp | −0.10pp | +0.20pp | +0.10pp | +1.0pp | +10% | 2.8 / 3.6 / 3.2 / 3.6 | 3.6 |
| Disruptor | +0.60pp | +0.25pp | −0.30pp | −0.10pp | −2.0pp | −60% | 4.3 / 3.4 / 3.0 / 2.5 | 4.6 |
| Premium | −0.40pp | −0.15pp | +0.50pp | +0.20pp | +2.0pp | +40% | 2.4 / 4.0 / 4.4 / 4.6 | 4.0 |
| Community | +0.15pp | +0.10pp | −0.25pp | −0.15pp | −1.5pp | −20% | 3.6 / 3.0 / 4.0 / 3.0 | 2.8 |

Branch counts at start, by city size: S 3–5, M 6–10, L 10–16, XL 16–24 in total across that city's rivals. Disruptors get 1–2 each.

### Chartered banks (2026-10-26)
New labs founded during a game (SIMULATION §18.7) take an invented name from `src/data/rivalCharters.ts`: a place-style stem (Ashcombe, Copperleaf, Glenhaven, Lanternhill, Wrenfield and others) with a suffix by strategy (incumbent: AI, Labs, Intelligence; premium: Research, Institute, & Partners; community: Collective, Open Models, Open Lab), or for a disruptor a one-word brand (Zephly, Pocketwell, Quillo, Lumio, Nuvra, Sprigly, Taffel, Glimmr, Vantlo, Ottery, Brisko, Pennyloop). Since 2026-10-26 (procedural names), 40% of charters (`NAME_GEN.listedName`) use these listed stems and brands; the rest get a generated one from `src/data/nameParts.ts`: a stem from a head and a tail (Ash + combe, Raven + sford, Maple + water: 40 × 30 combinations), or a coined brand from an onset, vowel, coda and ending (Quinly, Naloop, Polwell), 4–8 letters, with awkward clusters redrawn. Names never repeat in a save. Inks come from a ten-colour palette. Their ids are `charter1`, `charter2`, …; they have no head-office building on the map.

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

## 17. Stock market (non-bank listed companies)

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

The Banking sector lists the rivals marked "Listed" in §15, and your bank once it lists.

Implemented in `src/data/stocks.ts`, with a home exchange per company and beta by sector (Technology 1.3, Auto 1.2, Banking 1.1, Energy 0.9, Retail 0.8, Real estate 0.7). **Exchanges** (fictional, one per country): CA Maple Exchange · US Union Exchange · UK Thames Exchange · EA Rhine Bourse · CH Alpine Exchange · JP Sakura Exchange · AU Coral Exchange · SG Lion City Exchange · HK Pearl Exchange · RU Neva Exchange. **Index:** the Inference Composite.

**Sector μ by phase** (annual, Expansion / Slowdown / Recession / Recovery):

| Sector | Expansion | Slowdown | Recession | Recovery |
|---|---|---|---|---|
| Technology | +12% | 0% | −22% | +25% |
| Energy | +6% | +2% | −15% | +12% |
| Auto | +7% | −3% | −25% | +20% |
| Retail | +6% | +1% | −10% | +10% |
| Real estate | +5% | 0% | −14% | +9% |
| Banking | +8% | −2% | −24% | +22% |

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
## 19. Conventions (yearly calendar)

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

Announced in the Ledger 4 weeks before. Active for 4 weeks (was 2 and 1 until 2026-10-26, so monthly results never miss one). Calgary's fair is our addition so every start city has a convention before travel arrives.

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

## 21. Loan Desk sectors

Pentagon order: Management, Track record, Market, Competitiveness, Financial health.

| Sector | Amount mult | Term (yr) | Pentagon profile | District weights |
|---|---|---|---|---|
| Café & restaurant | 0.6 | 3–5 | 5, 4, 5, 4, 4 | Downtown, University |
| Retail shop | 0.8 | 3–5 | 5, 5, 5, 5, 5 | Downtown, Midtown |
| Construction | 1.6 | 2–5 | 5, 6, 6, 5, 5 | Suburbs, Industrial |
| Logistics | 1.4 | 3–7 | 6, 6, 6, 5, 5 | Industrial |
| Medical/dental clinic | 1.2 | 5–7 | 7, 7, 6, 6, 7 | Midtown, Suburbs |
| Tech startup | 1.0 | 1–3 | 6, 3, 8, 6, 3 | University, Financial |
| Manufacturing | 2.0 | 5–7 | 6, 7, 5, 5, 6 | Industrial |
| Farm & agri | 1.5 | 3–7 | 6, 7, 5, 5, 5 | Suburbs (S/M cities) |
| Professional services | 0.7 | 2–4 | 7, 7, 5, 6, 7 | Financial |
| Hotel & hospitality | 2.5 | 5–7 | 6, 6, 5, 5, 4 | Waterfront, Downtown |

**Business names:** {prefix} {type}.
- Prefixes: Northline, Maple, Riverside, Summit, Harbour, Golden Prairie, Blue Spruce, Ironwood, Lakeside, Cedar, Union, Granite, Bright Path, Old Mill, Copper Kettle, Westbrook.
- Types match the sector: Bakery, Café, Logistics, Dental, Construction, Brewing Co., Auto Repair, Design Studio, Clinic, Outfitters, Farms, Robotics, Hotel, Law Group.

## 22. Incidents
Implemented in `src/data/incidents.ts` (texts and options) and `src/data/incidentParams.ts` (numbers).

Default cooldown: 8 weeks per scope. Branch cases go to a manager trusted with Branch troubles; company and city cases to a COO trusted with Company troubles (§17.2), except those marked **yours** below (EXEC_POACHED, BANK_RUN, RECAP_OFFER), which always reach you. `penaltyWeeks` on an option is how a delegated decider values its non-cash effects, in weeks of revenue.

| id | Scope | Weekly base p | Condition / multiplier | Options (cost → effect) |
|---|---|---|---|---|
| ROBBERY | branch | 0.0015 | × (6 − vault.security)/3 | Upgrade vault (50% of next-tier price → morale +5) · Paid leave ($2k × staff → morale +10) · Business as usual (morale −15, Branch −0.3 for 8 wk). Loss: $20k–150k ÷ security, 80% insured. |
| ATM_SKIM | branch with ATM | 0.002 | × (1.3 − fraudShield/10) | Refund customers ($5k–40k) · Replace firmware ($15k; p ×0.5 for 26 wk) · Deny liability (Service −0.4 for 8 wk; 30% news) |
| DATA_BREACH | company | 0.002 | × (1 + 2(1 − itCov′)) × (1.2 − CTO expertise/100) | Notify + credit monitoring ($15 × affected; Overall −0.1 for 4 wk) · Quiet fix (40% discovered → fine 2% of annual revenue, Overall −0.4 for 12 wk, news) · Forensic firm ($500k; breach p −50% for 52 wk) |
| MIS_SELLING | branch | 0.001 | × signup level × (1.6 − ethics/100) × (appetite ≥ 4 ? 1.5 : 1) | Fire manager + compensate ($ = 2% of branch deposits ÷ 10) · Compensate only · Deny (40% fine of 5× compensation; news) |
| REGULATOR_AUDIT | company | quarterly (§15) | fail only | Pay fine · Appeal (50%: fine ×0 or ×1.5) · Hire consultants ($ = 0.5 × fine; Risk coverage +0.2 for 26 wk) |
| VIRAL_COMPLAINT | branch | 0.01 | Service < 2.5 | Public apology + fix ($10k; Service +0.2) · Ignore (awareness −0.05; 30% news) |
| EXEC_POACHED | company | §17.2 | per exec | Counter-offer (+25% salary, loyalty +10) · Let them go |
| BRANCH_FLOOD | branch | 0.0005 | Waterfront ×3 | Fast repair ($80k; closed 1 wk) · Slow repair ($30k; closed 4 wk) |
| BANK_RUN | company | §13.8 | — | Central bank window (liquidity +; stigma) · Raise savings rates +1.0pp everywhere for 8 wk · Public statement (success 30% + 5% per CR point above 8%; success ends the run) |
| CARD_FRAUD | company with cards | 0.0015 | × (1.3 − fraudShield/10) | Absorb losses (0.5% of card balances) · Freeze cards 1 wk (card take-up −50% for 4 wk) · Open Credit Bureau (switch model) |
| STAFF_WALKOUT | branch | 0.03 | morale < 25 | Raise wages 10% · Bonus $1,000 per staff (morale +20) · Wait it out (closed 1 wk, then morale +10) |
| DIVIDEND_DUE | company | 3 weeks before payment | info | OK |
| PRICE_WAR | city | §18.6 | — | Match (+0.15pp savings at all branches in the city) · Hold |
| BIG_DEFAULT | branch | business default ≥ $500k | info | OK |
| INSIDER_PROBE | personal | §22 | — | Settle (fine) · Fight (50%: cleared, or fine ×2 and news) |
| REGULATOR_LETTER | company | on entering Restricted | info | OK (shows how to raise capital) |
| RECAP_OFFER | company | §15 | — | Accept recapitalisation · Decline (takeover risk) |

## 23. Ledger headline templates
Tokens are in {braces}. Write 2–4 variants per type in code. The full set lives in `src/data/ledgerTemplates.ts`, `ledgerTemplatesRivals.ts`, `ledgerTemplatesWorld.ts`, `ledgerTemplatesGlobe.ts` (§23.1 World desk: 35 beats) `ledgerTemplatesGlobeMore.ts` (26 more World desk beats), `ledgerTemplatesDesk.ts` (§23.2 company desk, §23.3 Money Column, §23.4 elections) and `ledgerTemplatesCalendar.ts` (§23.5 commodities, §23.6 world calendar, §23.7 the archive); the fictional leagues, parties and policies are in `src/data/newsWorld.ts`, and the World desk's beat rules (country, months, phase, condition, number ranges), share-move reasons by sector and launch products in `src/data/newsWorldBeats.ts` (and `newsWorldBeatsMore.ts` with its invented book, game, show, species, dish and record names); commodities in `src/data/commodities.ts`; the Nations Cup and World Games nations, fixtures, prize fields and films in `src/data/worldCalendar.ts`. Every place, person and company in them is invented or a game city.

| Type | Headline | Body |
|---|---|---|
| NEW_BRANCH | New branch: {bank} opens in {district}, {city} | {bank} opened a branch at {address} this week. |
| CB_HOLD | {cb} holds its rate at {rate} | At last week's meeting the {cb} kept its policy rate at {rate}. GDP grew {gdp}% last quarter; it expects {fc}% this quarter. |
| CB_RAISE / CB_CUT | {cb} {raises\|cuts} rate to {rate} | The {cb} moved its policy rate by {bp} basis points to {rate}, citing inflation of {infl}% and growth of {gdp}%. |
| EARNINGS | {company} revenue {rises\|falls} {pct}% | {company} reported quarterly revenue of {rev}, {up\|down} {pct}% from the previous quarter. |
| DIVIDEND | {company} pays quarterly dividend | {company} declared a cash dividend of {dps} ({yield}) per share for {quarter}. |
| EXEC_RESIGN | {company} {title} resigns | {name} stepped down as {title} of {company}, effective immediately. |
| CONVENTION | {event} comes to {city} | Founders and investors gather in {city} next week. Find the convention on the map to attend. |
| FASTEST_GROWING | The fastest growing banks of {year} | {bank} tops this year's list after growing assets {pct}%. |
| RICH_LIST | {name} enters the rich list at #{rank} | The {bank} founder's fortune is estimated at {worth}. |
| REG_FINE | Regulator fines {bank} {amount} | The penalty follows {reason}. |
| BANK_FAILURE | Regulators seize {bank} | {bank}'s {n} branches will be offered to buyers. |
| HOUSING | {city} home prices {rise\|fall} {pct}% over the year | Analysts point to {reason}. |
| AUCTION_PREVIEW | Coming to {house}: {item} | Estimate {estimate}. Bidding opens {date}. |
| SPORTS | {club} finish {pos} in the {league} | {club} closed the season with a record of {record}. |
| IPO | {bank} lists at {price} a share | Shares opened {pop}% above the offer price. |
| MERGER | {acquirer} to acquire {target} for {amount} | The deal adds {n} branches across {cities}. |
| WINDOW_USE | {bank} taps emergency central bank funding | The bank borrowed from the {cb}'s standing facility this week. |
| BREACH | {bank} discloses data breach | About {n} customers may be affected. |
| BIG_DEFAULT | {business} defaults on {amount} loan | The {sector} business owed {bank} {amount}. |
| POLITICS | {country} government proposes {policy} | The proposal would {effect} if passed. |
| FILLER_MARKET | Markets {rally\|slide} as {sector} stocks {rise\|fall} | The index moved {pct}% this week. |

## 24. Review card templates

Pick by category and sentiment. Use campaign-specific lines when the campaign is active.

- **Rates +**
  - "Best savings rate in town. Moved everything over."
  - "Got a better mortgage rate here than my parents' bank."
- **Rates −**
  - "Their mortgage rate is way above the bank across the street."
  - "Twelve bucks a month for chequing? Pass."
- **Service +**
  - "In and out in five minutes. Teller remembered my name."
  - "My advisor actually explained everything."
- **Service −**
  - "Forty minutes in line for a deposit."
  - "Nobody at the desk for ages."
- **Branch +**
  - "Feels like a proper bank. Marble floors and all."
  - "Bright, clean, quiet. Nice place to sign a mortgage."
- **Branch −**
  - "Looks like it hasn't been redone since the 90s."
  - "The ATM ate my card. Again."
- **Products +**
  - "Finally a card with decent cashback."
  - "They had exactly the account my business needed."
- **Products −**
  - "No student account? Come on."
  - "Couldn't get a line of credit here."
- **Campaigns:**
  - Lobby coffee: "Free espresso while I signed my mortgage papers? Fine, you win."
  - Charging station: "Charged my phone while I waited. Small thing, big difference."
  - Saturday hours: "Open Saturday mornings. Thank you!"
  - Sign-up bonus: "Came for the $300 bonus. Might stay."
  - Money workshops: "The money workshop helped me finally make a budget."

## 25. Advisor lines (contextual)

Fill these per panel and state.

- **Branch manager:**
  - "Morning, boss. Drawers are balanced and the coffee's on."
  - Busy: "We're slammed. The line's out the door."
  - Quiet: "Quiet week. Want to sharpen our rates?"
  - Low morale: "The team's frustrated about pay."
- **Storefront for lease:**
  - "{traffic: Foot traffic is heavy / steady / light here}, {rent: and the rent's steep / fair / cheap}."
  - Plus a demographic hint ("lots of researchers nearby").
- **Office for lease:** "Plenty of desks here. We can bring more teams in-house."
- **HQ floors** (coverage ≥ 1 / short):
  - Finance: "Books are closed on time." / "We're short on finance staff. Statements are running late."
  - Treasury: "Liquidity's healthy." / "We're paying up for funding without more hands."
- **Rival branch:** "This is {rival}'s branch. Their savings rate is {x}; ours is {y}."
- **Rival HQ:** "Welcome to {rival}. We lend to businesses — even competitors."
- **Central bank:** "The governor's office. Rates are on everyone's mind."
- **Investment bank:** "Welcome to {name}. Raising capital or buying a competitor?"
- **Credit bureau:** "Better data, fewer defaults. What can we score for you?"
- **Employer:** "{n} people work here, and their payroll needs a bank."
- **Airport:** "Welcome to {airport}. Where are we headed?"
- **Auction house:** "Exceptional pieces this season. Buying or selling?"
- **Car dealer:** "Our finest machines. Something for the weekend?"
- **Convention:** "Founders everywhere. Let's find the next big thing."
- **University:** "Our graduates would love to join a growing bank."
- **Lobbying firm:** "Policy is a long game. What would you like changed?"
- **Marketing agency:** "Let's put your name on every billboard in town."
- **Sports franchise:** "Fans, a stadium, and a lot of payroll. Interested?"
- **Vacation home:** "A place to get away from it all — bought with your own money."

## 26. Name pools

- **First names:** Avery, Malik, Sofia, Kenji, Amara, Liam, Priya, Mateo, Chloé, Tariq, Hannah, Diego, Mei, Oluwaseun, Freya, Arjun, Isabel, Noah, Zainab, Lucas, Yuki, Elena, Kwame, Grace, Rafael, Aisha, Oscar, Leila, Dmitri, Nora, Santiago, Ingrid, Hamza, Camille, Ethan, Sakura, Omar, Bianca, Theo, Imani.
- **Last names:** Bennett, Okafor, Laurent, Tanaka, Haddad, Novak, Fraser, Mendes, Kowalski, Singh, Achebe, Moreau, Lindqvist, Park, Delgado, Whitfield, Nakamura, Osei, Brennan, Rossi, Chen, Abara, Duval, MacLeod, Petrov, Ahmed, Sorensen, Kaur, Ibarra, Gallagher, Hoffmann, Mensah, Calloway, Ferreira, Varga, Kimura, Nwosu, Ashford, Castillo, Holm.
- **Investor and fund names:** Hardwick Capital, Wren & Lowe, Saltmarsh Ventures, Northgate Partners, Lindenhall Fund, Bluewater Equity, Corbel Asset Management, Fenwick Family Office.
