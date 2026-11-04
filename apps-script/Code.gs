/**
 * Kru back end — Google Apps Script for Henry's private Kru Sheet.
 *
 * Paste this whole file into the Sheet's Extensions → Apps Script editor.
 * Deploy steps are in apps-script/README.md.
 *
 * The app sends every request as a POST whose body is JSON (sent as plain text):
 *   { action: "bootstrap", key: "…", …other fields }
 * Every reply is JSON: { ok: true, … } or { ok: false, error: "…" }.
 *
 * No student data lives in this file. It only reads and writes the Sheet.
 */

var KRU_SCRIPT_VERSION = 3;

/** Tabs and their header rows. The script finds columns by header name, so you can reorder columns. */
var TABS = {
  Classes: ['Class', 'Archived', 'DefaultTeamSize', 'Order'],
  Rosters: ['Class', 'No', 'Nickname', 'Active'],
  TeamSets: ['SetID', 'Class', 'Name', 'Team', 'No', 'Nickname', 'SavedAt'],
  Results: ['SessionID', 'Date', 'Time', 'Class', 'Game', 'Level', 'Mode', 'Team', 'No', 'Nickname',
    'Points', 'Rank', 'Teammates', 'Notes', 'Deleted', 'EditedAt'],
  Sessions: ['SessionID', 'Date', 'Class', 'Game', 'Level', 'Mode', 'TeamCount', 'TeacherTeamPoints',
    'SubmittedAt', 'Deleted', 'EditedAt'],
};

/** Actions the app can call. More are added in later phases (submitResults, saveTeamSet, …). */
var ACTIONS = {
  ping: actionPing_,
  bootstrap: actionBootstrap_,
};

// ───────────────────────────── Web app entry points ─────────────────────────────

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad-request' });
  }
  try {
    var keyProblem = checkKey_(req.key);
    if (keyProblem) return json_({ ok: false, error: keyProblem });
    var handler = ACTIONS[req.action];
    if (!handler) return json_({ ok: false, error: 'unknown-action', action: String(req.action) });
    return json_(handler(req));
  } catch (err) {
    return json_({ ok: false, error: 'script-error', message: String((err && err.message) || err) });
  }
}

/** Opening the URL in a browser just says the script is running. It never returns data. */
function doGet() {
  return json_({ ok: true, app: 'kru', version: KRU_SCRIPT_VERSION, message: 'Kru back end is running. Use the Kru app to connect.' });
}

// ───────────────────────────── Actions ─────────────────────────────

function actionPing_() {
  return { ok: true, app: 'kru', version: KRU_SCRIPT_VERSION };
}

function actionBootstrap_() {
  var ss = sheet_();
  var result = buildBootstrap_(
    readTable_(ss, 'Classes'),
    readTable_(ss, 'Rosters'),
    readTable_(ss, 'TeamSets')
  );
  result.ok = true;
  result.version = KRU_SCRIPT_VERSION;
  result.sheetUrl = ss.getUrl();
  return result;
}

/**
 * Pure function (no Sheet access) so it can be unit-tested.
 * Each argument is an array of row objects keyed by header name.
 */
