# Dashboard upgrade plan: MP Ops Console (22 Oct 2026)

Reviewed against the two dashboard guides in the design-review skill: DataCamp, *Effective Dashboard Design*, and
Pencil & Paper, *Dashboard Design UX Patterns*. NN/g navigation rules and Mobile First were also applied where they
touch the dashboard.
**Status: Phases 1–5 and 7 built on branch `dashboard-phase1` (22 Oct 2026), previewed, not deployed. Phase 6 (season phase) not built, by decision.**

---

## 1. The rules I measured against (the short version)

1. **Start from questions.** Every screen should answer two or three named questions for a named person. A widget
   that answers none of them goes.
2. **The top-left answers "good or not?"** Status and targets go at the top, trends that explain them in the
   middle, and details and owners at the bottom.
3. **Every number has context:** unit, date, a comparison (target, last period or last season) and a change shown
   the same way everywhere.
4. **Fixed card anatomy:** label, then value, then change, then time frame, in the same place on every card.
5. **Freshness is honest.** Show what date the data is for. Stale data must look stale.
6. **One name, one number.** The same quantity carries the same figure on every page.
7. **Fewer by default.** Five precise filters beat fifteen vague ones. Rare controls go behind a clearly
   named "More filters", and applied filters are always visible.
8. **You are here:** a page heading, a one-line purpose, a unique browser-tab title and an address you can
   bookmark.
9. **Never colour alone, never hover alone.** Every state is shown with a word and a mark, and everything must work
   with a tap.
10. **Ten-second test.** Someone from the team must answer the page's top two questions in ten seconds.

## 2. How the review was done

- Ran the app locally on the **live sheet**, logged in as admin (test PIN 0088), and opened all 12 admin views at
  **1280 × 800**, **390 × 664** and **320 × 560**.
- Not walked one by one: the Wheat and IoT projects (their pages were redesigned last week and are not
  "dashboards" in this sense), and the field logins. Field logins see the same Map, Territory, Machines and Weather
  screens as admin, minus the admin-only columns, so every fleet finding below applies to them too.
- No sideways page scrolling at any size, and no console errors.

## 3. Who opens it, and what they need answered

| Who | How often, on what | The questions the screen must answer | Dashboard type |
|---|---|---|---|
| **Ops head (admin)** | Every morning, laptop and phone | Did the fleet work yesterday? Where didn't it, and who do I call? | Operational / tactical |
| **Leadership** | Weekly or monthly, laptop | Are we ahead of last season? UPL vs SWAL? Which products? | Strategic |
| **State field login (UPL / SWAL)** | Daily, phone | Which of *my* machines didn't run, and who is the operator? | Tactical |

What each view is today:

| View | Type | Answers the question? |
|---|---|---|
| Insights | Strategic | **Yes, and it is the best page in the app** (see §4) |
| Map (fleet home) | Shows the inventory | **No.** It answers "where are the machines", not "are they working" |
| Territory / AMs / BMs / Pending | Analytical drill-down | Partly. The tables are good, but the headline figure in them is misleading (D3) |
| Machines, Weather | Operational detail | Yes |
| Yesterday | Tactical | Yes. It has a sentence summary at the top, which is the pattern to copy |
| Cumulative, Products, MP products | Strategic | Yes, but they have no page heading |
| Leaders | Explanatory | Yes, but the contest ended on 31 Aug |

## 4. What already works (keep it)

- **Insights** follows almost every rule: it compares against two earlier seasons, shows the gap in acres and in %,
  shows whether the gap is narrowing or widening, names the owner of each finding, marks direction with ▲▼● as well
  as colour, and describes rather than instructs. **Use it as the template for the rest.**
- **Yesterday** opens with one plain sentence ("44 of 1,451 deployed machines ran… spraying 414 acres") and then
  the cards. That is the inverted pyramid done right.
- **Drill-in by drawer** (machine detail) keeps the context underneath, which is the pattern the guides recommend.
- **CSV export on every table, and PNG export on every chart.**
- **Offline data looks offline** (the amber "Offline · data as of …").
- **The phone layout:** stacked cards, 44px targets, and no hover dependency on the maps.
- **Reconcile logging** (`[MP-Ops] …` lines). This is the guides' "check data completeness automatically".

## 5. Problems found

Numbered **D1–D14**, most important first. "Where" names the screen. The code location is for whoever builds it.

