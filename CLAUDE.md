# MP · AF Machine Deployment — Ops Console

Self-contained static site (no build step, no framework) implementing Phase 2 of the
PRD. Recreated from the Claude Design handoff `MP Ops Console.dc.html` as plain
HTML/CSS/JS + inline-SVG maps. Same deploy shape as `din8shh.github.io/MP-map-view`.

## Files
- `index.html` — the whole app: state machine, the 5 views (Map / Territory tables /
  Machine locations / Weather / Area Managers), global filter bar, KPI strip,
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
KPI view. MP is special: **all** MP sheet rows count as deployed regardless of status, and
MP's plan is a fixed programme constant (`MP_PLAN` = UPL 270 / SWAL 230), not sheet-derived.
Other states derive plan from `ALL_ROWS` (deployed + pending, incl. Open). `planTotals()` +
`planScope()` compute the per-org Plan; the **Plan KPI and the Pending Deployment view are
admin-only**. Global filter dropdowns (territory/AM/CO/BM/TM) scope to the selected state.

Object shape: `{ mc, org, deployed(1/0), territory, cluster, co, coMob, am, amNum, target,
achieved, mtd, acresY, scanned:[{product,acres}], breakdown(1/0), opMapped(1/0), opName,
opNum, lat, lon }`.

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
