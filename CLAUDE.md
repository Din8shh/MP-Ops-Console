# MP · AF Machine Deployment — Ops Console

Self-contained static site (no build step, no framework) implementing Phase 2 of the
PRD. Recreated from the Claude Design handoff `MP Ops Console.dc.html` as plain
HTML/CSS/JS + inline-SVG maps. Same deploy shape as `din8shh.github.io/MP-map-view`.

## Files
- `index.html` — the whole app: state machine, the views (Insights / Map / Territory tables /
  Machine locations / Weather / Area Managers, …), global filter bar, KPI strip,
  machine-detail drawer, mobile layout, plus the SVG map/pin/choropleth engines and
  the **data layer** (CSV fetch → parse → derive → demo fallback).
- `machines.js` — 401 **mock** rows (`export const MACHINES`) in the exact object shape
  every view consumes. Used as the demo/fallback dataset.
- `mapdata.js` — `export const BASE` (MP district GeoJSON) + `COORDS` (territory
  centroids). Reused directly for map geometry.

## Layout / responsive
`state.device` picks `desktopHTML` vs `mobileHTML`; it is seeded from — and re-synced on every
crossing of — the `(max-width:820px)` media query (`isPhone()`, `onBreakpoint`). `mobileHTML`
renders two ways off the same markup: on a real phone it is **full-bleed** (no bezel/notch/desktop
toggle, `100dvh`, `env(safe-area-inset-*)` padding, viewport-relative map heights, touch-sized
controls); above the breakpoint it keeps the 392×840 handset frame so the layout stays previewable
from the desktop rail's phone button. The map SVG carries `touch-action:auto` while locked (a finger
scrolls the page over it) and `none` once unlocked, where two-pointer pinch zooms.

**The phone carries the whole dashboard** — every view the role allows, plus the full filter set.
Both paths consume the *same* `vals()` output; only presentation differs. Desktop tables are
fixed-px grids (~940px+) that cannot reflow, so on mobile each hierarchy row (territory / AM / BM /
pending) renders through one shared card builder, `mHierCardHTML`, with `r.indent` becoming a left
rule + inset. Drill-down still runs on `state.expanded` and the shared `data-act="exp"` handler, so
Territory→Cluster→Machine behaves identically on both.

- **Nav** — `M_VIEWS` (role-filtered by `mViews()`) fills a bottom bar: first `M_PRIMARY` (4) inline,
  the rest behind "More". `state.sheet` (`null|'filters'|'more'`) drives the overlays via `mSheetHTML`.
- **Filters** — `mFiltersHTML` reuses the desktop element IDs (`stSelect`, `terrSelect`, …,
  `searchInput`), so the existing `change`/`input` handlers cover it with no extra wiring. Keep those
  IDs in sync if the desktop bar changes. The header button badges `activeFilterCount()`.
- **Paging** — the mobile machine list is capped at `state.listLimit` (`MLIST_PAGE`, 60) with a
  Load-more button. `render()` resets it whenever the filter signature changes, so a stale offset is
  never applied to a freshly-filtered (shorter) set.

`activeFilterCount()` is the single source of truth for "is this view narrowed?" — it feeds both
`anyFilter` (the "(filtered)" label + Clear button, desktop and mobile) and the mobile Filters badge.
It measures against the **role's** baseline via `gateDefaultOrg()`, not the global one: a UPL/SWAL
login has its org forced by the gate, so the old `org !== 'Both'` test marked every scoped user as
permanently filtered. **`st` is deliberately excluded** — state is a scope, not a filter: it has its
own labelled control on desktop, `clear` doesn't reset it, and the active state is always in the
header. Counting it would render a Clear button that leaves it behind.

