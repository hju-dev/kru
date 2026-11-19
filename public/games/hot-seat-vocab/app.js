/* Hot Seat Vocab: one student per team sits facing away from the board. The word is shown; teammates
   describe it without saying it. 60-second rounds, Got it (+1) or Skip. Then the next team.
   A lesson pack (unit "hotseat": { word, meaning, taboo }) also shows the words the team must not say, and after
   the round the meaning of every word that came up, for the student in the hot seat.
   Battle Round (Henry, Nov 18): after every team has had a turn, two teams at a time play the same word with one student
   each; whoever says it first wins it for their team (+2). Tap a team: members, +1 / -1, put it in the hot seat. No bonus cards. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var TIMES = [30, 45, 60, 90];
  var $ = function (id) { return document.getElementById(id); };

  var WORDS = [];
  var teams = [];
  var S = null; // saved: { v, level, seat, order, next, secs, pts, log, last }
  var phase = 'ready', word = -1, got = 0, skipped = 0, seen = []; // seen: this round's words, for the meanings after it
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
    if (left <= 0) { if (phase === 'blive') endBattle(); else endRound(); return; }
    renderClock();
  }
  function startRound() {
    unlockAudio();
    if (!team(S.seat)) S.seat = teams[0].id;
    phase = 'live'; got = 0; skipped = 0; seen = [];
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
    if (word >= 0) seen.push({ w: word, got: false });
    phase = 'over';
    S.last = { t: S.seat, got: got, skipped: skipped };
    S.went = S.went || [];
    if (S.went.indexOf(S.seat) < 0) S.went.push(S.seat); // this team has had its turn in this cycle
    save();
    tone([880, 660, 990], 0.2);
    render();
  }
  function nextTeam() {
    var i = teams.findIndex(function (t) { return t.id === S.seat; });
    S.seat = teams[(i + 1) % teams.length].id;
    S.turn = (S.turn || 0) + 1;
    total = left = S.secs;
    if (cycleDone() && startBattles()) return; // every team has had a turn: Battle Round
    phase = 'ready';
    save();
    render();
  }

  // ---------- Battle Round: after every team has had a turn, two students (one per team) play the same word ----------
  // Pairs: student teams in order (1 v 2, 3 v 4...); an odd team out plays team 1 again. A random student per team (no repeats
  // until the whole team has gone). Whoever says the word first: Henry taps their team (+2). The teacher's team doesn't battle.
  var BATTLE_PTS = 2;
  function cycleDone() { return teams.every(function (t) { return (S.went || []).indexOf(t.id) >= 0; }); }
  function startBattles() {
    S.went = [];
    var studs = teams.filter(function (t) { return !t.teacher; }), pairs = [];
    if (studs.length < 2) { save(); return false; }
    for (var i = 0; i < studs.length; i += 2) pairs.push([studs[i].id, (studs[i + 1] || studs[0]).id]);
    S.battle = { pairs: pairs, i: 0, got: {}, who: {} };
    pickBattleStudents();
    phase = 'bready';
    save(); render();
    return true;
  }
  /** A random student for each of the two teams in the current pair. */
  function pickBattleStudents() {
    var pair = S.battle.pairs[S.battle.i];
    S.bpicked = S.bpicked || {};
    S.battle.got = {}; S.battle.who = {};
    pair.forEach(function (id) {
      var list = team(id).members || [];
      if (!list.length) { S.battle.who[id] = 'anyone'; return; }
      var ids = list.map(function (m) { return String(m.id != null ? m.id : m.no); });
      var r = KruPicker.next(S.bpicked[id] || [], ids);
      S.bpicked[id] = r.picked;
      S.battle.who[id] = list.filter(function (m) { return String(m.id != null ? m.id : m.no) === r.id; })[0].nick;
    });
  }
  function battlePair() { return S.battle ? S.battle.pairs[S.battle.i].map(team) : []; }
  function startBattle() {
    unlockAudio();
    phase = 'blive';
    total = left = S.secs;
    S.battle.got = {};
    nextWord();
    running = true;
    endAt = Date.now() + left * 1000;
    clearInterval(timer);
    timer = setInterval(tick, 200);
    tone([660, 880, 1047]);
    render();
  }
  function endBattle() {
    left = 0; running = false; clearInterval(timer);
    phase = 'bover';
    save();
    tone([880, 660, 990], 0.2);
    render();
  }
  function battleGot(id) {
    S.pts[id] = pts(id) + BATTLE_PTS;
    S.log.push({ t: id, d: BATTLE_PTS, w: word, b: 1 });
    if (S.log.length > 500) S.log.shift();
    S.battle.got[id] = (S.battle.got[id] || 0) + 1;
    Kru.score(id, BATTLE_PTS, 'battle word');
    tone([784, 1047], 0.08);
    toast(team(id).name + ' +' + BATTLE_PTS + ' (' + WORDS[word].word + ')', true);
    nextWord();
    render();
  }
  function nextBattle() {
    S.battle.i++;
    if (S.battle.i < S.battle.pairs.length) { pickBattleStudents(); phase = 'bready'; }
    else { S.battle = null; phase = 'ready'; }
    total = left = S.secs;
    save(); render();
  }
  function skipBattleRound() {
    stopTimerOnly();
    S.battle = null; phase = 'ready'; total = left = S.secs;
    save(); render();
  }
  function stopTimerOnly() { running = false; clearInterval(timer); }

  // ---------- render ----------
  function fitWord() {
    var stage = $('stage'), w = $('word'), size = 84;
    var over = function () { return stage.scrollHeight > stage.clientHeight + 1; };
    if (w.classList.contains('waiting')) {
      w.style.fontSize = '';
      var m = $('meanings'), ms = 24, items = m.children;
      if (m.hidden) return;
      // the list scrolls when a round had many words; first try smaller text, then two columns
      var full = function () { return over() || m.scrollHeight > m.clientHeight + 1; };
      m.style.fontSize = ms + 'px';
      m.classList.remove('two', 'more');
      while (ms > 18 && full()) m.style.fontSize = (ms -= 2) + 'px';
      if (full() && items.length > 3) { m.classList.add('two'); m.style.fontSize = (ms = 22) + 'px'; while (ms > 18 && full()) m.style.fontSize = (ms -= 2) + 'px'; }
      if (full()) { w.style.fontSize = '22px'; m.classList.add('more'); m.scrollTop = 0; }
      return;
    }
    w.style.fontSize = size + 'px';
    while (size > 30 && (w.scrollWidth > w.clientWidth + 1 || stage.scrollHeight > stage.clientHeight + 1)) w.style.fontSize = (size -= 4) + 'px';
  }
  function render() {
    var seat = team(S.seat), battle = phase === 'bready' || phase === 'blive' || phase === 'bover', bp = battle ? battlePair() : [];
    $('seat').innerHTML = battle ? '⚔ <b>Battle Round</b> ' + (S.battle.i + 1) + '/' + S.battle.pairs.length : seat ? 'Hot seat: <b>' + esc(seat.name) + '</b>' : '';
    var w = $('word'), cat = $('cat'), item = WORDS[word];
    $('stage').classList.toggle('live', phase === 'live' || phase === 'blive');
    $('bA').hidden = $('bB').hidden = phase !== 'blive';
    if (phase === 'blive') {
      $('bA').textContent = bp[0].name + ' +' + BATTLE_PTS; $('bA').dataset.t = bp[0].id;
      $('bB').textContent = bp[1].name + ' +' + BATTLE_PTS; $('bB').dataset.t = bp[1].id;
    }
    if (phase === 'blive' && item) {
      w.className = 'word';
      w.textContent = item.word;
      cat.hidden = false;
      cat.textContent = '⚔ BATTLE ×' + BATTLE_PTS;
      cat.className = 'cat';
      $('note').innerHTML = esc(bp[0].name) + ' <b>' + (S.battle.got[bp[0].id] || 0) + '</b> · ' + esc(bp[1].name) + ' <b>' + (S.battle.got[bp[1].id] || 0) + '</b>';
      $('taboo').hidden = !(item.taboo && item.taboo.length);
      $('taboo').innerHTML = item.taboo && item.taboo.length ? '🚫 Don’t say: ' + item.taboo.map(function (t) { return '<b>' + esc(t) + '</b>'; }).join(' · ') : '';
      $('meanings').hidden = true; $('note').hidden = false;
    } else if (phase === 'bready') {
      w.className = 'word waiting';
      cat.hidden = true;
      w.textContent = '⚔ Battle Round! ' + bp[0].name + ' (' + S.battle.who[bp[0].id] + ') vs ' + bp[1].name + ' (' + S.battle.who[bp[1].id] + ')';
      $('note').textContent = 'Both students sit facing the class. The first to say the word wins it: ' + BATTLE_PTS + ' points for their team!';
      $('taboo').hidden = true; $('meanings').hidden = true; $('note').hidden = false;
    } else if (phase === 'bover') {
      w.className = 'word waiting';
      cat.hidden = true;
      var ga = S.battle.got[bp[0].id] || 0, gb = S.battle.got[bp[1].id] || 0;
      w.textContent = 'Battle over! ' + bp[0].name + ' ' + ga + ' · ' + bp[1].name + ' ' + gb + (ga === gb ? ': a draw!' : ': ' + (ga > gb ? bp[0].name : bp[1].name) + ' wins!');
      $('note').textContent = ga + gb ? 'Each word was worth ' + BATTLE_PTS + ' points.' : 'No words this time.';
      $('taboo').hidden = true; $('meanings').hidden = true; $('note').hidden = false;
    } else if (phase === 'live' && item) {
      w.className = 'word';
      w.textContent = item.word;
      cat.hidden = !item.cat;
      cat.textContent = item.cat || '';
      cat.className = 'cat ' + (item.cat || '');
      $('note').innerHTML = 'Got <b>' + got + '</b>' + (skipped ? ' · skipped ' + skipped : '');
      $('taboo').hidden = !(item.taboo && item.taboo.length);
      $('taboo').innerHTML = item.taboo && item.taboo.length ? '🚫 Don’t say: ' + item.taboo.map(function (t) { return '<b>' + esc(t) + '</b>'; }).join(' · ') : '';
      $('meanings').hidden = true; $('note').hidden = false;
    } else if (phase === 'over') {
      w.className = 'word waiting';
      cat.hidden = true;
      var L = S.last || { got: 0, skipped: 0 };
      w.textContent = "Time's up! " + (seat ? seat.name : '') + ' got ' + L.got + ' word' + (L.got === 1 ? '' : 's') + '.';
      $('note').textContent = item ? 'The last word was: ' + item.word + (L.skipped ? ' · skipped ' + L.skipped : '') : '';
      $('taboo').hidden = true;
      // lesson pack: what each word of this round means (the student in the hot seat turns around and reads them)
      var mean = seen.filter(function (x, i) { return WORDS[x.w] && WORDS[x.w].meaning && seen.findIndex(function (y) { return y.w === x.w; }) === i; });
      $('meanings').hidden = !mean.length;
      $('meanings').innerHTML = mean.map(function (x) {
        return '<li class="' + (x.got ? 'got' : '') + '"><b>' + esc(WORDS[x.w].word) + '</b> = ' + esc(WORDS[x.w].meaning) + '</li>';
      }).join('');
      $('note').hidden = !!mean.length; // room for the meanings
    } else {
      w.className = 'word waiting';
      cat.hidden = true;
      w.textContent = (seat ? seat.name : 'A team') + ': one student sits in the hot seat, facing the class. Tap Start round when ready.';
      $('taboo').hidden = true; $('meanings').hidden = true; $('note').hidden = false;
      $('note').textContent = WORDS.length && WORDS[0].cat ? 'Words can be a Person, a Place, a Thing or an Idea.' : 'Describe the word without saying it!';
    }
    var main = $('main');
    main.textContent = { ready: 'Start round', live: 'Got it ✓', bready: 'Start battle', bover: S.battle && S.battle.i + 1 < S.battle.pairs.length ? 'Next battle ▶' : 'Back to the hot seat ▶' }[phase] || 'Next team ▶';
    main.className = 'btn ' + (phase === 'live' ? 'teal' : 'gold');
    main.hidden = phase === 'blive';
    $('skip').hidden = !(phase === 'live' || phase === 'blive' || phase === 'bready');
    $('skip').textContent = phase === 'bready' ? 'Pick again' : 'Skip';
    renderTeams();
    renderClock();
    fitWord();
  }
  function renderTeams() {
    var max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }));
    var inBattle = (phase === 'bready' || phase === 'blive' || phase === 'bover') && S.battle ? S.battle.pairs[S.battle.i] : null;
    $('strip').innerHTML = teams.map(function (t, i) {
      return '<button class="tile' + ((inBattle ? inBattle.indexOf(t.id) >= 0 : t.id === S.seat) ? ' on' : '') + (max > 0 && pts(t.id) === max ? ' lead' : '') + '" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-label="' + esc(t.name) + ', ' + pts(t.id) + ' points">' +
        '<span class="tn">' + Kru.badge(t, COLORS[i % COLORS.length]) + '</span><span class="tp">' + pts(t.id) + '</span></button>';
    }).join('');
  }

  // ---------- points ----------
  function gotIt() {
    var id = S.seat;
    S.pts[id] = pts(id) + 1;
    S.log.push({ t: id, d: 1, w: word });
    if (S.log.length > 500) S.log.shift();
    got++;
    seen.push({ w: word, got: true });
    Kru.score(id, 1, 'word');
    tone([784, 1047], 0.08);
    toast(team(id).name + ' +1 (' + WORDS[word].word + ')', true);
    nextWord();
    render();
  }
  function skip() {
    skipped++;
    seen.push({ w: word, got: false });
    tone([330], 0);
    nextWord();
    render();
  }
  function undo() {
    var L = S.log.pop();
    if (!L) return;
    S.pts[L.t] = pts(L.t) - L.d;
    if (phase === 'live' && L.t === S.seat && got > 0 && !L.b && !L.m) got--;
    if (L.b && S.battle && S.battle.got[L.t]) S.battle.got[L.t]--;
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
    else if (phase === 'bready') startBattle();
    else if (phase === 'bover') nextBattle();
    else nextTeam();
  });
  $('bA').addEventListener('click', function () { if (phase === 'blive') battleGot($('bA').dataset.t); });
  $('bB').addEventListener('click', function () { if (phase === 'blive') battleGot($('bB').dataset.t); });
  $('skip').addEventListener('click', function () {
    if (phase === 'bready') { pickBattleStudents(); save(); render(); } else skip();
  });
  $('meanings').addEventListener('scroll', function () { var m = $('meanings'); m.classList.toggle('more', m.scrollTop + m.clientHeight < m.scrollHeight - 2); });
  $('toastUndo').addEventListener('click', undo);
  // tap a team: who is in it, +1 / -1 points, and "Put in the hot seat"
  var popTeam = null;
  function renderPop() {
    var t = team(popTeam);
    if (!t) return;
    $('teamName').textContent = t.name;
    $('teamMembers').innerHTML = t.teacher ? 'Teacher' : (t.members || []).length ? t.members.map(function (m) { return '<span>' + esc(m.nick) + '</span>'; }).join('') : 'No students';
    $('teamPts').textContent = pts(t.id);
    var idle = phase === 'ready' || phase === 'over';
    $('teamSeat').disabled = !idle;
    $('teamSeat').textContent = idle ? 'Put in the hot seat' : 'Hot seat: after this round';
  }
  function adjust(id, d) {
    S.pts[id] = pts(id) + d;
    S.log.push({ t: id, d: d, m: 1 });
    if (S.log.length > 500) S.log.shift();
    save();
    Kru.score(id, d, 'manual');
    render(); renderPop();
  }
  $('strip').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]');
    if (!b) return;
    popTeam = b.dataset.t;
    renderPop();
    $('teamBack').hidden = false;
  });
  $('ptsPlus').addEventListener('click', function () { adjust(popTeam, 1); });
  $('ptsMinus').addEventListener('click', function () { adjust(popTeam, -1); });
  $('teamClose').addEventListener('click', function () { $('teamBack').hidden = true; });
  $('teamBack').addEventListener('click', function (e) { if (e.target === this) $('teamBack').hidden = true; });
  $('teamSeat').addEventListener('click', function () {
    if (phase !== 'ready' && phase !== 'over') return;
    S.seat = popTeam;
    if (phase === 'over') S.turn = (S.turn || 0) + 1;
    phase = 'ready';
    total = left = S.secs;
    $('teamBack').hidden = true;
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
    renderSecs(); $('undo').disabled = !S.log.length; $('endRound').disabled = phase !== 'live' && phase !== 'blive'; $('skipBattle').disabled = !S.battle; disarm(); $('menuBack').hidden = false;
  });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('secsRow').addEventListener('click', function (e) {
    var b = e.target.closest('[data-secs]');
    if (!b) return;
    S.secs = +b.dataset.secs; save(); renderSecs();
    if (phase !== 'live') { total = left = S.secs; renderClock(); }
  });
  $('endRound').addEventListener('click', function () { closeMenu(); if (phase === 'live') endRound(); else if (phase === 'blive') endBattle(); });
  $('skipBattle').addEventListener('click', function () { closeMenu(); if (S.battle) skipBattleRound(); });
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
    if (!$('menuBack').hidden || !$('teamBack').hidden) return;
    if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); if (!$('main').hidden) $('main').click(); }
    else if ((e.key === 's' || e.key === 'S') && (phase === 'live' || phase === 'blive')) skip();
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
    Promise.all([contentReady, KruQuiz.unit(session)]).then(function (both) {
      var content = both[0], unit = both[1];
      var level = content[session.level] ? session.level : 'M.2';
      // a unit from Henry's lessons: its words (no Person/Place/Thing tag)
      WORDS = unit && unit.hotseat && unit.hotseat.length >= 5 ? unit.hotseat.filter(function (h) { return h && h.word; })
        : unit && unit.words && unit.words.length >= 10 ? unit.words : content[level].words;
      teams = Kru.allTeams();
      KruEnd.setup({ standings: function () { return teams.map(function (t) { return { name: t.name, points: pts(t.id), teacher: !!t.teacher }; }); } });
      var saved = session.resume;
      if (saved && saved.v === 1 && saved.level === level && Array.isArray(saved.order) && saved.order.length === WORDS.length) S = saved;
      else S = { v: 1, level: level, seat: teams[0].id, order: shuffled(WORDS.length), next: 0, secs: 60, pts: {}, log: [], last: null, went: [], battle: null, bpicked: {} };
      S.went = S.went || []; S.bpicked = S.bpicked || {};
      if (!team(S.seat)) S.seat = teams[0].id;
      if (S.battle && (!S.battle.pairs || !S.battle.pairs[S.battle.i] || !battlePair().every(Boolean))) S.battle = null;
      if (S.battle) { phase = 'bready'; pickBattleStudents(); } // a Battle Round that was running: back to its start
      total = left = S.secs;
      render();
      INTRO = KruIntro.forLevel(content, level);
      if (!S.introDone) showIntro().then(function () { S.introDone = true; save(); });
    }).catch(function () {
      $('word').textContent = 'Could not load the words. Close the game and open it again.';
    });
  });
})();
