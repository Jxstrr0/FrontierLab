# Data Model & Saves

TypeScript shapes for `src/sim/state.ts` and `src/data/*`. These are a guide: refine names as you build, but keep this doc in sync. Everything in `GameState` is plain JSON (no classes, Maps or functions), so it serializes directly.

---

## 1. Primitives

```ts
export type Id = string;            // prefixed: 'br_12', 'lot_tor_0042', 'rv_harbourline', 'emp_cal_3'
export type Money = number;         // currency units (float)
export type Rate = number;          // decimal annual, 0.0325 = 3.25%
export type Week = number;          // weeks since game start (0-based)
export type Stars = number;         // 1.0–5.0
export type Score = number;         // 0–100 (skill, morale, health)
export type Pct = number;           // 0–1
export type CountryId = 'CA'|'US'|'UK'|'EA'|'CH'|'JP'|'AU'|'SG'|'HK';
export type SegmentId = 'STU'|'YP'|'FAM'|'RET'|'BIZ';
export type SegmentMix = Record<SegmentId, number>;           // sums to 1
export type CategoryId = 'deposits'|'lending'|'cards';
export type DistrictId = 'financial'|'downtown'|'midtown'|'university'|'suburbs'|'industrial'|'waterfront';
export type DeptId = 'finance'|'hr'|'products'|'treasury'|'marketing'|'it'|'risk'|'executive'|'investment';
export type Phase = 'expansion'|'slowdown'|'recession'|'recovery';
export type Tier = 'strong'|'adequate'|'watch'|'restricted'|'critical';
export type Pentagon = [number, number, number, number, number]; // 1–10; axis order documented per use
```

## 2. Root state

```ts
export interface GameState {
  schemaVersion: number;              // bump on any shape change + add migration
  meta: { saveName: string; bankName: string; monogram: string; brandInk: string;
          founderName: string; founderAvatar: AvatarSpec; seed: number; startDate: string; createdWith: string };
  clock: { day: number; week: Week; speed: 0|1|2|4; pausedReason?: string };
  rng: Record<string, number[]>;      // sfc32 state per stream name
  settings: Settings;
  world: World;
  company: Company;
  branches: Record<Id, Branch>;
  offices: Record<Id, Office>;
  departments: Record<DeptId, Department>;
  people: People;
  products: ProductsState;
  underwriting: UnderwritingState;
  treasury: Treasury;
  partnerships: Record<Id, Partnership>;
  loanDesk: { applications: Record<Id, LoanApplication>; loans: Record<Id, BusinessLoan> };
  rivals: Record<Id, RivalBank>;
  market: MarketState;
  ventures: Record<Id, Startup>;
  realEstate: Record<Id, Property>;
  reo: Record<Id /*cityId*/, ReoPool>;
  governance: Governance;
  personal: Personal;
  events: { log: GameEvent[]; scheduled: ScheduledEvent[]; incidents: Incident[]; cooldowns: Record<string, Week> };
  news: { issues: LedgerIssue[] };   // last 52
  history: { weekly: WeeklySnapshot[]; quarterly: QuarterReport[] };   // weekly: keep 260
  milestones: Record<string, Week>;  // id → week achieved
  flags: { tutorialStep?: number; gameOver?: 'takeover'|'insolvency' };
}
```

## 3. World

```ts
export interface World {
  currentCityId: Id;
  countries: Record<CountryId, CountryState>;
  cities: Record<Id, CityState>;
  lots: Record<Id, Lot>;              // all cities; generated lazily on first visit (seeded)
  travel: { kmThisWeek: number; totalKm: number; flights: number; faresPaid: Money };   // Stage 8; flights are instant
}
export interface CountryState {
  id: CountryId; phase: Phase; weeksInPhase: number;
  gdp: number; inflation: number; unemployment: number; hpi: number; cre: number;
  policyRate: Rate; termPremium: Rate; gdpHistory: number[]; lastDecision?: { week: Week; change: Rate };
  capitalBufferAdj: Rate;            // politics/lobbying modifiers (pp)
}
export interface CityState {
  id: Id; generated: boolean; brandAwareness: Pct; marketRef: Record<string /*productId*/, number>;
  layout?: 1 | 2;   // map layout version: 1 = the original shared grid (cities generated before schema 11), 2 = per-city looks (ART_DIRECTION §2.1); missing = 1
}
export interface Lot {
  id: Id; cityId: Id; tile: { x: number; y: number }; district: DistrictId;
  kind: 'storefront'|'office'|'building'|'special';
  special?: 'centralBank'|'rivalHq'|'investmentBank'|'creditBureau'|'agency'|'lobby'|'convention'
          |'university'|'employer'|'autoDealer'|'auctionHouse'|'stadium'|'airport'|'vacationHome';
  specialRef?: Id;                    // e.g. rival id, employer id
  footTraffic: number; mix: SegmentMix; incomeIndex: number; homeownerShare: Pct;
  weeklyRent?: Money; deposit?: Money; sqm?: number; askingPrice?: Money; floors?: number;
  occupant?: { type: 'player'|'rival'; id: Id };
  buildingSeed: number;               // drives procedural art
}
```

