/* Secret Message (Henry, Nov 25): a whisper-down-the-line speaking game for TWO teams about reported speech.
   Round: new random lines (nobody is first or last twice in a row, and everybody goes before anyone repeats) -> the teacher
   is told to UN-MIRROR the phone -> the secret sentence shows on the phone only for the first student of each line ->
   "mirror again" -> the teams whisper it down the line (timer) -> the LAST student of each line says it the other way
   (direct becomes reported, reported becomes direct) -> the teacher reveals the model answer and taps right / wrong
   for each team (+1). The phone is the only screen with the secret; the mirrored screen only ever shows the lines. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#9B7BFF'];
  var KIND = { ds: 'Direct statement', dq: 'Direct question', rs: 'Reported statement', rq: 'Reported question', tt: 'Tongue twister', hw: 'Hard to say' };
  var TO = { ds: 'REPORTED speech', dq: 'REPORTED speech', rs: 'DIRECT speech (the exact words)', rq: 'DIRECT speech (the exact words)', tt: 'EXACTLY the same', hw: 'EXACTLY the same' };
  var SETS = [['reported', 'Reported speech'], ['twisters', 'Twisters'], ['both', 'Both']];
  var CONTENT = null; // the level's content: phrases + twisters
  var PT = 1;

  var PHRASES = [], S = null, INTRO = [], teams = [], players = [];
  var phase = 'order', running = false, left = 0, endAt = 0, timer = 0, peekLeft = 0, peekTimer = 0, audio = null, revealed = false;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function save() { S.phase = phase; Kru.saveState(S); }
  function shuffle(a) { a = a.slice(); for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; } return a; }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function pts(id) { return S.pts[id] || 0; }
  function color(id) { var i = players.map(function (t) { return t.id; }).indexOf(id); return COLORS[(i < 0 ? 0 : i) % COLORS.length]; }

  /** The phrases for a set: reported speech, tongue twisters / hard words (said exactly the same), or both. */
  function poolFor(set) {
    var rep = CONTENT.phrases || [], tw = CONTENT.twisters || [];
    return set === 'twisters' ? tw : set === 'both' ? rep.concat(tw) : rep;
  }

  // ---------- sound (after a tap) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function tone(freqs, gap, dur, vol) {
    if (!audio) return;
    try {
      freqs.forEach(function (f, i) {
        var t = audio.currentTime + i * (gap || 0.12), o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.2));
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.2) + 0.05);
      });
    } catch (e) {}
  }

  // ---------- the lines: who is first and last ----------
  function mid(m) { return String(m.id != null ? m.id : m.no); }
  /** One line for one team: the next students in a rotating queue (everybody goes before anyone repeats), shuffled so the
   *  first (Messenger) and the last (Reporter) are never the same people as in the round before. */
  function lineFor(t) {
    var members = t.members || [];
    if (!members.length) return ['?'];
    var all = members.map(mid), n = Math.max(2, Math.min(S.chain || 15, all.length)); // default 15 = the whole team plays
    var q = (S.q[t.id] || []).filter(function (id) { return all.indexOf(id) >= 0; });
    while (q.length < n) q = q.concat(shuffle(all.filter(function (id) { return q.indexOf(id) < 0; })));
    var take = q.slice(0, n);
    S.q[t.id] = q.slice(n);
    var prev = S.prev[t.id] || [];
    var line = shuffle(take), tries = 0;
    while (n >= 3 && tries++ < 40 && (line[0] === prev[0] || line[n - 1] === prev[1])) line = shuffle(take);
    S.prev[t.id] = [line[0], line[n - 1]];
    return line;
  }
  function nameOf(t, id) {
    var m = (t.members || []).filter(function (x) { return mid(x) === id; })[0];
    if (m) return m.nick;
    return 'Next student';
  }
  function newRound(first) {
    stopTimer(); stopPeek();
    if (!first) S.round++;
    if (S.pos >= S.order.length) { S.order = shuffle(range(PHRASES.length)); S.pos = 0; }
    S.cur = S.order[S.pos++];
    S.lines = {}; players.forEach(function (t) { S.lines[t.id] = lineFor(t); });
    S.mark = {}; revealed = false;
    phase = 'order'; save(); render();
  }

  // ---------- timers ----------
  function stopTimer() { running = false; clearInterval(timer); }
  function startTimer() { left = S.secs; endAt = Date.now() + left * 1000; running = true; clearInterval(timer); timer = setInterval(tick, 100); }
  function tick() {
    if (!running) return;
    var was = Math.ceil(left);
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) { left = 0; stopTimer(); tone([880, 660, 880], 0.15, 0.25, 0.4); toJudge(); return; }
    if (left <= 5 && Math.ceil(left) !== was) tone([880], 0, 0.08, 0.2);
    paintClock();
  }
  function paintClock() {
    var el = $('secs');
    el.textContent = phase === 'play' ? fmt(left) : phase === 'secret' ? String(Math.max(0, Math.ceil(peekLeft))) : '';
    el.className = 'secs ' + (phase === 'secret' ? 'peek' : phase === 'play' ? (left <= 10 ? 'hot' : 'play') : '');
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function stopPeek() { clearInterval(peekTimer); }
  function startPeek() {
    peekLeft = S.peek; clearInterval(peekTimer);
    var end = Date.now() + peekLeft * 1000;
    peekTimer = setInterval(function () {
      peekLeft = (end - Date.now()) / 1000;
      if (peekLeft <= 0) { stopPeek(); hideSecret(); return; }
      paintClock();
    }, 200);
  }

  // ---------- phases ----------
  function toWarn() { phase = 'warn1'; save(); render(); }
  function showSecret() { unlockAudio(); phase = 'secret'; save(); startPeek(); render(); tone([523, 659], 0.1, 0.2, 0.3); }
  function hideSecret() { stopPeek(); phase = 'warn2'; save(); render(); }
  function toPlay() { unlockAudio(); phase = 'play'; save(); startTimer(); render(); tone([440, 660], 0.1, 0.2, 0.3); }
  function toJudge() { stopTimer(); phase = 'judge'; revealed = false; save(); render(); }

  // ---------- points ----------
  function give(id, d, why) { if (!d) return; S.pts[id] = pts(id) + d; Kru.score(id, d, why); }
  function mark(id, ok) {
    var was = S.mark[id];
    if (was === ok) return;
    if (was === 1) give(id, -PT, 'undo');
    if (ok === 1) { give(id, PT, 'correct conversion'); tone([523, 659, 784], 0.1, 0.22, 0.35); }
    else if (ok === 0) tone([300, 240], 0.12, 0.25, 0.3);
    S.mark[id] = ok; save(); render();
  }
  function undoLast() {
    var ids = players.filter(function (t) { return S.mark[t.id] === 1; });
    if (!ids.length) return false;
    mark(ids[ids.length - 1].id, undefined); return true;
  }

  // ---------- drawing ----------
  function lineHtml(t) {
    var line = S.lines[t.id] || [];
    var rows = line.map(function (id, i) {
      var tag = i === 0 && line.length > 1 ? '<em class="role" aria-label="sees the secret">👀</em>' : i === line.length - 1 ? '<em class="role" aria-label="says it">🎤</em>' : '';
      var cls = i === 0 ? ' first' : i === line.length - 1 ? ' last' : '';
      return '<li class="' + cls.trim() + '"><span class="no">' + (i + 1) + '</span><span class="nm">' + esc(nameOf(t, id)) + '</span>' + tag + '</li>';
    }).join('');
    return '<div class="line" style="--c:' + color(t.id) + '"><div class="lh">' + Kru.badge(t, color(t.id)) + '<span>' + esc(t.name) + '</span></div><ol>' + rows + '</ol></div>';
  }
  function linesHtml() { return '<div class="lines">' + players.map(lineHtml).join('') + '</div>'; }
  function reporterNames() {
    return players.map(function (t) { var l = S.lines[t.id] || []; return esc(nameOf(t, l[l.length - 1])); });
  }

  function render() {
    var p = PHRASES[S.cur] || { k: 'ds', say: '', answer: '' };
    var stage = $('stage'), html = '', go = '', alt = '', label = '';
    $('count').textContent = 'Round ' + S.round;
    switch (phase) {
      case 'order':
        html = linesHtml(); go = 'Get the secret ▶';
        break;
      case 'warn1':
        html = '<div class="cover warn"><div class="big">🕵️ TOP SECRET MISSION!</div>' +
          '<p>Agent Teacher, the TV must NOT see this! Un-mirror your phone now:</p>' +
          '<p class="how">Control Center → <b>Screen Mirroring</b> → <b>Stop Mirroring</b></p></div>';
        go = '🔒 TV is dark ▶'; alt = '◀ Back';
        break;
      case 'secret':
        html = '<div class="secret"><div class="kind">' + esc(KIND[p.k]) + ' → ' + (p.answer === p.say ? 'say it ' + esc(TO[p.k]) : 'say it as ' + esc(TO[p.k])) + '</div>' +
          '<div class="phrase" id="phrase">' + esc(p.say) + '</div>' +
          '<div class="who">Show ONLY the first student of each team: <b>' + players.map(function (t) { return esc(nameOf(t, (S.lines[t.id] || [])[0])); }).join(' and ') + '</b></div></div>';
        go = 'Hide it ▶';
        break;
      case 'warn2':
        html = '<div class="cover go"><div class="big">🚀 MISSION LAUNCHED!</div>' +
          '<p>The secret is safe. You may mirror your phone again!</p>' +
          '<p class="how">Control Center → <b>Screen Mirroring</b> → your TV</p></div>';
        go = 'Start whispering ▶'; alt = '👀 Show again';
        break;
      case 'play':
        html = linesHtml(); go = running ? 'Reporters are ready ▶' : 'Resume'; alt = running ? 'Pause' : '';
        break;
      case 'judge':
        if (!revealed) {
          html = '<div class="cover judge"><div class="big">🎤 Reporters, speak!</div><p>' + (p.answer === p.say ? 'The last student of each line says the secret EXACTLY the same.' : 'The last student of each line says the secret the other way.') + '</p>' +
            '<div class="reporters">' + players.map(function (t, i) { return '<span style="--c:' + color(t.id) + '">' + Kru.badge(t, color(t.id)) + ' <b>' + reporterNames()[i] + '</b></span>'; }).join('') + '</div></div>';
          go = 'Reveal the answer ▶';
        } else {
          html = '<div class="answer"><div class="kind">' + esc(KIND[p.k]) + ' → ' + esc(TO[p.k]) + '</div>' +
            (p.answer === p.say ? '' : '<div class="phrase small">Secret: ' + esc(p.say) + '</div>') +
            '<div class="phrase ans">' + esc(p.answer) + '</div>' +
            '<div class="marks">' + players.map(function (t) {
              var m = S.mark[t.id];
              return '<div class="mk" style="--c:' + color(t.id) + '">' + Kru.badge(t, color(t.id)) +
                '<button class="btn ok" data-m="' + esc(t.id) + '" data-v="1" aria-pressed="' + (m === 1) + '" aria-label="' + esc(t.name) + ' right">✓ +' + PT + '</button>' +
                '<button class="btn no" data-m="' + esc(t.id) + '" data-v="0" aria-pressed="' + (m === 0) + '" aria-label="' + esc(t.name) + ' wrong">✗</button></div>';
            }).join('') + '</div></div>';
          go = 'Next round ▶';
        }
        break;
    }
    stage.innerHTML = html;
    $('phase').textContent = label;
    $('go').textContent = go; $('go').hidden = !go;
    $('alt').textContent = alt; $('alt').hidden = !alt;
    document.body.className = 'ph-' + phase;
    paintClock(); renderTotals(); fit();
  }
  function renderTotals() {
    $('totals').innerHTML = players.map(function (t) {
      return '<span class="tot" style="--c:' + color(t.id) + '">' + Kru.badge(t, color(t.id)) + ' <b>' + pts(t.id) + '</b></span>';
    }).join('');
  }
  /** Long lines or long sentences: shrink the text until everything fits (never below 18 px). */
  function fit() {
    var stage = $('stage');
    var lists = stage.querySelectorAll('.line ol');
    if (lists.length) {
      // the whole team is in line (names read left to right, then down): try 1 to 4 columns and keep the one with the biggest
      // names where NO name wraps or is cut and nothing scrolls. 18 px is the goal; a very long name may push it a little lower.
      var layout = function (cols, px) {
        lists.forEach(function (o) { o.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))'; o.style.fontSize = px + 'px'; });
      };
      var fits = function () {
        if (stage.scrollHeight > stage.clientHeight + 1) return false;
        return Array.prototype.every.call(stage.querySelectorAll('.line li'), function (li) { return li.scrollWidth <= li.clientWidth + 1; });
      };
      var best = null;
      for (var cols = 1; cols <= 4; cols++) {
        for (var px = 30; px >= 12; px--) {
          layout(cols, px);
          if (fits()) { if (!best || px > best.px) best = { cols: cols, px: px }; break; }
        }
      }
      layout((best || { cols: 4 }).cols, (best || { px: 12 }).px);
    }
    var ph = stage.querySelectorAll('.phrase');
    if (ph.length) {
      var s = 40, setp = function (px) { ph.forEach(function (e) { if (!e.classList.contains('small')) e.style.fontSize = px + 'px'; }); };
      setp(s);
      while (s > 20 && stage.scrollHeight > stage.clientHeight + 1) setp(s -= 2);
    }
  }

  // ---------- buttons ----------
  $('go').addEventListener('click', function () {
    unlockAudio();
    if (phase === 'order') toWarn();
    else if (phase === 'warn1') showSecret();
    else if (phase === 'secret') hideSecret();
    else if (phase === 'warn2') toPlay();
    else if (phase === 'play') { if (running) { toJudge(); } else { left = Math.max(left, 1); endAt = Date.now() + left * 1000; running = true; clearInterval(timer); timer = setInterval(tick, 100); render(); } }
    else if (phase === 'judge') { if (!revealed) { revealed = true; render(); } else newRound(false); }
  });
  $('alt').addEventListener('click', function () {
    if (phase === 'warn1') { phase = 'order'; save(); render(); }
    else if (phase === 'warn2') showSecret();
    else if (phase === 'play' && running) { left = Math.max(0, (endAt - Date.now()) / 1000); stopTimer(); render(); }
  });
  $('stage').addEventListener('click', function (e) {
    var b = e.target.closest('[data-m]');
    if (!b) return;
    var id = b.dataset.m, v = Number(b.dataset.v);
    mark(id, S.mark[id] === v ? undefined : v);
  });

  // ---------- ⚙ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('resetScores').classList.remove('armed'); $('resetScores').textContent = 'New Game'; }
  function renderMenu() {
    KruMenu.stepper($('chainRow'), S.chain || 15, function (v) { S.chain = v; S.chainSet = true; save(); }, { min: 2, max: 15, label: 'student in each line', icon: '<svg class="ktimer-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3.2 19c0-3.2 2.6-5.4 5.8-5.4s5.8 2.2 5.8 5.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="17" cy="9" r="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M16 14c3 0 5 1.8 5 4.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' });
    $('setRow').innerHTML = SETS.map(function (x) { return '<button class="btn" data-set="' + x[0] + '" aria-pressed="' + (x[0] === (S.set || 'reported')) + '">' + x[1] + '</button>'; }).join('');
    KruMenu.timer($('secsRow'), S.secs, function (v) { S.secs = v; save(); }, { min: 30, max: 300 });
    KruMenu.timer($('peekRow'), S.peek, function (v) { S.peek = v; save(); }, { min: 10, max: 60 });
  }
  $('more').addEventListener('click', function () { disarm(); renderMenu(); $('undo').disabled = !players.some(function (t) { return S.mark[t.id] === 1; }); $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('setRow').addEventListener('click', function (e) {
    var b = e.target.closest('[data-set]');
    if (!b || b.dataset.set === (S.set || 'reported')) return;
    S.set = b.dataset.set; PHRASES = poolFor(S.set); S.order = shuffle(range(PHRASES.length)); S.pos = 0;
    if (phase === 'order') { S.cur = S.order[S.pos++]; } // before the secret is shown: use it now; otherwise from the next round
    save(); renderMenu(); render();
  });
  $('undo').addEventListener('click', function () { undoLast(); closeMenu(); });
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: 'Secret Message' }); });
  $('resetScores').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again to confirm'; setTimeout(disarm, 3500); return; }
    players.forEach(function (t) { if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'reset'); });
    S.pts = {}; S.round = 1; S.q = {}; S.prev = {};
    closeMenu(); newRound(true);
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', fit);

  Kru.onFinishRequest(function () {
    Kru.finish(players.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
  });

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (c) {
      var level = c[session.level] ? session.level : 'M.3';
      CONTENT = c[level];
      teams = Kru.allTeams();
      players = teams.filter(function (t) { return !t.teacher; }).slice(0, 2); // always two teams (the demo has more)
      var saved = session.resume;
      var wantSet = saved && saved.v === 1 && saved.set ? saved.set : 'reported';
      PHRASES = poolFor(wantSet);
      if (saved && saved.v === 1 && saved.level === level && Array.isArray(saved.order) && saved.order.length === PHRASES.length) S = saved;
      else S = { v: 1, level: level, set: 'reported', order: shuffle(range(PHRASES.length)), pos: 0, round: 1, chain: 15, secs: 120, peek: 10, pts: {}, q: {}, prev: {}, lines: {}, mark: {}, cur: 0, phase: 'order', introDone: false };
      S.q = S.q || {}; S.prev = S.prev || {}; S.mark = S.mark || {}; S.set = S.set || 'reported';
      if (!S.chainSet) S.chain = 15; // the whole team by default (an older session had 6)
      S.secs = KruMenu.snap(S.secs || 120, 30, 300); S.peek = KruMenu.snap(S.peek || 10, 10, 60);
      KruEnd.setup({ standings: function () { return players.map(function (t) { return { name: t.name, points: pts(t.id) }; }); } });
      INTRO = KruIntro.forLevel(c, level);
      // a reload never goes back into the secret or the whispering: a judging round stays, anything else restarts the line-up
      if (saved === S && S.phase === 'judge' && S.lines && Object.keys(S.lines).length) { phase = 'judge'; render(); }
      else if (saved === S && S.lines && Object.keys(S.lines).length === players.length) { phase = 'order'; render(); }
      else newRound(true);
      if (!S.introDone) KruIntro.show(INTRO, { title: 'Secret Message' }).then(function () { S.introDone = true; save(); });
    }).catch(function () { $('stage').textContent = 'Could not load the phrases. Close the game and open it again.'; });
  });
})();
