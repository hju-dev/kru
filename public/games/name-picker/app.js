/* Name Picker / Hot Seat: spins a random present student. Nobody is picked twice until everyone has
   had a turn, and "picked" is remembered for this class for the rest of the day (Kru.saveDay).
   Optional question card per level; optional +1 / +2 for the picked student. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  var QUESTIONS = [];
  var students = [];   // solo teams: { id, name, members:[{no, nick}] }
  var S = null;        // saved: { v, level, current, question, cards, usedQ, pts, log, history }
  var day = null;      // { picked: [key] } for this class today
  var spinning = false, audio = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function key(t) { var m = t.members[0] || {}; return m.no + ':' + (m.nick || t.name); }
  function byId(id) { return students.find(function (t) { return t.id === id; }); }
  function pts(id) { return S.pts[id] || 0; }
  function save() { Kru.saveState(S); }
  function saveDay() { Kru.saveDay(day); }
  function pool() { return students.filter(function (t) { return day.picked.indexOf(key(t)) < 0; }); }

  // ---------- sound (started inside a tap) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }
  function tone(freqs, gap, dur, vol) {
    if (!audio) return;
    gap = gap || 0.12; dur = dur || 0.25; vol = vol || 0.3;
    try {
      freqs.forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * gap;
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.05);
      });
    } catch (e) {}
  }

  // ---------- render ----------
  function fitName() {
    var el = $('name'), box = $('who'), size = 72;
    el.style.fontSize = size + 'px';
    while (size > 30 && (el.scrollWidth > el.clientWidth + 1 || box.scrollWidth > box.clientWidth + 1)) el.style.fontSize = (size -= 4) + 'px';
    var stage = $('stage'), q = $('q'), qs = 24;
    q.style.fontSize = qs + 'px';
    while (qs > 16 && stage.scrollHeight > stage.clientHeight + 1) q.style.fontSize = (qs -= 2) + 'px';
    while (size > 30 && stage.scrollHeight > stage.clientHeight + 1) el.style.fontSize = (size -= 4) + 'px';
  }
  function showName(t) {
    $('no').textContent = t && t.members[0] ? t.members[0].no : '';
    $('name').textContent = t ? t.name : 'Tap Spin!';
  }
  function render() {
    var t = S.current ? byId(S.current) : null;
    if (!spinning) showName(t);
    $('pts').textContent = t && pts(t.id) ? '+' + pts(t.id) : '';
    $('stage').classList.toggle('picked', !!t && !spinning);
    var showCard = S.cards && t && S.question !== null && !spinning;
    $('card').hidden = !showCard;
    if (showCard) $('q').textContent = QUESTIONS[S.question] || '';
    $('plus1').disabled = $('plus2').disabled = !t || spinning;
    $('again').disabled = !t || spinning;
    $('spin').disabled = spinning || !students.length;
    var left = pool().length;
    $('left').textContent = left + ' of ' + students.length + ' left today';
    var recent = S.history.slice(-8).map(function (id) {
      var x = byId(id);
      return x ? esc(x.name) + (pts(id) ? ' <b>+' + pts(id) + '</b>' : '') : '';
    }).filter(Boolean);
    $('history').innerHTML = recent.length ? 'Picked: ' + recent.join(' · ') : '';
    $('toggleCards').textContent = 'Question cards: ' + (S.cards ? 'on' : 'off');
    $('newQ').disabled = !S.cards || !t;
    $('undo').disabled = !S.log.length;
    fitName();
  }

  // ---------- picking ----------
  function nextQuestion() {
    if (!QUESTIONS.length) { S.question = null; return; }
    var options = QUESTIONS.map(function (_, i) { return i; }).filter(function (i) { return S.usedQ.indexOf(i) < 0; });
    if (!options.length) { S.usedQ = []; options = QUESTIONS.map(function (_, i) { return i; }); }
    S.question = options[Math.floor(Math.random() * options.length)];
    S.usedQ.push(S.question);
  }
  function spin() {
    if (spinning || !students.length) return;
    unlockAudio();
    var list = pool();
    var restarted = false;
    if (!list.length) {
      // everyone has had a turn today: start a new round
      day.picked = [];
      list = students.slice();
      restarted = true;
    }
    var pick = list[Math.floor(Math.random() * list.length)];
    day.picked.push(key(pick));
    saveDay();
    S.current = pick.id;
    S.history.push(pick.id);
    if (S.history.length > 200) S.history.shift();
    nextQuestion();
    save();

    if (matchMedia('(prefers-reduced-motion: reduce)').matches || students.length < 2) {
      render(); tone([988, 1319], 0.1, 0.3);
      if (restarted) toast('Everyone has had a turn. Starting again!', false);
      return;
    }
    spinning = true;
    $('who').classList.add('spinning');
    render();
    var steps = 16, k = 0; // about 1.3 s
    (function step() {
      var t = students[Math.floor(Math.random() * students.length)];
      showName(t); fitName();
      tone([300 + k * 30], 0, 0.05, 0.12);
      if (++k < steps) { setTimeout(step, 30 + k * 6); return; }
      spinning = false;
      $('who').classList.remove('spinning');
      render();
      tone([988, 1319], 0.1, 0.3);
      if (restarted) toast('Everyone has had a turn. Starting again!', false);
    })();
  }
  function pickAgain() {
    // the picked student isn't here (or can't answer): put them back and spin again
    var t = byId(S.current);
    if (!t) return;
    var i = day.picked.lastIndexOf(key(t));
    if (i >= 0) day.picked.splice(i, 1);
    saveDay();
    if (S.history[S.history.length - 1] === t.id) S.history.pop();
    S.current = null;
    save();
    spin();
  }

  // ---------- points ----------
  function give(d) {
    var t = byId(S.current);
    if (!t) return;
    S.pts[t.id] = pts(t.id) + d;
    S.log.push({ t: t.id, d: d });
    save();
    Kru.score(t.id, d, 'hot seat');
    tone([660, 880], 0.08, 0.2);
    render();
    toast(t.name + ' +' + d, true);
  }
  function undo() {
    var L = S.log.pop();
    if (!L) return;
    S.pts[L.t] = pts(L.t) - L.d;
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
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 4000);
  }

  $('spin').addEventListener('click', spin);
  $('plus1').addEventListener('click', function () { give(1); });
  $('plus2').addEventListener('click', function () { give(2); });
  $('again').addEventListener('click', pickAgain);
  $('toastUndo').addEventListener('click', undo);

  // ---------- ⋯ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('resetDay').classList.remove('armed'); $('resetDay').textContent = 'Everyone can be picked again'; }
  $('more').addEventListener('click', function () { disarm(); $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('toggleCards').addEventListener('click', function () {
    S.cards = !S.cards;
    if (S.cards && S.question === null) nextQuestion();
    save(); render();
  });
  $('newQ').addEventListener('click', function () { nextQuestion(); save(); render(); closeMenu(); });
  $('undo').addEventListener('click', function () { undo(); closeMenu(); });
  $('resetDay').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed'); btn.textContent = 'Tap again: clear today\'s list';
      setTimeout(disarm, 3500);
      return;
    }
    day.picked = [];
    saveDay();
    closeMenu(); render();
  });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden) return;
    if (e.code === 'Space') { e.preventDefault(); spin(); }
    else if (e.key === '1') give(1);
    else if (e.key === '2') give(2);
  });
  window.addEventListener('resize', fitName);

  Kru.onFinishRequest(function () {
    // only students given points are saved (games.json: "results": "scored")
    Kru.finish(students.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
  });

  // ---------- start ----------
  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (content) {
      var level = content[session.level] ? session.level : 'M.2';
      QUESTIONS = content[level].questions || [];
      // solo: one team per present student (the teacher isn't picked)
      students = session.teams.filter(function (t) { return t.members && t.members.length; });
      var saved = session.resume;
      if (saved && saved.v === 1 && saved.level === level) S = saved;
      else S = { v: 1, level: level, current: null, question: null, cards: true, usedQ: [], pts: {}, log: [], history: [] };
      day = session.day && Array.isArray(session.day.picked) ? session.day : { picked: [] };
      if (S.current && !byId(S.current)) S.current = null;
      render();
    }).catch(function () {
      $('name').textContent = 'Could not load. Close and open again.';
    });
  });
})();