## 4. Company, branches, books

```ts
export interface Company {
  cash: Money; paidInCapital: Money; sharesOutstanding: number; listed: boolean; ticker?: string;
  sharePrice: Money; sentiment: number; privateRounds: number; lastRoundWeek?: Week;
  corporateDebt: CorporateLoan[]; creditLine?: { lenderId: Id; limit: Money; drawn: Money; rate: Rate };
  taxPayable: Money; taxLossCarry: Money; dividendsPayable: Money;
  goodwill: Money; intangibles: Money; fixedAssets: FixedAsset[];
  tier: Tier; tierWeeks: number; capitalRatio: number; liquidityRatio: number;
  appRating: Stars; riskAppetite: 1|2|3|4|5; applyRatesToAll: boolean; companyPrices: Record<string, number>;
}
export interface FixedAsset { id: Id; kind: 'fitout'|'equipment'|'officeFitout'; cost: Money; lifeWeeks: number; ageWeeks: number; ownerId: Id }

export interface Branch {
  id: Id; cityId: Id; lotId: Id; name: string; openedWeek: Week; status: 'fitout'|'open'|'closed';
  build: { exterior: Id; lobby: Id; teller: Id; vault: Id; atm: Id; ages: Record<string, number> };
  lease: { weeklyRent: Money; deposit: Money };
  staff: { count: number; target: number; wage: number; skill: Score; morale: Score; quitAccumulator: number };
  managerId?: Id;
  delegation: { staffing: boolean; products: boolean; marketing: boolean; troubles: boolean; loans: boolean };
  awareness: Pct; grandOpeningWeeksLeft: number;
  ratings: { rates: Stars; products: Stars; service: Stars; branch: Stars; overall: Stars; reviewCount: number };
  reviewCards: ReviewCard[];          // max 8
  offered: Record<string /*productId*/, { on: boolean; price: number }>;
  books: Record<string /*productId*/, Book>;
  campaigns: Record<string /*campaignId*/, number /*level, 0 = off*/>;
  signupChurn: { mult: number; weeksLeft: number };
  customers: number; waitIndex: number; capacity: number;
  pnl: BranchPnl[];                   // last 52 weeks, newest last
}
export interface Book {
  accounts: number; balance: Money; bookRate: Rate; pd: Rate; lgd: Pct;
  last: { newAccounts: number; newVolume: Money; deltaAccounts: number; churned: number; defaulted: Money };
}
export interface BranchPnl {
  week: Week; revenue: Money; income: Money;
  lines: Record<'loanInterest'|'fundingCredit'|'fees'|'wealthServices'|'depositInterest'|'fundingCharge'
              |'losses'|'staff'|'manager'|'rent'|'marketing'|'equipment'|'servicing'|'overhead', Money>;
}
export interface ReviewCard { week: Week; category: 'rates'|'products'|'service'|'branch'; stars: number; text: string; portraitSeed: number }
```

## 5. HQ, people, products, underwriting

```ts
export interface Office { id: Id; cityId: Id; lotId: Id; floors: (DeptId | null)[]; desksPerFloor: 24|32; weeklyRent: Money; deposit: Money }
export interface Department {
  id: DeptId; staff: number; desks: number; target: number; salary: Money;
  skill: Score; morale: Score; coverage: number; coverageEff: number; quitAccumulator: number;
}
export interface People {
  managers: Record<Id, Manager>; execs: Record<Id, Exec>;
  managerCandidates: Manager[]; execCandidates: Record<string /*role*/, Exec[]>; candidatesRefreshWeek: Week;
  benefits: Record<string /*benefitId*/, number /*control value*/>;
}
export interface Manager { id: Id; name: string; portrait: AvatarSpec; skills: { people: Score; product: Score; marketing: Score; ethics: Score }; salary: Money; sinceWeek: Week; branchId?: Id }
export interface Exec {
  id: Id; role: 'COO'|'CFO'|'CPO'|'CMO'|'CTO'|'CRO'; name: string; portrait: AvatarSpec;
  skills: { leadership: Score; expertise: Score; loyalty: Score }; salary: Money; hiredWeek: Week;
  delegation: Record<string, boolean>; grants: Grant[];
}
export interface Grant { id: Id; kind: 'option'|'rsu'; shares: number; strike?: Money; grantWeek: Week; vestWeeks: 208 }
export interface ProductsState {
  catalog: Record<Id, ProductDef>;    // base + developed variants
  developments: Development[];
}
export interface ProductDef {
  id: Id; name: string; base: string; category: CategoryId; templateId?: string; tier?: 'low'|'medium'|'premium';
  stars: Stars; developed: boolean;   // full numeric fields come from data + template modifiers
}
export interface Development {
  id: Id; name: string; templateId: string; tier: 'low'|'medium'|'premium';
  weeks: 4|8|12|24|48; weeklyBudget: Money; spent: Money; progressWeeks: number; odds: number[]; // [1★..5★]
}
export interface UnderwritingState {
  activeModelId: Id; switchingTo?: { id: Id; weeksLeft: number };
  models: Record<Id, { id: Id; name: string; source: 'bureau'|'custom'; mix: Record<string, number>; radar: Pentagon; costPerApp: Money }>;
  loansBooked: number;
}
```

