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

Object shape: `{ mc, org, deployed(1/0), st, territory, cluster, co, coMob, am, amNum, target,
achieved, mtd, acresY, acresT, iotAcresY, scanned:[{product,acres}], breakdown(1/0), opMapped(1/0),
pinged(1/0), lastPing, daysSincePing, opName, opNum, bmName/bmMob, tmName/tmMob, foName/foMob,
retailerName/retailerMob/retailerLoc, lat, lon }`.

**Field availability, measured on the live sheet 2026-08-03 (1,518 rows / 1,193 deployed).** Check this before
designing anything on a column — several look usable and are not:

| Field | Fill | Usable? |
|---|---|---|
| `pinged` | 874/1,193 deployed | Populated and discriminating (226/874 pinged machines sprayed, vs 17/319 dark), but **deliberately not used by Insights** — see the ping note under Insights |
| `co`/`coMob`, `am`/`amNum` | ~100% | **Yes** — the reason peer detectors are cluster/AM grain |
| BM / TM / FO / retailer | 85–92% | Yes, unused by Insights so far |
| `mtd` | 343 of 938 season-active | Yes, but thin early in a month |
| `iotAcresY` | **0/1,518** | **No** — column is entirely empty. An IoT-vs-reported divergence detector would be the best signal on the sheet; ask for this to be populated |
| `lastPing` / `daysSincePing` | 100% | **No** — the two columns are **swapped** (`daysSincePing` holds an Excel serial date, `lastPing` holds the day count) *and* stale: median last ping 76 days old, only 17 machines in the last day |
| `target` | 100% | **No** — flat 1000 for every row, so any %-of-target measure is just `achieved` rescaled |
| `acresT` (today) | 18/1,518 | **No** — the page runs on yesterday anyway |
| `scanned` per machine | 149/1,518 | **No** — too sparse for per-machine product mix |

## Workbook tabs (one sheet, `CONFIG.sheetId`)
Nine tabs; the app reads five. Mapped by inspection — do not re-derive this.

| gid | What it is | Grain | History? | Used by |
|---|---|---|---|---|
| `0` | Machine master (`Sheet1`) | 1 row/machine | **No** — overwritten daily | everything |
| `603091795` | Cumulative "snake" | fiscal-day × state × 3 FY | **Yes**, 3 seasons | Cumulative view, Insights |
| `1039187695` | Product data (summary) | region × crop × brand | No (YTD + yesterday only) | Products view, Insights, segment join |
| `718502150` | Product day-level (`TX`) | **date** × region × crop × brand | Yes, from 1 Jun, no gaps | Week + Month → products, segments, focus-product trend |
| `1973671649` | Weekly product sheet (`WKP`) | region × crop × product, ONE week | n/a — the tab IS the week | Week → products + segments |
| `1199323704` | Richer machine feed (per-machine branded acres, lat/lon, ping) | 1 row/machine | No | **not wired** |
| `1433754421` | Org roster (AM/CI/BM/TM/FO/retailer) | 1 row/machine | No | not wired |
| `266726831` | The Athena SQL behind the machine feed | — | — | reference only |
| `1999606625` | Scratch, misaligned columns | — | — | unusable |

**Only the snake tab has real history.** That single fact drives most of the Insights design: anything asking "what changed over time" below state level is not computable today.

## Deploy
GitHub Pages serves **`main` at repo root** → **https://din8shh.github.io/MP-Ops-Console/**. Push to `main` = deploy;
Pages rebuilds in ~1 min. The Pages *build API* lags, so verify by fetching the live `index.html` and diffing it
against the local file — bytes are the authority, not the API's status field. Then load the live URL and check
the console. Work on a branch and fast-forward `main`; don't commit straight to it.

## Open items (none are code bugs)
- **The breakdown flag's meaning is unstable — re-measure it.** It once behaved like a historical marker (90
  flagged, all 90 also logged acres); on 2026-08-03 it behaved much more like a present-state field (124 flagged,
  83 of them idle). Whatever the main dashboard's Breakdown KPI is taken to mean, check the live sheet first.
