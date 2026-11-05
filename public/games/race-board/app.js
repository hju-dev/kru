/* Race Board: a 30-square race. On its turn a team answers a question; right = roll the dice and move.
   Special squares: ★ forward, ⚠ back, 🎲 roll again. First to FINISH wins; the race goes on for 2nd and 3rd.
   Points (for the Sheet and the podium) = squares moved, plus 3 / 2 / 1 for finishing 1st / 2nd / 3rd.
   Questions: Quiz Battle's built-in sets for the level + Henry's own from the Questions tab, shuffled.
   The teacher's team doesn't race. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var FACES = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  var TIMES = [10, 20, 30, 45, 60];
  var FINISH = 29; // squares 0 (START) to 29 (FINISH)
  var SPECIAL = { 3: { t: 'go', n: 2 }, 7: { t: 'back', n: 2 }, 12: { t: 'again' }, 16: { t: 'go', n: 3 }, 21: { t: 'back', n: 3 }, 25: { t: 'again' } };
  var BONUS = [3, 2, 1];
  var $ = function (id) { return document.getElementById(id); };
  var esc = KruQuiz.esc;

  var POOL = [], teams = [], racers = [], INTRO = [];
  var S = null; // saved: { v, level, pos: {id: square}, finished: [ids], turn, qorder, qi, secs, last }
  var busy = false, left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null;

  function save() { Kru.saveState(S); }
  function shuffle(a) {
    for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function pos(id) { return S.pos[id] || 0; }
  function points(id) { var f = S.finished.indexOf(id); return pos(id) + (f >= 0 && f < BONUS.length ? BONUS[f] : 0); }
  function color(t) { return COLORS[teams.indexOf(t) % COLORS.length]; }
  function current() { return racers[S.turn % Math.max(1, racers.length)]; }
  function question() { return POOL[S.qorder[S.qi % S.qorder.length]]; }

  /** Where a square sits on the screen: a snake, 10 per row. */
  function cell(n) {
    var row = Math.floor(n / 10), col = n % 10;
    return { row: row + 1, col: row % 2 ? 10 - col : col + 1 };
  }

  // ---------- sound (after a tap) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function tone(freqs, gap, dur) {
    if (!audio) return;
    try {
      freqs.forEach(function (f, i) {
        var t = audio.currentTime + i * (gap || 0.15), o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.33, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.25));
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.25) + 0.05);
      });
    } catch (e) {}
  }

  // ---------- the track ----------
  function renderTrack() {
    var html = '';
    for (var n = 0; n <= FINISH; n++) {
      var c = cell(n), sp = SPECIAL[n];
      var cls = 'sq' + (n === 0 ? ' start' : n === FINISH ? ' finish' : '') + (sp ? ' ' + sp.t : '');
      var label = n === 0 ? 'START' : n === FINISH ? 'FINISH' : String(n);
      var tag = sp ? (sp.t === 'go' ? '★ +' + sp.n : sp.t === 'back' ? '⚠ −' + sp.n : '🎲 again') : '';
      var here = racers.filter(function (t) { return pos(t.id) === n; }).map(function (t) {
        return '<i class="piece' + (current() && t.id === current().id ? ' now' : '') + '" style="background:' + color(t) + '">' + (racers.indexOf(t) + 1) + '</i>';
      }).join('');
      html += '<div class="' + cls + '" style="grid-row:' + c.row + ';grid-column:' + c.col + '"><span class="num">' + label + '</span>' +
        (tag ? '<span class="tag">' + tag + '</span>' : '') + '<span class="pieces">' + here + '</span></div>';
    }
    $('track').innerHTML = html;
    $('legend').innerHTML = racers.map(function (t, i) {
      var f = S.finished.indexOf(t.id);
      return '<span class="lg' + (current() && t.id === current().id ? ' now' : '') + '"><i style="background:' + color(t) + '">' + (i + 1) + '</i>' + esc(t.name) +
        (f >= 0 && f < 3 ? ' <b>' + ['1st', '2nd', '3rd'][f] + '</b>' : f >= 3 ? ' <b>done</b>' : '') + '</span>';
    }).join('');
    var t = current(), done = S.finished.length >= racers.length;
    $('turn').innerHTML = done ? 'Race over!' : t ? '<span class="dot" style="background:' + color(t) + '"></span>' + esc(t.name) + "'s turn" : '';
    $('ask').disabled = done || busy || !t;
  }

  // ---------- turns ----------
  function nextTurn() {
    if (S.finished.length >= racers.length) { S.turn = 0; save(); renderTrack(); return; }
    for (var k = 0; k < racers.length; k++) {
      S.turn = (S.turn + 1) % racers.length;
      if (S.finished.indexOf(current().id) < 0) break;
    }
    save();
    renderTrack();
  }
  function setPos(id, n) {
    var before = points(id);
    S.pos[id] = Math.max(0, Math.min(FINISH, n));
    if (S.pos[id] === FINISH && S.finished.indexOf(id) < 0) S.finished.push(id);
    var d = points(id) - before;
    if (d) Kru.score(id, d, 'race board');
  }
  /** Moves a piece one square at a time, then does what the square says. */
  function move(id, steps, then) {
    var dir = steps < 0 ? -1 : 1, n = Math.abs(steps);
    (function step() {
      if (!n || (dir > 0 && pos(id) >= FINISH) || (dir < 0 && pos(id) <= 0)) { save(); renderTrack(); then(); return; }
      setPos(id, pos(id) + dir); n--;
      tone([dir > 0 ? 520 + pos(id) * 12 : 300], 0, 0.08);
      renderTrack();
      setTimeout(step, 260);
    })();
  }
  function landed(id) {
    var t = racers.filter(function (x) { return x.id === id; })[0], p = pos(id), sp = SPECIAL[p];
    if (p === FINISH) {
      var place = S.finished.indexOf(id);
      tone([523, 659, 784, 1047], 0.12, 0.4);
      toast(t.name + ' finished ' + ['1st', '2nd', '3rd'][place] + (place < 3 ? '! +' + BONUS[place] + ' bonus' : '!'), false);
      busy = false; nextTurn(); return;
    }
    if (sp && sp.t === 'go') { toast('★ ' + t.name + ': forward ' + sp.n + '!', false); tone([784, 988], 0.1); setTimeout(function () { move(id, sp.n, function () { landed(id); }); }, 500); return; }
    if (sp && sp.t === 'back') { toast('⚠ ' + t.name + ': back ' + sp.n + '!', false); tone([330, 262], 0.15); setTimeout(function () { move(id, -sp.n, function () { busy = false; nextTurn(); }); }, 500); return; }
    if (sp && sp.t === 'again') { toast('🎲 ' + t.name + ': roll again!', false); setTimeout(function () { roll(id); }, 700); return; }
    busy = false; nextTurn();
  }

  // ---------- the dice ----------
  function dieHtml(n) {
    var h = '';
    for (var i = 0; i < 9; i++) h += '<span class="pip' + (FACES[n].indexOf(i) >= 0 ? ' on' : '') + '"></span>';
    return h;
  }
  function roll(id) {
    unlockAudio();
    busy = true; renderTrack();
    var value = 1 + Math.floor(Math.random() * 6), k = 0;
    var t = racers.filter(function (x) { return x.id === id; })[0];
    $('diceText').textContent = t.name + ' rolls…';
    $('diceBack').hidden = false;
    $('die').classList.add('rolling');
    (function spin() {
      $('die').innerHTML = dieHtml(k < 11 ? 1 + Math.floor(Math.random() * 6) : value);
      tone([300 + k * 35], 0, 0.05);
      if (++k <= 11) { setTimeout(spin, 50 + k * 14); return; }
      $('die').classList.remove('rolling');
      $('diceText').textContent = t.name + ' rolled ' + value + '!';
      tone([880], 0, 0.2);
      S.last = { id: id, from: pos(id), finished: S.finished.slice(), turn: S.turn };
      setTimeout(function () {
        $('diceBack').hidden = true;
        move(id, value, function () { landed(id); });
      }, 900);
    })();
  }

  // ---------- the question ----------
  function renderClock() {
    var s = Math.max(0, Math.ceil(left));
    $('digits').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
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
  var shown = false;
  function renderQuestion() {
    var q = question(), t = current();
    $('qWho').textContent = t.name;
    $('qTopic').textContent = q.set;
    $('qBody').innerHTML = KruQuiz.html(q, shown);
    $('reveal').disabled = shown;
    KruQuiz.fit($('stage'));
  }
  function ask() {
    if (busy || !current()) return;
    unlockAudio();
    shown = false;
    stopTimer(); total = left = S.secs; renderClock();
    $('qBack').hidden = false;
    renderQuestion();
    tone([660, 880], 0.12);
  }
  function closeQuestion() {
    stopTimer();
    $('qBack').hidden = true;
    S.qi = (S.qi + 1) % S.qorder.length;
    if (S.qi === 0) S.qorder = shuffle(range(POOL.length));
    save();
  }

  // ---------- toast ----------
  var toastTimer = 0;
  function toast(text) {
    $('toastText').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 3500);
  }

  // ---------- buttons ----------
  $('ask').addEventListener('click', ask);
  $('go').addEventListener('click', function () { if (running) { stopTimer(); renderClock(); } else startTimer(); });
  $('reveal').addEventListener('click', function () { unlockAudio(); stopTimer(); renderClock(); shown = true; tone([523, 659]); renderQuestion(); });
  $('right').addEventListener('click', function () { var id = current().id; closeQuestion(); roll(id); });
  $('wrong').addEventListener('click', function () {
    unlockAudio();
    var t = current();
    closeQuestion();
    tone([330, 262], 0.15);
    toast(t.name + ': no move this time.');
    nextTurn();
  });

  // ---------- ⋯ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('restart').classList.remove('armed'); $('restart').textContent = 'Start the race again'; }
  function renderSecs() { $('secsRow').innerHTML = TIMES.map(function (s) { return '<button class="btn" data-secs="' + s + '" aria-pressed="' + (s === S.secs) + '">' + s + ' s</button>'; }).join(''); }
  $('more').addEventListener('click', function () { renderSecs(); disarm(); $('undoMove').disabled = !S.last || busy; $('skip').disabled = busy; $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('secsRow').addEventListener('click', function (e) { var b = e.target.closest('[data-secs]'); if (!b) return; S.secs = +b.dataset.secs; save(); renderSecs(); });
  $('skip').addEventListener('click', function () { closeMenu(); nextTurn(); });
  $('undoMove').addEventListener('click', function () {
    var L = S.last;
    if (!L || busy) return;
    var before = points(L.id);
    S.finished = L.finished; S.pos[L.id] = L.from; S.turn = L.turn; S.last = null;
    var d = points(L.id) - before;
    if (d) Kru.score(L.id, d, 'undo');
    save(); closeMenu(); renderTrack();
  });
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: 'Race Board' }); });
  $('restart').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again: everyone back to START'; setTimeout(disarm, 3500); return; }
    racers.forEach(function (t) { var p = points(t.id); if (p) Kru.score(t.id, -p, 'reset'); });
    S.pos = {}; S.finished = []; S.turn = 0; S.last = null;
    save(); closeMenu(); renderTrack();
  });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden) return;
    if (!$('qBack').hidden) {
      if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
      else if (e.key === 'a' || e.key === 'A') $('reveal').click();
    } else if (e.code === 'Space') { e.preventDefault(); ask(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', function () { if (!$('qBack').hidden) KruQuiz.fit($('stage')); });

  Kru.onFinishRequest(function () { Kru.finish(teams.map(function (t) { return { teamId: t.id, points: t.teacher ? 0 : points(t.id) }; })); });

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    Promise.all([contentReady, KruQuiz.load(session.level, session)]).then(function (both) {
      var c = both[0], Q = both[1];
      POOL = [];
      Q.builtIn.concat(Q.fromSheet).forEach(function (s) { s.questions.forEach(function (q) { POOL.push(Object.assign({ set: s.name }, q)); }); });
      teams = Kru.allTeams();
      racers = teams.filter(function (t) { return !t.teacher; });
      KruEnd.setup({ standings: function () { return racers.map(function (t) { return { name: t.name, points: points(t.id) }; }); } });
      var saved = session.resume;
      if (saved && saved.v === 1 && saved.level === Q.level && Array.isArray(saved.qorder) && saved.qorder.length === POOL.length) S = saved;
      else S = { v: 1, level: Q.level, pos: {}, finished: [], turn: 0, qorder: shuffle(range(POOL.length)), qi: 0, secs: 20, last: null, introDone: false };
      renderTrack();
      INTRO = KruIntro.forLevel(c, Q.level);
      if (!S.introDone) KruIntro.show(INTRO, { title: 'Race Board' }).then(function () { S.introDone = true; save(); });
    }).catch(function (err) {
      $('track').textContent = 'Could not load the questions. Close the game and open it again.';
      if (window.console) console.error(err);
    });
  });
})();
