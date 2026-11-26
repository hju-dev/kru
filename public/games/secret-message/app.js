/* Secret Message (Henry, Nov 25): a whisper-down-the-line speaking game for TWO teams about reported speech.
   Nov 26: the line order does not matter, only who is at the FRONT (the Messenger, sees the secret) and the BACK (the
   Reporter, says it). Each round a cinematic slot-machine spin picks both for each team; every student is Messenger once
   and Reporter once before anybody gets the same role again (two queues per team, S.fq / S.bq).
   Round: the spin picks the Messenger and the Reporter of each team -> the teacher
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
  function save() { S.phase = phase === 'spin' ? 'pick' : phase; Kru.saveState(S); }
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

  // ---------- who is at the front (Messenger) and the back (Reporter) ----------
  function mid(m) { return String(m.id != null ? m.id : m.no); }
  /** Take a random student from a role queue (refilled with the whole team once everybody had that role), never `not`. */
  function takeFrom(qs, id, all, not) {
    var q = (qs[id] || []).filter(function (x) { return all.indexOf(x) >= 0; });
    var ok = q.filter(function (x) { return x !== not; });
    if (!ok.length) { q = q.concat(shuffle(all.filter(function (x) { return q.indexOf(x) < 0; }))); ok = q.filter(function (x) { return x !== not; }); }
    if (!ok.length) return all[0] || '?'; // a team of one
    var pick = ok[Math.floor(Math.random() * ok.length)];
    qs[id] = q.filter(function (x) { return x !== pick; });
    return pick;
  }
  /** [Messenger, Reporter] for one team: never the same student; each role goes round the whole team before it repeats. */
  function rolesFor(t) {
    var all = (t.members || []).map(mid);
    if (!all.length) return ['?', '?'];
    var f = takeFrom(S.fq, t.id, all, null);
    var b = takeFrom(S.bq, t.id, all, all.length > 1 ? f : null);
    return [f, b];
  }
  function nameOf(t, id) {
    var m = (t.members || []).filter(function (x) { return mid(x) === id; })[0];
    if (m) return m.nick;
    return 'Next student';
  }
  function front(t) { return nameOf(t, (S.roles[t.id] || [])[0]); }
  function back(t) { return nameOf(t, (S.roles[t.id] || [])[1]); }
  function newRound(first) {
    stopTimer(); stopPeek(); stopSpin();
    if (!first) S.round++;
    if (S.pos >= S.order.length) { S.order = shuffle(range(PHRASES.length)); S.pos = 0; }
    S.cur = S.order[S.pos++];
    S.roles = {}; players.forEach(function (t) { S.roles[t.id] = rolesFor(t); });
    S.mark = {}; revealed = false;
    phase = 'pick'; save(); render();
  }

  // ---------- the cinematic pick: four slot machines (Messenger + Reporter for both teams) stop one after the other ----------
  var spinTimers = [];
  function stopSpin() { spinTimers.forEach(clearTimeout); spinTimers = []; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function drum() {
    if (!audio) return;
    try { // a short drum roll under the spin
      for (var i = 0; i < 18; i++) {
        var t = audio.currentTime + i * 0.09, o = audio.createOscillator(), g = audio.createGain();
        o.type = 'square'; o.frequency.value = 90 + (i % 2) * 20;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 + i * 0.006, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.09);
      }
    } catch (e) {}
  }
  function spin() {
    unlockAudio(); stopSpin();
    phase = 'spin'; render();
    var slots = Array.prototype.slice.call($('stage').querySelectorAll('.slot'));
    if (reduce) { slots.forEach(function (el) { land(el); }); done(); return; }
    drum();
    var left = slots.length;
    slots.forEach(function (el, i) {
      var t = players[Number(el.dataset.ti)], names = (t.members || []).map(function (m) { return m.nick; });
      var stopAt = Date.now() + 1500 + i * 650, delay = 45, last = '';
      el.classList.add('spin');
      var step = function () {
        if (Date.now() >= stopAt) { land(el); if (--left === 0) spinTimers.push(setTimeout(done, 700)); return; }
        var n = names.length > 1 ? names.filter(function (x) { return x !== last; }) : names;
        last = n[Math.floor(Math.random() * n.length)] || '?';
        el.querySelector('.nm').textContent = last;
        if (stopAt - Date.now() < 900) delay = Math.min(260, delay * 1.22); // slow down at the end
        tone([300 + Math.random() * 300], 0, 0.04, 0.08);
        spinTimers.push(setTimeout(step, delay));
      };
      step();
    });
  }
  function land(el) {
    var t = players[Number(el.dataset.ti)];
    el.classList.remove('spin'); el.classList.add('lock');
    el.querySelector('.nm').textContent = el.dataset.r === 'f' ? front(t) : back(t);
    fitSlot(el);
    tone(el.dataset.r === 'f' ? [523, 784, 1047] : [440, 659, 880], 0.06, 0.25, 0.32);
  }
  function done() { phase = 'order'; save(); render(); tone([523, 659, 784, 1047], 0.09, 0.35, 0.35); }

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
  /** One team: its Messenger (front, sees the secret) and its Reporter (back, says it). `hide` = still a mystery. */
  function teamCard(t, i, hide) {
    var slot = function (r, icon, label, name) {
      return '<div class="slot' + (hide ? '' : ' shown') + '" data-ti="' + i + '" data-r="' + r + '"><span class="rl">' + icon + ' ' + label + '</span><span class="win"><span class="nm">' + (hide ? '?' : esc(name)) + '</span></span></div>';
    };
    return '<div class="tcard" style="--c:' + color(t.id) + '"><div class="lh">' + Kru.badge(t, color(t.id)) + '<span>' + esc(t.name) + '</span></div>' +
      slot('f', '👀', 'Messenger', front(t)) + '<div class="whisper" aria-hidden="true"><i></i><i></i><i></i></div>' + slot('b', '🎤', 'Reporter', back(t)) + '</div>';
  }
  function duoHtml(hide) { return '<div class="duo' + (phase === 'spin' ? ' spinning' : '') + '">' + players.map(function (t, i) { return teamCard(t, i, hide); }).join('') + '</div>'; }
  function reporterNames() { return players.map(function (t) { return esc(back(t)); }); }

  function render() {
    var p = PHRASES[S.cur] || { k: 'ds', say: '', answer: '' };
    var stage = $('stage'), html = '', go = '', alt = '', label = '';
    $('count').textContent = 'R' + S.round;
    switch (phase) {
      case 'pick':
        html = duoHtml(true); go = '🎲 Pick';
        break;
      case 'spin':
        html = duoHtml(true);
        break;
      case 'order':
        html = duoHtml(false); go = 'Secret';
        break;
      case 'warn1':
        html = '<div class="cover warn"><div class="big">🕵️ TOP SECRET MISSION!</div>' +
          '<p>Agent Teacher, the TV must NOT see this! Un-mirror your phone now:</p>' +
          '<p class="how">Control Center → <b>Screen Mirroring</b> → <b>Stop Mirroring</b></p></div>';
        go = '🔒'; alt = '←';
        break;
      case 'secret':
        html = '<div class="secret"><div class="kind">' + esc(KIND[p.k]) + ' → ' + (p.answer === p.say ? 'say it ' + esc(TO[p.k]) : 'say it as ' + esc(TO[p.k])) + '</div>' +
          '<div class="phrase" id="phrase">' + esc(p.say) + '</div>' +
          '<div class="who">Show ONLY the Messenger of each team: <b>' + players.map(function (t) { return esc(front(t)); }).join(' and ') + '</b></div></div>';
        go = 'Hide';
        break;
      case 'warn2':
        html = '<div class="cover go"><div class="big">🚀 MISSION LAUNCHED!</div>' +
          '<p>The secret is safe. You may mirror your phone again!</p>' +
          '<p class="how">Control Center → <b>Screen Mirroring</b> → your TV</p></div>';
        go = 'Start'; alt = '👀';
        break;
      case 'play':
        html = duoHtml(false); go = running ? 'Ready' : '▶'; alt = running ? '||' : '';
        break;
      case 'judge':
        if (!revealed) {
          html = '<div class="cover judge"><div class="big">🎤 Reporters, speak!</div><p>' + (p.answer === p.say ? 'Each Reporter says the secret EXACTLY the same.' : 'Each Reporter says the secret the other way.') + '</p>' +
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
    var LBL = { '🎲 Pick': 'Pick the Messengers and Reporters', '🔒': 'The TV is dark: show the secret', '←': 'Back', '👀': 'Show the secret again', '||': 'Pause', '▶': 'Resume', 'Ready': 'The reporters are ready' };
    $('go').textContent = go; $('go').hidden = !go; $('go').setAttribute('aria-label', LBL[go] || go);
    $('alt').textContent = alt; $('alt').hidden = !alt; $('alt').setAttribute('aria-label', LBL[alt] || alt);
    document.body.className = 'ph-' + phase;
    paintClock(); renderTotals(); fit();
  }
  function renderTotals() {
    $('totals').innerHTML = players.map(function (t) {
      return '<span class="tot" style="--c:' + color(t.id) + '">' + Kru.badge(t, color(t.id)) + ' <b>' + pts(t.id) + '</b></span>';
    }).join('');
  }
  /** A long name shrinks until it fits its slot window (never below 18 px). */
  function fitSlot(el) {
    var nm = el.querySelector('.nm'), win = el.querySelector('.win');
    if (!nm || !win) return;
    var px = 40; nm.style.fontSize = px + 'px';
    while (px > 18 && nm.scrollWidth > win.clientWidth - 8) nm.style.fontSize = (px -= 2) + 'px';
  }
  /** Long names or long sentences: shrink the text until everything fits (never below 18 px). */
  function fit() {
    var stage = $('stage');
    stage.querySelectorAll('.slot.shown, .slot.lock').forEach(fitSlot);
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
    if (phase === 'pick') spin();
    else if (phase === 'order') toWarn();
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
    if (phase === 'pick' || phase === 'spin' || phase === 'order') { S.cur = S.order[S.pos++]; } // before the secret is shown: use it now; otherwise from the next round
    save(); renderMenu(); render();
  });
  $('undo').addEventListener('click', function () { undoLast(); closeMenu(); });
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: 'Secret Message' }); });
  $('resetScores').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again to confirm'; setTimeout(disarm, 3500); return; }
    players.forEach(function (t) { if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'reset'); });
    S.pts = {}; S.round = 1; S.fq = {}; S.bq = {};
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
      else S = { v: 1, level: level, set: 'reported', order: shuffle(range(PHRASES.length)), pos: 0, round: 1, secs: 120, peek: 10, pts: {}, fq: {}, bq: {}, roles: {}, mark: {}, cur: 0, phase: 'pick', introDone: false };
      S.fq = S.fq || {}; S.bq = S.bq || {}; S.mark = S.mark || {}; S.set = S.set || 'reported';
      delete S.q; delete S.prev; delete S.lines; delete S.chain; delete S.chainSet; // the old whole-line game (before Nov 26)
      S.secs = KruMenu.snap(S.secs || 120, 30, 300); S.peek = KruMenu.snap(S.peek || 10, 10, 60);
      KruEnd.setup({ standings: function () { return players.map(function (t) { return { name: t.name, points: pts(t.id) }; }); } });
      INTRO = KruIntro.forLevel(c, level);
      // a reload never goes back into the secret or the whispering: a judging round stays, anything else restarts the line-up
      var picked = saved === S && S.roles && Object.keys(S.roles).length === players.length;
      if (picked && S.phase === 'judge') { phase = 'judge'; render(); }
      else if (picked && S.phase === 'order') { phase = 'order'; render(); }
      else if (picked) { phase = 'pick'; render(); } // the spin shows the same picks again
      else newRound(true);
      if (!S.introDone) KruIntro.show(INTRO, { title: 'Secret Message' }).then(function () { S.introDone = true; save(); });
    }).catch(function () { $('stage').textContent = 'Could not load the phrases. Close the game and open it again.'; });
  });
})();
