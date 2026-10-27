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
  corporateDebt: CorporateDebt;       // venture debt and credit lines (SIMULATION §19.9), below
  dealDesk: { rfps: Record<Id, Rfp> };      // C5b (schema 13); was loanDesk { applications, loans }
  rivals: Record<Id, RivalBank>;
  market: MarketState;
  ventures: Record<Id, Startup>;
  realEstate: Record<Id, Property>;
  governance: Governance;
  personal: Personal;
  events: { log: GameEvent[]; scheduled: ScheduledEvent[]; incidents: Incident[]; cooldowns: Record<string, Week> };
  news: { issues: LedgerIssue[] };   // last 52
  history: { weekly: WeeklySnapshot[]; quarterly: QuarterReport[] };   // weekly: keep 260
  milestones: Record<string, Week>;  // id → week achieved
  flags: { tutorialStep?: number; gameOver?: 'takeover'|'insolvency';
           lesson?: { id: string; step: number }; lessonsDone: string[] };  // SCREENS §27
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
  grownLots?: number; // storefronts added since generation (city growth, CONTENT §3; v35)
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
  taxPayable: Money; taxLossCarry: Money; dividendsPayable: Money;
  goodwill: Money; intangibles: Money; fixedAssets: FixedAsset[];
  tier: Tier; tierWeeks: number; capitalRatio: number; liquidityRatio: number;
  appRating: Stars; riskAppetite: 1|2|3|4|5; /* the launch posture, SIMULATION §16.8 */ applyRatesToAll: boolean; companyPrices: Record<string, number>;
}
export interface FixedAsset { id: Id; kind: 'fitout'|'equipment'|'officeFitout'; cost: Money; lifeWeeks: number; ageWeeks: number; ownerId: Id }

