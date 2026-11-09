/* Reading Think Tank (Henry, Nov 10): the five reading games in one game show, with an island map.
   Rounds: 🧩 Order It (2 stories) · ✅ True or False (4 statements) · 🔍 Spot It (2 stories) · 🧠 Remember It
   (read, then the story hides, 3 questions) · 📋 Scan It (3 questions) · 💰 Final Wager (read, hide, bet, answer).
   After each question Henry marks who got it right; each of those teams claims an island (+1).
   💎 treasure island +3 more · 🌋 hidden volcano: it erupts and you lose your newest island ·
   ⚔ the last question of each round is a steal question (take another team's island) · a full map = every right answer
   steals · at the end the biggest connected group of islands gets +5 🏝.
   Stories: games/shared/stories.json, one level up (M.1 → M.2 stories, …, M.3 → M.4). Scan It texts: content.json. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var UP = { 'M.1': 'M.2', 'M.2': 'M.3', 'M.3': 'M.4' };
  var COLS = 8, ROWS = 5, CELLS = COLS * ROWS, TREASURES = 4, VOLCANOES = 3, EMPIRE = 5;
  var L = 'ABCDE';
  var ROUNDS = [
    { id: 'order', name: 'Order It', icon: '🧩', secs: 90, rule: 'Write the right order of the letters.' },
    { id: 'tf', name: 'True or False', icon: '✅', secs: 20, rule: 'True or false? If false, say what is right.' },
    { id: 'spot', name: 'Spot It', icon: '🔍', secs: 90, rule: 'Find the 3 mistakes and fix them.' },
    { id: 'remember', name: 'Remember It', icon: '🧠', secs: 30, read: 60, rule: 'Read it. Then the story hides!' },
    { id: 'scan', name: 'Scan It', icon: '📋', secs: 45, rule: 'Find the answer fast.' },
    { id: 'wager', name: 'Final Wager', icon: '💰', secs: 30, read: 60, rule: 'Read it, bet, then answer.' },
  ];
  var $ = function (id) { return document.getElementById(id); };

  var STORIES = [], SCANS = [], teams = [], INTRO = [];
  var S = null; // saved: { v, level, plan, i, phase, map, pts, secs, wager, marks, settled, queue, hist, introDone }
  var left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function save() { Kru.saveState(S); }
  function shuffle(a) { for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; } return a; }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function pts(id) { return S.pts[id] || 0; }
  function team(id) { return teams.find(function (t) { return t.id === id; }); }
  function color(id) { return COLORS[teams.indexOf(team(id)) % COLORS.length]; }
  function Q() { return S.plan[S.i]; }
  function R() { return ROUNDS[Q().r]; }
  function story() { return STORIES[Q().s]; }

  // ---------- sound (after a tap) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function tone(freqs, gap, dur) {
    if (!audio) return;
    try {
      freqs.forEach(function (f, i) {
        var t = audio.currentTime + i * (gap || 0.14), o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.33, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.25));
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.25) + 0.05);
      });
    } catch (e) {}
  }

  // ---------- the plan: 7 different stories + 1 Scan It text, ~15 questions ----------
  function newPlan() {
    var st = shuffle(range(STORIES.length)), sc = Math.floor(Math.random() * SCANS.length), plan = [];
    var take = function () { return st.shift(); };
    var o1 = take(), o2 = take();
    plan.push({ r: 0, s: o1 }, { r: 0, s: o2, steal: true });
    var t = take();
    for (var k = 0; k < 4; k++) plan.push({ r: 1, s: t, k: k, steal: k === 3 });
    var p1 = take(), p2 = take();
    plan.push({ r: 2, s: p1 }, { r: 2, s: p2, steal: true });
    var m = take();
    for (k = 0; k < 3; k++) plan.push({ r: 3, s: m, k: k, read: k === 0, steal: k === 2 });
    for (k = 0; k < 3; k++) plan.push({ r: 4, sc: sc, k: k, steal: k === 2 });
    plan.push({ r: 5, s: take(), k: 2, read: true });
    return plan;
  }
  /** Where each round starts in the plan, and which question of the round this is. */
  function roundPos() {
    var n = 0, of = 0;
    S.plan.forEach(function (q, j) { if (q.r === Q().r) { of++; if (j <= S.i) n++; } });
    return { n: n, of: of };
  }

  // ---------- the island map ----------
  function newMap() {
    var cells = shuffle(range(CELLS));
    return { own: new Array(CELLS).fill(null), ash: [], treasure: cells.slice(0, TREASURES), volcano: cells.slice(TREASURES, TREASURES + VOLCANOES), order: {} };
  }
  function owned(id) { var a = []; S.map.own.forEach(function (o, c) { if (o === id) a.push(c); }); return a; }
  function emptyCells() { var a = []; S.map.own.forEach(function (o, c) { if (!o && S.map.ash.indexOf(c) < 0) a.push(c); }); return a; }
  function biggestGroup(id) {
    var mine = owned(id), seen = {}, best = 0;
    mine.forEach(function (c) {
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
  /** The team(s) with the biggest connected group of islands (they get +5 🏝 at the end). */
  function empireLeaders() {
    var sizes = teams.map(function (t) { return biggestGroup(t.id); }), max = Math.max.apply(null, sizes.concat([0]));
    if (max < 2) return [];
    return teams.filter(function (t, i) { return sizes[i] === max; }).map(function (t) { return t.id; });
  }
  function finalPts(id) { return pts(id) + (empireLeaders().indexOf(id) >= 0 ? EMPIRE : 0); }

  function renderMap() {
    var claimer = S.queue && S.queue.length ? S.queue[0] : null, stealing = claimer && canSteal(), leaders = empireLeaders();
    $('map').innerHTML = range(CELLS).map(function (c) {
      var o = S.map.own[c], ash = S.map.ash.indexOf(c) >= 0, tr = S.map.treasure.indexOf(c) >= 0;
      var cls = 'isle' + (o ? ' owned' : '') + (ash ? ' ash' : '') + (tr && !o ? ' treasure' : '') +
        (claimer && !ash && (!o || (stealing && o !== claimer)) ? ' can' : '') + (o && leaders.indexOf(o) >= 0 ? ' empire' : '');
      var label = ash ? '🌋' : o ? String(teams.indexOf(team(o)) + 1) : tr ? '💎' : '';
      return '<button class="' + cls + '" data-c="' + c + '"' + (o ? ' style="--c:' + color(o) + '"' : '') + ' aria-label="Island ' + (c + 1) + (o ? ', ' + esc(team(o).name) : ash ? ', volcano' : tr ? ', treasure' : ', empty') + '">' + label + '</button>';
    }).join('');
    $('mapKey').innerHTML = teams.map(function (t, i) {
      var n = owned(t.id).length;
      return '<span class="mk' + (t.id === claimer ? ' now' : '') + '"><i style="background:' + color(t.id) + '">' + (i + 1) + '</i>' + esc(t.name) + ' ' + n + (leaders.indexOf(t.id) >= 0 ? ' 🏝' : '') + '</span>';
    }).join('');
    if (claimer) {
      var nm = esc(team(claimer).name);
      $('mapMsg').innerHTML = '<i class="dot" style="background:' + color(claimer) + '"></i>' + nm + (stealing ? ': ⚔ claim or steal an island!' : ': tap an island');
    } else $('mapMsg').textContent = emptyCells().length ? 'Biggest group at the end: +' + EMPIRE + ' 🏝' : 'The map is full: right answers steal!';
    $('mapSkip').hidden = $('mapUndo').hidden = !claimer && !S.hist.length;
    $('mapSkip').hidden = !claimer;
    $('mapUndo').disabled = !S.hist.length;
    $('mapDone').textContent = claimer ? 'Done ✓' : 'Close';
  }
  function canSteal() { return (Q() && Q().steal) || !emptyCells().length; }
  function openMap() { renderMap(); $('mapBack').hidden = false; }
  function closeMap() {
    $('mapBack').hidden = true;
    if (S.phase === 'claim') { S.queue = []; S.phase = 'done'; save(); }
    render();
  }
  function snapshot() { S.hist.push({ own: S.map.own.slice(), ash: S.map.ash.slice(), pts: JSON.parse(JSON.stringify(S.pts)), queue: (S.queue || []).slice() }); if (S.hist.length > 40) S.hist.shift(); }
  function addPts(id, d, why) {
    if (!d) return;
    S.pts[id] = pts(id) + d;
    Kru.score(id, d, why);
  }
  function claim(c) {
    var id = S.queue[0];
    if (!id) return;
    var o = S.map.own[c], ash = S.map.ash.indexOf(c) >= 0;
    if (ash || o === id) return;
    if (o && !canSteal()) { toast('Only ⚔ steal questions can take another team\'s island.'); return; }
    unlockAudio();
    snapshot();
    S.queue.shift();
    if (o) {
      S.map.own[c] = id; (S.map.order[id] = S.map.order[id] || []).push(c);
      addPts(id, 1, 'stole an island'); addPts(o, -1, 'island stolen');
      toast('⚔ ' + team(id).name + ' stole an island from ' + team(o).name + '!'); tone([392, 523, 659], 0.1);
    } else if (S.map.volcano.indexOf(c) >= 0) {
      // the volcano erupts: the island turns to ash, and the team loses its newest island
      S.map.ash.push(c);
      var mine = owned(id), lost = mine.length ? (S.map.order[id] || []).filter(function (x) { return S.map.own[x] === id; }).pop() : null;
      if (lost == null && mine.length) lost = mine[mine.length - 1];
      if (lost != null) { S.map.own[lost] = null; addPts(id, -1, 'volcano'); }
      toast('🌋 A volcano! ' + team(id).name + (lost != null ? ' loses an island.' : ' had nothing to lose.')); tone([196, 165, 131], 0.16, 0.4);
    } else {
      S.map.own[c] = id;
      (S.map.order[id] = S.map.order[id] || []).push(c);
      var tr = S.map.treasure.indexOf(c) >= 0;
      addPts(id, tr ? 4 : 1, tr ? 'treasure island' : 'island');
      toast((tr ? '💎 Treasure! +4 ' : '🏝 +1 ') + team(id).name); tone(tr ? [523, 659, 784, 1047] : [660, 880], 0.1);
    }
    if (!S.queue.length) S.phase = 'done';
    save(); renderMap(); renderTeams();
    if (!S.queue.length) setTimeout(function () { if (!$('mapBack').hidden && S.phase === 'done') closeMap(); }, 900);
  }
  $('map').addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) claim(+b.dataset.c); });
  $('mapSkip').addEventListener('click', function () { if (!S.queue.length) return; S.queue.shift(); if (!S.queue.length) S.phase = 'done'; save(); renderMap(); });
  $('mapDone').addEventListener('click', closeMap);
  $('mapBack').addEventListener('click', function (e) { if (e.target === this && S.phase !== 'claim') closeMap(); });
  $('mapUndo').addEventListener('click', function () {
    var h = S.hist.pop();
    if (!h) return;
    teams.forEach(function (t) { var d = (h.pts[t.id] || 0) - pts(t.id); if (d) Kru.score(t.id, d, 'undo'); });
    S.map.own = h.own; S.map.ash = h.ash; S.pts = h.pts; S.queue = h.queue;
    if (S.queue.length && S.phase === 'done') S.phase = 'claim';
    save(); renderMap(); renderTeams();
  });
  $('mapBtn').addEventListener('click', function () { unlockAudio(); openMap(); });

  // ---------- the stage ----------
  function mix(id, n) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    var a = range(n);
    for (var j = n - 1; j > 0; j--) { h = (h * 1103515245 + 12345) >>> 0; var r = h % (j + 1); var x = a[j]; a[j] = a[r]; a[r] = x; }
    if (a.every(function (v, idx) { return v === idx; })) a.push(a.shift());
    return a;
  }
  function re(word) { return new RegExp("(^|[^\\w'])(" + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\w])'); }
  function cardHtml() {
    var q = Q(), r = ROUNDS[q.r], rv = S.phase !== 'ask' && S.phase !== 'read' && S.phase !== 'bet';
    var st = q.s != null ? STORIES[q.s] : null, h = '';
    var tag = q.steal ? '<span class="steal">⚔ Steal question</span> ' : '';
    if (r.id === 'order') {
      var m = mix(st.id, 5);
      var rows = rv ? st.sentences.map(function (s, i) { return '<li class="ok"><span class="tag">' + L[m.indexOf(i)] + '</span><span>' + esc(s) + '</span></li>'; })
        : m.map(function (si, pos) { return '<li><span class="tag">' + L[pos] + '</span><span>' + esc(st.sentences[si]) + '</span></li>'; });
      h = (tag ? '<div class="q-top">' + tag + '</div>' : '') + '<ol class="lines" data-fit="22,18">' + rows.join('') + '</ol>';
    } else if (r.id === 'tf') {
      var t = st.tf[q.k];
      h = '<p class="story small" data-fit="19,18">' + esc(st.sentences.join(' ')) + '</p>' +
        '<div class="statement" data-fit="26,18">' + tag + esc(t.s) + '</div>' +
        (rv ? '<div class="ans-line">' + (t.a ? '✔ TRUE' : '✘ FALSE') + (t.fix ? ' · ' + esc(t.fix) : '') + '</div>' : '');
    } else if (r.id === 'spot') {
      var parts = st.sentences.map(function (s, i) {
        var mk = st.mistakes.filter(function (x) { return x.i === i; })[0];
        if (!mk) return esc(s);
        var hit = s.match(re(mk.right));
        if (!hit) return esc(s);
        var at = hit.index + hit[1].length;
        return esc(s.slice(0, at)) + (rv ? '<del>' + esc(mk.wrong) + '</del> <ins>' + esc(mk.right) + '</ins>' : esc(mk.wrong)) + esc(s.slice(at + mk.right.length));
      });
      h = '<div class="q-top">' + tag + '<span class="hint">' + (rv ? '' : 'Find 3 mistakes') + '</span></div><p class="story" data-fit="24,18">' + parts.join(' ') + '</p>';
    } else if (r.id === 'remember' || r.id === 'wager') {
      var qq = st.questions[q.k];
      if (S.phase === 'read') h = '<div class="q-top"><b class="st-title">' + esc(st.title) + '</b> <span class="hint">· read it, then it hides!</span></div><p class="story" data-fit="24,18">' + esc(st.sentences.join(' ')) + '</p>';
      else if (S.phase === 'bet') h = '<div class="big-msg" data-fit="30,18">💰 Teams: bet any of your points (or ALL IN), then see the question.</div>';
      else h = '<div class="q-top">' + tag + '<span class="hint">' + esc(st.title) + ' · the story is hidden</span></div>' +
        '<div class="question" data-fit="32,18">' + (r.id === 'remember' ? '<b class="lvl l' + q.k + '">' + ['Easy', 'Medium', 'Hard'][q.k] + '</b> ' : '') + esc(qq.q) + '</div>' +
        (rv ? '<div class="ans-line">' + esc(qq.a) + '</div>' : '');
    } else if (r.id === 'scan') {
      var it = SCANS[q.sc], qs = it.qs[q.k];
      var table = '<table class="doc-t">' + (it.cols.length ? '<thead><tr>' + it.cols.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead>' : '') +
        '<tbody>' + it.rows.map(function (row) { return '<tr>' + row.map(function (x, i) { return it.cols.length || i ? '<td>' + esc(x) + '</td>' : '<th scope="row">' + esc(x) + '</th>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
      h = '<div class="scan"><div class="doc" data-fit="19,18"><div class="doc-head"><span class="kind">' + esc(it.kind) + '</span>' + esc(it.head) + '</div>' + table + '</div>' +
        '<div class="scan-q"><div class="question" data-fit="24,18">' + tag + esc(qs.q) + '</div>' + (rv ? '<div class="ans-line">→ ' + esc(qs.a) + '</div>' : '') + '</div></div>';
    }
    return h;
  }
  function fit() {
    var stage = $('stage'), els = Array.prototype.slice.call(stage.querySelectorAll('[data-fit]'));
    els.forEach(function (el) { el.style.fontSize = el.dataset.fit.split(',')[0] + 'px'; });
    for (var guard = 0; guard < 80 && (stage.scrollHeight > stage.clientHeight + 1); guard++) {
      var shrunk = false;
      els.forEach(function (el) {
        var mm = el.dataset.fit.split(','), size = parseFloat(el.style.fontSize);
        if (size > +mm[1] && stage.scrollHeight > stage.clientHeight + 1) { el.style.fontSize = Math.max(+mm[1], size - 2) + 'px'; shrunk = true; }
      });
      if (!shrunk) break;
    }
  }
  /** The one main button: Reveal → Who got it? → Next (and Hide story / Show question for read and bet). */
  var MAIN = { read: 'Hide story', bet: 'Set bets', ask: 'Reveal', shown: '✓ Who got it?', claim: '🗺 Islands', done: 'Next ▶', mark: 'Mark answers', settled: '🏆 Winners' };
  function render() {
    var q = Q(), r = R(), pos = roundPos();
    $('round').innerHTML = r.icon + ' <b>' + esc(r.name) + '</b>';
    $('card').innerHTML = cardHtml();
    KruCorner.set($('stage'), 'R' + (q.r + 1) + ' · ' + pos.n + '/' + pos.of);
    var ph = S.phase;
    $('main').textContent = r.id === 'wager' && ph === 'shown' ? 'Mark answers' : r.id === 'wager' && ph === 'done' ? '🏆 Winners' : MAIN[ph];
    $('main').className = 'btn ' + (ph === 'ask' ? 'teal' : 'gold');
    $('stage').classList.toggle('steal-q', !!q.steal);
    renderTeams(); renderClock(); fit();
  }
  function renderTeams() {
    var wager = R().id === 'wager' && !S.settled, leaders = empireLeaders();
    $('strip').innerHTML = teams.map(function (t, i) {
      var b = S.wager[t.id] || 0, isles = owned(t.id).length;
      return '<button class="tile" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-label="' + esc(t.name) + ', ' + pts(t.id) + ' points">' +
        '<span class="tn">' + esc(t.name) + '</span>' +
        (wager && S.phase !== 'read' ? '<span class="tb' + (b && b === pts(t.id) ? ' allin' : '') + '">' + (b && b === pts(t.id) ? 'ALL IN ' + b : 'bet ' + b) + '</span>' : '') +
        '<span class="tp">' + pts(t.id) + (wager ? '' : ' <small class="ti">🏝' + isles + (leaders.indexOf(t.id) >= 0 ? '+' : '') + '</small>') + '</span></button>';
    }).join('');
  }

  // ---------- timer ----------
  function secsFor() { var r = R(); return S.phase === 'read' ? (S.secs[r.id + ':read'] || r.read) : (S.secs[r.id] || r.secs); }
  function renderClock() {
    $('digits').textContent = fmt(left);
    $('digits').className = 'digits' + (left <= 0 ? ' done' : left <= 5 && running ? ' warn' : '');
    $('go').textContent = running ? 'Pause' : left <= 0 ? 'Again' : left < total ? 'Resume' : 'Start';
    $('go').disabled = S.phase === 'bet' || S.phase === 'claim' || S.phase === 'done';
  }
  function tick() {
    if (!running) return;
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) { left = 0; running = false; clearInterval(timer); tone([880, 660, 990], 0.2); }
    renderClock();
  }
  function stopTimer() { if (running) left = Math.max(0, (endAt - Date.now()) / 1000); running = false; clearInterval(timer); }
  function startTimer() { unlockAudio(); if (left <= 0) left = total; running = true; endAt = Date.now() + left * 1000; clearInterval(timer); timer = setInterval(tick, 200); renderClock(); }
  function resetTimer() { stopTimer(); total = left = secsFor(); renderClock(); }
  $('go').addEventListener('click', function () { if (running) { stopTimer(); renderClock(); } else startTimer(); });

  // ---------- flow ----------
  function goTo(i) {
    S.i = Math.max(0, Math.min(S.plan.length - 1, i));
    var q = Q();
    S.phase = q.read ? 'read' : 'ask';
    S.queue = [];
    if (R().id === 'wager') { S.wager = {}; S.marks = {}; S.settled = false; }
    save(); resetTimer(); render();
    if (S.i === 0 || S.plan[S.i - 1].r !== q.r) toast(R().icon + ' ' + R().name + ': ' + R().rule);
  }
  $('main').addEventListener('click', function () {
    unlockAudio();
    var r = R();
    if (S.phase === 'read') {
      stopTimer(); S.phase = r.id === 'wager' ? 'bet' : 'ask'; save(); resetTimer(); render();
      if (r.id === 'wager') openBets();
    } else if (S.phase === 'bet') openBets();
    else if (S.phase === 'ask') { stopTimer(); S.phase = 'shown'; save(); tone([523, 659]); render(); }
    else if (S.phase === 'shown') { if (r.id === 'wager') openMarks(); else openWho(); }
    else if (S.phase === 'claim') openMap();
    else if (S.phase === 'done') {
      if (r.id === 'wager') return showWinners();
      if (S.i + 1 < S.plan.length) goTo(S.i + 1); else showWinners();
    }
  });
  function showWinners() { KruEnd.show(); }

  // ---------- who got it right → claim islands ----------
  var picked = [];
  function openWho() {
    picked = [];
    renderWho();
    $('whoBack').hidden = false;
  }
  function renderWho() {
    $('whoList').innerHTML = teams.map(function (t, i) {
      return '<button class="btn who-t" data-w="' + esc(t.id) + '" aria-pressed="' + (picked.indexOf(t.id) >= 0) + '" style="--c:' + COLORS[i % COLORS.length] + '">' + esc(t.name) + '</button>';
    }).join('');
    $('whoGo').disabled = !picked.length;
    $('whoTitle').textContent = 'Who got it right?' + (Q().steal ? ' ⚔ They can steal!' : '');
  }
  $('whoList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-w]');
    if (!b) return;
    var id = b.dataset.w, at = picked.indexOf(id);
    if (at >= 0) picked.splice(at, 1); else picked.push(id);
    renderWho();
  });
  $('whoClose').addEventListener('click', function () { $('whoBack').hidden = true; });
  $('whoNone').addEventListener('click', function () { $('whoBack').hidden = true; S.phase = 'done'; save(); render(); });
  $('whoGo').addEventListener('click', function () {
    $('whoBack').hidden = true;
    // claiming order: the order of the teams on the strip
    S.queue = teams.map(function (t) { return t.id; }).filter(function (id) { return picked.indexOf(id) >= 0; });
    S.phase = 'claim'; save(); render(); openMap();
  });

  // ---------- Final Wager (as in Think Tank Showdown) ----------
  function maxBet(id) { return Math.max(0, pts(id)); }
  function openBets() {
    $('betList').innerHTML = teams.map(function (t) {
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
    save(); renderTeams(); openBets();
  });
  $('betsDone').addEventListener('click', function () {
    $('betsBack').hidden = true;
    if (S.phase === 'bet') { S.phase = 'ask'; save(); resetTimer(); render(); }
  });
  function openMarks() {
    $('markList').innerHTML = teams.map(function (t) {
      var m = S.marks[t.id], b = S.wager[t.id] || 0;
      return '<div class="wrow" data-m="' + esc(t.id) + '"><span class="wn">' + esc(t.name) + '<small>' + (b && b === pts(t.id) ? 'ALL IN ' : 'bet ') + b + '</small></span>' +
        '<button class="btn mk-right" data-mark="right" aria-pressed="' + (m === 'right') + '">✓ Right</button>' +
        '<button class="btn mk-wrong" data-mark="wrong" aria-pressed="' + (m === 'wrong') + '">✗ Wrong</button></div>';
    }).join('');
    var all = teams.every(function (t) { return S.marks[t.id]; });
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
    teams.forEach(function (t) {
      var bet = S.wager[t.id] || 0;
      if (bet) addPts(t.id, S.marks[t.id] === 'right' ? bet : -bet, S.marks[t.id] === 'right' ? 'won the wager' : 'lost the wager');
    });
    S.settled = true; S.phase = 'done';
    save(); $('marksBack').hidden = true; render();
    var lead = empireLeaders();
    toast(lead.length ? '🏝 Biggest island group: ' + lead.map(function (id) { return team(id).name; }).join(' & ') + ' +' + EMPIRE + '!' : 'The scores are in!');
    tone([523, 659, 784, 1047], 0.12, 0.35);
  });
  $('markClose').addEventListener('click', function () { $('marksBack').hidden = true; });

  // ---------- toast ----------
  var toastTimer = 0;
  function toast(text) { $('toastText').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { $('toast').hidden = true; }, 3500); }

  // ---------- ⋯ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('newGame').classList.remove('armed'); $('newGame').textContent = 'New game (new stories, empty map)'; }
  function renderMenu() {
    $('secsNow').textContent = secsFor() + ' s';
    $('menuRounds').innerHTML = ROUNDS.map(function (r, i) {
      var first = S.plan.findIndex(function (q) { return q.r === i; });
      return '<button class="btn" data-go="' + first + '" aria-pressed="' + (i === Q().r) + '">' + r.icon + ' ' + esc(r.name) + '</button>';
    }).join('');
  }
  $('more').addEventListener('click', function () { renderMenu(); disarm(); $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  function setSecs(d) {
    var key = S.phase === 'read' ? R().id + ':read' : R().id;
    S.secs[key] = Math.max(10, Math.min(300, secsFor() + d));
    save(); resetTimer(); renderMenu();
  }
  $('secsLess').addEventListener('click', function () { setSecs(-15); });
  $('secsMore').addEventListener('click', function () { setSecs(15); });
  $('menuRounds').addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) { closeMenu(); goTo(+b.dataset.go); } });
  $('skipQ').addEventListener('click', function () { closeMenu(); if (S.i + 1 < S.plan.length) goTo(S.i + 1); });
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: 'Reading Think Tank' }); });
  $('newGame').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again: new stories, empty map, scores to 0'; setTimeout(disarm, 3500); return; }
    teams.forEach(function (t) { if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'new game'); });
    S.pts = {}; S.map = newMap(); S.plan = newPlan(); S.hist = []; S.secs = S.secs || {};
    closeMenu(); goTo(0);
  });

  document.addEventListener('keydown', function (e) {
    if (['menuBack', 'whoBack', 'mapBack', 'betsBack', 'marksBack'].some(function (id) { return !$(id).hidden; })) return;
    if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
    else if (e.key === 'ArrowRight') $('main').click();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  // the final scores include the island bonus (+5 🏝 for the biggest connected group)
  Kru.onFinishRequest(function () { Kru.finish(teams.map(function (t) { return { teamId: t.id, points: finalPts(t.id) }; })); });

  // ---------- start ----------
  var get = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); };
  var ready = Promise.all([get('content.json'), get('/games/shared/stories.json')]);
  Kru.ready(function (session) {
    ready.then(function (both) {
      var c = both[0], bank = both[1];
      var level = c[session.level] ? session.level : 'M.2';
      STORIES = bank[UP[level]] || bank[level];
      SCANS = c[level].scan;
      teams = Kru.allTeams();
      KruEnd.setup({ standings: function () { return teams.map(function (t) { return { name: t.name, points: finalPts(t.id), teacher: !!t.teacher }; }); } });
      var saved = session.resume;
      var okPlan = saved && Array.isArray(saved.plan) && saved.plan.every(function (q) { return (q.s == null || STORIES[q.s]) && (q.sc == null || SCANS[q.sc]); });
      if (saved && saved.v === 1 && saved.level === level && okPlan && saved.map && saved.map.own && saved.map.own.length === CELLS) S = saved;
      else S = { v: 1, level: level, plan: newPlan(), i: 0, phase: 'ask', map: newMap(), pts: {}, secs: {}, wager: {}, marks: {}, settled: false, queue: [], hist: [], introDone: false };
      S.hist = S.hist || []; S.queue = S.queue || []; S.secs = S.secs || {}; S.wager = S.wager || {}; S.marks = S.marks || {};
      if (!saved || S !== saved) goTo(0); else { total = left = secsFor(); render(); if (S.phase === 'claim') openMap(); }
      INTRO = KruIntro.forLevel(c, level);
      if (!S.introDone) KruIntro.show(INTRO, { title: 'Reading Think Tank' }).then(function () { S.introDone = true; save(); });
    }).catch(function (err) {
      $('card').textContent = 'Could not load the stories. Close the game and open it again.';
      if (window.console) console.error(err);
    });
  });
})();