- **IRIS is now IN the day-level product tab — this open item is CLOSED.** Re-measured 2026-08-06 on the full
  export (5,662 rows, **1 Jun – 6 Aug, every calendar day present**): **8 brands** — Centurion, Patela, Iris,
  Canora Ez, Brucia, Canora, Amicus, Alito. So the Iris ↔ Patela pair the focus-product trend was built to combine
  now charts, and the old "it has only Amicus, Alito, Patela, Brucia, Canora" note is dead.
  Two live caveats remain on that tab: its `portfolio` column is **only `Herbicide` or blank** (4,716 / 946), so
  the segment cards are Herbicide-vs-Other in practice rather than a four-way split; and it carries **AP and
  Andaman** rows, which the `st!=='OT'` filter drops.
- **Beware a TRUNCATED gviz export — it looks exactly like a narrow feed.** During the Month build one fetch of
  this tab returned 2,108 of its 5,662 rows, which read as "the tab only holds 24–31 Jul" and produced a
  confident, wrong conclusion about the feed being a rolling fortnight. The app handled it correctly (see the
  partial-coverage rule under Month), but **verify a surprising range against a second fetch and a real CSV parse
  before writing it down** — a naive `split(',')` over this export also mis-parses and will confirm the error.
- **`WKP_WEEK` is pinned to 25–31 Jul 2026**, because that tab is a manual one-off. When the recurring weekly
  sheet lands, change `WKP_WEEK` + `WKP_GID` and nothing else.
- **A periodic snapshot of Sheet1's cumulative column** (machine + `Kharif achieved`, appended each week) would
  unlock territory/AM-level weekly **and monthly** history, which is the single biggest gap — it is the one thing
  standing between Month/Week mode and sub-state detail. ~15 lines of Apps Script.
- **Open-Meteo quota is fragile** — heavy reloading triggers HTTP 429 and the app silently falls back to
  *simulated* rain while still showing a green "Live" badge. See the weather note.

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
  same cards, same order, new numbers — because comparison needs consistency. This strip is detector-driven, and
  renders as **TWO labelled groups with separate budgets**, not one ranked list. Splitting them is what let the
  visible count go 5 → 10 without the card getting harder to read: the peer rows are a list you work down and the
  trend rows are a list you read, and interleaving them made both slower to scan than either alone.
  **Family B → "Clusters and area managers"** (Sheet1, across PEERS, no history needed) — never-sprayed clusters,
  idle-despite-a-season-record, and AM chronic underperformance, each compared against *its own state's* peers.
  6 visible, pool of 14. **Family A → "States, against last season"** (snake, across TIME) — inflection,
  streak, crossover/projection vs last season's full year, peak day, fleet week-over-week, productivity per
  working machine, stall. 4 visible, pool of 10. Plus the **trust check**, rendered as a banner above both
  because it is about the page rather than the programme: a >10% divergence between snake's daily acres and
  Sheet1's yesterday means every other number here is suspect. It only runs when the anchor IS yesterday.
- **Peer grain is CLUSTER, not territory, and every peer row names its owner.** A territory has no owner column
  on the sheet; a cluster does (`co`/`coMob`, and `am`/`amNum` for the AM rows — both 100% filled on live data).
  A row nobody can be attributed to is a row nobody can act on. Cluster→officer is not 1:1 (a third of clusters
  log more than one), so rows name the **dominant** officer via `domStr` rather than asserting a mapping the
  sheet doesn't guarantee. The owner is **data, never an instruction** — the page names the person and the
  number and stops there; deciding to ring them is the reader's job. When a row's title already contains the
  owner's name (every AM row does), the line drops the name and shows role + number, or it stutters.
