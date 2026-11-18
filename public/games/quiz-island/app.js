/* Quiz Island (Henry, Nov 18): Race Board's quiz (one team at a time, four tiers, power-ups, optional "Who answers?"
   spinner) played on Reading Island's island map instead of a race track.
   A right answer lets the team claim an island worth the tier: easy 1, regular 2, hard 3, impossible 4 (Risk it doubles it).
   Hidden under the map: 4 volcanoes (lose your newest island), 4 pirates (you miss your next turn), 4 chests (+3 bonus);
   4 visible treasure islands (+3 bonus). A right answer on a hard or impossible question may STEAL an island (the stealer
   gets its value, the owner loses it); once the map is full every right answer steals. Henry taps "Final Wager" in the ⋯
   menu when time is nearly up: one question for every team, bet any points or ALL IN. The biggest connected group of
   islands gets +5 at the end. Decks: Race Board's bank for the level, a Quiz Battle set (or all), or the unit picked
   on the setup screen. The teacher's team doesn't play. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var TIMES = [10, 20, 30, 45, 60];
  var COLS = 8, ROWS = 5, CELLS = COLS * ROWS, TREASURES = 4, VOLCANOES = 4, PIRATES = 4, CHESTS = 4, EMPIRE = 5, BONUS = 3;
  var ORDER = ['easy', 'regular', 'hard', 'impossible'];
  var TIERS = {
    easy: { label: 'Easy', share: 30, pts: 1 },
    regular: { label: 'Regular', share: 45, pts: 2 },
    hard: { label: 'Hard', share: 17, pts: 3, steal: true },
    impossible: { label: 'Impossible', share: 8, pts: 4, steal: true },
  };
  var POWERS = [
    { id: 'fifty', label: '50/50' },
    { id: 'time', label: '+20 s' },
    { id: 'free', label: 'Free answer' },
    { id: 'risk', label: 'Risk it' },
  ];
  var $ = function (id) { return document.getElementById(id); };
  var esc = KruQuiz.esc;

  var DECKS = [], POOL = {}, teams = [], players = [], INTRO = [];
  var S = null;
  var busy = false, left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null;
  var Q = null, shown = false, risk = false, who = '', finalMode = false;

  function save() { Kru.saveState(S); }
  function shuffle(a) {
    for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function weighted(w) { var sum = 0, i; for (i = 0; i < w.length; i++) sum += w[i]; var r = Math.random() * sum; for (i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; } return w.length - 1; }
  function pts(id) { return S.pts[id] || 0; }
  function team(id) { return players.filter(function (t) { return t.id === id; })[0]; }
  function color(id) { var i = players.map(function (t) { return t.id; }).indexOf(id); return COLORS[(i < 0 ? 0 : i) % COLORS.length]; }
  function current() { return players[S.turn % Math.max(1, players.length)]; }
  function tierOf(q) { return TIERS[q.tier] ? q.tier : 'regular'; }

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
  var toastTimer = 0;
  function toast(text) {
    $('toastText').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 3500);
  }

  // ---------- the island map ----------
  function newMap() {
    var cells = shuffle(range(CELLS)), at = TREASURES;
    var m = { own: new Array(CELLS).fill(null), worth: new Array(CELLS).fill(0), ash: [], pirated: [], order: {}, treasure: cells.slice(0, at) };
    m.volcano = cells.slice(at, at += VOLCANOES); // hidden: the island turns to ash and the team loses its newest island
    m.pirate = cells.slice(at, at += PIRATES);    // hidden: pirates keep the island; the team misses its next turn
    m.chest = cells.slice(at, at += CHESTS);      // hidden: the island and +3 bonus
    return m;
  }
  function blocked(c) { return S.map.ash.indexOf(c) >= 0 || S.map.pirated.indexOf(c) >= 0; }
  function owned(id) { var a = []; S.map.own.forEach(function (o, c) { if (o === id) a.push(c); }); return a; }
  function emptyCells() { var a = []; S.map.own.forEach(function (o, c) { if (!o && !blocked(c)) a.push(c); }); return a; }
  function biggestGroup(id) {
    var seen = {}, best = 0;
    owned(id).forEach(function (c) {
      if (seen[c]) return;
      var stack = [c], size = 0; seen[c] = true;
      while (stack.length) {
        var x = stack.pop(); size++;
        var r = Math.floor(x / COLS), col = x % COLS;
        [[r - 1, col], [r + 1, col], [r, col - 1], [r, col + 1]].forEach(function (p) {
          if (p[0] < 0 || p[0] >= ROWS || p[1] < 0 || p[1] >= COLS) return;
          var y = p[0] * COLS + p[1];
          if (!seen[y] && S.map.own[y] === id) { seen[y] = true; stack.push(y); }
        });
      }
      best = Math.max(best, size);
    });
    return best;
  }
  /** The team(s) with the biggest connected group of islands (+5 at the end). */
  function empireLeaders() {
    var sizes = players.map(function (t) { return biggestGroup(t.id); }), max = Math.max.apply(null, sizes.concat([0]));
    if (max < 2) return [];
    return players.filter(function (t, i) { return sizes[i] === max; }).map(function (t) { return t.id; });
  }
  function finalPts(id) { return pts(id) + (empireLeaders().indexOf(id) >= 0 ? EMPIRE : 0); }
  function addPts(id, d, why) {
    var now = pts(id), next = Math.max(0, now + d), real = next - now; // points never go below 0
    if (!real) return 0;
    S.pts[id] = next;
    Kru.score(id, real, why);
    return real;
  }
  function claimable() {
    var cl = S.claim;
    return range(CELLS).filter(function (c) {
      if (blocked(c)) return false;
      var o = S.map.own[c];
      return !o || (cl.steal && o !== cl.id);
    });
  }

  function renderMap() {
    var cl = S.claim, can = cl ? claimable() : [], leaders = empireLeaders();
    $('map').innerHTML = range(CELLS).map(function (c) {
      var o = S.map.own[c], pir = S.map.pirated.indexOf(c) >= 0, ash = S.map.ash.indexOf(c) >= 0, tr = S.map.treasure.indexOf(c) >= 0;
      var cls = 'isle' + (o ? ' owned' : '') + (pir || ash ? ' ash' : '') + (tr && !o ? ' treasure' : '') +
        (can.indexOf(c) >= 0 ? ' can' : '') + (o && leaders.indexOf(o) >= 0 ? ' empire' : '');
      var label = pir ? '☠' : ash ? '🌋' : o ? '<span class="n">' + (players.indexOf(team(o)) + 1) + '</span><span class="w">' + S.map.worth[c] + '</span>' : tr ? '💎' : '';
      var name = o ? ', ' + esc(team(o).name) + ', worth ' + S.map.worth[c] : pir ? ', pirates' : ash ? ', volcano' : tr ? ', treasure' : ', empty';
      return '<button class="' + cls + '" data-c="' + c + '"' + (o ? ' style="--c:' + color(o) + '"' : '') + ' aria-label="Island ' + (c + 1) + name + '">' + label + '</button>';
    }).join('');
  }
  function renderLegend() {
    var cur = current(), leaders = empireLeaders();
    $('legend').className = 'legend' + (players.length > 5 ? ' many' : ''); // 6+ teams: numbers and points only
    $('legend').innerHTML = players.map(function (t, i) {
      var flags = (S.skip[t.id] ? ' ⏸' : '') + (leaders.indexOf(t.id) >= 0 ? ' 🏝' : '');
      return '<span class="lg' + (cur && t.id === cur.id ? ' now' : '') + '"><i style="background:' + color(t.id) + '">' + (i + 1) + '</i>' +
        '<span class="nm">' + esc(t.name) + '</span> <b>' + pts(t.id) + '</b> · ' + owned(t.id).length + '🏝' + flags + '</span>';
    }).join('');
  }
  function render() {
    var cur = current(), cl = S.claim;
    $('turn').innerHTML = !cur ? 'Add students to play' : cl ? '<i class="dot" style="background:' + color(cl.id) + '"></i>' + esc(team(cl.id).name) + ': tap an island (+' + cl.v + (cl.steal ? ', ⚔ steal OK' : '') + ')' :
      S.phase === 'final' ? '⚡ Final Wager' : '<i class="dot" style="background:' + color(cur.id) + '"></i>' + esc(cur.name) + "'s turn";
    $('ask').hidden = !!cl;
    $('ask').disabled = busy || S.phase === 'final';
    $('skipClaim').hidden = !cl;
    renderMap(); renderLegend();
  }

  // ---------- undo: the state before the last question ----------
  function snapshot() {
    S.hist.push(JSON.parse(JSON.stringify({ map: S.map, pts: S.pts, turn: S.turn, skip: S.skip, powers: S.powers })));
    if (S.hist.length > 20) S.hist.shift();
  }
  function undo() {
    var h = S.hist.pop();
    if (!h) return false;
    players.forEach(function (t) { var d = (h.pts[t.id] || 0) - pts(t.id); if (d) Kru.score(t.id, d, 'undo'); });
    S.map = h.map; S.pts = h.pts; S.turn = h.turn; S.skip = h.skip; S.powers = h.powers; S.claim = null;
    save(); render();
    return true;
  }

  // ---------- claiming ----------
  function startClaim(id, v, stealOK) {
    S.claim = { id: id, v: v, steal: stealOK || !emptyCells().length };
    if (!claimable().length) { S.claim = null; toast('No island to claim.'); nextTurn(); return; }
    save(); render(); tone([523, 659, 784], 0.1);
  }
  function endClaim() { S.claim = null; nextTurn(); }
  function claim(c) {
    var cl = S.claim;
    if (!cl || blocked(c) || S.map.own[c] === cl.id) return;
    var id = cl.id, o = S.map.own[c], v = cl.v, t = team(id);
    if (o && !cl.steal) { toast('Only a hard or impossible answer (or a full map) can steal.'); return; }
    unlockAudio();
    if (o) {
      var w = S.map.worth[c];
      S.map.own[c] = id; (S.map.order[id] = S.map.order[id] || []).push(c);
      addPts(id, w, 'stole an island'); addPts(o, -w, 'island stolen');
      toast('⚔ ' + t.name + ' stole an island (' + w + ') from ' + team(o).name + '!'); tone([392, 523, 659], 0.1);
    } else if (S.map.volcano.indexOf(c) >= 0) {
      S.map.ash.push(c);
      var mine = (S.map.order[id] || []).filter(function (x) { return S.map.own[x] === id; }), lost = mine.length ? mine[mine.length - 1] : null;
      if (lost == null) { var any = owned(id); lost = any.length ? any[any.length - 1] : null; }
      if (lost != null) { var lw = S.map.worth[lost]; S.map.own[lost] = null; S.map.worth[lost] = 0; addPts(id, -lw, 'volcano'); }
      toast('🌋 A volcano! ' + t.name + (lost != null ? ' loses its newest island.' : ' had nothing to lose.')); tone([196, 165, 131], 0.16, 0.4);
    } else if (S.map.pirate.indexOf(c) >= 0) {
      S.map.pirated.push(c);
      S.skip[id] = 1;
      toast('☠ Pirates! ' + t.name + ' misses its next turn.'); tone([220, 185, 147], 0.16, 0.4);
    } else {
      var chest = S.map.chest.indexOf(c) >= 0, tr = S.map.treasure.indexOf(c) >= 0, worth = v + (chest || tr ? BONUS : 0);
      S.map.own[c] = id; S.map.worth[c] = worth; (S.map.order[id] = S.map.order[id] || []).push(c);
      addPts(id, worth, chest ? 'treasure chest' : tr ? 'treasure island' : 'island');
      toast((chest ? '🧰 A treasure chest! ' : tr ? '💎 Treasure! ' : '🏝 ') + '+' + worth + ' ' + t.name + (chest || tr ? ' (island ' + v + ', bonus ' + BONUS + ')' : ''));
      tone(chest || tr ? [523, 659, 784, 1047] : [660, 880], 0.1);
    }
    endClaim();
  }
  $('map').addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) claim(+b.dataset.c); });
  $('skipClaim').addEventListener('click', function () { if (S.claim) endClaim(); });

  /** The next team's turn. A team the pirates caught misses its turn (once). */
  function nextTurn() {
    S.turn++;
    for (var i = 0; i < players.length; i++) {
      var cur = current();
      if (!S.skip[cur.id]) break;
      S.skip[cur.id] = 0;
      toast('☠ ' + cur.name + ' misses its turn (pirates).');
      S.turn++;
    }
    save(); render();
  }

  // ---------- decks and questions ----------
  function guessTier(q) { return q.double || !Array.isArray(q.choices) ? 'hard' : 'regular'; }
  function deckQs(list, setName, bank) {
    return list.map(function (q) { return Object.assign({ set: setName || '' }, q, { tier: TIERS[q.tier] ? q.tier : bank ? 'regular' : guessTier(q) }); });
  }
  function buildDecks(c, QZ, lv) {
    var own = (c.questions && c.questions[lv]) || [], decks = [];
    if (QZ.unit) {
      var all = [];
      QZ.unit.sets.forEach(function (s) { all = all.concat(deckQs(s.questions, s.name)); });
      decks.push({ key: 'unit', label: 'Unit: ' + QZ.unit.title, sub: all.length + ' questions', qs: all });
      if (QZ.unit.sets.length > 1) QZ.unit.sets.forEach(function (s) {
        decks.push({ key: 'unit:' + s.name, label: 'Unit set: ' + s.name, sub: s.questions.length + ' questions', qs: deckQs(s.questions, s.name) });
      });
    }
    if (own.length) decks.push({ key: 'bank', label: 'Race Board questions', sub: own.length + ' questions, easy to impossible', qs: deckQs(own, '', true) });
    var every = [];
    QZ.builtIn.forEach(function (s) { every = every.concat(deckQs(s.questions, s.name)); });
    if (every.length) decks.push({ key: 'qb-all', label: 'Quiz Battle: all topics', sub: every.length + ' questions', qs: every });
    QZ.builtIn.forEach(function (s) { decks.push({ key: 'qb:' + s.name, label: 'Quiz Battle: ' + s.name, sub: s.questions.length + ' questions', qs: deckQs(s.questions, s.name) }); });
    QZ.fromSheet.forEach(function (s) { decks.push({ key: 'sheet:' + s.name, label: 'Your Sheet: ' + s.name, sub: s.questions.length + ' questions', qs: deckQs(s.questions, s.name) }); });
    return decks;
  }
  function deckByKey(k) { return DECKS.filter(function (d) { return d.key === k; })[0]; }
  function buildPool() {
    var d = deckByKey(S.deck);
    POOL = { easy: [], regular: [], hard: [], impossible: [] };
    if (d) d.qs.forEach(function (q) { POOL[tierOf(q)].push(q); });
    S.order = {}; S.qi = {};
    ORDER.forEach(function (t) { S.order[t] = shuffle(range(POOL[t].length)); S.qi[t] = 0; });
  }
  /** The next question: a tier at random (hard and impossible are rarer); preferred = tiers to take if there are any. */
  function pickQuestion(preferred) {
    var avail = ORDER.filter(function (t) { return POOL[t].length; });
    if (!avail.length) return null;
    var pref = preferred ? avail.filter(function (t) { return preferred.indexOf(t) >= 0; }) : [];
    if (pref.length) avail = pref;
    var tier = avail[weighted(avail.map(function (t) { return TIERS[t].share; }))];
    var list = POOL[tier], order = S.order[tier], q = list[order[S.qi[tier] % order.length]];
    S.qi[tier]++;
    if (S.qi[tier] % order.length === 0) S.order[tier] = shuffle(range(list.length));
    return q;
  }
  function openDecks() {
    $('decks').innerHTML = DECKS.map(function (d) {
      return '<button class="btn' + (d.key === S.deck ? ' gold' : '') + '" data-deck="' + esc(d.key) + '"><b>' + esc(d.label) + '</b><br /><small>' + esc(d.sub) + '</small></button>';
    }).join('');
    $('deckClose').hidden = !S.deck;
    $('deckBack').hidden = false;
  }
  $('decks').addEventListener('click', function (e) {
    var b = e.target.closest('[data-deck]');
    if (!b) return;
    var same = S.deck === b.dataset.deck;
    S.deck = b.dataset.deck;
    if (!same || !POOL.easy) buildPool();
    save(); $('deckBack').hidden = true; render();
    toast('Deck: ' + deckByKey(S.deck).label);
  });
  $('deckClose').addEventListener('click', function () { $('deckBack').hidden = true; });

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
  function renderQuestion() {
    var t = current(), tier = TIERS[tierOf(Q)];
    $('qWho').textContent = finalMode ? '⚡ Final Wager: every team' : t.name + (who ? ' · 🎯 ' + who : '');
    $('qTier').textContent = finalMode ? tier.label : tier.label + ' · worth ' + tier.pts + (tier.steal ? ' · ⚔' : '');
    $('qTier').className = 'tier ' + tierOf(Q);
    $('qTopic').textContent = Q.set ? '· ' + Q.set : '';
    $('qBody').innerHTML = KruQuiz.html(Q, shown);
    (Q._gone || []).forEach(function (i) { var c = $('qBody').querySelectorAll('.kq-choice')[i]; if (c) c.classList.add('gone'); });
    $('reveal').disabled = shown;
    $('powers').hidden = finalMode;
    $('wrong').hidden = $('right').hidden = finalMode;
    $('finalMark').hidden = !finalMode;
    if (!finalMode) renderPowers();
    KruQuiz.fit($('stage'));
  }
  function used(id, p) { return !!(S.powers[id] && S.powers[id][p]); }
  function use(id, p) { (S.powers[id] = S.powers[id] || {})[p] = true; save(); }
  function renderPowers() {
    var id = current().id;
    $('powers').innerHTML = '<span class="pw-lab">Power-ups:</span>' + POWERS.map(function (p) {
      var off = used(id, p.id) || (p.id === 'fifty' && (!Array.isArray(Q.choices) || Q.choices.length < 4 || !!Q._gone)) || (shown && p.id !== 'time');
      var on = p.id === 'risk' && risk;
      return '<button class="btn pw' + (on ? ' on' : '') + (used(id, p.id) ? ' used' : '') + '" data-pw="' + p.id + '"' + (off && !on ? ' disabled' : '') +
        ' aria-pressed="' + on + '">' + (on ? '🎲 Risk it: ON' : p.label) + '</button>';
    }).join('');
  }
  $('powers').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pw]');
    if (!b || b.disabled) return;
    unlockAudio();
    var id = current().id, p = b.dataset.pw;
    if (p === 'fifty') {
      var wrong = Q.choices.map(function (_, i) { return i; }).filter(function (i) { return i !== Q.answer; });
      Q._gone = shuffle(wrong).slice(0, 2);
      use(id, 'fifty'); tone([523, 392], 0.1); renderQuestion();
    } else if (p === 'time') {
      left = Math.max(0, left) + 20; total = Math.max(total, left);
      use(id, 'time'); tone([660, 880, 1047], 0.08);
      if (!running) startTimer(); else { endAt = Date.now() + left * 1000; renderClock(); }
      renderPowers();
    } else if (p === 'free') {
      use(id, 'free');
      if (risk) use(id, 'risk');
      toast('🎟 ' + current().name + ' used a free answer!');
      rightAnswer();
    } else if (p === 'risk') {
      risk = !risk; tone(risk ? [392, 523, 659] : [440], 0.08); renderPowers();
    }
  });
  function ask() {
    if (busy || !current() || S.claim || S.phase === 'final') return;
    var t = current();
    who = '';
    if (!S.deck) { openDecks(); return; }
    if (S.who && window.KruPicker && t.members && t.members.length) {
      busy = true; render();
      S.mpicked = S.mpicked || {};
      KruPicker.member({
        team: t,
        get: function () { return S.mpicked[t.id] || []; },
        set: function (ids) { S.mpicked[t.id] = ids; save(); },
        onDone: function (m) { busy = false; who = m ? m.nick : ''; openQuestion(); },
      });
      return;
    }
    openQuestion();
  }
  function openQuestion() {
    unlockAudio();
    var q = pickQuestion();
    render();
    if (!q) { toast('This deck has no questions. Choose another deck.'); openDecks(); return; }
    Q = Object.assign({}, q); shown = false; risk = false; finalMode = false;
    snapshot(); save();
    stopTimer(); total = left = S.secs; renderClock();
    $('qBack').hidden = false;
    renderQuestion();
    tone([660, 880], 0.12);
    startTimer();
  }
  function closeQuestion() { stopTimer(); $('qBack').hidden = true; risk = false; }
  function rightAnswer() {
    var t = current(), v = TIERS[tierOf(Q)].pts * (risk ? 2 : 1);
    if (risk) use(t.id, 'risk');
    closeQuestion();
    startClaim(t.id, v, !!TIERS[tierOf(Q)].steal);
  }
  $('ask').addEventListener('click', ask);
  $('go').addEventListener('click', function () { if (running) { stopTimer(); renderClock(); } else startTimer(); });
  $('reveal').addEventListener('click', function () { unlockAudio(); stopTimer(); renderClock(); shown = true; tone([523, 659]); renderQuestion(); });
  $('right').addEventListener('click', rightAnswer);
  $('wrong').addEventListener('click', function () {
    unlockAudio();
    var t = current(), tp = TIERS[tierOf(Q)].pts, rk = risk;
    if (rk) use(t.id, 'risk');
    closeQuestion();
    if (rk) { var lost = addPts(t.id, -tp, 'risk it'); toast('🎲 Risk it! ' + t.name + ' loses ' + (-lost) + ' point' + (lost === -1 ? '' : 's') + '.'); tone([262, 196], 0.15); }
    nextTurn();
  });

  // ---------- Final Wager: one question for every team ----------
  function maxBet(id) { return Math.max(0, pts(id)); }
  function openBets() {
    $('betList').innerHTML = players.map(function (t) {
      var b = S.wager[t.id] || 0, max = maxBet(t.id);
      return '<div class="wrow" data-w="' + esc(t.id) + '"><span class="wn">' + esc(t.name) + '<small>' + pts(t.id) + ' pts</small></span>' +
        '<button class="btn" data-bet="-1" aria-label="Bet 1 less"' + (b <= 0 ? ' disabled' : '') + '>−</button>' +
        '<output class="wb' + (b && b === max ? ' allin' : '') + '">' + b + '</output>' +
        '<button class="btn" data-bet="1" aria-label="Bet 1 more"' + (b >= max ? ' disabled' : '') + '>+</button>' +
        '<button class="btn gold allin-btn" data-bet="all"' + (!max ? ' disabled' : '') + ' aria-pressed="' + (b > 0 && b === max) + '">ALL IN</button></div>';
    }).join('');
    $('betsBack').hidden = false;
  }
  $('betList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-bet]'), row = e.target.closest('[data-w]');
    if (!b || !row) return;
    var id = row.dataset.w, max = maxBet(id), cur = S.wager[id] || 0;
    S.wager[id] = b.dataset.bet === 'all' ? (cur === max ? 0 : max) : Math.max(0, Math.min(max, cur + Number(b.dataset.bet)));
    save(); openBets();
  });
  $('betsDone').addEventListener('click', function () {
    $('betsBack').hidden = true;
    var q = pickQuestion(['hard', 'impossible']);
    if (!q) { toast('This deck has no questions. Choose another deck.'); openDecks(); return; }
    unlockAudio();
    Q = Object.assign({}, q); shown = false; risk = false; finalMode = true;
    stopTimer(); total = left = Math.max(S.secs, 30); renderClock();
    $('qBack').hidden = false;
    renderQuestion();
    tone([523, 659, 784], 0.12);
    startTimer();
  });
  $('finalMark').addEventListener('click', function () { closeQuestion(); finalMode = false; openMarks(); });
  function openMarks() {
    $('markList').innerHTML = players.map(function (t) {
      var m = S.marks[t.id], b = S.wager[t.id] || 0;
      return '<div class="wrow" data-m="' + esc(t.id) + '"><span class="wn">' + esc(t.name) + '<small>' + (b && b === pts(t.id) ? 'ALL IN ' : 'bet ') + b + '</small></span>' +
        '<button class="btn mk-right" data-mark="right" aria-pressed="' + (m === 'right') + '">✓ Right</button>' +
        '<button class="btn mk-wrong" data-mark="wrong" aria-pressed="' + (m === 'wrong') + '">✗ Wrong</button></div>';
    }).join('');
    var all = players.every(function (t) { return S.marks[t.id]; });
    $('markApply').disabled = !all;
    $('markApply').textContent = all ? 'Add up the scores ✓' : 'Mark every team first';
    $('marksBack').hidden = false;
  }
  $('markList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mark]'), row = e.target.closest('[data-m]');
    if (!b || !row) return;
    S.marks[row.dataset.m] = S.marks[row.dataset.m] === b.dataset.mark ? undefined : b.dataset.mark;
    save(); openMarks();
  });
  $('markApply').addEventListener('click', function () {
    players.forEach(function (t) {
      var bet = S.wager[t.id] || 0;
      if (bet) addPts(t.id, S.marks[t.id] === 'right' ? bet : -bet, S.marks[t.id] === 'right' ? 'won the wager' : 'lost the wager');
    });
    S.phase = 'done'; S.hist = [];
    save(); $('marksBack').hidden = true; render();
    var lead = empireLeaders();
    toast(lead.length ? '🏝 Biggest island group: ' + lead.map(function (id) { return team(id).name; }).join(' & ') + ' +' + EMPIRE + '!' : 'The scores are in!');
    tone([523, 659, 784, 1047], 0.12, 0.35);
  });
  $('markClose').addEventListener('click', function () { $('marksBack').hidden = true; });

  // ---------- ⋯ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function renderSecs() { $('secsRow').innerHTML = TIMES.map(function (s) { return '<button class="btn" data-secs="' + s + '" aria-pressed="' + (s === S.secs) + '">' + s + ' s</button>'; }).join(''); }
  function renderWho() { $('whoOn').textContent = '🎯 Who answers: ' + (S.who ? 'on' : 'off'); $('whoOn').setAttribute('aria-pressed', String(!!S.who)); }
  $('more').addEventListener('click', function () {
    renderSecs(); renderWho(); disarm();
    $('undoMove').disabled = !S.hist.length || busy || S.phase !== 'play';
    $('skip').disabled = busy || !!S.claim || S.phase !== 'play';
    $('finalBtn').disabled = busy || !!S.claim || S.phase !== 'play';
    $('menuBack').hidden = false;
  });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('secsRow').addEventListener('click', function (e) { var b = e.target.closest('[data-secs]'); if (!b) return; S.secs = +b.dataset.secs; save(); renderSecs(); });
  $('whoOn').addEventListener('click', function () { S.who = !S.who; save(); renderWho(); });
  $('deckBtn').addEventListener('click', function () { closeMenu(); openDecks(); });
  $('skip').addEventListener('click', function () { closeMenu(); nextTurn(); });
  $('undoMove').addEventListener('click', function () { closeMenu(); if (undo()) toast('Back to before the last question.'); });
  $('finalBtn').addEventListener('click', function () {
    closeMenu();
    S.phase = 'final'; S.wager = {}; S.marks = {};
    save(); render(); openBets();
  });
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: 'Quiz Island' }); });
  function disarm() { $('newGame').classList.remove('armed'); $('newGame').textContent = 'New game (empty map, 0 points)'; }
  $('newGame').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again: erase the map and the points'; setTimeout(disarm, 3500); return; }
    players.forEach(function (t) { var p = pts(t.id); if (p) Kru.score(t.id, -p, 'reset'); });
    fresh(S.deck);
    save(); closeMenu(); render();
  });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden || !$('deckBack').hidden || !$('betsBack').hidden || !$('marksBack').hidden) return;
    if (!$('qBack').hidden) {
      if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
      else if (e.key === 'a' || e.key === 'A') $('reveal').click();
    } else if (e.code === 'Space') { e.preventDefault(); ask(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', function () { if (!$('qBack').hidden) KruQuiz.fit($('stage')); });

  Kru.onFinishRequest(function () { Kru.finish(teams.map(function (t) { return { teamId: t.id, points: t.teacher ? 0 : finalPts(t.id) }; })); });

  // ---------- start ----------
  function fresh(deck) {
    S = { v: 1, level: S ? S.level : '', deck: deck || '', map: newMap(), pts: {}, turn: 0, skip: {}, powers: {}, mpicked: {}, who: S ? !!S.who : false,
      secs: S ? S.secs : 20, hist: [], claim: null, phase: 'play', wager: {}, marks: {}, introDone: S ? S.introDone : false, order: {}, qi: {} };
    buildPool();
  }
  var contentReady = fetch('/games/race-board/content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    Promise.all([contentReady, KruQuiz.load(session.level, session)]).then(function (both) {
      var c = both[0], QZ = both[1], lv = c.questions && c.questions[QZ.level] ? QZ.level : 'M.2';
      DECKS = buildDecks(c, QZ, lv);
      teams = Kru.allTeams();
      players = teams.filter(function (t) { return !t.teacher; });
      KruEnd.setup({ standings: function () { return players.map(function (t) { return { name: t.name, points: finalPts(t.id) }; }); } });
      var saved = session.resume;
      if (saved && saved.v === 1 && saved.level === QZ.level && saved.map && saved.map.own && saved.map.own.length === CELLS && (!saved.deck || deckByKey(saved.deck))) {
        S = saved; buildPoolKeep();
      } else {
        S = null; fresh(QZ.unit ? 'unit' : '');
        S.level = QZ.level;
      }
      S.hist = S.hist || []; S.skip = S.skip || {}; S.powers = S.powers || {}; S.mpicked = S.mpicked || {}; S.wager = S.wager || {}; S.marks = S.marks || {}; S.phase = S.phase || 'play';
      INTRO = KruIntro.forLevel(c, QZ.level);
      render();
      var afterIntro = function () {
        S.introDone = true; save();
        if (!S.deck) openDecks();
        else if (S.phase === 'final') openBets();
      };
      if (!S.introDone) KruIntro.show(INTRO, { title: 'Quiz Island' }).then(afterIntro); else afterIntro();
    }).catch(function (err) {
      $('map').textContent = 'Could not load the questions. Close the game and open it again.';
      if (window.console) console.error(err);
    });
  });
  /** A saved game keeps its order and place in the deck when the deck still has the same number of questions. */
  function buildPoolKeep() {
    var d = deckByKey(S.deck);
    POOL = { easy: [], regular: [], hard: [], impossible: [] };
    if (d) d.qs.forEach(function (q) { POOL[tierOf(q)].push(q); });
    var ok = S.order && S.qi && ORDER.every(function (t) { return S.order[t] && S.order[t].length === POOL[t].length; });
    if (!ok) buildPool();
  }
})();