| # | Where | Problem (what the person sees) | Rule broken | Fix |
|---|---|---|---|---|
| **D1** | Fleet KPI strip (Map, Territory, Machines, Weather), desktop and phone | The strip opens with **Plan · Deployed · UPL · SWAL · Open**: five inventory numbers. "Active yesterday" is the **6th** tile. On a phone it sits 539px to the right, off-screen, so the one number that says "good or not" is never seen without swiping. At 1280px the strip already needs a scroll bar (14 tiles). | 2, 10 | Lead with one **status card**: "**44 of 1,451 worked yesterday (3%)** · 414 ac". Then breakdowns and idle, then the inventory group. On the phone the status card is full-width and comes first. |
| **D2** | Every fleet KPI tile | **No tile has a comparison.** "414 ac" on its own can't be judged as good or bad. | 3, 4 | Add a change line under each tile in one fixed format. **Data limit:** the only history is the Cumulative tab, at **state level**. So "vs same day last season" works for All India and for one state, and **disappears (with a note) once a territory, AM or BM filter is set**, the same rule Insights already follows. |
| **D3** | KPI "**Achieved 29%**" and the "**Acres funnel (achieved / target)**" column on Territory, AMs and BMs | The target is a **flat 1,000 acres for every machine** (the project notes already mark it unusable). So "29%" in a warning colour and "1,25,422 / 4,66,000" read as a programme shortfall nobody set. | 3 (a false baseline is worse than none) | **Decision 1.** Either remove both, or replace them with a real target if the programme has one. |
| **D4** | Map "Top territories", BMs list, Weather "Wettest", every filter dropdown | **Placeholder names lead the rankings:** territory "**0**" is #1 (106 machines), BM "**0**" is #1 (203 machines), and the wettest-territory list opens with "0" and "Unassigned". Insights already hides these (`insJunkTerr`); the fleet views don't. | 6, scent | Don't rank them. Show one labelled line at the bottom: "**Not assigned on the sheet · 106 machines**" (tap to see which). Remove "0" from the dropdowns. Send the list to the sheet owners. |
| **D5** | Header status on every page | "**Live · 10:30 pm IST**" is when the page *fetched*. The machine figures are **yesterday's** (the sheet is overwritten daily). "Live" suggests real time. | 5 | "**Data for Wed 21 Oct · checked 10:30 pm**". After a set number of hours it turns amber with the word "old". |
| **D6** | Insights vs Cumulative | The same quantity carries two figures: Insights says **28,516 ac behind / 4,15,323 ac** (through 21 Oct), while Cumulative says **28,692 ac behind / 4,15,388 ac** (22 Oct, which includes today's half-written day). | 6 | Cumulative's badge also reads "through yesterday", or it labels its figure "incl. today so far". |
| **D7** | Whole app, now | **The season is over and the screens don't say so.** 1,338 of 1,451 machines show as amber "Idle". The Leaders contest ended on **31 Aug** but still sits in the main menu with Share/Poster buttons. "Today" in the Day toggle has almost no data (the today-acres column is filled on 18 of 1,518 rows). | 5, 7 | A **season-phase** setting: "Kharif 2026 closed · figures through 21 Oct". "Idle" is worded as "not running" off-season. Leaders moves under "Past contests". See **Decision 3** and **Decision 4**. |
| **D8** | Desktop rail (13 icons for admin) | **Icon-only menu, and the names appear only on hover.** That does nothing on a touch laptop, and a new user has to guess what a trophy, a flask or a clock means. There is no grouping. | 8, 9, NN/g "visible navigation" | Icon + short label, in three named groups: **Today** (Map, Machines, Weather, Yesterday) · **People** (Territory, AMs, BMs, Pending) · **Season** (Insights, Cumulative, Products, MP products, Leaders). This costs width. See **Decision 5**. |
| **D9** | All views | The browser-tab title is always "India Operations Dashboard" and the address never changes. So you **can't bookmark or share** "Cumulative · Madhya Pradesh", and Back on a desktop browser leaves the app. | 8 | Tab title per view ("Cumulative · India Ops") and an address per view (`#/cumulative`). The phone already has Back handling, so this extends it. |
| **D10** | Products, Cumulative, MP products; fleet views | **No page heading or purpose line.** Products starts with "COMPANY Both UPL SWAL" and Cumulative starts with "STATE All India…". The fleet views start with the filter bar. | 8 | One shared page head: small context line (scope · date), heading, and one line on what the page is for. Insights already has one. |
| **D11** | Fleet filter bar (desktop) | **Two rows: 8 dropdowns, 2 toggles and 3 chips.** Labels are "Geo" and "Team", and the second dropdown of each pair is named by its own placeholder ("— pick territory —" is in fact the *Cluster* field). | 7, scent | First row: **State · Company · Day · Health**. A "**More filters**" button opens Territory → Cluster, AM → Cluster officer and BM → TM, each with a real label. Applied filters show as removable chips. |
| **D12** | Weather (4,871px tall), Insights (3,558px), Leaders (2,779px) | Very long pages with no overview of what is below. | 2, 7 | A row of section-jump chips under the page head. Lower sections can start collapsed on the phone. |
| **D13** | Recap, Products, Insights, KPI strip | **Four acre measures with similar names:** machine acres, product-scanned acres, IoT acres and season-to-date (Cumulative tab). They are explained in different places with different wording. | 3, jargon | One ⓘ glossary (opens on **tap**, not hover) with the same four definitions everywhere. |
| **D14** | KPI strip | **Deployed = UPL + SWAL + Open** takes four tiles, and Plan sits beside it with no relationship drawn. | Cut duplicates | One card: "**Deployed 1,451 of 1,630 planned (89%)**" with a progress bar, and the UPL/SWAL/Open split as one stacked bar under it. |

## 6. Decisions needed (yours, not mine)

1. **Is there a real acre target?** (D3) If the programme has a per-state or per-machine season target, we show
   progress against it. If not, the "29% achieved" figure and the target column should go. *Trade-off:* removing
   them leaves the tables without a "how far along" bar. Replacing them needs somebody to own and maintain a number.
2. **What should each role land on?** Today admin lands on the **Map**, which shows inventory. The options are:
   (a) admin and leadership land on **Insights**, and field logins on a "my machines that didn't run" list;
   (b) keep the Map, but put the status card from D1 on top. *Trade-off:* people's habits. The team knows the Map
   as "the dashboard".
3. **What should the console be between seasons?** Kharif has finished and Wheat is still in planning. The
   options are a "season closed" mode (archive figures, Leaders under "Past"), or nothing (it stays as is).
   *Trade-off:* a mode needs a date or switch somebody sets.
4. **Keep the "Today" toggle?** It is nearly empty at all times (18 of 1,518 rows). Removing it is honest, but
   somebody may use it during the day in season.
5. **Rail labels.** Labelled groups make the rail about 180px wide instead of 74px. That takes about 100px from
   the tables, which are already ~940px wide. The alternative is a rail that expands on click, with labels shown
   on first visit. *Trade-off:* table width vs findability.
6. **Fleet delta baseline (D2).** "vs same day last season" is the only comparison the data supports below
   national level, and it stops at state. "vs the day before" per territory would need a **daily snapshot of
   Sheet1** (≈15 lines of Apps Script, already an open item). Do you want that snapshot set up? It unlocks
   day-over-day and week-over-week per territory and AM across the whole console.

## 7. Advice from the guides that does NOT fit here

- **Real-time monitoring and alerts** (the "operational wallboard"). The data changes once a day, so a live
  look would be false. That is the opposite of what D5 asks for.
- **Let the user pick the comparison period from a dropdown.** Only season-vs-season at state grain exists, so
  the dropdown would have one real option.
- **Personalisation: drag-and-drop cards, "build your dashboard".** This is a small PIN-gated team with fixed
  roles. Every role has its own fixed home, which is cheaper and easier to support.
- **Blue/orange instead of red/green for good/bad.** The health colours are locked design tokens. We keep them
  and rely on word + mark, which the guides also require.
- **"Fit the core view on one laptop screen."** Insights is a top-down review page read once a week. It gets
  jump links (D12), not cuts.
- **Hover tooltips and legend hover-highlighting.** These are phone-first users, so everything is tap.
- **AI-assisted exploration.** Not now.

## 8. Suggested order (small and safe first)

| Phase | Items | Size | Needs a decision? |
|---|---|---|---|
| **1. Honest numbers** ✅ built | D5 freshness wording · D4 placeholder names · D6 one figure · D11 labels only | Small, copy and data hygiene | No |
| **2. "Good or not?" first** ✅ built | D1 status card · D14 deployed-vs-plan card · D3 | Medium | D3 needs Decision 1 |
| **3. Comparisons** ✅ built | D2 deltas at state grain | Medium | Decision 6 for anything finer |
| **4. You are here** ✅ built | D9 tab titles + addresses · D10 page heads | Medium | No |
| **5. Navigation** ✅ built | D8 labelled, grouped rail · D11 "More filters" | Medium–large, re-check short screens | Decision 5 |
| **6. Season phase** — not built | D7 | Medium | Decisions 3 and 4 |
| **7. Reading aids** ✅ built | D12 jump chips · D13 glossary | Small | No |

After phases 2 and 5, run a **ten-second test** with 3 people (one AM, one state login, one leader). Show them
the landing screen for ten seconds, then ask:
- "Did the fleet work well yesterday?"
- "Which state or territory needs a call?"
- "Are we ahead of last season?"

If two of three can't answer, rearrange before going further.

## 9. Phase 1: what was built (22 Oct 2026)

| # | What changed on screen | Checked |
|---|---|---|
| D5 | Desktop header now reads "**Data for Wed 21 Oct** · checked 10:42 pm · 1,451 machines" (it used to read "Live · 10:30 pm"). The phone header button reads "**21 Oct**". On Today it reads "Data for today so far". The offline, demo and Wheat/IoT wording is unchanged. | Desktop, 390, 320 |
| D4 | "0" reads "**Not named on sheet**" and sorts **last**, together with "Unassigned" and "Not in plan", in every dropdown and in the Territory, AMs, BMs and Pending lists. Top territories and Wettest territories leave them out, and Top territories says "Not ranked: 117 machines with no territory on the sheet". Filtering to one of them still works (106 machines). | Desktop, phone (BM list) |
| D6 | Cumulative now reads **through yesterday** like Insights: **28,516 ac behind** on both pages (it was 28,692 on Cumulative). The badge adds "today not counted yet" while today's row is half-written. The chart still draws today. | Desktop, 320 |
| D11 | Filter groups are labelled **Territory / AM / BM** (they were "Geo / Team / BM"). A child dropdown reads as its own name ("Cluster", "Cluster officer", "TM") and is greyed out until its parent is picked. Every dropdown has a spoken name for screen readers. | Desktop, phone filter sheet |

No sideways scrolling and no console errors at 1280, 390 or 320. Not checked: field logins and leadership (their
fleet screens go through the same code), and the landscape phone layout.

## 10. Decisions taken (22 Oct 2026)

| Decision | Choice |
|---|---|
| 1. Real acre target? | **None.** The 1,000-acre figures are removed everywhere. |
| 2. Landing page | **Keep the Map**, with the new status card first. |
| 3–4. Off-season mode, Today toggle | **No preference, so not built.** Declaring the season closed is a programme call (44 machines still ran on 21 Oct). The Today toggle stays. |
| 5. Menu | **Labels under the icons**, narrow rail kept. |
| 6. Daily snapshot of the machine sheet | Not set up. The season comparison works for All India and for one state only. |

## 11. Phases 2–5 and 7: what was built (22 Oct 2026)

| # | What changed on screen | Checked |
|---|---|---|
| D1 | The number strip **opens with "44 of 1,451 worked yesterday · 3%"**. On the phone it is a full-width card at the top, no longer a tile you swipe to. | Desktop, 390, 320 |
| D2 | A **"Season to 21 Oct" tile: 4,15,323 ac, ▼ 6.4% vs ’25-26, 28,516 ac behind**, the same figures as Insights and Cumulative. It shows only for All India or one state with every company, because the source has no company or territory detail. It is hidden for field logins. | Admin All India, admin MP, field login |
| D3 | "Achieved 29%", the achieved/target bar, the drawer's Target row and the CSV Target column are **removed**. The tables read "**Season acres · per machine**" (for example "1,25,422 ac · 266/machine"). | Desktop |
| D14 | Plan, Deployed, UPL, SWAL and Open are **one card**: "1,451 of 1,630 planned · Deployed 89%", with the company split as one bar. | Desktop, phone |
| D9 | Every page has its **own browser-tab title** ("Cumulative acres · India Operations Dashboard") and **address** (`#/cumulative`, `#/territory`, `#/leaders`…). A bookmarked address opens on that page after the PIN. Phone Back still steps back a page. | Desktop reload, phone Back |
| D10 | **Page headings with a purpose line** on Cumulative, Products and MP products (desktop; the phone header already names the page). | Desktop |
| D8 | The desktop menu shows a **word under each icon**, in groups: Today (Map, Machines, Weather, Yesterday) · People (Territory, AMs, BMs, Pending) · Season (Insights, Cumulative, Products, MP products, Leaders). On screens shorter than 760px it goes back to icons only, so nothing is cut off. | 800, 768 (all 13 with MP), 620 |
| D11 | The filter bar keeps **Company · Day · State · Health** up front. Territory, AM and BM are behind "**More filters**", which shows how many are set. While it is closed, each one set shows as a chip you can remove with ✕. | Desktop |
| D12 | **"Jump to" links** on Weather (Territory table) and Leaders (State podiums, Standings). | Desktop |
| D13 | An **ⓘ button** opens "What the acre figures mean": machine acres, season to date, product acres and IoT acres, in the same words everywhere. It is on the number strip, the phone status card and the Products heading. | Desktop, phone |

No console errors, and no sideways scrolling on any page at 320. A field login (MP UPL) gets five labelled pages,
no season tile and no plan. **Not checked:** leadership's login, Wheat and IoT (their pages are separate and their
code was not changed apart from the menu labels and titles), and landscape phones.
**Not built:** jump links on Insights (its cards change with each mode, so fixed links would point at the wrong
card).
