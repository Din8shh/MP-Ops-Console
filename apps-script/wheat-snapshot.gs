/**
 * MP Ops Console — Wheat snapshot.
 *
 * WHY: the Wheat workbook became so heavy that Google often cannot open it at all (2026-11-20/21, and on 24 Nov not
 * even this script could). It is fed by IMPORTRANGE from a SOURCE sheet that the daily Athena cron writes. So since
 * 2026-11-24 this script reads the SOURCE sheet directly — plain values, exports in 1–4 s — and never touches the
 * Wheat workbook. The dashboard reads this snapshot, which exports in seconds.
 *
 * The source carries everything the dashboard needs except four Main sheet columns the Wheat workbook made itself.
 * They are rebuilt here, checked against the workbook's own copy on 2026-11-24:
 *   · Spruce / Feego / FEEGO_EDGE = that machine-day's scanned acres by brand, from the "Product upl/swal" tab
 *     (equal on every machine-day except the last few, where the workbook's copy was the stale one);
 *   · FO onboarded = "Onboarded" if the FO's number is on the "FO details" tab, else "Yet to Onboard"
 *     (345 of 351 machines agree; the other 6 are FOs added to that tab since).
 * The source's Main tab ("a") also holds Bayer's 75 machines; they are dropped, as the Wheat "Main sheet" did
 * (the dashboard reads Bayer from Bayer's own workbook).
 *
 * It NEVER writes to the source. If a read fails or looks wrong (too few rows), that tab is left as it was, so the
 * dashboard keeps the last good copy and its time.
 *
 * SET UP / UPDATE: in the snapshot sheet → Extensions → Apps Script, replace Code.gs with this whole file, Save,
 * run "snapshotNow" once (allow the new permission: it reads a different spreadsheet now), then run "installTimer".
 * To stop it: run "removeTimer". To see what each run did: the "_snapshot" tab, or Executions (left sidebar).
 *
 * QUOTA: a free Gmail account gets 90 minutes of timer run time a day; a run from the source takes well under a minute.
 */

var SOURCE_ID = '1l7mMhlFUj-URefRDWUlDicaponlyLCGAZw3hNyQTPsg';   // the sheet the Athena cron writes (read only)

// Source tab (by gid) → the snapshot tab the dashboard reads (by NAME — the snapshot tabs keep their gids).
// `min` = fewest data rows a sane copy can have; anything smaller is treated as a broken read.
var TABS = [
  { gid: 1847044238, name: 'Main sheet',               min: 1000, build: buildMain_ },
  { gid: 878336756,  name: 'maintenance data',         min: 1000 },
  { gid: 1446139662, name: 'UPL/SWAL product details', min: 500  },
  { gid: 765134246,  name: 'Snake chart raw',          min: 100  }
];
var PRODUCT_GID = 1446139662;   // "Product upl/swal" — the Spruce / Feego / FEEGO_EDGE split
var FO_GID      = 760435424;    // "FO details" — who is onboarded

var EVERY_MIN   = 30;          // timer interval (30 or 60 — see QUOTA above)
var QUIET_FROM  = 23;          // no runs from 23:00 …
var QUIET_TO    = 5;           // … to 05:00 IST
var SHRINK_STOP = 0.6;         // a copy with under 60% of the last good copy's rows is treated as broken
var TZ          = 'Asia/Kolkata';
var META        = '_snapshot';

function snapshotNow() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) { Logger.log('Previous run still going — skipped.'); return; }
  try {
    var dest  = SpreadsheetApp.getActiveSpreadsheet();
    var props = PropertiesService.getScriptProperties();
    var src;
    try { src = SpreadsheetApp.openById(SOURCE_ID); }
    catch (e) { writeMeta_(dest, TABS.map(function (t) { return [t.name, '', '', 'kept old copy — workbook did not open: ' + e.message]; })); throw e; }

    var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    var report = [];
    TABS.forEach(function (t) {
      var t0 = Date.now();
      try {
        var sh = src.getSheets().filter(function (s) { return s.getSheetId() === t.gid; })[0];
        if (!sh) throw new Error('tab not found (gid ' + t.gid + ')');
        var rows = t.build ? t.build(src, sh, today) : readTab_(sh, today);
        var n = rows.length - 1;
        var last = Number(props.getProperty('rows_' + t.gid) || 0);
        if (n < t.min) throw new Error('only ' + n + ' rows (expected at least ' + t.min + ')');
        if (last && n < last * SHRINK_STOP) throw new Error(n + ' rows, last good copy had ' + last);
        writeTab_(dest, t, rows);
        props.setProperty('rows_' + t.gid, String(n));
        report.push([t.name, n, stamp_(), 'ok · ' + Math.round((Date.now() - t0) / 1000) + ' s']);
      } catch (e) {
        report.push([t.name, '', '', 'kept old copy — ' + e.message]);
        Logger.log(t.name + ': ' + e.message);
      }
    });
    writeMeta_(dest, report);
  } finally { lock.releaseLock(); }
}