- **The machine sheet's ping columns are DELIBERATELY unused by Insights.** `pinged` is populated (874 of 1,193
  deployed) and does discriminate, and an earlier build used it for two detectors and a fifth idle bucket. It was
  removed by request: connectivity is a different subject from field performance, and mixing "this machine did
  not report to the network" into a page about how much ground is being covered made it answer two questions at
  once. Do not reintroduce it without that call being revisited.
- Three guards stop the strip becoming horoscope: absolute **floors** (a state going 2→6 machines is a 150%
  swing and pure noise), **magnitude weighting** by share of national acres, and **stateless novelty** — nothing
  is remembered between visits, so "new" is derived from the data itself (transitions and milestone-length
  streaks score full; a condition that has merely been true a while is damped to 45%).
- **The budget is driven by SCOPE DEPTH, and widens as you cascade** (`insDepth` → `INS_DEPTH[0..3]`: All India /
  one state / one area manager / one cluster officer). A constant budget was wrong at both ends: at All India the
  candidate pool is every cluster in seven states, so a cap of six discarded real findings, while filtered to one
  officer the pool is a handful of machines and the cap never bound at all — it did all its work at the top and
  none at the bottom, which is backwards from how the page is read. A leader opening All India wants the few
  things that matter; somebody who has drilled into one officer is diagnosing and wants everything.
  Depth drives **three** things from one number, which is why it is one number and not three settings: how many
  rows show, what the denominator is, and which detectors are eligible. Measured live: 3 rows at All India,
  4 at one state, up to 8 at an area manager, up to 12 at an officer.
- **The peer set is a PARAMETER, not a constant** (`insPeerScan({units, peer, peerName, det, …})`). At depth 0–1 a
  cluster is judged against its state; at depth 2 against **the rest of that area manager's own clusters**, because
  "worse than Madhya Pradesh" tells you nothing actionable once you have already picked the manager. At depth 3
  there is no peer left — an officer holds roughly one cluster — so the officer's own fleet becomes the unit and is
  judged against its state. Row count then grows because more DETECTORS fire on the same unit, not because more
  entities appear, which is what keeps the deepest view readable.
- **Seven detectors, and only two of them are daily** (`INS_DET`): never-sprayed (season), gone-quiet-this-month
  (month), idle-with-a-season-record (yesterday), nobody-assigned-to-drive (state), breakdowns-concentrated
  (state), acres-per-machine-vs-peers (season), output-concentrated-in-one-sub-unit (season). **Every row names its
  own window in its own sentence**, and the card is titled "What stands out here" rather than anything with
  "yesterday" in it — a daily title over a monthly row invites the reader to take a month figure for a day figure.
  Sheet1 carries exactly ONE trustworthy daily column (`acresY`), so a card that only asked about yesterday could
  never say more than ran/didn't-run; the useful signals are month- and season-grain.
- **The per-state cap is applied TWICE at different strengths, and it is the cap that matters.** Every cluster is
  its own scope, so a per-*scope* cap does nothing to stop one state filling the card — measured live, it let
  Madhya Pradesh take 4 of 6 rows. The pool allows **three** rows per state (a state genuinely can have three
  clusters in trouble, and hiding the third is the silent floor this page exists to avoid); the visible slice
  allows **two**, so the card above the fold spreads across the country. `peerTop` is a subsequence of `peer` in
  the same order, so expanding inserts rows between the ones already on screen instead of reshuffling them.
- **Four MODES, one page (`state.insMode`).** *Season* — the trend, and what to correct over weeks. *Month* — one
  completed calendar month for the monthly review. *Week* — one completed Sat–Fri week for the weekly review.
  *Yesterday* — what broke, and who to ring this morning. Same spine,
  same scope picker, four horizons. Season and Yesterday are not one list re-sorted: on live data the chronic
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
- **Month mode is Week's spine one horizon up, and COMPLETE MONTHS ONLY.** The month that just ended is the newest
  on offer; the running month never appears, for the same reason the page anchors to yesterday — a part-month
  against a whole month a year ago invents a shortfall that closes itself on the 1st. Unlike a Sat–Fri week a
  calendar month can never *straddle* 31 March, so no month is ever skipped; but a month earlier than April
  belongs to the **previous season's column**, and reading it off the current one would return zero rather than
  an error. So `insMonthWindow` returns null before 1 April, the ‹ button disables there, and the line says
  "the season starts in April". Cards: summary, where-the-month-left-the-season, day by day, how-the-month-built-up,
  states, products, segments, focus-product trend — every one exportable to PNG (`mo-*` ids → `buildMonthExport`).
  State-grain only, same as Week and for the same reason.
