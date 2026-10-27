# Progress Log

Claude Code updates this at the end of every session. Newest entries go at the top.

**Project:** Frontier Lab, an AI-lab tycoon forked from Vault Street (reference remote `upstream`, read-only).
**Current stage:** C8 done: the bank-to-AI conversion is complete (v0.1.29, save schema 20). C8a–C8d added power deals, the new tutorial, the art pass and the balance pass; C8e rewrote the docs in AI terms; C8f reworked the last bank leftovers. Next: ROADMAP Stage 10 launch items (the hub card happens in its own session).
**Live URL:** https://jxstrr0.github.io/FrontierLab/
**Determinism snapshot:** `0bf7d7abb55509` (seed 42, scripted commands, 260 weeks; `tests/sim/determinism.test.ts`)

---

## Session log

### 2026-10-27 — City text fix, menu scrolling, free top rerolls (v0.1.29)

**What changed.**
- **City picker text fixed.** My last change put the new Paris, Frankfurt and Amsterdam blurbs in the wrong place: their country line ("France", "Germany", "Netherlands") was overwritten with the blurb, and the blurb itself was still the old one. Both are right now, and a test checks the country lines.
- **Menu scrolling.** Three fixes, found by driving the game on a simulated iPhone screen with touch swipes:
  - Switching tabs in a panel (a sales office's Service / Products / Deal Desk…, or HQ's floors) used to keep the old scroll position, so you landed halfway down the new tab. A new tab now starts at its top.
  - While the tutorial guide is showing, its bar sat over the bottom ~240 px of every panel. The last cards could never scroll out from under it, and it covered the panel's tab bar. Now the bar sits just above the tab bar, and the panel (or sheet) gets extra room at the bottom so everything can scroll into view.
  - Bottom sheets (Menu, Layers…) were sized to 88% of Safari's full-screen height, which is taller than what you see while Safari's toolbars show. They now use the visible height.
- **Settings → Developer → Free top rerolls.** With developer tools on, inside a game: "New candidates" for managers and executives costs nothing (the button says "Free"), and every rerolled candidate rolls 95–99 in every skill, with an asking salary to match. "Top staff" (the earlier switch) only lifts the *teams* (office staff and HQ floors), not the candidates you hire, which is why it didn't do what you wanted. This one does. Saved with the game; no save change, determinism snapshot unchanged.

**Checked.** `npm run lint`, `npx vitest run` (1013 tests, 4 new) and `npm run build` pass. Swipe tests at 390×844 in Chromium's iPhone emulation, with the clock running.

**Dependencies:** none added.

### 2026-10-27 — Dev tools for staff and bankruptcy, AI-lab city blurbs (v0.1.28)

**What changed.**
- **Settings → Developer → Top staff.** With developer tools on, inside a game, this holds the skill and morale of every sales office's staff and every HQ team at 95 or better. It applies the moment you switch it on and again after every weekly update, so hiring and wages can't drag the average down. Switch it off and they drift back to normal.
- **Settings → Developer → No bankruptcy.** Weeks with cash below zero no longer end the game. Cash still goes negative and the warnings still show, so you can see what happens without losing the run. A game already over isn't revived.
- Both switches are saved with the game, not the device. They're optional flags, so no save change and the determinism snapshot stays `0bf7d7abb55509`.
- **City picker blurbs.** All 20 start cities now read the way an AI lab would see them: talent, cheap power, rents, rival labs and who the customers are. The intro line now says the start country sets the interest rates you borrow at, the taxes and the exchange, instead of "the central bank you borrow from".

**Checked.** `npm run lint`, `npx vitest run` and `npm run build` pass, including 4 new tests for the two switches.

**Dependencies:** none added.

### 2026-10-27 — The CTO manages compute (v0.1.27)

**What changed.**
- **New CTO delegation: Compute.** Until now nobody managed compute for you: auto spot-buy filled gaps at the spot price, and GPU reservations, data centers and power deals were all up to you. A seated CTO now has a **Compute** switch. Each week, with a Compute floor at HQ, they reserve GPUs from the floor's market until your own and reserved GPUs cover a share of last week's demand. Auto spot-buy still covers the rest.
- **Cover target dial** under the switch: 60%, 75% (default) or 90%. Below 100% on purpose: if customers leave, you aren't stuck paying for idle reservations. The line under the dial says how much is covered now and what the CTO would reserve this week and for how much a week.
- **How the CTO picks.**
  - Only offers cheaper than spot.
  - In a chip glut (spot cheap), they lock in long 3-year terms.
  - In a shortage (spot expensive), they take short 6-month terms so the high price doesn't stick.
  - In a normal market, the cheapest price per GPU.
  - Data centers still being fitted out count as covered, so the CTO doesn't double up.
  - Small gaps (under 5% of demand) are left to spot.
- **The Compute floor now belongs to the CTO, not the CFO.** A strong CTO makes that team work better, which brings more and cheaper GPU offers. The CFO keeps the Finance floor.
- **Older saves.** A CTO you already hired starts with the new switch off, so nothing changes until you turn it on. Newly hired CTOs come with it on, like every delegation. Save schema 19 → 20 adds the dial (set to 75%).

**What you chose (pitched as questions).** GPUs only, no data center building; a dial rather than a fixed target; terms follow the chip cycle; the CTO takes over the Compute floor.

**Checked.** `npm run lint`, `npx vitest run` (158 files, 1,005 tests, including 8 new ones for the delegation) and `npm run build` pass. The determinism snapshot changed from `15c9b9a3361bdb` to `0bf7d7abb55509`. That is only the new save field and schema number: with both removed, the run hashes to the old value, so the game plays out the same. No balance strategy hires executives, so the balance runs are unaffected. The CTO's profile with the dial was checked in Chromium at 390×844 with no console errors.

**Dependencies:** none added.

### 2026-10-27 — Post-C8 polish: the four open items (v0.1.26)

**What changed.**
- **Cover art.** The title screen's city print now draws your data centers as low halls instead of storefronts, and energy sites as substation yards, the same as the live map. To do that, each save card now remembers which of your flags are data centers. Older save cards don't have that list and simply show storefronts until you save again. This is save-card information, not game state, so there is no save schema change.
- **Safety floor.** The safe is gone. In its place is a server rack behind a wire cage, the red-team sandbox where models are tested.
- **Map coins.** Open locations show a "+" coin instead of "$": they're places to build, not money.
- **Long lab names.**
  - A sales office's header now reads its own name (for example "Midtown") with "Your Lab · address" under it. Before, a long lab name pushed the district onto a second line.
  - The HQ header now reads "HQ" with "Your Lab · address · city" under it. The Office button beside it left so little room that even "Frontier Lab HQ" was cut to "Frontier Lab …".
  - The title screen caption trims a long name with "…" before it reaches the page dots.
  - Elsewhere, panel titles already trim cleanly; I checked the Company, HQ, sales office and title screens with the longest allowed name (24 wide letters).
- **Debt tab, checked at phone size (390×844).** It works and fits. Two fixes:
  - Before you have a sales office in the bank's city, "Venture debt" showed an empty heading. It now says "Term loan offers appear once you have a sales office here."
  - The credit line showed a Draw slider stuck at $0. It now hides the controls and says you can draw once you have a sales office there. (If you moved away with money still drawn, Repay still shows.)
- **Code tidy-up.** `src/app/map/pins.ts` (495 lines) is split into four files: `pins.ts` (sales office, business and office pins, and the pin list, 253 lines), `pinTypes.ts` (pin types and the roof anchor), `sitePins.ts` (pins for bureaus, employers, banks and other places) and `mapOccupants.ts` (what the renderer draws on each lot). No behaviour change.

**Checked.** `npm run lint`, `npx vitest run` (157 files, 997 tests, including a new test for the data-center cover record) and `npm run build` all pass. The determinism snapshot is unchanged (`15c9b9a3361bdb`). Screens checked in Chromium at 390×844, with no console errors: Company, HQ, sales office, Investment Bank Debt tab (with and without a sales office) and the title cover with three data centers. The Safety floor's caged rack checked on a leased HQ too.

**Dependencies:** none added.

**Open items, not blocking.** None from this list.

### 2026-10-27 — Stages C8e–C8f: docs sweep and the last bank leftovers (v0.1.25). Conversion complete.

