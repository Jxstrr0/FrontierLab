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
  travel: { totalKm: number; kmThisWeek: number; ownsJet: boolean; inFlight?: { from: Id; to: Id; arriveDay: number } };
}
export interface CountryState {
  id: CountryId; phase: Phase; weeksInPhase: number;
  gdp: number; inflation: number; unemployment: number; hpi: number; cre: number;
  policyRate: Rate; termPremium: Rate; gdpHistory: number[]; lastDecision?: { week: Week; change: Rate };
  capitalBufferAdj: Rate;            // politics/lobbying modifiers (pp)
}
export interface CityState {
  id: Id; generated: boolean; brandAwareness: Pct; marketRef: Record<string /*productId*/, number>;
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
  jet?: { model: string; value: Money };
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

- **localStorage keys:**
  - `vaultstreet:auto` (written each weekly tick)
  - `vaultstreet:slot1`, `vaultstreet:slot2`, `vaultstreet:slot3`
  - `vaultstreet:settings` (settings also live inside each save; this key holds title-screen prefs)
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
- **Quota errors:** catch them and show "Storage full — export your save" in the UI.
- **Quick check:** a save checksum (simple hash) stored alongside helps detect corruption.

## 11. Commands (player actions)
One function per action in `src/sim/commands/`. Each returns `{ ok: true } | { ok: false, reason: string }`. The UI shows `reason` verbatim.

| Area | Commands |
|---|---|
| Game | `newGame`, `setSpeed`, `travelTo` |
| Branches | `leaseStorefront`, `buildBranch`, `renameBranch`, `closeBranch` |
| Products and pricing | `setOffered`, `setPrice`, `setApplyRatesToAll`, `setCompanyPrice` |
| Branch staff and marketing | `setStaffTarget`, `setWage`, `hireManager`, `fireManager`, `setManagerSalary`, `setDelegation`, `setCampaignLevel` |
| Loan Desk | `decideApplication(id, 'approve', rate)`, `declineApplication` |
| Offices and departments | `leaseOffice`, `addFloor`, `releaseFloor`, `setDeptTarget`, `setDeptSalary`, `setBenefit` |
| Products floor | `startDevelopment`, `cancelDevelopment`, `deleteProduct`, `setRiskAppetite`, `buyBureauModel`, `commissionBureauModel`, `saveCustomModel`, `activateModel` |
| Treasury | `setTreasuryPolicy`, `borrowOffer`, `repayLot`, `transferToTreasury`, `borrowWindow`, `repayWindow` |
| Partnerships and partners | `signPartnership`, `renewPartnership`, `releasePartnership`, `signDealerFinancing`, `signUniversityProgram` |
| Marketing and lobbying | `startBrandCampaign`, `buyAgencyPackage`, `lobby` |
| Corporate borrowing | `takeCorporateLoan`, `repayCorporateLoan`, `drawCredit`, `repayCredit` |
| Capital markets | `trade(account, companyId, shares)`, `privatePlacement`, `launchIpo`, `secondaryOffering`, `offerMerger` |
| Investments and property | `investInRound`, `offerVentureDebt`, `buyProperty`, `setPropertyRent`, `setPropertyForSale`, `setReoMode` |
| Governance and executives | `holdBoardMeeting(dividendPerShare, ceoSalary)`, `hireExec`, `fireExec`, `setExecSalary`, `addGrant` |
| Incidents | `resolveIncident(id, optionId)` |
| Personal | `buyHome`, `rebuildHome`, `buyCar`, `placeBid`, `appraise`, `consign`, `buyJet`, `buyFranchise`, `setKit`, `signPlayer`, `releasePlayer` |
| Settings and saves | `updateSettings`, `saveToSlot`, `loadSlot`, `exportCode`, `importCode` |

## 12. Implemented so far (schema v4, Stage 3)

`src/sim/state.ts` is the source of truth; this section records how it differs from the guide above. Later stages add the rest with a schema bump and a migration.

- **Present:** `meta`, `clock`, `rng`, `settings`, `world` (one country and one city in Stage 1), `company`, `branches`, `people` (managers only), `products.catalog`, `underwriting`, `treasury`, `loanDesk`, `rivals`, `reo`, `events` (`log`, `scheduled`), `history`, `milestones`, `flags`.
- **Not yet present:** `offices`, `departments`, execs and benefits in `people`, product `developments`, funding lots and offers, `partnerships`, `market`, `ventures`, `realEstate`, `governance`, `personal`, `news`, incidents and cooldowns.
- **Added fields:**
  - `ledger`: P&L lines and cash movements since the last weekly close, so commands between ticks land in the right week.
  - `nextId`: counter for generated ids.
  - `meta.difficulty` (`'easy' | 'normal' | 'hard' | 'expert'`), `meta.competitors` (1–5) and `meta.startCash` (schema v2; migration 1 → 2 fills Normal, the city's usual rival count and $750k).
  - Schema v4 changes no shape: migration 3 → 4 moves lots onto tiles facing the Stage 3 street grid (lots already on frontage stay put).
  - The drawable city (streets, water, parks, landmarks, building heights) is not saved: `src/art/citygen.ts` regenerates it from the save seed, the city and its lots.
  - `Branch.desk` (`DeskWeek`: `week`, `approved`, `refused`, `declined`, `expired`): this week's Loan Desk outcomes, reset when the week turns (schema v3; migration 2 → 3 adds an empty tally).
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
- **Saves:** `src/sim/save/serialize.ts` has `serialize`, `deserialize` (with migrations and a required-keys check), `checksum` (cyrb53) and `exportCode`/`importCode`. localStorage slots arrive with the Stage 2 UI.