- **The month's shape is TWO charts, and they answer different questions.** *Day by day* is a line over ~30 points
  — the month's arc, where it climbed and where it crossed last season — drawn without point markers, which merge
  into a rope at that density. *How the month built up* is paired bars over **blocks of dates from the 1st**
  (1–7, 8–14, 15–21, 22–28, then the tail). Deliberately NOT the programme's Sat–Fri week: those do not tile a
  calendar month, so the ends would be part-weeks wearing a week's name, and Week mode already owns that word.
  Fixed date blocks also compare cleanly year over year — the same dates on both sides — and the short tail block
  is labelled with its own day count so a shorter bar is not read as a collapse.
- **Month's product cards ADAPT to how much of the month the feed covers, and say which.** With a complete month
  (the normal case — the day-level tab runs daily from 1 Jun) the card reads as you'd expect: brands, share of the
  fleet's acres, vs the previous month. When the feed covers only part of the month it switches: the share is taken
  against the fleet's acres **on the covered days** (`MP.fleetOnDays`), never the whole month — a partial numerator
  over a whole-month denominator is not a coverage figure but an understatement dressed as one, and on a truncated
  July fetch that was the difference between a true 19% and a false 9%. In that mode the heading names the covered
  days, the trend chart is **clipped to them** rather than drawing flat weeks of zeroes (no-record and
  sprayed-nothing are different claims), and the vs-previous-month column is **dropped, not blanked**, where the
  previous month has no records at all — a column of dashes reads as "no change". This path is not decoration: a
  gviz export CAN come back short (see the open item), and it is what keeps a half-fetched tab from quietly
  understating coverage. Every caveat travels onto the PNG, because a slide is read apart from the page.
- **A brand with a negligible base shows its base, not a percentage.** Month prints each brand against the previous
  month, and a brand going 20 → 5,553 ac yields "+27,663%", which is true and unreadable. Where the previous month
  is under 5% of this month's figure the cell shows `from 20 ac` instead — the same "every row carries a magnitude"
  rule the detector strip follows, and the same reason the detectors have absolute floors.
- **Week mode reports the season gap in BOTH units, always.** The percentage gap can narrow while the acre gap
  widens — it did in the week of 20 Jul (−19.3% → −16.9%, but 30,347 → 32,047 ac) — because the base grew faster
  than the shortfall. A slide saying only "we closed the gap" is the kind of half-true that gets caught in the
  room, so the card shows both and explains the divergence in words.
- **Visual spec for the Insights rows and marks** — these are the data-viz house rules, not decoration, and each
  one is doing a job:
  · **Direction rides a GLYPH as well as a colour** (`toneMark`: ▲ improving / ▼ needs attention / ● watch, in a
    soft-tinted 15px badge). A bare coloured dot is precisely the encoding a red-green reader cannot resolve, and
    these rows turn on that distinction — a lead growing against a gap widening.
  · **Every "n of N" row carries a 4px meter** (`meter`) in the row's own tone, track one step off the surface,
    rounded end, no border. It restates nothing — it gives a sentence a size you can see before you read it.
    A stroke around a mark would add ink that is not data; the fill and the gap do the separating.
  · **The stacked idle bar separates its segments with a 2px SURFACE gap**, not a border, is capped at 24px, has
    rounded outer ends, and prints an in-segment percentage only where the text actually fits (≥8% of the width).
    A clipped "1…" is worse than no label, and the legend below carries every value regardless.
  · **Cards are a hairline plus a 1px shadow**, with an optional 3px left accent (`card(inner, accent)`) where a
    card's state should be legible before it is read — the hero takes green when ahead and red when behind, and
    Yesterday's stat band takes its colour from the share of the fleet that worked. Weight added to a border is
    ink competing with the data; the shadow separates a dozen stacked cards without it.
  · **Text never wears the data colour.** Values and labels stay in the ink tokens; identity comes from the
    coloured mark beside them.
