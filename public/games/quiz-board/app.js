/* Quiz Board: a board of 5 topics x 5 squares (1 to 5 points). Teams take turns choosing a square.
   The question opens with a timer; Henry taps the teams that were right (tap again to take it back),
   then Reveal, then Back to board. One square on each board is a secret DOUBLE (twice the points).
   Questions: Quiz Battle's built-in sets for the level (games/quiz-battle/content.json), 5 per topic,
   easier ones (A-D choices) on the low squares, short answers on the high ones. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var TIMES = [10, 20, 30, 45, 60], ROWS = 5, COLS = 5;
  var $ = function (id) { return document.getElementById(id); };
  var esc = KruQuiz.esc;

  var SETS = [], teams = [], INTRO = [];
  var S = null; // saved: { v, level, cols: [setIndex], board: [[questionIndex x5] x5], used: {key: [teamIds]}, dd, turn, open, revealed, secs, pts, log }
  var left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null;

  function save() { Kru.saveState(S); }
  function pts(id) { return S.pts[id] || 0; }
  function team(id) { return teams.find(function (t) { return t.id === id; }); }
  function students() { return teams.filter(function (t) { return !t.teacher; }); }
  function key(c, r) { return c + '-' + r; }
  function shuffle(a) {
    for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }
  function q(c, r) { var s = SETS[S.cols[c]]; return s && s.questions[S.board[c][r]]; }
  function value(c, r) { return (r + 1) * (S.dd === key(c, r) ? 2 : 1); }

  /** A new board: 5 topics, 5 questions each; multiple choice first (lower squares), short answers last. */
  function newBoard() {
    var cols = shuffle(SETS.map(function (s, i) { return i; })).slice(0, COLS);
    var board = cols.map(function (si) {
      var qs = SETS[si].questions;
      var pick = shuffle(qs.map(function (x, i) { return i; })).slice(0, ROWS);
      return pick.sort(function (a, b) {
        var ha = qs[a].choices ? 0 : 1, hb = qs[b].choices ? 0 : 1;
        return ha - hb || qs[a].q.length - qs[b].q.length;
      });
    });
    var dd = key(Math.floor(Math.random() * cols.length), 1 + Math.floor(Math.random() * (ROWS - 1))); // never the 1-point row
    return { cols: cols, board: board, used: {}, dd: dd, open: null, revealed: false };
  }

  // ---------- sound (after a tap) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function tone(freqs, gap) {
    if (!audio) return;
    try {
      freqs.forEach(function (f, i) {
        var t = audio.currentTime + i * (gap || 0.15), o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.35);
      });
    } catch (e) {}
  }

  // ---------- timer ----------
  function renderClock() {
    $('digits').textContent = Math.max(0, Math.ceil(left)) >= 60 ? '1:00' : '0:' + String(Math.max(0, Math.ceil(left))).padStart(2, '0');
    $('fill').style.transform = 'scaleX(' + (total ? Math.max(0, left) / total : 0) + ')';
    $('digits').className = 'digits' + (left <= 0 ? ' done' : left <= 5 && running ? ' warn' : '');
    $('go').textContent = running ? 'Pause' : left <= 0 ? 'Again' : left < total ? 'Resume' : 'Start timer';
  }
  function tick() {
    if (!running) return;
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) { left = 0; running = false; clearInterval(timer); tone([880, 660, 990], 0.2); }
    renderClock();
  }
  function stopTimer() { if (running) left = Math.max(0, (endAt - Date.now()) / 1000); running = false; clearInterval(timer); }
  function startTimer() {
    unlockAudio();
    if (left <= 0) left = total;
    running = true; endAt = Date.now() + left * 1000;
    clearInterval(timer); timer = setInterval(tick, 200); renderClock();
  }
  function resetTimer() { stopTimer(); total = left = S.secs; renderClock(); }

  // ---------- board ----------
  function picker() { var list = students(); return list.length ? list[S.turn % list.length] : null; }
  function renderTurn() {
    var p = picker();
    $('turn').innerHTML = p ? '<span class="dot" style="background:' + COLORS[teams.indexOf(p) % COLORS.length] + '"></span>' + esc(p.name) + ' chooses' : '';
  }
  function renderBoard() {
    var html = S.cols.map(function (si) { return '<div class="topic" role="columnheader">' + esc(SETS[si].name) + '</div>'; }).join('');
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < S.cols.length; c++) {
        var k = key(c, r), used = S.used[k];
        var who = used ? used.map(function (id) { var t = team(id); return t ? '<i style="background:' + COLORS[teams.indexOf(t) % COLORS.length] + '"></i>' : ''; }).join('') : '';
        html += used
          ? '<div class="sq used" role="gridcell" aria-label="used">' + (who ? '<span class="who">' + who + '</span>' : '') + '</div>'
          : '<button class="sq" data-k="' + k + '" aria-label="' + esc(SETS[S.cols[c]].name) + ', ' + (r + 1) + ' points">' + (r + 1) + '</button>';
      }
    }
    $('board').style.setProperty('--cols', S.cols.length);
    $('board').innerHTML = html;
    var max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }));
    var p = picker();
    $('scores').innerHTML = teams.map(function (t, i) {
      return '<li class="' + (p && t.id === p.id ? 'now' : '') + (max > 0 && pts(t.id) === max ? ' lead' : '') + '"><span class="dot" style="background:' + COLORS[i % COLORS.length] + '"></span>' +
        '<span class="n">' + esc(t.name) + '</span><b>' + pts(t.id) + '</b></li>';
    }).join('');
    renderTurn();
  }

  // ---------- one question ----------
  function renderQuestion() {
    var c = +S.open.split('-')[0], r = +S.open.split('-')[1], qq = q(c, r);
    $('qTopic').textContent = SETS[S.cols[c]].name;
    $('qValue').textContent = value(c, r) + (value(c, r) === 1 ? ' point' : ' points');
    $('qDouble').hidden = S.dd !== S.open;
    $('qBody').innerHTML = KruQuiz.html(qq, S.revealed);
    $('reveal').disabled = S.revealed;
    var right = S.used[S.open] || [], max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }));
    $('strip').innerHTML = teams.map(function (t, i) {
      var on = right.indexOf(t.id) >= 0;
      return '<button class="tile' + (on ? ' right' : '') + (max > 0 && pts(t.id) === max ? ' lead' : '') + '" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-pressed="' + on + '">' +
        '<span class="tn">' + esc(t.name) + '</span><span class="tp">' + pts(t.id) + (on ? ' ✓' : '') + '</span></button>';
    }).join('');
    KruQuiz.fit($('stage'));
  }
  function show() {
    var open = !!S.open;
    $('boardView').hidden = open;
    $('qView').hidden = !open;
    if (open) renderQuestion(); else renderBoard();
    renderTurn();
  }
  function openSquare(k) {
    unlockAudio();
    S.open = k; S.revealed = false; S.used[k] = S.used[k] || [];
    save();
    resetTimer();
    show();
    if (S.dd === k) { tone([523, 659, 784, 1047], 0.1); toast('DOUBLE! This square is worth twice the points.', false); } else tone([660, 880], 0.12);
  }
  function closeSquare() {
    stopTimer();
    S.open = null; S.revealed = false;
    S.turn = (S.turn + 1) % Math.max(1, students().length);
    save();
    show();
    var left = ROWS * S.cols.length - Object.keys(S.used).length;
    if (!left) {
      tone([784, 988, 1175], 0.15);
      KruEnd.show({ keepPlaying: function () { toast('Another round? ⋯ → New board.', false); } });
    }
  }
  function toggleRight(id) {
    var k = S.open, list = S.used[k], i = list.indexOf(id), c = +k.split('-')[0], r = +k.split('-')[1], d = value(c, r);
    if (i >= 0) { list.splice(i, 1); d = -d; } else list.push(id);
    S.pts[id] = pts(id) + d;
    S.log.push({ t: id, d: d, k: k });
    save();
    Kru.score(id, d, 'quiz board');
    if (d > 0) tone([784, 988], 0.1);
    renderQuestion();
  }

  // ---------- toast ----------
  var toastTimer = 0;
  function toast(text, undo) {
    $('toastText').textContent = text;
    $('toastUndo').hidden = !undo;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 4000);
  }

  // ---------- buttons ----------
  $('board').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) openSquare(b.dataset.k); });
  $('strip').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b && S.open) { unlockAudio(); toggleRight(b.dataset.t); } });
  $('go').addEventListener('click', function () { if (running) { stopTimer(); renderClock(); } else startTimer(); });
  $('reveal').addEventListener('click', function () { unlockAudio(); stopTimer(); renderClock(); S.revealed = true; save(); tone([523, 659]); renderQuestion(); });
  $('back').addEventListener('click', closeSquare);

  // ---------- ⋯ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('resetScores').classList.remove('armed'); $('resetScores').textContent = 'Reset all scores'; }
  function renderSecs() { $('secsRow').innerHTML = TIMES.map(function (s) { return '<button class="btn" data-secs="' + s + '" aria-pressed="' + (s === S.secs) + '">' + s + ' s</button>'; }).join(''); }
  $('more').addEventListener('click', function () { renderSecs(); disarm(); $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('secsRow').addEventListener('click', function (e) { var b = e.target.closest('[data-secs]'); if (!b) return; S.secs = +b.dataset.secs; save(); resetTimer(); renderSecs(); });
  $('newBoard').addEventListener('click', function () {
    var b = newBoard();
    Object.keys(b).forEach(function (k) { S[k] = b[k]; });
    save(); closeMenu(); stopTimer(); show();
  });
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: 'Quiz Board' }); });
  $('resetScores').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again: all scores back to 0'; setTimeout(disarm, 3500); return; }
    teams.forEach(function (t) { if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'reset'); });
    S.pts = {}; S.log = [];
    save(); closeMenu(); show();
  });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden || !S || !S.open) return;
    if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
    else if (e.key === 'a' || e.key === 'A') $('reveal').click();
    else if (e.key === 'Escape' || e.key === 'ArrowRight') $('back').click();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', function () { if (S && S.open) KruQuiz.fit($('stage')); });

  Kru.onFinishRequest(function () { Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; })); });

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    Promise.all([contentReady, KruQuiz.load(session.level, session)]).then(function (both) {
      var c = both[0], Q = both[1];
      // a unit from Henry's lessons, if it has enough for a board (5 topics of 5); otherwise the built-in topics
      var unitOk = Q.unit && Q.unit.sets.filter(function (s) { return s.questions.length >= ROWS; }).length >= COLS;
      SETS = unitOk ? Q.unit.sets.filter(function (s) { return s.questions.length >= ROWS; }) : Q.builtIn;
      if (unitOk) $('turn').title = Q.unit.title;
      teams = Kru.allTeams();
      KruEnd.setup({ standings: function () { return teams.map(function (t) { return { name: t.name, points: pts(t.id), teacher: !!t.teacher }; }); } });
      var saved = session.resume;
      var ok = saved && saved.v === 1 && saved.level === Q.level && (saved.unit || null) === (unitOk ? Q.unit.id : null) && Array.isArray(saved.cols) &&
        saved.cols.every(function (si, c) { return SETS[si] && saved.board[c].every(function (qi) { return SETS[si].questions[qi]; }); });
      if (ok) S = saved;
      else {
        S = { v: 1, level: Q.level, unit: unitOk ? Q.unit.id : null, turn: 0, secs: 20, pts: {}, log: [], introDone: false };
        var b = newBoard();
        Object.keys(b).forEach(function (k) { S[k] = b[k]; });
      }
      total = left = S.secs;
      show();
      INTRO = KruIntro.forLevel(c, Q.level);
      if (!S.introDone) KruIntro.show(INTRO, { title: 'Quiz Board' }).then(function () { S.introDone = true; save(); });
    }).catch(function (err) {
      $('board').textContent = 'Could not load the questions. Close the game and open it again.';
      if (window.console) console.error(err);
    });
  });
})();
