/* Gossip Circle (a tool, no points): makes groups of 3 for peer checking and remembers who sat together, per class,
   so a new round never repeats a pair until it cannot be avoided. Teacher can join as a virtual player ("T. Henry"):
   never in the roster, never saved to the Sheet. History = Kru.saveKeep (this phone only); today's present / absent = Kru.saveDay.
   The shuffle logic lives in groups.js (KruGroups) so it can be tested. */
(function () {
  'use strict';
  var G = window.KruGroups;
  var $ = function (id) { return document.getElementById(id); };
  var TEACHER = '@T';
  var DEFAULT_TEACHER = 'T. Henry';
  var ROLE = { ask: ['A', 'asks'], report: ['R', 'reports'], check: ['C', 'checks'], observe: ['O', 'observes'] };

  var students = [];  // { key, no, nick }
  var cls = '';
  var K;              // kept for this class: { v, rounds: [{ groups: [[key]], at }], names: { key: nick }, set: { teacher, tname, size, qn } }
  var day;            // { absent: [key] }
  var S;              // resumable screen state: { v, phase: setup | preview | round, tForce, preview, round }
  var sel = null;     // preview: the player tapped first { g, i }
  var estimateFor = 0;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function saveKeep() { Kru.saveKeep(K); }
  function saveDay() { Kru.saveDay(day); }
  function save() { Kru.saveState(S); }
  function name(k) { return k === TEACHER ? (K.set.tname || DEFAULT_TEACHER) : (K.names[k] || k); }
  function isAbsent(k) { return day.absent.indexOf(k) >= 0; }
  function presentKeys() { return students.filter(function (s) { return !isAbsent(s.key); }).map(function (s) { return s.key; }); }
  function tOn(n) { return G.teacherJoins(K.set.teacher, n, K.set.size, S.tForce); }
  function counts() { return G.pairCounts(K.rounds); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  // ---------- group cards ----------
  /** Picks the number of columns and the biggest text size that fits every card (never below 14 px; the stage scrolls then). */
  function fit(stage, groups, line, badge) {
    var W = stage.clientWidth - 12, H = stage.clientHeight - 12, n = groups.length, gap = 6;
    if (!n || W <= 0 || H <= 0) return;
    var maxSz = 1, maxCh = 4;
    groups.forEach(function (g) { maxSz = Math.max(maxSz, g.length); g.forEach(function (k) { maxCh = Math.max(maxCh, Math.min(14, name(k).length + (k === TEACHER ? 1 : 0))); }); });
    var best = { f: 0, c: 1 };
    for (var c = 1; c <= Math.min(n, 8); c++) {
      var rows = Math.ceil(n / c), cw = (W - gap * (c - 1)) / c, ch = (H - gap * (rows - 1)) / rows;
      var fh = (ch - 14) / (maxSz * line), fw = (cw - 22) / ((badge ? 1.35 : 0) + 0.56 * maxCh + 0.4);
      var f = Math.min(fh, fw, 30);
      if (f > best.f) best = { f: f, c: c };
    }
    stage.style.gridTemplateColumns = 'repeat(' + best.c + ', minmax(0, 1fr))';
    stage.style.fontSize = Math.max(14, Math.floor(best.f)) + 'px';
  }

  function cardsHtml(groups, o) {
    var cnt = o.counts || {};
    return groups.map(function (g, gi) {
      var bad = o.preview && G.repeats([g], cnt) > 0;
      var lis = g.map(function (k, i) {
        var cls2 = (k === TEACHER ? 't' : '') + (o.preview && sel && sel.g === gi && sel.i === i ? ' sel' : '') + (o.q ? ' ' + G.role(i, o.q) : '');
        var badge = '';
        if (o.q) { var r = G.role(i, o.q); badge = '<span class="rb ' + r + '" title="' + ROLE[r][1] + '">' + ROLE[r][0] + '</span>'; }
        var inner = badge + '<span class="nm">' + esc(name(k)) + '</span>';
        return '<li class="' + cls2 + '">' + (o.preview ? '<button type="button" data-g="' + gi + '" data-i="' + i + '">' + inner + '</button>' : inner) + '</li>';
      }).join('');
      return '<div class="card' + (bad ? ' bad' : '') + '"><span class="gn">' + (gi + 1) + '</span><ol>' + lis + '</ol></div>';
    }).join('');
  }

  // ---------- screens ----------
  function render() {
    $('left').classList.remove('qbar');
    $('timerBtn').hidden = S.phase !== 'round';
    document.querySelector('.logo').hidden = S.phase === 'round';
    $('endRound').hidden = S.phase !== 'round';
    if (S.phase === 'round' && S.round) renderRound();
    else if (S.phase === 'preview' && S.preview) renderPreview();
    else { S.phase = 'setup'; renderSetup(); }
  }

  function renderSetup() {
    var keys = presentKeys(), n = keys.length, tj = tOn(n), total = n + (tj ? 1 : 0);
    var sz = G.sizes(total, K.set.size);
    var next = K.rounds.length + 1;
    $('left').textContent = cls ? cls : '';
    var chips = students.map(function (s) {
      var off = isAbsent(s.key);
      return '<button type="button" class="chip' + (off ? ' off' : '') + '" data-k="' + esc(s.key) + '" aria-pressed="' + (!off) + '"><span class="no">' + esc(s.no) + '</span><span class="nm">' + esc(s.nick) + '</span></button>';
    }).join('');
    var mode = K.set.teacher;
    var why = mode === 'auto' ? (tj ? 'joins: it makes every group exactly ' + K.set.size : 'stays out: no gap to fill') : mode === 'always' ? 'joins every round' : 'never joins';
    var odd = sz.filter(function (x) { return x !== K.set.size; }).length;
    $('body').className = 'body';
    $('body').innerHTML =
      '<div class="roster" id="roster" aria-label="Who is here today">' + chips + '</div>' +
      '<div class="side">' +
      '<div class="sum">' + n + ' of ' + students.length + ' here' + (tj ? ' + ' + esc(name(TEACHER)) : '') +
      '<small>' + (total >= 3 ? plural(sz.length, 'group') + (odd ? ' (' + (odd === 1 ? 'one has' : odd + ' have') + ' 4)' : ' of ' + K.set.size) : 'need 3 or more') + ' · round ' + next + ' next</small></div>' +
      '<div class="lab">Teacher plays</div>' +
      '<div class="seg" id="tseg">' + ['auto', 'always', 'never'].map(function (m) { return '<button type="button" data-t="' + m + '" class="' + (mode === m ? 'on' : '') + '">' + m.charAt(0).toUpperCase() + m.slice(1) + '</button>'; }).join('') + '</div>' +
      '<div class="hint">' + esc(name(TEACHER)) + ' ' + why + '</div>' +
      '<button type="button" class="btn gold" id="shuf"' + (total < 3 ? ' disabled' : '') + '>Shuffle</button>' +
      '<button type="button" class="btn ghost danger" id="reset"' + (K.rounds.length ? '' : ' disabled') + '>Reset history</button>' +
      '</div>';
  }

  function previewInfo() {
    var p = S.preview;
    return { rep: G.repeats(p.groups, counts()), n: p.groups.reduce(function (a, g) { return a + g.length; }, 0) };
  }

  function estText(p) { return p.est != null && !previewInfo().rep ? '~' + p.est + ' fresh rounds<br>left (estimate)' : ''; }

  function renderPreview() {
    var p = S.preview, info = previewInfo(), rep = info.rep, tj = p.groups.some(function (g) { return g.indexOf(TEACHER) >= 0; });
    $('left').textContent = 'Round ' + (K.rounds.length + 1) + ' · tap two names to swap';
    var warn = '';
    if (rep && !p.accepted) {
      warn = '<div class="warn">⚠ ' + plural(rep, 'pair') + (rep === 1 ? ' has' : ' have') + ' met before' +
        '<button type="button" class="btn ghost" id="again">Shuffle again</button><button type="button" class="btn ghost" id="accept">Accept anyway</button><button type="button" class="btn ghost danger" id="reset">Reset history</button></div>';
    } else if (rep) {
      warn = '<div class="warn">Accepted: ' + plural(rep, 'pair') + (rep === 1 ? ' has' : ' have') + ' met before (shown in red)</div>';
    }
    $('body').className = 'body col';
    $('body').innerHTML = warn + '<div class="stage pv" id="stage">' + cardsHtml(p.groups, { preview: true, counts: counts() }) + '</div>' +
      '<div class="under"><button type="button" class="btn ghost" id="backSetup">◀ Setup</button>' +
      '<button type="button" class="btn" id="again2">Shuffle again</button>' +
      '<button type="button" class="btn ghost" id="tj">' + esc(name(TEACHER)) + ' joins: ' + (tj ? 'Yes' : 'No') + '</button>' +
      '<span class="hint est" id="est">' + estText(p) + '</span>' +
      '<button type="button" class="btn gold" id="start"' + (rep && !p.accepted ? ' disabled' : '') + '>Start round ▶</button></div>';
    fit($('stage'), p.groups, 1.45, false);
  }

  function renderRound() {
    var r = S.round, last = r.q >= r.qn;
    $('body').className = 'body col';
    var bar = '<b class="rn">Round ' + r.num + '</b><div class="qnav"><button type="button" class="small" id="qPrev"' + (r.q <= 1 ? ' disabled' : '') + ' aria-label="Previous question">◀</button>' +
      '<b>Question ' + r.q + ' of ' + r.qn + '</b>' +
      (last ? '<button type="button" class="btn gold" id="qDone">Finish ✓</button>' : '<button type="button" class="small" id="qNext" aria-label="Next question">▶</button>') + '</div>';
    var legend = '<div class="legend">' + ['ask', 'report', 'check', 'observe'].map(function (x) { return '<span><span class="rb ' + x + '">' + ROLE[x][0] + '</span>' + ROLE[x][1] + '</span>'; }).join('') + '</div>';
    $('left').classList.add('qbar');
    $('left').innerHTML = bar;
    $('body').innerHTML = '<div class="stage" id="stage">' + cardsHtml(r.groups, { q: r.q }) + '</div>' + legend;
    fit($('stage'), r.groups, 1.3, true);
  }

  // ---------- actions ----------
  function doShuffle() {
    var keys = presentKeys(), tj = tOn(keys.length);
    var players = tj ? keys.concat(TEACHER) : keys;
    if (players.length < 3) return;
    var res = G.shuffle(players, K.set.size, counts());
    S.preview = { groups: res.groups, accepted: false, est: null };
    S.phase = 'preview'; sel = null;
    save(); render();
    var token = ++estimateFor, all = players, base = counts(), grp = res.groups;
    if (res.repeats) return;
    setTimeout(function () { // the estimate takes a moment: show the groups first
      if (token !== estimateFor || !S.preview) return;
      var add = G.pairCounts([grp]), c = {}, k;
      for (k in base) c[k] = base[k];
      for (k in add) c[k] = (c[k] || 0) + add[k];
      S.preview.est = G.estimate(all, K.set.size, c);
      if (S.phase === 'preview' && token === estimateFor) { save(); $('est').innerHTML = estText(S.preview); }
    }, 60);
  }

  function swapAt(a, b) {
    var g = S.preview.groups, x = g[a.g][a.i];
    g[a.g][a.i] = g[b.g][b.i]; g[b.g][b.i] = x;
    S.preview.accepted = false; S.preview.est = null; estimateFor++;
  }

  function startRound() {
    var groups = S.preview.groups.map(function (g) { return g.slice(); });
    K.rounds.push({ groups: groups, at: Date.now() });
    students.forEach(function (s) { K.names[s.key] = s.nick; });
    S.round = { groups: groups, num: K.rounds.length, q: 1, qn: K.set.qn };
    S.phase = 'round'; S.preview = null; S.tForce = null; sel = null;
    saveKeep(); save(); render();
  }

  function endRound() {
    S.phase = 'setup'; S.round = null; S.preview = null; sel = null;
    save(); render();
  }

  function askReset() {
    $('confirmText').textContent = 'Clear the group history for ' + (cls || 'this class') + '? ' + plural(K.rounds.length, 'round') + ' will be forgotten. Other classes are not touched.';
    $('confirmBack').hidden = false;
  }
  function doReset() {
    K.rounds = []; saveKeep();
    $('confirmBack').hidden = true;
    if (S.phase === 'preview') doShuffle(); else render();
  }

  // ---------- events ----------
  function onClick(e) {
    var t = e.target;
    var chip = t.closest('.chip');
    if (chip) {
      var k = chip.dataset.k, i = day.absent.indexOf(k);
      if (i >= 0) day.absent.splice(i, 1); else day.absent.push(k);
      saveDay(); var top = $('roster').scrollTop; render(); $('roster').scrollTop = top; return;
    }
    var seg = t.closest('[data-t]');
    if (seg) { K.set.teacher = seg.dataset.t; saveKeep(); render(); return; }
    if (t.closest('#shuf') || t.closest('#again') || t.closest('#again2')) { doShuffle(); return; }
    if (t.closest('#reset')) { askReset(); return; }
    if (t.closest('#accept')) { S.preview.accepted = true; save(); render(); return; }
    if (t.closest('#backSetup')) { S.phase = 'setup'; S.preview = null; sel = null; estimateFor++; save(); render(); return; }
    if (t.closest('#tj')) {
      var on = S.preview.groups.some(function (g) { return g.indexOf(TEACHER) >= 0; });
      S.tForce = !on; doShuffle(); return;
    }
    if (t.closest('#start')) { startRound(); return; }
    var nm = t.closest('[data-g]');
    if (nm && S.phase === 'preview') {
      var pos = { g: +nm.dataset.g, i: +nm.dataset.i };
      if (!sel) sel = pos;
      else if (sel.g === pos.g && sel.i === pos.i) sel = null;
      else { swapAt(sel, pos); sel = null; save(); }
      render(); return;
    }
    if (t.closest('#qPrev') && S.round.q > 1) { S.round.q--; save(); render(); return; }
    if (t.closest('#qNext') && S.round.q < S.round.qn) { S.round.q++; save(); render(); return; }
    if (t.closest('#qDone')) { endRound(); return; }
  }
  $('body').addEventListener('click', onClick);
  $('left').addEventListener('click', onClick);
  window.addEventListener('resize', function () { if (S && S.phase !== 'setup') render(); });

  // settings
  function openMenu() {
    $('tname').value = K.set.tname || DEFAULT_TEACHER;
    KruMenu.stepper($('sizeStep'), K.set.size, function (v) { K.set.size = v; saveKeep(); }, { min: 3, max: 5, label: 'students in a group' });
    KruMenu.stepper($('qStep'), K.set.qn, function (v) { K.set.qn = v; saveKeep(); if (S.round) { S.round.qn = v; if (S.round.q > v) S.round.q = v; save(); } }, { min: 3, max: 30, label: 'questions' });
    $('menuBack').hidden = false;
  }
  function closeMenu() { $('menuBack').hidden = true; render(); }
  $('more').addEventListener('click', openMenu);
  $('menuClose').addEventListener('click', closeMenu);
  $('tname').addEventListener('input', function () { K.set.tname = $('tname').value.trim() || DEFAULT_TEACHER; saveKeep(); });
  $('endRound').addEventListener('click', function () { $('menuBack').hidden = true; endRound(); });
  $('confirmNo').addEventListener('click', function () { $('confirmBack').hidden = true; });
  $('confirmYes').addEventListener('click', doReset);

  // ---------- timer (same presets as Talk Timer) ----------
  var presets = [{ name: '30 s', phases: [{ label: 'Go!', secs: 30 }] }, { name: '1 min', phases: [{ label: 'Go!', secs: 60 }] }, { name: '2 min', phases: [{ label: 'Go!', secs: 120 }] }];
  var tm = { preset: null, phase: 0, endAt: 0, left: 0, running: false, timer: null };
  var audio = null;
  function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function chime() {
    if (!audio) return;
    [660, 880, 1100].forEach(function (f, i) {
      try {
        var t = audio.currentTime + i * 0.16, o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + 0.55);
      } catch (e) {}
    });
  }
  function mmss(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function paintTimer() {
    var left = tm.running ? (tm.endAt - Date.now()) / 1000 : tm.left;
    $('tmrBig').textContent = mmss(left);
    $('tmrBig').classList.toggle('zero', !!tm.preset && left <= 0);
    var ph = tm.preset && tm.preset.phases[tm.phase];
    $('tmrName').textContent = tm.preset ? tm.preset.name + (ph && ph.label ? ' · ' + ph.label : '') : 'Pick a timer';
    $('timerBtn').textContent = tm.preset && (tm.running || tm.left > 0) ? '⏱ ' + mmss(left) : '⏱ Timer';
    $('tmrPause').disabled = !tm.preset || (!tm.running && tm.left <= 0);
    $('tmrPause').textContent = tm.running ? 'Pause' : 'Resume';
  }
  function tick() {
    if (!tm.running) return;
    if (tm.endAt - Date.now() <= 0) {
      chime();
      if (tm.preset && tm.phase < tm.preset.phases.length - 1) { tm.phase++; tm.endAt = Date.now() + tm.preset.phases[tm.phase].secs * 1000; }
      else { tm.running = false; tm.left = 0; clearInterval(tm.timer); }
    }
    paintTimer();
  }
  function runPreset(p) {
    unlock();
    tm.preset = p; tm.phase = 0; tm.running = true; tm.endAt = Date.now() + p.phases[0].secs * 1000;
    clearInterval(tm.timer); tm.timer = setInterval(tick, 250);
    paintTimer();
  }
  function paintPresets() {
    $('tmrPresets').innerHTML = presets.map(function (p, i) { return '<button type="button" data-p="' + i + '">' + esc(p.name) + '</button>'; }).join('');
  }
  $('tmrPresets').addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (b) runPreset(presets[+b.dataset.p]); });
  $('tmrPause').addEventListener('click', function () {
    unlock();
    if (tm.running) { tm.left = (tm.endAt - Date.now()) / 1000; tm.running = false; }
    else if (tm.left > 0) { tm.endAt = Date.now() + tm.left * 1000; tm.running = true; }
    paintTimer();
  });
  $('timerBtn').addEventListener('click', function () { paintPresets(); paintTimer(); $('timerBack').hidden = false; });
  $('tmrClose').addEventListener('click', function () { $('timerBack').hidden = true; });
  function loadPresets() {
    fetch('/games/talk-timer/content.json').then(function (r) { return r.json(); }).then(function (d) {
      (d.presets || []).forEach(function (p) {
        if (p && p.name && Array.isArray(p.phases) && p.phases.length && p.phases.every(function (x) { return x.secs > 0; })) presets.push({ name: p.name, phases: p.phases });
      });
    }).catch(function () {});
  }

  Kru.onFinishRequest(function () { Kru.finish([]); }); // a tool: nothing to save

  // ---------- start ----------
  Kru.ready(function (session) {
    cls = session.class || '';
    var seen = {};
    students = (session.teams || []).filter(function (t) { return t.members && t.members[0]; }).map(function (t) {
      var m = t.members[0], key = m.no + ':' + m.nick;
      if (seen[key]) key += '#' + t.id;
      seen[key] = 1;
      return { key: key, tid: t.id, no: m.no, nick: m.nick };
    }).sort(function (a, b) { return (a.no - b.no) || String(a.nick).localeCompare(String(b.nick)); });

    var kp = session.keep;
    K = kp && kp.v === 1 && Array.isArray(kp.rounds) ? kp : { v: 1, rounds: [], names: {}, set: {} };
    K.names = K.names || {};
    K.set = Object.assign({ teacher: 'auto', tname: DEFAULT_TEACHER, size: 3, qn: 15 }, K.set || {});
    students.forEach(function (s) { K.names[s.key] = s.nick; });

    var d = session.day;
    if (d && Array.isArray(d.absent)) day = { absent: d.absent.filter(function (k) { return students.some(function (s) { return s.key === k; }); }) };
    else {
      var ids = session.absentIds || [];
      day = { absent: students.filter(function (s) { return ids.indexOf(s.tid) >= 0; }).map(function (s) { return s.key; }) };
    }

    var rs = session.resume;
    S = rs && rs.v === 1 ? rs : { v: 1, phase: 'setup', tForce: null, preview: null, round: null };
    if ((S.phase === 'preview' && !S.preview) || (S.phase === 'round' && !S.round)) S.phase = 'setup';
    render();
    loadPresets();
  });
})();