## 6. Treasury, partnerships, Loan Desk

```ts
export interface Treasury {
  reserves: Money; bondsMarket: Money; bondsBook: Money; bondBookYield: Rate;
  liqTarget: Pct; bondShare: Pct; autoFunding: boolean; freeze: boolean;
  lots: FundingLot[]; offers: FundingOffer[]; offersRefreshWeek: Week;
  overnight: Money; window: Money; windowStigmaWeeks: number;
}
export interface FundingLot { id: Id; type: string; counterparty: string; amount: Money; rate: Rate; startWeek: Week; maturityWeek: Week; radar: Pentagon }
export interface FundingOffer extends Omit<FundingLot, 'startWeek'|'maturityWeek'> { termWeeks: number; expiresWeek: Week }

export interface Partnership {
  id: Id; employerId: Id; cityId: Id; hostBranchId: Id; packageProductId: string;
  startWeek: Week; lengthWeeks: number; fee: Money; health: Score; lowHealthWeeks: number;
  balance: Money; accounts: number; status: 'active'|'terminating'|'lapsed'; runoffWeeksLeft?: number;
}
export interface LoanApplication {
  id: Id; branchId: Id; business: string; sector: string; amount: Money; termWeeks: number;
  collateral: 'none'|'partial'|'full'; maxRate: Rate; pentagon: Pentagon; // Mgmt, Track, Market, Comp, FinHealth
  hiddenPd: Rate; lgd: Pct; createdWeek: Week; expiresWeek: Week;
}
export interface BusinessLoan {
  id: Id; branchId: Id; business: string; sector: string; principal: Money; balance: Money;
  rate: Rate; pd: Rate; lgd: Pct; termWeeks: number; weeksLeft: number; status: 'current'|'defaulted'|'repaid';
}
```

## 7. Rivals, markets, ventures, real estate

```ts
export interface RivalBank {
  id: Id; name: string; strategy: 'incumbent'|'disruptor'|'premium'|'community'; ink: string; monogram: string;
  cities: Id[]; branches: RivalBranch[]; cash: Money; equity: Money; capitalRatio: number;
  listed: boolean; ticker?: string; shares: number; price: Money; execs: { title: string; name: string }[];
  status: 'active'|'distressed'|'seized'|'acquired'; priceLags: Record<string, { target: number; weeksLeft: number }>;
}
export interface RivalBranch {
  id: Id; lotId: Id; openedWeek: Week; quality: [Stars, Stars, Stars, Stars]; // rates, products, service, branch
  prices: Record<string, number>; deposits: Money; loans: Money; reviewCount: number; negativeWeeks: number;
}
export interface MarketState {
  companies: Record<Id, ListedCompany>; index: number;
  holdings: { company: Record<Id, Holding>; personal: Record<Id, Holding> };   // key: company id or 'self'
}
export interface ListedCompany {
  id: Id; ticker: string; name: string; sector: string; exchange: string; price: Money; shares: number;
  eps: number; growth: number; vol: number; beta: number; divYield: number;
  history: number[]; /* weekly closes, last 260 */ high52: Money; low52: Money;
  topHolders: { name: string; pct: number }[]; quarterlyRevenue: number[];
}
export interface Holding { shares: number; avgCost: Money }
export interface Startup {
  id: Id; name: string; sector: string; description: string; founded: string; ceo: { name: string; portrait: AvatarSpec };
  pentagon: Pentagon; stage: 'seed'|'A'|'B'|'C'|'D'|'public'|'acquired'|'failed';
  shares: number; postMoney: Money; cash: Money; quarters: { revenue: Money; netIncome: Money }[];
  round?: { name: string; pricePerShare: Money; lots: { shares: number; pct: number; price: Money; taken?: 'company'|'personal' }[]; closesWeek: Week };
  history: { round: string; amount: Money; week: Week }[]; holders: { name: string; shares: number }[];
  ventureDebt?: { balance: Money; rate: Rate; weeksLeft: number };
  seenAt: 'pipeline'|'convention'; conventionId?: Id;
}
export interface Property {
  id: Id; cityId: Id; lotId: Id; owner: 'company'|'personal'; sqm: number; purchasePrice: Money;
  value: Money; rent: number; marketRent: number; occupancy: Pct; forSale: boolean; saleWeek?: Week;
}
export interface ReoPool { units: number; value: Money; mode: 'hold'|'rent'|'selling'; sellWeek?: Week }
```

## 8. Governance, personal, events, news

