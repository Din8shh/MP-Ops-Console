/**
 * MP Ops Console — "Raise a concern" endpoint.
 *
 * Appends one row to the Concerns tab (gid 1305107614) of the machine workbook.
 * The console is a static site on GitHub Pages, so a published-CSV sheet is read-only
 * to it; this Web App is the only write path.
 *
 * DEPLOY (once, from the workbook itself):
 *   1. Open the workbook → Extensions → Apps Script.
 *   2. Delete the placeholder Code.gs contents, paste this file in, Save.
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as:      Me (your account)
 *        Who has access:  Anyone                 ← must be "Anyone", not "Anyone with Google account"
 *   4. Authorise when prompted (it will warn the app is unverified — it is your own script).
 *   5. Copy the /exec URL and hand it over; it goes into HELP.url in index.html.
 *
 * To verify before wiring anything up, open the /exec URL in a browser: a GET returns
 * {"ok":true,"ping":...} and writes nothing.
 *
 * AFTER ANY EDIT to this file you must Deploy → Manage deployments → edit → New version,
 * or the live URL keeps serving the old code. This is the single most common thing to miss.
 *
 * SECURITY, stated plainly: the /exec URL and TOKEN both ship inside a public repo, so the
 * token stops drive-by discovery and nothing more. The endpoint is append-only into one tab
 * and can neither read nor modify anything else in the workbook, so the worst case is junk
 * rows. Rotate TOKEN here and in index.html together if that ever happens.
 */

var SHEET_GID = 1305107614;                      // the Concerns tab, by gid — survives a rename
var TOKEN     = 'mpops-concerns-7f3ka9';         // must match HELP.token in index.html
var MAX_TEXT  = 1200;                            // characters accepted in Concerns
var MAX_FIELD = 120;                             // characters accepted in every other field
var RATE_MAX  = 20;                              // rows accepted per rolling minute, all users
var RATE_KEY  = 'mpops_concerns_rate';

/** Column order. The first ten are the tab's existing headers, verbatim including the
 *  trailing spaces the sheet actually carries; the last three are added by ensureHeaders(). */
var COLUMNS = [
  ['Territory',            'territory'],
  ['Organisation ',        'org'],
  ['TM name',              'tmName'],
  ['TM contact ',          'tmMob'],
  ['BM Name ',             'bmName'],
  ['BM contact ',          'bmMob'],
  ['Area Manager',         'am'],
  ['Cluster Name',         'cluster'],
  ['Cluster officer name', 'co'],
  ['Concerns ',            'concerns'],
  ['Timestamp',            'ts'],
  ['State',                'state'],
  ['Role',                 'role']
];

function doGet() {
  return json({ ok: true, ping: new Date().toISOString() });
}

function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
    catch (_) { return json({ ok: false, error: 'bad_json' }); }

    if (body.token !== TOKEN)      return json({ ok: false, error: 'bad_token' });
    if (!clean(body.concerns))     return json({ ok: false, error: 'empty_concerns' });
    if (!underRateLimit())         return json({ ok: false, error: 'rate_limited' });

    var row = {
      territory: cap(clean(body.territory), MAX_FIELD),
      org:       cap(clean(body.org),       MAX_FIELD),
      tmName:    cap(clean(body.tmName),    MAX_FIELD),
      tmMob:     cap(clean(body.tmMob),     MAX_FIELD),
      bmName:    cap(clean(body.bmName),    MAX_FIELD),
      bmMob:     cap(clean(body.bmMob),     MAX_FIELD),
      am:        cap(clean(body.am),        MAX_FIELD),
      cluster:   cap(clean(body.cluster),   MAX_FIELD),
      co:        cap(clean(body.co),        MAX_FIELD),
      concerns:  cap(clean(body.concerns),  MAX_TEXT),
      ts:        Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'),
      state:     cap(clean(body.state),     MAX_FIELD),
      role:      cap(clean(body.role),      MAX_FIELD)
    };

    // Serialise appends: two people submitting in the same second must not land on one row.
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json({ ok: false, error: 'busy' });
    try {
      var sh = sheetByGid(SHEET_GID);
      if (!sh) return json({ ok: false, error: 'sheet_missing' });
      ensureHeaders(sh);
      sh.appendRow(COLUMNS.map(function (c) { return safeCell(row[c[1]]); }));
    } finally {
      lock.releaseLock();
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

/** Adds Timestamp / State / Role to the header row the first time this runs. Existing
 *  headers are never rewritten — the ten original ones are left exactly as the sheet has them. */
function ensureHeaders(sh) {
  var width = COLUMNS.length;
  var head = sh.getRange(1, 1, 1, width).getValues()[0];
  var out = head.slice(), dirty = false;
  for (var i = 0; i < width; i++) {
    if (String(out[i] || '').trim() === '') { out[i] = COLUMNS[i][0]; dirty = true; }
  }
  if (dirty) sh.getRange(1, 1, 1, width).setValues([out]);
}

function sheetByGid(gid) {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) return sheets[i];
  }
  return null;
}

/** A cell opening with = + - @ is evaluated as a formula by Sheets, so a pasted concern
 *  could execute. Prefixing an apostrophe forces it to stay text. */
function safeCell(v) {
  var s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Strips control characters — a stray newline in a pasted concern is fine and kept;
 *  NULs and terminal escapes are not. */
function clean(v) {
  return String(v == null ? '' : v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function cap(s, n) { return s.length > n ? s.slice(0, n) : s; }

/** Coarse global throttle. Apps Script cannot see the caller's IP, so this is a blunt
 *  ceiling on total writes per minute rather than a per-user limit — enough to stop a
 *  script filling the tab, loose enough that a real team never touches it. */
function underRateLimit() {
  try {
    var cache = CacheService.getScriptCache();
    var n = Number(cache.get(RATE_KEY) || 0);
    if (n >= RATE_MAX) return false;
    cache.put(RATE_KEY, String(n + 1), 60);
    return true;
  } catch (_) {
    return true;   // cache unavailable: accept rather than block a genuine submission
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