## Data
One row = one machine. Live source is a published-CSV Google Sheet (see `CONFIG` in
index.html). To go live, set `CONFIG.csvUrl` (Publish-to-web CSV link) or `CONFIG.sheetId`.
Blank → runs on `machines.js` demo data. The parser matches columns by header **keyword**
(tolerant of wording/order), keeps phones as text, parses the free-text `Scanned acres`,
and handles missing location / unparseable tokens / empty fetch gracefully. Derived
client-side: health (Breakdown>Idle>Active), achieved %, ran-yesterday, operator coverage.

**Org** (`org`) is `UPL` / `SWAL` / `Open` — anything not UPL/SWAL is Open, EXCEPT MP
`Unimart` rows, which stay UPL (business rule). **Deployed vs Plan:** the sheet carries a
`Deployed status` (Yes/No) column and now includes not-yet-deployed rows. `ALL_ROWS` holds
every parsed row; `ROWS` is the deployed subset (`deployed===1`) and drives every map/table/
KPI view. **Full-deployment states** (`FULL_DEPLOY` = MP/PB/HR/RJ) count **all** their sheet
rows as deployed regardless of status — their sheets list every machine as deployed, so the
`Deployed status` column is ignored for them. MP additionally has a fixed programme-constant
plan (`MP_PLAN` = UPL 270 / SWAL 230), not sheet-derived; PB/HR/RJ still derive plan from the
sheet, so their Plan and Deployed now coincide (~100% deployed, empty Pending view).
Other states derive plan from `ALL_ROWS` (deployed + pending, incl. Open) and use the Yes flag. `planTotals()` +
`planScope()` compute the per-org Plan; the **Plan KPI and the Pending Deployment view are
admin-only**. Global filter dropdowns (territory/AM/CO/BM/TM) scope to the selected state.

Object shape: `{ mc, org, deployed(1/0), territory, cluster, co, coMob, am, amNum, target,
achieved, mtd, acresY, scanned:[{product,acres}], breakdown(1/0), opMapped(1/0), opName,
opNum, lat, lon }`.