function buildBootstrap_(classRows, rosterRows, teamSetRows) {
  var classes = {}; // keyed by classKey_ so "3/2 P" and "3/2p" are the same class as "3/2P"
  var classList = [];

  /** The spelling to show for a class: the first one seen (Classes tab first, then Rosters). */
  function canonical(name) {
    var c = classes[classKey_(name)];
    return c ? c.name : name;
  }

  function addClass(name, row, index) {
    var key = classKey_(name);
    if (classes[key]) return classes[key];
    var order = row && row.Order !== '' && row.Order != null ? Number(row.Order) : 1000 + index;
    var c = {
      name: name,
      archived: row ? bool_(row.Archived, false) : false,
      defaultTeamSize: row ? int_(row.DefaultTeamSize) : null,
      order: isFinite(order) ? order : 1000 + index,
    };
    classes[key] = c;
    classList.push(c);
    return c;
  }

  classRows.forEach(function (row, i) {
    var name = text_(row.Class);
    if (name) addClass(name, row, i);
  });

  var rosters = {};
  rosterRows.forEach(function (row) {
    var cls = text_(row.Class);
    var nick = text_(row.Nickname);
    var no = int_(row.No);
    if (!cls || !nick || no == null) return; // skip blank or half-filled rows
    // A class typed only in Rosters still appears (sorted after the Classes tab ones)
    cls = addClass(cls, null, 2000 + classList.length).name;
    (rosters[cls] = rosters[cls] || []).push({ no: no, nick: nick, active: bool_(row.Active, true) });
  });
  Object.keys(rosters).forEach(function (cls) {
    rosters[cls].sort(function (a, b) { return a.no - b.no; });
  });
  classList.forEach(function (c) { if (!rosters[c.name]) rosters[c.name] = []; });

  var sets = {};
  var setList = [];
  teamSetRows.forEach(function (row) {
    var id = text_(row.SetID);
    if (!id) return;
    var set = sets[id];
    if (!set) {
      set = sets[id] = { id: id, class: canonical(text_(row.Class)), name: text_(row.Name), savedAt: iso_(row.SavedAt), teams: [], _byName: {} };
      setList.push(set);
    }
    var teamName = text_(row.Team) || 'Team';
    var team = set._byName[teamName];
    if (!team) {
      team = set._byName[teamName] = { name: teamName, members: [] };
      set.teams.push(team);
    }
    var no = int_(row.No);
    if (no != null) team.members.push({ no: no, nick: text_(row.Nickname) });
  });
  setList.forEach(function (s) { delete s._byName; });

  return { classes: classList, rosters: rosters, teamSets: setList };
}

// ───────────────────────────── Setup (run by Henry) ─────────────────────────────

/** Adds a "Kru" menu to the Sheet. Runs automatically when the Sheet opens. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Kru')
    .addItem('Set up tabs', 'setup')
    .addItem('Show my key', 'showKey')
    .addItem('Make a new key', 'makeNewKey')
    .addToUi();
}

/**
 * Creates any missing tabs and header columns, and makes a secret key if there isn't one.
 * Safe to run again: it never deletes or moves your data.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  props.setProperty('KRU_SHEET_ID', ss.getId());

  Object.keys(TABS).forEach(function (name) {
    var sh = ensureTab_(ss, name, TABS[name]);
    protectClassColumn_(ss, sh);
  });
  ensureSummaryTab_(ss);
  formatRosters_(ss.getSheetByName('Rosters'));
  removeEmptyDefaultSheet_(ss);

  var key = props.getProperty('KRU_KEY');
  var isNew = !key;
  if (isNew) {
    key = newKey_();
    props.setProperty('KRU_KEY', key);
  }
  tellHenry_('Kru is set up',
    'Tabs are ready.\n\n' + (isNew ? 'Your new secret key is:\n\n' : 'Your secret key is still:\n\n') + key +
    '\n\nNext: Deploy → New deployment → Web app (see README). Type this key into the Kru app.');
}

function showKey() {
  var key = PropertiesService.getScriptProperties().getProperty('KRU_KEY');
  tellHenry_('Kru secret key', key ? key : 'No key yet. Use Kru → Set up tabs first.');
}

/** Use this if the key might have leaked. The app will need the new key on every device. */
function makeNewKey() {
  var key = newKey_();
  PropertiesService.getScriptProperties().setProperty('KRU_KEY', key);
  tellHenry_('New Kru key', 'Your new key is:\n\n' + key + '\n\nThe old key no longer works. Sign in again in the Kru app.');
}

// ───────────────────────────── Helpers ─────────────────────────────

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Returns an error code, or '' if the key is right. */
function checkKey_(given) {
  var real = PropertiesService.getScriptProperties().getProperty('KRU_KEY');
  if (!real) return 'not-set-up';
  if (typeof given !== 'string' || given.length !== real.length) return 'unauthorised';
  var diff = 0;
  for (var i = 0; i < real.length; i++) diff |= real.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0 ? '' : 'unauthorised';
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  var id = PropertiesService.getScriptProperties().getProperty('KRU_SHEET_ID');
  if (!id) throw new Error('Run Kru → Set up tabs in the Sheet first.');
  return SpreadsheetApp.openById(id);
}

/** Reads a tab into an array of objects keyed by the header row. Missing tab = no rows. */
function readTable_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var dates = dateStyle_(ss);
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      // Sheets turns a typed class like "1/2" into a date; turn it back into "1/2"
      obj[headers[c]] = headers[c] === 'Class' ? classText_(values[r][c], dates) : values[r][c];
      if (values[r][c] !== '' && values[r][c] != null) empty = false;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}

