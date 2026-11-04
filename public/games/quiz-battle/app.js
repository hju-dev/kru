/* Quiz Battle: one question at a time with a timer. Teams hold up answers. Henry taps the teams that were
   right (+1, or +2 on a DOUBLE question; tap again to take it back), then Reveal.
   Question sets: built-in (content.json) + Henry's own from the Questions tab of his Sheet (session.questions). */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var TIMES = [10, 20, 30, 45, 60];
  var $ = function (id) { return document.getElementById(id); };

  var builtIn = [], fromSheet = [], problems = [];
  var teams = [];
  var S = null; // saved: { v, level, setKey, pos, revealed, right, secs, pts, log }
  var left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function save() { Kru.saveState(S); }
  function pts(id) { return S.pts[id] || 0; }
  function team(id) { return teams.find(function (t) { return t.id === id; }); }
  var ALL = null; // "All topics, shuffled": every built-in question for this level
  function setByKey(key) {
    if (!key) return null;
    if (key === 'all') return ALL;
    var i = Number(key.slice(2));
    return key.charAt(0) === 'b' ? builtIn[i] || null : fromSheet[i] || null;
  }
  function set() { return setByKey(S.setKey); }
  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }
  function question() {
    var s = set();
    if (!s) return null;
    var i = S.order && S.order.length === s.questions.length ? S.order[S.pos] : S.pos;
    return s.questions[i];
  }
  function right() { return S.right[S.pos] || (S.right[S.pos] = []); }
  function worth() { var q = question(); return q && q.double ? 2 : 1; }

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

  // ---------- timer ----------
  function renderClock() {
    $('digits').textContent = fmt(left);
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

  // ---------- question ----------
  function fit() {
    var stage = $('stage'), q = $('q'), ch = $('choices'), qs = 32, cs = 24;
    var over = function () { return stage.scrollHeight > stage.clientHeight + 1; };
    q.style.fontSize = qs + 'px';
    ch.style.setProperty('--ch', cs + 'px');
    while (qs > 22 && over()) q.style.fontSize = (qs -= 2) + 'px';
    while (cs > 18 && over()) ch.style.setProperty('--ch', (cs -= 2) + 'px');
    while (qs > 18 && over()) q.style.fontSize = (qs -= 2) + 'px';
  }
  function render() {
    var s = set(), q = question(), shown = !!S.revealed[S.pos];
    if (!s || !q) return;
    $('qnum').textContent = s.name + ' · Question ' + (S.pos + 1) + ' of ' + s.questions.length;
    $('double').hidden = !q.double;
    $('q').textContent = q.q;
    if (q.choices) {
      $('choices').hidden = false;
      $('short').hidden = true;
      $('shortAns').hidden = true;
      $('choices').innerHTML = q.choices.map(function (c, i) {
        var cls = shown ? (i === q.answer ? ' right' : ' wrong') : '';
        return '<div class="choice' + cls + '"><span class="letter">' + 'ABCD'.charAt(i) + '</span><span>' + esc(c) + '</span></div>';
      }).join('');
    } else {
      $('choices').hidden = true;
      $('short').hidden = shown;
      $('shortAns').hidden = !shown;
      $('shortAns').textContent = String(q.answer);
    }
    $('reveal').disabled = shown;
    var last = S.pos + 1 >= s.questions.length;
    $('next').textContent = last ? 'Finish set ▶' : 'Next ▶';
    renderTeams();
    renderClock();
    fit();
  }
  function goTo(pos) {
    var s = set();
    if (!s) return;
    if (pos >= s.questions.length) {
      toast('Set finished! Choose another set, or tap the home button → Finish.', false);
      openSets();
      return;
    }
    S.pos = Math.max(0, pos);
    save();
    resetTimer();
    render();
  }

  // ---------- teams (tap = right / not right) ----------
  function renderTeams() {
    var r = right();
    var max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }));
    $('strip').innerHTML = teams.map(function (t, i) {
      var ok = r.indexOf(t.id) >= 0;
      return '<button class="tile' + (ok ? ' right' : '') + (max > 0 && pts(t.id) === max ? ' lead' : '') + '" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-pressed="' + ok + '" aria-label="' + esc(t.name) + ', ' + pts(t.id) + ' points. Tap if they were right">' +
        '<span class="tn">' + esc(t.name) + '</span><span class="tp">' + pts(t.id) + '</span>' + (ok ? '<span class="tick">✓ +' + worth() + '</span>' : '') + '</button>';
    }).join('');
  }
  function toggleRight(id) {
    unlockAudio();
    var r = right(), i = r.indexOf(id), d = worth();
    if (i >= 0) {
      // tapped again: take the points back
      r.splice(i, 1);
      S.pts[id] = pts(id) - d;
      Kru.score(id, -d, 'not right after all');
      toast(team(id).name + ' −' + d, false);
    } else {
      r.push(id);
      S.pts[id] = pts(id) + d;
      Kru.score(id, d, 'right');
      tone([784, 988]);
      toast(team(id).name + ' +' + d + (d === 2 ? ' (double)' : ''), false);
    }
    save();
    renderTeams();
  }
  var toastTimer = 0;
  function toast(text) {
    $('toastText').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 3500);
  }

  $('strip').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) toggleRight(b.dataset.t); });
  $('go').addEventListener('click', function () { if (running) { stopTimer(); renderClock(); } else startTimer(); });
  $('reveal').addEventListener('click', function () { unlockAudio(); stopTimer(); S.revealed[S.pos] = true; save(); tone([523, 659]); render(); });
  $('next').addEventListener('click', function () { goTo(S.pos + 1); });

  // ---------- choosing a set ----------
  function openSets() {
    function btn(s, key) {
      var doubles = s.questions.filter(function (q) { return q.double; }).length;
      return '<button class="btn" data-set="' + key + '"><b>' + esc(s.name) + '</b><br /><small>' + s.questions.length + ' questions' + (doubles ? ' · ' + doubles + ' double' : '') + '</small></button>';
    }
    var html = '<h3>Built in</h3>' + btn(ALL, 'all') + builtIn.map(function (s, i) { return btn(s, 'b:' + i); }).join('');
    html += '<h3>From your Sheet</h3>' + (fromSheet.length
      ? fromSheet.map(function (s, i) { return btn(s, 's:' + i); }).join('')
      : '<p class="muted">None yet for this level. Add questions in the Questions tab of your Sheet, then Sync.</p>');
    $('sets').innerHTML = html;
    if (problems.length) {
      $('problems').textContent = problems.length + ' row' + (problems.length === 1 ? '' : 's') + ' in your Questions tab couldn\'t be used: ' +
        problems.slice(0, 5).map(function (p) { return 'row ' + p.row + ' (' + p.problem + ')'; }).join('; ') + (problems.length > 5 ? '…' : '');
      $('problems').hidden = false;
    }
    $('setsClose').hidden = !set();
    $('setsBack').hidden = false;
  }
  $('sets').addEventListener('click', function (e) {
    var b = e.target.closest('[data-set]');
    if (!b) return;
    S.setKey = b.dataset.set;
    S.setName = set() ? set().name : '';
    S.order = set() ? shuffled(set().questions.length) : [];
    S.pos = 0; S.revealed = {}; S.right = {};
    save();
    $('setsBack').hidden = true;
    resetTimer();
    render();
  });
  $('setsClose').addEventListener('click', function () { $('setsBack').hidden = true; });

  // ---------- ⋯ menu ----------
  function renderSecs() {
    $('secsRow').innerHTML = TIMES.map(function (s) { return '<button class="btn" data-secs="' + s + '" aria-pressed="' + (s === S.secs) + '">' + fmt(s) + '</button>'; }).join('');
  }
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('resetScores').classList.remove('armed'); $('resetScores').textContent = 'Reset all scores'; }
  $('more').addEventListener('click', function () { renderSecs(); $('prev').disabled = S.pos === 0; disarm(); $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('secsRow').addEventListener('click', function (e) {
    var b = e.target.closest('[data-secs]');
    if (!b) return;
    S.secs = +b.dataset.secs; save(); resetTimer(); renderSecs();
  });
  $('changeSet').addEventListener('click', function () { closeMenu(); openSets(); });
  $('prev').addEventListener('click', function () { goTo(S.pos - 1); closeMenu(); });
  $('resetScores').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed'); btn.textContent = 'Tap again: all scores back to 0';
      setTimeout(disarm, 3500);
      return;
    }
    teams.forEach(function (t) { if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'reset'); });
    S.pts = {}; S.right = {};
    save(); closeMenu(); renderTeams();
  });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden || !$('setsBack').hidden) return;
    if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
    else if (e.key === 'ArrowRight') $('next').click();
    else if (e.key === 'a' || e.key === 'A') $('reveal').click();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', fit);

  Kru.onFinishRequest(function () {
    Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
  });

  // How to play slides: before the game starts, and from the ⋯ menu
  var INTRO = [];
  function showIntro() { return KruIntro.show(INTRO, { title: 'Quiz Battle' }); }
  $('howTo').addEventListener('click', function () { $('menuBack').hidden = true; showIntro(); });

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (content) {
      var level = content[session.level] ? session.level : 'M.2';
      builtIn = content[level].sets;
      ALL = { name: 'All topics, shuffled', questions: [].concat.apply([], builtIn.map(function (s) { return s.questions; })) };
      // Henry's own sets from the Sheet (only sent by Kru; none in mock mode)
      fromSheet = Array.isArray(session.questions) ? session.questions.filter(function (s) { return s && Array.isArray(s.questions) && s.questions.length; }) : [];
      problems = Array.isArray(session.questionProblems) ? session.questionProblems : [];
      teams = Kru.allTeams();
      var saved = session.resume;
      if (saved && saved.v === 1 && saved.level === level) S = saved;
      else S = { v: 1, level: level, setKey: null, pos: 0, revealed: {}, right: {}, secs: 20, pts: {}, log: [] };
      total = left = S.secs;
      if (set() && question() && set().name === S.setName) render();
      else {
        // first time (or the saved set has gone from the Sheet): choose a set
        S.setKey = null;
        $('q').textContent = 'Choose a question set to start.';
        renderTeams();
        openSets();
      }
      INTRO = KruIntro.forLevel(content, level);
      if (!S.introDone) showIntro().then(function () { S.introDone = true; save(); });
    }).catch(function () {
      $('q').textContent = 'Could not load the questions. Close the game and open it again.';
    });
  });
})();
