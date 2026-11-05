/* Think Tank Showdown: 4 rounds (Riddle Rush, Spot the Problem, What Would Happen If…?, Final Wager).
   Teams come from the Kru session; questions from content.json for the session's level. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var $ = function (id) { return document.getElementById(id); };

  var ROUNDS = [];
  var teams = [];
  var S = null; // saved state: { v, level, r, qi, shown, revealed, pts, wager, log }
  var left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null;
  var panelTeam = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function save() { Kru.saveState(S); }
  function round() { return ROUNDS[S.r]; }
  function question() { return round().qs[S.qi]; }
  function pts(id) { return S.pts[id] || 0; }

  // ---------- sound (started inside a tap, for the iPhone) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }
  function chime() {
    if (!audio) return;
    try {
      [988, 784, 1175].forEach(function (f, i) {
        var t = audio.currentTime + i * 0.22, o = audio.createOscillator(), g = audio.createGain();
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
    $('go').textContent = running ? 'Pause' : left <= 0 ? 'Restart timer' : left < total ? 'Resume' : 'Start timer';
  }
  function tick() {
    if (!running) return;
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) { left = 0; running = false; clearInterval(timer); chime(); }
    renderClock();
  }
  function stopTimer() {
    if (running) left = Math.max(0, (endAt - Date.now()) / 1000);
    running = false;
    clearInterval(timer);
  }
  function startTimer() {
    unlockAudio();
    if (!S.shown) showQuestion();
    if (left <= 0) left = total;
    running = true;
    endAt = Date.now() + left * 1000;
    clearInterval(timer);
    timer = setInterval(tick, 200);
    renderClock();
  }

  // ---------- stage ----------
  function mainCount() { return round().qs.filter(function (q) { return !q.spare; }).length; }
  function mainIndex() {
    var n = 0;
    for (var j = 0; j <= S.qi; j++) if (!round().qs[j].spare) n++;
    return n;
  }
  function nextMain() {
    var qs = round().qs;
    for (var j = S.qi + 1; j < qs.length; j++) if (!qs[j].spare) return j;
    return -1;
  }

  /** Shrink the question until the stage fits (long questions, or the answer is showing). */
  function fitQuestion() {
    var stage = $('stage'), q = $('q'), why = $('why'), size = 34, whySize = 17;
    var over = function () { return stage.scrollHeight > stage.clientHeight + 1; };
    q.style.fontSize = size + 'px';
    why.style.fontSize = whySize + 'px';
    while (size > 22 && over()) q.style.fontSize = (size -= 2) + 'px';
    while (whySize > 14 && over()) why.style.fontSize = --whySize + 'px';
    while (size > 18 && over()) q.style.fontSize = (size -= 2) + 'px';
  }

  function load(keepTimer) {
    if (!keepTimer) { stopTimer(); total = left = round().secs; }
    var R = round(), Q = question();
    // no bonus cards in the Final Wager (the bets are enough)
    if (R.kind === 'wager') { S.kbonus = null; KruBonus.attach(null); } else bonusRound('r' + S.r + 'q' + S.qi);
    $('round').innerHTML = esc(R.tag) + ': <b>' + esc(R.name) + '</b>';
    $('qnum').innerHTML = Q.spare ? '<span class="spare">Spare question</span>' : '';
    KruCorner.set($('stage'), Q.spare ? '' : mainIndex() + '/' + mainCount());
    $('rule').textContent = R.rule;
    $('rule').hidden = S.revealed; // room for the answer
    var wager = R.kind === 'wager';
    $('q').textContent = S.shown ? Q.q : 'Teams: write your bet first (0–5).';
    $('q').classList.toggle('waiting', !S.shown);
    $('show').hidden = S.shown;
    $('go').hidden = !S.shown && wager;
    $('a').textContent = Q.a || (R.kind === 'ideas' ? 'Example ideas' : '');
    $('why').textContent = Q.why || '';
    $('ans').hidden = !S.revealed;
    $('reveal').disabled = S.revealed;
    var more = nextMain() >= 0;
    $('next').textContent = more ? 'Next ▶' : S.r + 1 < ROUNDS.length ? 'Next round ▶' : 'Last question';
    $('next').disabled = !more && S.r + 1 >= ROUNDS.length;
    $('spare').disabled = !R.qs.some(function (q) { return q.spare; });
    $('prev').disabled = S.r === 0 && S.qi === 0;
    renderTeams();
    renderClock();
    fitQuestion();
  }
  function goTo(r, qi) {
    S.r = r; S.qi = qi;
    S.shown = round().kind !== 'wager'; // wager: question hidden until bets are written
    S.revealed = false;
    save();
    load();
  }
  function showQuestion() { S.shown = true; save(); load(true); }

  // ---------- teams ----------
  function renderTeams() {
    var max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }));
    var wager = round().kind === 'wager';
    $('strip').innerHTML = teams.map(function (t, i) {
      var p = pts(t.id), bet = S.wager[t.id] || 0;
      return '<button class="tile' + (max > 0 && p === max ? ' lead' : '') + '" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-label="' + esc(t.name) + ', ' + p + ' points. Tap to give points">' +
        '<span class="tn">' + esc(t.name) + '</span><span class="tp">' + p + '</span>' +
        (wager ? '<span class="tb">bet ' + bet + '</span>' : '') + '</button>';
    }).join('');
  }

  function addPoints(id, d, why) {
    if (!d) return;
    S.pts[id] = pts(id) + d;
    S.log.push({ t: id, d: d });
    if (S.log.length > 300) S.log.shift();
    save();
    Kru.score(id, d, why);
    renderTeams();
    var team = teams.find(function (t) { return t.id === id; });
    toast(team.name + ' ' + (d > 0 ? '+' : '−') + Math.abs(d));
  }
  function undo() {
    var last = S.log.pop();
    if (!last) return;
    S.pts[last.t] = pts(last.t) - last.d;
    save();
    Kru.score(last.t, -last.d, 'undo');
    renderTeams();
    hideToast();
  }

  var toastTimer = 0;
  function toast(text) {
    $('toastText').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }
  function hideToast() { $('toast').hidden = true; }

  // ---------- points panel ----------
  function maxBet(id) { return Math.max(0, Math.min(5, pts(id))); }
  function openPanel(id) {
    var t = teams.find(function (x) { return x.id === id; });
    if (!t) return;
    panelTeam = t;
    var wager = round().kind === 'wager';
    $('panelName').textContent = t.name;
    $('panelPts').textContent = pts(id) + ' points';
    $('panelMembers').textContent = t.teacher ? 'Teacher' : t.members.map(function (m) { return m.nick; }).join(', ');
    $('panelNormal').hidden = wager;
    $('panelWager').hidden = !wager;
    if (wager) {
      S.wager[id] = Math.min(S.wager[id] || 0, maxBet(id));
      $('bet').textContent = S.wager[id];
    }
    $('panelBack').hidden = false;
  }
  function closePanel() { $('panelBack').hidden = true; panelTeam = null; }

  $('strip').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]');
    if (b) openPanel(b.dataset.t);
  });
  $('panelNormal').addEventListener('click', function (e) {
    var b = e.target.closest('[data-d]');
    if (!b || !panelTeam) return;
    addPoints(panelTeam.id, Number(b.dataset.d), round().name);
    closePanel();
  });
  function setBet(delta) {
    var id = panelTeam.id;
    S.wager[id] = Math.max(0, Math.min(maxBet(id), (S.wager[id] || 0) + delta));
    $('bet').textContent = S.wager[id];
    save();
    renderTeams();
  }
  $('betUp').addEventListener('click', function () { setBet(1); });
  $('betDown').addEventListener('click', function () { setBet(-1); });
  function settleBet(win) {
    var id = panelTeam.id, bet = S.wager[id] || 0;
    S.wager[id] = 0;
    if (bet) addPoints(id, win ? bet : -bet, win ? 'won the wager' : 'lost the wager');
    else { save(); renderTeams(); }
    closePanel();
  }
  $('betWin').addEventListener('click', function () { settleBet(true); });
  $('betLose').addEventListener('click', function () { settleBet(false); });
  $('panelClose').addEventListener('click', closePanel);
  $('panelBack').addEventListener('click', function (e) { if (e.target === this) closePanel(); });

  // ---------- main buttons ----------
  $('show').addEventListener('click', showQuestion);
  $('go').addEventListener('click', function () {
    if (running) { stopTimer(); renderClock(); } else startTimer();
  });
  $('reveal').addEventListener('click', function () {
    stopTimer();
    S.shown = true;
    S.revealed = true;
    save();
    load(true);
    KruBonus.reveal();
  });
  $('next').addEventListener('click', function () {
    var j = nextMain();
    if (j >= 0) goTo(S.r, j);
    else if (S.r + 1 < ROUNDS.length) goTo(S.r + 1, 0);
  });
  $('toastUndo').addEventListener('click', undo);

  // ---------- ⋯ menu ----------
  function openMenu() {
    $('menuRounds').innerHTML = ROUNDS.map(function (R, i) {
      return '<button class="btn" data-r="' + i + '" aria-pressed="' + (i === S.r) + '">' + (i + 1) + '. ' + esc(R.name) + '</button>';
    }).join('');
    $('undo').disabled = !S.log.length;
    disarm($('resetScores'));
    $('menuBack').hidden = false;
  }
  function closeMenu() { $('menuBack').hidden = true; }
  $('more').addEventListener('click', openMenu);
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('menuRounds').addEventListener('click', function (e) {
    var b = e.target.closest('[data-r]');
    if (b) { goTo(+b.dataset.r, 0); closeMenu(); }
  });
  $('prev').addEventListener('click', function () {
    if (S.qi > 0) goTo(S.r, S.qi - 1);
    else if (S.r > 0) goTo(S.r - 1, ROUNDS[S.r - 1].qs.length - 1);
    closeMenu();
  });
  $('spare').addEventListener('click', function () {
    var qs = round().qs, sp = [];
    qs.forEach(function (q, j) { if (q.spare) sp.push(j); });
    if (!sp.length) return;
    var k = sp.find(function (j) { return j > S.qi; });
    goTo(S.r, k === undefined ? sp[0] : k);
    closeMenu();
  });
  $('undo').addEventListener('click', function () { undo(); closeMenu(); });
  function disarm(btn) { btn.classList.remove('armed'); btn.textContent = 'Reset all scores'; }
  $('resetScores').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = 'Tap again: all scores back to 0';
      setTimeout(function () { disarm(btn); }, 3500);
      return;
    }
    teams.forEach(function (t) {
      if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'reset');
    });
    S.pts = {}; S.wager = {}; S.log = [];
    save();
    closeMenu();
    load(true);
  });

  document.addEventListener('keydown', function (e) {
    if (!$('panelBack').hidden || !$('menuBack').hidden) return;
    if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
    else if (e.key === 'a' || e.key === 'A') $('reveal').click();
    else if (e.key === 'ArrowRight') $('next').click();
    else if (e.key === 'ArrowLeft') $('prev').click();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', function () { fitQuestion(); });

  Kru.onFinishRequest(function () {
    Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
  });

  // ---------- start ----------
  // ---------- question pools: each game draws "play" main + "spares" spare questions per round ----------
  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }
  function newDraw(pools) {
    return pools.map(function (r) { return shuffled(r.qs.length).slice(0, (r.play || r.qs.length) + (r.spares || 0)); });
  }
  function validDraw(pools, draw) {
    return Array.isArray(draw) && draw.length === pools.length && draw.every(function (d, i) {
      return Array.isArray(d) && d.length && d.every(function (k) { return k >= 0 && k < pools[i].qs.length; });
    });
  }
  function drawRounds(pools, draw) {
    return pools.map(function (r, i) {
      var copy = {};
      Object.keys(r).forEach(function (k) { copy[k] = r[k]; });
      copy.qs = draw[i].map(function (k, j) {
        var q = r.qs[k];
        return { q: q.q, a: q.a, why: q.why, todo: q.todo, spare: j >= (r.play || draw[i].length) };
      });
      return copy;
    });
  }

  // How to play slides: before the game starts, and from the ⋯ menu
  var INTRO = [];
  function showIntro() { return KruIntro.show(INTRO, { title: 'Think Tank Showdown' }); }
  $('howTo').addEventListener('click', function () { $('menuBack').hidden = true; showIntro(); });

  // ---------- bonus cards (shared: games/shared/kru-bonus.js) ----------
  // before cards pop up when a round starts; secret cards at the reveal. Points: tap the ★ chip, then teams.
  function bonusRound(key) { var b = KruBonus.next(S.kbonus, key); if (b !== S.kbonus) { S.kbonus = b; save(); } }

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (content) {
      var level = content[session.level] ? session.level : 'M.2';
      var pools = content[level].rounds;
      teams = Kru.allTeams();
      KruEnd.setup({ standings: function () { return teams.map(function (t) { return { name: t.name, points: pts(t.id), teacher: !!t.teacher }; }); } });
      KruBonus.setup({ cards: content.bonus, bar: $('more').parentNode, beforeEl: $('more'), teams: function () { return teams; }, save: function () { save(); },
        award: function (id, d, card) { addPoints(id, d, 'bonus: ' + card.name); } });
      var saved = session.resume;
      if (saved && saved.v === 2 && saved.level === level && validDraw(pools, saved.draw)) {
        S = saved;
        ROUNDS = drawRounds(pools, S.draw);
      }
      if (S && ROUNDS[S.r] && ROUNDS[S.r].qs[S.qi]) {
        S.pts = S.pts || {}; S.wager = S.wager || {}; S.log = S.log || [];
        load();
      } else {
        // a new game: a fresh random mix of questions from each round's pool
        S = { v: 2, level: level, draw: newDraw(pools), r: 0, qi: 0, shown: true, revealed: false, pts: {}, wager: {}, log: [] };
        ROUNDS = drawRounds(pools, S.draw);
        goTo(0, 0);
      INTRO = KruIntro.forLevel(content, level);
      if (!S.introDone) showIntro().then(function () { S.introDone = true; save(); });
      }
    }).catch(function () {
      $('q').textContent = 'Could not load the questions. Close the game and open it again.';
    });
  });
})();