**What changed.**
- **Docs in AI terms (C8e).** DESIGN, SIMULATION, SCREENS and CONTENT now describe the AI lab throughout. Bank-era code names (`branch`, `bankName`, `treasury` = Compute, `risk` = Safety) are explained once at the top of DESIGN and in a glossary in SIMULATION. The conversion plan is archived in `docs/archive/CONVERSION_PLAN.md`. While rewriting, the helpers found places where the docs and the code disagreed (tick order, the Executive suite's 8 desks, the founder ramp); the docs now follow the code.
- **On-screen polish (C8e).**
  - The default lab is "Frontier Lab" with an "FL" monogram, and the app icon and theme colour match the new palette.
  - Build options have AI names: Sales desks, Machine room and Demo kiosks.
- **Seed money (C8f).** The locked $2M "charter capital" is gone. A new lab starts with a $1.5M seed round, and all of it is spendable; the New Game options are $1M, $1.5M, $2M and $2.5M. Old saves get their locked reserve moved into cash when they load (save schema 19).
- **"A billion in ARR" (C8f).** This milestone replaces "A billion in deposits", which no lab could ever reach.
- **Launch posture (C8f).** The Finance floor's old "Risk appetite" dial is now **Launch posture**, from Very cautious to Very bold.
  - Bolder levels win more deals: up to +6 points on every Deal Desk bid.
  - They also carry more safety risk: up to +16% safety exposure.
  - Levels 4–5 still make capability over-claims more likely.
  - A Chief Safety Officer with the switch on steps the posture down while the safety tier is weak and back up while it's Strong.
- **Incidents that cost $0 now cost money (C8f).**
  - Capability over-claim: refunds are 2% of the sales office's ARR.
  - Outage rumour: the old "Central bank window" choice is now **Service credits**, worth 2% of your ARR, which end the rumour on the spot. Its text now talks about customers cancelling plans, not depositors.
- **Borrowing moved to investment banks (C8f).** The Investment Bank has a new **Debt** tab: venture-debt offers and a credit line. A bank lends if you run a sales office in its city. Rival labs no longer lend to you. Loans already taken from a rival keep running and can be repaid from the Debt tab. A city usually has one investment bank where it had about three rival lenders, so each credit line is now 60% of equity (it was 20%). That keeps your emergency borrowing room about the same.
- **Bank words on screen (C8f).**
  - Manager toggles now read "Products & prices" and "Deal approvals". The review category is "Price", and the office P&L line is "Bad debts".
  - The office advisor now says "The pipeline's warm…".
  - The wizard field is "Lab name", and the HQ tabs are "Platform" and "Safety".
  - The M&A card shows "Customers", and the merger test checks "Customer share".
  - The university and employer panels say "Plans partner" and "Staff plan deal".
  - The central bank's standing facility, the liquidity row and the Safety floor's Losses card show only in old saves that still have bank money to manage.

**Balance.** A bigger seed you can spend makes the first year faster. The early targets moved:
- Week 26 ARR: $1.5–5M.
- Week 52 ARR: $3–8M.
- Week 52 customers: up to 9,000.
- Late-game income ceilings rose about 20%, while ARR stays inside its old bands.

The turtle test lab now grows its office only after a profitable quarter, with half a year of costs in hand. A bug in the strategy checker meant Restricted didn't count as "Watch or worse"; it's fixed. Every strategy (steady, turtle, aggressive, stress) passes on seeds 42 and 7, and the 20-seed median passes.

**Launch check (ROADMAP Stage 10).**
- Lighthouse mobile: performance 95, accessibility 95, best practices 96, SEO 91.
- The new tutorial takes about 5–8 minutes.
- No known blocking bugs.

**Checked.** `npm run lint`, `npx vitest run` (157 files, 996 tests) and `npm run build` all pass. The determinism snapshot changed from `0c381894b44017` to `15c9b9a3361bdb`. That's intended: the new default name, the seed money, the launch posture and the move to investment-bank lending all change the scripted run.

**Dependencies:** none added.

**Open items, not blocking.** All four were fixed in v0.1.26 (entry above).

### 2026-10-27 — Stages C8b–C8d: tutorial, art and balance (v0.1.24)

**What changed.**
- **New tutorial (C8b).** Part 1 is now "Seed to first contract", nine steps from the seed round to winning your first enterprise contract:
  1. Find a storefront.
  2. Build a sales office.
  3. Set the Plus price.
  4. Turn on the Standard API.
  5. Hire a manager.
  6. Run a campaign.
  7. Open the doors and read the first weekly results.
  8. Meet the lab on the Company screen: cash, ARR, safety and compute.
  9. Bid on a proposal request at the Deal Desk.

  It should take a new player about 5–8 minutes.
  - Three new guides: Safety & Alignment, Short of compute, and Train our own model. The capital guide is now "Safety is slipping".
  - The first-look tips are rewritten in AI terms.
  - Fixed: a lost bid in the tutorial used to leave you stuck. Another business now asks right away.
- **Art pass (C8c).**
  - Data centers have their own low, wide engraved hall on the map, with chillers on the roof and a transformer yard. Energy sites draw a substation and pylon.
  - The data center screen has a picture with an Outside / Inside switch. Inside shows the GPU racks lit for the GPUs that run, and the cooling you chose.
  - The sales office interior swaps the vault and ATMs for a machine room and demo kiosks.
  - New and redrawn icons.
  - A cooler navy palette with a teal "signal" accent for compute. Text contrast still passes accessibility checks.
- **Balance pass (C8d).**
  - Listed rival labs are now valued on their revenue, like yours: about 1–8× book value instead of near book. Buying one costs more.
  - The two recession checks that read "n/a" now test the safety tier and cash:
    - The aggressive lab must slip to Watch at some point.
    - In a forced recession, the aggressive lab must slip to Watch and keep its cash at $0 or more.
  - Results on seeds 42 and 7: steady, turtle, aggressive and stress meet every target. The 20-city median passes every first-office checkpoint.

**What was checked.** Lint, all tests and the build are clean. The tutorial was walked end to end at phone size with no console errors. The determinism snapshot changed because rival share prices now follow revenue.

**Left for later (noted by the helpers):** some build options still have bank names ("Teller line", "Vault", "ATM"). The browser-tab colour and favicon still use the old navy.

### 2026-10-27 — Stage C8a: power deals at energy sites (v0.1.23)

**What you asked for:** go through C8 and finish the conversion. This is the first part of C8.

**What changed.**
- **Energy sites sign power deals.** The mines, camps and oil fields used to sign payroll partnerships, like any employer. Now they sign a data-centre and power deal: a seven-year contract that works like a partnership, with the same ramp-up curve, health, renewal and release.
  - You pay a signing fee up front: $500 per worker at the site (about $0.6–2.5M). Travel there to sign.
  - The deal brings contracted GPUs that ramp up over two years, to about 1.5 per worker. They join your compute pool as owned capacity, so you buy less at spot.
  - You pay $20 a week for each one, used or not. That's half the spot price, and the price is fixed for the contract.
  - Your data centers in that country pay 25% less for power while the deal runs.
  - Health starts at 60 and heads for 50, or 70 with a data center of yours in the country. A weak safety tier pulls it down. If health stays under 30 for 8 weeks, the site walks away.
- **Where to find it:** tap an energy site on the map. The Power deal card sits above the Energy site section.
- **Old saves:** they get an empty deal book (save schema 18). A payroll deal you already signed at an energy site keeps running.
- **Also fixed:** two incident and news texts showed "{sales office}" instead of the office's name.

**What was checked.**
- New tests: signing, the fee, the GPU ramp into the pool, the bill, the power discount, health, renewal, release and runoff, the payroll block, and the migration.
- All tests pass, and lint and the build are clean.
- The determinism snapshot changed because the save has a new field. The scripted run doesn't sign a deal, so nothing else moved.

### 2026-10-27 — Stage C7b: valuing the lab on revenue (v0.1.22)

**What you asked for:** finish C6, then C7. This is the second and last part of C7.

**What changed.**
- **The lab is valued on its revenue, not its book.** Valuing an AI lab on book value and return on equity made a fast-growing lab almost worthless. The value now comes from your ARR times a multiple.
  - The multiple starts at 3×. Revenue growth adds up to 12 more: doubling revenue in a year adds 6. A model ahead of the market adds 2 per point of quality. The multiple stays between 1.5× and 16×.
  - Book value is the floor. A lab is never worth less than its net assets.
  - While private, investors take 20% off. The IPO offer takes 10% off. Once listed, sentiment and investor relations move the price, as before.
  - The Company screen's share card explains the multiple.
- **IPO rules on ARR.** You need $100M of ARR to list, instead of $25M of equity. The other rules stay: four profitable quarters, Finance cover, a safety tier of Adequate or better, and no recession at home unless the credit ratio is 14% or more.
- **Lobbying becomes AI policy.**
  - "Ease the AI safety rules" lowers every safety tier line by 5 points for a year.
  - "Stall the AI safety bill" makes a pending safety bill fail its vote.
  - "Fast-track a merger review" now reads in market share.
  - The politics bill that raises the lines is now an AI safety buffer.

**Balance.**
- Seed 42 steady still lists in week 209 (year 5). The IPO now raises far more: equity at the end of year 5 is $582M, up from $162M.
- Aggressive and turtle pass every check. The 20-city panel passes every check.
- Rival labs still use the bank-style price for now. They get revenue numbers in the C8 balance pass.

**Checks.**
- New tests cover:
  - the valuation worked examples: flat growth, doubled revenue, the growth cap, a young lab's growth scaled to a year, the book floor and the quality lift;
  - the public target;
  - the ARR rule on the IPO checklist.
- The IPO acceptance test still passes.
- No save changes: v0.1.21 saves load as they are.
- I checked the Company panel at iPhone size with a pause under way: the pause banner, safety meter, credit row and the new valuation note all show, with no console errors. That also covers the phone check C7a left open.
- The determinism snapshot changed as intended.

**Next:** C8, polish and relaunch.

### 2026-10-27 — Stage C7a: the safety ratio and the AI regulator (v0.1.21)

**What you asked for:** finish C6, then move on to C7. C7 comes in two parts; this is the first.

**What changed.**
- **The capital ratio becomes the safety ratio.** It measures how well your Safety & Alignment floor covers the risk your model carries.
  - Staffing the Safety floor raises it. Staff above the requirement add a little more.
  - A model far ahead of the market's bar carries more risk and lowers it; a model with a high Safety score lowers the risk.
  - Tiers run Strong, Adequate, Watch, Restricted, Critical, as before. A policy buffer still raises every line.
- **What the tier does.**
  - A weak tier now slows **all** new customers, not only loans as in the bank game.
  - Data-sensitive businesses on the Deal Desk prefer a lab with a strong record: up to +4 points to win or keep a contract at Strong, down to −8 at Critical.
  - At Critical you pay a fine of 0.5% of a quarter's revenue each quarter.
  - Quarterly safety audits fail more often when your model carries more risk.
- **The mandated pause replaces the bank rescue.** After 8 weeks below 40%, the regulator offers a pause.
  - **Accept:** you pay its monitors (2% of a quarter's revenue, at least $250k). They lift your Safety coverage for 8 weeks.
  - During those weeks there are no new customers, no new deal requests and no training. Existing customers and contracts carry on.
  - If the ratio is still below 40% when the pause ends, the licence is revoked.
  - **Decline, or let the deadline pass:** the licence is revoked.
  - **Revoked:** 26 weeks with no new business, then a year of strict watch, with higher tier lines and twice as many failed audits.
  - **It is never game over.** Only running out of money ends the game now.
- **The lenders' credit ratio stays.** The old capital ratio lives on in Finance and Mergers as the "credit ratio". It decides what lenders and your CFO's buybacks will do.
- **Screens.**
  - The Company panel shows the safety ratio with its tier, plus a credit row.
  - The Safety floor has a "Regulator and safety" section.
  - A banner shows during a pause or strict watch.

**Balance.**
- The Safety floor requirement now grows with ARR rather than loans.
- The scripted steady player now leases a Safety floor on its own before it can afford a full office. It also keeps two weeks of costs back before it expands. Without that, one city in twenty dipped $152k below zero at a quarter end that also brought an audit fine.
- 20-city panel: every check passes. ARR is $4.0M at week 52 and $25.0M at week 260, payback takes 39 weeks, and the lowest cash in any city is $179k.
- Seed 42: aggressive and turtle pass every check. Steady lists in year 5 (week 209). Its first office earns $23.3k a week at week 52, just under the $24k band. The panel's median city is inside the band, so I left it.

**Checks.**
- New tests cover:
  - the ratio and its tiers, strict watch, the deal edge;
  - cutting Safety staff mid-run (worse tier, slower sales, likelier audits, the pause offer);
  - every path through the pause (accept, end, revoke, decline, deadline, restore);
  - the save upgrade.
- Saves from v0.1.20 load: the ratio and tier are set, and an old rescue offer is dropped.
- The determinism snapshot changed as intended.
- Not done this session: a quick check of the new banner and Safety floor section on an iPhone-sized screen. That is still to do.

**Next:** C7b, valuation by revenue multiple, IPO rules and AI policy lobbying.

### 2026-10-27 — Stage C6c: the Chief Scientist and the talent war (v0.1.20)

**What you asked for:** finish C6, then move on to C7. This is the last part of C6.

**What changed.**
- **A ninth executive: the Chief Scientist.**
  - They appear on the Executive floor next to the others.
  - Their expertise makes training runs more likely to turn out well: up to +15 points on the run's score.
  - Their one job switch, **Routine training runs**, runs 12-week runs on the model's weakest score while cash allows. It also switches on a newly trained model when it beats the one in use.
- **The talent war.** There are now 16 named AI researchers, most working at rival labs when the game starts. The Products floor has a new **Research team** card.
  - **Hiring:** someone free costs their salary. Poaching from a rival costs 30% more salary plus a signing bonus of about three months' pay. Your team holds up to 8.
  - **What they do:** your researchers make training runs more likely to go well, twice as much when the run focuses on their specialty. A rival's researchers make that rival's new models better, so poaching one also weakens the rival.
  - **Rivals fight back:** each quarter a rival may try to hire one of yours. You get a **Researcher poached** case: counter-offer (+25% salary) or let them go. Paying above the going rate makes these bids rarer.
  - The training card now shows how much your team and the Chief Scientist add. A rival's HQ panel lists its researchers.

**Balance.**
- With rival researchers adding to every rival release, I trimmed the rivals' base gain (0.22 → 0.18 a release). The frontier now raises the bar at 50% of the rivals' rise instead of 60%.
- That keeps the do-nothing strategy above $0 cash. It loses about $2.5k a week through the year-2 recession, so it's always close.
- 20-city median: ARR $4.3M at week 52 and $24.3M at week 260, payback 39.5 weeks. Every check passes.

**Checks.**
- New tests cover hiring and poaching costs, the team cap, the training-odds lift (and its cap), rival lift, how pay affects poaching, the quarterly market, both answers to the poaching case, the Chief Scientist's lift and job switch, and the save upgrade.
- One older test, on executive share grants, only passed by luck: its "never resigns" executive could still be poached now and then. The new seat changed the dice and the executive left. The test now counter-offers.
- Saves from v0.1.19 load: researchers appear, and Chief Scientist candidates are ready if you have an Executive floor.
- I checked the new cards and the 9-seat executive grid in a phone-sized browser, with no console errors. The determinism snapshot changed as intended.

**Next:** C7, safety, regulation and valuation.

### 2026-10-27 — Stage C6b: training runs and the frontier (v0.1.19)

**What you asked for:** carry on with C6. This is the second of its three parts.

**What changed.**
- **Training runs.** The HQ Products floor has a new **Training run** card.
  - You name the next model, pick what to focus on (Reasoning, Speed, Breadth, Safety or Efficiency), choose how long to train and set a weekly budget (from $20k).
  - It shows the odds of each star result and what each one adds to the model. More money and more time give better odds, as with new products.
  - When the run finishes, the new model appears in **Manage models** as "Trained · Gen N". It doesn't switch on by itself: tap **Use as AI model** (the usual two-week switch).
  - Each star result adds to every score, plus a bit more to the focus. Training from a trained model stacks, so generations keep improving.
- **Rival models.** Every rival lab now has a named model (Wren 2, Lantern 2 and so on). Each quarter some of them release a new generation, and the Ledger reports it, with a bigger story when one takes the lead.
- **The frontier.** As the best rival model gets better, customers expect more. If your model stands still, you slowly lose the ability to charge above market, contracts get harder to win, and the Model rating slips. Training is how you keep up.
- **Leaderboard.** A new card ranks every lab's model by quality, with your row highlighted and a line saying how much more than the market your model lets you charge. A rival's HQ panel shows its current model and when it shipped.

**Balance.** The test strategies now train once they have a Products floor.
- Steady run, seed 42: by year 5 it is on its fifth generation, at 8.0 against the best rival's 8.3.
- 20-city median: ARR of $4.3M at week 52 and $24.3M at week 260, payback in 39.5 weeks. Every check passes.
- At first, rival progress cost a do-nothing lab too much: its cash dipped just below zero in the year-3 recession. So the bar now rises by 60% of how far the rivals climb.

**Checks.**
- New tests cover training odds and lift, a run finishing, stacked generations, pausing, cancelling, validation, rival models, the leaderboard and the save upgrade.
- Saves from v0.1.18 load: every rival gets a starting model and the race starts level.
- The determinism snapshot changed as intended.
- One news test's floor went from 60 commodity wraps in six years to 50, because model stories now fill some quiet weeks.

**Next:** C6c, the Chief Scientist seat and the talent war.

### 2026-10-27 — Stage C6a: the AI model (v0.1.18)

**What you asked for:** run C6 after C5. C6 is big, so I split it into three parts:
- **C6a** (this one): turns the old underwriting model into the lab's AI model.
- **C6b**: training runs, rival model releases and a rising frontier.
- **C6c**: the Chief Scientist seat and the talent war.

**What changed.**
- **The model's five scores** are now **Reasoning, Speed, Breadth, Safety and Efficiency**. They reuse the old bank scores' slots and numbers, so nothing jumps when you load a game.
- **Data vendors replace credit bureaus** on the map and in the Layers sheet.
  - The data you mix is now training data: Web Crawl, Licensed Books & Papers, Forum & Social Data, Customer Feedback and Red-Team Data.
  - The ready-made packages have new names, such as Clearline Web Base (the starting model) and Sentinel Guardrails.
- **What a better model does** (new):
  - **Efficiency** cuts the compute behind every customer: 5% less per point above 7.
  - **Quality**, the average of the five scores, lets you charge more. Each point above the starting model lets prices sit 4% over market before customers balk.
  - **Quality also wins contracts:** +5% win and keep chance per point on the Deal Desk.
  - **Safety** matters to businesses with sensitive data, such as hospitals and banks. A safe model wins them more often; an unsafe one loses them.
  - It still lifts the Model rating (Speed lifts Service, and Safety now guards against fraud).
- **Data licences cost money again.** The old "cost per application" had stopped mattering when loans went away. It is now a **licence per customer a year** ($12 for the starting model, up to $26 for TrueMark Complete), charged weekly.
- **Customer Feedback** now unlocks at 5,000 customers instead of loans booked, and gets smarter as you grow (best at 50,000).
- The CPO's automatic model switch now weighs quality against licence cost.
- The HQ Products floor's AI model card has a **What it does** block showing compute per customer, price headroom and the licence.

**Why the starting model shows "0%".** I set the starting package exactly on every reference point, so a new game plays the same as before. All of the gain comes from upgrading the model. The training runs in C6b are where that gets exciting.

**Old saves.** Schema 13 → 14. The old cost per application is multiplied by 10 into the new licence per customer, and ready-made models take their new names.

**Balance.** The 20-city median passes every checkpoint (week 52 ARR $4.3M, week 260 ARR $25.8M, payback 39.5 weeks). The aggressive and turtle strategies stay above zero cash. The licences cost the steady run a little profit, and income at week 260 stays inside the target band.

**Tests.** New `modelEffects.test.ts` covers:
- the neutral starting model
- Efficiency cutting an office's compute bill
- price headroom
- the Model rating lift
- contract chances with Safety and sensitive data
- weekly licence charges
- the migration

The model tests now check licences per customer and the Customer Feedback gate. The Deal Desk formula tests pin data sensitivity at 5 so the model's Safety doesn't move them.

**How I worked.** I wrote the simulation. A helper relabelled the screens (the data vendor panel, the model card, the Mix editor and the map captions) and checked them at iPhone size with no console errors.

**Checks.** `npm run lint`, all tests and `npm run build` pass. The **determinism snapshot** moved from `19488695a0bca7` to `03e826dfac25bd` (intended: licences are charged and the CPO's model choice changed).

**Next:** C6b, training runs. You put the Products team to work training a new model generation. Rival labs release their own models, and the frontier keeps rising, so a model you don't update slowly falls behind.

### 2026-10-27 — Stage C5b: the Deal Desk (v0.1.17)

**What you asked for:** finish C5, then go on to C6, with subagents allowed to help.

**What changed.**
- **The Loan Desk is gone; the Deal Desk replaces it.** The sales office tab is now **Deal Desk**. Businesses with no AI vendor send your office **requests for proposals (RFPs)**. More come when the business is keen on AI and your office is well known. Each request waits three weeks.
- **Bidding.** On a request card you pick a **discount** off the business's yearly budget, see the contract value and your chance of winning, and press **Bid** or **Decline**. Your chance is better with a bigger discount and better stars than the best rival lab in town, and better still with no rival at all. A business you lose or turn down won't ask again for a quarter.
- **Contracts pay every week.** A contract adds its value to your ARR and pays a 52nd of it each week. Running it costs some compute and some service time.
- **The renewal season (your decision A7).** Every contract renews at a quarter start. Four weeks ahead it shows up under **Renewals due**:
  - **Your own contracts:** you set the renewal discount and see your chance of keeping it.
  - **A rival's contracts:** you can switch on **Make an offer** to try to take it.
  - At the quarter start everything due is settled at once. Rival labs also sign some businesses that have no vendor.
- **Losing a contract mid-term** happens only two ways, as you decided: the business fails (more likely in a downturn, and a new business then moves into its storefront), or it walks out during a compute outage.
- **Discount limit and delegation.** Each office has a **discount limit**. When the office manager (or a seated CRO, under the renamed **Deal Desk policy**) runs the desk, they bid within that limit and only when the odds are decent.
- **Elsewhere:**
  - The Enterprise contracts product card shows contracts, contract ARR and requests waiting.
  - Business cards say "Your contract" when you hold it, and point to an open request.
  - News stories cover big wins (and who you won them from) and big losses.
  - Tutorial step 7 is now **Win your first contract**.
  - The company trend chart lost its old lending line.
  - Leftover bank wording ("lending fund", "Loan Desk loans") is gone.

**Balance.** The first run put Calgary's week-26 ARR at $7.2M against a $1–2.5M target: business budgets were far too big. I cut them about five-fold (small $6k, mid $25k, large $90k, anchor $360k base) and rounded them to $100. I then raised the request rate from 0.04 to 0.07, because the UI check showed a single office getting only one to four requests in 30 weeks. Seed 42 steady passes every checkpoint (week 52 ARR $3.8M, week 260 $22.8M). The 20-city median also passes everything (week 52 $4.3M, week 260 $25.1M, payback 39 weeks).

**Old saves.** Schema 12 → 13:
- Any business loans still on the books are repaid into treasury reserves.
- Budgets and contract values are scaled down to match.
- The desk tally is renamed (approved → won, refused → lost).
- Each office gets the default discount limit.

**Tests.** New Deal Desk tests cover:
- requests arriving (and not while the product is off or the business is cooling down)
- the win, keep and request formulas
- bidding, declining, renewals and rival offers
- failures and outage losses
- closing or merging offices
- the migration

Some older tests were rewritten (the recession test now checks business failures instead of loan defaults). One test-only change to know about: the scripted 260-week determinism run used to rely on Loan Desk interest, and without it the run went broke after the week-80 HQ lease. The script now adds $5M of paid-in capital so it keeps going, and the test also checks it never hits game over. Three tests that compared ARR now leave contracts out, because a few big lumpy contracts were drowning out what they check.

**How I worked.** I wrote the simulation myself. Two helpers ran alongside: one built the Deal Desk screens and checked them in the browser at iPhone size (no console errors), and one fixed and wrote the tests. I reviewed and merged their work.

**Checks.** `npm run lint`, all 935 tests and `npm run build` pass. The **determinism snapshot** moved from `1897f86dd7744b` to `19488695a0bca7` (intended: contracts replace loans).

**Next:** C6, the AI model: its five-point profile, data vendors, training runs, rival model releases and the Chief Scientist.

### 2026-10-27 — Stage C5a: customer businesses on the map (v0.1.16)

**What you asked for:** start C5. C5 is big, so I split it like C4: **C5a** puts the businesses on the map (this one), and **C5b** adds the Deal Desk that lets you win and lose their contracts.

**What changed.**
- **Businesses on spare storefronts.** When a city is made, about half of each district's free storefronts become named businesses (for example "Meridian Health" or "Ashgrove Hotel"). Every district keeps at least one storefront free, so you can still open offices and data centers anywhere. A business holds its storefront for good: it isn't for lease.
- **Employers are anchor accounts.** Each employer (City Hall, the hospital, the port…) is now also a big customer, with a budget that grows with its headcount (around $1–4M a year).
- **Each business has:** a sector (12, from cafés to finance), a size (small, mid-size, large), a yearly AI budget, and a five-point profile: AI readiness, Budget, Data sensitivity, Switching cost and Financial health. The Deal Desk will use these in C5b.
- **Rivals already serve some.** In a city with rival labs, about half the businesses (and 70% of anchors) start on a rival's contract, worth 70–100% of their budget. A rival that held an employer's payroll deal holds its AI contract too.
- **The renewal season.** Contracts come up at the start of a quarter, as you decided (A7). For now a due contract simply renews with the same lab; a lab that has left the city loses it, and a lab bought by another hands its contracts to the buyer. C5b turns this into real bidding.
- **On the map:** the Employers layer is now **Businesses**. Each business has a teal handshake pin, captioned with its lab's short name. Its storefront wears an **awning in its lab's colours**, and in yours once you win it (with your seal on the pin). Tapping a pin opens the new **business panel**: budget, vendor, contract, renewal month and the profile. An employer's panel shows its anchor account too.

**Old saves.** Schema 11 → 12. Every city you've already visited gets its businesses from its own random stream, on the storefronts that are still free. A test checks a migrated city gets exactly the businesses a new one would.

**Balance.** All 20 cities still pass every checkpoint, and seed 42 steady passes all of its own. The aggressive test strategy's cash dipped to −$475k: with fewer free storefronts it built on different lots and ran its cash to zero right before a tick. It now keeps three weeks of running costs before it expands, like a sensible player, and its low is +$86k (seeds 7 and 99 are +$83k and +$79k). Rivals still count business storefronts as room in a city, so their growth is unchanged.

**Tests.** New `businesses.test.ts`: businesses per district (one storefront always free), anchors for every employer, rival contracts renewing at a quarter start, the same businesses whatever order you visit cities, the renewal season, and the migration. `mapPins.test.ts` checks the business pins, awnings in the vendor's ink and the layer switch.

**Checked in the browser** at iPhone size: business pins on the map, the business panel and the Layers sheet. No console errors.

**Checks.** `npm run lint`, all tests and `npm run build` pass. The **determinism snapshot** moved from `031bda2c522626` to `1897f86dd7744b` (intended: businesses take storefronts and draw from their own streams).

**Next:** C5b, the Deal Desk: businesses send requests for proposals to your sales office, you sign contracts at a price, and at each renewal season they stay, leave for a rival or go without.

### 2026-10-27 — Stage C4c: spot limits, capacity crunch and outages (v0.1.15)

**What you asked for:** keep rolling. This finishes the compute stage (C4).

**What changed.**
- **Clouds only sell so much at spot.** Each week there's a spot limit. It grows with how much you've been buying, shrinks in a chip shortage, and never goes past 20,000 GPUs. A big lab has to own data centers or reserve GPUs.
- **Emergency burst.** If you need more than the limit, the game buys "burst" GPUs on top, at 1.6× the spot price. For four weeks after that, GPU offers on the market cost 8% more (cloud providers have noticed you're desperate).
- **Capacity crunch.** If even burst isn't enough, customers you can't serve go unserved and **new sign-ups go on a waitlist** (no new plan seats or API customers).
- **Outages.** After three weeks of crunch, the lab starts having outages: customers leave almost twice as fast until two weeks after the crunch ends.
- **Auto spot-buy** is a new switch on the Compute floor. On (the default), the game buys spot and burst for you. Off, you run only on your own and reserved GPUs, and any shortfall goes straight on the waitlist.
- **You'll hear about it:** news stories, a toast, a red item in the attention list, a banner on the Compute floor, a "Waitlist" or "Outage" badge on the Compute card, and the Compute lead's advisor line.
- **How offices pay for compute changed.** Each office is now charged today's spot price for every GPU it uses, whether the GPU came from spot, a reservation or your own data center. The company then books the difference to what the lab really paid. This is the "funds transfer pricing" idea from the bank game. Office P&Ls stay comparable, and the savings from cheap reservations and data centers show up in the company's compute line. The Compute card's new "Pool cost vs spot" row shows the saving (for example 80% means you're paying 20% less than spot).

**Old saves.** Schema 10 → 11. Auto spot-buy starts on, and the spot limit starts high enough to cover what the save already buys, so nothing breaks the week you load. A test checks it.

**Balance.** The test strategies now reserve GPU lots once they use more than 60% of their spot limit, like a sensible player. With that, all 20 cities pass every checkpoint, and seed 42 shows the same single-city warnings as before. The aggressive strategy's cash no longer goes negative (its low is +$20k; in C4a it dipped to −$546k), because reservations are cheaper than spot. I also ran the same strategies with the GPU market emptied every week: they hit the 20,000 ceiling in year 4 and spend most of the rest of the game in crunch and outage. That's the C4 goal: "growing without buying compute visibly causes waitlists, then outages".

**Tests.** New `spotLimits.test.ts`:
- the limit's growth, shortage cut and ceiling;
- how demand splits into spot, burst and unserved;
- a crunch blocks new sign-ups, turns into an outage that raises churn, and then clears;
- burst stigma;
- offices pay spot and the pool books the cost;
- the migration.

`compute.test.ts` and `gpuMarket.test.ts` were updated for the internal charge.

**Checked in the browser** at iPhone size with a save in outage: the banner, the badges and the new rows. No console errors.

**Checks.** `npm run lint`, all 894 tests and `npm run build` pass. The **determinism snapshot** moved from `15dc2a49f9c8bf` to `031bda2c522626` (intended: offices pay the internal charge and the pool settles).

**Next:** C5, businesses and the Deal Desk: companies on the map that sign contracts with you or with rivals.

### 2026-10-27 — Stage C4b: the Compute floor and GPU lots (v0.1.14)

**What you asked for:** keep rolling. This is part 2 of the compute stage.

**What changed.**
- **The Treasury floor at HQ is now the Compute floor** (server icon). Its advisor, lesson card and description talk about GPUs now.
- **A GPU market.** Every two weeks, fictional GPU clouds (Northbeam Cloud, Stratus Forge, Ironleaf Racks and others) offer reservations: 6 months, 1 year or 3 years. Longer terms are cheaper: about 10%, 18% and 28% under today's spot price. A fuller Compute team brings more offers, and a short-staffed one pays up to 10% more.
- **Renting GPUs.** Slide how many GPUs you want (50 or more) and tap Rent. Rented GPUs cover your customers' demand right alongside your data centers, so less is bought at spot. The catch: you pay every week of the term **whether you use them or not**, and you can't cancel. It's a bet on the chip market: lock in before a shortage and you save a lot; lock in before a glut and you overpay.
- **The floor shows:** the Compute card (now with a "GPUs rented in lots" row), your rented GPUs (total and weekly bill, then a card per reservation with its end date), and the market.
- **The old bank cards** (liquidity, funding market, central bank) are hidden unless an old save still has deposits or bank borrowing.

**Old saves.** Schema 9 → 10 adds an empty GPU market and no rentals. A test checks it.

**Balance.** The test strategies don't rent GPUs, so nothing moved: all 20 cities pass, and seed 42 shows the same six single-city warnings as before.

**Tests.** A new `gpuMarket.test.ts`: offers need the floor and are priced and sized as documented; renting checks the floor, offer and size, adds capacity at once and cuts the spot bill; a lot is billed exactly its term, then retires, with the books balanced; the migration.

**Checked in the browser** at iPhone size: the Compute tab, the pool card, a rented lot and the market's offer cards with the GPU slider. No console errors.

**Checks.** `npm run lint`, all 888 tests and `npm run build` pass. The **determinism snapshot** moved from `19f47039dbab9d` to `15dc2a49f9c8bf` (intended: the game state now holds the GPU market).

**Next:** C4c. Spot compute gets a limit, with an emergency burst at a premium; demand beyond capacity builds a waitlist; and outages arrive.

### 2026-10-27 — Stage C4a: the compute price index and compute pool (v0.1.13)

**What you asked for:** keep rolling after C3c. C4 (compute) is big, so like C3 it's split into three parts. This is part 1.

**What changed.**
- **Compute has a market price.** A "chip cycle" moves a compute price index up and down, the same way the economy moves through booms and recessions. There are three moods: a chip glut (compute about 20% cheaper), normal times, and a chip shortage (about 30% dearer). Each lasts at least a quarter, usually a year or so.
- **Your offices' compute is now counted in GPUs.** At normal prices one GPU-week costs $40. A young office uses a few hundred GPUs; a big lab uses tens of thousands.
- **Data centers finally pay off in money.** The GPUs running in your data centers serve your customers first. You only buy the rest at the spot price. Before this, a data center only gave nearby offices a Service boost. A data center still pays its power bill and rent whether or not its GPUs are busy, so building one far bigger than your demand costs more than it saves.
- **A new Compute card** on the Company screen, and on every data center's panel, shows:
  - the spot price per GPU-week, with a badge for the chip mood
  - a two-year price chart
  - the GPUs your customers used last week and the GPUs in your data centers
  - how much of the demand your own GPUs covered, and what the rest cost at spot
- The Company screen's "How this works" sheet gets a short "own it or rent it" explainer.

**How the price is applied.** Each office's compute bill is worked out as before, turned into GPUs, then charged for only the part your data centers didn't cover, at today's price. It uses last week's totals for the "covered" share, because this week's total isn't known until every office has run.

**Old saves.** Schema 8 → 9. Saves start in a normal chip market at a price index of 1 with an empty chart. A test checks it.

**Balance.** Across 20 cities, every office checkpoint still passes except one that now lands just under its floor: the median office's week-52 income is $24.5k a week against a $25k floor (it was $25.1k). That's compute-price wobble of a few percent, so I lowered that floor to $24k and wrote down why in SIMULATION §25. Week 260 ARR is $23.5M, payback 42.5 weeks, and cash stays above zero in every city. Seed 42 aggressive dips lower than before (−$546k in week 169), but that happens during a cheap-compute glut, so it's the strategy taking a different expansion path, not compute prices biting.

**Tests.** A new `compute.test.ts`:
- the price index stays in bounds and moves between moods, the same way every run;
- an office pays spot × index when it owns no GPUs;
- a data center's GPUs cover a young office completely, taking its compute bill to zero;
- the migration.

**Checked in the browser** at iPhone size with a save that has a data center: the Company screen's Compute card (chart, rows, a "Chip shortage" badge). No console errors.

**Checks.** `npm run lint`, all 883 tests and `npm run build` pass. The **determinism snapshot** moved from `0b4f2c7e9da8e8` to `19f47039dbab9d` (intended: compute now follows the price index).

**Next:** C4b. The HQ Treasury floor becomes the Compute floor, the funding market sells GPU lots (rented capacity for a fixed term), and a headroom gauge shows capacity against demand, with an emergency burst option.

### 2026-10-27 — Stage C3c: the last bank machinery goes (v0.1.12)

**What you asked for:** "Finish C3c, roll on with it." This is the last part of C3: clearing out bank features an AI lab has no use for.

**What's gone.**
- **Foreclosed homes.** They came from unpaid mortgages, and the lab has none. The Company → Real estate card now lists only the buildings you own.
- **Government bonds.** The treasury no longer buys bonds with part of its reserves. The HQ Treasury floor loses the Bonds card and the "Bond share" slider, and the balance sheet loses the "Unrealised bond gains" line.
- **Covered bonds.** This funding-market offer needed mortgages as security, so it could never appear any more. Term Interbank is the one market offer now.
- **The HQ "Transfer cash to Treasury" card.** The Loan Desk tab's lending fund button does the same job, so there's now one place to do it. Behind the scenes the command is renamed `topUpLendingFund`.
- **Old bank code.** The savings, term-deposit, mortgage, credit card, wealth, safe-box and FX paths in the office books, the rivals' savings and mortgage price offsets, and about 15 bank-only tuning numbers.
- **The $2M charter floor.** Before, if the company's equity dipped under $2M, the regulator badge jumped to Critical whatever the capital ratio said. Now the badge follows the ratio alone. The capital rules get a full rework in C7.

**Kept on purpose.** The "Compute Allowance" staff benefit still has the internal id `mortgage_disc`, because saves remember benefits by id. Its stepper now says "discount on compute". A few income-statement lines that nothing posts to any more (bond coupons and similar) stay at zero so old weekly records keep their shape.

**Old saves.** Schema 7 → 8. Any foreclosed homes are sold into company cash at their value. Any bonds are sold into treasury reserves at market, and their gain or loss moves into retained earnings so equity doesn't change. Any covered bond loans become Term Interbank loans. A new test builds an old save holding all three, loads it, checks equity is unchanged and plays on 4 weeks.

**Balance.** Basically unchanged, as expected, since a new lab never bought bonds or foreclosed homes. Across 20 cities (median city), every office checkpoint passes. ARR at weeks 26 / 52 / 104 / 156 / 208 / 260 reads $1.5M / $3.4M / $9.8M / $17.0M / $20.5M / $22.9M, payback is 42.5 weeks, and cash stays above zero in every city. Seed 42 steady gives the same six single-city warnings as main, and $1.0B ARR in year 10. Aggressive still dips under zero cash on seed 42 (−$71k at its lowest, a little better than before).

**Checks.** `npm run lint`, all 879 tests and `npm run build` pass. The **determinism snapshot** moved from `12083e8011b7b4` to `0b4f2c7e9da8e8` (intended: without bonds, all reserves earn the reserve rate).

**Next:** C4, compute. Treasury becomes the Compute floor, with GPU lots, a compute price index, a headroom gauge and outages when you outgrow your capacity.

### 2026-10-27 — Stage C3b: compute, AI statements and the lending fund (v0.1.11)

**What you asked for:** "resume your task in the game". This is part 2 of C3: how the money is counted.

**What changed.**
- **Compute is a cost line.** Every plan seat and every million API tokens costs compute to serve. That cost now shows as **Compute** on each office's income statement and the company's, instead of being mixed into "servicing".
- **Office income statements read like a lab's.**
  - Revenue lines: Plans, API, Apps & services, Loan Desk interest, Other income.
  - Expenses start with Compute, then the running costs (staff, rent, marketing and so on).
  - The bank's "deposit funding credit" and "loan funding charge" are gone. They were internal bookkeeping between branches and the treasury, and an AI lab has no deposits to fund.
- **The company income statement** goes Revenue → Compute → **Gross profit** → operating costs → net income.
- **A simpler balance sheet.** Lines a lab doesn't use (deposits, wholesale funding, bonds, foreclosed homes, bond gains) only appear if an old save still has something in them. The Company screen's totals show ARR, the lending fund and Loan Desk loans instead of deposits.
- **The Loan Desk has a lending fund.** Loans are paid from your treasury reserves (a new lab has about $1.4M there), and repayments flow back in. The Loan Desk tab shows how much is in the fund and has an **"Add $250k from company cash"** button. If a loan is bigger than the fund, it can't be approved until you top it up. Before this, lending quietly borrowed from the central bank once the money ran out.
  - I first tried lending straight from company cash. In testing, a manager approving loans lent the lab's cash down to almost zero in six months, so a separate fund is safer.
- **Words.** The office Finance tip now explains the lab's statement. Customer reviews talk about plans, the API, support and the office instead of mortgages and tellers. The Company screen's tips explain revenue and compute, and the lending fund.

**Old saves.** Schema 6 → 7. Old office statement rows are moved onto the new lines, and every past week gets a zero Compute line. Any overnight or central bank borrowing is paid back from reserves, then cash. Equity doesn't move, and a new test checks an old save loads, balances and keeps playing.

**Balance.** Across 20 cities over 6 years (the median city), every office checkpoint passes. ARR at weeks 26 / 52 / 104 / 156 / 208 / 260 reads $1.5M / $3.4M / $9.8M / $17.0M / $20.5M / $23.1M, payback is 42.5 weeks, and cash never goes below zero in any city. Seed 42 steady still reaches $1.0B ARR by year 10. The aggressive strategy dips below zero cash on seed 42 (−$112k at its lowest); it already did on main (−$54k), so this isn't new, and it's the strategy meant to push limits. The balance script's NIM column is now GM (gross margin), which runs about 70%.

**Tests.** Two multi-country tests checked the old funding charge; they now check that a US rate rise moves only New York's Loan Desk rates. A loss-record test and the three-country test top up the lending fund first. One new migration test.

**Checked in the browser** at iPhone size with a week-30 save: the office Finance tab (new lines), the Loan Desk tab (lending fund card and button) and the Company screen (totals, income statement, balance sheet). No console errors.

**Checks.** `npm run lint`, all 885 tests and `npm run build` pass. The **determinism snapshot** moved from `02c9cc6ca6a823` to `12083e8011b7b4` (intended: compute line, lending fund, new review lines).

**Next:** C3c removes the leftover bank machinery (foreclosed homes, bonds, the old deposit and loan book code, the treasury transfer).

### 2026-10-27 — Stage C3a: the AI product catalog (v0.1.10)

**What you asked for:** "go for C3". C3 is the biggest stage, so it's split into three parts that each ship on their own. This is part 1: what your offices sell.

**What changed.**
- **New products.** The bank products are gone. Each office's Products tab has three groups:
  - **Plans:** Free Tier, Plus, Pro, Team and Campus plans, billed per seat each month.
  - **API:** Standard, Batch and Fine-tuning API, priced per million tokens.
  - **Apps:** Code Assistant, Agent Studio, Creative Suite and Priority Support.
  - Some Free Tier users upgrade to Plus each week.
- **ARR is the headline number.** A product's figure is now its **ARR** (annual recurring revenue). For a plan that's seats × price × 12; for usage, it's a year of usage at today's price. Each week an office earns 1/52 of its ARR. ARR now shows on:
  - the product cards, the office's Finance tab and the Sales offices list (you can sort by ARR or Customers);
  - the Products floor trend, which shows ARR and lending.
- **Product cards** say "Price", "New seats" or "New sign-ups" and "Cost per seat" or "Compute cost". The category switch reads Plans / API / Apps so it fits on a phone.
- **What else follows the new products:**
  - **Rivals** set plan and token prices, and the rival screen shows a "Price sheet".
  - **Price wars** now cut rival plan prices.
  - **Incidents:** a bank run's "raise" option cuts your plan prices, and fraud hits the API.
  - **Partnerships** sign staff or student plans that earn ARR.
  - **Buying a rival** brings its customers over as plan seats.
  - **New ideas:** the Products floor offers 16 fresh product templates (Golden Years plan, Enterprise, Realtime API, Voice Companion and more).
  - **The tutorial** now asks you to set the Plus price and turn on the API.
- **Not changed yet (on purpose).** The Loan Desk, the balance sheet, capital tiers and the treasury still work the bank way. C3b and C3c replace them, so some advisor tips still mention deposits.

**Old saves.** Schema 5 → 6. The migration settles each office's old bank books into cash (deposits are paid out of reserves, loans are sold) and starts every office's old customers on Free Tier. Old bank developments, prices and effects are cleared. A new test checks that an old save loads, balances to the cent and keeps playing.

**Balance.** Checked across 20 cities over 6 years (the median city):
- Every office checkpoint passes. ARR at weeks 26 / 52 / 104 / 156 / 208 / 260 reads $1.6M / $3.7M / $10.8M / $17.7M / $20.8M / $23.8M.
- Weekly revenue and income stay inside the old bands.
- Cash never goes below zero in any city.
- Two targets changed, with the reasons in SIMULATION §25:
  - **Payback** is now 44 weeks or less (was 40). A subscription office has to build up seats before it earns, so the median reads 41.5 weeks. Lower churn and faster upgrades didn't move it without one city running out of cash.
  - **The aggressive and stress tier checks** read n/a until C7. A lab with no deposits barely binds on bank capital, so those bank tiers no longer mean much.
- Seed 42 steady reaches $1.0B ARR by year 10 and lists in week 209.

**Tests.** About 55 tests that used bank products were moved to the new products. Bank-only mechanics that no longer apply were narrowed rather than removed (the list is in the PR). The CFO capital and governance tests now use a scenario that suits a lab.

**Known for C3b.** With no deposits, Loan Desk lending is now funded from the central bank window. C3b fixes this when revenue moves to corporate cash and the Loan Desk gets its own funding. Some customer reviews and the Finance tab's first-look tip still mention mortgages and deposits; they'll be reworded with C3b.

**Checked in the browser** at iPhone size: a week-30 save loaded through Load (Products: Plans and API tabs; Finance: ARR), with no console errors.

**Checks.** `npm run lint`, all 884 tests and `npm run build` pass. The **determinism snapshot** moved from `08cc5af209932f` to `02c9cc6ca6a823` (intended: the new catalog).

**Next:** C3b, when you say go.

### 2026-10-26 — Stage C2d2: main offices and per-office prices (v0.1.9)

**What changed.** This finishes C2.
- **Main offices:** you can now lease at most **two** HQ buildings, and the second has to be in **another country** from the first. It adds floors (and desks) for your HQ teams. The Office for lease screen says why when you can't lease one. If an older save already has more offices, it keeps them.
- **Company-wide prices with overrides:** when "Apply rates to all sales offices" is on at HQ, every office uses HQ's prices and lineup, as before. New: each office's Products tab has a **Set prices here** switch. Turn it on and that office keeps its own prices and lineup (it starts from HQ's, so nothing jumps); HQ changes skip it. Turn it off and it follows HQ again.
- **Marketing** already worked this way (brand campaigns at HQ for whole cities or countries, plus each office's own campaigns), so it didn't need changes.
- **Saves:** schema 4 → 5. Old saves have every office following HQ, same as before.

**Checks.** `npm run lint`, all tests (3 new) and `npm run build` pass. Balance results are unchanged (seed 42 steady still shows its old single-seed payback warning). The **determinism snapshot** moved from `0024151388b688` to `08cc5af209932f` (intended: saves now carry the new per-office switch).

**Next:** C3, when you say go.

### 2026-10-26 — Stage C2d1: "sales office" on screen, new map layers (v0.1.8)

**What you asked for:** "go for next pls", stage C2d. I split it in two so each part is small enough to check: this is part 1 (the words and the map). Part 2 (main offices, company-wide prices) comes next.

**What changed.**
- **Words:** everywhere the game said "branch" it now says **sales office** (and "office manager" for the person who runs one). That's about 230 bits of text: panels, news stories, incidents, the tutorial, the advisor tips and error messages. The code underneath still calls them branches, so your saves are untouched.
- **Map layers:** the Layers sheet now has 16 toggles. **Sales Offices** is the old Branches toggle. **Data Centers** is new, so you can hide or show your data centers on their own. **Energy Sites** is new: the remote regional sites (like Athabasca Sands Camp) now have an amber lightning-bolt pin of their own instead of looking like ordinary employers.
- The map key's first row now says "Labs" instead of "Banks", and the takeover screen lists "Labs" for sale.

**Checked in the browser** at iPhone size: the Layers sheet and the map with a data center, no console errors.

**Checks.** `npm run lint`, all tests and `npm run build` pass. No save change, and the determinism snapshot didn't move.

**Next:** C2d2: at most two main offices (the second in another country), and company-wide prices set at HQ with per-office overrides.

### 2026-10-26 — Stage C2c: data centers (v0.1.7)

**What you asked for:** "go on next then", the third part of C2.

**What changed.** You can now build **data centers**, a second kind of building beside your sales offices.
- **Where:** on any free storefront (tap it: there's a new **Build data center** button under Build branch), or at a regional energy site such as Athabasca Sands Camp (open the employer: there's a new **Energy site** section). Energy sites have cheap land and half-price power, and room for 3 data centers each. You build in the city you're in, like branches.
- **Three parts:** a **GPU hall** (how many GPUs it holds, and an 8–16 week fit-out), a **power feed** (how many of those GPUs it can actually run) and **cooling** (how efficient it is, which sets the power bill). The cheapest build is about $5.3M.
- **Running costs:** rent every week, plus a power bill once it's running (about $34k a week for the cheapest one in Calgary).
- **What it does for you now:** your sales office in the same city gets **+0.25 Service stars** (faster answers for customers), and offices within 1,200 km get +0.1. In stage C4 its GPUs will also power your models.
- **Its own screen:** status, GPUs running, PUE, an **Upgrade** button for each part (a bigger hall takes it offline for half its fit-out) and **Close**. It shows on the map with your crest, on the city list, and in a new Data centers list under Branches.
- **Two new milestones:** first data center and three data centers.
- **Saves:** schema 3 → 4. Old saves just start with no data centers.

**Why some choices.** Power is only charged once the hall is running, so you don't pay for idle machines during fit-out. Data centers reuse storefront lots, so they sit on the map just like offices.

**Balance.** The test players (steady, aggressive and stress) now build one data center once they're well off (from year 5). Every strategy target passes and the 20-city median is inside every checkpoint. Seed 42 steady still shows its old single-seed payback warning (42 weeks); the median is 36.5.

**Checked in the browser** at iPhone size: storefront button, build screen, part picker, data-center panel, the map pin and the energy-site section, with no console errors.

**Checks.** `npm run lint`, all tests (9 new for data centers) and `npm run build` pass. The **determinism snapshot** moved from `0130bc2385365b` to `0024151388b688` (intended: saves now carry the data-center table).

**Next:** C2d (main offices, "sales office" on screen, map layers), when you say go.

### 2026-10-26 — Stage C2b: rival sales offices (v0.1.6)

**What changed.** Rival labs now play by the same map rule as you: **one sales office per lab per city**, each with a size (Starter to Flagship).
- **On the map** you'll see one pin per rival per city instead of a cluster of branches. Tapping it shows "a large sales office", for example.
- **Same strength as before.** A rival's Standard office does the business of the two or three branches it replaced. Its deposits, costs, prices and pull on customers all count by size. At the start of a game the rivals have exactly the same quality as before.
- **Rivals grow offices** a size at a time instead of opening branches, and shrink an office after months of losses before they ever close one. The Inference reports both.
- **Mergers and failures:** when one lab buys another, or a failed lab's network is shared out, offices in the same city merge into one bigger office.
- **Buying a rival** gives you their office at its size, with a lease to match.
- **Saves:** schema 2 → 3. Old saves fold each rival's branches in a city into one office.

**Bug caught on the way.** When a new city was generated, rivals were placed before the city's lots were registered. It didn't matter before, but folding branches into one office needs to free the spare lots, so the lots are now registered first.

**Balance.** Every strategy target passes (steady, aggressive, turtle, nohq, stress, idle) and the 20-city median is inside every checkpoint. Seed 42's own first-office payback reads 42 weeks against the 40 target. That is a single-seed reference figure (the target is judged on the median, which is 36.5), caused by rival price weights rounding to four sizes.

**Checks.** `npm run lint`, all 868 tests and `npm run build` pass. The **determinism snapshot** moved from `192038a7c018ae` to `0130bc2385365b` (intended: rivals are now offices).

**Next:** C2c, data centers.

### 2026-10-26 — Stage C2a: one sales office per city (v0.1.5)

**What you asked for:** "C2 is a go". C2 is big, so I split it into four parts (C2a–C2d, see CONVERSION_PLAN). This is the first.

**What changed.**
- **One sales office per city.** You can no longer put several branches in one city. You open one office there and **grow it**: Starter → Standard → Large → Flagship. The new "Office size" card on a branch's Finance tab shows the next size, what it costs (fit-out plus lease deposit) and the new weekly rent, with a **Grow office** button.
- **Bigger office, bigger reach.** Each size reaches more of the city's customers, up to how big the city is. A small city gets nothing from a Flagship, and the game tells you so.
- **HQ load counts office size.** A Standard office counts as two Starters when the game works out how many HQ staff you need.
- **Taking over a rival** folds their branches into your office in that city, which grows it to hold them.
- **Closing an office** moves its customers to your nearest other office: same city first, then the closest city.
- **Milestones** are now First sales office, First Flagship and Five Flagships. The City list says "Large sales office" or "No sales office yet".
- **Saves:** schema 1 → 2. Old saves load with every branch as a Starter office.

**Balance.** Steady on seed 42: 20 cities and an IPO in week 235, with every target met. The median of seeds 1–20 is inside every checkpoint. Aggressive, turtle, nohq, stress and idle all pass. The turtle strategy (deposits only) went into the red once it could grow, so it now stops at a Standard office.

**Checks.** `npm run lint`, all 862 tests and `npm run build` pass. The **determinism snapshot** moved from `0d03bb5a89221d` to `192038a7c018ae`. That change is intended: the scripted test game now grows its office instead of opening a second branch in the same city.

**Next:** C2b.

### 2026-10-26 — The CREO becomes the CIO (v0.1.4)

**What you asked for:** settle the CREO question with a pop-up. You chose "rename, same job" and asked me to look at a new AI-specific executive too.
- **What changed:** the eighth executive is now the **Chief Infrastructure Officer (CIO)**. Same job as before: setting rents and buying buildings. I didn't use "Chief Facilities Officer" because its short form would be CFO, which the finance chief already uses. Behind the scenes the seat keeps its old id, so your saves are untouched.
- **The new AI role:** a **Chief Scientist** as a ninth seat is now in the plan for stage C6. It needs training runs to exist before it has anything to improve, so it can't usefully come earlier.
- **Checked:** lint, tests and build. The determinism snapshot is unchanged (only the title on screen changed).

### 2026-10-26 — Stage C1c: The Weekly Inference (v0.1.3)

**What you asked for:** keep going after C1b.

**What C1c changed.** Text only; ids, numbers and the save shape are untouched.
- **The newspaper is now The Weekly Inference** (decision A10, an invented name). The menu entry, archive, masthead, tutorial and tips say The Inference. Its tab that was Banking is now **AI**.
- **Market indices:** the Ledger Composite and the ten country indices are now the Inference Composite, Inference US Composite and so on.
- **Incident stories** match C1a's incidents: server-room break-ins, heatwaves, API key leaks, and staff who "downed laptops".
- **News stories** say "the lab" where they mean a company (about 50 phrases), and conference stories point to the conference on the map.

**Left for later:** stories about loans, deposits and capital stay bank-flavoured until C3/C4, and the stories on the AI tab are still about rival lenders until C6 brings the benchmark leaderboard.

**Checks.**
- `npm run lint`, all 856 tests and `npm run build` pass.
- **Determinism snapshot** moved from `10973fba7111a6` to `0d03bb5a89221d`. With the text changes in `src/sim` and `src/data` put back, the old hash comes back exactly.

**Next:** C2, main offices, sales offices and data centers.

### 2026-10-26 — Stage C1b: rival labs and "the lab" (v0.1.2)

**What you asked for:** keep going with C1 while C1a merged.

**What C1b changed.** Text only; ids, numbers and the save shape are untouched.
- **Rival names.** All 33 rivals are now AI labs with invented names, for example Harbourline AI, Maple Crown Intelligence, Prairie Open Models, Kingsbury Cognition, Lumière IA, Rheinmark KI and Neva Open Models. The four app-first disruptors keep short brands (Nimbus Labs, Fizz, Volt, Komet). Tide Money became Tidewater AI and Eastgate became Eastgate Intelligence, to stay clear of real company names.
- **New rivals mid-game** take lab suffixes: AI, Labs or Intelligence for big labs; Research, Institute or & Partners for research labs; Collective, Open Models or Open Lab for open-model groups.
- **Map captions** under rival crests drop the new generic words, so "Harbourline AI" still reads "Harbourline".
- **"The bank" → "the lab".** About 200 places where the game means your company now say lab: the title tagline ("Found a lab. Build an empire."), the new-game wizard, executives, M&A, shares, property, the franchise, tutorial tips, goals and error messages. Rival labels say "Rival lab" and "Rival labs".

**Left as bank words on purpose:** money and banking mechanics (bank run, central bank, investment bank, deposits, payroll "needs a bank", a customer review about mortgage rates), branches, and code comments. The newspaper is C1c.

**Checks.**
- `npm run lint`, all 856 tests and `npm run build` pass.
- **Determinism snapshot** moved from `1064ce4d8fffde` to `10973fba7111a6`. With the text changes in `src/sim` and `src/data` put back, the old hash comes back exactly.

### 2026-10-26 — Stage C1a: the first AI words (v0.1.1)

**What you asked for:** start C1, relabelling the systems whose maths already fits.

**I split C1 into three small pull requests** so each one is easy to check on your phone:
- **C1a (this one):** floors, executives, segments, campaigns, benefits, conferences, incidents, the stock sector and map layers.
- **C1b:** fictional rival lab names, and "the bank" becoming "the lab" in everyday text.
- **C1c:** the newspaper's new name and its AI tab.

**What C1a changed.** Only names and text; ids, numbers and save shape are untouched.
- **HQ floors:** IT & Security → **Platform & Security**; Risk & Compliance → **Safety & Alignment**. Products and Treasury keep their names until C3/C4, as the brief says.
- **Executives:** the Chief Risk Officer is now the **Chief Safety Officer (CSO)**, on your team and on rival HQ panels.
- **Segments:** Students, **Developers**, **Consumers**, **Researchers**, **Small shops** (were Students, Young professionals, Families, Retirees, Businesses). Storefront tips and campaign hints match.
- **Campaigns:** Coffee & Live Demos, Hack Nights, Weekend Support, Sign-Up Credits, Green Compute Pledge, Research Newsletter and AI Workshops (Community Sponsors, Social Media and Local Paid Search keep their names).
- **Benefits:** Staff Mortgage Discount → **Compute Allowance**.
- **Conventions → conferences:** every event got an AI or developer name (for example Alpine Inference Forum, Thameside Alignment Summit, Bay Builders Week). The map layer, pin, panel title and tips say Conference.
- **Venture debt → compute credits** in every label (C4 links them to real compute).
- **Incidents:** server-room break-in, API key leak, capability over-claim, safety audit, heatwave, outage rumour and abuse ring replace robbery, ATM skimming, mis-selling, regulator audit, flood, bank run and card fraud. Their effects are unchanged.
- **Stock market:** the Banking sector is now **AI labs**.
- **Map layers:** Banks → **Rival Labs**, Conventions → **Conferences**. Branches, Credit Bureaus and Employers wait for the stages that rebuild them (C2, C4/C6 and C3).
- CONTENT.md and SCREENS.md use the new names.

**Left as bank words on purpose:** money terms (deposits, loans, rates), branches, Loan Desk, Treasury and Products. They change with the stages that rebuild those systems.

**Checks.**
- `npm run lint`, all 856 tests and `npm run build` pass.
- **Determinism snapshot** moved from `1d6d768b9d6ed3` to `1064ce4d8fffde`. Only names changed: with the renamed data files put back, the old hash comes back exactly.

### 2026-10-26 — Stage C0: Frontier Lab gets its own saves (v0.1.0)

**What you asked for:** confirm the design brief's new decisions, then start building.

**The brief.** Your "Decisions locked" section answers all twelve questions. It also replaces campuses with:
- 1–2 main offices worldwide
- one sales office per city (the only way to open a city)
- data centers anywhere

It adds safety upside, aging models and the talent war. I copied the short version into CONVERSION_PLAN §5 and the DESIGN decision log. Where the plan still says "campus", the brief wins. One thing is still open: "CREO" in the brief's section 4.7 is never defined.

**What C0 changed.**
- **Separate saves.** Both games live on `jxstrr0.github.io`, and the browser keeps one storage box per site. Frontier Lab now stores its slots, settings and tutorial flag under its own `frontierlab` names. Vault Street's slots on your iPhone are left alone and won't show up here.
- **Separate offline files.** Each game's service worker deleted every cache named `vaultstreet-…` except its own. With both games on one site, every update of one wiped the other's offline copy. Frontier Lab's caches are now named `frontierlab-…`.
- **Save codes.** Exported codes now start with `FL`. A Vault Street code (`VS…`) gets a clear "that is a Vault Street save code" message instead of loading a bank game.
- **Name.** The browser tab, Home Screen name, app manifest, title-screen and credits wordmarks and the share sheet now say Frontier Lab.
- **Version and saves restart** (your decision A6). The version is v0.1.0 and the save format is schema 1. Vault Street's 37 save-upgrade steps were removed, along with their tests and old save fixtures; no Frontier Lab save could ever need them. The next shape change adds migration 1 → 2.

**Unchanged:** the game itself (still the bank game until C1), and its balance.

**Checks.**
- `npm run lint`, all tests and `npm run build` pass.
- **Determinism snapshot** moved from `1d353966f53ba6` to `1d6d768b9d6ed3`. Only the schema number inside the save changed: putting it back to 38 gives the old hash exactly.

**Next:** stage C1, relabelling the systems whose maths already fits (floors, executives, incidents, the newspaper and so on).

### 2026-10-26 — Frontier Lab setup and conversion plan (docs only)

**What you asked for:**
- set the repo up as a fork of Vault Street
- rename the docs to Frontier Lab
- propose how to turn the bank game into an AI-lab game

You asked for no game code changes.

**Setup.**
- Added the `upstream` remote pointing at `Jxstrr0/VaultStreet`. Right now it is identical to our `main`.
- New **Reference repo** section in CLAUDE.md, in your wording: upstream is read-only, and we only bring changes over when asked.
- **Renamed to Frontier Lab** in CLAUDE.md, README, DESIGN, ROADMAP, DEPLOYMENT and COVER_SCREEN, with the live link `/FrontierLab/`.
  - Two code comments that named the old sub-path were updated too (comments only, nothing that runs).
  - The game itself, its title tag and its text are untouched.
- CLAUDE.md, README, DESIGN and ROADMAP each say a conversion is under way and point to the plan. DESIGN keeps describing the bank game until a stage changes it, so the docs still match the code.

**The plan: new file `docs/CONVERSION_PLAN.md`.** It has the four things you asked for:
1. A new mapping table: every row of the old one, plus the bank-only systems it left out (liquidity, bank runs, bonds, deposit beta, adverse selection, foreclosed homes and others).
2. Every `src/sim` and `src/data` file sorted into: relabel only, constant changes, formula changes, or remove. Most files are relabel only. The real work is in about 30 files, all in the money and treasury layer.
3. Where your plan rubs against the code, each with a fix.
4. Nine conversion stages, C0–C8. The game stays playable after each one.

**The decisions, in plain language.**
- **Saves need their own place first.** Both games live on `jxstrr0.github.io`, and a browser keeps one storage box per site. Today both games use the same save names, so on your iPhone they would see and overwrite each other's slots. Stage C0 is a small fix that gives Frontier Lab its own names. Until then, don't play both on the same phone.
- **The one big mismatch is money.** A bank holds customers' money and lends it out, and half of Vault Street's engine (liquidity, capital ratio, bonds) exists because of that. An AI lab just earns subscription revenue. So that layer turns into a **compute** layer: GPU capacity, GPU lots, waitlists and outages instead of liquidity, funding lots and bank runs. The capital ratio becomes a **safety** ratio. It is the riskiest stage, so it comes after the easy renames.
- **Whole-city catchment needs very little new code.** The existing share formula already counts your own other branches as competitors. With distance switched off, two campuses in one city split one market instead of doubling it.
- **Named businesses go on the spare storefront lots** (about 20–60 per city once campuses need only a few). Rival-coloured awnings already work on those lots. Showing your colours needs one small art change.
- **Your churn question.** I recommend both, timed by each contract's own renewal date rather than one quarterly renewal season:
  - At renewal, rivals bid and the business may leave.
  - Mid-term, a contract only ends if the business fails, more often in recessions, or after a big outage.
  - Four weeks before each renewal you get a "Renewals due" list, so you can offer a discount.
  - Spreading renewals out keeps every week a bit interesting instead of dumping dozens of decisions into one week four times a year.

**Open questions:** listed at the end of the plan (A1–A6). The main ones: the five customer segments, how rival labs are named, and whether bonds and venture debt are removed or reused.

**Checks.** `npm run lint`, all tests and `npm run build` pass. The game code is unchanged, so balance and the determinism snapshot are untouched.

**GitHub Pages.** This repo had no workflow runs yet. If the live link doesn't load after this merges, open the repo's **Settings → Pages** and set **Source: GitHub Actions**. Only you can change that setting.

**Next:** your answers on the plan, then stage C0 (separate saves).

### 2026-10-26 — Procedural startup and rival names (v0.13.3)

**What you asked for:** the first of five new items: startups and rival names from sector and name templates, so pipelines never repeat.

**What changed.**
- **Startup names fit their sector.** A new startup is a word plus a sector suffix (Cobalt Grid, Mosaic Arcade, Umber Space), a coined brand (Quindra, Zandwell) or both (Tremio Shield). Before, any sector could get "Bio" or "Pay".
- **Startup descriptions come from templates.** "{offer} for {customer}", with six of each per sector: "Cold-chain trucking for pharmacies", "Secure backups for local councils". That is 36 per sector, plus the old handwritten lines now and then. A description already showing in your pipeline is drawn again.
- **New banks get new names.** A chartered bank now often gets a generated name: a place-style stem (Ravensford, Maplewater, Fernhaven) with its suffix, or for an app-only bank a coined brand (Naloop, Polwell). Awkward coinages are filtered out.
- Names are still never reused in a save, and none are real companies.

**Your save:** loads as is; nothing in the save format changed. Startups already in a save keep their names.

**Checks.**
- `npm run lint`, all tests and `npm run build` pass. The new `tests/sim/nameGen.test.ts` checks brand length and cleanliness, sector suffixes, variety, and that 150 generated startups never share a name.
- One test needed updating: the convention test now asks about a startup that is still private, since a fair startup can now fail during the fair.
- **Balance:** the 20-seed median is inside every band.
- **Determinism snapshot** updated to `1d353966f53ba6` (intended: generated startups draw names differently).

**Code map.** `src/sim/nameGen.ts`, parts in `src/data/nameParts.ts`, descriptions in `src/data/startupBlurbs.ts`, constants `NAME_GEN` in `src/config/balance.ts`. Used by `src/sim/ventureGen.ts` and `src/sim/rivalCharters.ts`.

**Docs:** CONTENT §15 and §18, DESIGN decision log.

**Next:** the top tier of personal purchases.

### 2026-10-26 — Buybacks and share-for-share deals (v0.13.2, schema v38)

**What you asked for:** the last of the three approved changes: share buybacks and share-for-share mergers, as late-game uses for cash and shares.

**Share buybacks (SIMULATION §19.6a).** A new card on the investment bank's Equity tab once you are listed.
- Buy back up to 10% of your shares at the market price plus 2%, plus a 1% broker's fee. The shares are retired.
- The money leaves cash and retained earnings, like a dividend. Your stake goes up, and profits and votes are shared among fewer shares. The share price gets a lift of 1–4%.
- One buyback a quarter. The public must keep at least 10% of the bank, and your capital must stay Adequate or better afterwards. The card says why when a buyback is blocked.

**Share-for-share deals (§19.8).** Once listed, the M&A offer sheet has a "Paid in your shares" choice: Cash, 25%, 50%, 75% or All.
- The share part is paid in new shares at your market price on closing day. The sheet shows the new shares, the dilution and your stake after.
- Paying in shares saves cash and makes the regulator's capital test easier, since the new shares add capital.
- The trade-offs: the target's board counts the share part at 95% of its value, one deal can add at most 50% new shares, and issuing them knocks 2–6% off your price.
- If you personally own shares in the target, you are paid in the same mix, so part comes back as shares in your own bank.

**Your save (schema v38):** loads as is; the new fields are optional.

**Checks.**
- `npm run lint`, all tests and `npm run build` pass. The new `tests/sim/buybacksShareDeals.test.ts` covers the buyback's books, cap table, price lift, quarterly limit, float cap and capital rule, and a half-share takeover that closes with the balance identity intact.
- Checked at 390×844 in Chromium: the buyback card and the offer sheet's share choice lay out cleanly with no console errors.
- **Balance:** unchanged. Both features are player choices, and the scripted strategies don't use them; the 260-week run is identical apart from the save version.
- **Determinism snapshot** updated to `03f5cbec77b72b`. Only the schema number changed; with it set back to 37 the old snapshot matches.

**Code map.** `src/sim/buybacks.ts`, `src/sim/shareDeals.ts`, the `buyBackShares` command in `src/sim/commands/marketsEquity.ts`, and `stockPct` on `offerMerger`. Constants `BUYBACK` and `SHARE_DEALS` are in `src/config/balance.ts`. The UI is in `src/app/investmentBank/BuybackCard.tsx` and `OfferSheet.tsx`.

**Docs:** SIMULATION §19.6a and §19.8, SCREENS §12, DATA_MODEL §12 (v38), the DESIGN decision log, and the ROADMAP backlog.

**Next:** all six approved ideas are built. Size-based rules on your bank stay off, as you asked.

### 2026-10-26 — A field that stays full: charters, rival mergers, rival ads and tech (v0.13.1, schema v37)

**What you asked for:** the second of the three approved changes, covering new rivals getting chartered, rivals buying each other, and rivals doing their own marketing and tech.

**New charters (SIMULATION §18.7).**
- At each new year, a city that has lost a rival (bought by you, seized, or merged away) has a 35% chance to get a brand-new bank. A full city with lots of empty storefronts has an 8% chance. At most three new banks a year.
- A new bank has an invented name (Copperleaf Mutual, Glenhaven Private, Zephly and so on; CONTENT §15) and starts private with 2–3 branches and $25M of capital, scaled to today's money.
- It starts expanding after a profitable year, like any rival. The Weekly Ledger announces it, and its branch sheet says "A new bank, chartered in {year}".

**Rivals buy each other (§18.8).**
- At each quarter-end, a rival with a profitable year and spare capital may bid for a smaller rival it meets in a city or its home country. It pays book value plus 15–40%, under the same 9% capital rule your deals face.
- If you own shares in the target, you are paid in cash at the deal price. Any loan the target made you moves to the buyer. The target leaves the market, and the paper runs the story.

**Rival ads and tech (§18.9).**
- Rivals run 12-week ad campaigns in cities where you have branches. Their branches there get +0.15 rating, which shows on the rival branch sheet, and the rival pays for the airtime.
- Each year a profitable rival spends 5% of its profit on technology, which improves its app and its products.
- An app-only bank that reaches 20 branches becomes a high-street bank: full expansion speed and high-street prices.

**A problem found while testing, and the fix.**
- Once the last change made rival costs keep pace with the economy, whole networks of healthy rival branches closed during the first long recession. Rivals shrank by half over 25 years, and main has this today.
- A rival's 26-week loss count now pauses while its country is in recession or recovery, so a bank rides out a downturn.
- Seed 42 aggressive at year 25:

| | Active rivals | Rival branches | Rival deposits | Closures | Failures | Charters | Rival mergers |
|---|---|---|---|---|---|---|---|
| Main | 27 | 128 | $49B | 271 | 6 | — | — |
| This change | 54 | 332 | $122B | 92 | 17 | 42 | 4 |

- Your bank is about $106B at year 25 in both runs.

**Your save (schema v37):** loads as is, since every new field is optional. Charters, mergers, ads and tech start at the next year end, quarter-end or month.

**Checks.**
- `npm run lint`, all tests and `npm run build` pass. The new `tests/sim/rivalCompetition.test.ts` covers charters, mergers (including a payout to your shares and the balance identity), campaigns, tech and growing up.
- Three tests needed updating, each for an intended reason. The London rival test now skips a bank chartered later. The lot-cap test counts lots after the city grows. The recession test follows its own bank, since ten years of recession can now topple another rival first.
- **Balance.** The 20-city median is inside every band after one re-base. A first branch that never upgrades now earns $1–3k a week less, because lost rivals are replaced and they advertise. The income floors are now $31k at week 104 (was $33k) and $32k from week 156 (was $35k); SIMULATION §25 has the reason.
  - Seed 42 steady misses week-156 deposits by $0.1M and week-260 income (the one-week default again). Single seeds are for reference.
  - Aggressive is in range everywhere.
- **Determinism snapshot** updated to `079f2df756abbe` (intended; includes main's world-calendar change).

**Code map.** `src/sim/rivalCharters.ts`, `src/sim/rivalMergers.ts`, `src/sim/rivalMarketing.ts` (ads, tech, growing up, `rivalOverall`), names in `src/data/rivalCharters.ts`, constants `RIVAL_CHARTER`, `RIVAL_MERGERS`, `RIVAL_MARKETING`, `RIVAL_TECH` and `RIVAL_CLOSURE.holdPhases` in `src/config/balance.ts`. They are called from `src/sim/rivalAi.ts`; the news is in `src/sim/newsRivals.ts`.

**Docs:** SIMULATION §18.4, §18.5, §18.7–18.9 and §25, CONTENT §15, DATA_MODEL §12 (v37), DESIGN decision log.

**Next:** share buybacks and share-for-share mergers.
### 2026-10-26 — A bigger world in the Ledger: world calendar, commodities, the archive, 26 more stories (v0.13.0, schema v36)
- **Owner's ask:** more world stories and story types, pitched first. From the pitch you picked the world calendar, commodities plus the archive, and about 25 more one-off stories. Running story arcs and a recurring cast weren't picked, so they aren't built.
- **26 more kinds of world story (61 in all):**
  - **Crime and courts:** jewel and museum heists, an art-forgery trial, scam warnings, landmark court rulings, a smuggling bust.
  - **Science:** a new species, a comet, an AI milestone, a dinosaur fossil, a record deep-sea dive, a giant telescope.
  - **Travel and food:** a restaurant with a waiting list, food festivals, a "most liveable city" ranking, a new tallest tower, new flight routes.
  - **Culture:** a bestselling novel, a record-breaking video game, a hit musical, a mystery mural, an orchestra's anniversary.
  - **Odd news:** a record-sized vegetable, an escaped zoo animal, a world-record attempt, a 100-plus birthday, a homing pigeon that came home.
  - Book, game, show and species names are all invented.
- **Commodity prices.** Oil, gold, wheat, coffee and copper prices move every week. They drift up in a boom and down in a downturn (gold the other way), and grow slowly with the world's prices. A big week makes a Markets story with a reason ("Oil jumps 8.0% on a cold snap in the north"). So does a one-year high or low, at most once every two months per commodity. The first issue of each month runs a wrap of all five.
- **From the archive.** Every fourth issue, the paper keeps its lead story for good. Every four weeks it reprints one from 1, 2, 3, 5 or 10 years earlier: your first branch, an election, a zoo escape. Each story is reprinted at most once. These are your save's own headlines, so no two players see the same archive.
- **A world calendar.**
  - **Nations Cup** every four years (2030, 2034…): announced four weeks ahead in a host city, then the hosts' opening game, the group stage, the semi-finals and the final.
  - **World Games** every four years (2028, 2032…): opening ceremony, a star athlete at halfway, a closing medal table.
  - **World Expo** every five years: opens in May, closes six months later.
  - **Every year:** film awards in March, New Year fireworks, a science prize in October and the Grand Sale Weekend in November, which is a record or a flop depending on your home economy.
  - Nations are the game's ten economies, and the host is a random game city.
- **Two small fixes found along the way.** Branch review cards and commodity prices now use their own random numbers. Before, any change to the newspaper also reshuffled which review cards your branches showed. I checked a 260-week game against the last version: apart from review cards, the game state is identical, so none of this changes gameplay. Review cards in your save reshuffle once.
- **Your save (schema v37):** loads as is. Commodities start at their base prices, the archive starts filling from the next issue, and the next fixture on the calendar runs when its week comes round.
- **Code:**
  - New files: `src/sim/newsWorldCalendar.ts`, `newsTournaments.ts`, `newsCommodities.ts`, `newsArchive.ts`.
  - Content: `src/data/worldCalendar.ts`, `commodities.ts`, `newsWorldBeatsMore.ts`, `ledgerTemplatesGlobeMore.ts`, `ledgerTemplatesCalendar.ts`.
  - Dials in `balance.ts`: `NEWS_COMMODITIES`, `NEWS_ARCHIVE`, `NEWS_CALENDAR`, plus new priorities and caps.
  - `newsPrice` and `newsDate` added to `newsFormat.ts`.
  - No new dependencies.
- **Checked:** lint, full test suite (878; new `tests/sim/newsCalendar.test.ts` covers tournament scripts, a six-year run with every fixture, commodity prices near their anchors, archive reprints of real headlines each at most once, and the migration) and build all clean. `npm run balance` has all checkpoints in range. Determinism snapshot `137475fc737d76` → `04e6d86aaed346` (intended: the paper's contents and the new streams). At 390×844 the Ledger renders with no overflow and no console errors.
- **Docs:** SIMULATION §3 streams and §24.1, §24.4–24.6; CONTENT §23; DATA_MODEL §12; DESIGN §5.15 and the decision log.

### 2026-10-26 — Price lists and growing cities (v0.12.1, schema v35)

**What you asked for:** ideas to keep competition alive late in a game. You approved six: new rivals get chartered, rivals buy each other, cities get new lots, rivals do their own marketing and tech, index the catalogue, and share buybacks plus share-for-share mergers. You said no to size-based rules on your bank for now. I'm shipping them as three pull requests; this is the first (catalogue prices and new lots).

**Price lists (SIMULATION §4.6).**
- Every country now has a price list. It starts at 1 and, at each year end, jumps to that country's nominal index (the economy's price level from the last change). Prices on screen therefore hold still for a whole year, like a printed price list, and then step up.
- Charged at the list: branch builds and equipment, equipment upkeep and branch overhead, branch campaigns, brand campaigns and agency packages, lobbying, cars, jets, flights, office floor fit-outs, partnership fees, the rebrand bill after a merger, three incident options (vault upgrade, apology, flood), and a rival branch's weekly running cost.
- Rents follow too: at each review every storefront rent, your branch leases, office listings and leased offices go up by the same step. A lease deposit stays at what you paid.
- Not indexed: vacation homes (they follow house prices), sports clubs, collectibles and startups (they have their own markets), percentage fees, and budgets you set yourself.
- **What it means for your save:** prices and rents stay as they are until your next new year, then catch up in one step. In a long save that step is big (about 4× by year 18), because nothing was indexed before.

**Growing cities (CONTENT §3).** Every two years at the year end, each city you've visited adds 10% of the storefronts it started with, until it has 1.5× more. They are spread across the districts like the originals and show on the map straight away. The Weekly Ledger reports it. Rivals expand into the new corners the same way as any free lot, and so can you.

**Checks.**
- `npm run lint`, all tests and `npm run build` pass. The new `tests/sim/priceLists.test.ts` covers the review, rents, priced builds, cars and fit-outs, the migration, and city growth up to its cap.
- **Balance.** The 20-city median (`--years 5 --seeds 1-20`) is inside every band. Week 260 income reads $35.2k (main read $33.3k, a miss).
  - One band was re-based: week 104 revenue now starts at $80k (was $85k). Main already read $84k there, so the miss predates this change. A year-2 branch is still growing (SIMULATION §25 has the reason).
  - Seed 42 steady is in range except week 260 income. A $206k default lands inside its four-week average; the branch earns about $62k a week on either side.
  - Seed 42 aggressive, 25 years: about $109B of total assets at year 25 (was $116B), with every company check in range.
- **Determinism snapshot** updated to `137475fc737d76` (intended: rents, costs and new lots, on top of main's World desk change).

**Code map.** `src/sim/nominal.ts` (`listLevel`, `listPrice`), `src/sim/priceList.ts` (yearly review), `src/sim/cityGrowth.ts`, `src/sim/citygen.ts` (`rollLot`, shared by generation and growth), year end in `src/sim/engine.ts`, migration 34 in `src/sim/save/migrations.ts`, `CITY_GROWTH` in `src/config/balance.ts`. The map rebuilds its scene when a city's lot count changes (`src/app/map/mapScene.ts`).

**Docs:** SIMULATION §4.6 and §25, CONTENT §3, DATA_MODEL §12 (v35), DESIGN decision log.

**Next:** the rivals pull request (charters, rival-on-rival M&A, rival marketing and tech), then buybacks and share-for-share mergers.
### 2026-10-26 — The Weekly Ledger goes global (v0.12.0, schema v34)
- **Owner's ask:** a deep dive on the news; make it more unique and cover more stories that aren't about you and your bank.
- **What I found.** I printed five years of real issues from a headless game. About half of every paper was routine news about your bank: "Test Bank turns a profit" ran 249 weeks out of 260, the loan tally 245, the capital warning 153, the rate watch 214, and an auction preview 252. The world beyond you was the central banks, one economy line, the index wrap, a currency move, your home league and a poll every six weeks.
- **New World tab and World desk.** Four stories a week from all ten countries, with 35 kinds of story: weather and nature (snowstorms, heatwaves, typhoons in Hong Kong and Japan, monsoon in Singapore, bushfires in Australia, floods, harvests, northern lights, cherry blossom), science and building (rail lines, bridges, satellites, hospital breakthroughs, record clean power, data centres, airports), work and prices (strikes, layoffs, hiring booms, grocery bills, new factories, trade deals, summits, tourism, rents) and everyday life (festivals, marathons, museums, lottery winners, zoo births, a 29-year-late library book, teenage chess grandmasters). Each story fits its country: a recession brings strikes, layoffs and gloomy shoppers; a boom brings hiring and new plants; high inflation brings price stories; the seasons follow the calendar, flipped for Australia. A story type rests for six months in a country before it can return, and never runs twice in one issue. Flavour only: none of it changes the game.
- **Company desk.** When a listed company's shares move unusually in a week (6%+ and more than about twice their normal swing), the Markets tab explains it with a reason that fits the sector ("Vantor Motors slides 8.6% after a safety recall"), quoting the real closing price from the Market screen. About one issue in three also carries corporate news: a new chief executive, a product launch or a new site.
- **Elections everywhere.** Every country's poll now drifts, and every country votes every four years, staggered so there's an election somewhere every few months. The paper announces the campaign six weeks ahead with the latest poll, then reports who won or was re-elected. Flavour only.
- **The Money Column.** Every other week, a short personal-finance column for your home country that follows the economy: "should you fix your mortgage?" after a rate rise, "is your cash shrinking?" when inflation is high, first-time-buyer advice in a hot housing market, a rainy-day fund in a downturn, or an evergreen tip.
- **Sports abroad.** One foreign league a week now gets a proper slot, and every league's champion is reported at year end.
- **Less about you, unless it's news.** Your weekly figures print when something happened (a loss, a swing back to profit, a record week at least 10% above your previous best) or once a month. A "watch" capital warning prints when the tier changes or once a month (Restricted and Critical still every week). Weekly figures, the loan tally, the watch note and the rate watch share at most two slots per issue. Auctions get one slot. Your big moments (new branches, incidents, deals, milestones) are unchanged.
- **In numbers (seed 42, steady, five years):** an issue now holds up to 14 stories (was 12), at least 2 of them from the World desk. Over five years the paper carried about 930 World stories, 190 share-move stories, 12 elections and 130 Money Columns, while routine stories about your bank fell from about half the paper to at most two a week.
- **One gameplay-adjacent fix.** The capital-buffer law votes (the one bill that really changes your capital requirements) used to share the newspaper's random stream, so adding any story reshuffled which bills passed. They now have their own `politics` stream. Your save's future votes reshuffle once; from now on news changes can never touch them. Balance run unchanged (all targets in range).
- **Your save (schema v34):** loads as is. The World desk starts at once; the first election campaign begins on the next issue.
- **Code:** new `src/sim/newsWorldDesk.ts`, `newsCompanyDesk.ts`, `newsElections.ts`, `newsColumn.ts`; content in `src/data/newsWorldBeats.ts`, `ledgerTemplatesGlobe.ts`, `ledgerTemplatesDesk.ts`; dials `NEWS_WORLD`, `NEWS_COMPANY_DESK`, `NEWS_COLUMN`, `NEWS_ELECTIONS`, `NEWS_ROUTINE_EVERY_WEEKS`, `NEWS_RECORD_*` and new priorities and caps in `balance.ts`; a globe icon; the World tab in `LedgerCard.tsx`. No new dependencies.
- **Checked:** lint, full test suite (865; new `tests/sim/newsWorldDesk.test.ts` covers seasons, economy conditions, filled tokens, elections, real share prices and the migration; `news.test.ts` now checks every issue keeps its world stories and caps your routine ones) and build clean. Determinism snapshot `0d4812231c21bf` → `1fde793628947f` (intended: the paper's contents and the politics stream). At 390×844 the World tab renders with no overflow and no console errors.
- **Docs:** SIMULATION §3 streams and §24 (new §24.1–24.3, elections), CONTENT §23, SCREENS §21, DATA_MODEL §12, DESIGN §5.15 and decision log.

### 2026-10-26 — A growing world: rivals that grow, lighter M&A, six more milestones (v0.11.12, schema v33)
- **Owner's ask:** look at how rivals grow and stay competitive, lighten M&A regulation, add six new milestones, and let a save live into the trillion-dollar range and beyond.
- **The problem underneath.** Nothing in the world grew. Every city has a fixed number of storefronts and a fixed pool of customers, a mature branch holds a fixed $40–70M, and rivals opened branches only in cities they already served. So once the 20 cities were full (about year 11) the bank was done growing: $12B of deposits for ever, rivals worth small change, cash piling up. No tuning of goals fixes that; the world has to keep growing.
- **The economy grows (the nominal index, SIMULATION §4.6).** Every country now carries a price-and-wealth level that starts at 1 and compounds at its growth plus inflation plus a 4-point trend: about 9% a year in an expansion, 8% over a cycle, so it doubles about every nine years. Balances per account, every deposit and loan balance, card spend, fee prices, market wages (tellers, HQ departments, managers, executives), rival branch books and the rich list are all quoted at that level. Fixed catalogue prices (builds, equipment, campaigns, rents, servicing) are not, so they get relatively cheaper over a long game. One dial: `NOMINAL_INDEX.trend` in `balance.ts`.
  - **What it does to a long game (seed 42, aggressive, headless):** at year 12 the bank reads $34B of assets (was $13B); year 15 $46B; year 18 $61B, index 4.1. Rivals hold $71B of deposits across 350 branches at year 18 (was $7B across 165, flat). At year 25 the bank alone reads $116B of assets (index 7.4) and the rivals hold another $129B of deposits across 350 branches, so a player who buys them as they grow is well past $200B by then; at the same pace the world's banks together pass a trillion around year 40 and the bank by itself around year 50. The rich list's top fortune ($7.5B at year 18, $15.7B at year 25) now overtakes a founder who just sits on cash around year 21, so "Top of the rich list" has to be defended. Turn `trend` up for faster.
  - **Your save (schema v33):** every country's index starts at 1 today, so balances, wages and rival books begin growing from where they are. Market wages rise about 9% a year from now on: delegated staffing and the COO's pay reviews follow by themselves; if you set wages by hand you'll see "Underpaid" creep in and should raise them now and then.
  - **In real terms the early game is unchanged:** `npm run balance` now deflates the §25 bands by the index and prints the index in its yearly table. Seed 42 steady at year 10: 179 branches, $21B of deposits nominal ($10.2B real, inside the $6–40B band), listed in week 196.
- **Rivals grow and stay competitive (§18.3–18.4).**
  - **A roll per city.** Each month an eligible rival (a year of profit, capital above 11%) rolls to open a branch in every city it serves, not once overall, so a wide network grows faster. Cities keep room for you: rivals stop at 40% of a city's storefronts or when fewer than 20% are free (were 30%/30%).
  - **They enter new cities.** A rival with six or more branches rolls 5% a month to open its first branch in a city it doesn't serve: one in its home country, or any city once it serves three. It picks the city with the most free storefronts, and the Ledger reports the arrival ("Harbourline Bank arrives in Vancouver"). Rivals can only enter cities that exist in your save, so they grow where you have been.
  - **They learn from you.** At each year end, a rival branch in a city you share that rates below your average there lifts each quality coin by 0.1 (to at most 4.6), and the rival's app rating moves 0.1 toward yours. A rival you out-serve closes the gap over the years instead of standing still. In the headless run this costs a first branch the steady script never upgrades about 1.5% of its deposits a year, so two §25 bands moved (below).
  - **A bank you bought or the regulator seized stays gone:** it is no longer seeded into a city you fly to later (it used to come back as a ghost).
- **Lighter M&A regulation (§19.8):** pro-forma capital after a deal may be 9% (was 10.5%, so a deal can leave you in the Watch tier); you may hold up to half a city's deposits after a deal (was 35%), two-thirds after a fast-track lobbying win (was 45%); a rejected offer can be raised after two weeks (was four); and a distressed sale skips the share test altogether, which the offer sheet's share row now says.
- **Six new milestones** (23 in all): Twenty cities, Ten countries, Ten acquisitions, A hundred billion in assets, Ten-billion founder, A trillion in assets. Old saves catch up quietly on load, as before.
- **The rich list** grows with the home country's index as well as its own real growth (now −2% to +5% a year; was a flat 4–8% in a world that didn't grow). An older save just starts from its current level.
- **Balance bands re-based with reasons (SIMULATION §25):** mature deposits $38–70M (was $40–70M), revenue $85k+ and income $35k+ from week 156 (were $95k+ and $38k+): rivals that learn take a little from a first branch that never upgrades (seed 42 reads $40.3M, $88k and $38k real at week 260). Year 2 steady branches 3–8 (was 4–8): a balance sheet that grows with the economy binds capital a little sooner. Everything else on seed 42 meets its band for steady; the three bands were missed by 2–8%, not more.
- **Code:** `NOMINAL_INDEX`, `RIVAL_EXPANSION.entry*`, `RIVAL_LEARNING`, `MERGERS` and `MILESTONE_GOALS` in `balance.ts`; `CountryState.nominal` (macro.ts) with the `nominalIndex` helper (new `src/sim/nominal.ts`); demand, books, staff, hq, payReviews, execSeats and rivals read it; new `src/sim/rivalLearning.ts`; `entryCity`/`enterCity` in `rivalExpansion.ts` with the `RIVAL_CITY_ENTRY` event and Ledger templates; `regulatorChecks` in `acquisitionPlan.ts`; `richList.nominalRef`; migration 32 → 33.
- **Checked:** lint, full test suite (856; new `tests/sim/nominal.test.ts` and `tests/sim/rivalGrowth.test.ts`, a distressed-sale regulator test, the six milestones, the rich list with the index) and build clean. Determinism snapshot `1c9471adab35c5` → `0d4812231c21bf` (intended: every balance now drifts with the index). The Milestones screen at 390×844 lists all 23 goals with no overflow and no console errors.
- **Docs:** SIMULATION §4.6 (new), §6.1, §18.1–18.4, §19.8, §22, §24 (fast-track), §25; DESIGN §5.9, §5.10, §5.18 and decision log; DATA_MODEL §12.
- **Open for the owner:** the scripted strategies never buy rivals, so the headless numbers understate what a player who uses the lighter M&A can reach; `trend` is the speed dial if you want the trillion sooner. Catalogue prices (builds, campaigns, rents) stay fixed while balances grow, so a very long game gets cheaper in real terms; indexing them too is a follow-up if that ever feels off.

### 2026-10-26 — Late-game goals (v0.11.11, schema v32)
- **Owner's ask:** check the later game and make sure there is content to interact with past the few-billion stage.
- **What a 15–20-year headless run showed (seed 42, steady and aggressive):** every city is full by year 10–11 (179 branches, about $12B of deposits), and from there the bank only creeps: deposits flat, equity up about $300M a year, all of it piling up as cash (aggressive: $4.6B of cash and a 43% capital ratio by year 20, ROE down from 44% to 9%). The rivals never scale: the biggest has 17 branches and about $70M of equity against your $1–3B, so buying them is small change. The founder is a billionaire around year 11–12, but the rich list ran from $1.5B to $120B and grew 6% a year, so "Top of the rich list" (the last milestone) could never land: by year 15 the top fortune was $200B against a founder worth $1.3B. Only 9 of 11 milestones were reachable in practice, and nothing new was announced after "Billionaire founder".
- **What changes.**
  - **The rich list now spans $150M–$2B** (was $1.5B–$120B), still 50 fortunes growing 4–8% a year. You enter it around years 8–12 and need a long, strong game to top it (about $5–6B by year 20). Existing saves rescale in place: each fortune keeps its rank; your official rank updates at the next year end as before.
  - **Six new milestones** between the first acquisition and the top of the list: **100 branches**, **Ten cities**, **Ten billion in assets**, **Five acquisitions**, **Club owner** (buy a sports club, bank or personal) and **On the rich list**. 17 goals in all; the Milestones screen lists them in order. Old saves catch up quietly on load, as before. The three with a Ledger story: 100 branches, ten cities, ten billion.
  - **Compact money has a trillions tier** ($2.10T) so headline figures past $1,000B stay short.
- **Still open (design calls for the owner, not made here):** (1) rivals stay small because they only open branches in cities they already serve; letting them expand across their home country would keep competition and M&A alive late on; (2) past year 11 there is no sink for retained earnings besides stocks, property and startups: share buybacks for a listed bank, or deposits that keep growing with the economy, would give the late game a lever; (3) all 20 cities fill at 179 branches, so growth after that is organic only.
- **Code:** `RICH_LIST.fortune` and `MILESTONE_GOALS` in `balance.ts`; `data/milestones.ts`; predicates in `sim/milestones.ts`; migration 31 → 32; `money()` in `format.ts`.
- **Checked:** lint, full test suite (new `tests/sim/migrateV31.test.ts`, three late-game milestone tests, the trillions case) and build clean. Determinism snapshot `1abea5732e311f` → `1c9471adab35c5` (intended: the rich list seeds differently and the schema version is in the hash).
- **Docs:** DESIGN §5.16, §5.18 and decision log, SIMULATION §22, DATA_MODEL §12.

### 2026-10-26 — Monthly results cover the whole month (v0.11.10)
- **Owner's report (screen recording):** monthly results said "January 2041 · 1 week, ending 7 Jan" and "February 2041 · 1 week", so the month's revenue and net income (and the change on last month) were one week's.
- **Why.** A week belongs to the month its last day falls in. The report opened on the first tick after the month changed, but that tick closes a week that (unless the month began exactly on the tick) already ends in the new month. So the report showed just that week, labelled as the new month. It only worked when a game began on the right weekday, which is why the tests missed it.
- **Fix.** The monthly (and quarterly) report now opens on the tick that closes the month's last week and sums every week of it (4 or 5), compared with the full month before. The header date is now the last day covered: it used to show the next day. The quarter-end report (the Ledger's earnings story, EPS and ROE) had the mirror slip: when a tick landed exactly on a quarter's first day, the week that ended the day before was counted in the new quarter. It now stays in the old one.
- **Also worth knowing:** "Revenue" includes the non-cash marks on what the bank holds (stocks, startup stakes, buildings). A week when those fall sharply, such as a quarter's earnings week, can show negative revenue on its own. Summed over a month, it is diluted but still counted.
- **Checked:** lint, full test suite (841; new tests: a game starting on a Thursday reports whole months, and a week ending 31 March stays in Q1) and build clean. Determinism snapshot `0c31d208606976` → `1abea5732e311f` (intended: only the quarter-end fix changes the hash). Balance run: only the week-260 income warning already on main. At 390×844 the monthly report reads "February 2027 · 4 weeks, ending 28 Feb 2027" with no console errors.
- **Docs:** SIMULATION §2 and step 13, SCREENS §21, DESIGN decision log.

### 2026-10-26 — CFO Investing (v0.11.9, schema v31)
- **Owner's ask:** does the Investment department actually invest? It didn't: the floor only finds startups (more analysts, more startups to choose from) and shows your portfolio, as in the original. So the CFO gets two new switches, agreed first with the owner: startups and stocks, for the bank and for you, best scorecard, spread across the market, trim losers, separate caps.
- **Investing: the bank's money / your money.** Every 4 weeks each switch:
  1. sells any stock that has fallen to 75% or less of what was paid for it, and leaves it alone for a year;
  2. buys one stock, spreading money across the market by company size (the biggest company first, then whichever is furthest under its share), so the holdings end up close to the market index;
  3. backs the best-scoring startup on the Investment floor's list (average of the five scores 6 or more) that it doesn't hold yet, by taking one of the round's offers.
  - **Bank:** stocks stay under 5% of total assets and startup stakes under 3%; one stock buy is at most 1% of assets; the capital ratio stays at 12% or more after every buy; 8 weeks of costs stay in cash; never at a restricted tier. The Capital switch still sells the company's stocks if the ratio drops to Watch.
  - **You:** a year of your CEO salary stays aside, and one purchase spends at most a quarter of the rest.
  - Rival banks' shares are never bought or sold by the CFO. The trim applies to every listed stock in the account, including ones you bought yourself.
  - The CFO's profile says what it will buy next and when, or what's holding it back.
- **Your save (schema v31):** if you already have a CFO, both switches arrive **off**. A new hire starts with them on, like every delegation.
- **Code:** `EXEC_DELEGATION.invest*` in `balance.ts`; new `src/sim/execInvesting.ts` (`nextStock`, `nextStartup`, `cfoInvest`), using the same trade and startup commands you use; `InvestNote.tsx` on the CFO's profile; migration 30 → 31.
- **Checked:** lint, full test suite (839, new `tests/sim/cfoInvesting.test.ts`) and build clean. Determinism snapshot `16e44c3f3d5282` → `0c31d208606976` (intended: only the schema version and the new empty `trimmedStocks` field differ; with those reverted the old hash comes back). At 390×844 the profile lines fit with no overflow or console errors; after 8 weeks with both switches on, the CFO had bought 2 stocks for the bank and 2 for you. About 30% of new startups score 6 or more, so a small floor (one startup in view) yields a pick every few months; more analysts show more.
- **Docs:** SIMULATION §17.2, SCREENS §10.1, DATA_MODEL §12, DESIGN decision log.

### 2026-10-26 — CREO occupancy dials and Buying (v0.11.8, schema v30)
- **Owner's ask:** add 80-85-90-95-100 occupancy sliders to the CREO, and let the chief buy property for the bank and for you personally. The rules were agreed first: the dial uses the existing occupancy maths, the bank buys within an asset cap with capital and cash safety, your purchases keep a reserve, and the chief buys the best yield at asking.
- **Occupancy dials.** Under each Rents switch: **80% / 85% / 90% / 95% / 100%** (default 100, which is today's "highest rent that still fills it"). A lower stop sets a higher rent per m² so the building settles at that occupancy. Under the game's occupancy curve that earns *less* in total (90%: about +5% per m² but about 4% less rent revenue, plus more vacancy cost), so the tagline shows the net rent at your stop and the difference from 100%. Changing the dial reprices at once.
- **Buying: the bank's buildings / your own buildings.** Every 4 weeks each switch buys at most one listed building, in any city, at its asking price (the seller always accepts, and no travel is needed). It picks the one with the best yearly net rent ÷ price that the budget allows.
  - **Bank:** buildings stay under 5% of total assets; the capital ratio stays at 12% or more after the purchase; 8 weeks of costs stay in cash; never at a restricted capital tier.
  - **You:** a year of your CEO salary stays aside, and one building costs at most half of the rest.
  - The profile note says what the chief would buy next and when, or what's holding them back. A new building is priced by the chief's Rents straight away when that switch is on.
- **Your save (schema v30):** both dials start at 100%. If you already have a CREO, the two Buying switches arrive **off**, so nothing is bought until you switch them on. A new hire starts with them on, like every delegation.
- **Code:** `EXEC_DELEGATION.occTarget(s)` and `buyEveryWeeks` / `buyAssetCap` / `buyMinCr` / `buyReserveYears` / `buySpareShare` in `balance.ts`; `rentForOccupancy` in `propertyMath.ts`; new `src/sim/execBuying.ts` (`nextPurchase`, `creoBuy`); the purchase itself is shared with your own offers in new `src/sim/propertyBuy.ts`; `setOccupancyTarget` command; `OccupancyDial.tsx` and a buying line in `PropertyNote.tsx`.
- **Checked:** lint, full test suite (831, new `tests/sim/creoBuying.test.ts`) and build clean. Determinism snapshot `1a41be4f7a56d1` → `16e44c3f3d5282` (intended: the hashed state gains the dial targets). Balance run: only the week-260 income warning that was already on main. At 390×844 the dials and buying notes fit with no overflow or console errors; after 8 weeks with the switches on, the chief had bought 2 buildings for the bank and 2 for you.
- **Docs:** SIMULATION §17.2 and §21.2, SCREENS §10.1, DATA_MODEL §12, DESIGN §5 and decision log.

### 2026-10-26 — Bigger save storage (v0.11.7)
- **Owner's ask:** expand save storage.
- **Why it filled.** Saves lived in the browser's localStorage, which allows about 5 MB for the whole site, and every page on jxstrr0.github.io shares it. Measured: a quiet game is ~0.3 MB a slot, but a big 10-year game (~180 branches) is ~2.7 MB, so on iPhone an autosave plus one manual slot of a late game hit "Storage full".
- **What changes.** The saved games now live in **IndexedDB**, the browser's database storage, whose quota is a share of the phone's free space (hundreds of MB or more). The game also asks the browser once to keep its saves when space runs low. The small slot cards (bank name, date, cash, cover) stay in localStorage so the title and Save game screens list them instantly. Still four slots, same export codes.
- **Your saves:** move across by themselves the first time the game touches them, freeing the old space; until then they still load from where they were. Browsers without IndexedDB keep using localStorage as before.
- **Code:** new `src/sim/save/slotData.ts` (the IndexedDB store, the localStorage fallback, the move of older saves and one queue so writes land in order); `saveToSlot`, `writeSlot`, `loadFromSlot` and `deleteSlot` in `storage.ts` now return promises, and their callers wait on them (Exit to title waits for its save so Continue shows it). The autosave's "a newer save already landed" check now runs inside the queue. ESLint now also blocks `indexedDB` in `src/sim/` outside the two save files.
- **Dependency:** `fake-indexeddb` (dev only, for tests; never shipped) stands in for the browser's IndexedDB in `tests/sim/saveIndexedDb.test.ts`.
- **Checked:** lint, full test suite (824, including new IndexedDB tests: a save bigger than localStorage's whole quota fits, older saves move across, writes land in order, a failed card write restores the previous save) and build clean. In Chromium at 390×844: the save sits in IndexedDB with only its card in localStorage, it loads back after a reload and from Continue, with no console errors. No schema change, and the determinism snapshot is unchanged.
- **Docs:** DATA_MODEL §10, DESIGN decision log.

### 2026-10-26 — Market rents follow the cycle, and a Chief Real Estate Officer (v0.11.6, schema v29)
- **Owner's ask:** make market rent track the city, and add a C-suite member who manages property rents, for the bank's buildings and your own. The formulas were agreed first: rents lag the cycle, expertise is pricing power, exact reviews every 4 weeks, rents only (foreclosed homes and buying stay yours).
- **What changes.** A building's market rent used to be fixed at purchase. Now it eases toward **base rent × the country's commercial property index** by 5% a week (half-life about 14 weeks): in a boom the value jumps first and rents catch up over months, so a rent you set last year drifts off market. The stepper's hint says where market rent is heading. A newly bought building starts at today's market rent; your rent is kept inside its 50–160% range as the market moves.
- **The eighth seat: Chief Real Estate Officer (CREO).** Two switches, **Rents: the bank's buildings** and **Rents: your own buildings**, set every covered building to the highest rent that still fills it, at once when switched on and every 4 weeks after. The chief's Expertise is **pricing power**: tenants of a managed building pay up to 10% × expertise/100 over market with no loss of occupancy (a 90-expertise chief gets 9%). The profile shows what they manage and when the next review falls; a managed building says so under its rent stepper. The Executive suite now has 8 desks.
- **Your save (schema v29):** if you have an Executive suite, the CREO's candidates are waiting on the floor. Your buildings keep their current market rent and start drifting toward today's from the next week; nothing jumps.
- **Code:** `REAL_ESTATE.rentEma`, `EXEC_DELEGATION.rentEveryWeeks` / `rentPricingPower` in `balance.ts`; `baseRentFor`, `marketRentNow`, `occupancyTarget(…, pricingPower)`, `bestRent` in `propertyMath.ts`; `rentsManaged` / `rentPricingPower` in `execSeats.ts`; `execDelegationsProperty.ts`; the `creo` seat in `data/executives.ts`; `PropertyNote.tsx`; migration 28 → 29.
- **Checked:** lint, full test suite (new `tests/sim/propertyChief.test.ts`; the occupancy test now reads the eased market rent) and build clean. Determinism snapshot `12f03e8e195ddc` → `1a41be4f7a56d1` (intended: market rents now move with cre). Balance run (10 years, seed 42, steady) unchanged from main: the same single pre-existing warning (week 260 income per week), nothing new. Phone check at 390×844: the eight-seat grid, the CREO's profile and a managed building.
- **Docs:** SIMULATION §17.2 and §21.2, SCREENS §10, §10.1 and §16, CONTENT §9, DATA_MODEL §12, DESIGN §3.1, §5.8.8 and decision log.

### 2026-10-26 — Monthly results, and conventions that last the month (v0.11.5, schema v28)
- **Owner's ask:** a monthly option for the results report, so 2× and 4× play isn't interrupted every week; conventions and the like need to last the month so a monthly reader doesn't miss them.
- **What changes.** Settings → **Results** now offers Weekly / Monthly / Quarterly / Off. A monthly (or quarterly) report rolls its weeks up: revenue, net income and cash flow summed over the period, the change shown against the previous month or quarter, the latest Ledger issue in full and an **Earlier this month** card with the lead headline of each earlier week (the full issues stay in the Ledger archive). A week belongs to the month its last day falls in, so a month is 4 or 5 weeks; the first report after you switch may cover a partial month.
- **Conventions** are now announced **four weeks** ahead and open for **four weeks** (were two and one), so whenever the monthly report lands the next convention is either announced or open. Incidents and expiring loan applications still auto-pause on their own; auctions already show the next sale date on their tab; venture rounds already stay open four weeks.
- **Your save (schema v28):** your results setting stays as it was. Convention runs that haven't ended yet stretch to four weeks, and their exclusive startups' rounds stay open as long.
- **Code:** `resultsDue` in `loop.ts` (weekly / first tick after a month or quarter ends), `isMonthStart` in `calendar.ts`, `src/app/weekly/resultsPeriod.ts` (which weeks and issues a period covers, and its totals), `WeeklyResults.tsx` renders any period, `CONVENTIONS` in `balance.ts`, migration 27 → 28.
- **Checked:** lint, full test suite (new `tests/app/resultsPeriod.test.ts` and `tests/sim/migrateV27.test.ts`; the convention acceptance test retimed) and build clean. Determinism snapshot `1257044853cb38` → `12f03e8e195ddc` (intended: conventions announce and close on different weeks). Phone check at 390×844: the Settings control with four options and a monthly report.
- **Docs:** SIMULATION §2 and §20.8, CONTENT §19, SCREENS §17, §21 and §26, DATA_MODEL settings and §12, DESIGN §5.12, pillars and decision log.

### 2026-10-26 — Fewer offices, more buildings (v0.11.4, schema v27)
- **Owner's ask:** fewer office spaces (you only need a handful), more rental properties, with the high-value ones in the major cities.
- **What changes.** Each city now lists **2 / 2 / 3 / 4** offices for lease (S / M / L / XL) instead of 3 / 5 / 7 / 9. Property buildings go up to **6 / 9 / 12 / 15** per city instead of 4 / 6 / 8 / 10, and their size now depends on the city: up to 5,000 m² in a small city, 16,000 m² (about 20 storeys) in New York or London. Towers over 5,000 m² only stand in the financial, downtown and waterfront districts; buildings elsewhere stay low-rise. Rent per m² was already higher in the big cities, so the biggest values now sit there.
- **Your save (schema v27):** every office you lease stays. Spare "For lease" listings are trimmed down to the new count (lowest numbers kept). Each city you've visited gains new buildings for sale from its own map stream, so nothing already on the map moves; the extra buildings show up at the city's next listings refresh (every 4 weeks).
- **Code:** `OFFICE_LISTINGS.countBySize`, `REAL_ESTATE.buildingsPerCity`, `sqmRangeBySize` and `lowRiseMaxSqm` in `balance.ts`; `listingsByDistrict` (largest remainder) in `hqSites.ts`; `investmentSites.ts` sizes by city and tops up an existing city; migration 26 → 27.
- **Checked:** lint, full test suite (new `tests/sim/migrateV26.test.ts`) and build clean. Determinism snapshot updated to `1257044853cb38` (new games place agencies and buildings differently). The layout-1 digests fixture was regenerated; a side check confirmed that old saves keep every lot and every non-property site exactly where it was.
- **Docs:** SIMULATION §16.1 and §21.5, CONTENT §16, DATA_MODEL §12, DESIGN decision log.

### 2026-10-26 — Risk appetite moves to the Finance floor (v0.11.3)
- **Owner's ask:** move risk appetite to the Finance floor.
- **What changes.** The risk appetite card (the 1–5 dial, its effect on loans and defaults, and the line saying when your CRO or CFO is steering it) now sits on the HQ **Finance** floor, under the capital ratio and liquidity cards, because it is mostly a capital lever. The Products floor no longer shows it. The "How to fix this" capital checklist and the Finance and Products floors' first-look tips now point to the Finance floor.
- **Heads-up:** you now need a Finance floor at HQ to change the dial by hand (before, you needed a Products floor). Your current level carries over, and a seated CRO or CFO keeps steering it either way.
- **Saves:** no change. It's the same setting in a different place.
- **Code:** the card and its wording moved to `src/app/hq/finance/` (`RiskAppetite.tsx`, `riskSelectors.ts`, `finance.css`).
- **Checked:** lint, full test suite and build clean. Determinism snapshot unchanged (UI only).
- **Docs:** SCREENS §10 and §24, DATA_MODEL command table, DESIGN decision log.

### 2026-10-26 — Content trim merged (v0.11.2)
- **Owner's ask:** update pull request #2 (the 2026-10-25 content trim, v0.10.4, entry below) and merge it.
- **Brought up to date.** `main` had moved 29 commits and ten save versions since the trim was written. I merged `main` into the branch and kept both sides. The trim's save migration was written as 14 → 15, but `main` already uses 15–25 for other features, so it now runs last as **25 → 26** (schema v26), with the same steps: dealer deals removed, their fees folded into marketing, held foreclosed homes turned to renting, merged funding types retyped, and the Grand Opening Week package renamed Street Team. The old migration test still walks a v14 save all the way up.
- **One change made while merging: Community Sponsors keeps families.** With today's `main`, moving Community Sponsors from families to businesses pulled the 20-city median of first-year loans/deposits from 77.0% to 73.9%, under the 75% floor. Businesses bring deposits but borrow little. Now it reaches **families and businesses**, with the small Branch lift the trim added, so it's still distinct from Direct Mail (retirees and families, no rating lift). That holds 76.2%, and every 20-city checkpoint passes.
- **Leftovers tidied:** the car dealer's first-look tip (added on `main` after the trim) still mentioned dealer financing; it now says the showroom is personal spending.
- **Balance:** seeds 1–20, steady: all checkpoints in range. Seed 42 across all six strategies matches `main`, except one lumpy week on the steady run's first branch (a single −$188k write-off in week 258 that lands in the week-260 four-week average; the weeks around it match `main` to within $500).
- **Determinism:** snapshot `0d0dc26718fc32` → `1d63a8b8c0bfbf` (intended: the trim changes content).
- **Checked:** full suite, lint and build clean.

### 2026-10-26 — The HR floor hires branch managers (v0.11.1)
- **Owner's ask:** let the HR floor auto-hire managers for branches that don't have one, as the COO already does.
- **What changes.** Once you have an HR floor at HQ, any open branch without a manager gets one at the end of the week: HR picks the candidate in that city with the best total skills (the same pick the COO makes) and hires them at their asking salary. It only fills the seat. Unlike the COO, it doesn't switch on the branch's delegations, so you still decide how hands-off each branch is. A branch still being built waits until it opens. It also covers the week after a rival poaches one of your managers.
- **With a COO too:** the COO's Branch operations runs first that week and hires with delegation switched on, so nothing is hired twice.
- **The switch.** The HR floor has a new **Branch managers** card: "Hire managers for empty branches" (on by default) and a count of branches without a manager. Turn it off if you'd rather choose your managers yourself. Without an HR floor nothing changes: you hire from the branch as before.
- **Saves:** schema v25 adds that switch (`people.hrHiring`). Migration 24 → 25 switches it on for existing games, so your next week-end fills any empty branch if you have an HR floor.
- **Code:** `src/sim/hrHiring.ts` (weekly routine, run right after the executives), the `setHrHiring` command, the card in `src/app/hq/HrFloor.tsx`. The COO's routine now shares the same candidate pick.
- **Determinism:** the snapshot moved `00e970fac92bfd` → `0d0dc26718fc32`. That's intended: the scripted game has an HR floor and HR now fills a vacancy in it. The balance run (`--years 10 --seed 42 --strategy steady`) is identical before and after, and all its checkpoints stay in range.
- **Docs:** SIMULATION §16.11 (new) and §6.5, SCREENS §10 (HR floor), DATA_MODEL v25, DESIGN decision log.
- **Checked:** 6 new tests (the hire and pick, no floor / switch off / branch not yet open, the command, the weekly tick with and without a COO, ties, migration). Full suite, lint and build clean.

### 2026-10-26 — Title screen: "Living skyline" (v0.11.0)
- **Owner's ask:** build design pitch 3, the "Living skyline" cover (spec saved as `docs/COVER_SCREEN.md`).
- **What you'll see.** The top half of the title screen is now a real engraved city, drawn by the same renderer as the in-game map and printed in that city's ink, inside a paper panel with the map's frame rules and the city's name as microprint. It drifts slowly left and right. Under it: a caption, the one-line "VAULT STREET" wordmark, the tagline, Continue / New game, a row of Load · Settings · Credits, and a one-line footer with the version and Check for updates. On a computer or tablet it becomes two columns.
- **Returning player:** the city you were last in, with your bank's flags (and the rivals' flags) on the right rooftops, framed so your nearest branch is in view. The caption reads "{your bank} · {city}" with a dot in your brand ink. **New player:** a different city every launch, starting with Saskatoon and going through all 20 storefront cities, with three showcase flags in Vault Blue.
- **How it stays fast.** The menu appears as quickly as before (about 0.3 s on the production build here); the city fades in once it's printed (about 2 s here at iPhone resolution). The printing code is its own download, so it never delays the menu. The city is printed once into one wide picture, then the old renderer is thrown away; the drift is a CSS animation, so nothing redraws while it moves. The picture is capped at 4 million pixels for iPhone memory. If anything goes wrong, the panel just stays blank paper. The menu never waits for it and there's never an error.
- **How it knows your city without opening the save.** Each save's slot card (the small record the Load screen shows) now also remembers your current city, the game seed, that city's street layout, your start city and rival count, and which lots fly your flag. Cities are generated from the seed, so that's enough to rebuild your city's streets exactly. A test checks this against real played games, including a city flown to later and an old-layout save. This record lives on the slot card, not in the game itself, so **no save format change** (still schema v24). Cards saved before this update show your bank's name with a rotating city until your next autosave fills the record in.
- **Settings respected.** Reduced motion (the phone's setting or the in-game one) stops the drift. The drift pauses when the app is in the background. Leaving the title frees the picture; coming back (Exit to title) prints it again with whatever you just built.
- **Code:** `src/app/title/CoverSkyline.tsx` (panel), `coverPrint.ts` (printing, lazy), `coverCity.ts` (pure choices: city, camera, strip size, label; unit-tested), `src/sim/coverMeta.ts` and `coverWorld.ts` (slot card record and rebuild), numbers in `src/config/cover.ts`. The old rosette lockup and corner ornaments are gone.
- **Docs:** SCREENS §1 rewritten, ART_DIRECTION §2.2 "The cover" added, DESIGN decision log line.
- **Determinism:** unchanged; no sim or balance code changed.
- **Checked** in Chrome at 390×844 (DPR 3) for a new player (Saskatoon, then Calgary on relaunch) and a returning player (three flags, Continue resumes, Exit to title rebuilds), system and in-game reduced motion, 1280×800 two columns and a short landscape phone; no console errors, no sideways scroll. New tests: 12 for the cover choices, 4 for the city rebuild, 3 for slot cards. Full suite (798), lint and build clean.

### 2026-10-26 — Tutorial Part 2: guides for the rest of the game (v0.10.21)
- **Owner's ask:** make sure the tutorial covers everything it needs to, even if it has a second part later in the game for new mechanics.
- **What was missing.** The 7-step tutorial taught the first branch well but never touched branch marketing or the bank layer (corporate cash versus deposits, capital), and nothing after opening week was explained at all: HQ, executives, capital trouble, going public, travel, personal wealth, or any of the map places and HQ floors.
- **Part 1 is now 9 steps.** Two new steps after the business loan: **Run a campaign** (Marketing tab, pick any level; skipped if the manager runs marketing) and **Meet the bank** (tap your cash, top left: the guide explains that deposits aren't spendable, corporate cash pays the bills, and capital limits lending; done when you close the Company summary). The closing card now says the guide will be back as the bank grows.
- **Part 2: guides.** The same manager returns, in the same bar with the brass ring, when a mechanic opens up. One at a time, only while you're on the map, and the clock pauses so you can read:
  - **Headquarters** at the third branch (when HQ requirements start): find an office for lease, move in Finance and HR, then what Coverage means.
  - **The executive suite** once you have one: open HQ, hire into an empty seat, then choose the jobs they run.
  - **Capital is slipping** if the capital tier falls to Watch or worse: the Company summary's list of fixes. Ends early if capital recovers.
  - **Going public** when every IPO rule is met: an investment bank's Equity tab and the IPO card. No pressure to list; ends early if you do.
  - **A second city** when the city you're in is well covered and you've never flown: the travel sheet and the departures board.
  - **Your own fortune** once personal cash reaches $250,000 (`GUIDES.wealthCash` in balance.ts): Menu → Personal wealth.
- **Part 2: first-look tips.** The first time you open each HQ floor (9), each map place (rival branch and HQ, central bank, bureau, agency, employer, university, investment bank, startup, property, convention, lobbying firm, airport, vacation home, car dealer, auction house, sports club), Personal wealth, the Ledger, a branch's Finance tab, the M&A tab, a board meeting or an incident, the guide gives one short explanation with a **Got it** button. Moving on also counts as seen. Popup tips sit at the top so they never cover the choices. A finished guide marks the tips it already said (e.g. the executive guide covers the Executive suite tip).
- **Settings → Tutorial** now has Replay tutorial, a **Guides** switch, and **Show the guides again**.
- **Fix while there:** when the guide bar moved to the top of the screen it covered an open panel's Close button. It now sits just under the panel header.
- **How it's built.** Same pieces as Part 1: the words in `src/data/lessons.ts`, a pure step machine in `src/app/tutorial/lessons.ts` (unit-tested), and `lessonController.ts` to run it. The ring finds targets by `data-tutorial` names; map pins now carry `pin-{kind}` (e.g. `pin-office`). Commands `setLesson`, `finishLesson`, `resetLessons`.
- **Saves:** schema v24. Migration 23 → 24 renumbers an old save's tutorial closing card and "finished" (8 → 10, 9 → 11), switches guides on, and skips the guides an older bank has no need for (it already has an HQ, an executive, a listing, a flight, or that floor). So your current game won't be walked through things you've already done; you'll only see a tip the first time you open a place you hadn't opened since this update.
- **Determinism:** the snapshot moved `000acf5c010cae` → `00e970fac92bfd` only for the new save fields (with `settings.guides`, `flags.lessonsDone` and the version number stripped, the old hash comes back exactly). No sim or balance change.
- **Checked** in Chrome at 390×844: Part 1 steps 8–9 and every guide (HQ, executives, IPO, travel, wealth) played through by tapping the ringed targets, plus floor and incident tips; no console errors. 25 tutorial tests (new: steps 8–9, guide triggers and steps, tips, commands, migration); full suite, lint and build clean.

### 2026-10-26 — Changes now reach `main` through pull requests (workflow rule, docs only)
- **Owner's ask:** go back to creating pull requests and auto-merging them when there is no conflict, as a standing rule.
- **Why.** Several sessions often work at once. Pushing straight to `main` kept colliding on the version number and this file, so two features in a row had to be rebased and renumbered (v0.10.15 became v0.10.17, v0.10.18 became v0.10.19).
- **The rule** (CLAUDE.md, "Branches and pull requests", merged as pull request #4):
  1. Every change goes on its own short branch from the latest `main`.
  2. Claude opens a ready (not draft) pull request to `main`. The Deploy workflow builds and tests it.
  3. Claude turns on GitHub auto-merge (merge commit) straight away, so it lands by itself when the checks pass and the branch is deleted. If GitHub refuses, Claude merges it without asking once it is green and conflict-free.
  4. On a conflict, Claude merges `main` into the branch, bumps the version past whatever landed, re-runs lint, tests and build, and pushes. The owner is asked only when both sides changed the same logic.
  5. A red check is fixed on the branch. Nothing red is merged.
- **Repo settings.** GitHub reported auto-merge as off when pull request #4 opened, so it was merged by hand once green. The owner has since switched on "Allow auto-merge". For auto-merge to wait on CI rather than merge at once, `main` also needs a branch protection rule or ruleset requiring the `build` check (Settings → Rules). Head branches are already deleted on merge.
- `docs/DEPLOYMENT.md` notes that every merge to `main` deploys. No code, sim or save change; determinism snapshot unchanged (`000acf5c010cae`).

### 2026-10-26 — The clock can never run under the weekly results (v0.10.20)
- **Owner's ask:** make 100% sure there is no way time runs while the weekly results (The Weekly Ledger) are showing.
- **What was checked.** The game clock moves in exactly one place, the loop in `src/app/loop.ts` (plus the `?debug` fast-forward, which is not reachable in play). Flights, commands and the tutorial never move the clock. The loop already refused to advance a day while any modal, panel or sheet was open, and the HUD's speed buttons sit under the modal's scrim, so the clock was already held. Two soft spots remained and are closed:
  - **Banked time.** Real time that passed while the results were open stayed in the loop's day accumulator, so the first day after Continue could land instantly. Now any hold (modal, panel, sheet, pause, hidden tab) drops the banked fraction of a day, and a modal opening mid-frame drops it too. Closing the results always costs a full day's worth of real time before the next day, at every speed.
  - **Mid-frame re-check.** A long frame at 4× can cover several days; the hold is now checked before every day inside a frame (not only after one), so nothing can slip past a modal that a day's tick just opened.
- **Code.** `frame()` now just measures time and calls `elapse(ms)`, which is exported so tests can drive the loop without timers. `document.hidden` is guarded for non-browser environments. The frame cap is a named constant (`MAX_FRAME_MS`).
- **Tests.** New `tests/app/loop.test.ts` (7 tests): the results open on the first day of the new week and the clock stops there; a minute of real time at 1×, 2× and 4× moves nothing; stepping the week is refused; the speed setting survives; resuming takes a full day of real time before the next day; panels, sheets and a hidden page hold too; a long frame stops within the frame when the week ends. Removing the hold from the loop makes three of them fail (checked), so they guard it.
- **No sim or save change.** Determinism snapshot unchanged (`000acf5c010cae`). Lint, build and the full suite clean.

### 2026-10-26 — Quant Noir: a hyper-modern branding and look (v0.10.19)
- **Owner's ask:** at least one hyper-futuristic, modern branding and look in the style of a quantitative trading firm.
- **House style: Quant Noir.** A sixth style on New Game. The sign is a graphite slab with the bank's name in lower-case, widely spaced sans, a brand-ink pixel before it and a light strip under it; the lamps are recessed light bars in the brand ink with a soft cone of light; the planters are graphite cubes with clipped green spheres; the door is a frameless glass slab with a glowing seam and a keypad; and instead of a cloth flag a slim light blade pulses on the mast (still, with reduced motion). It dresses all six exteriors (`branch/houseStyleQuant.tsx`; the shared sign fitting moved to `signFit.ts`).
- **Exterior: Lattice Pavilion.** A sixth build option: a thin roof slab floating over a box of smoked glass crossed by a diagrid, the seal hanging in the glazing, a slate mezzanine line, and a light wall in solid brand ink beside the door with a ticker of ivory dashes. Quality 5.0 at $340,000, the Deco Tower's tier, so it is a modern alternative rather than a better buy (`branch/facadesFuture.tsx`, CONTENT §7).
- **Logo shapes and inks.** Three plain geometric shapes, Tile (a sharp square), Pebble (a rounded square) and Octagon, make nine (a full 3 × 3 picker). Four sharper inks, Graphite, Circuit Blue, Ultraviolet and Magenta, make twelve (three rows of four); all keep ivory text at 4.5:1 or better.
- **Nothing existing changes.** A game started without a style, and saves from before styles existed, draw from the five original styles only (`SEEDED_HOUSE_STYLE_IDS`), so seed picks, old saves and the determinism snapshot (`000acf5c010cae`, set by the faces change below) are untouched. No save schema change.
- **Checked** Quant Noir on all six fronts and every style on the Lattice Pavilion at 390×844, plus the New Game pickers, with no console errors; 757 tests, lint and build clean.

### 2026-10-26 — More detailed faces and a grouped portrait creator (v0.10.18)
- **Owner's ask:** update the profile picture creator and the faces: same art style, more detail.
- **Faces, redrawn.** Every portrait in the game (founder, managers, candidates, executives, startup and venture CEOs, advisors, review cards) is still an engraved banknote plate, with much more in it:
  - **Eyes** have whites, an inked iris with a pupil and a tiny catchlight, a heavier upper lid with a lash flick, a faint lower lid, and a shadow under the brow on the dark side.
  - **Brows** are little strips of hair strokes, tapering outward.
  - **Nose** has a shaded bridge, wings and nostrils. **Lips** have a cupid's bow, a shaded lower lip and a chin shadow.
  - **Hair** keeps its hatching and gains sparser strand lines over it. **Ears** show the inner curve.
  - The head has extra shade under the jaw and at the temple, the neck a tendon line, and the whole plate sits on ruled lines that get denser toward the frame, like a real banknote vignette.
  - **Attire:** the suit has a knotted, cross-hatched tie, a shaded lapel, buttons, a pocket square and sleeve seams; the blouse soft folds and a pendant; the sweater a cross-knit texture with a shirt collar; the turtleneck fold lines.
  - Tiny plates (the advisor bar, review cards) keep the stronger shapes and drop the fine marks so they stay readable at 28–40 px.
- **Four new parts in the creator**, so you can shape the face itself:
  - **Eyes:** Almond, Round, Hooded, Upturned. **Brows:** Soft arch, Straight, Bold. **Mouth:** Smile, Composed, Grin (teeth showing). **Age:** Fresh, Seasoned (smile lines, a forehead line, faint crow's feet), Veteran (deeper lines, pouches, hollow cheeks, neck lines and silver hair).
  - **Glasses** gains a fourth option, Half-rim.
- **The creator itself** is split into **Face** (head shape, eyes, brows, mouth, age, skin tone) and **Style** (hair, facial hair, glasses, attire), each row shows where you are (e.g. 3/4), the preview is bigger, and a **Shuffle** button deals a random face to start from. Same picker in Settings → Edit founder avatar.
- **How everyone else got a face.** New people don't draw the four new parts from the people RNG: they hash them from the parts they already have (`faceDetail` in `src/sim/people.ts`). That way the candidate pools and everything downstream for every seed are exactly as before, verified by stripping the new fields from the 260-week run and recovering the old hash. The determinism snapshot still moves, `12dd4c303e05ab` → `000acf5c010cae`, only for the new fields, the schema number and the fourth glasses option.
- **Existing saves:** schema v23 (migration 22 → 23) walks the save and gives every face the same hashed detail a new game would; your founder gets the defaults (almond eyes, soft arch, smile, fresh), which is exactly how they drew before.
- **Files:** the face lives in `src/art/portraitFace.ts` (eyes, brows, nose, mouth, age lines) and `src/art/portraitTrim.ts` (ears, glasses); `portraits.ts` assembles, `portraitAttire.ts` dresses.
- **Checked** the Founder step at 390×844 (top, after Shuffle, scrolled to Style) with no console errors, plus 24 seeded faces and every part option rendered at 120 px and 36 px.  757 tests (new: every generated person has detail in range, detail derives from the other parts and varies, migration 20 → 21 keeps the founder and gives everyone else their face; settings command accepts the new parts and still refuses `shade`), lint, typecheck and build clean.
### 2026-10-26 — Colour on the branch fronts (v0.10.17)
- **Owner's ask:** make the exterior of the branches incorporate a little more colour.
- **Material washes.** Every branch front (the hero on the branch panel, the Build branch preview and the New Game style picker) now has a pale second printing under its hatching, the way the map's tint underprint works: terracotta on the Heritage Brick walls, warm limestone on the Classic Columns, the Deco tower and the stone dressings, a cool wash on all the glazing, slate on roof slabs, fascias and the Modern Glass spandrels, verdigris on the Deco setbacks, and leaf green on the planting in every house style's planters. The brand ink joins in on the building itself: the awning stripes of the Plain Storefront, the pediment of the Classic Columns, the canopy of the Modern Glass front and the spandrels and crown of the Deco tower. The Deco sunburst over the door is brass now.
- **Kept it an engraving.** Washes sit at about a third strength (`.art-wash`, 32%; the awning stripes at 50%), always under the ink hatching and outlines, so the fronts still read as banknote plates and the city ink still rules the linework. The six colours are tokens (`--wash-*` in `tokens.css`, listed in ART_DIRECTION §1.1); `Face` takes an optional `wash` and a small `Wash` component lays colour on its own.
- **No sim or save change.** Determinism snapshot unchanged (`000acf5c010cae`).
- **Checked** all 25 house style × exterior pairs at 390×844 with no console errors; 753 tests, lint and build clean.
### 2026-10-26 — No double-tap zoom or text selection on buttons (v0.10.16)
- **Owner's ask:** on the iPhone home-screen app, stop double-tap zooming and stop button text getting highlighted while holding a button down.
- `base.css` now sets `touch-action: manipulation` on the page (this turns off double-tap zoom but keeps pinch zoom for accessibility) plus `user-select: none` and `-webkit-touch-callout: none`, so a long press no longer selects text or opens the iOS copy/look-up menu. Text boxes (names, amounts, save codes) stay selectable so you can still edit and copy them. CSS only.

### 2026-10-25 — Branch counts on Growth cities (v0.10.15)
- **Owner's ask:** show how many branches you already have in each city on the COO's Growth cities list.
- Each city's hint now starts with your count there, e.g. "3 branches. Next: 622 Lantern Road, €320K" (or the reason nothing can be built). Branches being built count; closed ones don't, matching the city coverage check. UI only, no state or save change; SCREENS §10.1 updated.

### 2026-10-25 — Reorder the HQ tabs (v0.10.14)
- **Owner's ask:** be able to reorder the HQ tabs.
- **Tab order.** The Office sheet (the Office button at the top of HQ) gains a **Tab order** card: the floors you have, in the order their tabs run along the bottom bar, each with ▲ ▼ arrows (44 px round buttons) that move it past its neighbour, and a **Reset order** button once anything has moved. Moves skip departments you have no floor for, and a floor you add later slots in where the usual order puts it. Arrows rather than dragging: the tab bar already scrolls sideways under a thumb, so a drag there would fight it.
- **Saved with the game.** `settings.hqTabOrder` (schema v22; migration 21 → 22 sets an empty list, which means the usual order). Two commands, `moveHqTab` and `resetHqTabOrder`; `setSettings` also validates the list (each department at most once). The HQ panel reads the order through one shared helper (`src/sim/hqTabs.ts`), and the tab labels and icons moved to `tabIcons.ts` so the Office sheet can show the same icons.
- **Determinism:** the snapshot moved `1ca6909f9fa30a` → `12dd4c303e05ab` for the new settings field only (verified by stripping it).
- **Checked** the Office sheet at 390×844: moving a floor reorders the bottom tabs at once, Reset restores the usual order, no console errors. New tests: default order, moves skip missing floors and stop at the ends, unbuilt departments keep their place, refusals and reset, setting validation, migration 21 → 22.

### 2026-10-25 — Delegation dials (v0.10.13)
- **Owner's ask:** keep simple delegations as yes/no switches, and give the ones with a target a stepped slider (HR benefits morale 70 / 80 / 90, pay reviews quarterly or annual, brand campaigns' awareness 50 / 60…) with a small tagline under it showing the company impact ("+6% cost, 5 morale").
- **Dials.** A new stepped-slider control (`StepSlider`: a rail with a few named stops, each a 44 px tap target, the chosen one lit in brass) sits under three switches on the executive profiles:
  - COO · **HR benefits → Morale target** 70 / 80 / 90. Tagline: the extra weekly benefits cost, its share of payroll against the 8% budget, and the morale it should reach ("Benefits +$1.2K/wk (3.4% of payroll, budget 8%) · morale 68 → about 80"), noting when the budget stops short.
  - COO · **Pay reviews → Review cadence** Quarterly | Annual, with the pay premium stepper moved under it. Tagline: reviews a year, how far pay can lag the market between reviews (0.8% quarterly, 3% annual, from the 3%-a-year market drift), and what the next review would add to annual pay across executives and managers.
  - CMO · **Brand campaigns → Awareness target** 40 / 50 / 60 / 70%. Tagline: the change in weekly campaign spend and its share of revenue against the 3% budget, how many branch cities get pushed, and the change in new-customer flow once awareness sits at the target.
- **Honest estimates.** The taglines come from `src/sim/execPolicy.ts`, which walks the delegations' own rules (the same benefit-step scoring, the same campaign budget check) on a copy of the state, so what they show is what the switch will do. The benefits routine was refactored to share that step logic without mutating state; its behaviour is unchanged (verified below).
- **State and saves.** `executives.moraleTarget`, `executives.brandTarget` and `executives.payReviewCadence` (schema v21; migration 20 → 21 sets 70, 50% and quarterly, exactly what the switches always did). Three new commands set them, accepting only the dial's stops. The CMO's branch guidance band now sits around the dialled target too. `PAY_REVIEW.everyWeeks` became `PAY_REVIEW.cadences` (13 / 52 weeks) with `defaultCadence`.
- **Copy.** The HR benefits, Pay reviews, Brand campaigns and CMO guidance descriptions now refer to "your target" and "as often as you choose"; the manager card's "Your COO reviews this pay once a quarter" follows the cadence.
- **Housekeeping.** Prettier reflowed nine one-line `shape=` props from the logo-shape commit that had slipped past the formatter; no code change.
- **Determinism:** the snapshot moved `0c8122394b4893` → `1ca6909f9fa30a` for the three new state fields only; stripping them from the final state reproduces the old hash, so the benefits refactor changed nothing.
- **Checked** the COO and CMO sheets at 390×844: stops are 44×62 px, taps change the stored targets, taglines update per stop, no console errors. New tests: dial commands accept only the stops, defaults, the routines read the dials (benefits, brand, 13- vs 52-week reviews), estimates are pure and move the right way, migration 20 → 21.

### 2026-10-25 — Logo shapes on the start page (v0.10.12)
- **Owner's ask:** different logo shapes for the bank on the start page.
- **Logo shape.** Step 1 of New Game has a new **Logo shape** row between the monogram and the brand ink: six chips, each a small medallion in that shape with your monogram and ink, so you see the choice before you make it. The shapes are **Coin** (the classic round medallion), **Shield**, **Lozenge** (a diamond), **Hexagon**, **Plaque** (a square with cut corners) and **Rosette** (a scalloped wax seal). The big preview at the top and the confirm step use it.
- **One outline everywhere.** A single function (`src/art/logoShapes.ts`) draws the outline, so the medallion in the top bar and on every panel, the seal on each branch front, the plaque over the counter inside, the mark over an owned building's door and your own stock card all share the shape. Map pins keep their crest, and rivals keep the round medallion; a branch still converting from a rival wears the old round seal until it is done.
- **Existing saves:** schema v20 (migration 19 → 20) sets `round`, so an older bank looks exactly as it did. The slot cards record the shape too.
- **Stronger hiring pools (owner's ask: slightly more very good candidates).** Branch manager skills now roll from normal(62, 16) instead of normal(60, 15) (MANAGER_SKILL), so about one candidate skill in eight is 80+ rather than one in eleven, with the share of weak rolls about the same. Executive skills roll in 35–93 instead of 35–90 (EXECUTIVES.skillRange), so about one in five is 80+ rather than one in six. The graduate program bonus and the clamps are unchanged.
- **Balance:** the 20-seed 5-year steady panel and all four 10-year strategies on seed 42 stay in range. The determinism snapshot moved twice: `0c2a99c12fc3fb` → `1bdfb320d06bb3` for the new `meta.logoShape` field (verified by stripping it), then → `0c8122394b4893` for the manager skill change, which is intended.
- **Checked** all six shapes on the New Game step and on a branch's front and Inside views at 390×844, with no console errors. 738 tests (new: shape stored, round default, migration 19 → 20, every outline closes), lint, typecheck and build clean.

### 2026-10-25 — House styles for branch fronts, cheaper rerolls (v0.10.11)
- **Owner's asks:** make staff rerolls 25% cheaper per reroll; do the building exterior too, stylized per company, with the style chosen at the start of the game.
- **Rerolls:** the first paid reroll now costs 7.5% of the role's market pay instead of 10%, so every reroll is 25% cheaper (a Calgary manager about $5,300 then $10,600; a first executive about $13,200). It still doubles until the free 4-weekly list.
- **House style.** Step 1 of New Game has a new **House style** choice under the brand ink, with a live storefront showing your name and colours:
  - **Old Exchange:** gilt letters on a dark fascia, carriage lanterns, box trees, a brand-ink panelled door.
  - **Jazz Age:** a stepped sign in capitals with chevrons, globe lamps, tall urns, a glazed door with brass bands and a sunburst, a swallowtail flag.
  - **Clean Line:** slim lower-case letters with a brand-ink tile, light bars, a trough of grasses, a glass door, a hanging banner.
  - **Market Street:** a rounded painted sign, hanging lanterns that sway, pots of flowers, a brand-ink door with a wreath, a pennant.
  - **Civic Stone:** capitals cut into a stone band, sconces (lamp standards on the Classic Columns steps), classical urns, a dark bronze door.
  - It dresses all five exterior options. Your full bank name is on every branch's sign, so your branches look like yours and nobody else's.
- **Livelier fronts:** two passers-by stroll the pavement and the flag stirs. Motion stops with reduced motion.
- **Existing saves:** schema v19 (migration 18 → 19) picks a style from the game's seed. Quick Start does the same.
- **Balance:** no change. The determinism snapshot moved `03b9402390e27e` → `0c2a99c12fc3fb` only because the save gained `meta.houseStyle`; with it removed the hash matches exactly.
- **Checked** every style on every exterior at 390×844 and the New Game step, with no console errors. 734 tests (new: style stored, seed default, migration 18 → 19), lint, typecheck and build clean.

### 2026-10-25 — Livelier HQ floors and a branch Inside view (v0.10.10)
- **Owner's ask:** upgrade the office and branch interior art: same style, more alive, higher quality.
- **HQ floors, redrawn.** Same engraved isometric look, much more in the room:
  - A plank floor (carpet in the Executive suite), skirting and cornice, wall tops inked like an architect's cut, windows that throw pale daylight across the floor, a clock and a door.
  - Workers sit at glowing screens with their own hairstyles and desk clutter, still tinted by team mood, with empty desks dashed.
  - Each department furnishes its own floor. Finance has cabinets and certificates, HR a water cooler and pinboard, Products a whiteboard, Treasury and IT a live ticker (IT adds blinking storage bays), Marketing posters and an easel, Risk a safe and a chart, and the Executive suite books, a sofa, a painting and a huddle table.
  - Busy floors have someone walking the aisle with a folder and two colleagues chatting at the back.
- **New: a branch Inside view.** An "Inside" pill on the branch picture switches to the banking hall, drawn from what you built:
  - the teller line's own shape (glazed counter, express counter, pods or concierge desks)
  - the lobby's floor and its glass advisor offices
  - the vault door in its style next to a safe-deposit wall
  - the ATMs, and your monogram over the counter
  - It fills with your real staff (tellers, then advisors, then a greeter), tinted by morale, and a queue as long as the wait, with someone always walking in. During fit-out there's a ladder and boxes.
  - The build screen has the same switch, so you can see the hall your parts make before you pay.
- **Motion is gentle** (breathing, typing, flickering screens, swaying plants, a turning clock hand) and switches off with reduced motion, from the phone or the in-game setting.
- **How it's built:** a shared isometric kit in `src/app/components/` (`isoKit`, `isoRoom`, `isoPeople`, `isoProps`, `isoWall`, `interior.css`) used by the HQ floor (`hq/OfficeInterior.tsx`, `hq/officeDecor.tsx`) and the branch hall (`branch/BranchInterior.tsx`, `interiorParts.tsx`, `interiorWall.tsx`, `BranchHero.tsx`). Art only: no game state, save or balance change.
- **Checked** at 390×844 for every department and five branch fit-outs, plus fit-out and the build preview, with no console errors. 731 tests, lint, typecheck and build clean.

### 2026-10-25 — Branch guidance from the COO, CMO and CPO (v0.10.9)
- **Owner's ask:** give the other C-suite seats a branch guidance delegation where it fits how they work, so managers stay independent and their skill still matters, but they get helpful steering from above.
- **COO, Branch guidance: staffing.** Every 4 weeks it looks at staff morale in branches whose manager runs staffing. Below 65 it tells managers to pay up to 6% more and staff up to 15% more; above 82 it lets them trim. The manager's People skill still sets their base wage.
- **CMO, Branch guidance: marketing.** It watches brand awareness in the cities where managers run marketing. Under 40% it pushes them to value campaigns up to 60% more, so they buy more of them; above 60% they ease off. Managers still pick which campaigns pay.
- **CPO, Branch guidance: lineup.** It watches the products rating where managers run products. Under 3★ it has them cut fees (up to 9%) and carry more products; at 4★ or better they charge a little more. Product skill still decides how close each manager prices.
- **The CTO gets none.** Digital projects are HQ work with no branch decision to steer.
- **Each profile shows what its executive is telling managers right now**, like the CFO's and CRO's note already did.
- **Tried in a live game:** a year with one delegated branch, switches on vs off. Morale ended at 40 vs 33, revenue about 3% higher, and the balance sheet stayed balanced throughout.
- **Existing saves:** schema v18 (migration 17 → 18). Executives already in a seat start with the new switch off, so nothing changes until you turn it on. New hires come with it on.
- **Balance:** the 10-year runs (steady, aggressive and turtle) stay inside every target; those scripted runs don't hire executives. The determinism snapshot moved `06e4a3cf5f24d3` → `03b9402390e27e` only because the save gained the new fields; with them removed the hash matches the old one exactly.
- **Tests:** 731 (each new part moving up and down with its reading and changing the manager's wages, prices or campaign value; switching off; no reading with no delegated branch; migration 17 → 18).

### 2026-10-25 — Quarterly pay reviews (v0.10.8)
- **Owner's ask:** the COO's Pay reviews should run every quarter, not once a year.
- **What changed.** `PAY_REVIEW.everyWeeks` is now 13 (was 52). With the switch on, every executive and branch manager is reset to market pay plus your premium four times a year, so pay tracks the market more closely and rarely drifts into the "underpaid" poaching zone. It still also runs at once when you switch it on or change the premium. The wording on the COO card, the pay policy note and the manager card now says "once a quarter".
- **Existing saves:** no shape change, so no migration; the next review comes 13 weeks after the last one.
- **Balance:** the 10-year steady run stays inside every target. Determinism snapshot unchanged (the scripted run doesn't use Pay reviews).
- **Tests:** 726 pass. Lint, typecheck and build clean.

### 2026-10-25 — Pay to reroll manager and executive candidates (v0.10.7)
- **Owner's ask:** a paid reroll for branch manager and C-suite applications.
- **How it works.** Both hire sheets end with a "New candidates · $fee" button. A recruiter deals a fresh list for 10% of the role's market pay (about $7,100 for a Calgary manager, about $17,600 for a first executive). Each further reroll before the free refresh doubles the fee. The free list every 4 weeks still comes on time and resets the fee. Executive rerolls only touch the seat you're hiring for.
- **What changed.** Closing the manager sheet no longer deals a free new list, since that would make the paid button pointless. The tutorial guide still stays on the list until your first manager.
- **Where the money goes.** Manager fees count as manager pay and executive fees as executive pay on the income statement.
- **Existing saves:** schema v17 (migration 16 → 17) adds the reroll counts, starting at zero.
- **Balance:** no change. The determinism snapshot moved `18e729fd965135` → `06e4a3cf5f24d3` only because two empty fields joined the save; with them removed the hash matches the old one exactly.
- **Tests:** 726 (paid manager reroll with the guide kept, doubling, reset and not-enough-cash; executive reroll touching one seat only; migration 16 → 17). Lint, typecheck and build clean. Clicked both sheets at 390×844 with no console errors.

### 2026-10-25 — Moscow and St Petersburg (v0.10.6)
- **Owner's ask:** add Moscow as a start city and a city in general, with a huge, high-density urban presence; add St Petersburg too.
- **A new country, Russia.** Its central bank is the Bank of Russia, at 6% (higher than anywhere else; neutral 5%). Savers earn more and loans pay more there. The ruble is the most volatile currency at the investment banks. Five original rival banks are based there (Volga State Bank and Birchcrest Bank, both listed, plus Komet, Ambermark Private and Neva Savings Union). There's also a lobbying firm, an auction house (Sokolov & Lind), a stock exchange, an ice hockey league and political parties for the Ledger.
- **Moscow** is an extra-large city (the biggest grid, 84 tiles), with a river, a big park, cream-stone blocks and a new landmark: a stepped stone tower with a needle spire. **St Petersburg** is a large canal city with a church of onion domes. Both show under the **Europe** tab on New Game, with low wages and modest rents.
- **"High density" is a real mechanic.** Cities have a new `density` setting (default 1). Moscow is 1.35 and St Petersburg 1.15: every storefront sees that much more foot traffic, the city's pool of possible customers is that much bigger, and the advice for how many branches a city supports rises with it (Moscow about 16, Tokyo 12).
- **Why Russia's inflation target is 2%, not the real 4%.** The game's economy model centres every country's inflation near 2%. With a 4% target the central bank kept cutting to the floor, which made loans boom past deposits. At 2% the rate holds around 6–7.5%.
- **Keeping old worlds the same.** Russia rolls its economy and currency from its own random streams. Adding it doesn't change when Canada or the US hit recessions in existing seeds (the first try did, and a 10-year test run lost its recession).
- **Existing saves:** schema v16 (migration 15 → 16) adds Russia's economy and currency. You can fly to Moscow and St Petersburg from any save.
- **Balance:** the 10-year runs (steady, aggressive and turtle; seed 42, Calgary) stay inside every target. Starting in Moscow lands inside the first-branch bands, with revenue a little above them thanks to the high rates. St Petersburg runs lean, like Saskatoon and Montréal. The determinism snapshot moved `1744ec22a99c2a` → `18e729fd965135` (Russia joins the news, currency and rival rolls).
- **Tests:** 724 (new: a Moscow start with Russian rivals and denser lots, a year in Moscow with balanced books, flying to St Petersburg, Russia's own streams and migration 15 → 16). Lint, typecheck and build clean. Checked both maps at 390×844 with no console errors.

### 2026-10-25 — CFO + CRO branch guidance, COO pay reviews, managers can be poached (v0.10.5)
- **Owner's asks:** (A) let the CFO and CRO jointly change how branch managers handle products and risk; (B) a C-suite toggle that pays executives and branch managers market ± a percentage you set, rising every year, so they're harder to poach.
- **A. Branch guidance.** The CFO and the CRO each have a new switch, "Branch guidance: funding" and "Branch guidance: lending". Every 4 weeks the CFO nudges the deposit rates of managers you've delegated "Products & rates" to: up when liquidity is under target, down when it's well above. The CRO nudges their loan rates and Loan Desk approvals: dearer and stricter when capital is under 12% or losses run high, a little looser when both are healthy. Steps are 0.10 pp; deposits never go above the funding cost and loans never below it. Their profiles show the guidance in force. With a switch off, that half goes back to neutral.
- **B. Pay reviews.** The COO has a new "Pay reviews" switch and a **Pay premium over market** stepper (−10% to +30%, default +5%). Once a year, and right away when you switch it on or change the premium, every executive and branch manager is set to market pay plus the premium. Manager market pay now rises 3% a year with their time at the bank, so fixed pay drifts behind.
- **Poaching.** To make pay matter, rival banks can now poach branch managers: rarely at market pay, three times as often under 90% of market, half as often at 110% or more. You get a toast, the branch's delegations come back to you, and the COO's Branch operations (if on) hires a replacement. Executives paid 110%+ of market are now half as likely to resign. The manager card shows market pay and whether they're underpaid.
- **Existing saves:** schema v15 (migration 14 → 15). Your current CFO, CRO and COO get the new switches **off**, so nothing changes until you flip them; "Where to look" will count them as switched-off delegations. New hires start with them on.
- **Balance:** the 10-year runs (steady, aggressive, turtle; seed 42) stay inside every target. The balance bot now rehires poached managers, as an owner would. The determinism snapshot moved `009a66bf5840b5` → `1744ec22a99c2a` (new fields and manager poaching).
- **Tests:** 717 (guidance steps, caps and reset; prices and approvals move; migration 14 → 15; market pay and tenure; poaching odds and hand-back; pay reviews and the premium range; the well-paid resignation factor). Lint, typecheck and build clean. Checked at 390×844: the COO's premium stepper, the CRO's guidance readout and an underpaid manager's card, with no console errors.

### 2026-10-25 — Developer payment, bigger starting cash, real currency conversion (v0.10.4)
- **Owner's asks:** (A) a $10,000,000 payment in a developer settings toggle; (B) raise the starting cash a little; (C) make the currencies worth the same as each other instead of 1:1.
- **A. Developer tools.** Settings has a new **Developer** section. Switch on "Developer tools" (remembered on this device only, not in your save) and, inside a game, a button adds $10,000,000 to company cash. It counts as money the owner put in (paid-in capital), so the books still balance and no shares are issued. Command: `devPayment` in `src/sim/commands/dev.ts`; amount `DEV_PAYMENT` in `balance.ts`.
- **B. Starting cash** is up about 20%: $600K / **$900K** (default) / $1.2M / $1.5M (was $500K / $750K / $1M / $1.25M). The 10-year balance run still lands inside every target.
- **C. Currencies.** Before, picking ¥ just put a ¥ in front of the same number, so ¥750K was the same as $750K. Now each symbol has a fixed exchange rate ($ 1, C$ 1.35, £ 0.80, € 0.90, ¥ 150) and every amount converts: the starting cash reads $900K, C$1.22M, £720K, €810K or ¥135M, all the same value. This covers the top bar, panels, statements, news, incidents, and anything you type (wages, prices, dividends, offers, currency trades), which is typed in your currency and converted back. Yen shows no cents. The game's own numbers are unchanged; only what you see converts. The rates live in `src/data/settingsOptions.ts`.
- **Save format:** unchanged (no new state). The determinism snapshot moved `0f42b6c195480e` → `009a66bf5840b5` only because of the bigger starting cash: with the old $750K it reproduces the old hash.
- **Tests:** 706 (currency conversion and typed money, the developer payment keeps the books balanced). Lint, typecheck and balance clean. Checked at 390×844 with ¥ selected: the button reads "Add ¥1.50B to company cash", cash went $900K → $10.9M, no console errors.
- **Not converted:** a few plain-sentence refusal messages from commands (e.g. "You need $332,000") still print in dollars.
### 2026-10-25 — Content trim: less overlap, same game (v0.10.4)
- **Owner's asks** (after a content audit for bloat): 1 fix foreclosed homes, 2–3 keep risk appetite on HQ with both CFO and CRO able to move it, 4 and 5 fix the overlapping campaigns and agency package, 6 universities stay, 7 currencies stay, 8 remove the dealer financing screen, 9 merge funding types to four, 10 the consumer loans as I see fit.
- **1. Foreclosed homes lose Hold.** Hold and Rent carried the same 6% cost, and only Rent earned anything, so Hold was never the right choice. The card now offers **Rent / Sell all**, and new pools start renting.
- **2–3. Risk appetite.** It stays one dial on the HQ Products floor. The CRO's switch still tunes it up and down. The CFO's Capital switch now steps it down while capital is weak *even with a CRO seated* (before, the CFO stood aside). The two take turns, 2 weeks apart in the 4-week cycle, so the dial never moves twice in one week; in a capital squeeze it can come down every 2 weeks. The card now says who is steering it ("Your CRO tunes this every 4 weeks, and your CFO steps it down while capital is under 10.5%. You can still set it yourself.").
- **4. Campaigns.** Still ten. Paperless Pledge now lifts the **Products** rating (it repeated Free Lobby Coffee's Branch lift). Community Sponsors now reaches **businesses** with a small Branch lift (it repeated Direct Mail's families). Direct Mail keeps retirees and families. My first try (Direct Mail on retirees only, plus extra new deposits) pulled first-year loans/deposits down to 69.9% across 20 cities, under the 75% floor, so I dropped it.
- **5. Agencies.** Northwind & Pike's two-week package is renamed **Street Team** (was "Grand Opening Week", which read like a new branch's own opening boost). Same price and effect; dropping it would have left that agency with nothing to sell.
- **8. Dealer financing is gone.** The car dealer is just the showroom now. Running deals end when a save loads; the fees they charged move into the marketing line, so past statements keep the same totals.
- **9. Funding types: six to four.** Brokered Deposits merged into **Term Interbank** (26–104 weeks, $2–50M, +0.50%, repayable early) and Senior Bond into **Covered Bond** (3–10 years, $25–500M, +0.85%, still needs mortgage cover). Overnight and the central bank window are unchanged. Existing lots and offers convert on load.
- **10. Line of Credit stays.** On a closer look it is the only revolving credit business customers take, so it isn't a duplicate of Personal Loan or Credit Card. Changing it would only have moved the balance numbers.
- **Not touched:** the audit's item 3 (popups with only an OK button, such as Dividend due, that pause the game). Your reply's "3" read as part of the risk-appetite answer, so I left those popups alone; say the word if you want them turned into toasts.
- **Save format:** schema v15 with migration 14 → 15 when written; renumbered to v26 / 25 → 26 when merged on 2026-10-26 (all of the above, `tests/sim/migrateV14.test.ts`).
- **Determinism snapshot** `0f42b6c195480e` → `05ae9fae13ba53` (intended: rented REO, the campaign retune and the funding mix all change play).
- **Balance:** `npm run balance` (seed 42, all six strategies, 10 years) shows the same warnings as before the change: steady's week-52 income (now 17.1k against $20k, was 1.6k) and aggressive's year-3 assets vs steady. Across seeds 1–20, every first- and second-year band passes (week 52 loans/deposits 75.1%, was 77.6%).
- **Tests:** 704, lint, typecheck and build clean. One test changed meaning: the CFO-capital test's no-CFO bank still fails, but now by insolvency before takeover (the retuned campaigns leave it about $50k shorter of cash, past its credit line), so it accepts either kind of failure. Checked at 390×844 in a browser: the risk appetite card with both executives seated, the dealer's showroom without tabs, the foreclosed homes card with Rent / Sell all. No console errors.
- **Docs:** DESIGN §3.1, §5.11 and seven decision-log entries; SIMULATION §13.6, §17.2, §21.3; CONTENT §8, §11, §12, §14; SCREENS §10, §16, §19; DATA_MODEL v15; ROADMAP Stage 9; ART_DIRECTION pins.

### 2026-10-25 — CFO share sales on their own switch; the build sheet remembers your fit-out (v0.10.3)
- **Owner's asks:** (A) a separate CFO toggle for private offerings and share sales; (B) the build sheet should remember the last branch's parts instead of resetting the vault, lobby and the rest.
- **A. Share sales.** The CFO's old Capital switch did two things: protect the ratio (sell company stocks, trim risk appetite) and sell new shares, which dilutes your stake. They are now two switches. **Capital** keeps the first part. **Share sales** sells new shares when the bank falls to Restricted or Critical (under 8%), sized to get back to 12%: a private placement while you're private, a secondary offering once listed. The CFO never launches your IPO; that stays your decision. Your current CFO keeps doing exactly what they did (Share sales starts matching their Capital switch); new hires start with both on, as every delegation does.
- **B. Last fit-out.** The build sheet now opens with the parts of the last branch you built. Before your first build it still picks the mid build if you can afford it, then basic. The COO's Expansion builds the same fit-out. Only your own builds change it; the COO's don't. Existing saves start from your newest branch's parts.
- **Save format:** schema v14 (`company.lastBuild`, the CFO's `shares` toggle) with migration 13 → 14. The determinism snapshot moved `09b8b0090c6bba` → `0f42b6c195480e` only because of the new fields: removing them reproduces the old hash, so play is unchanged.
- **Tests:** 703 (CFO with Share sales off sells stocks but never shares; the last-build memory; migration 13 → 14). Lint, typecheck and build clean. Checked at 390×844: built a branch with a Fortress Vault, and the next build sheet opened with the same five parts; the CFO's profile shows the four switches. No console errors.
- **Docs:** SIMULATION §17.2 table and §17.4, SCREENS §4, DATA_MODEL v14, DESIGN decision log (two entries).

### 2026-10-25 — Cash and liquidity are easier to keep in hand early (v0.10.2)
- **Owner's note:** "the cash float seems hard to keep under control early game", meaning both the Cash figure in the top bar and the liquidity ratio.
- **What was happening.** A trace of a fresh $750k game: one mid branch leaves $411k and the bank loses money for its first 8 weeks, so cash bottoms at $374k in week 8 and then climbs. A second branch opened in week 2 takes cash to about $0 for six weeks. Nothing on screen said what the bank costs to run each week or how long cash would last. Separately, the liquidity ratio slid from 23% at the end of year one to 14% in year three as loans outgrew deposits: Treasury only defended the 10% minimum, so the ratio sat under the 15% target for years and the only early lever was the one-way transfer, which drains corporate cash.
- **Cash cover.** The bank's running costs a week and the weeks of them cash would pay for now show on the Company screen (a Cash card under the capital meter), and the build sheet shows "Cash after build" and the cover it would leave, in red with a warning line under 8 weeks (`ATTENTION.cashCoverWeeks`). "Where to look" flags cash under 8 weeks of costs as Watch and cash below zero as Urgent. It is the same measure the COO uses for their expansion reserve, now in `src/sim/cashCover.ts`. Building is never blocked by it; you asked to keep paying attention.
- **Liquidity holds its target.** With auto-funding on (the default), Treasury now borrows overnight each week to keep the ratio at your target, within the overnight limit; the central bank window still covers only what the 10% minimum lacks. With auto-funding off nothing is borrowed, as before. The Company screen's liquidity card shows the Treasury gauge's status, any overnight borrowing and whether auto-funding is holding the target. "Where to look" now flags a lending freeze, a ratio under the minimum, or a ratio under target only when auto-funding is off. Cost: a small interest drag (borrowing at about policy + 0.2% to hold reserves earning policy − 0.5%); the steady 10-year balance run stays inside every target, with the same pre-existing week-52 income warning as before.
- **Determinism snapshot** `0c95376ab09fe5` → `09b8b0090c6bba` (the treasury change; intended). No save format change.
- **Tests:** 700 (3 Treasury target tests, 1 attention test, 1 cash-cover test). Lint, typecheck and build clean. Checked at 390×844 in a browser: the Company cash and liquidity cards, the build sheet with 37 weeks of cover and with 7 weeks (red, warning line), and the Watch item at 4 weeks of cover. No console errors.
- **Docs:** SIMULATION §13.5, SCREENS §4 and §24, DESIGN decision log (two entries).

### 2026-10-25 — Sheets scroll properly on iPhone (v0.10.1)
- **Fixed (owner's recording):** on the COO's profile, opened from the HQ Executive floor, scrolling stopped working partway and the sheet's own title disappeared. On iPhone, a sheet opened from inside a screen was being drawn inside that screen's scrolling area. It got clipped under the screen's header and tab bar, and two scroll areas fought over each swipe.
- Every sheet, confirm and popup now opens in a layer of its own at the top of the app, outside any scrolling screen. Their scroll areas also stop at their ends instead of dragging whatever is behind them. Nothing changes in how they look.
- **Code:** `src/app/components/Overlays.tsx` (the layer, mounted last in `App.tsx`); `Sheet` and `Modal` in `Panel.tsx` render through it. CSS drops the deprecated `-webkit-overflow-scrolling` from panel content and adds `overscroll-behavior: contain` to panel, sheet and modal content.
- Checked in a browser at 390×844: the COO sheet mounts in the new layer, its header stays fixed while the content scrolls to the bottom, the HQ screen behind does not move, the Fire confirm stacks on top, and Cancel then Escape close them in order. 695 tests pass, no console errors. The iPhone behaviour itself can only be confirmed on your phone.

### 2026-10-25 — Run the top of the bank (v0.10.0)
- **Done (owner's ask):** four changes so you can run the top of the bank and leave the branches to hired staff.
  1. **COO Expansion.** A new switch on the COO's profile. Each week they may open one branch for you in a city you have marked for growth: the growth city with the most room, the busiest free storefront that isn't on top of one of yours, your usual fit-out (your newest branch's build, else the mid or basic reference build), at most one every 4 weeks, and only while 8 weeks of running costs stay in cash. **Growth cities** sit under the switch: every city you have visited, each with a toggle and an **Open now** button that has the COO build there at once (needing only the cash for the build). Switching Expansion on with nothing marked starts with the cities you already have branches in. You still cannot build where you are not; the COO can, because they travel for you.
  2. **Seats remember their toggles, and hires start with everything on.** No automatic rehiring (owner's call). But every candidate now comes with all delegations on, and when an executive leaves, the seat keeps their toggles for the next hire, so a poaching never silently switches the bank back to manual.
  3. **COO Company troubles.** With it on, the COO settles company and city cases (data breach, card fraud, regulator audit, price war, information notices) the way a trusted branch manager settles branch cases: lowest expected cost, judged in weeks of company revenue, with a little error that shrinks with their Expertise. Bank runs, the emergency rescue and poached executives are marked `yours` and always reach you. The toast says what the COO decided.
  4. **Where to look.** A new card at the top of Menu → Company listing the three things that most need you, worst first (Urgent / Watch / Note), each a tap to the right screen: capital tier, open cases, liquidity under target, expiring loan applications, branches losing money for 4 weeks, ratings under 2.5, understaffing, loan losses over the 1.2% ceiling, morale under 50, branches without a manager, empty executive seats, switched-off delegations, and cities where few people know you. "All clear" when nothing qualifies.
- **Not done (owner's call):** no faster speed or "play to quarter end", and no automatic replacement of poached executives.
- **Code:** `src/sim/execDelegationsGrowth.ts` (expansion plan and routine), `src/sim/attention.ts` (the ranking), `commands/executives.ts` gains `setGrowthCity` and `cooOpenBranch`, `buildBranch` takes `via: 'coo'` for a build away from where you are, `incidents.ts` gains `executiveChoice` and `troublesDelegatedToCoo`. New constants under `EXEC_DELEGATION` (expansion*, troublesError) and `ATTENTION` in balance.ts. UI: `src/app/company/WhereToLook.tsx`, `src/app/executive/GrowthCities.tsx`.
- **Saves:** schema v13 (`executives.remembered`, `growthCities`, `lastExpansionWeek`); migration 12 → 13 adds them and switches waiting candidates' delegations on.
- **Determinism snapshot** updated to `0c95376ab09fe5`: the scripted run never hires an executive, and with the new fields and the schema number removed from the serialized state the old hash `0d4e27c63a2b9f` comes back exactly, so the sim's behaviour is unchanged. Tests: 8 new (seat memory, migration, expansion routine and commands, company troubles, attention ranking).

### 2026-10-25 — The Weekly Ledger (v0.9.8)
- **Done (owner's ask):** the newspaper is now called **The Weekly Ledger**. It already came out once a week (one issue per weekly close, numbered by week, shown in the weekly results and kept under Menu → The Ledger); only the name said Daily. Nothing about its timing changed.
- The rename covers the masthead, the archive screen, the tutorial line, the lobbying warning and every mention in the design docs. Older entries in this log keep the old name as written at the time.
- Checked the masthead at 390×844: it still fits on one line. 683 tests pass and the determinism snapshot is unchanged (the name was never part of saved story text).

### 2026-10-25 — Time passes only on the map (v0.9.7)
- **Fixed (owner's recording):** the clock kept running while a branch, HQ or menu screen was open, so the weekly results and the board meeting popped up on top of whatever you were reading. Now any open panel, sheet (Menu, Layers, Travel) or popup holds the clock. Nothing changes about your speed setting: close the screen and play carries on at the same speed. The incident and board prompts that queue behind the weekly results also wait until you are back on the map.
- On desktop, where panels open as a side drawer over the map, the date pill reads paused while the drawer is open.
- **Code:** one rule, `clockHeld()` in `src/app/store.ts`, read by the loop (`src/app/loop.ts`) and the HUD. New test `tests/app/clockHeld.test.ts`.
- Checked in a browser at 390×844: with a branch panel open for two seconds at 4× the day did not move; it resumed on close. 683 tests pass, no console errors.

### 2026-10-25 — A CFO who steers capital back to safety (v0.9.6)
- **Done (owner's ask):** the CFO has a new **Capital** switch on their profile (Executive floor → tap the CFO). With it on, they watch the capital ratio every week and act when it slips:
  - **Watch or worse (under 10.5%):** sells the stocks the company holds and turns risk appetite down a step every 4 weeks (unless your CRO already runs risk appetite).
  - **Restricted or Critical (under 8%), or equity under $2M:** sells new shares through the cheapest investment bank, just enough to get back to 12% (more if the regulator has added a buffer). While private this is a private placement, so the usual limits apply: 3 rounds, 26 weeks apart, up to 25% each. Once listed it's a secondary offering.
  - Above 10.5% the CFO leaves your capital alone.
- **Checked that it works:** a bank knocked down to 3.5% with the CFO on climbs back to Adequate (about 11%) in roughly 28 weeks and reaches Strong within a year. The same bank without a CFO stalls at 4.6% and is taken over by the regulator. Both are now tests (`tests/sim/cfoCapital.test.ts`).
- **Worth knowing:** a bank in deep trouble is valued low, so one share sale may not be enough on its own. The CFO raises as much as allowed and lets profits and the next round do the rest.
- The "How to fix this" checklist now ends with a tip to seat a CFO and switch on Capital.
- **Code:** `src/sim/execDelegationsCapital.ts` (new), the `capital` delegation in `src/data/executives.ts`, and `cfoTargetCr`/`cfoRaiseStep` in `EXEC_DELEGATION`. Older saves need no migration: existing CFOs simply have the new switch off.
- 681 tests pass and the determinism snapshot is unchanged. Checked the CFO profile at 390×844 with no console errors.

### 2026-10-25 — The capital warning says how to fix it (v0.9.5)
- **Done (owner's ask):** when your capital ratio is low, the game now tells you what to do about it.
  - **The Daily Ledger story** ("Thin cushion at …", "Regulator puts … on watch") now ends with the fixes: sell new shares through an investment bank, sell the stocks the bank holds, or turn risk appetite down.
  - **Company summary and HQ Finance floor:** at Watch, Restricted or Critical, a "How to fix this" checklist appears under the capital meter. It lists four steps in order: sell new shares (Private placement while private, Secondary offering once listed), sell company stocks and startup stakes, lower risk appetite, and hold off on branches, property and dividends. At Critical it adds a red line about the emergency rescue offer.
- **Code:** the wording lives in `src/data/capitalFixes.ts`; the checklist is `src/app/company/CapitalFixes.tsx`; the news story gets a new `{fix}` token in `src/sim/newsWeek.ts`.
- **Checked** at 390×844 with a Critical bank: the checklist shows under the meter with no console errors. New test `tests/sim/capitalFixNews.test.ts`; all 676 tests pass and the determinism snapshot is unchanged.

### 2026-10-25 — Fresh manager candidates on reopen (v0.9.4)
- **Done (owner's ask):** closing the "Hire a manager" sheet without hiring now deals a new set of candidates, so reopening it shows new people. The sheet's footer now says "Not keen on anyone? Close this and reopen it to see new candidates." instead of a countdown.
- **The tutorial guide stays:** until you hire your first manager, the first candidate is your guide (the tutorial says "I'm on the list too"), so they stay on the list and only the other two change.
- **Code:** new command `rerollManagerCandidates` in `src/sim/commands/staff.ts` (deterministic, from the `people` stream). The hire sheet calls it when it closes without a hire.
- **Checked** at 390×844: opened and closed the sheet three times and got new names each time, with the guide kept. Added a test; all 674 tests pass and the determinism snapshot is unchanged.

### 2026-10-25 — Your places in your brand colour (v0.9.3)
- **Done (owner's ask):** everything you own on the map is now drawn in your brand colour, each with its own icon:
  - branches: your crest with your monogram (as before);
  - HQ: your crest with an office icon and the small crown;
  - property you own: your crest with a building icon (was a teal "Owned" tag);
  - vacation homes: your crest with a villa icon (was an "Owned" tag);
  - clubs you own: your crest with a trophy (was the stadium seal with a tick).
  - "Selling" and "Rebuilding" show as a note under the crest. Your places sit on top of other pins and group with your branches at the far zoom.
- **Not changed:** partners (employers, universities, car dealers) keep their own colour with the small brand tick, because you partner with them rather than own them.
- **Code:** `owned` on map pins (`src/app/map/pins.ts`), `pinShape` and `ownedGlyph` in `markers.ts`, and an `icon` option on `Crest`.
- **Checked** at 390×844 with a branch, HQ, property, vacation home and partner in Calgary. No console errors; tests pass.

### 2026-10-25 — Version number 0.9.2
- **Done:** bumped to **v0.9.2** (`package.json`) for the new Check for updates button on the title screen.

### 2026-10-25 — Check for updates button
- **Done (owner's ask):** the title screen has a **Check for updates** button under the version number. It asks the site for a newer version. If there is one, it downloads it and the game reloads into it. If not, a message says "You have the latest version". With no connection it says so.
- **Why:** the home-screen app on iPhone is often resumed rather than reopened, so a new version could wait until you swiped the app away. Now you can pull it in with one tap. It's only on the title screen, where no game is loaded, so nothing can be lost.
- **Code:** `checkForUpdate()` in `src/app/pwa/register.ts`; the button in `src/app/title/TitleScreen.tsx`.
- **Checked** at 390×844: the button fits (44 px tall) with Continue showing, and the page doesn't scroll. With no new version it shows the "latest" message. After a simulated new deploy, it reloaded once into the new version. No console errors; tests and lint pass.

### 2026-10-25 — Version number 0.9.1
- **Done:** bumped to **v0.9.1** (`package.json`) so the title screen shows a new number for the HQ clean-up, calmer map symbols and the new bottom tabs, which had shipped under 0.9.0. Patch bumps (0.9.x) mark polish builds before 1.0.0.

### 2026-10-25 — Bottom tabs easier to use and read
- **Done (owner's ask):** the bottom tab bars on panels (HQ floors, branch, investment bank and the rest) were hard to read and use. On the HQ, the floor you were on could sit off screen with nothing showing the bar scrolled.
  - The current tab now sits in a brass pill with bold brass text, instead of only a thin line above it.
  - The bar scrolls the current tab to the middle whenever you change tab, so it is never hidden.
  - When some tabs are hidden, that side fades out under a chevron (‹ or ›). Tap the chevron to page that way, or swipe as before.
  - Bigger labels and icons (HQ labels 12 → 13 px, icons 22 → 24 px) and taller tabs (56–62 px).
  - The five branch tabs still fit on one screen at 390 px. With Large text, branch labels wrap onto two lines as before.
- **Code:** the bar is now its own component, `src/app/components/PanelTabs.tsx`, used by every Panel. Added `chevronLeft` and `chevronRight` icons.
- **Checked** at 390×844: the HQ on its first, middle and last floors, chevron paging, the branch panel, and Large text. No console errors; all 672 tests pass, lint and types clean.

### 2026-10-25 — HQ and map symbols clean-up
- **Owner's picks (popups):** an icon floor bar and an Office sheet for the HQ; one pin size, words only at close zoom, compact office tags and quieter open-spot dots for the map. Not picked, so not done: tidier executive cards, a shorter HQ illustration, smaller rival crests.
- **HQ:**
  - The cramped row of words at the bottom is now an icon over a short label for each floor, scrolling sideways. Five new icons: ledger (Finance), card (Products), screen (IT), briefcase (Executive) and plus (Add floor).
  - The address, floor list, rent and the Release floor / Release office buttons left the bottom of every floor. They're now in an **Office** sheet from the button in the HQ header. The release confirms work as before.
- **Map:**
  - Crests, round badges, tags and seals now share one footprint (about 28 px), so nothing shouts over the rest. Seals went from 40 to 32 px and crests from 30 × 34 to 26 × 30.
  - Text under pins ("Sale wk 4", "Converting", bank names) and the words on tags ("For lease") show only at close zoom. Office tags are compact glyph tags until then.
  - Open branch spots are small brass dots on the roof; the "$" coin appears at close zoom. They keep their full tap target.
- **Checked** at 390×844 in the browser: HQ floors, the Office sheet and its release confirm, and the map at far, normal and close zoom. No console errors; all 672 tests pass, lint and types clean. Added a `?debug` helper, `__vs.importSave(code)`, to open a saved game code for screenshots.

### 2026-10-25 — Recap no longer see-through when it opens
- **Done:** when the week ended with a panel open, the weekly recap faded in over it and both showed through each other for a moment (the owner's screen recording). The backdrop's fade was fading the recap too. Now only the dark backdrop fades, and every bottom sheet and pop-up slides up as a solid card. Checked at 390×844: no see-through frames, no console errors, all 672 tests pass.

### 2026-10-25 — Version number 0.9.0
- **Done:** the title screen read v0.0.1, left over from Stage 0. It now reads **v0.9.0** (set in `package.json`; the title screen and new saves read it from there). All ten stages are built, so this is the pre-launch build; **1.0.0** is for launch, once the owner's iPhone check and tuning pass are done.
- **Next:** bump the version with each release from here (`npm version <x.y.z> --no-git-tag-version`).

### 2026-10-25 — Audit: everything built, gaps closed
- **Stage / step:** post-launch audit (owner: "make sure everything is built and nothing has been missed … report issues to me before fixing"). Every system in DESIGN §3.1 was already in the game except milestones. The audit found a handful of rule gaps and loose ends, reported them, and the owner chose yes or no on each in popups.
- **Weekly recap holds time:** time already stopped while the recap was open. The HUD now shows that too: the play icon, with no speed, until you tap Continue.
- **Sim fixes (owner said yes):**
  - **Milestones:** 11 goals, from first branch to top of the rich list, on a new Milestones screen in the menu. Each one toasts when you reach it, and the big ones make a Ledger story. Older saves fill in milestones already reached, without news.
  - **Loan Desk rules:**
    - Managers deciding loans by delegation now respect the Critical capital tier and the funding freeze. Before, only the player was stopped.
    - At the Restricted tier, half as many applications arrive.
    - A staffed Risk floor makes every branch's risk estimate sharper.
    - A deciding manager's Ethics shifts their approval line: below 60 they take riskier loans, above it they're stricter.
  - **Insolvency:** the game isn't lost while an undrawn credit line could cover the cash hole.
  - **Rivals:** each rival now has a CFO, COO and CRO under the CEO (shown on their HQ panel). Resignation news can name any of them.
  - **Regional employers:** split into oil sands, iron mine and shale field.
  - **Stadium naming rights:** now makes a Ledger story.
- **Screens (owner said yes):**
  - **Weekly recap:** Revenue and Net income read "Delayed" while the Finance floor is short.
  - **Menu:** Portfolio and Milestones entries.
  - **Wealth:** stock cards have a Trade button.
  - **Storefront:** an area mini-map showing streets, water, parks, rival and own branches, and the competition radius.
  - **M&A:** cards show the same market stats as the Market tab.
  - **Loan Desk strip:** applications this week, approved, declined, approval rate, balance, and loans defaulted last week (count and amount).
  - **Treasury floor:** partnership cards and sliders for the two policies.
  - **IT floor:** a 26-week app-rating trend, yearly breach odds, and a warning when the CTO seat is empty.
  - **HQ:** staff figures on every floor coloured by morale, with outlines for open seats.
  - **Branch Products tab:** the real house-model rosette and a Manage models button.
- **Saves:**
  - Each slot now stores a checksum, so a damaged slot is refused instead of half-loading.
  - When browser storage is full, the message says "Storage full — export your save" and has an Export save button.
  - Key names are unchanged, so every existing save still loads.
- **Clean-up:**
  - Removed stale "later stage" text, the unused placeholder floor and placeholder renderer, and the unused `polish` flag (Stage 10 needs no flag).
  - Fixed the one build warning by splitting the credits link out of the credits screen.
- **Kept as is (owner said no), logged in DESIGN §7:** HUD long-press and plane icon, convention networking as flavour. Also logged: save key names, the 50 ms clock timer, the one-column Ledger on phones, and no credit-bureau tier.
- **Saves:** schema **v12**. Migration 11 → 12 adds desk arrivals, rival benches and the milestone catch-up. See DATA_MODEL §12.
- **Determinism snapshot:** `1bef8d65d74559` → `0d4e27c63a2b9f`. This is an intended change: new rival bench draws, Loan Desk rules, milestones and the snapshot's app rating.
- **Balance:**
  - The 20-seed median panel (`--years 5 --seeds 1-20 --strategy steady`) is all in range. For example, week 52 income is $27.1k/week (target $20–40k) and week 260 income is $40.0k (target $38–70k).
  - Seed 42 over 10 years meets every steady target: 153 branches and $10.2B assets in year 10.
  - Seed 42's single week-52 income reading is $1.6k. It was already below the band before this session ($11.5k), because one city and one week is noisy (a default lands that week). The median is the judge.
- **Checks:**
  - tsc, ESLint, Prettier and all tests pass. New tests: save slots (checksum, damaged slot, storage full), milestones, HQ floor extras, Loan Desk strip, M&A cards and the storefront area map.
  - The build has no warnings.
  - Checked at 390×844: the clock holds on day 7 while the recap is open and the HUD reads paused. Also checked the Milestones and Portfolio panels, the rival bench, and a save and load with checksum. No console errors.
- **Dependencies:** none added.

### 2026-10-25 — Start in any city
- **Stage / step:** post-launch feature (owner: "I'd also like to be able to start in any city").
- **Done:**
  - New Game's city step lists all 18 cities with storefronts (the three regional sites stay travel-only). Region tabs (Canada / U.S. / Europe / Asia-Pacific) keep the list short on a phone; it opens on the chosen city's region.
  - Each card now shows the country (Paris, Frankfurt and Amsterdam say France, Germany and the Netherlands rather than "Eurozone"), and each new city has its own one-line flavour.
  - The intro explains that the start city's country becomes the bank's home: the central bank you borrow from, the taxes you pay and the exchange you list on.
  - Fixed a style clash: the city list's header class (`city-head`) was also styling the New Game city cards and stacking their titles. The city list now uses `citylist-head`.
- **Checks:**
  - New `tests/app/startCities.test.ts` covers every start city: its region tab, flavour line and country name, and that a new game starts at home there.
  - A 10-year steady run from each of the 18 cities finishes without errors. Results differ by city, as they already did between Saskatoon and New York; the balance bands still use Calgary.
  - Checked at 390×844: the region tabs, the London card and a London start with the tutorial, with no console errors.
- **Saves:** no change. `meta.homeCityId` already records the start city.
- **Dependencies:** none added.

### 2026-10-25 — Fewer storefronts, scaled to the competition
- **Stage / step:** post-launch balance (owner: "quality vs quantity: better branches or more of them are two distinct expansion plans, so locations should feel slightly scarce and scale with the number of competitors").
- **Done:**
  - **Lots per city** = a base for the city size plus room for each rival bank (CONTENT §3). With the usual rivals: Saskatoon 20 (was 36), Calgary 32 (was 56), Toronto 44 (was 80), New York 62 (was 110). Fewer rivals means fewer lots, and more rivals means more: Calgary has 23 with 1 rival and 40 with 5.
  - At the start about three times the advised branch count is free, and rivals take more as they grow. Downtown corners often go to rivals first.
  - **Both expansion plans work** (5 years, 3 seeds, after build costs):
    - Calgary: 7 premium branches net $71M; 10 basic net $73M.
    - Toronto: 7 premium net $70M; 10 basic net $74M.
    - Saskatoon: 5 premium net $36M; 10 basic net $40M.
    - Mid builds sit a little ahead as the middle path.
  - The map is cleaner, with fewer open-lot coins.
- **Checks:**
  - tsc, eslint, prettier, 643 tests and the build all pass.
  - Two tests assumed lots that rivals now often hold, so they were adjusted:
    - A partnership test builds on any free lot instead of downtown.
    - A rate test allows 5%, since new deposits that week also earn the hike.
  - **Determinism:** the snapshot changed on purpose, from `1d8a4c9537a73c` to `1bef8d65d74559`.
  - **Balance:**
    - The 20-seed panel is in range, and every strategy passes.
    - Steady seed 42's first branch misses week 52 ($11.5k) and week 260 ($17k) income. That's one city's average lot; the median panel is the judge.
  - **Target change** (SIMULATION §25): week 104 for the first branch is now $85k+ revenue and $33k+ income (was $95k / $38k), because in a tighter city rivals stand closer and year 2 ramps a little slower. From week 156 the band is unchanged.
- **Saves:** cities already on the map keep their lots. Cities you visit for the first time get the new counts.
- **Dependencies:** none added.


### 2026-10-25 — A city tops out at 5–12 branches
- **Stage / step:** post-launch balance (owner request: "most banks don't have 30 branches per city, they have 5–12 or so, depending on city size"). Also logged the owner's call that branch equipment stays fixed after the build.
- **Problem:** every branch brought in its own lot's foot traffic, and a second branch nearby mostly took customers from the city's other banks. In a test, a small city kept paying for about 30 branches and a medium one for about 40.
- **Done:**
  - **One customer pool per city** (SIMULATION §9.2). Each city has a pool of people who might bank with you: 32,000 for a small city, 38,000 medium, 50,000 large, 72,000 extra large. As your branches there fill it up, every branch in that city gets fewer new prospects. A lone first branch hardly notices.
  - **Result** (test: N branches on the best lots, 5 years, 3 seeds). Total profit levels off at about **5 branches in Saskatoon**, **7–9 in Calgary**, **9–12 in Toronto** and **12–15 in New York**. Past that, a new branch adds little or loses money.
  - **You can see it.** The "Available location" panel has a "Your bank in {city}" card ("4 of about 5" branches and a Market reached bar). The advisor warns you when the city is well covered. The city list shows the same line.
  - **Scripted test players** stop at the advised count and fly on. A 10-year steady game now ends with 153 branches spread across 18 cities, where before it had 210 branches in 5 cities. Profit and equity are a little higher.
- **Checks:**
  - tsc, eslint, prettier, 643 tests and the build all pass. New `tests/sim/cityMarket.test.ts`.
  - The recession test now reads loan defaults only while the bank is still in Canada, because it now goes abroad by year 5.
  - **Determinism:** the snapshot changed on purpose, from `078a7f43a079dc` to `1d8a4c9537a73c`.
  - **Balance:**
    - The 20-seed panel is all in range.
    - Turtle, aggressive, stress and nohq pass.
    - Steady seed 42 misses one check: the first branch's week-208 income is $27k (one bad week; weeks 104–156 and 260 are fine at $53k). The median panel is the judge, as before.
  - **Targets changed** (SIMULATION §25): the first branch now levels off once the home city fills, so the higher week-208+ band ($110k revenue / $45k income) became one band from week 104 ($95k+ / $38k+).
  - Screenshot of the storefront panel at 390×844; no console errors.
- **Saves:** no format change. Reach is worked out from your customers, so existing games pick it up. A city that already holds lots of branches will see new customers slow down there.
- **Dependencies:** none added.


### 2026-10-25 — Clearer map icons and a look of its own for every city
- **Stage / step:** post-launch polish (owner request: "unique icon visual clarity, easier to determine what's what" and "each city more unique and detailed", plus "maybe adding some unique colour to the icons")
- **Done:**
  - **Map pins have a shape language.** A shield (crest) is a bank: yours filled with your colour, rivals in theirs, head offices with a small crown. A small "$" coin is an open branch location. A round medallion is a place you deal with. A price tag is something to rent or buy. A larger scalloped seal is a landmark (central bank, airport, stadium).
  - **Every type of place has its own colour.** For example, credit bureaus are teal, marketing agencies vermilion, lobbying firms plum and auction houses red, and so on for all 15 types. The same colour marks that type on the map, in the Layers sheet and in panel headers. Contrast is tested.
  - **Bolder, distinct icons.** Look-alike glyphs were redrawn: the credit bureau is a score dial, the lobbying firm a podium, the convention a lanyard badge, and vacation homes a palm on an island.
  - **Clusters say what's inside.** At the far zoom only similar things group together. A group shows a small stack of the real pins with a count, and open locations shrink to a quiet "$ ×3". The old carpet of identical navy number circles is gone.
  - **Captions and a legend.** Zoom in close and places are labelled ("Credit bureau"), with rival branches showing the bank's name. The Layers sheet opens with a key to the five shapes, and each row shows the pins it toggles.
  - **Every city has its own geography:**
    - **Water:** rivers with arched bridges (London, Paris, Calgary, Saskatoon, Montréal, Frankfurt), New York between two rivers, lakes (Toronto, Chicago, Zürich), harbours (Vancouver, Sydney, Hong Kong), bays (San Francisco, Singapore), Amsterdam's canal rings and Tokyo's islands. Boats and piers sit on open water.
    - **Layout:** each city arranges its districts differently, and New York and Montréal get a big central park.
    - **Streets:** tree-lined avenues and plazas with fountains.
  - **Every city has its own architecture:**
    - **14 local styles,** for example London's brick terraces with chimney stacks, Paris's mansard blocks with dormers, Amsterdam's gabled canal houses, Frankfurt's half-timbered rows and Tokyo's dense small houses and pencil towers. Each style comes with its own suburban houses, towers and trees.
    - **18 signature landmarks,** all generic shapes with no real names: a giant wheel, an iron lattice tower, a tall broadcast tower, a shell-roofed harbour hall, suspension-bridge towers, a red-and-white lattice mast, and more.
    - **A pale second ink per city,** like a banknote's underprint, on roofs, lawns and trees. Parks get paths with a fountain, pond, bandstand or statue.
  - **Your saves are safe.** Cities you've already played keep their exact map, so no branch moves (save format version 11). New games, and cities you first fly to from now on, use the new looks.
- **How it was built:** three engineers in parallel (pins, geography, architecture), merged and checked together.
- **Checks:**
  - tsc, eslint, prettier, 641 tests and the build all pass.
  - Screenshots at 390×844 of all 18 cities and the 3 regional sites show no console errors.
  - **Determinism:** the snapshot changed on purpose, from `18c44acb4c1d33` to `078a7f43a079dc`, because lots sit on the new layouts. Layout-1 maps are checked against fingerprints recorded before the change, and a real v10 save migrates with its cities unchanged.
  - **Balance:** turtle, aggressive and stress pass all targets, and the 20-city median passes every first-branch target. Steady seed 42 passes everything except week-260 first-branch revenue: $151.0k against a $150k ceiling, a slightly lucky single city. Per the earlier decision, the 20-city median is the judge, so no numbers changed.
- **Performance:**
  - Pin updates per frame are unchanged (under 1 ms on average).
  - The richer buildings take about 20–30% longer to paint for New York and London, and about 40% longer for Tokyo's dense houses. Painting is still spread across frames within the 6 ms budget, so panning stays smooth, but a fresh view fills in a little more slowly.
- **Dependencies:** none added.
- **Known issues:**
  - Amsterdam's narrow canals, and Saskatoon's and Frankfurt's rivers, are subtle at the start zoom.
  - The three "glass" cities (Vancouver, Toronto, Hong Kong) share building fabric; only the skyline, water and landmark tell them apart.
  - The Chicago twin-mast tower is the least distinctive landmark at the far zoom, and the Amsterdam station can read as a church.
  - Two neighbouring "For lease" tags can still overlap at zoom 1.
  - Steady seed 42 is $1k over one ceiling (see Balance).
  - Add to Home Screen still needs a test on a real iPhone.

### 2026-10-25 — Stage 10 known issues fixed
- **Stage / step:** 10 — polish after launch
- **Done:**
  - **Updates on iPhone:** a new version no longer waits for a second launch. If you're on the title screen, the game reloads into the new version as soon as it has downloaded. Mid-game, a message says it will load when you quit to the title. Reopening the app from the background also checks for a new version.
  - **Top bar:** play, pause and Menu use the engraved icon set instead of text characters.
  - **HQ:** a new HQ with no floors shows its empty room as the picture at the top.
  - **Wide screens:** with a panel open at 900 px and wider, the top and bottom bars move left to sit beside it, so the date, speed controls and Menu stay visible.
  - **Balance across cities:** I ran 20 different cities. The median city's first branch meets every target. Single cities vary by 30–40% because some maps have weaker "average" lots (seeds 7, 8 and 16) and some stronger (14 and 17). That's the map, not a bug. `npm run balance -- --years 5 --seeds 1-20` now checks the targets against the median city. One band changed, with the reason in SIMULATION §25: a branch's earnings keep growing with its deposits through years 2–3, so the full mature target applies from week 208. Weeks 104–156 now ask for at least $95k revenue and $38k income a week.
- **Checks:**
  - Seed 42 meets every target for steady, turtle, aggressive and stress.
  - The 20-city median meets every first-branch target.
  - The game's own numbers didn't change, so the determinism snapshot is the same (`18c44acb4c1d33`).
- **Dependencies:** none added.
- **Known issues:**
  - Add to Home Screen still needs a test on a real iPhone.
  - Carried over from Stage 9 and earlier (see below).

### 2026-10-25 — Stage 10 built: art, tutorial, sound, PWA, balance
- **Stage / step:** 10 — Art pass, onboarding, polish, launch
- **Done:**
  - **Tutorial:** seven short steps led by your first branch manager: tap a storefront, build a branch, set the savings rate, hire, read the first weekly results, turn on Personal Loans, approve a business loan. A brass ring shows where to tap. You can skip it from the advisor bar and replay it from Settings.
  - **Art pass:**
    - an engraved picture at the top of every building panel;
    - banknote-style portraits for every person;
    - small pictures for products and campaigns;
    - one matching icon set;
    - certificate-style cards with corner rosettes;
    - restyled charts (tap a bar to see its value);
    - a restyled Daily Ledger;
    - weekly results that slide in and land with a "press".
  - **Sound** (off by default; Settings → Sound): coin, paper, stamp and latch sounds.
  - **Credits** screen, opened from the title screen and from Settings.
  - **Install and offline:**
    - you can add the game to your Home Screen, and it opens full screen with its own icon;
    - after the first visit it works offline;
    - updates arrive on the next launch.
  - **Speed:** the title screen loads first and the other screens load in the background. The weekly autosave no longer causes a short freeze.
  - **Accessibility:**
    - better contrast and larger tap targets;
    - labels for screen readers;
    - keyboard focus moves into and out of panels;
    - reduced motion swaps movement for fades;
    - layout fixes at large text sizes.
  - **Balance:** the balance report now checks every scripted strategy (steady, turtle, aggressive, stress) against its own targets. Seed 42 meets all of them.
- **How it was built:** I did the balance pass while three helper agents built the tutorial/sound/credits, the install/offline/speed/accessibility work, and the art pass in parallel. I merged them, fixed the overlaps (the panel header and the loop both changed in two branches), and played it at phone size.
- **Acceptance:**
  - Lighthouse mobile scores on the final build: performance 98, accessibility 100, best practices 100, SEO 100. The target was at least 90.
  - The tutorial took a scripted new player under 5 minutes, reading every line at a slow 180 words a minute (36 taps, no console errors). The target was under 10 minutes.
  - Balance targets are met for all four strategies.
  - 581 tests pass.
- **Determinism snapshot:** unchanged (`18c44acb4c1d33`). The tutorial only adds an optional flag, so saves stay at version 10 and older saves load as they are.
- **Dependencies:** none added. Lighthouse and axe were run with `npx` only and are not in package.json.
- **Next:**
  - The owner's testing and tuning pass.
  - Add the Vault Street card to Kelbo.Website in a separate session in that repo.
  - On iPhone:
    - start a new game and follow the tutorial;
    - turn on Sound in Settings;
    - Share → Add to Home Screen, open it from the icon, then try it in airplane mode.
- **Known issues:** the five listed at launch were fixed the same day (see the entry above). Carried over from Stage 9 and earlier (see below).

### 2026-10-24 — Stage 9 built: personal empire
- **Stage / step:** 9 — Personal empire
- **Done:**
  - **Personal Wealth** (Menu → Personal wealth): your profile and salary, total net worth with its weekly change, a chart (cash, stocks, real estate, other), and every holding with cost and gain. A rich list chip opens the full list of 50 fortunes; you're ranked each year end.
  - **Vacation homes** on the map (12, from a $1.6M lake cabin near Saskatoon to a $35M Côte d'Azur villa): make an offer (85–100% of asking), rebuild to raise the value (25% of value, 8 weeks, +20%), sell any time. Values follow that country's house prices.
  - **Car dealers** in every medium and large city: buy any of 7 fictional cars (the 1962 classic gains value, the rest lose it). The **Dealer financing** tab signs a 3-year deal ($120k a year, paid by the bank) that brings 25% more car-loan customers to your branches in that city.
  - **Auction houses** (London and New York, Toronto and Chicago, Tokyo and Hong Kong): a sale every 4 weeks with 3–5 lots. Set a maximum bid; the winner pays the clearing price plus 12%. Some lots are fakes: appraise (1% fee, a week) to find out — a fake gets a red FAKE stamp and is worth $0. Appraised genuine pieces can be consigned to the next sale.
  - **Sports clubs** (10, playing at each city's stadium): buy one personally or as the bank. Club, Kit, Squad, Transfers and Finance tabs; a 40-game season; sign and release stars when the transfer window is open. Put your bank on the shirt to raise brand awareness across that country (you give up the outside sponsor's money).
  - **Insider trading:** trading your own bank's shares in the 2 weeks before a quarter-end has a 15% chance of a probe (settle, or fight it 50/50).
  - Saves move to version 10; a real Stage 8 save (with a jet and a New York branch) is kept as a test and loads and plays on.
- **How it was built:** I laid the foundation (save format, data, map buildings, net worth, a club on the bank's books, empty hooks), then three helper agents built homes/cars/wealth/rich list/insider trading, auctions, and sports clubs in parallel. I merged them and played it at phone size: bought a classic car and the Calgary Bighorns, turned on the shirt deal, flew to New York and won an auction lot.
- **Fixed along the way:** an occasional "Hook can only be invoked from render methods" error when map pins updated during a render.
- **Balance:** the scripted players don't buy personal assets, so the balance report is unchanged in kind (books balance; 3 warnings, all known). 540 tests pass, including the three Stage 9 acceptance checks: net worth ties out week after week; a counterfeit can be bought and discovered; kit sponsorship raises brand awareness in that country and nowhere else.
- **Determinism snapshot:** `1563c839eb89fa` → `18c44acb4c1d33`. Intended: new state, the rich list, clubs and auctions now run every week.
- **Dependencies:** none added.
- **Next:** Stage 10 when the owner says go. Owner iPhone check for Stage 9 when convenient: open Personal wealth, buy the Bow Valley Ranch (Calgary) and rebuild it, buy a car, sign dealer financing with an open branch, fly to New York and bid at Marlowe & Finch, buy a club from its stadium pin and put your bank on the shirt.
- **Known issues:**
  - Personal cash can go below zero from upkeep, a personally owned club's losses or an insider fine (flagged on the Wealth screen).
  - The incident modal labels the insider probe with the bank's name and shows "No cost" on both options (the option text gives the fine).
  - At far zoom Toronto's two stadium pins merge into one cluster (tap to split).
  - A consignment added while a sale's lots are on view can repeat an item in that sale.
  - Carried over from Stage 8 and earlier (see below).

### 2026-10-24 — Stage 8 built: multi-city and travel
- **Stage / step:** 8 — Multi-city and travel
- **Done:**
  - **Airports everywhere.** Every city map (and three small regional sites: Fort McMurray, Pilbara, Midland) has an airport pin. The departures board lists every destination nearest first, with distance (km or mi), "New" for places you haven't been, and how many branches you have there. A region filter keeps it one-handed.
  - **Travel is never blocked.** Flights inside the weekly 24,140 km are free. Past that, a one-way ticket ($80k × the city's cost level) comes from your personal cash; if you can't cover it, the bank pays the rest as a travel expense.
  - **Flight animation:** a plane follows a dotted arc across a world map (tap to skip), then the new city loads with a welcome toast. Tap the city pill at the bottom of the map for a Travel sheet: Go to the airport, and Fly now if you own a jet.
  - **New cities are built when you first land**, the same in a given save whenever you arrive: storefronts, rival banks, offices, bureaus, the investment bank, buildings for sale, employers and the university.
  - **Play everywhere at once.** Everything you own in every city runs every week. Each country runs its own economy and central bank, and your branches there earn on that country's rates. The Branches list groups branches by country and opens any of them from anywhere.
  - **HQ prices per country:** with "Apply rates to all branches" on, the Products floor shows a country picker (with that country's central bank rate), because Japan's 0.75% and the US's 4.5% can't share one rate sheet.
  - **HQ brand campaigns** can target any city you've reached; agency packages need you in that agency's city.
  - **Private jet:** buy a Corvid 600 (6,000 km range) or an Albatross 8000 (anywhere) with personal cash; jet flights are free. Upkeep comes from personal cash, and you can sell it.
  - Your start city is your bank's home: its central bank lends to you, taxes you and lists your shares.
  - Saves move to version 9; a real Stage 7 save (listed, HQ prices on, a building, a yen position) is kept as a test, loads, flies and plays on.
- **How it was built:** I laid the foundation (save format, city generation, travel and jet rules, per-country prices, distances), then two helper agents built the airport, flights and jet screens, and the multi-city audit (rivals priced per country, regional employer deals, news, campaigns, strategies). I merged them and played it at phone size: Calgary → New York → London, a branch in each.
- **Fixed along the way:** rivals in two countries now price each country off its own central bank; HQ coverage no longer stalls at 88% with a full building (a second building is leased); a weekly loan scan that slowed big banks is about 7× faster.
- **Balance:** the scripted steady player now moves on to other Canadian cities once Calgary is full, which removes the old 52-branch cap: year 10 ends at 167–223 branches and $7–10B of assets (target 60–200 and $8–40B; slightly outside on two seeds — noted for the tuning pass). Everything before the first flight is unchanged. 477 tests pass, including both Stage 8 acceptance checks: branches in three countries run a year with balanced books, and raising one country's rate moves only that country's branch margins.
- **Determinism snapshot:** `09f58c873bc838` → `1563c839eb89fa`. Intended: new save fields (home city, travel, the travel line).
- **Dependencies:** none added.
- **Next:** Stage 9 (personal empire). Owner iPhone check for Stage 8 when convenient: tap the city pill → Go to the airport, fly free somewhere, fly far enough to pay a fare, open a branch abroad, try the Products floor country picker with Apply-to-all on, and visit Fort McMurray.
- **Known issues:**
  - The CPO's "best bureau model" delegation only looks at bureaus in the city you're standing in.
  - "Fast-track a merger review" is global rather than per country.
  - No Ledger story yet for a first branch in a new country.
  - Toasts can draw over confirm sheets; on desktop the drawer covers the date pill.
  - The world map's continents are deliberately rough.
  - Carried over: a private building can push personal cash below zero (jet upkeep can too); rare startup IPOs; flavour-only networking cards; first-branch checkpoints at weeks 156/260; high ROE.

### 2026-10-24 — Stage 7 built: investments and real estate
- **Stage / step:** 7 — Investments and real estate
- **Done:**
  - **Investment floor** (add it to your HQ): your portfolio for the company or for you personally, with a chart of stocks, startups, buildings, venture debt and currencies, a full list of holdings, and a carousel of startups that are raising money. More analysts find more startups (1 plus 1 per 4 staff, up to 8).
  - **Startups:** 20 to start, more appear over time. Each grows or shrinks every quarter, raises new rounds (up or down), and can fail, be bought out, or list on the stock market. A startup's screen shows its profile, its strengths (pentagon), quarterly results, the two offer lots of the current round (invest as the company or privately), its funding history and shareholders. You can also lend to it (venture debt): up to 10% of its value, repaid weekly over 3 years, and mostly lost if it fails.
  - **Conventions:** a yearly calendar. Each is announced in the Daily Ledger two weeks ahead, appears on the map, and is open for one week with 3–6 startups you can only back there. Calgary's is the Foothills Founders Fair in mid-July.
  - **Real estate:** each city has buildings; some go up for sale every 4 weeks ("For sale" pins). Make an offer as the company or privately. Once you own one, set the rent: higher rent loses tenants, lower rent fills it. The screen shows weekly rent, upkeep, empty-space cost and return (about 9% at 85% full, like the original). Put it up for sale any time.
  - **Foreclosed homes:** homes from defaulted mortgages now follow house prices. On the Company screen, hold them, rent them out, or sell them all at 90% of value.
  - **Lobbying firms:** pay for a campaign to ease your capital requirement for a year, fast-track your next takeover, or kill a pending capital-requirement bill. Each can fail, and each can be exposed in the paper (a fine and a hit to your brand).
  - **Currencies (owner request):** a simple "country up or down" bet on any foreign currency, at any investment bank (Market tab → Currencies), as the company or privately. Currencies move with each country's growth, interest rate and business cycle.
  - **Starting currency (owner request, already live):** choose $, C$, £, € or ¥ when you start a game.
  - Everything the bank owns appears on its balance sheet and counts toward its capital requirement; the bank can't buy startups or buildings while its capital is Restricted or worse. Saves move to version 8; a real Stage 6 save (listed, with foreclosed homes) is kept as a test and loads and plays on.
- **Owner decisions recorded:** you'll be able to travel to any city at any time and run everything everywhere at once (Stage 8): flights inside the weekly allowance are free, longer ones cost a fare, never blocked. Currencies are an investment only; the bank's books stay in one currency.
- **How it was built:** I laid the foundation (save format, map buildings, balance-sheet lines, data tables, empty hooks) and built currencies myself; two helper agents built startups and conventions, and real estate, foreclosed homes and lobbying, in parallel. I merged them, added the capital-tier rule for buildings and the Investment floor's advisor line, and played it all at phone size.
- **Balance:** the scripted strategies don't invest yet, so the balance report is unchanged from Stage 6 (same 4 warnings as before, all pre-existing). 429 tests pass, including both Stage 7 acceptance checks: portfolio values tie out to the balance sheet and capital requirement every week (through rounds, failures, buyouts, listings, purchases, rent changes, sales and all foreclosed-home modes), and the Foothills Founders Fair appears on schedule with startups that can only be bought there, that week.
- **Determinism snapshot:** `08b65f0864d155` → `09f58c873bc838`. Intended: new state (startups, conventions, buildings, currencies) and foreclosed homes now carry costs and follow house prices.
- **Dependencies:** none added.
- **Next:** the owner checks Stage 7 on iPhone: add an Investment floor at HQ and hire a few analysts, open a startup and invest (company or private), try venture debt, buy a "For sale" building and change its rent, open a lobbying firm, try a currency at the investment bank, and watch for the Foothills Founders Fair in July (week 28).
- **Known issues:**
  - A privately owned building whose costs exceed its rent can push personal cash below zero.
  - IPOs of startups are rare (about one per 10 years without your money), because they need $50M of quarterly revenue, as specified.
  - The convention's networking cards are flavour only.
  - Carried over: first-branch checkpoints at weeks 156 and 260, high ROE in the steady run, Calgary's ~52-branch lot cap.

### 2026-10-24 — Stage 6 built: governance and capital markets
- **Stage / step:** 6 — Governance and capital markets
- **Done:**
  - **Investment banks** on the map (chart medallion, Investment Banks layer; Calgary's is Ashgrove Capital). Three tabs:
    - **Market:** 16 listed companies in five sectors plus the listed rival banks, with prices that move each week with the economy, quarterly earnings and dividends, 52-week ranges, P/E and top shareholders, and the "Ledger Composite" index. Trade from the company (corporate cash) or privately (your personal cash).
    - **Equity:** while private, sell up to 25% of the bank to an investment fund (3 rounds, 26 weeks apart) and launch the IPO once you qualify (the checklist shows each rule); it lists at the next quarter-end with a first-day pop. Once public, issue more shares (secondary offering).
    - **M&A:** buy a rival bank. You offer a price per share; next week the regulator checks your capital after the deal and that you'd hold no more than 35% of a city's deposits, then the rival's board accepts or refuses depending on the premium. Failed rivals are sold off cheap for 8 weeks. Bought branches become yours at once (with a manager kept on) and switch to your brand over 8 weeks; on the map they keep the old colours with a progress ring until then.
  - **Your share price:** a private valuation from book value and profitability; once public, a market price that follows earnings, dividends and incidents (a data breach hurts far more than a robbery). The Company screen shows it with your stake, the top shareholders and your personal money.
  - **Executive floor:** hire a COO, CFO, CPO, CMO, CTO and CRO. Each makes their departments stronger (or weaker, if they're not very good) and can run things for you: hiring branch managers, staff benefits, liquidity, dividends proposals, pricing, new products, the underwriting model, brand campaigns, digital projects, risk appetite and Loan Desk decisions. Set their pay, give stock options or shares that vest over 4 years, or fire them. Underpaid executives without unvested shares get poached (you can counter-offer).
  - **Board meeting** once a quarter (the game reminds you): propose a dividend and your own salary; shareholders vote, and outsiders judge whether it's reasonable. While you own most of the bank it always passes. The regulator limits dividends when capital is weak. Your CEO salary ($120k a year to start) and your share of dividends go into your personal cash.
  - New Ledger stories for all of it; saves move to version 7 (a real Stage 5 save is kept as a test and loads and plays on).
- **How it was built:** I laid the foundation (save format, data tables, map buildings, the share register, balance sheet lines, empty hooks), then three helper agents built executives and the board, the stock market and fundraising, and takeovers in parallel. I merged them, wired the Employee Stock Plan's loyalty bonus between two of them, and played the whole thing at phone size.
- **Balance:**
  - Steady now raises money once privately when capital gets tight and lists in years 5–6 (weeks 222, 248 and 261 on seeds 42, 7 and 99), keeping 60% of the bank. The IPO money takes it from 7 to about 44 branches in year 5.
  - Turtle (deposits only) ends year 5 at 27% of steady's equity (target under 40%). Aggressive hits the Restricted tier; stress survives its forced recession without going Critical.
  - 370 tests pass, including the three Stage 6 acceptance checks: an IPO in years 3–6 of a steady run; a public bank's price falls after a data breach and moves with earnings; and after buying a rival the books balance every week while its branches convert in 8 weeks.
- **Determinism snapshot:** `1c47c86155686e` → `08b65f0864d155`. Intended: the new state, the weekly CEO salary, the CTO seat's effect on breach odds and the moving private valuation.
- **Dependencies:** none added.
- **Next:** the owner checks Stage 6 on iPhone: open the investment bank and look through the three tabs, buy a few shares privately, lease an office with an Executive floor and hire someone, hold a board meeting, and (with enough cash) make an offer for a small rival and watch its branches convert.
- **Known issues:**
  - The first-branch checkpoints still read seed 42's recession at week 156 and miss at week 260 (deposits a little high, income $42k vs $45–70k); a cross-seed calibration is open.
  - ROE runs well above the 8–18% target in the steady run (20–60%); it did before Stage 6 too, because a young bank's equity is small next to its branch profits. To look at in a calibration pass.
  - Wealth advice still follows each country's own market return rather than the new index.
  - When the CRO decides Loan Desk applications, branch screens don't say so.
  - Calgary still runs out of locations at about 52 branches (more cities arrive in Stage 8).

### 2026-10-24 — Stage 5 built: competition, macro and news
- **Stage / step:** 5 — Competition, macro and news
- **Done:**
  - **Rivals come alive.** They grow new branches toward a mature size, open new ones on good free locations once they've had a profitable year, and close branches that lose money for half a year. Their books feel the economy: thin-capital banks (disruptors especially) can fail in a deep recession; regulators hold the network for 8 weeks, then other rivals take the branches. Buying a failed network yourself comes with Stage 6.
  - **Price wars.** Lead a city's savings rates (Rates rating 4.0 or better) for 8 weeks and rivals start raising theirs. You get a case asking whether to match.
  - **Rival screens.** Tap a rival branch for its ratings, customer reviews and its rate sheet next to yours (green where you're the better deal, red where not). Rival head offices (Banks layer) show the bank's overview, offer business loans and a line of credit you can actually take; it's company debt, paid from corporate cash.
  - **Every country's economy and central bank** runs now (nine of them), even before you can open there.
  - **The Daily Ledger** is a real weekly paper built from what happened: rate decisions, rival openings and results, your loans and profits, house prices, markets, politics (fictional parties; a passed "capital buffer" really does raise your capital requirements for a year) and fictional sports leagues. Tabs Top / Banking / Business / Markets / Politics / Sports, and an archive of 52 issues under Menu → The Ledger.
  - **Central bank screen:** tap the domed building for the policy rate, last and next meeting, the economy, a yield curve (it inverts before downturns) and, at home, emergency borrowing.
  - **Incidents:** robbery, ATM skimming, data breach, mis-selling, viral complaint, branch flood, card fraud, staff walkout, bank runs, regulator audits and letters, price wars, big defaults, and the emergency rescue offer before a regulator takeover. Each is a case with 2–3 choices and their costs. Branch managers can handle branch cases for you ("Branch troubles"); undecided cases take the worst option after 4 weeks. Waiting cases show as an "N cases" chip under the date and a red dot on the branch pin.
  - **Employers and universities** (Employers / Universities layers): sign a 7-year payroll deal and the staff bring deposits that grow over two years; keep the deal healthy (good host branch, competitive account) or the employer walks. Universities also offer student accounts and a graduate program that sharpens manager candidates and speeds hiring.
  - More review lines (4 per rating and mood); rival branches show reviews too.
  - Saves move to version 6; a real Stage 4 save is kept as a test and loads and plays on.
- **How it was built:** I laid the foundation (save format, map buildings, every country's economy, an event catalog, stubs). Four helper agents then built rivals, the Ledger with the central bank, incidents, and partnerships in parallel; I merged them, joined them up (price wars raise their case; incident press stories reach the paper) and fixed what showed up in play.
- **Balance:**
  - Recessions now hurt loan books: the credit cycle is steeper, so seed 42's year-2/3 recession books 1.6% losses (target 1.2–2.5%) against 0.8–0.9% in good years. New acceptance test.
  - Reserves earn 0.5% below the policy rate (a deposit-facility rate), so a deposits-only bank falls well behind a lender.
  - 259 tests pass, including both Stage 5 acceptance checks: 3 years of Ledger issues with 6–12 stories, correct numbers and no repeated wording for the same subject in back-to-back weeks; and a 10-year run with a recession and clearly higher defaults.
- **Fixed along the way:** event toasts could repeat or go missing because they tracked a position in an event log that drops old weeks; they now remember the last event shown.
- **Determinism snapshot:** `0831e6b2f8796e` → `1c47c86155686e`. Intended: every country simulated, rival AI, news, incidents and the two balance changes above.
- **Dependencies:** none added.
- **Next:** the owner checks Stage 5 on iPhone: watch a few weekly papers (tabs and the archive), tap the central bank dome, a rival branch and a rival head office (try a small loan), sign an employer once you can afford it, and answer an incident.
- **Known issues:**
  - The first-branch checkpoints are tuned on seed 42 only. On seed 42, week 156 now falls just after a recession (revenue about $90k a week against $110–150k), recovering by week 208. Other seeds (7, 99) already missed them in Stage 4 because of weaker starting lots; a cross-seed calibration is open.
  - The deposits-only `turtle` strategy ends year 5 at about 45% of steady's equity (target under 40%); its equity swings with bond values because it holds so many bonds.
  - Steady tops out at about 52 branches in Calgary by year 8 (year-10 target 60–200) because the city runs out of locations; other cities arrive in Stage 8.
  - A payroll deal costs $330k–$920k in Calgary, so it's a mid-game move.
  - Partnership deposits count in company totals but don't credit the host branch's own P&L; the quarterly partnership review isn't built; winning an employer doesn't shrink the rival's books.
  - Rival networks can't be bought yet (Stage 6); executive, dividend and insider incidents wait for Stages 6 and 9.
  - Toasts sit over the bottom of modals.

### 2026-10-24 — Stage 4: Products floor simulation
- **Stage / step:** 4 — HQ and operations depth (Products floor, simulation only; the screens are a separate step)
- **Done:**
  - Product development: pick a type (18 templates from CONTENT §6), a price tier, 4–48 weeks and a weekly budget (from $5,000). The star odds table follows SIMULATION §16.6 and matches the reference numbers (27/42/26/5/0 at the cheapest setting). Each week pays for the progress made; at the end the stars are rolled and a new product appears in the catalog.
  - Developed products work like any other: their own prices, toggles and books at each branch, built from the base product plus the template (e.g. Senior Saver = savings with more retiree interest). They start switched off. Deleting one moves its customers onto the base product.
  - Digital projects (IT floor needed): Mobile App 2.0 lifts the app rating; Instant Decisions makes the house model faster. Each runs once.
  - Underwriting models: buy a credit bureau's package, commission a custom mix hosted by a bureau, or build your own on the Products floor (sliders over five data inputs; Internal History unlocks at 5,000 loans). Switching models blends old into new over two weeks.
  - Company lineup: "Apply rates to all branches" lets HQ set prices and the lineup for every branch.
  - 111 tests (new: odds vs the doc, a development turning into a product that gains customers, digital projects, deleting, custom model maths, the Internal History gate, the switching blend, the company lineup, and a save round-trip with all of it).
- **Determinism snapshot:** unchanged (`08b4ee1bc7e8a3`). The scripted game doesn't use the Products floor, and the new state fields are only written once you use them. The 5-year balance report is identical.
- **Dependencies:** none added.
- **Next:** the Products floor and Credit bureau screens (SCREENS §10, §13).

### 2026-10-24 — Map pins: "$" for open locations, "For lease" for offices
- **Done:** at the owner's request, open branch locations now show a plain "$" coin (a little smaller than branch pins, and smaller still when zoomed out) instead of the "For lease" tag. The "For lease" tag now marks buildings you rent: office buildings, with a small office icon. The list view, the Layers filter ("Available only") and the storefront panel ("Available location") use the same wording. Credit bureaus and agencies keep their icon medallions, and so will investment banks when Stage 6 adds them.
- **Next:** unchanged: the owner's iPhone check of Stage 4.

### 2026-10-24 — Stage 4 built: HQ and operations
- **Stage / step:** 4 — HQ and operations depth
- **Done:**
  - **Offices:** every city has 3–9 office buildings for lease (mostly in the financial district), plus credit bureaus and marketing agencies, all on the map with their own pins and layers. Leasing takes the whole building; each floor holds one department and is fitted out when a team moves in. Floors and whole offices can be released.
  - **Departments:** Finance, HR, Products, Treasury, Marketing, IT and Risk. Each hires toward a target you set, pays a salary you set, and has skill, morale and coverage (staff versus what your bank's size needs).
  - **Founder mode:** with 1–2 branches nothing is required; requirements phase in from 3 to 6 branches. Short departments hurt: HR slows hiring and lowers morale, Risk raises defaults and regulator fines and blurs loan estimates, Treasury makes funding dearer and the market thinner, Marketing weakens every campaign, IT drags the app rating, Products slows developments and raises model costs, and Finance delays your statements.
  - **HR benefits:** nine benefits with costs and effects on morale, hiring, quits, skill growth and reputation.
  - **Products floor:** your house underwriting model with Manage models (sliders that always total 100%), risk appetite, the company product lineup with "Apply rates to all branches", and new product development with the live star-odds table. Developed products are real products at your branches.
  - **Credit bureaus:** buy a bureau's packaged model or commission your own mix there.
  - **Treasury floor:** liquidity gauge and policy, government bonds (they lose value when rates rise), a funding market that refreshes every two weeks, your funding lots (they mature on schedule), and the central bank window.
  - **Marketing floor and agencies:** brand campaigns by city or country, and agency packages.
  - **IT floor:** the app rating and digital projects (Mobile App 2.0, Instant Decisions).
  - **Risk floor:** loss rates by product, model performance, and the quarterly regulator review.
  - Saves move to version 5; your Stage 3 save is kept as a test fixture and loads and plays on.
- **How it was built:** I wrote the foundation (data shape, save migration, offices, departments, coverage and benefits). Two helper agents then built the Products and the Treasury/Marketing/Risk simulation in parallel, and three more built the screens. I reviewed and merged everything and tuned the balance.
- **Balance:** a bank without an HQ was coming out ahead, so per-branch HQ requirements were cut about 40% and the Risk shortfall penalty raised. Now `steady` (which leases its first office at 4 branches) ends year 6 with about $72M equity against `nohq`'s $63M, and `nohq` runs loan losses near 2%. Both steady and stress stay inside their targets apart from the pre-existing 74.9% loans-to-deposits at week 104.
- **Determinism snapshot:** `0acda65581fd17` → `08b4ee1bc7e8a3` (HQ state added; the script leases an office at week 80) → `1ecdcf158cfecb` (risk records and regulator reviews) → `0831e6b2f8796e` (requirement tuning). All intended.
- **Next:** the owner checks Stage 4 on iPhone: lease an office from the Offices layer, add floors, try the Products, Treasury and Marketing floors, and visit the Northscore bureau and the agency in Calgary.
- **Known issues:**
  - HQ coverage refreshes on the weekly tick, so a staffing change shows next week.
  - The app rating keeps no history yet, so IT shows the current rating and its target rather than a trend.
  - Predicted and actual default rates match closely for pooled books (defaults are booked at the expected rate); they drift apart through the credit cycle, Risk shortfalls and Loan Desk loans.
  - The deposits-only `turtle` strategy reaches about 45% of steady's year-5 equity (target under 40%); left for Stage 5 tuning.
  - Executive and Investment floors show "arrives later" cards (Stages 6 and 7).

### 2026-10-24 — Next week button
- **Done:** a ▶| button in the date pill (top right) jumps to the end of the current week, shows the weekly results and pauses, so you can play week by week instead of watching days tick by. It runs through the same simulation steps as normal play, so nothing about the numbers changes. When paused, the pill now shows just the date (the ▶ button already says it's paused).
- **Next:** Stage 4.

### 2026-10-24 — Stage 3 built: the engraved city map
- **Stage / step:** 3 — The city map (Banknote Deco v1)
- **Done:**
  - Street grid and shoreline (`src/sim/cityLayout.ts`): a street every 4th row and column, a wavy shore in water cities. Storefront lots now snap to tiles facing a street. Schema v4 moves older saves' lots onto the grid.
  - The drawable city (`src/art/citygen.ts`): streets, water, parks, filler buildings by district, and four landmarks (central bank, clock tower quad, stadium, airport; scenery for now). Seeded from the save, so a city looks the same every session.
  - The engraved renderer (`src/art/`): city-ink linework, three hatch densities, paper with a guilloche wave and a microprint ring with the city name, water with wave lines, quays and piers, stippled parks with spiral trees, and building styles for all seven districts. Storefronts have glazed ground floors; your branches fly a brand-ink flag and rival branches have striped awnings in their ink.
  - The map view (`src/app/map/`): drag to pan with a fling glide, pinch and double-tap to zoom, wheel zoom on desktop. Pins for your branches, rivals and storefronts for lease open their panels; a drag that starts on a pin pans instead. Zoomed out, pins group into numbered clusters. The Layers sheet (bottom-left button) has All, Branches, a "For lease only" filter and the old list as "List view"; choices are saved.
  - 97 tests (new: street layout and lot snapping, city map generation, projection, chunk maths, painter order, the chunk cache budget, camera, pins, clustering, layers).
- **How it was built:** I wrote the layout, city generator, projection and the renderer contract; two helper agents then built the renderer and the map view in parallel against that contract, and I reviewed, fixed small style slips (all-caps tags, drop shadows) and merged.
- **Performance:** in Chrome at iPhone size with the CPU slowed 4×, panning over painted map costs under 1 ms a frame (3 ms worst); panning fast into unpainted parts of New York (the biggest city) averages 13 ms with a 33 ms worst. Pin updates take 0.1–0.8 ms for 110 pins.
- **Determinism snapshot:** `1b00e5e0304fc5` → `0acda65581fd17`. Intended: lots moved onto street frontage. The balance report stays inside every target.
- **Next:** the owner checks Stage 3 on iPhone: smooth panning in a big city (try New York or Tokyo), every pin tappable, layer toggles staying put, sharp on the retina screen. Stage 2's check can happen in the same session.
- **Known issues:**
  - Tested only in Chrome's phone emulation; WebKit isn't available here, so iPhone Safari is untested (pinch blocking, text-size handling).
  - Fast zoom-out into an unpainted area briefly shows plain paper before the art fills in.
  - Neighbouring "For lease" tags can overlap at zoom 1; the top one wins the tap.
  - The camera doesn't allow for the desktop panel covering the right side of the map.
  - Waterfront buildings are all glass towers (no warehouses yet).

### 2026-10-24 — Stage 2 gaps closed
- **Stage / step:** 2 — Playable loop in plain UI (finishing touches before the owner's check)
- **Done:**
  - Loan Desk counts now live in the game state (schema v3, migration 2 → 3), so "Declined" and the approval rate survive a reload and include decisions your manager makes.
  - Branch history keeps 52 weeks, so the Finance tab's "Year" view is a real year.
  - Typing a price: tapping a rate now shows "3.25" (not "0.0325") and typed numbers are always read as percents; fees show whole money.
  - The advisor bar cycles through every applicable hint on tap (counter shows 1/3 and so on), including a reminder when loan applications are waiting.
  - The capital ratio reads "100%+" with a short explanation while the bank has almost no loans.
  - 55 tests (new: Loan Desk tally and the 2 → 3 migration; rate and ratio formatting).
- **Determinism snapshot:** `1a6f96ddc5855e` → `1b00e5e0304fc5`. Intended: saves now carry the desk tally and up to 52 weeks of branch history. No formula changed; nothing in the sim reads further back than last week's branch P&L.
- **Next:** the owner's Stage 2 check on iPhone (two game years, move a save code Safari → Chrome). Then Stage 3.
- **Known issues:** no hero vignettes, portraits or area mini-map yet (art stages).

### 2026-10-24 — Stage 2 built
- **Stage / step:** 2 — Playable loop in plain UI
- **Done:**
  - Game loop at 1×/2×/4× with pause, weekly auto-pause for results (every week, quarter or off), auto-pause for expiring loan applications, autosave every week, and toasts for branch openings and central bank decisions.
  - Game over: insolvency (4 weeks of negative cash) and regulator takeover (13 weeks below a 4.5% capital ratio), shown as a Daily Ledger front page.
  - HUD (cash, date and speed, city, menu) and the menu sheet.
  - New Game wizard in 5 steps: bank (name, monogram, ink), founder (name, avatar parts), start city, game options (difficulty, 1–5 competitors, starting cash), confirm (seed, start date). Plus a quick start.
  - City list in place of the map: districts → lots with rent, traffic and occupant; rival info sheet.
  - Storefront panel and the build flow (five part pickers, cost summary, Build).
  - Branch panel with all five tabs: Service (reviews, staff, manager, hiring, delegation), Products (lineup with prices, margins and toggles), Loan Desk (applications with rosettes, approve/decline, active loans), Marketing (campaign levels), Finance (statement, chart, rename, close).
  - Weekly results with The Daily Ledger, Company summary (capital meter, statements), Branches list.
  - Saves: autosave plus 3 slots, export/import save codes (copy, share, paste); settings (currency, units, weekly results, speed, auto-pause, reduced motion, text size, founder avatar).
  - Sim additions: `closeBranch`/`closeQuote`, `setSettings`, `setFounderAvatar`, game-over checks, deterministic math.
  - 51 tests. Playwright walkthroughs at 390×844 and 1280×800 with no console errors: wizard → build → 7 weeks at 4× → every tab; save → exit → load round-trips exactly.
- **How it was built:** I wrote the foundation (store, loop, saves, components, HUD), then four helper agents built the screens in parallel, each in its own folder, and I reviewed and merged them.
- **Decisions** (also in DESIGN §7): products show as a vertical list rather than a carousel so every toggle and price is visible on a phone; the product margin ring is revenue kept after funding cost, servicing and expected loss; save storage lives in `src/sim/save/storage.ts` (the only module allowed to touch browser storage).
- **Next:** the owner plays a two-game-year run on iPhone and moves a save code between iPhone Safari and desktop Chrome (Stage 2 acceptance). Then Stage 3, the engraved city map.
- **Known issues (at the time; all but the art fixed in the next entry):**
  - Loan Desk "declined" and "approval rate" were counted by the screen only.
  - Branch history kept 26 weeks.
  - The capital ratio read in the hundreds of percent before any loans existed.
  - No hero vignettes, portraits or area mini-map yet (art stages); the advisor bar didn't cycle hints on tap.
  - Typing into a rate stepper edited the raw value rather than the display value.

### 2026-10-24 — Cross-engine determinism fix
- CI failed the determinism snapshot since Stage 1: `Math.pow` with a fractional exponent returns different bits on Node 24 (CI) than Node 22 (local), and browsers can differ the same way.
- Added `src/sim/detmath.ts` (exp, log, pow, cos, tanh from basic arithmetic), switched the sim to it, and banned the Math versions and `**` in `src/sim` via ESLint. The snapshot now matches on both Node versions; the balance report is unchanged.

### 2026-10-24 — New Game options (Stage 1 addendum)
- **Stage / step:** 1 addendum, before Stage 2
- **Done:**
  - Difficulty (Easy, Normal, Hard, Expert) as its own setting: prospects, rival quality, rival rates and loan default rates scale by level (`DIFFICULTY` in balance.ts).
  - Competitors: 1–5 rival banks per city; rival branch totals scale with the count.
  - Starting cash: $500k, $750k, $1M or $1.25M.
  - Schema v2 with a 1 → 2 migration; `npm run balance` takes `--difficulty`, `--competitors` and `--cash`; 4 new tests (37 total).
- **Decisions:** the owner asked for difficulties, a 1–5 competitor option and a small range of starting cash. Start cities no longer set the difficulty.
- **Balance report:** Normal, 3 competitors and $750k reproduce the old run exactly (the old hash matches once the new fields are stripped); the snapshot changed only because saves now carry the new fields. Year-1 deposits (steady, Calgary): Easy $104M, Normal $95M, Hard $73M, Expert $51M; 1 competitor $125M, 5 competitors $47M.
- **Next:** Stage 2.

### 2026-10-24 — Stage 1 complete
- **Date:** 2026-10-24
- **Stage / step:** 1 — Simulation core (headless)
- **Done:**
  - Content tables in `src/data/` (countries, cities, districts, segments and affinity, products, build options, campaigns, rivals, Loan Desk sectors, names, reviews, bureau models) and every tuning constant in `src/config/balance.ts`.
  - `src/sim/`: seeded sfc32 RNG streams, calendar, `newGame`, city lot generation (a list of lots with district values, no art), macro and the central bank rule for the home country, FTP and market reference prices, rivals as price sheets that follow FTP with deposit beta.
  - Per-branch pipeline in the documented tick order: staff and capacity, awareness and campaigns, ratings and review cards, demand and share, books (deposits, GICs, amortizing loans, revolving credit, wealth, safe boxes, FX), the Loan Desk with individual business loans, and the branch P&L.
  - Company layer: treasury (reserves, bonds with mark-to-market, automatic overnight and window funding, freeze), statements with tax and loss carry-forward, the balance sheet, capital ratio and tiers, quarter-end reports.
  - Delegated managers (staffing, products and rates, marketing, loan approvals).
  - Commands for building, products and prices, staff, wages, campaigns, managers, delegation, risk appetite, Loan Desk decisions and treasury transfers. Each returns `{ ok }` or `{ ok: false, reason }`.
  - Saves: JSON serialize, migrations, required-keys check, checksum, and `VS1:` export codes (lz-string).
  - `npm run balance` with the idle, steady, turtle, aggressive and stress strategies, a yearly table and first-branch checkpoints.
  - 33 tests: RNG, formula worked examples, macro units, commands, the balance identity and cash-flow reconciliation every week, determinism and save round trips.
- **Decisions** (also in DESIGN §7):
  - **Your call:** keep CONTENT's fee levels, so a mature branch earns about $45–70k a week (closer to the original's store economics). SIMULATION §25 targets updated.
  - Calibration: catchment 1.0, prospect rate 0.040, saturation exponent 2.8, gentler price elasticity (PF_RATE_STEP 0.01), smaller deposit, wealth and business-loan sizes, mortgage approval 0.48. Each change is noted where the number lives in the docs.
  - `buildBranch` leases and builds in one step; new branches open with deposits on and other lending off; one rate sheet per rival bank; overnight limit shrinks with the capital tier.
- **Balance report** (seed 42, Calgary, steady, 5 years): every first-branch checkpoint is in range. First branch: $339k to build, income positive from week 8, $38M deposits and 3,624 customers at week 52, loans 76–81% of deposits from week 52 on, $47–63k a week of income from week 104, payback 36 weeks after opening. Company: 3 → 28 branches over five years, capital Watch in years 1–2 then Adequate, NIM 4.0–4.4%, loan losses 0.7–0.9%.
  - Other strategies at year 5: idle $45M deposits, $72M loans (its prices go stale as rates rise); aggressive 36 branches at Watch; stress (recession at week 156) stays Adequate; turtle 47 branches with no loans.
- **Next:** Stage 2 — game loop with speeds and auto-pause, HUD, New Game wizard, a city-list view of lots, storefront and build flows, the five-tab branch panel, weekly results, saves, settings.
- **Known issues:**
  - Company-level targets need the HQ costs of Stage 4: ROE is 55–85% (target 8–18%) because there are no head-office salaries yet.
  - Turtle (no lending) out-expands steady because nothing limits its growth but cash, and its corporate cash dips below zero briefly after a build. Revisit once insolvency (Stage 2) and HQ costs (Stage 4) exist.
  - One city holds 47 free storefronts, so branch counts stop there until more cities open (Stage 8).
  - Results vary a lot between seeds because each seed's "average lot" differs; the targets are checked on seed 42.

### 2026-10-24 — Stage 0 complete
- **Date:** 2026-10-24
- **Stage / step:** 0 — Scaffold and deploy
- **Done:**
  - Added all design docs to the repo (README and CLAUDE.md at the root, the rest in `docs/`).
  - Vite 8 + TypeScript (strict) + Preact + @preact/signals project, ESLint + Prettier, Vitest with sample tests.
  - `tokens.css` with the Banknote Deco palette, type scale and safe-area insets; Bodoni Moda and Public Sans bundled via @fontsource.
  - Title screen: engraved "Vault Street" wordmark over a procedural guilloche rosette (`src/art/guilloche.ts`), disabled New game / Continue, version string, "A Longlight Interactive game".
  - `src/config/balance.ts` with one `FEATURES` flag per roadmap stage.
  - GitHub Actions workflow: lint, test and build on every push and pull request; deploy to Pages on pushes to `main`.
  - Checked at 390×844 and 1280×800 in Chromium, served from a `/VaultStreet/` sub-path: fonts load, no console errors.
- **Decisions** (also in DESIGN §7):
  - Code goes straight to `main` (owner's choice); every push must be green.
  - Toolchain: Preact 10.29 rather than the 3-week-old Preact 11; TypeScript 6.0 because typescript-eslint doesn't support TypeScript 7 yet.
  - An ESLint rule blocks `Math.random`, `Date.now`, `window`, `document` and `localStorage` inside `src/sim/`, enforcing the pure-simulation rule automatically.
- **Doc ambiguities noticed** (none blocking; resolve as each stage arrives):
  - SCREENS §1 lists Continue / New Game / Load / Settings on the title; ROADMAP Stage 0 asks only for disabled New Game / Continue. Stage 0 shows those two; Load and Settings come with saves in Stage 2.
  - DEPLOYMENT's workflow runs only on `main`; it now also runs checks (without deploying) on pull requests.
- **Next:** Stage 1 — headless simulation core.
- **Known issues:** The owner must set Settings → Pages → Source to "GitHub Actions" once, or the deploy job fails.

### Template
- **Date:**
- **Stage / step:**
- **Done:**
- **Decisions** (also add to DESIGN §7):
- **Balance report** (if the sim changed): key numbers vs targets
- **Next:**
- **Known issues:**

---

## Known issues
(none yet)

## Dependency log
| Package | Why | Added |
|---|---|---|
| preact, @preact/signals | UI | Stage 0 |
| @fontsource/bodoni-moda, @fontsource/public-sans | Bundled fonts | Stage 0 |
| lz-string | Save export codes | Stage 1 |
| tsx | Runs `scripts/balance.ts` (dev only) | Stage 1 |
| vite, @preact/preset-vite, typescript, vitest | Build, types and tests (dev only) | Stage 0 |
| eslint, @eslint/js, typescript-eslint, eslint-config-prettier, globals, prettier | Lint and format (dev only) | Stage 0 |
| @types/node | Types for config and scripts (dev only) | Stage 0 |