```ts
export interface Governance {
  lastBoardWeek?: Week; dividendPerShare: Money; ceoSalary: Money;
  pendingDividend?: { perShare: Money; total: Money; payWeek: Week };
}
export interface Personal {
  cash: Money; shares: number /* own bank */;
  homes: { id: Id; homeId: string; price: Money; value: Money; rebuildDoneWeek?: Week }[];
  cars: { id: Id; carId: string; price: Money; value: Money }[];
  collectibles: { id: Id; itemId: string; price: Money; value: Money; genuine: boolean; appraised: boolean; consigned?: boolean }[];
  jet?: { model: string; value: Money; price: Money; boughtWeek: Week };
  franchise?: { clubId: string; owner: 'company'|'personal'; value: Money; kitSponsor: boolean; payroll: Money; position?: number };
  richListRank?: number; insiderFlags: Week[];
}
export interface GameEvent { week: Week; type: string; scope?: Id; payload: Record<string, unknown>; priority: number }
export interface ScheduledEvent { day: number; type: string; payload: Record<string, unknown> }
export interface Incident { id: Id; type: string; scope: Id; createdWeek: Week; options: { id: string; label: string; cost: Money }[]; resolved?: string }
export interface LedgerIssue { week: Week; date: string; articles: { tab: string; icon: string; headline: string; body: string; priority: number }[] }
export interface WeeklySnapshot {
  week: Week; revenue: Money; netIncome: Money; cashFlow: { ops: Money; investing: Money; financing: Money; net: Money };
  totals: { assets: Money; deposits: Money; loans: Money; equity: Money; rwa: Money };
  pnl: Record<string, Money>; delayed: boolean;
}
export interface QuarterReport { year: number; q: 1|2|3|4; revenue: Money; netIncome: Money; eps: number; roe: number }
export interface Settings {
  currency: '$'|'C$'|'£'|'€'|'¥'; units: 'km'|'mi'; weeklyResults: 'weekly'|'quarterly'|'off';
  defaultSpeed: 1|2|4; autoPauseIncidents: boolean; autoPauseApplications: boolean;
  sound: boolean; reducedMotion: boolean; textScale: 1|1.15|1.3; layers: Record<string, boolean>;
}
export interface AvatarSpec { head: number; hair: number; facial: number; glasses: number; attire: number; tone: number; shade: number }
```

## 9. Static data shapes (`src/data`)
- Each table in CONTENT.md becomes a typed `const` array or record, e.g. `PRODUCTS: ProductSpec[]`, `EQUIPMENT`, `CAMPAIGNS`, `CITIES`, `DISTRICTS`, `RIVALS`, `FUNDING_TYPES`, `DATA_INPUTS`, `BUREAU_PACKAGES`, `EMPLOYER_TYPES`, `COMPANIES`, `STARTUPS`, `CONVENTIONS`, `HOMES`, `CARS`, `JETS`, `COLLECTIBLES`, `FRANCHISES`, `INCIDENTS`, `HEADLINES`, `REVIEWS`, `ADVISOR_LINES`, `NAMES`.
- Static data never goes in saves. Saves store ids that reference it.

## 10. Saves

- **localStorage keys** (all written by `src/sim/save/storage.ts`; the names are fixed so existing saves keep loading):
  - `vaultstreet.save.{slot}` and `vaultstreet.meta.{slot}` for slots `auto` (written each weekly tick), `1`, `2`, `3`: the compressed game and its slot card
  - `vaultstreet.prefs` (settings also live inside each save; this key holds title-screen prefs)
  - `vaultstreet.tutorialSeen`
- **Format:** `JSON.stringify(state)`, compressed with lz-string `compressToUTF16` for localStorage.
- **Export code:** `"VS" + schemaVersion + ":" + compressToEncodedURIComponent(json)`. Offer copy-to-clipboard and `navigator.share` when available.
- **Import:**
  1. Parse the prefix.
  2. Decompress.
  3. Run migrations from that version to current (`migrations[v](state) → state` for each step).
  4. Validate the required keys.
  5. Reject codes from a newer version with a clear message.
- **Size budget:** keep a late-game save under 2 MB uncompressed by:
  - trimming histories (weekly snapshots 260, Ledger issues 52, review cards 8, pnl 52)
  - not storing generated lots for unvisited cities
- **Quota errors:** caught; the UI says "Storage full — export your save" and the toast carries an Export save button that opens the Save game panel. If the card can't be written after the data was, the old data is put back.
- **Checksum:** each slot card stores `checksum` (cyrb53 of the compressed data). Loading refuses a slot whose data doesn't match ("That save is damaged…"). Cards written before v12 have none and load as before.

## 11. Commands (player actions)
One function per action in `src/sim/commands/`. Each returns `{ ok: true } | { ok: false, reason: string }`. The UI shows `reason` verbatim.

