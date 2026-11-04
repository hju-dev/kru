/* Hot Seat Vocab: one student per team sits facing away from the board. The word is shown; teammates
   describe it without saying it. 60-second rounds, Got it (+1) or Skip. Then the next team. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var TIMES = [30, 45, 60, 90];
  var $ = function (id) { return document.getElementById(id); };

  var WORDS = [];
  var teams = [];
  var S = null; // saved: { v, level, seat, order, next, secs, pts, log, last }
  var phase = 'ready', word = -1, got = 0, skipped = 0;
  var left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function save() { Kru.saveState(S); }
  function pts(id) { return S.pts[id] || 0; }
  function team(id) { return teams.find(function (t) { return t.id === id; }); }
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
        var t = audio.currentTime + i * (gap || 0.15), o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.38, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.35);
      });
    } catch (e) {}
  }

  // ---------- words ----------
  function nextWord() {
    if (S.next >= S.order.length) { S.order = shuffled(WORDS.length); S.next = 0; }
    word = S.order[S.next++];
    save();
  }

  // ---------- timer ----------
  function renderClock() {
    $('digits').textContent = fmt(left);
    $('fill').style.transform = 'scaleX(' + (total ? Math.max(0, left) / total : 0) + ')';
    $('digits').className = 'digits' + (phase === 'over' ? ' done' : left <= 10 && running ? ' warn' : '');
  }
  function tick() {
    if (!running) return;
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) { endRound(); return; }
    renderClock();
  }
  function startRound() {
    unlockAudio();
    if (!team(S.seat)) S.seat = teams[0].id;
    phase = 'live'; got = 0; skipped = 0;
    total = left = S.secs;
    nextWord();
    running = true;
    endAt = Date.now() + left * 1000;
    clearInterval(timer);
    timer = setInterval(tick, 200);
    tone([660, 880]);
    render();
  }
  function endRound() {
    left = 0; running = false; clearInterval(timer);
    phase = 'over';
    S.last = { t: S.seat, got: got, skipped: skipped };
    save();
    tone([880, 660, 990], 0.2);
    render();
  }
  function nextTeam() {
    var i = teams.findIndex(function (t) { return t.id === S.seat; });
    S.seat = teams[(i + 1) % teams.length].id;
    phase = 'ready';
    total = left = S.secs;
    save();
    render();
  }

  // ---------- render ----------
  function fitWord() {
    var stage = $('stage'), w = $('word'), size = 84;
    if (w.classList.contains('waiting')) { w.style.fontSize = ''; return; }
    w.style.fontSize = size + 'px';
    while (size > 30 && (w.scrollWidth > w.clientWidth + 1 || stage.scrollHeight > stage.clientHeight + 1)) w.style.fontSize = (size -= 4) + 'px';
  }
  function render() {
    var seat = team(S.seat);
    $('seat').innerHTML = seat ? 'Hot seat: <b>' + esc(seat.name) + '</b>' : '';
    var w = $('word'), cat = $('cat'), item = WORDS[word];
    $('stage').classList.toggle('live', phase === 'live');
    if (phase === 'live' && item) {
      w.className = 'word';
      w.textContent = item.word;
      cat.hidden = !item.cat;
      cat.textContent = item.cat || '';
      cat.className = 'cat ' + (item.cat || '');
      $('note').innerHTML = 'Got <b>' + got + '</b>' + (skipped ? ' · skipped ' + skipped : '');
    } else if (phase === 'over') {
      w.className = 'word waiting';
      cat.hidden = true;
      var L = S.last || { got: 0, skipped: 0 };
      w.textContent = "Time's up! " + (seat ? seat.name : '') + ' got ' + L.got + ' word' + (L.got === 1 ? '' : 's') + '.';
      $('note').textContent = item ? 'The last word was: ' + item.word + (L.skipped ? ' · skipped ' + L.skipped : '') : '';
    } else {
      w.className = 'word waiting';
      cat.hidden = true;
      w.textContent = (seat ? seat.name : 'A team') + ': one student sits in the hot seat, facing the class. Tap Start round when ready.';
      $('note').textContent = WORDS.length && WORDS[0].cat ? 'Words can be a Person, a Place, a Thing or an Idea.' : 'Describe the word without saying it!';
    }
    var main = $('main');
    main.textContent = phase === 'ready' ? 'Start round' : phase === 'live' ? 'Got it ✓' : 'Next team ▶';
    main.className = 'btn ' + (phase === 'live' ? 'teal' : 'gold');
    $('skip').hidden = phase !== 'live';
    renderTeams();
    renderClock();
    fitWord();
  }
  function renderTeams() {
    var max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }));
    $('strip').innerHTML = teams.map(function (t, i) {
      return '<button class="tile' + (t.id === S.seat ? ' on' : '') + (max > 0 && pts(t.id) === max ? ' lead' : '') + '" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-label="' + esc(t.name) + ', ' + pts(t.id) + ' points">' +
        '<span class="tn">' + esc(t.name) + '</span><span class="tp">' + pts(t.id) + '</span></button>';
    }).join('');
  }

  // ---------- points ----------
  function gotIt() {
    var id = S.seat;
    S.pts[id] = pts(id) + 1;
    S.log.push({ t: id, d: 1, w: word });
    if (S.log.length > 500) S.log.shift();
    got++;
    Kru.score(id, 1, 'word');
    tone([784, 1047], 0.08);
    toast(team(id).name + ' +1 (' + WORDS[word].word + ')', true);
    nextWord();
    render();
  }
  function skip() {
    skipped++;
    tone([330], 0);
    nextWord();
    render();
  }
  function undo() {
    var L = S.log.pop();
    if (!L) return;
    S.pts[L.t] = pts(L.t) - L.d;
    if (phase === 'live' && L.t === S.seat && got > 0) got--;
    save();
    Kru.score(L.t, -L.d, 'undo');
    render();
    $('toast').hidden = true;
  }
  var toastTimer = 0;
  function toast(text, canUndo) {
    $('toastText').textContent = text;
    $('toastUndo').hidden = !canUndo;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 3000);
  }

  $('main').addEventListener('click', function () {
    if (phase === 'ready') startRound();
    else if (phase === 'live') gotIt();
    else nextTeam();
  });
  $('skip').addEventListener('click', skip);
  $('toastUndo').addEventListener('click', undo);
  $('strip').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]');
    if (!b) return;
    if (phase === 'live') { toast('Finish this round first (or ⋯ → End this round now)', false); return; }
    S.seat = b.dataset.t;
    phase = 'ready';
    total = left = S.secs;
    save();
    render();
  });

  // ---------- ⋯ menu ----------
  function renderSecs() {
    $('secsRow').innerHTML = TIMES.map(function (s) { return '<button class="btn" data-secs="' + s + '" aria-pressed="' + (s === S.secs) + '">' + fmt(s) + '</button>'; }).join('');
  }
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('resetScores').classList.remove('armed'); $('resetScores').textContent = 'Reset all scores'; }
  $('more').addEventListener('click', function () {
    renderSecs(); $('undo').disabled = !S.log.length; $('endRound').disabled = phase !== 'live'; disarm(); $('menuBack').hidden = false;
  });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('secsRow').addEventListener('click', function (e) {
    var b = e.target.closest('[data-secs]');
    if (!b) return;
    S.secs = +b.dataset.secs; save(); renderSecs();
    if (phase !== 'live') { total = left = S.secs; renderClock(); }
  });
  $('endRound').addEventListener('click', function () { closeMenu(); if (phase === 'live') endRound(); });
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
    save(); closeMenu(); render();
  });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden) return;
    if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); $('main').click(); }
    else if ((e.key === 's' || e.key === 'S') && phase === 'live') skip();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', fitWord);

  Kru.onFinishRequest(function () {
    Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
  });

  // How to play slides: before the game starts, and from the ⋯ menu
  var INTRO = [];
  function showIntro() { return KruIntro.show(INTRO, { title: 'Hot Seat Vocab' }); }
  $('howTo').addEventListener('click', function () { $('menuBack').hidden = true; showIntro(); });

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (content) {
      var level = content[session.level] ? session.level : 'M.2';
      WORDS = content[level].words;
      teams = Kru.allTeams();
      var saved = session.resume;
      if (saved && saved.v === 1 && saved.level === level && Array.isArray(saved.order) && saved.order.length === WORDS.length) S = saved;
      else S = { v: 1, level: level, seat: teams[0].id, order: shuffled(WORDS.length), next: 0, secs: 60, pts: {}, log: [], last: null };
      if (!team(S.seat)) S.seat = teams[0].id;
      total = left = S.secs;
      render();
      INTRO = KruIntro.forLevel(content, level);
      if (!S.introDone) showIntro().then(function () { S.introDone = true; save(); });
    }).catch(function () {
      $('word').textContent = 'Could not load the words. Close the game and open it again.';
    });
  });
})();