function ensureTab_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var existing = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  var isBlank = existing.every(function (h) { return h === ''; });
  if (isBlank) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    // add any missing columns at the end; never reorder Henry's columns
    var missing = headers.filter(function (h) { return existing.indexOf(h) === -1; });
    if (missing.length) sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

/**
 * Class names like "1/2" look like dates to Google Sheets. This sets the Class column to plain
 * text (so new entries stay as typed) and turns any already-converted dates back into "1/2".
 */
function protectClassColumn_(ss, sh) {
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var col = headers.indexOf('Class') + 1;
  if (col < 1) return;
  var rows = Math.max(sh.getMaxRows() - 1, 1);
  var range = sh.getRange(2, col, rows, 1);
  var dates = dateStyle_(ss);
  var values = range.getValues();
  var changed = false;
  var fixed = values.map(function (row) {
    if (row[0] instanceof Date) {
      changed = true;
      return [classText_(row[0], dates)];
    }
    return [row[0]];
  });
  range.setNumberFormat('@');
  if (changed) range.setValues(fixed);
}

/** How this Sheet reads typed dates: month first (US) or day first (Thailand, UK, …). */
function dateStyle_(ss) {
  var locale = String(ss.getSpreadsheetLocale() || '');
  return {
    monthFirst: /^(en_US|es_US|en_PH|fil_PH)/.test(locale),
    timeZone: ss.getSpreadsheetTimeZone(),
  };
}

/** A Class cell as text. If Sheets turned "1/2" into a date, rebuild "1/2" the way it was typed. */
function classText_(v, dates) {
  if (!(v instanceof Date)) return text_(v);
  var day, month;
  if (typeof Utilities !== 'undefined' && dates && dates.timeZone) {
    day = Number(Utilities.formatDate(v, dates.timeZone, 'd'));
    month = Number(Utilities.formatDate(v, dates.timeZone, 'M'));
  } else {
    day = v.getDate();
    month = v.getMonth() + 1;
  }
  return dates && dates.monthFirst ? month + '/' + day : day + '/' + month;
}

function ensureSummaryTab_(ss) {
  if (ss.getSheetByName('Summary')) return;
  var sh = ss.insertSheet('Summary');
  sh.getRange('A1').setValue('Student totals will appear here (added in a later Kru update).');
}

/** Active column = tick boxes; No column = whole numbers. */
function formatRosters_(sh) {
  if (!sh) return;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var activeCol = headers.indexOf('Active') + 1;
  if (activeCol > 0) {
    sh.getRange(2, activeCol, 999, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  }
}

function removeEmptyDefaultSheet_(ss) {
  ['Sheet1', 'ชีต1'].forEach(function (n) {
    var sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
}

/** Shows a message box in the Sheet; falls back to the execution log when run from the editor. */
function tellHenry_(title, message) {
  Logger.log(title + '\n' + message);
  try {
    SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    // no Sheet window (run from the script editor): the message is in View → Logs / Execution log
  }
}

/** A random key like "k7m2p-xq9rt-b4hwz-3nfd8" (no 0/o/1/l to avoid typing mistakes). */
function newKey_() {
  var alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  var hex = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  var out = '';
  for (var i = 0; i < 20; i++) {
    out += alphabet[parseInt(hex.substr(i * 2, 2), 16) % alphabet.length];
    if (i % 5 === 4 && i < 19) out += '-';
  }
  return out;
}

/** Class names match ignoring spaces and capitals: "3/2 P" = "3/2p" = "3/2P". */
function classKey_(name) {
  return text_(name).replace(/\s+/g, '').toUpperCase();
}

function text_(v) {
  return v == null ? '' : String(v).trim();
}

function int_(v) {
  if (v === '' || v == null) return null;
  var n = Number(v);
  return isFinite(n) ? Math.round(n) : null;
}

/** Tick boxes give true/false; typed text like "no" or "FALSE" also works. Blank = fallback. */
function bool_(v, fallback) {
  if (v === true || v === false) return v;
  var s = text_(v).toLowerCase();
  if (s === '') return fallback;
  return !(s === 'false' || s === 'no' || s === 'n' || s === '0');
}

function iso_(v) {
  if (v instanceof Date) return v.toISOString();
  var s = text_(v);
  return s || null;
}