| Area | Commands |
|---|---|
| Game | `newGame`, `travelTo` (speed is UI clock state, `setSpeed` in `src/app/loop.ts`) |
| Branches | `buildBranch` (leases and builds in one step), `renameBranch`, `closeBranch` |
| Products and pricing | `setOffered`, `setPrice`, `setApplyRatesToAll`, `setCompanyPrice` |
| Branch staff and marketing | `setStaffTarget`, `setWage`, `hireManager`, `fireManager`, `setManagerSalary`, `setDelegation`, `setCampaignLevel` |
| Loan Desk | `decideApplication(id, 'approve', rate)`, `declineApplication` |
| Offices and departments | `leaseOffice`, `addFloor`, `releaseFloor`, `setDeptTarget`, `setDeptSalary`, `setBenefit` |
| Products floor | `startDevelopment`, `cancelDevelopment`, `deleteProduct`, `setRiskAppetite`, `buyBureauModel`, `commissionBureauModel`, `saveCustomModel`, `activateModel` |
| Treasury | `setTreasuryPolicy`, `borrowOffer`, `repayLot`, `transferToTreasury`, `borrowWindow`, `repayWindow` |
| Partnerships and partners | `signPartnership` (payroll or student), `renewPartnership`, `releasePartnership`, `startGradProgram`, `endGradProgram`, `signDealerDeal`, `endDealerDeal` |
| Marketing and lobbying | `startBrandCampaign`, `buyAgencyPackage`, `startLobbying` (was `lobby`) |
| Corporate borrowing | `acceptCorporateLoan`, `repayCorporateLoan`, `drawCredit`, `repayCredit` |
| Capital markets | `trade(account, securityId, shares)`, `privatePlacement(bankId, pct)`, `launchIpo(bankId, floatPct)`, `secondaryOffering(bankId, pct)`, `offerMerger(rivalId, pricePerShare)` |
| Investments and property | `buyStartupLot` (was `investInRound`), `offerVentureDebt`, `offerProperty` (was `buyProperty`), `setPropertyRent`, `setPropertyForSale`, `setReoMode`, `tradeFx` |
| Governance and executives | `holdBoardMeeting(dividendPerShare, ceoSalary)`, `hireExec(seat, candidateId)`, `fireExec`, `setExecSalary`, `setExecDelegation`, `addGrant(seat, type, shares, strike)`, `setGrowthCity(cityId, on)`, `cooOpenBranch(cityId)` |
| Incidents | `resolveIncident(id, optionId)` |
| Personal | `offerHome`, `rebuildHome`, `sellHome`, `buyCar`, `sellCar`, `placeBid`, `clearBid`, `appraiseCollectible`, `consignCollectible`, `withdrawConsignment`, `buyJet`, `sellJet`, `buyClub`, `sellClub`, `setKit`, `setKitSponsor`, `signPlayer`, `releasePlayer` |
| Settings and saves | `setSettings`, `setFounderAvatar`; saves are not commands: `saveToSlot`, `loadFromSlot` (`src/sim/save/storage.ts`), `exportCode`, `importCode` (`serialize.ts`) |

## 12. Implemented so far (schema v21)

`src/sim/state.ts` is the source of truth; this section records how it differs from the guide above. Later stages add the rest with a schema bump and a migration.