- **Copy rule for the whole Insights page: describe, never instruct.** The page is read by whoever opens it, not
  narrated to a presenter — so "the season so far", not "what to correct over the coming weeks"; "both measures
  moved", not "worth saying both ways in the review". Card headings are noun phrases naming what the card shows.
  Naming the accountable person does **not** break this rule; telling the reader to call them would.
- **Five more copy rules, added in the readability pass — the whole page was rewritten against them.**
  · **One frame per row.** The title states the finding in words; the detail gives the evidence and the owner.
    Neither restates the other in different units. The old rows failed this ("the gap stopped widening last week"
    followed by the same fact as three percentages) and needed two readings each.
  · **Every row carries a magnitude** — acres or machines. "Covering less ground" without a size is unreadable,
    and the reader cannot tell a 200-acre problem from a 20,000-acre one.
  · **No arrows-as-charts.** `−13.2% → −11.8% → −10.4%` is a chart written as text. Say it in a sentence.
  · **No defensive footnotes.** "A season total, not a quiet day" answers an objection nobody has raised yet.
  · **Plain words over house jargon** — "machines worked", not "util %"; "acres each", not "ac/run"; "no driver
    assigned", not "no operator mapped". Every label should read the way the team says it aloud.
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
  match). Herbicide / Insecticide / Fungicide are named and **everything else falls into Other** — soil & seed
  health, unclassified, bio solution, or a product with no portfolio on record. Nothing is dropped from the base,
  which is the point: an earlier build excluded those categories and the card then showed 23,337 ac beside the
  products table's 24,284, two totals disagreeing on one screen with no footnote to explain it (the footnote had
  been removed by request). Both product cards are also restricted to the seven dashboard states, so they now
  report an identical total. Keep it that way — if a category is ever excluded again, the two totals must still
  reconcile or the card has to say why. Each state carries its top three **products AND crops** as labelled sub-lines under the
  name — which also fixes the dead space that a wide label column with short content used to leave before the
  bars. Where a label column can't be filled (the products table), the BAR takes the slack instead:
  `minmax(150px,300px) minmax(0,1fr)` rather than a greedy `fr` on the name.
- **Every Week- and Month-mode card exports to PNG, REDRAWN for a slide** (`buildWeekExport` / `buildMonthExport`
  → `downloadCard`, which dispatches on the `mo-` id prefix). The export
  does NOT serialise the DOM. A slide is not a dashboard: on screen the cards are deliberately quiet — hairline
  rules, small grey labels, columns sized for a filter bar — which washes out on a projector. So each card is
  redrawn as a standalone SVG **from the same aggregates**, with heavier type, stronger contrast, and every
  column measured to its content (`exW`) so there is no dead space between a label and its number. Numbers are
  right-aligned monospace; headers bold and uppercase; slack goes to the label column, never between figures.
  Primitives: `exHeader` / `exStats` / `exTable` / `exLegend` / `exWrap`, canvas `EX.W` wide, rasterised at 2×.
  Charts pass `exp=true` to their builders, which scales type and stroke widths and returns `{inner,vbW,vbH}` —
  and the export container must use the chart's OWN aspect (`cw*vbH/vbW`) or `preserveAspectRatio` letterboxes it.
  Exports recompute their data, so an image can never disagree with the page — and an exported table must carry
  the SAME sub-lines as the screen (`exTable` takes `sub` and `sub2`; the segments export shows Products AND
  Crops per state, not a truncated footnote).
