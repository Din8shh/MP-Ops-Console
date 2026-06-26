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

## Data
One row = one machine. Live source is a published-CSV Google Sheet (18 columns — see
`CONFIG` in index.html). To go live, set `CONFIG.csvUrl` (Publish-to-web CSV link) or
`CONFIG.sheetId`. Blank → runs on `machines.js` demo data. The parser matches columns
by header **keyword** (tolerant of wording/order), keeps phones as text, parses the
free-text `Scanned acres`, and handles missing location / unparseable tokens / empty
fetch gracefully. Derived client-side: health (Breakdown>Idle>Active), achieved %,
ran-yesterday, operator coverage.

Object shape: `{ mc, org, territory, cluster, co, coMob, am, amNum, target, achieved,
mtd, acresY, scanned:[{product,acres}], breakdown(1/0), opMapped(1/0), opName, opNum,
lat, lon }`.

## Not yet wired
- Rainfall + spray-window weather are still **simulated** per territory (`rainOf`,
  `weather`). Wire to Open-Meteo (per-territory centroid, "yesterday" Asia/Kolkata) later.

## Local preview
Serve the folder over http (ES-module imports need a server, not file://), e.g.
`python3 -m http.server` then open the folder, or use the Launch preview.

## Tokens (locked — match the design)
Brand UPL `#F5821F`/`#D96A12`, SWAL `#1FAE43`/`#159234`. Health Active `#15A24A`,
Idle `#E0A008`, Breakdown `#DC3A2B`. Fonts: Noto Sans (UI) + IBM Plex Mono (numbers/
IDs/phones/coords). Full token list in the handoff README.