- **Present (Stages 1–3):** `meta`, `clock`, `rng`, `settings`, `world` (one country and one city in Stage 1), `company`, `branches`, `people` (managers only), `products.catalog`, `underwriting`, `treasury`, `loanDesk`, `rivals`, `reo`, `events` (`log`, `scheduled`), `history`, `milestones`, `flags`.
- **Stage 4 (schema v5) adds:** `offices`, `departments`, `hq` (`ramp` and per-department `coverage`: `required`, `k`, `kPrime`, `eff`), `people.benefits`, `products.developments` and developed catalog entries, `underwriting.switching`, `treasury.lots`/`offers`/`offersRefreshWeek`, `marketing` (brand `campaigns`, agency `packages`, prestige `cityBonus`), `risk` (13 weeks of `losses` by product, regulator `reviews`), `world.officeListings` (office buildings for lease) and `world.sites` (credit bureaus and marketing agencies on the map). New P&L lines: `hqStaff`, `benefits`, `development`. Migration 4 → 5 adds them all and generates each city's listings and sites from the `sites:{cityId}` stream, so storefront lots don't move.
- **Stage 5 (schema v6) adds** (types in `src/sim/competitionTypes.ts`): `partnerships` (`Partnership`: site, kind payroll/student, host branch, package product, term, fee and `unamortized`, mini-book `balance`/`accounts`, `health`, `lowHealthWeeks`, `status` active/runoff), `corporateDebt` (`loans`, `lines` by lender, `offers`, `offersRefreshWeek`), `incidents` (`active` incidents with rolled `data` and `options`, `cooldowns` keyed `TYPE:scope`, timed `effects`, `bankRunWeeksLeft`, `recap`), `news` (`issues`: the last 52 Ledger issues; `lastTemplate` per subject), `competition.ratesStreak` (price wars), `company.gradProgram`, `CountryState.capitalBuffer`. `RivalBank` gains `equity`, `capitalRatio`, `listed`, `ticker`, `ceo`, `qtd`, `quarters`, `priceWar`, `distressedUntil`; `RivalBranch` gains `deposits`, `loans`, `contribution`, `negativeWeeks`. `SiteKind` adds `rivalHq`, `employer` and `university`; `Site.employer` holds employer details. New P&L lines `incidents`, `corporateInterest` and `amortization`. Every country now has a `CountryState`. Migration 5 → 6 fills all of it (rivals' books start mature) and seeds each city's new sites from the `sites5:{cityId}` stream. Event types and payloads are catalogued in `src/sim/eventCatalog.ts`. Optional fields (no migration needed): `NewsState.desk` (mid-week event cursor, open policy proposals, sports season records, polls, year-start asset marks), `LedgerArticle.ref` (template, subject and variant, for the no-repeat rule). `Partnership.fee` is the total of fees paid (signing plus renewals).
- **Stage 6 (schema v7) adds** (types in `src/sim/marketsTypes.ts`): `executives` (`seats` by ExecSeat with `Executive`: skills leadership/expertise/loyalty, salary, `delegations`, `grants` (`EquityGrant`: type, shares, strike, vested, exercised, expensed, fairValue); `candidates` per seat; `candidatesRefreshWeek`; `hadCto`), `governance` (`ceoSalary`, `dividendPerShare`, `lastBoardQuarter`/`lastBoardWeek`, `pendingDividend`, the last 8 `meetings`), `stock` (your bank: `status` private/public, `ticker`, `exchange`, `price`, `history`, `high52`/`low52`, `sentiment`, `holders` (the cap table, `Shareholder` kinds founder/fund/public/executive/regulator), `placements`, a pending `ipo`, `listedWeek`, `ipoPrice`, optional `ipoWithdrawn` and an event `scan` cursor), `market` (`companies`: `ListedCompany`; the `index` and `indexHistory`; this week's `shock`; `holdings.company`/`holdings.personal` keyed by company or rival id), `personal.cash`, `mergers` (`offers`, `integrations`, `deals`). `company.goodwill`; `Branch.converting` (`BranchConversion`: old bank id, name, ink, monogram, weeks left). `RivalBank` gains `shares`, `price`, `history`, `high52`, `low52`, `sentiment`, optional `dps` and `distressedAsk`. `SiteKind` adds `investmentBank`. New P&L lines: `execPay`, `grantExpense`, `integration`, `commissions` (opex) and `dividendIncome`, `investmentGains`, `acquisitionGain` (fee & other income); `grantExpense`, `investmentGains` and `acquisitionGain` are non-cash. The balance sheet adds company `investments` (holdings at market) and `goodwill` (assets) and `dividendsPayable` (liabilities). Migration 6 → 7 gives rivals share counts (starting equity ÷ $20) and prices, seeds each city's investment bank from the `sites6:{cityId}` stream, and starts the rest fresh with the founder holding every share. Your own shares bought personally move between the founder and public holders (no `holdings` entry for 'self').
- **Stage 7 (schema v8) adds** (types in `src/sim/investmentsTypes.ts`): `ventures` (`startups` keyed by id: `Startup` with sector, CEO, pentagon, stage, shares, `postMoney`, `lastPrice`, cash, `quarters` (revenue, net income, cash, debt), an open `round` with two `lots`, `history`, `holders` (company/personal/founder/fund, with `cost` for yours), `ventureDebt` (principal, balance, rate, weeks left, payment, `lender` company/personal), `seenAt` pipeline/convention, `listedCompanyId`, `exitPrice`; plus `pipeline`, `pipelineRefreshWeek` and `valueLog`), `conventions.runs` (`ConventionRun`: convention, city, year, start/end week, exclusive `startupIds`, `announced`, `opened`), `realEstate` (`properties` and `listings` keyed by site id; `listingsRefreshWeek` per city; `Property` has owner company/personal, sqm, purchase price, value, rent, market rent, occupancy, For Sale and `saleWeek`; a listing may carry `rejectedOffer`), `lobbying` (`campaigns`, `fastTrack`, `bufferRelief`, `blockBill`) and `fx` (`level` per country, `history` of rates against home, `positions.company`/`personal` with units and cost). `ReoPool` gains `mode` (hold/rent/selling), `sellWeek` and `hpiRef`. `SiteKind` adds `property`, `conventionCenter` and `lobbyingFirm`; `Site.property = { sqm, floors, occupancy? }`. New P&L lines: `ventureDebtInterest` (interest income), `rentalIncome`, `propertyGains` (fee & other income; propertyGains is non-cash) and `propertyCosts`, `lobbying` (opex). The balance sheet adds company `ventures`, `ventureDebt`, `realEstate` and `currencies`. Migration 7 → 8 adds the lines, gives REO pools a mode and price mark, seeds each city's buildings, convention centre and lobbying firm from the `sites7:{cityId}` stream, and starts the rest fresh (seed startups, conventions calendar, first listings). The New Game options add `currency` (display symbol).
- **Stage 8 (schema v9) adds:** `meta.homeCityId` (the start city: home central bank, tax, exchange), `world.travel` (`kmThisWeek`, `totalKm`, `flights`, `faresPaid`), `personal.jet?` (`model`, `value`, `price`, `boughtWeek`), the `travel` P&L line (opex: fares the bank paid), and `company.companyPrices` keyed by country (`{ CA: { savings: 0.031, … } }`). `CitySpec` gains `airport` and, for regional sites, `regional.employers`. Cities other than the start city are generated on first visit (`worldGen.generateCity`). Migration 8 → 9 records the home city (first branch's city, else the current city), starts travel fresh, adds the line and moves the old HQ price list under the home country.
- **Stage 9 (schema v10) adds** (types in `src/sim/personalTypes.ts`): `personal.empire` (`homes`: OwnedHome with price, value, `hpiRef`, `rebuildDoneWeek`; `cars`; `collectibles`: OwnedCollectible with house, price, value, hidden `genuine`, `appraised`, `appraisalWeek`, `consignedTo`; `richList` fortunes and rank; `insider.pending` cases), `auctions` (per house: `nextWeek`, `lots` with hidden authenticity and your max bid, `history`), `clubs` (every sports club: owner outside/company/personal, value, stars, otherPayroll, transfer `market`, `record`, `lastFinish`, `fanMood`, `kit`, `season` finances) and `dealerDeals` (by dealer site). `SiteKind` adds `autoDealer`, `auctionHouse` and `vacationHome` (stream `sites9:{cityId}`). New P&L lines: `franchiseRevenue` (fee & other income), `franchiseCosts` and `dealerFees` (opex). The balance sheet adds a company-owned club (`franchise`, risk weight 2.5), marked through investment gains. `netWorth(state)` sums the founder's cash, own stake, holdings and other assets. Migration 9 → 10 adds the lines, seeds every visited city's new buildings and starts the rest fresh.
- **Schema v11 adds** `CityState.layout` (1 | 2): which map layout a city uses. Layout 1 is the original shared street grid and bottom-edge shoreline; layout 2 is the city's own geography from `data/cityLooks.ts` (water form, district arrangement, big park). Migration 10 → 11 sets layout 1 on every city already generated, so their lots, offices, sites and picture never move; `worldGen.generateCity` sets layout 2. The derived geometry (water, street, bridge, park and frontage masks, fitted district centres) lives in `src/sim/cityGeo.ts`, cached per city and layout, and is never saved.
- **Schema v12 adds** (audit follow-up): `DeskWeek.arrived` (applications that arrived this week), `RivalBank.execs` (the CFO/COO/CRO bench: `{ title, name }[]`), `WeeklySnapshot.appRating` (for the IT floor's trend) and, optional, `Book.last.defaultedLoans` (business loans that defaulted in the week). `milestones` now fills (id → week reached). Migration 11 → 12 draws every rival's bench from the `rivalBench` stream, adds `arrived: 0` to every desk tally and records milestones already reached without news.
- **Schema v13 adds** (hands-off play): `executives.remembered` (per seat, the delegation toggles its last holder left; applied to the next hire), `executives.growthCities` (city id → true: where the COO's Expansion may build) and `executives.lastExpansionWeek` (-1 before the first COO build). `IncidentSpec.yours` and `NEW_BRANCH.by` ('coo') are data, not state. Migration 12 → 13 adds the three fields and switches every waiting candidate's delegations on (the new default).
- **Schema v14 adds:** `company.lastBuild` (optional `BuildSpec`: the fit-out of your last own build; the build sheet and the COO's Expansion start from it) and the CFO's `shares` delegation (Share sales, split out of Capital). Migration 13 → 14 sets a seated CFO's and the remembered CFO toggles' `shares` to their `capital`, switches it on for waiting CFO candidates, and fills `lastBuild` from the newest branch.
- **Schema v15 adds:** `company.guidance` (`{ deposits, loans }`, whole steps of the CFO and CRO's branch guidance), `executives.payPremium` (the COO's pay premium over market, default 0.05) and `executives.lastPayReviewWeek` (−1 before the first), plus the delegations `cfo.guidance`, `cro.guidance` and `coo.payReviews`. Migration 14 → 15 fills the fields and adds the new switches off for seated executives and remembered toggles (so nothing changes until you flip one) and on for waiting candidates. The RNG gains a `managerPoach` stream when first used.
- **Schema v16 adds** Russia (`RU`) and its cities Moscow and St Petersburg. `world.countries.RU` and `fx.level.RU`/`fx.history.RU` join the per-country records; Russia draws its cycle and currency from its own `macro:RU` and `fx:RU` streams (`CountrySpec.ownStream`). `CitySpec.density` (optional, data only) scales a city's foot traffic and customer pool. Migration 15 → 16 initialises Russia's economy (`initCountries`) and starts the ruble at the index start.
- **Schema v17 adds** `people.rerolls` (city id → paid manager rerolls since that pool's free refresh) and `executives.rerolls` (seat → paid rerolls since the pools' free refresh). Migration 16 → 17 starts both empty.
- **Schema v18 adds** `company.guidance.staffing`, `.marketing` and `.products` (the COO's, CMO's and CPO's branch guidance steps) and a `guidance` delegation on those three seats. Migration 17 → 18 starts the steps at 0 and the switches off for seated executives and remembered toggles (on for waiting candidates).
- **Schema v19 adds** `meta.houseStyle` (`'heritage' | 'deco' | 'modern' | 'garden' | 'civic'`, the branch fronts' house style chosen at New Game; a game started without one gets `HOUSE_STYLE_IDS[seed % 5]`). Migration 18 → 19 picks one from the seed the same way.
- **Schema v21 adds** `executives.payReviewCadence` (`'quarterly' | 'annual'`), `executives.moraleTarget` (70 / 80 / 90) and `executives.brandTarget` (0.4–0.7): the delegation dials. Migration 20 → 21 sets quarterly, 70 and 0.5, what the switches always did.
- **Schema v20 adds** `meta.logoShape` (`'round' | 'shield' | 'lozenge' | 'hex' | 'plaque' | 'rosette'`, the outline of the bank's mark chosen at New Game; `'round'` when none is chosen). Migration 19 → 20 sets `'round'`, so older banks keep the medallion they have always worn. The slot card record (`SaveMeta`) carries it too, optional for cards written before.
- **Not yet present:** nothing from the v1 plan.
- **Added fields:**
  - `ledger`: P&L lines and cash movements since the last weekly close, so commands between ticks land in the right week.
  - `nextId`: counter for generated ids.
  - `meta.difficulty` (`'easy' | 'normal' | 'hard' | 'expert'`), `meta.competitors` (1–5) and `meta.startCash` (schema v2; migration 1 → 2 fills Normal, the city's usual rival count and $750k, what every v1 game started with).
  - Schema v4 changes no shape: migration 3 → 4 moves lots onto tiles facing the Stage 3 street grid (lots already on frontage stay put).
  - The drawable city (streets, water, parks, landmarks, building heights) is not saved: `src/art/citygen.ts` regenerates it from the save seed, the city and its lots.
  - `Branch.desk` (`DeskWeek`: `week`, `arrived` (v12), `approved`, `refused`, `declined`, `expired`): this week's Loan Desk outcomes, reset when the week turns (schema v3; migration 2 → 3 adds an empty tally).
  - `company.negativeCashWeeks`, `company.lowCapitalWeeks`: counters for the game-over checks (schema v2).
  - `company.retainedEarnings`, `company.leaseDeposits` (an asset). `company.liquidityRatio` is `null` while there are no deposits.
  - `CountryState`: `hpiHistory`, `prevFtpShort`/`prevFtpLong` (to detect moves), `cardAnchor`, `startPolicy`, `feeIndex`, `marketReturn`, `forceRecessionAtWeek`.
  - `Lot.address`; `Branch.builtDay`, `Branch.last` (prospects, captured, served, share); `ReviewCard` unchanged.
  - `LoanApplication.estPd` (the noisy estimate behind the risk band); `BusinessLoan.payment`.
  - `QuarterReport.endWeek`; `WeeklySnapshot.netRevenue`, `capitalRatio`, `tier`, `totals.liquid`, `totals.taxPayable`.
  - `people.managerCandidates` and `candidatesRefreshWeek` are keyed by city.
- **Changed:** rival rate sheets live on `RivalBank.prices` (one sheet per bank), not per branch. `RivalBranch` carries `cityId` and `overall`.
- **Commands:** `leaseStorefront` is folded into `buildBranch`, which leases and builds in one step (DESIGN §7). Stage 1 also has `renameBranch`, `fireManager`, `setManagerSalary`, `setRiskAppetite`, `decideApplication` and `declineApplication`.
- **Products floor (schema 5, Stage 4):**
  - `ProductEntry` (not `ProductDef`): `id`, `stars`, `developed`, plus `name`, `base`, `templateId`, `tier`, `createdWeek` for developed products (ids `dev_N`). Full specs are built on demand by `src/sim/products.ts` (`productSpec`, `allProducts`).
  - `Development.progress` (nominal weeks) instead of `progressWeeks`, plus `startWeek`; ids `proj_N`.
  - Optional, absent until first used: `products.digitalDone` (completed digital templates), `company.companyOffered` (HQ lineup), `UnderwritingModel.hostedBy` (bureau-hosted custom models; ids `model_N`).
  - `UnderwritingState.switching = { fromId, weeksLeft }` (the old model blending out) instead of `switchingTo`; `activeModelId` is the new model from the moment you switch.
  - Commands: `startDevelopment`, `cancelDevelopment`, `deleteProduct` (`commands/development.ts`); `buyBureauModel`, `commissionBureauModel`, `saveCustomModel`, `activateModel` (`commands/underwriting.ts`); `setApplyRatesToAll`, `setCompanyPrice`, `setCompanyOffered` (`commands/products.ts`).
- **Saves:** `src/sim/save/serialize.ts` has `serialize`, `deserialize` (with migrations and a required-keys check), `checksum` (cyrb53) and `exportCode`/`importCode`. localStorage slots live in `src/sim/save/storage.ts` (§10).

