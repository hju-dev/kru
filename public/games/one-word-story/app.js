/* One-Word Story (rebuilt Nov 18 as a writing game). Each team writes its own story on the board, one word at a time.
   Every round one student from every team (picked at random, nobody twice until the whole team has gone) runs to the
   board and has 5 seconds to write ONE word. Then the next writers. When the story is long enough, the class reads the
   stories aloud and Henry taps the best one (+3), or a draw (+1 each). The phone is only the timer, the picker and the
   scoreboard: the students write on the board or on paper. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A'];
  var WORDS = [8, 12, 16, 20, 30], WRITE = [3, 5, 7, 10], GAP = [2, 3, 5, 8];
  var WIN = 3, DRAW = 1;

  var OPENERS = [], S = null, INTRO = [], teams = [], players = [];
  var phase = 'ready', running = false, left = 0, total = 0, endAt = 0, timer = 0, audio = null, writersNow = [];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function save() { Kru.saveState(S); }
  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }
  function pts(id) { return S.pts[id] || 0; }

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

  // ---------- who writes ----------
  /** One writer per team: random, nobody twice until the whole team has gone (KruPicker.next keeps the list). */
  function pickWriters() {
    S.picked = S.picked || {};
    return players.map(function (t) {
      var list = t.members || [];
      if (!list.length) return { team: t, name: 'Anyone' };
      var ids = list.map(function (m) { return String(m.id != null ? m.id : m.no); });
      var r = KruPicker.next(S.picked[t.id] || [], ids);
      S.picked[t.id] = r.picked;
      var m = list.filter(function (x) { return String(x.id != null ? x.id : x.no) === r.id; })[0];
      return { team: t, name: m.nick };
    });
  }

  // ---------- the clock (phase 'pick' = get ready, 'write' = write one word) ----------
  function render() {
    var judging = phase === 'judge';
    $('opener').textContent = OPENERS[S.order[S.pos]] || '';
    $('label').textContent = 'Story opener';
    $('judge').hidden = !judging;
    $('writers').hidden = judging;
    $('count').textContent = phase === 'ready' ? S.words + ' words' : judging ? 'Story done' : 'Word ' + Math.min(S.n + (phase === 'write' ? 1 : 1), S.words) + '/' + S.words;
    $('secs').textContent = phase === 'ready' || judging ? '' : String(Math.max(0, Math.ceil(left)));
    $('secs').className = 'secs ' + phase + (phase === 'write' && left <= 2 ? ' hot' : '');
    $('phase').textContent = { ready: 'Ready', pick: 'Get to the board!', write: 'Write ONE word!', judge: 'Read your stories' }[phase];
    $('go').textContent = phase === 'ready' ? 'Start' : running ? 'Pause' : 'Resume';
    $('go').hidden = judging;
    $('next').textContent = judging ? 'Next story ▶' : 'New opener ▶';
    $('writers').innerHTML = phase === 'ready' ? '<div class="hint">' + players.length + ' teams. Read the opener together, then tap Start.</div>' :
      writersNow.map(function (w) {
        return '<div class="writer" style="--c:' + color(w.team.id) + '"><span class="wt">' + esc(w.team.name) + '</span><b>' + esc(w.name) + '</b></div>';
      }).join('');
    renderJudge(); renderTotals(); fitOpener();
  }
  function color(id) { var i = teams.map(function (t) { return t.id; }).indexOf(id); return COLORS[(i < 0 ? 0 : i) % COLORS.length]; }
  function fitOpener() {
    var stage = $('stage'), el = $('opener'), size = 38;
    el.style.fontSize = size + 'px';
    while (size > 20 && stage.scrollHeight > stage.clientHeight + 1) el.style.fontSize = (size -= 2) + 'px';
  }
  function tick() {
    if (!running) return;
    var was = Math.ceil(left);
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) { left = 0; advance(); return; }
    if (phase === 'write' && Math.ceil(left) !== was) tone([left <= 2 ? 880 : 520], 0, 0.09, 0.22);
    $('secs').textContent = String(Math.ceil(left));
    $('secs').className = 'secs ' + phase + (phase === 'write' && left <= 2 ? ' hot' : '');
  }
  function begin(p, secs) {
    phase = p; total = left = secs; running = true; endAt = Date.now() + secs * 1000;
    clearInterval(timer); timer = setInterval(tick, 100);
  }
  /** pick -> write -> (next words | judge) */
  function advance() {
    if (phase === 'pick') {
      begin('write', S.write);
      tone([660, 880], 0.1, 0.2, 0.35);
    } else if (phase === 'write') {
      S.n++; save();
      tone([392, 330], 0.12, 0.3, 0.35);
      if (S.n >= S.words) { running = false; clearInterval(timer); phase = 'judge'; tone([523, 659, 784], 0.12, 0.3, 0.35); }
      else { writersNow = pickWriters(); save(); begin('pick', S.gap); }
    }
    render();
  }
  $('go').addEventListener('click', function () {
    unlockAudio();
    if (phase === 'ready') { S.n = 0; writersNow = pickWriters(); save(); begin('pick', S.gap); tone([440, 660], 0.1, 0.2, 0.3); }
    else if (running) { left = Math.max(0, (endAt - Date.now()) / 1000); running = false; clearInterval(timer); }
    else { running = true; endAt = Date.now() + left * 1000; clearInterval(timer); timer = setInterval(tick, 100); }
    render();
  });

  // ---------- points: the best story ----------
  function renderJudge() {
    if (phase !== 'judge') return;
    var done = S.award;
    $('judgeBtns').innerHTML = done ?
      '<div class="awarded">' + esc(done.label) + '</div><button class="btn" data-j="undo">Change</button>' :
      players.map(function (t) { return '<button class="btn gold" data-j="' + esc(t.id) + '" style="--c:' + color(t.id) + '">' + esc(t.name) + ' +' + WIN + '</button>'; }).join('') +
      '<button class="btn" data-j="draw">Draw +' + DRAW + ' each</button><button class="btn ghost" data-j="none">No points</button>';
  }
  function give(id, d, why) { if (!d) return; S.pts[id] = pts(id) + d; Kru.score(id, d, why); }
  $('judgeBtns').addEventListener('click', function (e) {
    var b = e.target.closest('[data-j]');
    if (!b) return;
    var j = b.dataset.j;
    if (j === 'undo') {
      var a = S.award;
      if (a) { a.gave.forEach(function (g) { give(g.id, -g.d, 'undo'); }); S.award = null; }
    } else if (!S.award) {
      var gave = [], label = 'No points this time';
      if (j === 'draw') { players.forEach(function (t) { gave.push({ id: t.id, d: DRAW }); }); label = 'Draw: +' + DRAW + ' each'; }
      else if (j !== 'none') { gave.push({ id: j, d: WIN }); label = teams.filter(function (t) { return t.id === j; })[0].name + ' wins: +' + WIN; }
      gave.forEach(function (g) { give(g.id, g.d, 'best story'); });
      S.award = { label: label, gave: gave };
      if (gave.length) tone([523, 659, 784, 1047], 0.1, 0.25, 0.35);
    }
    save(); render();
  });
  function renderTotals() {
    $('totals').innerHTML = players.map(function (t) {
      return '<span class="tot" style="--c:' + color(t.id) + '">' + esc(t.name) + ' <b>' + pts(t.id) + '</b></span>';
    }).join('');
  }

  // ---------- next story ----------
  function stop() { running = false; clearInterval(timer); }
  function newStory(keepPos) {
    stop();
    phase = 'ready'; writersNow = []; S.n = 0; S.award = null;
    if (!keepPos) S.pos = (S.pos + 1) % OPENERS.length;
    save(); render();
  }
  $('next').addEventListener('click', function () { unlockAudio(); newStory(false); });

  // ---------- ⋯ menu ----------
  function row(el, list, cur, attr, unit) {
    $(el).innerHTML = list.map(function (v) { return '<button class="btn" data-' + attr + '="' + v + '" aria-pressed="' + (v === cur) + '">' + v + unit + '</button>'; }).join('');
  }
  function renderMenu() { row('wordsRow', WORDS, S.words, 'words', ''); row('writeRow', WRITE, S.write, 'write', ' s'); row('gapRow', GAP, S.gap, 'gap', ' s'); }
  function closeMenu() { $('menuBack').hidden = true; }
  $('more').addEventListener('click', function () { renderMenu(); $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  [['wordsRow', 'words'], ['writeRow', 'write'], ['gapRow', 'gap']].forEach(function (p) {
    $(p[0]).addEventListener('click', function (e) {
      var b = e.target.closest('[data-' + p[1] + ']');
      if (!b) return;
      S[p[1]] = +b.dataset[p[1]]; save(); renderMenu(); render();
    });
  });
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: 'One-Word Story' }); });
  $('resetStory').addEventListener('click', function () { closeMenu(); newStory(true); });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden) return;
    if (e.code === 'Space') { e.preventDefault(); if (!$('go').hidden) $('go').click(); }
    else if (e.key === 'ArrowRight') $('next').click();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', fitOpener);

  Kru.onFinishRequest(function () {
    Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
  });

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (c) {
      var level = c[session.level] ? session.level : 'M.2';
      OPENERS = c[level].openers;
      teams = Kru.allTeams();
      players = teams.filter(function (t) { return !t.teacher; });
      var saved = session.resume;
      if (saved && saved.v === 2 && saved.level === level && Array.isArray(saved.order) && saved.order.length === OPENERS.length) S = saved;
      else S = { v: 2, level: level, order: shuffled(OPENERS.length), pos: 0, words: 12, write: 5, gap: 3, n: 0, pts: {}, picked: {}, award: null, introDone: false };
      if (WORDS.indexOf(S.words) < 0) S.words = 12;
      if (WRITE.indexOf(S.write) < 0) S.write = 5;
      if (GAP.indexOf(S.gap) < 0) S.gap = 3;
      S.n = 0; S.award = S.award || null; // a story that was running starts again after a reload
      render();
      INTRO = KruIntro.forLevel(c, level);
      if (!S.introDone) KruIntro.show(INTRO, { title: 'One-Word Story' }).then(function () { S.introDone = true; save(); });
    }).catch(function () { $('opener').textContent = 'Could not load the story openers. Close the game and open it again.'; });
  });
})();