// Reads a tab as DISPLAYED (exactly what Google's CSV export would give), dropping the rows the dashboard
// throws away anyway: blank machine number, and dates after today. That is what keeps the copy light.
function readTab_(sh, today) {
  var nr = sh.getLastRow(), nc = sh.getLastColumn();
  if (nr < 2 || nc < 1) return [[]];
  var shown = sh.getRange(1, 1, nr, nc).getDisplayValues();
  var head = shown[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var iMc = head.indexOf('machine_number');
  var iDt = head.indexOf('selected_date');
  if (iDt < 0) iDt = head.findIndex(function (h) { return /date/.test(h); });
  var dates = iDt >= 0 ? sh.getRange(1, iDt + 1, nr, 1).getValues() : null;   // real dates, for the today test
  var out = [shown[0]];
  for (var r = 1; r < nr; r++) {
    var row = shown[r];
    if (iMc >= 0 && !String(row[iMc]).trim()) continue;
    if (dates) {
      var d = dates[r][0];
      if (!d) continue;
      if (d instanceof Date && Utilities.formatDate(d, TZ, 'yyyy-MM-dd') > today) continue;
    }
    if (row.join('') === '') continue;
    out.push(row);
  }
  return out;
}

function tabByGid_(ss, gid) {
  var sh = ss.getSheets().filter(function (s) { return s.getSheetId() === gid; })[0];
  if (!sh) throw new Error('tab not found (gid ' + gid + ')');
  return sh;
}

// The Main sheet: the source's "a" tab without Bayer, plus the four columns the Wheat workbook used to make.
function buildMain_(src, sh, today) {
  var rows = readTab_(sh, today);
  var h = rows[0].map(function (x) { return String(x).trim().toLowerCase(); });
  var iMc = h.indexOf('machine_number'), iDt = h.indexOf('selected_date'), iOrg = h.indexOf('organisation'), iFo = h.indexOf('fo_number');
  if (iMc < 0 || iDt < 0 || iOrg < 0 || iFo < 0) throw new Error('Main tab: missing machine_number / selected_date / organisation / fo_number');

  // Scanned acres by brand per machine-day.
  var P = readTab_(tabByGid_(src, PRODUCT_GID), today), hp = P[0].map(function (x) { return String(x).trim().toLowerCase(); });
  var pMc = hp.indexOf('machine_number'), pDt = hp.indexOf('selected_date'), pBr = hp.indexOf('brand'), pAc = hp.indexOf('scanned_acres');
  if (pMc < 0 || pDt < 0 || pBr < 0 || pAc < 0) throw new Error('Product tab: missing machine_number / selected_date / brand / scanned_acres');
  var split = {};
  for (var i = 1; i < P.length; i++) {
    var b = String(P[i][pBr]).trim().toLowerCase().replace(/\s+/g, '_'), ac = Number(String(P[i][pAc]).replace(/,/g, '')) || 0;
    if (!ac || (b !== 'spruce' && b !== 'feego' && b !== 'feego_edge')) continue;
    var k = String(P[i][pMc]).trim() + '|' + String(P[i][pDt]).slice(0, 10);
    var o = split[k] || (split[k] = { spruce: 0, feego: 0, feego_edge: 0 });
    o[b] += ac;
  }

  // FOs on the booking app's list.
  var F = readTab_(tabByGid_(src, FO_GID), today), hf = F[0].map(function (x) { return String(x).trim().toLowerCase(); });
  var fMob = hf.indexOf('primary_mobile_number'); if (fMob < 0) throw new Error('FO details: missing primary_mobile_number');
  var fo = {};
  for (var j = 1; j < F.length; j++) { var m = mob_(F[j][fMob]); if (m) fo[m] = true; }

  var out = [rows[0].concat(['Spruce', 'Feego', 'FEEGO_EDGE', 'FO onboarded'])];
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r], mc = String(row[iMc]).trim();
    if (String(row[iOrg]).trim().toLowerCase() === 'bayer') continue;   // the placeholder machine "0" stays, as on the workbook's copy
    var s = split[mc + '|' + String(row[iDt]).slice(0, 10)] || { spruce: 0, feego: 0, feego_edge: 0 };
    var fm = mob_(row[iFo]);
    out.push(row.concat([num_(s.spruce), num_(s.feego), num_(s.feego_edge), fm ? (fo[fm] ? 'Onboarded' : 'Yet to Onboard') : '']));
  }
  return out;
}
function mob_(v) { var d = String(v || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? d : ''; }
function num_(x) { return String(Math.round(x * 100) / 100); }

// Writes the copy in place (same tab, same gid every time, so the dashboard's link never changes). Cells are set to
// plain text first so Sheets does not re-read "2026-11-20" or "0" as something else. Trailing rows and columns are
// deleted, so the copy never grows empty rows the way the source did.
function writeTab_(dest, t, rows) {
  var sh = dest.getSheets().filter(function (s) { return s.getName() === t.name; })[0] || dest.insertSheet(t.name);
  var nr = rows.length, nc = rows[0].length;
  if (sh.getMaxRows() < nr) sh.insertRowsAfter(sh.getMaxRows(), nr - sh.getMaxRows());
  if (sh.getMaxColumns() < nc) sh.insertColumnsAfter(sh.getMaxColumns(), nc - sh.getMaxColumns());
  var rng = sh.getRange(1, 1, nr, nc);
  rng.setNumberFormat('@').setValues(rows);
  if (sh.getMaxRows() > nr) sh.deleteRows(nr + 1, sh.getMaxRows() - nr);
  if (sh.getMaxColumns() > nc) sh.deleteColumns(nc + 1, sh.getMaxColumns() - nc);
}

// The "_snapshot" tab: one row per tab — rows copied, when, and what happened. The dashboard reads the time from it.
function writeMeta_(dest, report) {
  var sh = dest.getSheetByName(META) || dest.insertSheet(META);
  var old = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getDisplayValues() : [];
  // A tab that failed this run keeps its previous row count and time, with the failure noted.
  var rows = report.map(function (r) {
    if (r[1] !== '') return r;
    var prev = old.filter(function (o) { return o[0] === r[0]; })[0];
    return [r[0], prev ? prev[1] : '', prev ? prev[2] : '', r[3]];
  });
  sh.clear();
  sh.getRange(1, 1, 1, 4).setValues([['tab', 'rows', 'copied_at_ist', 'status']]);
  sh.getRange(2, 1, rows.length, 4).setNumberFormat('@').setValues(rows.map(function (r) { return r.map(String); }));
  sh.getRange(rows.length + 3, 1, 1, 2).setNumberFormat('@').setValues([['last_run_ist', stamp_()]]);
}

function stamp_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'); }

// The timer calls this; it skips the quiet hours.
function timedSnapshot() {
  var h = Number(Utilities.formatDate(new Date(), TZ, 'H'));
  if (QUIET_FROM > QUIET_TO ? (h >= QUIET_FROM || h < QUIET_TO) : (h >= QUIET_FROM && h < QUIET_TO)) return;
  snapshotNow();
}

function installTimer() {
  removeTimer();
  var b = ScriptApp.newTrigger('timedSnapshot').timeBased();   // everyMinutes takes only 1/5/10/15/30
  (EVERY_MIN >= 60 ? b.everyHours(Math.round(EVERY_MIN / 60)) : b.everyMinutes(EVERY_MIN)).create();
  Logger.log('Timer set: every ' + EVERY_MIN + ' minutes, quiet ' + QUIET_FROM + ':00–' + QUIET_TO + ':00 IST.');
}

function removeTimer() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'timedSnapshot') ScriptApp.deleteTrigger(tr);
  });
}