- **Week mode carries TWO product cards, from two different sources.**
  *Products this week* ← `WKP` (gid 1973671649), a **hand-built tab covering ONE named week** (`WKP_WEEK`,
  25–31 Jul 2026). It has no date column — the tab IS the week — so it renders only when the selected week
  matches and otherwise says which week it covers, rather than relabelling those numbers as another week's.
  It is the real product mix: 101 products, ~62% of that week's fleet acres. Replace `WKP_WEEK` and the gid when
  the definitive recurring sheet arrives.
  The week-day-by-day chart is a LINE chart, not paired bars: the week's shape — where it climbed, where it
  broke, where it crossed last season — is what the review discusses, and two bars per day fragments exactly that.
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
- **`insDayAgg` decomposes idleness into four mutually exclusive, observed buckets** that sum exactly to the idle
  count: flagged breakdown → nobody assigned to drive it → never sprayed this season → **no reason on the sheet**.
  First match wins. The last bucket is the interesting one — machines with a driver and a season record that
  simply did not run — and the card states the acres they have already covered, so its size is legible.
- **Yesterday's idle roll-ups are CLUSTER and AREA MANAGER, never territory** — same owner argument as the
  season strip. Rain is looked up on the cluster's dominant *territory*, because the weather feed is keyed by
  district and knows nothing about clusters. The "how the day was spread" card stays on territory on purpose:
  it is about how widely the day reached across the country, and territory is the geography people picture when
  they ask that.
- **The one surviving comparison is the 14-day norm**, and only because it is a different kind of claim: the same
  series against **its own recent past** (snake tab, real daily history), not a cross-sectional guess about how
  one territory ought to behave. Rain is an **annotation only** — never a scoring weight, since a count needs no
  re-weighting to stay true. Clusters rank by machine count, with the idle machines' season acres as magnitude.
- **CAVEAT — the breakdown flag's behaviour CHANGED, so re-measure before writing copy about it.** The earlier
  reading (90 flagged, all 90 also logged acres, none of the idle ones flagged) no longer holds. Re-measured
  2026-08-03 on 1,193 deployed rows: **124 flagged, 83 of them idle, 41 of them worked.** That is much closer to
  a present-state field, and the `broken` bucket is now materially populated (91 at national scope) rather than
  empty. Do not assert either reading without checking the live sheet first.
- **Yesterday runs the detector engine too** (`insDaySignals`), which it previously did not — `insSignals` only
  ever ran in the Season branch, so cascading into an area manager dropped the reader out of the detector layer
  entirely and left ran-yesterday as the only thing on screen. Both modes now call the same scan.
- **Yesterday carries AM and cluster-officer filters; the other two modes cannot.** Sheet1 is the only tab with
  either dimension — the cumulative tab is state-grain and the product tab has no people in it — so Season and
  Week could not honour a selection even in principle. Leaving the mode CLEARS `insAm`/`insCo` rather than
  keeping a filter that is set but has no control and no effect. Both are page-local like `insSt`, the officer
  list cascades off the chosen AM so the pair can never select nothing, and changing the AM drops the officer.
- **Filtering below state WITHDRAWS the two figures that come from other tabs.** The 14-day norm (cumulative) and
  product-attributed acres (product tab) both stop at state, so they are removed from the stat band the moment
  an AM or officer is chosen, with one line saying why. A tile reading "−6% against a normal day" beside one
  manager's counts is read as that manager's number however the sub-label is worded, and there is no norm for
  one manager to read it as. Scaling the state's norm by the manager's share of the season would be exactly the
  counterfactual this page removed once already. The "how the day was spread" card goes too — it asks whether the
  work reached across the country, which means nothing for one person holding two territories, and it would
  otherwise print "100% of the day came from just 3 territories" beside a total of two. Everything that remains
  is a count over the narrowed rows, and therefore exactly as true as it was for the whole country.

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
