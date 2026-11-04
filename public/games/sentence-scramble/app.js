/* Sentence Scramble Race: a sentence is shown as shuffled word tiles. Teams write the correct sentence on
   paper. Henry taps the first, second and third correct teams (3 / 2 / 1 points), then Reveal. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var PLACE_POINTS = [3, 2, 1];
  var PLACE_NAMES = ['1st', '2nd', '3rd'];
  var $ = function (id) { return document.getElementById(id); };

  var SENTENCES = [];
  var teams = [];
  var S = null; // saved: { v, level, order, pos, shuffles, places, revealed, shownAt, revealedAt, pts, log }
  var clockTimer = 0, audio = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function save() { Kru.saveState(S); }
  function pts(id) { return S.pts[id] || 0; }
  function team(id) { return teams.find(function (t) { return t.id === id; }); }
  function current() { return SENTENCES[S.order[S.pos]]; }
  function places() { return S.places[S.pos] || (S.places[S.pos] = []); }
  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }

  /** The words as tiles: no commas or end mark, and no capital letter giving away the first word. */
  function words(s) {
    var list = s.text.replace(/[.!?]+$/, '').replace(/,/g, '').split(/\s+/);
    var first = list[0];
    if (!s.keepCap && first !== 'I' && !/^I'/.test(first)) list[0] = first.charAt(0).toLowerCase() + first.slice(1);
    return list;
  }
  function tileOrder() {
    var n = words(current()).length;
    var o = S.shuffles[S.pos];
    if (!o || o.length !== n) {
      // shuffle, but never leave it in the right order
      do { o = shuffled(n); } while (n > 2 && o.every(function (v, i) { return v === i; }));
      S.shuffles[S.pos] = o;
      save();
    }
    return o;
  }

  // ---------- sound (after a tap) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }
  function tone(freqs) {
    if (!audio) return;
    try {
      freqs.forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * 0.12;
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.32);
      });
    } catch (e) {}
  }

  // ---------- render ----------
  function fmt(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function renderClock() {
    var start = S.shownAt[S.pos], end = S.revealedAt[S.pos] || Date.now();
    $('clock').textContent = start ? fmt(end - start) : '0:00';
  }
  /** Biggest tiles that fit; once revealed, the answer shrinks first so tiles stay readable (>= 18 px). */
  function fit() {
    var stage = $('stage'), tiles = $('tiles'), ans = $('answer'), size = 34, a = 26;
    var over = function () { return stage.scrollHeight > stage.clientHeight + 1; };
    tiles.style.setProperty('--tile', size + 'px');
    ans.style.fontSize = a + 'px';
    while (size > 24 && over()) tiles.style.setProperty('--tile', (size -= 2) + 'px');
    while (a > 20 && over()) ans.style.fontSize = (a -= 2) + 'px';
    while (size > 18 && over()) tiles.style.setProperty('--tile', (size -= 2) + 'px');
  }
  function renderStage() {
    var s = current(), w = words(s), o = tileOrder();
    bonusRound('s' + S.order[S.pos] + '-' + S.pos);
    $('count').textContent = 'Sentence ' + (S.pos + 1) + ' of ' + S.order.length;
    $('focus').textContent = s.focus || '';
    $('tiles').innerHTML = o.map(function (i) { return '<span class="tile-w">' + esc(w[i]) + '</span>'; }).join('');
    var q = /\?\s*$/.test(s.text);
    $('hint').textContent = w.length + ' words' + (q ? ' · it is a question' : '');
    $('answer').textContent = s.text;
    $('answer').hidden = !S.revealed[S.pos];
    $('hint').hidden = !!S.revealed[S.pos]; // room for the answer
    $('reveal').disabled = !!S.revealed[S.pos];
    if (!S.shownAt[S.pos]) { S.shownAt[S.pos] = Date.now(); save(); }
    renderClock();
    renderPlaces();
    fit();
  }
  function renderPlaces() {
    var p = places();
    var done = p.map(function (id, i) { var t = team(id); return PLACE_NAMES[i] + ' <b>' + esc(t ? t.name : '?') + '</b>'; });
    var next = p.length < 3 ? 'Tap the ' + PLACE_NAMES[p.length] + ' correct team (+' + PLACE_POINTS[p.length] + ')' : '';
    $('places').innerHTML = done.concat(next ? [esc(next)] : []).join(' · ');
    renderTeams();
  }
  function renderTeams() {
    var p = places();
    var max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }));
    $('strip').innerHTML = teams.map(function (t, i) {
      var place = p.indexOf(t.id);
      return '<button class="tile' + (place >= 0 ? ' placed' : '') + (max > 0 && pts(t.id) === max ? ' lead' : '') + '" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-label="' + esc(t.name) + ', ' + pts(t.id) + ' points">' +
        (place >= 0 ? '<span class="badge">' + PLACE_NAMES[place] + '</span>' : '') +
        '<span class="tn">' + esc(t.name) + '</span><span class="tp">' + pts(t.id) + '</span></button>';
    }).join('');
  }

  // ---------- points ----------
  function addPoints(id, d, why) {
    S.pts[id] = pts(id) + d;
    S.log.push({ t: id, d: d, pos: S.pos, why: why });
    if (S.log.length > 400) S.log.shift();
    save();
    Kru.score(id, d, why);
  }
  function place(id) {
    unlockAudio();
    var p = places();
    if (p.indexOf(id) >= 0) { toast(team(id).name + ' already has a place for this sentence', false); return; }
    if (p.length >= 3) { toast('3 teams already have points for this sentence', false); return; }
    var d = PLACE_POINTS[p.length];
    p.push(id);
    addPoints(id, d, PLACE_NAMES[p.length - 1]);
    tone(p.length === 1 ? [784, 988, 1175] : [784, 988]);
    renderPlaces();
    toast(PLACE_NAMES[p.length - 1] + ': ' + team(id).name + ' +' + d, true);
  }
  function undo() {
    var L = S.log.pop();
    if (!L) return;
    S.pts[L.t] = pts(L.t) - L.d;
    var p = S.places[L.pos];
    if (L.d > 0 && p && p[p.length - 1] === L.t) p.pop();
    save();
    Kru.score(L.t, -L.d, 'undo');
    renderPlaces();
    $('toast').hidden = true;
  }
  var toastTimer = 0;
  function toast(text, canUndo) {
    $('toastText').textContent = text;
    $('toastUndo').hidden = !canUndo;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 4500);
  }

  $('strip').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]');
    if (b) place(b.dataset.t);
  });
  $('toastUndo').addEventListener('click', undo);
  $('reveal').addEventListener('click', function () {
    unlockAudio();
    S.revealed[S.pos] = true;
    S.revealedAt[S.pos] = Date.now();
    save();
    tone([523, 659]);
    renderStage();
    KruBonus.reveal();
  });
  function goTo(pos) {
    if (pos >= S.order.length) {
      // all sentences used: shuffle them and start again
      S.order = shuffled(SENTENCES.length);
      S.pos = 0; S.shuffles = {}; S.places = {}; S.revealed = {}; S.shownAt = {}; S.revealedAt = {};
      S.log = S.log.map(function (L) { return { t: L.t, d: L.d, pos: -1, why: L.why }; });
      toast('That was the last sentence. Starting again with a new order.', false);
    } else S.pos = Math.max(0, pos);
    save();
    renderStage();
  }
  $('next').addEventListener('click', function () { goTo(S.pos + 1); });

  // ---------- ⋯ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('resetScores').classList.remove('armed'); $('resetScores').textContent = 'Reset all scores'; }
  $('more').addEventListener('click', function () { $('undo').disabled = !S.log.length; $('prev').disabled = S.pos === 0; disarm(); $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('reshuffle').addEventListener('click', function () { delete S.shuffles[S.pos]; save(); renderStage(); closeMenu(); });
  $('prev').addEventListener('click', function () { goTo(S.pos - 1); closeMenu(); });
  $('undo').addEventListener('click', function () { undo(); closeMenu(); });
  $('minus').addEventListener('click', function () {
    closeMenu();
    $('minusList').innerHTML = teams.map(function (t) { return '<button class="btn" data-m="' + esc(t.id) + '">' + esc(t.name) + ' (' + pts(t.id) + ')</button>'; }).join('');
    $('minusBack').hidden = false;
  });
  $('minusList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-m]');
    if (!b) return;
    addPoints(b.dataset.m, -1, 'correction');
    b.textContent = team(b.dataset.m).name + ' (' + pts(b.dataset.m) + ')';
    renderTeams();
  });
  $('minusClose').addEventListener('click', function () { $('minusBack').hidden = true; });
  $('resetScores').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed'); btn.textContent = 'Tap again: all scores back to 0';
      setTimeout(disarm, 3500);
      return;
    }
    teams.forEach(function (t) { if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'reset'); });
    S.pts = {}; S.log = []; S.places = {};
    save(); closeMenu(); renderPlaces();
  });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden || !$('minusBack').hidden) return;
    if (e.key === 'ArrowRight') $('next').click();
    else if (e.key === 'a' || e.key === 'A') $('reveal').click();
  });
  window.addEventListener('resize', fit);
  clockTimer = setInterval(function () { if (S && SENTENCES.length) renderClock(); }, 500);

  Kru.onFinishRequest(function () {
    Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
  });

  // How to play slides: before the game starts, and from the ⋯ menu
  var INTRO = [];
  function showIntro() { return KruIntro.show(INTRO, { title: 'Sentence Scramble' }); }
  $('howTo').addEventListener('click', function () { $('menuBack').hidden = true; showIntro(); });

  // ---------- bonus cards (shared: games/shared/kru-bonus.js) ----------
  // before cards pop up when a round starts; secret cards at the reveal. Points: tap the ★ chip, then teams.
  function bonusRound(key) { var b = KruBonus.next(S.kbonus, key); if (b !== S.kbonus) { S.kbonus = b; save(); } }

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (content) {
      var level = content[session.level] ? session.level : 'M.2';
      SENTENCES = content[level].sentences;
      teams = Kru.allTeams();
      KruBonus.setup({ cards: content.bonus, bar: $('more').parentNode, beforeEl: $('more'), teams: function () { return teams; }, save: function () { save(); },
        award: function (id, d, card) { addPoints(id, d, 'bonus: ' + card.name); renderTeams(); } });
      var saved = session.resume;
      if (saved && saved.v === 1 && saved.level === level && Array.isArray(saved.order) && saved.order.length === SENTENCES.length) S = saved;
      else S = { v: 1, level: level, order: shuffled(SENTENCES.length), pos: 0, shuffles: {}, places: {}, revealed: {}, shownAt: {}, revealedAt: {}, pts: {}, log: [] };
      renderStage();
      INTRO = KruIntro.forLevel(content, level);
      if (!S.introDone) showIntro().then(function () { S.introDone = true; save(); });
    }).catch(function () {
      $('tiles').textContent = 'Could not load the sentences. Close the game and open it again.';
    });
  });
})();
