/* Quiz Board: a board of 5 topics x 5 squares (1 to 5 points). Teams take turns choosing a square.
   The question opens with a timer; Henry taps the teams that were right (tap again to take it back),
   then Reveal, then Back to board. One square on each board is a secret DOUBLE (twice the points).
   Questions: Quiz Battle's built-in sets for the level (games/quiz-battle/content.json), 5 per topic,
   easier ones (A-D choices) on the low squares, short answers on the high ones.
   Optional (⋯ menu, Henry Nov 11): "Choosing team only": only the team that picked the square answers; Henry taps
   ✓ Right or ✗ Wrong. That team can use power-ups, one of each per game: 50/50, +20 s, Free answer, Risk it
   (right = double points, wrong = lose the square's points). */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var TIMES = [10, 20, 30, 45, 60], ROWS = 5, COLS = 5;
  var $ = function (id) { return document.getElementById(id); };
  var esc = KruQuiz.esc;

  var SETS = [], teams = [], INTRO = [];
  var S = null; // saved: { v, level, cols, board, used: {key: [teamIds]}, dd, turn, open, revealed, secs, pts, log, oneTeam, powers, gone, risk }
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
    (S.gone || []).forEach(function (i) { var el = $('qBody').querySelectorAll('.kq-choice')[i]; if (el) el.classList.add('gone'); });
    $('reveal').disabled = S.revealed;
    var one = !!S.oneTeam;
    $('qView').classList.toggle('one-team', one);
    $('powers').hidden = !one; $('right').hidden = !one; $('wrong').hidden = !one; $('back').hidden = one;
    if (one) { $('qAns').hidden = false; $('qAns').textContent = '· ' + picker().name + ' answers'; renderPowers(qq); } else $('qAns').hidden = true;
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
    S.open = k; S.revealed = false; S.used[k] = S.used[k] || []; S.gone = null; S.risk = false;
    var who = picker(); S.lastPowers = who ? JSON.parse(JSON.stringify(S.powers[who.id] || {})) : null;
    save();
    resetTimer();
    show();
    if (S.dd === k) { tone([523, 659, 784, 1047], 0.1); toast('DOUBLE! This square is worth twice the points.', false); } else tone([660, 880], 0.12);
  }
  function closeSquare() {
    stopTimer();
    S.open = null; S.revealed = false; S.gone = null; S.risk = false;
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
  $('strip').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b && S.open && !S.oneTeam) { unlockAudio(); toggleRight(b.dataset.t); } });
  $('go').addEventListener('click', function () { if (running) { stopTimer(); renderClock(); } else startTimer(); });
  $('reveal').addEventListener('click', function () { unlockAudio(); stopTimer(); renderClock(); S.revealed = true; save(); tone([523, 659]); renderQuestion(); });
  $('back').addEventListener('click', closeSquare);

  // ---------- "Choosing team only": ✓ Right / ✗ Wrong for the team that picked the square ----------
  function markOne(right) {
    unlockAudio();
    var k = S.open, c = +k.split('-')[0], r = +k.split('-')[1], v = value(c, r), t = picker();
    var d = right ? v * (S.risk ? 2 : 1) : (S.risk ? -v : 0);
    var powersBefore = JSON.parse(JSON.stringify(S.powers[t.id] || {}));
    if (S.risk) use(t.id, 'risk');
    S.used[k] = right ? [t.id] : [];
    if (d) { S.pts[t.id] = pts(t.id) + d; Kru.score(t.id, d, right ? 'quiz board' : 'risk it'); }
    // Undo gives back the points AND the power-ups used on this question (a mis-tap shouldn't cost a power-up)
    S.last = { k: k, t: t.id, d: d, turn: S.turn, powers: S.lastPowers || powersBefore };
    S.lastPowers = null;
    tone(right ? [784, 988] : [330, 262], 0.12);
    closeSquare();
    toast(t.name + (d > 0 ? ' +' + d : d < 0 ? ' −' + Math.abs(d) : ': no points') + (S.last && right ? ' ✓' : ' ✗'), true);
  }
  $('right').addEventListener('click', function () { markOne(true); });
  $('wrong').addEventListener('click', function () { markOne(false); });
  $('toastUndo').addEventListener('click', function () {
    var L = S.last;
    if (!L || S.open) return;
    if (L.d) { S.pts[L.t] = pts(L.t) - L.d; Kru.score(L.t, -L.d, 'undo'); }
    delete S.used[L.k]; S.turn = L.turn; S.last = null;
    if (L.powers) S.powers[L.t] = L.powers;
    save(); $('toast').hidden = true; openSquare(L.k);
  });

  // ---------- power-ups (one of each per team per game, "Choosing team only") ----------
  var POWERS = [
    { id: 'fifty', label: '50/50' },
    { id: 'time', label: '+20 s' },
    { id: 'free', label: 'Free answer' },
    { id: 'risk', label: 'Risk it' },
  ];
  function used(id, p) { return !!(S.powers[id] && S.powers[id][p]); }
  function use(id, p) { (S.powers[id] = S.powers[id] || {})[p] = true; save(); }
  function renderPowers(qq) {
    var id = picker().id;
    $('powers').innerHTML = '<span class="pw-lab">Power-ups:</span>' + POWERS.map(function (p) {
      var off = used(id, p.id) || (p.id === 'fifty' && (!Array.isArray(qq.choices) || qq.choices.length < 4 || !!S.gone)) || (S.revealed && p.id !== 'time');
      var on = p.id === 'risk' && S.risk;
      return '<button class="btn pw' + (on ? ' on' : '') + (used(id, p.id) ? ' used' : '') + '" data-pw="' + p.id + '"' + (off && !on ? ' disabled' : '') +
        ' aria-pressed="' + on + '">' + (on ? '🎲 Risk it: ON (×2)' : p.label) + '</button>';
    }).join('');
  }
  $('powers').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pw]');
    if (!b || b.disabled || !S.open) return;
    unlockAudio();
    var id = picker().id, p = b.dataset.pw, c = +S.open.split('-')[0], r = +S.open.split('-')[1], qq = q(c, r);
    if (p === 'fifty') {
      var wrong = qq.choices.map(function (_, i) { return i; }).filter(function (i) { return i !== qq.answer; });
      for (var j = wrong.length - 1; j > 0; j--) { var x = Math.floor(Math.random() * (j + 1)); var y = wrong[j]; wrong[j] = wrong[x]; wrong[x] = y; }
      S.gone = wrong.slice(0, 2); use(id, 'fifty'); tone([523, 392], 0.1); renderQuestion();
    } else if (p === 'time') {
      left = Math.max(0, left) + 20; total = Math.max(total, left); use(id, 'time'); tone([660, 880, 1047], 0.08);
      if (!running) startTimer(); else { endAt = Date.now() + left * 1000; renderClock(); }
      renderQuestion();
    } else if (p === 'free') {
      use(id, 'free'); toast('🎟 Free answer!', false); markOne(true);
    } else if (p === 'risk') {
      S.risk = !S.risk; save(); tone(S.risk ? [392, 523, 659] : [440], 0.08); renderQuestion();
    }
  });
  $('oneTeamOpt').addEventListener('click', function () {
    if (S.open) { toast('Go back to the board first.', false); return; }
    S.oneTeam = !S.oneTeam; save(); renderOneOpt();
  });
  function renderOneOpt() {
    $('oneTeamOpt').textContent = 'Who answers: ' + (S.oneTeam ? 'choosing team only' : 'all teams');
    $('oneTeamOpt').setAttribute('aria-pressed', String(!!S.oneTeam));
  }

  // ---------- ⋯ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('resetScores').classList.remove('armed'); $('resetScores').textContent = 'Reset all scores'; }
  function renderSecs() { $('secsRow').innerHTML = TIMES.map(function (s) { return '<button class="btn" data-secs="' + s + '" aria-pressed="' + (s === S.secs) + '">' + s + ' s</button>'; }).join(''); }
  $('more').addEventListener('click', function () { renderSecs(); renderOneOpt(); disarm(); $('menuBack').hidden = false; });
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
      S.powers = S.powers || {};
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
