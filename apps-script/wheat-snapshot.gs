/**
 * MP Ops Console — Wheat snapshot.
 *
 * WHY: the Wheat workbook became so heavy that Google often cannot export it at all (no answer in 150 s, 2026-11-20/21),
 * and every dashboard load asks for a fresh export. This script copies the four tabs the dashboard reads into a
 * separate, values-only SNAPSHOT spreadsheet every 30 minutes. The dashboard reads the snapshot, which exports in
 * seconds, and falls back to the live workbook only if the snapshot is missing.
 *
 * It NEVER writes to the Wheat workbook — it only reads it. If a read fails or looks wrong (too few rows, missing
 * columns), that tab is left as it was, so the dashboard keeps the last good copy and its time.
 *
 * SET UP (once, about 5 minutes, from an account that can open the Wheat workbook):
 *   1. Create a blank Google Sheet, e.g. "Wheat dashboard snapshot".
 *   2. Share → General access → "Anyone with the link" → Viewer.
 *   3. In that sheet: Extensions → Apps Script. Delete what is in Code.gs, paste this whole file, click Save.
 *   4. Pick "snapshotNow" in the function box at the top, click Run. Google asks for permission → Review
 *      permissions → choose your account → Advanced → "Go to … (unsafe)" (it is your own script) → Allow.
 *      The first run takes a minute or two; the tabs appear in the sheet, plus a "_snapshot" tab with the time.
 *   5. Pick "installTimer", click Run. From now on it refreshes itself every 30 minutes (05:00–23:00 IST).
 *   6. Send the sheet's link to wire the dashboard to it.
 *
 * To stop it: run "removeTimer". To see what each run did: the "_snapshot" tab, or Executions (left sidebar).
 *
 * QUOTA: a free Gmail account gets 90 minutes of timer run time a day. A normal run takes ~1 minute, so 36 runs a day
 * fit easily. If the Wheat workbook is stuck, a run can wait up to 6 minutes before Google stops it — the quiet hours
 * and the 30-minute interval leave room for that. Do not set the interval below 30.
 */

var SOURCE_ID = '1Tz3OAhykHa144JAufDRwK_G2_LuG0QXxwOsQqhR9mfc';   // the Wheat workbook (read only)

// The tabs the dashboard reads, by gid (survives a rename). `min` = fewest data rows a sane copy can have;
// anything smaller is treated as a broken read and the previous copy is kept.
var TABS = [
  { gid: 486286189,  name: 'Main sheet',               min: 1000 },
  { gid: 965231799,  name: 'maintenance data',         min: 1000 },
  { gid: 1855112218, name: 'UPL/SWAL product details', min: 500  },
  { gid: 485044081,  name: 'Snake chart raw',          min: 100  }
];

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
        var rows = readTab_(sh, today);
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
