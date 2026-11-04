/* Board Race: a task is shown; one runner per team writes on the whiteboard before the timer ends.
   Henry taps points per team, then Reveal shows the answers or example answers. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var TIMES = [30, 45, 60, 90, 120];
  var $ = function (id) { return document.getElementById(id); };

  var TASKS = [];
  var teams = [];
  var S = null; // saved: { v, level, order, pos, revealed, secs, pts, log }
  var left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null, panelTeam = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function save() { Kru.saveState(S); }
  function pts(id) { return S.pts[id] || 0; }
  function team(id) { return teams.find(function (t) { return t.id === id; }); }
  function task() { return TASKS[S.order[S.pos]]; }
  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }

  // ---------- sound (after a tap) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }
  function tone(freqs, gap) {
    if (!audio) return;
    try {
      freqs.forEach(function (f, i) {
        var t = audio.currentTime + i * (gap || 0.2), o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.4);
      });
    } catch (e) {}
  }

  // ---------- timer ----------
  function renderClock() {
    $('digits').textContent = fmt(left);
    $('fill').style.transform = 'scaleX(' + (total ? Math.max(0, left) / total : 0) + ')';
    $('digits').className = 'digits' + (left <= 0 ? ' done' : left <= 10 ? ' warn' : '');
    $('go').textContent = running ? 'Pause' : left <= 0 ? 'Again' : left < total ? 'Resume' : 'Start';
  }
  function tick() {
    if (!running) return;
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) { left = 0; running = false; clearInterval(timer); tone([880, 660, 990]); }
    renderClock();
  }
  function stopTimer() {
    if (running) left = Math.max(0, (endAt - Date.now()) / 1000);
    running = false;
    clearInterval(timer);
  }
  function startTimer() {
    unlockAudio();
    if (left <= 0) left = total;
    running = true;
    endAt = Date.now() + left * 1000;
    clearInterval(timer);
    timer = setInterval(tick, 200);
    renderClock();
  }
  function resetTimer() { stopTimer(); total = left = S.secs; renderClock(); }

  // ---------- task card ----------
  function fit() {
    var stage = $('stage'), q = $('q'), items = $('items'), qs = 32, is = 26;
    var over = function () { return stage.scrollHeight > stage.clientHeight + 1; };
    q.style.fontSize = qs + 'px';
    items.style.setProperty('--item', is + 'px');
    while (qs > 22 && over()) q.style.fontSize = (qs -= 2) + 'px';
    while (is > 18 && over()) items.style.setProperty('--item', (is -= 2) + 'px');
    while (qs > 18 && over()) q.style.fontSize = (qs -= 2) + 'px';
  }
  function renderTask() {
    var t = task(), shown = !!S.revealed[S.pos];
    $('qnum').textContent = 'Task ' + (S.pos + 1) + ' of ' + S.order.length + (shown ? ' · ' + t.title : '');
    $('kind').hidden = shown; // the title moves to the bar: room for the answers
    $('kind').textContent = t.title;
    $('kind').className = 'kind ' + t.kind;
    $('q').textContent = t.prompt;
    $('q').hidden = shown && t.kind === 'forms'; // room for the answers
    if (t.kind === 'forms') {
      $('items').innerHTML = t.items.map(function (it, i) {
        return '<span class="item">' + esc(it) + (shown ? ' → <span class="item-ans">' + esc(t.answers[i]) + '</span>' : '') + '</span>';
      }).join('');
      $('items').hidden = false;
      $('examples').hidden = true;
    } else {
      $('items').hidden = true;
      $('examples').innerHTML = '<b>Examples:</b> ' + esc(t.examples || '');
      $('examples').hidden = !shown;
    }
    $('reveal').disabled = shown;
    $('reveal').textContent = t.kind === 'forms' ? 'Reveal' : 'Show examples';
    renderTeams();
    renderClock();
    fit();
  }
  function goTo(pos) {
    if (pos >= S.order.length) {
      S.order = shuffled(TASKS.length); S.pos = 0; S.revealed = {};
      toast('That was the last task. Starting again with a new order.', false);
    } else S.pos = Math.max(0, pos);
    save();
    resetTimer();
    renderTask();
  }

  // ---------- teams + points ----------
  function renderTeams() {
    var max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }));
    $('strip').innerHTML = teams.map(function (t, i) {
      return '<button class="tile' + (max > 0 && pts(t.id) === max ? ' lead' : '') + '" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-label="' + esc(t.name) + ', ' + pts(t.id) + ' points. Tap to give points">' +
        '<span class="tn">' + esc(t.name) + '</span><span class="tp">' + pts(t.id) + '</span></button>';
    }).join('');
  }
  function addPoints(id, d) {
    S.pts[id] = pts(id) + d;
    S.log.push({ t: id, d: d });
    if (S.log.length > 400) S.log.shift();
    save();
    Kru.score(id, d, task().title);
    renderTeams();
    toast(team(id).name + ' ' + (d > 0 ? '+' : '−') + Math.abs(d), true);
  }
  function undo() {
    var L = S.log.pop();
    if (!L) return;
    S.pts[L.t] = pts(L.t) - L.d;
    save();
    Kru.score(L.t, -L.d, 'undo');
    renderTeams();
    $('toast').hidden = true;
  }
  var toastTimer = 0;
  function toast(text, canUndo) {
    $('toastText').textContent = text;
    $('toastUndo').hidden = !canUndo;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 5000);
  }
  function openPanel(id) {
    var t = team(id);
    if (!t) return;
    panelTeam = t;
    $('panelName').textContent = t.name;
    $('panelPts').textContent = pts(id) + ' points';
    $('panelMembers').textContent = t.teacher ? 'Teacher' : t.members.map(function (m) { return m.nick; }).join(', ');
    $('panelBack').hidden = false;
  }
  function closePanel() { $('panelBack').hidden = true; panelTeam = null; }

  $('strip').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) openPanel(b.dataset.t); });
  $('panelBtns').addEventListener('click', function (e) {
    var b = e.target.closest('[data-d]');
    if (!b || !panelTeam) return;
    addPoints(panelTeam.id, Number(b.dataset.d));
    closePanel();
  });
  $('panelClose').addEventListener('click', closePanel);
  $('panelBack').addEventListener('click', function (e) { if (e.target === this) closePanel(); });
  $('toastUndo').addEventListener('click', undo);

  // ---------- main buttons ----------
  $('go').addEventListener('click', function () { if (running) { stopTimer(); renderClock(); } else startTimer(); });
  $('reveal').addEventListener('click', function () { stopTimer(); S.revealed[S.pos] = true; save(); renderTask(); });
  $('next').addEventListener('click', function () { goTo(S.pos + 1); });

  // ---------- ⋯ menu ----------
  function renderSecs() {
    $('secsRow').innerHTML = TIMES.map(function (s) {
      return '<button class="btn" data-secs="' + s + '" aria-pressed="' + (s === S.secs) + '">' + fmt(s) + '</button>';
    }).join('');
  }
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('resetScores').classList.remove('armed'); $('resetScores').textContent = 'Reset all scores'; }
  $('more').addEventListener('click', function () { renderSecs(); $('undo').disabled = !S.log.length; $('prev').disabled = S.pos === 0; disarm(); $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('secsRow').addEventListener('click', function (e) {
    var b = e.target.closest('[data-secs]');
    if (!b) return;
    S.secs = +b.dataset.secs; save(); resetTimer(); renderSecs();
  });
  $('prev').addEventListener('click', function () { goTo(S.pos - 1); closeMenu(); });
  $('resetTimer').addEventListener('click', function () { resetTimer(); closeMenu(); });
  $('undo').addEventListener('click', function () { undo(); closeMenu(); });
  $('resetScores').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed'); btn.textContent = 'Tap again: all scores back to 0';
      setTimeout(disarm, 3500);
      return;
    }
    teams.forEach(function (t) { if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'reset'); });
    S.pts = {}; S.log = [];
    save(); closeMenu(); renderTeams();
  });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden || !$('panelBack').hidden) return;
    if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
    else if (e.key === 'ArrowRight') $('next').click();
    else if (e.key === 'a' || e.key === 'A') $('reveal').click();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', fit);

  Kru.onFinishRequest(function () {
    Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
  });

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (content) {
      var level = content[session.level] ? session.level : 'M.2';
      TASKS = content[level].tasks;
      teams = Kru.allTeams();
      var studentTeams = session.teams.length;
      if (studentTeams > 6) {
        // HANDOFF: Board Race is for 2-6 teams (whiteboard space); it still works with more
        $('warnTeams').textContent = studentTeams + ' teams: best with 2–6';
        $('warnTeams').hidden = false;
      }
      var saved = session.resume;
      if (saved && saved.v === 1 && saved.level === level && Array.isArray(saved.order) && saved.order.length === TASKS.length) S = saved;
      else S = { v: 1, level: level, order: shuffled(TASKS.length), pos: 0, revealed: {}, secs: 60, pts: {}, log: [] };
      total = left = S.secs;
      renderTask();
    }).catch(function () {
      $('q').textContent = 'Could not load the tasks. Close the game and open it again.';
    });
  });
})();
