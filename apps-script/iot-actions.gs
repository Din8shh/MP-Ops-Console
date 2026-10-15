/**
 * MP Ops Console — IoT "Record action" endpoint.
 *
 * Appends one row per technician action to the "IoT actions" tab of the IOT Tampered data workbook
 * (19CSbLqTIB-TivT1rVrilFeQEERcts_LHAGwjpgE__Oo). The console reads that same tab back over CSV, and the
 * latest row per Case ID is the case's status (Open / Closed). Nothing else in the workbook is touched.
 *
 * DEPLOY (once, from the IoT workbook itself — not the machine workbook that holds feedback.gs):
 *   1. Open the IoT workbook → Extensions → Apps Script.
 *   2. Paste this file in as Code.gs, Save.
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as:      Me (your account)
 *        Who has access:  Anyone                 ← must be "Anyone", not "Anyone with Google account"
 *   4. Authorise when prompted (it warns the app is unverified — it is your own script).
 *   5. Copy the /exec URL; it goes into IOT_W.url in index.html.
 * The "IoT actions" tab is created on the first write if it does not exist. A GET on the /exec URL returns
 * {"ok":true,"ping":...} and writes nothing.
 *
 * AFTER ANY EDIT: Deploy → Manage deployments → edit → New version, or the live URL keeps the old code.
 *
 * SECURITY: the URL and TOKEN ship in a public repo, so the token stops drive-by discovery and nothing more.
 * The endpoint is append-only into one tab; the worst case is junk rows. Rotate TOKEN here and in index.html
 * together if that ever happens.
 */

var TAB_NAME  = 'IoT actions';           // read back by the console BY THIS NAME — rename both together
var TOKEN     = 'mpops-iot-4q8zr2';      // must match IOT_W.token in index.html
var MAX_TEXT  = 600;                     // remark
var MAX_FIELD = 160;                     // every other field
var RATE_MAX  = 40;                      // rows per rolling minute, all users
var RATE_KEY  = 'mpops_iot_rate';
var KINDS     = ['Potential tamper', 'At risk'];
var MAX_CASES = 80;                      // cases one save may cover (one machine's open gaps)

var COLUMNS = [
  ['Timestamp', 'ts'],
  ['Case type', 'kind'],
  ['Case ID',   'caseId'],
  ['Machine',   'machine'],
  ['Case date', 'caseDate'],
  ['State',     'state'],
  ['Action',    'action'],
  ['Status',    'status'],
  ['Remark',    'remark'],
  ['By',        'by'],
  ['Role',      'role'],
  ['Action date', 'actionDate']     // the day the work was DONE (yyyy-MM-dd, IST); Timestamp is when it was saved.
];                                  // Appended LAST so a tab created by the first version keeps its column order.

function doGet() {
  return json({ ok: true, ping: new Date().toISOString() });
}

function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
    catch (_) { return json({ ok: false, error: 'bad_json' }); }

    if (body.token !== TOKEN)                      return json({ ok: false, error: 'bad_token' });
    if (KINDS.indexOf(clean(body.kind)) < 0)       return json({ ok: false, error: 'bad_kind' });
    // One save covers every open case of ONE machine, so `cases` is a list of {id, date}; a lone `caseId` is
    // still accepted. One row is written per case, so each case keeps its own status.
    var cases = (Object.prototype.toString.call(body.cases) === '[object Array]' ? body.cases : [{ id: body.caseId, date: body.caseDate }])
      .map(function (c) { return { id: cap(clean(c && c.id), MAX_FIELD), date: cap(clean(c && c.date), MAX_FIELD) }; })
      .filter(function (c) { return c.id; });
    if (!cases.length || !clean(body.action))       return json({ ok: false, error: 'missing_fields' });
    if (cases.length > MAX_CASES)                   return json({ ok: false, error: 'too_many_cases' });
    if (!underRateLimit())                         return json({ ok: false, error: 'rate_limited' });

    var ts = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
    var base = {
      ts:       ts,
      kind:     clean(body.kind),
      machine:  cap(clean(body.machine),  MAX_FIELD),
      state:    cap(clean(body.state),    MAX_FIELD),
      action:   cap(clean(body.action),   MAX_FIELD),
      status:   clean(body.status) === 'Closed' ? 'Closed' : 'Open',
      remark:   cap(clean(body.remark),   MAX_TEXT),
      by:       cap(clean(body.by),       MAX_FIELD),
      role:     cap(clean(body.role),     MAX_FIELD),
      actionDate: validDate(clean(body.actionDate), ts.slice(0, 10))
    };

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json({ ok: false, error: 'busy' });
    try {
      var sh = ensureTab();
      var rows = cases.map(function (k) {
        var row = {}; for (var f in base) row[f] = base[f];
        row.caseId = k.id; row.caseDate = k.date;
        return COLUMNS.map(function (c) { return safeCell(row[c[1]]); });
      });
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, COLUMNS.length).setValues(rows);
    } finally {
      lock.releaseLock();
    }
    return json({ ok: true, ts: ts, rows: cases.length, v: 2 });   // v:2 = this version stores the action date
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

/** Creates the tab with its header row on first use. On a tab made by an earlier version it only fills in
 *  header cells that are BLANK (the new Action date column), never rewriting one that is already there. */
function ensureTab() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB_NAME);
  if (!sh) {
    sh = ss.insertSheet(TAB_NAME);
    sh.setFrozenRows(1);
  }
  var head = sh.getRange(1, 1, 1, COLUMNS.length).getValues()[0], dirty = false;
  for (var i = 0; i < COLUMNS.length; i++) {
    if (String(head[i] || '').trim() === '') { head[i] = COLUMNS[i][0]; dirty = true; }
  }
  if (dirty) {
    sh.getRange(1, 1, 1, COLUMNS.length).setValues([head]).setFontWeight('bold');
    // Case ID and dates must stay TEXT: "2026-10-09 11:46:37" would otherwise become a date and stop matching.
    sh.getRange(1, 1, sh.getMaxRows(), COLUMNS.length).setNumberFormat('@');
  }
  return sh;
}

/** yyyy-MM-dd and not in the future (IST), else the save day. The page already enforces this; the script does not trust it. */
function validDate(d, today) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today ? d : today;
}

/** A cell opening with = + - @ is evaluated as a formula; an apostrophe keeps it text. */
function safeCell(v) {
  var s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function clean(v) { return String(v == null ? '' : v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim(); }
function cap(s, n) { return s.length > n ? s.slice(0, n) : s; }

function underRateLimit() {
  try {
    var cache = CacheService.getScriptCache();
    var n = Number(cache.get(RATE_KEY) || 0);
    if (n >= RATE_MAX) return false;
    cache.put(RATE_KEY, String(n + 1), 60);
    return true;
  } catch (_) { return true; }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
