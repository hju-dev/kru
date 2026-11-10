/* 20 Questions: Henry thinks of the answer; the board shows only the category. Teams (or the whole
   class, in Solo) count down their questions. Got it! -> the winner gets a point for every question left.
   Optional (⋯ menu, Henry Nov 10): a timer (−15 / +15, resets each round) and a name picker that spins to choose
   the student who asks the next question (no repeats until everyone has had a turn). */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var CLASS = 'class'; // the shared counter in Solo mode
  var $ = function (id) { return document.getElementById(id); };

  var CATS = ['Person', 'Place', 'Thing', 'Idea', 'Any noun'];
  var INTRO = [];
  var solo = false;
  var teams = [];      // group: the teams; solo: every student (for picking the winner)
  var S = null;        // saved: { v, total, round, cat, left: {id: n}, winner, done, pts, log, opts, asked, introDone }
  var audio = null;
  var tLeft = 0, tTotal = 0, running = false, endAt = 0, timer = 0;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function save() { Kru.saveState(S); }
  function pts(id) { return S.pts[id] || 0; }
  function team(id) { return teams.find(function (t) { return t.id === id; }); }
  function counters() { return solo ? [CLASS] : teams.map(function (t) { return t.id; }); }
  function left(id) { return S.left[id] == null ? S.total : S.left[id]; }
  function anyAsked() { return counters().some(function (id) { return left(id) < S.total; }); }
  function allOut() { return counters().every(function (id) { return left(id) <= 0; }); }

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
        var t = audio.currentTime + i * (gap || 0.14), o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.35);
      });
    } catch (e) {}
  }

  // ---------- render ----------
  function render() {
    $('info').textContent = 'Round ' + S.round + ' · ' + S.total + ' questions' + (solo ? ' · whole class' : '');
    $('cat').textContent = S.cat || '?';
    // "It's a PERSON", "It's an IDEA", "It could be ANY NOUN"
    $('its').textContent = !S.cat ? "It's a…" : S.cat === 'Any noun' ? 'It could be…' : /^[AEIOU]/i.test(S.cat) ? "It's an…" : "It's a…";
    $('cat').classList.toggle('none', !S.cat);
    $('cats').innerHTML = CATS.concat(['Random']).map(function (c) {
      return '<button class="btn" data-cat="' + esc(c) + '" aria-pressed="' + (c === S.cat) + '">' + esc(c) + '</button>';
    }).join('');
    $('cats').hidden = S.done || anyAsked(); // choose before the first question
    $('soloCount').hidden = !solo;
    if (solo) {
      $('soloLeft').textContent = Math.max(0, left(CLASS));
      $('soloCount').classList.toggle('low', left(CLASS) <= 3);
    }
    var res = $('result');
    if (S.done) {
      var w = S.winner && team(S.winner);
      res.textContent = w ? w.name + ' got it with ' + S.done.left + ' question' + (S.done.left === 1 ? '' : 's') + ' left! +' + S.done.points
        : 'Nobody got it this time!';
      res.hidden = false;
    } else res.hidden = true;
    $('gotIt').hidden = !!S.done;
    $('newRound').hidden = !S.done;
    $('minusClass').hidden = !solo || !!S.done;
    $('minusClass').disabled = left(CLASS) <= 0;
    // Solo: the winners so far go here; Group: a short reminder once the round has a category
    if (!solo) $('hint').textContent = S.done || !S.cat ? '' : 'Tap a team for each question it asks.';
    renderStrip();
    $('totalOut').textContent = S.total;
    $('undo').disabled = !S.log.length;
    // optional timer + name picker
    $('clock').hidden = !S.opts.timer;
    // Solo with the timer and the picker on: a shorter label, so the row fits the phone
    $('minusClass').textContent = S.opts.timer && S.opts.picker ? 'Asked −1' : 'Question asked −1';
    $('pick').hidden = !S.opts.picker || !!S.done;
    $('timerOpt').textContent = 'Timer: ' + (S.opts.timer ? 'ON' : 'off');
    $('timerOpt').setAttribute('aria-pressed', String(!!S.opts.timer));
    $('secsOut').textContent = fmt(S.opts.secs);
    $('secsLess').disabled = S.opts.secs <= 15;
    $('secsMore').disabled = S.opts.secs >= 600;
    $('pickOpt').textContent = 'Name picker (who asks): ' + (S.opts.picker ? 'ON' : 'off');
    $('pickOpt').setAttribute('aria-pressed', String(!!S.opts.picker));
    renderClock();
  }

  // ---------- optional timer ----------
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function renderClock() {
    $('digits').textContent = fmt(tLeft);
    $('digits').className = 'digits' + (tLeft <= 0 ? ' done' : tLeft <= 10 && running ? ' warn' : '');
    $('go').textContent = running ? 'Pause' : tLeft <= 0 ? 'Again' : tLeft < tTotal ? 'Resume' : 'Start';
  }
  function tick() {
    if (!running) return;
    tLeft = (endAt - Date.now()) / 1000;
    if (tLeft <= 0) { tLeft = 0; running = false; clearInterval(timer); tone([880, 660, 990], 0.2); toast("Time's up!", false); }
    renderClock();
  }
  function stopTimer() { if (running) tLeft = Math.max(0, (endAt - Date.now()) / 1000); running = false; clearInterval(timer); }
  function resetTimer() { stopTimer(); tTotal = tLeft = S.opts.secs; renderClock(); }
  $('go').addEventListener('click', function () {
    unlockAudio();
    if (running) { stopTimer(); renderClock(); return; }
    if (tLeft <= 0) tLeft = tTotal;
    running = true; endAt = Date.now() + tLeft * 1000;
    clearInterval(timer); timer = setInterval(tick, 200); renderClock();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });

  // ---------- optional name picker: who asks the next question ----------
  /** Students who can ask: everyone (Solo) or members of teams that still have questions (Group). */
  function askers() {
    var list = [];
    teams.forEach(function (t) {
      if (!solo && left(t.id) <= 0) return;
      t.members.forEach(function (m) { list.push({ key: t.id + ':' + m.no + ':' + m.nick, nick: m.nick, team: t }); });
    });
    return list;
  }
  var spinning = false;
  function pickName() {
    if (spinning) return;
    var all = askers();
    if (!all.length) { toast('Nobody has any questions left.', false); return; }
    unlockAudio();
    var fresh = all.filter(function (a) { return S.asked.indexOf(a.key) < 0; });
    if (!fresh.length) { S.asked = []; fresh = all.slice(); toast('Everyone has had a turn: starting again.', false); }
    var chosen = fresh[Math.floor(Math.random() * fresh.length)];
    S.asked.push(chosen.key); save();
    $('pickBack').hidden = false;
    $('pickTeam').textContent = ''; $('pickLeft').textContent = '';
    $('pickName').classList.remove('landed');
    var steps = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 14 + Math.floor(Math.random() * 5), k = 0;
    spinning = true;
    (function step() {
      if (k < steps) {
        $('pickName').textContent = all[Math.floor(Math.random() * all.length)].nick;
        tone([420 + (k % 4) * 70], 0); k++;
        setTimeout(step, 45 + k * k * 0.6);
        return;
      }
      spinning = false;
      $('pickName').textContent = chosen.nick;
      $('pickName').classList.add('landed');
      $('pickTeam').textContent = solo ? '' : chosen.team.name + ' · ' + Math.max(0, left(chosen.team.id)) + ' questions left';
      var still = all.filter(function (a) { return S.asked.indexOf(a.key) < 0; }).length;
      $('pickLeft').textContent = still ? still + ' still to ask' : 'Everyone has asked once';
      tone([784, 1047], 0.12);
    })();
  }
  $('pick').addEventListener('click', pickName);
  $('pickAgain').addEventListener('click', function () { if (!spinning) pickName(); });
  $('pickOk').addEventListener('click', function () { if (!spinning) $('pickBack').hidden = true; });
  function renderStrip() {
    var strip = $('strip');
    if (solo) {
      // Solo: winners so far as one small line where the hint goes (never squashes the board)
      var winners = teams.filter(function (t) { return pts(t.id); }).sort(function (a, b) { return pts(b.id) - pts(a.id); });
      $('hint').innerHTML = winners.length ? '★ ' + winners.map(function (t) { return esc(t.name) + ' <b>' + pts(t.id) + '</b>'; }).join(' · ') : '';
      strip.hidden = true;
      return;
    }
    strip.hidden = false;
    strip.innerHTML = teams.map(function (t, i) {
      var n = Math.max(0, left(t.id));
      var cls = (S.done && S.winner === t.id ? ' won' : '') + (n <= 0 ? ' out' : n <= 3 ? ' low' : '');
      return '<button class="tile' + cls + '" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-label="' + esc(t.name) + ': ' + n + ' questions left. Tap when they ask one">' +
        '<span class="tn">' + esc(t.name) + '</span><span class="left">' + (n <= 0 ? 'Out' : n) + '</span><span class="tp">' + pts(t.id) + ' pts</span></button>';
    }).join('');
  }

  // ---------- questions ----------
  function ask(id) {
    if (S.done) return;
    if (!S.cat) { toast('Choose the category first.', false); return; }
    if (left(id) <= 0) { toast((solo ? 'No' : team(id).name + ' has no') + ' questions left.', false); return; }
    unlockAudio();
    S.left[id] = left(id) - 1;
    S.log.push({ k: 'q', t: id });
    save();
    tone(left(id) <= 3 ? [440] : [660], 0);
    render();
    var who = solo ? 'Class' : team(id).name;
    toast(who + ': ' + Math.max(0, left(id)) + ' left', true);
    if (allOut()) toast('Nobody has any questions left! Tap Got it! → Nobody got it.', false);
  }
  function undo() {
    var L = S.log.pop();
    if (!L) return;
    if (L.k === 'q') S.left[L.t] = left(L.t) + 1;
    else if (L.k === 'win') {
      if (L.t) { S.pts[L.t] = pts(L.t) - L.d; Kru.score(L.t, -L.d, 'undo'); }
      S.done = null; S.winner = null;
    }
    save();
    render();
    $('toast').hidden = true;
  }
  var toastTimer = 0;
  function toast(text, canUndo) {
    $('toastText').textContent = text;
    $('toastUndo').hidden = !canUndo;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 3500);
  }

  // ---------- winner ----------
  function openWin() {
    var list = solo ? teams.slice().sort(function (a, b) { return (a.members[0].no || 0) - (b.members[0].no || 0); }) : teams;
    $('winTitle').textContent = solo ? 'Who got it? Tap the student.' : 'Which team got it?';
    $('winList').innerHTML = list.map(function (t) {
      var m = t.members[0];
      var label = solo && m ? m.no + ' · ' + t.name : t.name + ' (' + Math.max(0, left(t.id)) + ' left)';
      return '<button class="btn" data-w="' + esc(t.id) + '">' + esc(label) + '</button>';
    }).join('');
    $('winBack').hidden = false;
  }
  function win(id) {
    unlockAudio();
    var n = Math.max(0, solo ? left(CLASS) : left(id));
    var points = Math.max(1, n); // at least 1 point for getting it
    S.pts[id] = pts(id) + points;
    S.winner = id;
    S.done = { left: n, points: points };
    S.log.push({ k: 'win', t: id, d: points });
    Kru.score(id, points, 'guessed it');
    save();
    $('winBack').hidden = true;
    tone([523, 659, 784, 1047], 0.12);
    render();
  }
  function nobody() {
    S.winner = null;
    S.done = { left: 0, points: 0 };
    S.log.push({ k: 'win', t: null, d: 0 });
    save();
    $('winBack').hidden = true;
    render();
  }
  function newRound() {
    resetTimer();
    S.round++;
    S.cat = null; S.left = {}; S.winner = null; S.done = null;
    S.log = S.log.filter(function (L) { return L.k === 'win'; }); // can't undo questions from old rounds
    save();
    render();
  }

  // ---------- buttons ----------
  $('cats').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]');
    if (!b) return;
    unlockAudio();
    var c = b.dataset.cat;
    S.cat = c === 'Random' ? CATS[Math.floor(Math.random() * CATS.length)] : c;
    save();
    tone([784, 988], 0.1);
    render();
  });
  $('strip').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) ask(b.dataset.t); });
  $('minusClass').addEventListener('click', function () { ask(CLASS); });
  $('gotIt').addEventListener('click', function () { if (!S.cat) { toast('Choose the category first.', false); return; } openWin(); });
  $('winList').addEventListener('click', function (e) { var b = e.target.closest('[data-w]'); if (b) win(b.dataset.w); });
  $('nobody').addEventListener('click', nobody);
  $('winClose').addEventListener('click', function () { $('winBack').hidden = true; });
  $('newRound').addEventListener('click', newRound);
  $('toastUndo').addEventListener('click', undo);

  // ---------- ⋯ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('resetScores').classList.remove('armed'); $('resetScores').textContent = 'Reset all scores'; }
  $('more').addEventListener('click', function () { disarm(); render(); $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  document.querySelectorAll('[data-q]').forEach(function (b) {
    b.addEventListener('click', function () {
      S.total = Math.max(1, Math.min(100, S.total + Number(b.dataset.q)));
      if (!anyAsked() && !S.done) S.left = {}; // nobody has asked yet: use it now
      save();
      render();
    });
  });
  $('undo').addEventListener('click', function () { undo(); closeMenu(); });
  $('timerOpt').addEventListener('click', function () { S.opts.timer = !S.opts.timer; if (!S.opts.timer) stopTimer(); save(); render(); });
  function setSecs(d) { S.opts.secs = Math.max(15, Math.min(600, S.opts.secs + d)); save(); resetTimer(); render(); }
  $('secsLess').addEventListener('click', function () { setSecs(-15); });
  $('secsMore').addEventListener('click', function () { setSecs(15); });
  $('pickOpt').addEventListener('click', function () { S.opts.picker = !S.opts.picker; save(); render(); });
  $('howTo').addEventListener('click', function () { closeMenu(); showIntro(); });
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
  function showIntro() { return KruIntro.show(INTRO, { title: '20 Questions' }); }

  Kru.onFinishRequest(function () {
    // Group: every team gets a row. Solo: only students who won points (games.json "results": "scored-solo").
    Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
  });

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (content) {
      CATS = content.categories || CATS;
      INTRO = content.intro || [];
      solo = session.mode === 'solo';
      // the teacher is thinking of the answer, so T. Henry doesn't play
      teams = session.teams.filter(function (t) { return t.members && t.members.length; });
      KruEnd.setup({ standings: function () { return teams.map(function (t) { return { name: t.name, points: pts(t.id), teacher: !!t.teacher }; }).filter(function (x) { return !solo || x.points > 0; }); } });
      var saved = session.resume;
      if (saved && saved.v === 1 && saved.solo === solo) S = saved;
      else S = { v: 1, solo: solo, total: 20, round: 1, cat: null, left: {}, winner: null, done: null, pts: {}, log: [], introDone: false };
      S.opts = S.opts || { timer: false, secs: 60, picker: false };
      S.asked = S.asked || [];
      tTotal = tLeft = S.opts.secs;
      render();
      if (!S.introDone) showIntro().then(function () { S.introDone = true; save(); });
    }).catch(function () {
      $('cat').textContent = 'Could not load. Close and open again.';
    });
  });
})();
