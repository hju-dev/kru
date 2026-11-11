/* Race Board (Henry, Nov 9): a 60-square race. On its turn a team answers a question.
   Questions come in 4 tiers: easy (1 die, mostly 1-3), regular (1 fair die), hard (2 dice, mostly 7+) and
   impossible (2 dice, mostly 9+); hard and impossible are rarer. Wrong = roll the back die and move back.
   Exact roll to finish: extra steps bounce back. Squares: ★ forward, ⚠ back, 🎲 roll again, ? chance card,
   plus two secret squares (a trap that skips your next turn, a slide forward) that work only for the first team there.
   Points (for the Sheet and the podium) = squares from START, plus 3 / 2 / 1 for finishing 1st / 2nd / 3rd.
   Questions: Race Board's own bank for the level (+ Henry's Questions tab), or the unit picked on the setup screen.
   The teacher's team doesn't race. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  // pips on a 3 x 3 grid; 7-9 are for the big purple dice (4 to 9)
  var FACES = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
    7: [0, 2, 3, 4, 5, 6, 8], 8: [0, 1, 2, 3, 5, 6, 7, 8], 9: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
  var BIG_MIN = 4; // a big die shows 4 to 9, so two big dice never total less than 8
  var TIMES = [10, 20, 30, 45, 60];
  var COLS = 12, FINISH = 59; // squares 0 (START) to 59 (FINISH), a snake of 12 x 5
  var SPECIAL = {
    4: { t: 'chance' }, 8: { t: 'go', n: 2 }, 11: { t: 'chance' }, 15: { t: 'back', n: 2 }, 18: { t: 'chance' }, 22: { t: 'again' },
    26: { t: 'chance' }, 30: { t: 'go', n: 3 }, 33: { t: 'chance' }, 37: { t: 'back', n: 3 }, 41: { t: 'chance' }, 44: { t: 'go', n: 2 },
    47: { t: 'again' }, 48: { t: 'chance' }, 52: { t: 'back', n: 3 }, 55: { t: 'chance' },
  };
  var SLIDE = 8; // the secret slide: forward 8
  var BONUS = [3, 2, 1];
  // how often each tier comes up, and its dice (Henry, Nov 11). A wrong answer rolls the same dice backwards.
  var TIERS = {
    easy: { label: 'Easy', share: 30, dice: 1, big: false, note: '1 die' },
    regular: { label: 'Regular', share: 45, dice: 1, big: false, note: '1 die' },
    hard: { label: 'Hard', share: 17, dice: 2, big: false, note: '2 dice!' },
    impossible: { label: 'Impossible', share: 8, dice: 2, big: true, note: '2 big dice (8+)!!' },
  };
  /** The dice for an answer: right = forward, wrong = the back dice. Risk It: 2 big dice (3 on an impossible
      question) if right, 2 big back dice if wrong. */
  function diceFor(tier, right, risk) {
    var t = TIERS[tier] || TIERS.regular;
    if (risk) return { n: right && tier === 'impossible' ? 3 : 2, big: true, back: !right };
    return { n: t.dice, big: t.big, back: !right };
  }
  var ORDER = ['easy', 'regular', 'hard', 'impossible'];
  // chance cards (Henry's list + a few more); each is equally likely
  var CHANCE = [
    { id: 'back2', text: 'Go back 2 squares.' },
    { id: 'ahead3', text: 'Move ahead 3 squares!' },
    { id: 'ahead1', text: 'Move ahead 1 square.' },
    { id: 'roll2', text: 'Double dice roll: roll 2 dice now!' },
    { id: 'again', text: 'Roll again!' },
    { id: 'dbl', text: 'Double dice: your next right answer rolls 2 dice.' },
    { id: 'skip', text: 'Oh no! Skip your next turn.' },
    { id: 'mathsci', text: 'Your next question is a math or science question.' },
    { id: 'swap', text: 'Switch places with the team of your choice!', w: 3 }, // Henry: more of these
    { id: 'shield', text: 'Shield 🛡: your next wrong answer does not move you back.' },
    { id: 'others', text: 'Everyone else goes back 1 square!' },
    { id: 'leap', text: 'Leapfrog: jump just past the team in front of you.' },
  ];
  var $ = function (id) { return document.getElementById(id); };
  var esc = KruQuiz.esc;

  var POOL = {}, MATHSCI = [], teams = [], racers = [], INTRO = [];
  var S = null; // saved: { v, level, pos, finished, turn, order: {tier: [i]}, qi: {tier: n}, msOrder, msI, secs, last, skip, shield, dbl, mathsci, secret }
  var busy = false, left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null;
  var Q = null; // the question on screen: { q, tier, ... }

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
  function racer(id) { return racers.filter(function (x) { return x.id === id; })[0]; }
  function weighted(w) { var sum = 0, i; for (i = 0; i < w.length; i++) sum += w[i]; var r = Math.random() * sum; for (i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; } return w.length - 1; }

  /** Where a square sits on the screen: a snake, 12 per row. */
  function cell(n) {
    var row = Math.floor(n / COLS), col = n % COLS;
    return { row: row + 1, col: row % 2 ? COLS - col : col + 1 };
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
  function squareLabel(n) {
    var sp = SPECIAL[n], sec = S.secret;
    if (n === 0) return 'START';
    if (n === FINISH) return 'FINISH';
    if (sec.trapUsed && n === sec.trap) return '🪤';
    if (sec.slideUsed && n === sec.slide) return '🛝';
    if (!sp) return String(n);
    return sp.t === 'go' ? '★+' + sp.n : sp.t === 'back' ? '⚠−' + sp.n : sp.t === 'again' ? '🎲' : '?';
  }
  function renderTrack() {
    var html = '';
    for (var n = 0; n <= FINISH; n++) {
      var c = cell(n), sp = SPECIAL[n];
      var used = (S.secret.trapUsed && n === S.secret.trap) || (S.secret.slideUsed && n === S.secret.slide);
      var on = racers.filter(function (t) { return pos(t.id) === n; });
      var cls = 'sq' + (n === 0 ? ' start' : n === FINISH ? ' finish' : '') + (sp ? ' ' + sp.t : '') + (used ? ' secret' : '') + (on.length > 3 ? ' crowd' : '');
      var here = on.map(function (t) {
        return '<i class="piece' + (current() && t.id === current().id ? ' now' : '') + '" style="background:' + color(t) + '">' + (racers.indexOf(t) + 1) + '</i>';
      }).join('');
      html += '<div class="' + cls + '" style="grid-row:' + c.row + ';grid-column:' + c.col + '"><span class="num">' + squareLabel(n) + '</span>' +
        '<span class="pieces">' + here + '</span></div>';
    }
    $('track').innerHTML = html;
    $('legend').innerHTML = racers.map(function (t, i) {
      var f = S.finished.indexOf(t.id), flags = (S.skip[t.id] ? ' ⏸' : '') + (S.shield[t.id] ? ' 🛡' : '') + (S.dbl[t.id] ? ' 🎲🎲' : '');
      return '<button class="lg' + (current() && t.id === current().id ? ' now' : '') + '" data-team="' + esc(t.id) + '" aria-label="' + esc(t.name) + ': who is on this team?">' +
        '<i style="background:' + color(t) + '">' + (i + 1) + '</i>' + esc(t.name) + flags +
        (f >= 0 && f < 3 ? ' <b>' + ['1st', '2nd', '3rd'][f] + '</b>' : f >= 3 ? ' <b>done</b>' : '') + '</button>';
    }).join('');
    var t = current(), done = S.finished.length >= racers.length;
    $('turn').innerHTML = done ? 'Race over!' : t ? '<span class="dot" style="background:' + color(t) + '"></span>' + esc(t.name) + "'s turn" : '';
    $('ask').disabled = done || busy || !t;
  }

  // ---------- who is on a team (tap a team in the legend) ----------
  $('legend').addEventListener('click', function (e) {
    var b = e.target.closest('[data-team]');
    if (!b) return;
    var t = racer(b.dataset.team);
    if (!t) return;
    $('teamName').textContent = t.name;
    $('teamName').style.color = color(t);
    $('teamWho').textContent = (t.members || []).map(function (m) { return m.nick; }).join(', ') || '—';
    $('teamWhere').textContent = pos(t.id) === 0 ? 'On START' : pos(t.id) === FINISH ? 'Finished!' : 'On square ' + pos(t.id) + ' · ' + points(t.id) + ' points';
    $('teamBack').hidden = false;
  });
  $('teamClose').addEventListener('click', function () { $('teamBack').hidden = true; });
  $('teamBack').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });

  // ---------- turns ----------
  function nextTurn() {
    if (S.finished.length >= racers.length) { S.turn = 0; save(); renderTrack(); return; }
    for (var k = 0; k < racers.length * 3; k++) {
      S.turn = (S.turn + 1) % racers.length;
      var id = current().id;
      if (S.finished.indexOf(id) >= 0) continue;
      if (S.skip[id]) { S.skip[id]--; toast('⏸ ' + current().name + ' skips this turn.'); continue; }
      break;
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
  /** After a move: a piece on FINISH has finished; the points change goes to Kru. */
  function settle(id, base) {
    if (pos(id) === FINISH && S.finished.indexOf(id) < 0) S.finished.push(id);
    var d = points(id) - base;
    if (d) Kru.score(id, d, 'race board');
  }
  /** Moves a piece one square at a time. Forward past FINISH bounces back (an exact roll is needed to finish). */
  function move(id, steps, then) {
    var dir = steps < 0 ? -1 : 1, n = Math.abs(steps), bounced = false, base = points(id);
    (function step() {
      if (!n || (dir < 0 && pos(id) <= 0)) {
        settle(id, base);
        save(); renderTrack();
        if (bounced) toast('↩ ' + racer(id).name + ' bounced back: an exact roll is needed to finish!');
        then(); return;
      }
      if (dir > 0 && pos(id) >= FINISH) { dir = -1; bounced = true; }
      S.pos[id] = pos(id) + dir; n--;
      tone([dir > 0 ? 520 + pos(id) * 6 : 300], 0, 0.08);
      renderTrack();
      setTimeout(step, 200);
    })();
  }
  function landed(id) {
    var t = racer(id), p = pos(id), sp = SPECIAL[p], sec = S.secret;
    if (p === FINISH) {
      var place = S.finished.indexOf(id);
      tone([523, 659, 784, 1047], 0.12, 0.4);
      toast(t.name + ' finished ' + (['1st', '2nd', '3rd'][place] || '') + (place < 3 ? '! +' + BONUS[place] + ' bonus' : '!'));
      busy = false; nextTurn();
      // 1st, 2nd and 3rd are decided (or everyone is home): the podium. Keep playing to race on.
      if (S.finished.length === Math.min(3, racers.length)) setTimeout(function () { KruEnd.show(); }, 1600);
      return;
    }
    // the secret squares: only the first team to land there
    if (p === sec.trap && !sec.trapUsed) {
      sec.trapUsed = true; S.skip[id] = (S.skip[id] || 0) + 1; save();
      return card('🪤 Secret trap!', t.name + ' skips the next turn.', function () { busy = false; nextTurn(); }, 'bad');
    }
    if (p === sec.slide && !sec.slideUsed) {
      sec.slideUsed = true; save();
      return card('🛝 Secret slide!', t.name + ' slides forward ' + SLIDE + ' squares!', function () { move(id, SLIDE, function () { landed(id); }); }, 'good');
    }
    if (sp && sp.t === 'go') { toast('★ ' + t.name + ': forward ' + sp.n + '!'); tone([784, 988], 0.1); setTimeout(function () { move(id, sp.n, function () { landed(id); }); }, 500); return; }
    if (sp && sp.t === 'back') { toast('⚠ ' + t.name + ': back ' + sp.n + '!'); tone([330, 262], 0.15); setTimeout(function () { move(id, -sp.n, function () { landedBack(id); }); }, 500); return; }
    if (sp && sp.t === 'again') { toast('🎲 ' + t.name + ': roll again!'); setTimeout(function () { roll(id, { n: 1 }); }, 700); return; }
    if (sp && sp.t === 'chance') return chance(id);
    busy = false; nextTurn();
  }

  /** After moving back: a secret square still springs (first team only); ★ / ⚠ / ? squares don't, so moves don't chain. */
  function landedBack(id) {
    var p = pos(id), sec = S.secret;
    if ((p === sec.trap && !sec.trapUsed) || (p === sec.slide && !sec.slideUsed)) return landed(id);
    busy = false; nextTurn();
  }

  // ---------- a card in the middle of the screen (chance, secret squares) ----------
  function card(title, text, then, mood) {
    $('cardTitle').textContent = title;
    $('cardText').textContent = text;
    $('cardBox').className = 'chance-box ' + (mood || '');
    $('cardTeams').innerHTML = '';
    $('cardOk').hidden = false;
    $('cardBack').hidden = false;
    tone(mood === 'bad' ? [392, 330, 262] : [660, 880, 1047], 0.12);
    cardThen = then;
  }
  var cardThen = null;
  $('cardOk').addEventListener('click', function () { $('cardBack').hidden = true; var f = cardThen; cardThen = null; if (f) f(); });

  function chance(id) {
    var t = racer(id), cd = CHANCE[weighted(CHANCE.map(function (c) { return c.w || 1; }))];
    var done = function () { busy = false; nextTurn(); };
    var after = {
      back2: function () { move(id, -2, function () { landedBack(id); }); },
      ahead3: function () { move(id, 3, function () { landed(id); }); },
      ahead1: function () { move(id, 1, function () { landed(id); }); },
      roll2: function () { roll(id, { n: 2 }); },
      again: function () { roll(id, { n: 1 }); },
      dbl: function () { S.dbl[id] = true; save(); done(); },
      skip: function () { S.skip[id] = (S.skip[id] || 0) + 1; save(); done(); },
      mathsci: function () { S.mathsci[id] = true; save(); done(); },
      shield: function () { S.shield[id] = true; save(); done(); },
      others: function () { racers.forEach(function (o) { if (o.id !== id && S.finished.indexOf(o.id) < 0 && pos(o.id) > 0) setPos(o.id, pos(o.id) - 1); }); save(); renderTrack(); done(); },
      leap: function () {
        var ahead = racers.filter(function (o) { return o.id !== id && S.finished.indexOf(o.id) < 0 && pos(o.id) > pos(id); })
          .map(function (o) { return pos(o.id); }).sort(function (a, b) { return a - b; })[0];
        if (ahead === undefined) { toast(t.name + ' is already in front!'); return done(); }
        move(id, Math.min(ahead + 1, FINISH - 1) - pos(id), function () { landed(id); });
      },
    };
    if (cd.id === 'swap') return swapCard(id);
    card('? Chance card', cd.text, after[cd.id], cd.id === 'back2' || cd.id === 'skip' ? 'bad' : 'good');
  }
  function swapCard(id) {
    var t = racer(id), others = racers.filter(function (o) { return o.id !== id && S.finished.indexOf(o.id) < 0; });
    // every team's square, including the team that drew the card
    card('? Chance card', 'Switch places! ' + t.name + ' is on ' + (pos(id) ? 'square ' + pos(id) : 'START') + '. Pick a team:', null, 'good');
    if (!others.length) { $('cardText').textContent = 'No team to switch with.'; cardThen = function () { busy = false; nextTurn(); }; return; }
    $('cardOk').hidden = true;
    $('cardTeams').innerHTML = others.map(function (o) {
      return '<button class="btn" data-swap="' + esc(o.id) + '" style="border-color:' + color(o) + '">' + esc(o.name) + ' <small>' + (pos(o.id) ? 'square ' + pos(o.id) : 'START') + (pos(o.id) > pos(id) ? ' ▲' : pos(o.id) < pos(id) ? ' ▼' : '') + '</small></button>';
    }).join('') + '<button class="btn ghost" data-swap="">No switch</button>';
    $('cardTeams').onclick = function (e) {
      var b = e.target.closest('[data-swap]');
      if (!b) return;
      $('cardTeams').onclick = null;
      $('cardBack').hidden = true;
      if (b.dataset.swap) {
        var o = b.dataset.swap, a = pos(id), z = pos(o);
        setPos(id, z); setPos(o, a);
        toast('⇄ ' + t.name + ' and ' + racer(o).name + ' switched places!');
        tone([523, 784], 0.1);
      }
      save(); busy = false; nextTurn();
    };
  }

  // ---------- the dice ----------
  function dieHtml(n) {
    var h = '';
    for (var i = 0; i < 9; i++) h += '<span class="pip' + (FACES[n].indexOf(i) >= 0 ? ' on' : '') + '"></span>';
    return h;
  }
  /** spec: { n: 1-3 dice, big: purple dice (4-9), back: move backwards }. */
  function face(big) { return big ? BIG_MIN + Math.floor(Math.random() * 6) : 1 + Math.floor(Math.random() * 6); }
  function roll(id, spec) {
    unlockAudio();
    busy = true; renderTrack();
    spec = { n: spec.n || 1, big: !!spec.big, back: !!spec.back };
    // the "double dice next time" chance card: the next ordinary forward roll uses 2 dice
    if (S.dbl[id] && !spec.back && !spec.big && spec.n === 1) { spec.n = 2; S.dbl[id] = false; }
    var values = [];
    for (var d = 0; d < spec.n; d++) values.push(face(spec.big));
    var sum = values.reduce(function (a, b) { return a + b; }, 0), k = 0;
    var t = racer(id), dice = [$('die'), $('die2'), $('die3')];
    dice.forEach(function (el, i) { el.hidden = i >= spec.n; el.classList.toggle('big', spec.big); el.classList.add('rolling'); });
    $('diceBox').className = 'dice-box' + (spec.back ? ' back' : '');
    var what = spec.n + (spec.big ? ' big' : '') + (spec.back ? ' back' : '') + (spec.n > 1 ? ' dice' : ' die');
    $('diceText').textContent = t.name + ' rolls ' + (spec.n === 1 && !spec.big ? 'the ' + (spec.back ? 'back ' : '') + 'die' : what) + '…';
    $('diceBack').hidden = false;
    S.last = snapshot();
    (function spin() {
      var last = k >= 11;
      dice.forEach(function (el, i) { if (i < spec.n) el.innerHTML = dieHtml(last ? values[i] : face(spec.big)); });
      tone([300 + k * 35], 0, 0.05);
      if (++k <= 11) { setTimeout(spin, 50 + k * 14); return; }
      dice.forEach(function (el) { el.classList.remove('rolling'); });
      var total = (spec.n > 1 ? values.join(' + ') + ' = ' : '') + sum;
      $('diceText').textContent = spec.back ? t.name + ': back ' + total + '!' : t.name + ' rolled ' + total + '!';
      tone(spec.back ? [330, 262] : [880], 0.15, 0.2);
      setTimeout(function () {
        $('diceBack').hidden = true;
        if (spec.back) move(id, -sum, function () { landedBack(id); });
        else move(id, sum, function () { landed(id); });
      }, 1100);
    })();
  }

  // ---------- undo: the whole board as it was before the last roll ----------
  function snapshot() {
    return JSON.parse(JSON.stringify({ pos: S.pos, finished: S.finished, turn: S.turn, skip: S.skip, shield: S.shield, dbl: S.dbl, mathsci: S.mathsci, secret: S.secret }));
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
  /** The next question: a tier picked at random (hard and impossible are rare), or math / science after that chance card. */
  function pickQuestion(id) {
    if (S.mathsci[id] && MATHSCI.length) {
      S.mathsci[id] = false;
      var m = MATHSCI[S.msOrder[S.msI % S.msOrder.length]];
      S.msI++; if (S.msI % S.msOrder.length === 0) S.msOrder = shuffle(range(MATHSCI.length));
      return m;
    }
    var avail = ORDER.filter(function (t) { return POOL[t] && POOL[t].length; });
    var tier = avail[weighted(avail.map(function (t) { return TIERS[t].share; }))];
    var list = POOL[tier], order = S.order[tier];
    var q = list[order[S.qi[tier] % order.length]];
    S.qi[tier]++;
    if (S.qi[tier] % order.length === 0) S.order[tier] = shuffle(range(list.length));
    return q;
  }
  var shown = false;
  function renderQuestion() {
    var t = current(), tier = TIERS[Q.tier] || TIERS.regular;
    $('qWho').textContent = t.name;
    $('qTier').textContent = tier.label + ' · ' + tier.note;
    $('qTier').className = 'tier ' + Q.tier;
    $('qTopic').textContent = Q.set ? '· ' + Q.set : '';
    $('qBody').innerHTML = KruQuiz.html(Q, shown);
    // 50/50: the two wrong answers it took away
    (Q._gone || []).forEach(function (i) { var c = $('qBody').querySelectorAll('.kq-choice')[i]; if (c) c.classList.add('gone'); });
    $('reveal').disabled = shown;
    renderPowers();
    KruQuiz.fit($('stage'));
  }

  // ---------- power-ups: one of each per team per game ----------
  var POWERS = [
    { id: 'fifty', label: '50/50' },
    { id: 'time', label: '+20 s' },
    { id: 'free', label: 'Free answer' },
    { id: 'risk', label: 'Risk it' },
  ];
  var risk = false; // Risk It is on for the question on screen
  function used(id, p) { return !!(S.powers[id] && S.powers[id][p]); }
  function use(id, p) { (S.powers[id] = S.powers[id] || {})[p] = true; save(); }
  function renderPowers() {
    var id = current().id;
    $('powers').innerHTML = '<span class="pw-lab">Power-ups:</span>' + POWERS.map(function (p) {
      var off = used(id, p.id) || (p.id === 'fifty' && (!Array.isArray(Q.choices) || Q.choices.length < 4 || !!Q._gone)) ||
        (shown && p.id !== 'time');
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
      // +20 s, even after the clock has hit zero
      left = Math.max(0, left) + 20; total = Math.max(total, left);
      use(id, 'time'); tone([660, 880, 1047], 0.08);
      if (!running) startTimer(); else { endAt = Date.now() + left * 1000; renderClock(); }
      renderPowers();
    } else if (p === 'free') {
      use(id, 'free');
      if (risk) use(id, 'risk');
      toast('🎟 ' + current().name + ' used a free answer!');
      var spec = diceFor(Q.tier || 'regular', true, risk);
      closeQuestion(); roll(id, spec);
    } else if (p === 'risk') {
      risk = !risk; tone(risk ? [392, 523, 659] : [440], 0.08); renderPowers();
    }
  });
  function ask() {
    if (busy || !current()) return;
    unlockAudio();
    shown = false; risk = false;
    Q = pickQuestion(current().id);
    save();
    stopTimer(); total = left = S.secs; renderClock();
    $('qBack').hidden = false;
    renderQuestion();
    tone([660, 880], 0.12);
    startTimer(); // Henry: the timer starts by itself
  }
  function closeQuestion() { stopTimer(); $('qBack').hidden = true; risk = false; }

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
  $('right').addEventListener('click', function () {
    var id = current().id, spec = diceFor(Q.tier || 'regular', true, risk);
    if (risk) use(id, 'risk');
    closeQuestion(); roll(id, spec);
  });
  $('wrong').addEventListener('click', function () {
    unlockAudio();
    var t = current(), spec = diceFor(Q.tier || 'regular', false, risk);
    if (risk) use(t.id, 'risk');
    closeQuestion();
    if (S.shield[t.id]) { S.shield[t.id] = false; save(); toast('🛡 ' + t.name + "'s shield: no move back!"); tone([660, 880], 0.1); nextTurn(); return; }
    if (pos(t.id) === 0) { toast(t.name + ' is on START: no move back.'); nextTurn(); return; }
    roll(t.id, spec);
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
    var before = {};
    racers.forEach(function (t) { before[t.id] = points(t.id); });
    S.pos = L.pos; S.finished = L.finished; S.turn = L.turn; S.skip = L.skip; S.shield = L.shield; S.dbl = L.dbl; S.mathsci = L.mathsci; S.secret = L.secret; S.last = null;
    racers.forEach(function (t) { var d = points(t.id) - before[t.id]; if (d) Kru.score(t.id, d, 'undo'); });
    save(); closeMenu(); renderTrack();
  });
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: 'Race Board' }); });
  $('restart').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again: everyone back to START'; setTimeout(disarm, 3500); return; }
    racers.forEach(function (t) { var p = points(t.id); if (p) Kru.score(t.id, -p, 'reset'); });
    S.pos = {}; S.finished = []; S.turn = 0; S.last = null; S.skip = {}; S.shield = {}; S.dbl = {}; S.mathsci = {}; S.secret = newSecret(); S.powers = {};
    save(); closeMenu(); renderTrack();
  });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden || !$('cardBack').hidden || !$('teamBack').hidden) return;
    if (!$('qBack').hidden) {
      if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
      else if (e.key === 'a' || e.key === 'A') $('reveal').click();
    } else if (e.code === 'Space') { e.preventDefault(); ask(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', function () { if (!$('qBack').hidden) KruQuiz.fit($('stage')); });

  Kru.onFinishRequest(function () { Kru.finish(teams.map(function (t) { return { teamId: t.id, points: t.teacher ? 0 : points(t.id) }; })); });

  // ---------- start ----------
  /** Two secret squares on plain squares (not START, FINISH or a special), different every game. */
  function newSecret() {
    var plain = range(FINISH).filter(function (n) { return n > 2 && n < FINISH - SLIDE - 1 && !SPECIAL[n] && !SPECIAL[n + SLIDE]; });
    shuffle(plain);
    return { trap: plain[0], slide: plain[1], trapUsed: false, slideUsed: false };
  }
  /** A unit's or the Sheet's question has no tier: A-D = regular; short answer or double = hard. */
  function guessTier(q) { return q.double || !Array.isArray(q.choices) ? 'hard' : 'regular'; }

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    Promise.all([contentReady, KruQuiz.load(session.level, session)]).then(function (both) {
      var c = both[0], QZ = both[1], lv = c.questions && c.questions[QZ.level] ? QZ.level : 'M.2';
      var own = (c.questions && c.questions[lv]) || [];
      POOL = { easy: [], regular: [], hard: [], impossible: [] };
      var add = function (q, tier, set) { POOL[tier].push(Object.assign({ tier: tier, set: set || '' }, q)); };
      if (QZ.unit) QZ.unit.sets.forEach(function (s) { s.questions.forEach(function (q) { add(q, guessTier(q), s.name); }); });
      else {
        own.forEach(function (q) { add(q, TIERS[q.tier] ? q.tier : 'regular'); });
        QZ.fromSheet.forEach(function (s) { s.questions.forEach(function (q) { add(q, guessTier(q), s.name); }); });
      }
      MATHSCI = own.filter(function (q) { return q.cat === 'math' || q.cat === 'science'; }).map(function (q) { return Object.assign({ set: q.cat === 'math' ? 'Math' : 'Science' }, q); });
      teams = Kru.allTeams();
      racers = teams.filter(function (t) { return !t.teacher; });
      KruEnd.setup({ standings: function () { return racers.map(function (t) { return { name: t.name, points: points(t.id) }; }); } });
      var sizes = ORDER.map(function (t) { return POOL[t].length; }).join(',') + ':' + MATHSCI.length;
      var saved = session.resume;
      if (saved && saved.v === 2 && saved.level === QZ.level && saved.sizes === sizes) S = saved;
      else {
        S = { v: 2, level: QZ.level, sizes: sizes, pos: {}, finished: [], turn: 0, order: {}, qi: {}, msOrder: shuffle(range(MATHSCI.length)), msI: 0,
          secs: 20, last: null, skip: {}, shield: {}, dbl: {}, mathsci: {}, secret: newSecret(), powers: {}, introDone: false };
        ORDER.forEach(function (t) { S.order[t] = shuffle(range(POOL[t].length)); S.qi[t] = 0; });
      }
      S.powers = S.powers || {};
      renderTrack();
      INTRO = KruIntro.forLevel(c, QZ.level);
      if (!S.introDone) KruIntro.show(INTRO, { title: 'Race Board' }).then(function () { S.introDone = true; save(); });
    }).catch(function (err) {
      $('track').textContent = 'Could not load the questions. Close the game and open it again.';
      if (window.console) console.error(err);
    });
  });
})();