## Insights (the cross-tab summary)
`insights` is the only view that reads all three tabs at once. **Admin-only** (in `roleHidesView`, like
Cumulative / Products / Leaders); it sits first in the rail and first in the phone's bottom bar for those who
have it. Chromeless (no filter bar, no KPI strip) and filter-free by design; the state league table is its only
navigation (`data-act="insdrill"` → that state's map).

Each tab answers exactly one question and is used for nothing else: **snake** → ahead or behind (vs the two
prior seasons); **Sheet1** → is the fleet working (deployed / ran / broken down / never sprayed, pinned to
*yesterday* since the page has no Today toggle); **Product data** → what is sprayed and whose brand it is.

- **Season cursor — the page always reads through YESTERDAY.** `insAnchor()` drops today (and anything dated
  beyond it) by the **calendar**, comparing each logged offset against `snakeTodayOff()`. This is deliberately not
  a magnitude test: the sheet writes the current day's row as the day runs, so a "is it big enough to be real"
  rule releases today around midday and then compares a half-finished day against a full day a year ago —
  a shortfall that appears every afternoon and vanishes overnight. A median-vs-prior-7-days test survives only as
  a **backstop for a half-written yesterday** (an overnight batch that didn't finish), stepping back one more day.
- **Gap trend beats gap size.** The five-week strip (`season.hist`) is the point of the page: it shows whether a
  shortfall is opening or closing, which a single "−13%" cannot.
- **"What changed" (`insSignals`) is the one part that recomposes daily.** Everything else is a fixed spine —
  same cards, same order, new numbers — because comparison needs consistency. This strip is detector-driven:
  Two families run over every scope, emit scored candidates, and the top 5 render.
  **Family A (snake, across TIME)** — inflection, streak, crossover/projection vs last season's full year, peak day,
  fleet week-over-week, productivity per running machine, stall. **Family B (Sheet1, across PEERS — no history
  needed)** — territory zero-output clusters and AM chronic underperformance, each compared against *its own
  state's* peers rather than its own past. Plus the **trust check**: snake's daily acres vs Sheet1's yesterday
  (1.3% apart today); a >10% divergence outranks everything, because it means the page itself is unreliable. It
  only runs when the anchor IS yesterday — otherwise the two sides are measuring different days.
  **Family B is anchored on never-sprayed, a SEASON total, never on "ran yesterday".** Sheet1's daily fields are a
  single observation with no history to smooth them; utilisation only ever corroborates. An AM can post 0% on a
  quiet day and still own the programme's top cluster officer, which is precisely the false positive this rule kills. Three guards stop it becoming
  horoscope: absolute **floors** (a state going 2→6 machines is a 150% swing and pure noise), **magnitude
  weighting** by share of national acres, and **stateless novelty** — nothing is remembered between visits, so
  "new" is derived from the data itself (transitions and milestone-length streaks score full; a condition that
  has merely been true a while is damped to 45%). Two diversity rules cap it at one signal per scope (when there
  is more than one) and two per detector type, so a day when every state inflects doesn't produce four identical rows.
- **Three MODES, one page (`state.insMode`).** *Season* — the trend, and what to correct over weeks. *Week* — one
  completed Sat–Fri week for the weekly review. *Yesterday* — what broke, and who to ring this morning. Same spine,
  same scope picker, three horizons. Season and Yesterday are not one list re-sorted: on live data the chronic
  territories and the acute ones overlap by **zero** (Harda has 6,359 season acres and did nothing yesterday — a
  call; Morbi has never sprayed — a season problem). Yesterday is **detector-led with no leaderboards on purpose**
  — the separate `recap` view is the descriptive roster, and duplicating it would put two competing Yesterday
  screens in the nav.
- **Week mode is state-grain ONLY, and says so on the page.** The cumulative tab is the only source with daily
  history, so what a territory or AM did *during* a past week is unrecoverable — the machine sheet is overwritten
  daily. Per-territory weekly detail needs a weekly snapshot of its cumulative column, which does not exist yet.
  The programme's week runs **Saturday → Friday**, not ISO Mon–Sun; `INS_WEEK_END_DOW` is the single source of
  that — window, day-column order and every piece of copy derive from it, so moving the week is a one-line change.
  Boundaries are real calendar weeks computed from the date then mapped onto the fiscal axis (`insWeekWindow`); a
  week straddling 31 March is skipped, not clipped. Year-over-year on the same fiscal offsets is sound even though
  an offset falls on a different weekday each year — any 7-day window holds all seven weekdays exactly once, so
  weekday rhythm cancels out of the sum.
- **Week mode reports the season gap in BOTH units, always.** The percentage gap can narrow while the acre gap
  widens — it did in the week of 20 Jul (−19.3% → −16.9%, but 30,347 → 32,047 ac) — because the base grew faster
  than the shortfall. A slide saying only "we closed the gap" is the kind of half-true that gets caught in the
  room, so the card shows both and explains the divergence in words.
- **Copy rule for the whole Insights page: describe, never instruct.** The page is read by whoever opens it, not
  narrated to a presenter — so "the season so far", not "what to correct over the coming weeks"; "both measures
  moved", not "worth saying both ways in the review". Card headings are noun phrases naming what the card shows.
- **Sign words flip with the sign.** A scope that is ahead is never described with "gap" or "acres behind":
  `POS.ac*` is (last season − this season), so a negative value means ahead, and the noun (`lead`/`gap`), the
  label (`acres ahead`/`acres behind`) and the verb (`grew`/`shrank` vs `narrowed`/`widened`) all switch on it.
  Cells show magnitudes, so the delta under them is the change in that magnitude, not the raw signed difference.
- **Week mode metrics were chosen so the headline decomposes.** The week's acres = (machines that ran) ×
  (ground each covered), so the stat band carries acres/day, the **highest single-day machine count** of the week,
  and **acres per running machine**. A "days with acres" count was removed: at national scope it can only ever
  read 7/7, so it asserted the obvious instead of informing. Sub-labels avoid internal jargon such as
  "machine-days" — they read the way the team says the number aloud.
- **Product segments by state** joins the weekly sheet to the summary tab's brand → portfolio map (~99% of acres
  match). Soil & Seed Health and Unclassified are excluded from the base entirely, so Herbicide / Insecticide /
  Fungicide / Other sum to 100% of what remains. Non-dashboard states are dropped, and the exclusions are NOT
  narrated on the page — the table shows the four segments and the largest products per state, nothing else.
- **Every Week-mode card exports to PNG** (`downloadCard`, `dlWrap`). No library: the app styles inline, so a card
  serialises straight into an SVG `<foreignObject>` and rasterises at 2× on white with a title and the week's
  dates. Weekly review only — the other modes are read on screen. Web fonts do not load inside a rasterised
  foreignObject, so exported text falls back to the system UI font; layout and numbers are unaffected.
- **Week mode carries TWO product cards, from two different sources.**
  *Products this week* ← `WKP` (gid 1973671649), a **hand-built tab covering ONE named week** (`WKP_WEEK`,
  25–31 Jul 2026). It has no date column — the tab IS the week — so it renders only when the selected week
  matches and otherwise says which week it covers, rather than relabelling those numbers as another week's.
  It is the real product mix: 101 products, ~62% of that week's fleet acres. Replace `WKP_WEEK` and the gid when
  the definitive recurring sheet arrives.
  *Focus product trend* ← `TX` (gid 718502150), the day-level tab: five focus brands since 1 June, the only
  product source with a date and therefore the only one that can show daily movement.
- **The trend COMBINES two products into one line, by design.** UPL and SWAL each sell an equivalent of the same
  product (Iris ↔ Patela), so "is this family growing across India?" is only answerable when the pair is summed —
  two separate lines answer a different, weaker question. Both slots (`state.insPa` / `insPb`) are user-chosen and
  either may be cleared. Daily product acres are very spiky, so the chart draws a 7-day rolling mean over the raw
  daily line and the direction figure compares the last 7 days with the 7 before.
  **Caveat: IRIS is not in the day-level tab** (it has only Amicus, Alito, Patela, Brucia, Canora), so the
  Iris ↔ Patela pair cannot be charted until that feed is widened.
- **Yesterday imputes NO expected value to anybody — it is an account, not a grade.** An earlier build scored each
  territory against "expected acres = the state's acres yesterday × the territory's share of the season". That was
  removed and must not come back: it assumes a territory's share of one day matches its share of a whole season,
  which is false for any territory whose crop calendar differs from its state's average, and it renders a loose
  assumption as a precise number — the combination that earns "says who?". Every figure on the page is now a
  **count from a column**: "24 of Hanumangarh's 43 machines have an operator, have sprayed this season, and did
  not run" is unarguable in a way that "195 ac short" never was.
- **`insDayAgg` decomposes idleness into mutually exclusive, observed buckets** that sum exactly to the idle
  count: flagged breakdown → no operator mapped → never sprayed this season → **unexplained**. First match wins.
  The breakdown bucket is kept first *even though it is empty in today's data* (see the flag caveat below) so the
  account stays correct if that column is ever fixed, instead of silently misfiling those machines as unexplained.
- **The one surviving comparison is the 14-day norm**, and only because it is a different kind of claim: the same
  series against **its own recent past** (snake tab, real daily history), not a cross-sectional guess about how
  one territory ought to behave. Rain is an **annotation only** — never a scoring weight, since a count needs no
  re-weighting to stay true. Clusters rank by machine count, with the idle machines' season acres as magnitude.
- **CAVEAT — the breakdown flag does not mean "down today".** Measured on live data: 90 machines are flagged and
  **all 90 also logged acres yesterday**; not one of the 1,038 idle machines is flagged. A present-state field
  cannot behave that way, so the column evidently records a reported/historical event. This also means the main
  dashboard's Breakdown KPI does not support the reading "90 machines are down". Not fixed here — it is a
  sheet-side question.
- **Two levels: All India and one state — never territory.** The snake tab has a full per-state series, so a state
  view carries the *same seven cards* at the same richness. Territory is where that collapses (no sub-state history,
  and the product tab has no territory column), which is exactly where the level stops.
- **Scope is PAGE-LOCAL (`state.insSt`), like `snState`/`pmState`.** Nothing this page does may move `state.st`,
  the machine filter bar, or any other view — that isolation is a deliberate constraint, not an accident. The
  gate's state LOCK still overrides `insSt`, so a state-restricted login can never widen its scope through the
  picker, and the picker is only rendered when `gateCanSwitchStates()`.
- **The league drops a level with the scope.** All-India → states, carrying **Util % and Ac/run** (connector #24:
  a shortfall decomposes into fleet × utilisation × productivity, which is what separates "Gujarat has no machines"
  from "Gujarat's machines are idle"). Scoped → **territories**, Sheet1-only: the season, vs-LY and branded columns
  are *absent rather than blank*, because the dimension is missing, not the data. Territories below
  `INS_TERR_MIN` deployed machines are dropped and the count is **stated in the UI** — a silent floor hides real
  problems. `insJunkTerr` filters the ~50 placeholder territory rows (`0`, `Not in Plan`, …).
- **Windows are named in the copy on purpose.** The hero reports the gap over four weeks; the inflection detector
  reports the same quantity over one. Both can be true and opposite ("across four weeks the gap has widened" +
  "the gap stopped widening last week"). Naming both windows is all that stops adjacent cards reading as a
  contradiction — do not drop those phrases when editing copy.
- **`M_VIEWS` position 5 is deliberate** — see the comment there. Insights leads the desktop rail but stays off the
  phone's 4-slot primary bar, because adding a twelfth view to it would displace Weather for admins.
- **Three acre totals, deliberately reconciled on-page.** Season-to-date (snake, the headline — the only
  year-comparable one) > Kharif achieved (Sheet1) > product-identified (~half the season). The footer card says
  why they differ. Product **coverage %** is withheld under an org-scoped login: the branded numerator would be
  one company's against an all-company season denominator.

## Weather (live)
Rainfall + spray window come from **Open-Meteo** (Asia/Kolkata, `past_days=1&forecast_days=4`),
fetched once after the CSV lands. `WX` is keyed **`"ST|territory"`** — state-qualified, because one
fetch covers every state in the sheet and district names are not globally unique. Value shape is
`{ days:[{rain,tmax,tmin,wind,code}] }` with **index 0 = yesterday**, 1 = today, 2–4 = next three.
A blank territory is that state's **statewide** point (mobile banner / national choropleth);
state `IN` + blank is the all-India point. `rainOf(terr,di,st)` / `weather(terr,st)` — always pass
`st` (take it off the row); the no-`st` fallbacks only guess when a name is unique across states.

Centroids come from `WX_GEO` (`buildWxGeo`), which merges **every** state's `COORDS` via
`GEO_LOADERS`/`GEO_CACHE`. This is deliberately independent of `COORDS`/`coordsOf`, which only ever
hold the *active* state's districts — reading those at fetch time silently dropped every non-MP
territory and fell back to `mockRainOf`, presenting simulated rain as live. The fetch is
state-complete, so changing `state.st` needs no re-fetch. Territories with no centroid (sheet-side
junk names) still fall back to the mock; the load logs how many.

## Local preview
Serve the folder over http (ES-module imports need a server, not file://), e.g.
`python3 -m http.server` then open the folder, or use the Launch preview.

## Tokens (locked — match the design)
Brand UPL `#F5821F`/`#D96A12`, SWAL `#1FAE43`/`#159234`. Health Active `#15A24A`,
Idle `#E0A008`, Breakdown `#DC3A2B`. Fonts: Noto Sans (UI) + IBM Plex Mono (numbers/
IDs/phones/coords). Full token list in the handoff README.