export interface Branch {
  id: Id; cityId: Id; lotId: Id; name: string; openedWeek: Week; status: 'fitout'|'open'|'closed';
  size: number;                       // C2a: 0 Starter, 1 Standard, 2 Large, 3 Flagship (OFFICE_SIZES)
  build: { exterior: Id; lobby: Id; teller: Id; vault: Id; atm: Id; ages: Record<string, number> };
  lease: { weeklyRent: Money; deposit: Money };
  staff: { count: number; target: number; wage: number; skill: Score; morale: Score; quitAccumulator: number };
  managerId?: Id;
  delegation: { staffing: boolean; products: boolean; marketing: boolean; troubles: boolean; loans: boolean };
  awareness: Pct; grandOpeningWeeksLeft: number;
  ratings: { rates: Stars; products: Stars; service: Stars; branch: Stars; overall: Stars; reviewCount: number };
  reviewCards: ReviewCard[];          // max 8
  offered: Record<string /*productId*/, { on: boolean; price: number }>;
  ownPrices: boolean;                 // sets its own prices while HQ prices apply (schema 5)
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
  // C3b (schema 7): AI revenue lines and the compute bill; funding transfers dropped.
  lines: Record<'plans'|'api'|'apps'|'loanDesk'|'otherIncome'|'compute'
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
  hrHiring: boolean; // HR floor fills manager vacancies (v25)
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
  models: Record<Id, { id: Id; name: string; source: 'bureau'|'custom'; mix: Record<string, number>; radar: Pentagon; costPerCustomer: Money }>; // C6a (schema 14): radar Reasoning, Speed, Breadth, Safety, Efficiency; was costPerApp
  loansBooked: number;
}
```

## 6. Treasury, partnerships, Loan Desk

```ts
export interface Treasury {
  reserves: Money; // 0 in new games (C8f); only bank-era saves with funding still hold any
  liqTarget: Pct; autoFunding: boolean; freeze: boolean;
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
// Corporate debt (src/sim/competitionTypes.ts). lenderId is an investment bank site id
// (schema 19 on); older saves may still hold a rival lab id, repayable but not drawable.
export interface CorporateDebt {
  loans: Record<Id, CorporateLoan>;
  lines: Record<Id, CreditLine>;   // by lender; the limit (60% of equity) is computed live
  offers: CorporateLoanOffer[]; offersRefreshWeek: Week;
}
export interface CorporateLoan { id: Id; lenderId: Id; principal: Money; balance: Money; rate: Rate; termWeeks: number; weeksLeft: number; payment: Money; startWeek: Week }
export interface CorporateLoanOffer { id: Id; lenderId: Id; amount: Money; rate: Rate; termWeeks: number; payment: Money; expiresWeek: Week }
export interface CreditLine { lenderId: Id; drawn: Money; rate: Rate }

// C5b: LoanApplication and BusinessLoan are gone. Contracts live on Business (schema 12/13).
export interface Rfp {
  id: Id; branchId: Id; businessId: Id; kind: 'new'|'renewal'; createdWeek: Week;
  dueWeek: Week;          // new: last week to bid; renewal: the quarter-start week it is settled
  offer?: number;         // renewals: your discount off the budget (none = no bid on a rival's contract)
}
```

## 7. Rivals, markets, ventures, real estate

```ts
export interface RivalBank {
  id: Id; name: string; strategy: 'incumbent'|'disruptor'|'premium'|'community'; ink: string; monogram: string;
  cities: Id[]; branches: RivalBranch[]; cash: Money; equity: Money; capitalRatio: number;
  listed: boolean; ticker?: string; shares: number; price: Money; execs: { title: string; name: string }[];
  status: 'active'|'distressed'|'seized'|'acquired'|'merged'; priceLags: Record<string, { target: number; weeksLeft: number }>;
  home?: CountryId[]; charteredWeek?: Week;      // chartered banks (v37)
  mergedInto?: Id;                               // set with status 'merged' (v37)
  campaigns?: Record<Id /*city*/, { boost: number; weeksLeft: number }>;   // rival ads (v37)
}
export interface RivalBranch {
  id: Id; lotId: Id; size: number /* C2b: 0–3 like Branch.size */; openedWeek: Week; quality: [Stars, Stars, Stars, Stars]; // rates, products, service, branch
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
  totals: { assets: Money; arr?: Money; deposits: Money; loans: Money; equity: Money; rwa: Money };  // arr from schema 6
  pnl: Record<string, Money>; delayed: boolean;
}
export interface QuarterReport { year: number; q: 1|2|3|4; revenue: Money; netIncome: Money; eps: number; roe: number }
export interface Settings {
  currency: '$'|'C$'|'£'|'€'|'¥'; units: 'km'|'mi'; weeklyResults: 'weekly'|'monthly'|'quarterly'|'off';
  defaultSpeed: 1|2|4; autoPauseIncidents: boolean; autoPauseApplications: boolean;
  sound: boolean; reducedMotion: boolean; textScale: 1|1.15|1.3; layers: Record<string, boolean>;
  hqTabOrder: DeptId[];   // HQ tabs as you arranged them; [] = DEPT_ORDER (schema v22)
  guides: boolean;        // tutorial Part 2 on or off (schema v24)
}
export interface AvatarSpec { head: number; hair: number; facial: number; glasses: number; attire: number; tone: number; shade: number; eyes: number; brows: number; mouth: number; age: number }
```

## 9. Static data shapes (`src/data`)
- Each table in CONTENT.md becomes a typed `const` array or record, e.g. `PRODUCTS: ProductSpec[]`, `EQUIPMENT`, `CAMPAIGNS`, `CITIES`, `DISTRICTS`, `RIVALS`, `FUNDING_TYPES`, `DATA_INPUTS`, `BUREAU_PACKAGES`, `EMPLOYER_TYPES`, `COMPANIES`, `STARTUPS`, `CONVENTIONS`, `HOMES`, `CARS`, `JETS`, `COLLECTIBLES`, `FRANCHISES`, `INCIDENTS`, `HEADLINES`, `REVIEWS`, `ADVISOR_LINES`, `NAMES`.
- Static data never goes in saves. Saves store ids that reference it.

## 10. Saves

- **Slot data in IndexedDB** (`src/sim/save/slotData.ts`): database `frontierlab`, object store `saves`, keyed by slot id (`auto`, written each weekly tick, `1`, `2`, `3`); the value is the compressed game. Its quota is a share of the device's free space, not localStorage's ~5 MB per site (a big 10-year game is ~2.7 MB a slot). The app asks `navigator.storage.persist()` once so the browser keeps saves when space runs low. Where IndexedDB is missing or won't open, the data falls back to the localStorage key below. All slot reads and writes run in order through one queue.
- **localStorage keys** (written by `src/sim/save/storage.ts` and `slotData.ts`; the names are fixed so existing saves keep loading; Frontier Lab uses its own `frontierlab.` prefix so it never shares slots with Vault Street on the same site):
  - `frontierlab.meta.{slot}`: the slot card (read at once by menus), written after its data, with a checksum of it
  - `frontierlab.save.{slot}`: the compressed game before v0.11.7, and the fallback. On first use it is copied into IndexedDB and removed; until then it is still read from here
  - `frontierlab.prefs` (settings also live inside each save; this key holds title-screen prefs)
  - `frontierlab.tutorialSeen`
- **Format:** `JSON.stringify(state)`, compressed with lz-string `compressToUTF16` (the same string in IndexedDB or localStorage, so the card's checksum carries across).
- **Export code:** `"FL" + schemaVersion + ":" + compressToEncodedURIComponent(json)`. Vault Street codes (`"VS…"`) are turned away with a clear message. Offer copy-to-clipboard and `navigator.share` when available.
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
| Branches | `buildBranch` (leases and builds in one step; one office per city since C2a), `upgradeOffice` (grow a size), `renameBranch`, `closeBranch` |
| Products and pricing | `setOffered`, `setPrice`, `setApplyRatesToAll`, `setCompanyPrice` |
| Branch staff and marketing | `setStaffTarget`, `setWage`, `hireManager`, `fireManager`, `setManagerSalary`, `setDelegation`, `setCampaignLevel` |
| Loan Desk | `decideApplication(id, 'approve', rate)`, `declineApplication` |
| Offices and departments | `leaseOffice`, `addFloor`, `releaseFloor`, `setDeptTarget`, `setDeptSalary`, `setBenefit` |
| Finance floor | `setRiskAppetite` (the launch posture, 1–5) |
| Products floor | `startDevelopment`, `cancelDevelopment`, `deleteProduct`, `buyBureauModel`, `commissionBureauModel`, `saveCustomModel`, `activateModel` |
| Treasury | `setTreasuryPolicy`, `borrowOffer`, `repayLot`, `topUpLendingFund`, `borrowWindow`, `repayWindow` |
| Partnerships and partners | `signPartnership` (payroll or student), `renewPartnership`, `releasePartnership`, `startGradProgram`, `endGradProgram` |
| Marketing and lobbying | `startBrandCampaign`, `buyAgencyPackage`, `startLobbying` (was `lobby`) |
| Corporate borrowing (investment bank Debt tab) | `acceptCorporateLoan`, `repayCorporateLoan`, `drawCredit(lenderSiteId, amount)`, `repayCredit(lenderId, amount)` (repaying works for any lender, old rival lines included) |
| Capital markets | `trade(account, securityId, shares)`, `privatePlacement(bankId, pct)`, `launchIpo(bankId, floatPct)`, `secondaryOffering(bankId, pct)`, `offerMerger(rivalId, pricePerShare)` |
| Investments and property | `buyStartupLot` (was `investInRound`), `offerVentureDebt`, `offerProperty` (was `buyProperty`), `setPropertyRent`, `setPropertyForSale`, `setReoMode`, `tradeFx` |
| Governance and executives | `holdBoardMeeting(dividendPerShare, ceoSalary)`, `hireExec(seat, candidateId)`, `fireExec`, `setExecSalary`, `setExecDelegation`, `addGrant(seat, type, shares, strike)`, `setGrowthCity(cityId, on)`, `cooOpenBranch(cityId)` |
| Incidents | `resolveIncident(id, optionId)` |
| Personal | `offerHome`, `rebuildHome`, `sellHome`, `buyCar`, `sellCar`, `placeBid`, `clearBid`, `appraiseCollectible`, `consignCollectible`, `withdrawConsignment`, `buyJet`, `sellJet`, `buyClub`, `sellClub`, `setKit`, `setKitSponsor`, `signPlayer`, `releasePlayer` |
| Settings and saves | `setSettings`, `setFounderAvatar`, `moveHqTab`, `resetHqTabOrder`; saves are not commands: `saveToSlot`, `loadFromSlot` (`src/sim/save/storage.ts`), `exportCode`, `importCode` (`serialize.ts`) |

## 12. Implemented so far (schema v6)

`src/sim/state.ts` is the source of truth; this section records how it differs from the guide above. Later stages add the rest with a schema bump and a migration.

**Frontier Lab renumbering (stage C0, 2026-10-26):** the state below is Vault Street's final shape (its schema v38), renumbered as Frontier Lab schema 1. Vault Street's 37 migration steps were dropped, so the schema numbers and migrations mentioned in the entries below are history only.

**Frontier Lab schema 4 (stage C2c, data centers):** `dataCenters: Record<Id, DataCenter>` (`id`, `cityId`, `lotId?` or `siteId?`, `name`, `status` fitout/open, `weeksLeft`, `builtWeek`, `openedWeek?`, `build { hall, power, cooling }` part ids, `lease { weeklyRent, deposit }`). A data center on a storefront sets that lot's occupant to `{ type: 'player', id: <data center id> }`, so code that reads a player occupant checks `dataCenters` before `branches`. Its parts are fixed assets owned by its id. Migration 3 → 4 adds an empty table. Events `DATA_CENTER_STARTED { dataCenterId, name, city, site, weeks }`, `DATA_CENTER_OPENED { …, gpus, refit }`, `DATA_CENTER_UPGRADED { …, slot, part }`, `DATA_CENTER_CLOSED`. Commands `buildDataCenter`, `upgradeDataCenter`, `renameDataCenter`, `closeDataCenter`.

**Frontier Lab schema 5 (stage C2d2, main offices and company-wide prices):** `Branch.ownPrices: boolean`, true when a sales office sets its own prices and lineup while Apply-to-all is on. Migration 4 → 5 sets it false everywhere. Commands `setOwnPrices(branchId, on)` and `mainOfficeBlocker(cityId)` (the two-office cap, MAIN_OFFICES_MAX).

**Frontier Lab schema 9 (stage C4a, the compute pool):** new `GameState.compute: ComputeState` = `{ index, phase: 'glut' | 'normal' | 'shortage', weeksInPhase, demandGpus, ownedGpus, history: number[] }` (SIMULATION §13.0), and an optional `BranchPnl.gpus` (GPU-weeks the office used that week). The `compute` RNG stream is created on first use. Migration 8 → 9 (`src/sim/save/migrateCompute.ts`) starts the pool at a normal index of 1 with an empty history and counts the GPUs already running.

**Frontier Lab schema 10 (stage C4b, GPU lots):** `ComputeState` gains `rentedGpus`, `lots: GpuLot[]` (`{ id, type, provider, gpus, price, startWeek, endWeek, radar }`), `offers: GpuOffer[]` (`{ id, type, provider, gpus, price, termWeeks, radar, expiresWeek }`) and `offersRefreshWeek` (−1 without a Compute floor). The `gpuMarket` RNG stream is created on first use. Migration 9 → 10 (`src/sim/save/migrateGpuLots.ts`) adds them empty.

**Frontier Lab schema 11 (stage C4c, spot limits):** `ComputeState` gains `autoSpotBuy` (default true), `spotTrail`, `crunchWeeks`, `outageWeeksLeft`, `burstStigmaWeeks`, `weekCharge` and `weekCost` (SIMULATION §13.0). Office P&L `compute` is now the internal charge at spot. Migration 10 → 11 (`src/sim/save/migrateSpotLimits.ts`) turns auto spot-buy on and seeds the trail with today's gap, so an old save isn't squeezed by a limit it never built up.

**Frontier Lab schema 12 (stage C5a, customer businesses):** new `GameState.businesses: Record<Id, Business>`, where `Business` = `{ id, cityId, name, sector, size: 'small'|'mid'|'large'|'anchor', lotId? or siteId?, pentagon, budget, vendor?: { type: 'player'|'rival', id }, contractValue?, renewalWeek? }` (SIMULATION §11.0). A business on a storefront sets that lot's occupant to `{ type: 'business', id }`; anchors sit on employer sites. Each city draws from its own `businesses:{cityId}` stream. Migration 11 → 12 (`src/sim/save/migrateBusinesses.ts`) seeds businesses in every generated city.

**Frontier Lab schema 13 (stage C5b, the Deal Desk):** `GameState.loanDesk` is replaced by `dealDesk: { rfps: Record<Id, Rfp> }` (SIMULATION §11). `Business` gains `startWeek?` (when your contract began) and `quietUntil?` (no new RFP before this week); a `vendor` of type `player` now names your sales office. `Branch.discountLimit` (a delegated manager's most generous discount, default `DEAL.defaultLimit`) is new, and `DeskWeek` counts `arrived`, `won`, `lost`, `declined`, `expired`. Events `LOAN_BOOKED` and `BIG_DEFAULT` give way to `CONTRACT_WON { branchId, businessId, business, sector, value, from? }` and `CONTRACT_LOST { …, reason: 'renewal'|'outage'|'failed'|'office', to? }`. The `dealDesk` and `contracts` RNG streams are created on first use. Commands `bidOnRfp`, `declineApplication` (now for RFPs), `setRenewalOffer`, `setDiscountLimit`; `decideApplication` is gone. Migration 12 → 13 (`src/sim/save/migrateDealDesk.ts`) repays current business loans into treasury reserves (equity unchanged), drops the applications, renames the desk tally, adds the discount limit and rescales business budgets to the C5b size bases.

**Frontier Lab schema 16 (stage C6c, the Chief Scientist and the talent war):** `GameState.talent = { researchers: Record<Id, Researcher> }` with `Researcher { id, name, portrait, specialty, stars, salary, employer?: { type: 'player' } | { type: 'rival', id }, joinedWeek? }`. `ExecSeat` gains `'csci'`. Migration 15 → 16 (`src/sim/save/migrateTalent.ts`) seeds the researchers and, with an Executive floor, Chief Scientist candidates. New RNG stream: `talent`.

**Frontier Lab schema 18 (stage C8a, data-centre and power deals):** `GameState.powerDeals: Record<Id, PowerDeal>` (types in `src/sim/competitionTypes.ts`): `siteId`, `startWeek`, `termWeeks`, `fee` (total paid) and `unamortized` (an intangible, as for partnerships), `gpus` (contracted this week), `price` (per GPU-week, fixed at signing), `health`, `lowHealthWeeks`, `status` active/runoff, `runoffWeeksLeft?`. Migration 17 → 18 adds an empty book. New events: `POWER_DEAL_SIGNED`, `POWER_DEAL_RENEWED`, `POWER_DEAL_ENDED`.

**Frontier Lab schema 19 (stage C8f, seed money):** no shape change. The bank's locked charter capital is gone: a new game starts with `treasury.reserves = 0` and `company.paidInCapital = startCash` (`meta.startCash` is one of 1M / 1.5M / 2M / 2.5M). Migration 18 → 19 (`src/sim/save/migrateSeedMoney.ts`) moves treasury reserves into `company.cash` when the save has no deposits, wholesale lots, overnight or central bank window borrowing; both are assets, so equity is unchanged. A save that still carries bank-era funding keeps its reserves. `CorporateDebt` lender ids (`CorporateLoan.lenderId`, `CorporateLoanOffer.lenderId`, the keys of `lines`) are now investment bank site ids; saves from before may still hold rival lab ids, which keep accruing and can be repaid but not drawn, and offers from them are replaced on the next tick. `company.riskAppetite` is unchanged in shape and now holds the launch posture. The `deposits_1b` milestone id stays and now means a billion in ARR.

**Frontier Lab schema 20 (post-C8, the CTO's Compute delegation):** `ExecutivesState.computeCover` (one of `CTO_COMPUTE.coverTargets` 0.6 / 0.75 / 0.9, default 0.75), the share of GPU demand the CTO's **Compute** delegation (`cto` seat, id `compute`) covers outside spot. Migration 19 → 20 sets 0.75. The switch is stored like every delegation toggle, so a CTO already seated in an older save has it off (missing = off) until you switch it on; new candidates come with it on.

**Frontier Lab schema 17 (stage C7a, the safety ratio and the AI regulator):** `Company` gains `safetyRatio: number` (it sets `tier`, now the regulator's safety tier), `pause?: { reason: 'voluntary' | 'revoked'; untilWeek }` and `watchUntilWeek?`. `capitalRatio` stays as the lenders' credit ratio; `lowCapitalWeeks` now counts weeks under the safety revoke line. `WeeklySnapshot` gains `safetyRatio?` (its `tier` is the safety tier). Migration 16 → 17 (`src/sim/save/migrateSafety.ts`) sets the ratio and tier, restarts the low-ratio count and drops a pending emergency recapitalisation (the `RECAP_OFFER` case is now the mandated pause). New events: `SAFETY_PAUSE`, `LICENCE_REVOKED`, `LICENCE_RESTORED`. `GameOverReason` `'takeover'` is no longer produced.

**Frontier Lab schema 15 (stage C6b, training runs and rival models):** `GameState.training = { run?: TrainingRun; generation; frontierBase }` with `TrainingRun { id, name, focus, weeks, weeklyBudget, spent, progress, odds, startWeek }`. `UnderwritingModel.source` gains `'trained'`, with optional `lift` (Pentagon), `generation` and `trainedWeek`. `RivalBank.model?: { name, generation, quality, releasedWeek }`. Migration 14 → 15 (`src/sim/save/migrateTraining.ts`) adds empty training state, seeds every rival's model and sets `frontierBase` to the best, so a loaded game starts level. New RNG streams: `rivalModels`, `training`.

**Frontier Lab schema 14 (stage C6a, the AI model):** `UnderwritingModel.costPerApp` becomes `costPerCustomer` (the data licence per customer a year), and the radar's five slots now read Reasoning, Speed, Breadth, Safety, Efficiency (same numbers). `DataInputSpec.minLoansBooked` becomes `minCustomers`. Migration 13 → 14 (`src/sim/save/migrateModel.ts`) multiplies each model's cost by 10 (`COST_PER_CUSTOMER_FROM_APP`) and gives packaged models their data vendor's new name. `underwriting.loansBooked` stays and counts contracts won.

**Frontier Lab schema 8 (stage C3c, bank leftovers removed):** `GameState.reo` and the `ReoPool` type are gone, and `Treasury` loses `bondsMarket`, `bondsBook`, `bondBookYield` and `bondShare`. The `covered_bond` funding type is gone. The command `transferToTreasury` is renamed `topUpLendingFund`. Migration 7 → 8 (`src/sim/save/migrateBankCleanup.ts`) keeps equity unchanged:
- Each REO pool's value is added to company cash, and `reo` is deleted.
- Bonds are sold into reserves at market value. The unrealised gain or loss (market − book) moves into `company.retainedEarnings`, since the balance sheet no longer carries AOCI.
- Covered bond lots become `term_interbank` lots, and covered bond offers are dropped.
- The `bondCoupon`, `realizedGains`, `depositInterest`, `wealthFees` and `originationFees` P&L lines stay in the ledger at zero for now, so old weekly records keep their shape.

**Frontier Lab schema 7 (stage C3b, the money model):** new company P&L line `compute` (an operating expense; plan seats and API usage). `BranchPnl.lines` move to `plans`, `api`, `apps`, `loanDesk`, `otherIncome`, `compute`, `losses`, `staff`, `manager`, `rent`, `marketing`, `equipment`, `servicing`, `overhead` (the funding credit and charge, deposit interest and wealth lines are gone). Migration 6 → 7 (`src/sim/save/migrateMoney.ts`) keeps equity unchanged:
- `compute: 0` is added to the running ledger and every weekly snapshot's P&L.
- Old office rows map fees → plans, wealth & services → API, loan interest → Loan Desk, and deposit interest into servicing; revenue drops the funding credit, and each row keeps the income it closed with.
- Overnight and central bank window borrowing is repaid from reserves, then corporate cash, since the Loan Desk now lends only what reserves hold.

**Frontier Lab schema 6 (stage C3a, the AI product catalog):** the product ids change to the new catalog (CONTENT §5: Plans, API, Apps & Services; category ids unchanged). Plan and usage books hold ARR in `balance` (plans count seats in `accounts`). New `ProductKind`s `plan` and `usage`, `PriceType` `perUnit`, and optional `ProductSpec.unitCost`, `convertsTo`, `conversion`. `WeeklySnapshot.totals.arr` (optional: weeks closed before schema 6 have none and read as 0). `Partnership.balance` is now the mini-book's ARR and `productId` a plan. `IncidentEffect` kind `savingsBoost` is renamed `planCut` (a share cut off plan prices). Migration 5 → 6 (`src/sim/save/migrateCatalog.ts`) keeps equity unchanged:
- Each office's bank books are settled where they stand: deposits are paid out of treasury reserves, loans are sold into reserves at book value, and wealth, safe-box and FX books simply close. This includes developed products built on a bank base.
- The new catalog's offered entries and empty books are seeded (Plans and the Loan Desk on, the rest off, at default prices). Each office's old customers start on the Free Tier.
- Partnership balances come out of reserves and reset to 0. The package becomes Team (staff) or Campus Plan (students).
- Any negative reserves left over come out of corporate cash.
- Old ids are dropped from the catalog, company price lists and lineup, and from rival prices and price lags. Developments on old bank templates are dropped, and rival price-war bumps are reset.
- `savingsBoost` effects, and effects targeting an old product, are removed.
- Business loans (the Loan Desk) carry over untouched.

**Frontier Lab schema 3 (stage C2b, rival sales offices):** `RivalBranch.size` (0–3). Migration 2 → 3 folds each rival's branches in a city into one office of the nearest size (`foldRivalCity`: books added, quality blended, the other lots freed). Events `RIVAL_OFFICE_GROWN` and `RIVAL_OFFICE_SHRUNK { rivalId, bank, city, size }`.

**Frontier Lab schema 2 (stage C2a, sales offices):** `Branch.size` (0–3: Starter, Standard, Large, Flagship; SIMULATION §6.4). Migration 1 → 2 sets `size = 0` on every branch. A save from before C2a may hold several branches in one city; they keep running, and the one-per-city rule only stops new builds. Event `OFFICE_GROWN { branchId, city, size }`.

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
- **Schema v19 adds** `meta.houseStyle` (`HouseStyle`: `'heritage' | 'deco' | 'modern' | 'garden' | 'civic'`, later also `'quant'`, the branch fronts' house style chosen at New Game; a game started without one gets `SEEDED_HOUSE_STYLE_IDS[seed % 5]`, always one of the first five). Migration 18 → 19 picks one from the seed the same way.
- **Schema v23 adds** `eyes`, `brows`, `mouth` and `age` to every `AvatarSpec` (founder, managers and candidates, executives, startup and venture CEOs), and a fourth glasses option. New people get the four from `faceDetail()` in `people.ts`, a hash of their other parts, so the people RNG stream is unchanged. Migration 22 → 23 walks the whole save and applies the same hash to every face; the founder's gets zeros (almond eyes, soft arch, smile, fresh), which is exactly how it drew before.
- **Schema v24 adds** tutorial Part 2 (SCREENS §27.2): `settings.guides` (boolean), `flags.lesson` (the guide in progress and its step, optional) and `flags.lessonsDone` (ids of guides and first-look tips already seen). Part 1 grew from 7 to 9 steps, so `flags.tutorialStep` now runs 1–9 with 10 = closing card and 11 = finished. Migration 23 → 24 moves 8 → 10 and 9 → 11, switches guides on, and pre-marks the guides an older bank has no need for (`hq` with an office, `exec` with an executive, `ipo` once listed, `travel` and `place-airport` after a flight, `floor-{dept}` for each floor it has).
- **Schema v25 adds** `people.hrHiring` (boolean): with an HR floor, HR hires the strongest candidate for every open branch without a manager each week (SIMULATION §16.11). Migration 24 → 25 switches it on, as for new games.
- **Schema v22 adds** `settings.hqTabOrder` (`DeptId[]`, the HQ tabs in the order you arranged them; departments not listed follow in `DEPT_ORDER`). Migration 21 → 22 sets `[]`.
- **Schema v21 adds** `executives.payReviewCadence` (`'quarterly' | 'annual'`), `executives.moraleTarget` (70 / 80 / 90) and `executives.brandTarget` (0.4–0.7): the delegation dials. Migration 20 → 21 sets quarterly, 70 and 0.5, what the switches always did.
- **Schema v20 adds** `meta.logoShape` (`'round' | 'shield' | 'lozenge' | 'hex' | 'plaque' | 'rosette'`, the outline of the bank's mark chosen at New Game; `'round'` when none is chosen). Migration 19 → 20 sets `'round'`, so older banks keep the medallion they have always worn. The slot card record (`SaveMeta`) carries it too, optional for cards written before.
- **Schema v26 removes** (content trim): `dealerDeals` and the `dealerFees` P&L line (dealer financing is gone), and the `hold` value of `ReoPool.mode` (now `'rent' | 'selling'`). Migration 25 → 26 deletes `dealerDeals`, folds `dealerFees` into `marketing` in the open ledger and every weekly snapshot, drops `DEALER_*` events from the log, turns held REO pools into rented ones, retypes funding lots and offers (`brokered` → `term_interbank`, `senior_bond` → `covered_bond`, with the new type's radar), and renames a running `grand_opening` agency package to `street_team`.
- **Schema v27** (fewer offices, more buildings): no new fields. Migration 26 → 27 keeps every office listing you lease, deletes spare unleased listings beyond `OFFICE_LISTINGS.countBySize` (lowest numbers kept), and calls `generateInvestmentSites` again for each generated city to add property buildings up to `REAL_ESTATE.buildingsPerCity` from the city's `sites7` stream, so existing lots, listings and buildings stay put.
- **Schema v28** (monthly results, longer conventions): `settings.weeklyResults` gains `'monthly'`; no new fields. Migration 27 → 28 stretches every convention run not yet over to `startWeek + CONVENTIONS.activeWeeks` and moves its exclusive startups' `round.closesWeek` with it.
- **Schema v30** (the CREO's occupancy dials and Buying): `ExecutivesState.occTargets: { company, personal }`, each one of `EXEC_DELEGATION.occTargets` (default 1); the CREO seat gains delegations `bankBuys` and `privateBuys`. Migration 29 → 30 sets both dials to 100% and adds the two switches off for a seated chief and the seat's remembered switches (on for candidates, like any new hire), so nothing is bought until you switch it on.
- **Schema v31** (the CFO's Investing): `ExecutivesState.trimmedStocks: { company, personal }`, each a map of listed company id → week the chief sold it at a loss (not bought back for `EXEC_DELEGATION.investCooldownWeeks`); the CFO seat gains delegations `bankInvests` and `privateInvests`. Migration 30 → 31 adds empty maps and the two switches off for a seated CFO and the seat's remembered switches (on for candidates).
- **Schema v38** (buybacks and share-for-share deals, SIMULATION §19.6a, §19.8): `OwnStock.buybacks?: { week, shares, price, cost }[]` (last `BUYBACK.kept`), `MergerOffer.stockPct?` and `DealRecord.stockValue?`. Migration 37 → 38 changes nothing: every new field is optional. New event `SHARE_BUYBACK`; `ACQUISITION_CLOSED` gains an optional `stockPct`.
- **Schema v37** (a field that stays full, SIMULATION §18.7–18.9): `RivalBank` gains optional `home` and `charteredWeek` (chartered banks, ids `charterN`), `mergedInto` with the new status `'merged'` (bought by another rival), and `campaigns` (city → `{ boost, weeksLeft }`). Migration 36 → 37 changes nothing: every new field is optional. New events: `RIVAL_CHARTERED`, `RIVAL_MERGER`, `RIVAL_CAMPAIGN`, `RIVAL_APP_LAUNCH`, `RIVAL_GROWS_UP`. New RNG streams: `charters`, `rivalMergers`, `rivalAds`.
- **Schema v35** (price lists and growing cities): `CountryState.listIndex` (the price list, SIMULATION §4.6; steps to `nominal` at each year end) and the optional `CityState.grownLots` (storefronts added since generation, CONTENT §3; grown lots are `lot_{city}_gNNN`). Migration 34 → 35 sets every list to 1, so a long save's prices and rents catch up at its next year end. The new `CITY_GROWTH` event needs no state.
- **Schema v33** (a growing world): `CountryState.nominal` (the nominal index, SIMULATION §4.6; 1 at the start) and the optional `richList.nominalRef` (the home index at the last ranking). Migration 32 → 33 sets every country's index to 1, so an older save starts growing from its current level. Six new milestone ids (`twenty_cities`, `ten_countries`, `ten_acquisitions`, `assets_100b`, `worth_10b`, `assets_1t`) catch up quietly on load; the new `RIVAL_CITY_ENTRY` event needs no state.
- **Schema v34** (the Ledger's world beyond your bank, SIMULATION §24.1–24.3): `NewsDesk.worldRecent` (`${beat}:${country}` → week it last ran, for the World desk cooldown) and `NewsDesk.elections` (per country: `governing` party index into `PARTIES` and `nextWeek` of its vote). `LedgerTab` gains `'world'`. Migration 33 → 34 gives an existing desk empty maps; each country's first campaign is then scheduled on the next issue, staggered by country. A new RNG stream `politics` carries the bills and votes (split from `news`).
- **Schema v32** (late-game goals): no new fields. Migration 31 → 32 rescales every rich-list fortune from the old $1.5B–$120B span to `RICH_LIST.fortune` ($150M–$2B), keeping each fortune's place and the list sorted; `rank` is left for the next year end. Six new milestone ids (`hundred_branches`, `ten_cities`, `assets_10b`, `five_acquisitions`, `club_owner`, `rich_list`) fill in through the usual quiet catch-up on load.
- **Schema v29** (market rents follow the cycle, the CREO): `ExecSeat` gains `'creo'` (delegations `bankRents`, `privateRents`); `Property.marketRent` now moves weekly toward base × cre/100 rather than staying fixed; no new fields. Migration 28 → 29 seeds the new seat's candidate pool from the `execs` stream when the save has an Executive floor with pools; buildings are left as they are and drift from the first tick.
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
  - `CountryState`: `hpiHistory`, `prevFtpShort`/`prevFtpLong` (to detect moves), `cardAnchor`, `startPolicy`, `feeIndex`, `marketReturn`, `nominal` (v33), `listIndex` (v35), `forceRecessionAtWeek`.
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
- **Saves:** `src/sim/save/serialize.ts` has `serialize`, `deserialize` (with migrations and a required-keys check), `checksum` (cyrb53) and `exportCode`/`importCode`. Save slots live in `src/sim/save/storage.ts`, their data store in `slotData.ts` (§10).
- **Schema v36** (world calendar, commodities, archive; SIMULATION §24.4–24.6): `NewsDesk.scheduled` (`ScheduledStory[]`: stories written ahead for a week, a tournament's rounds or an expo's close), `NewsDesk.commodities` (weekly prices per commodity id, newest last, at most 53) and `NewsDesk.archive` (`ArchivedStory[]`: every fourth issue's lead story with week, date, tab, icon, headline, body and an optional `reprinted` flag). Migration 35 → 36 gives an existing desk empty ones. New RNG streams `commodities` and `reviews` (branch review cards, split from `news`).
