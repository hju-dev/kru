/* Quiz Island (Henry, Nov 18; new rules Nov 19): Race Board's quiz (one team at a time, four tiers, power-ups,
   optional "Who answers?" spinner) on an 8 x 5 island map. Points are 🪙 gold.
   - Right answer: claim an island worth the tier (easy 2, regular 3, hard 5, impossible 7).
   - Hard / impossible right: the team picks a reward: 💰 Gold Dig (the island has +5 hidden gold), 💣 Cannon Fire
     (claim one, then sink an enemy island) or 🏝🏝 Double Claim (two islands).
   - 🏴‍☠️ Pirate Raid (power-up, once per game; not with Free answer): right = sink an enemy island, steal one, or
     claim two; wrong (or no answer) = lose your two newest islands. It replaces the hard-question reward.
   - Wrong answer: nothing. No answer at all: -3 gold.
   - Visible: 4 💎 treasure islands (+5) and one 🏰 fortress per team (one each at most). A fortress can't be sunk or
     stolen, and neither can its owner's islands next to it. A stolen island is 🔒 safe for one round.
   - Hidden: a 🌋 volcano, a 🌀 hurricane and a 🌊 tsunami (each: lose your newest island), 3 ☠ pirates (miss your next turn),
     3 🧰 chests (+10), the Kraken three times (it hunts the players: half your gold, and it talks differently each time),
     Blackbeard and Captain Kidd (+30 each),
     4 🏴‍☠️ raid islands (a free Pirate Raid on another team after you claim one).
   - When the map is full, a prompt asks once whether to end the game (or keep playing).
   - Sunk islands go back to empty. A full map: a normal claim steals instead.
   - Each new round the last-place team finds a Message in a Bottle (+3). ⋯ Last round: every team gets the same
     number of turns, then the treasure map is revealed and the biggest island group gets +10.
   Every event shows a big banner with a picture (art.js). Gold never goes below 0. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var COLS = 6, ROWS = 5, CELLS = COLS * ROWS; // 30 islands (Henry, Nov 23)
  var TREASURES = 4, VOLCANOES = 1, HURRICANES = 1, TSUNAMIS = 1, PIRATES = 3, CHESTS = 3, RAIDS = 3, KRAKENS = 3;
  var GEM = 5, CHEST = 10, BEARD = 30, DIG = 10, EMPIRE = 10, NO_ANSWER = 3, BOTTLE = 3;
  var ORDER = ['easy', 'regular', 'hard', 'impossible'];
  var TIERS = {
    easy: { label: 'Easy', share: 30, pts: 2 },
    regular: { label: 'Regular', share: 45, pts: 3 },
    hard: { label: 'Hard', share: 17, pts: 5, reward: true },
    impossible: { label: 'Impossible', share: 8, pts: 7, reward: true },
  };
  var POWERS = [
    { id: 'fifty', label: '50/50' },
    { id: 'time', label: '+20 s' },
    { id: 'free', label: 'Free Play' },
    { id: 'raid', label: '🏴‍☠️ Pirate Raid' },
  ];
  var $ = function (id) { return document.getElementById(id); };
  var esc = KruQuiz.esc;
  var ART = window.QIArt;
  var COIN = '<span class="coin">' + ART.coin() + '</span>'; // a drawn gold coin (the 🪙 emoji isn't gold everywhere)
  KruQuiz.shortHint = 'Short answer: say it out loud'; // Henry: every answer in Quiz Island is spoken

  var DECKS = [], POOL = {}, teams = [], players = [], INTRO = [];
  var S = null;
  var busy = false, left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null;
  var Q = null, shown = false, raid = false, who = '';
  var shownGold = {};

  function save() { Kru.saveState(S); }
  function shuffle(a) {
    for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function has(list, c) { return (list || []).indexOf(c) >= 0; }
  function drop(list, c) { var i = list.indexOf(c); if (i >= 0) list.splice(i, 1); }
  function weighted(w) { var sum = 0, i; for (i = 0; i < w.length; i++) sum += w[i]; var r = Math.random() * sum; for (i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; } return w.length - 1; }
  function gold(id) { return S.pts[id] || 0; }
  function team(id) { return players.filter(function (t) { return t.id === id; })[0]; }
  function tname(id) { var t = team(id); return t ? t.name : ''; }
  function color(id) { var i = players.map(function (t) { return t.id; }).indexOf(id); return COLORS[(i < 0 ? 0 : i) % COLORS.length]; }
  function current() { return players[S.turn % Math.max(1, players.length)]; }
  function tierOf(q) { return TIERS[q.tier] ? q.tier : 'regular'; }
  function round() { return Math.floor(S.turn / Math.max(1, players.length)); }

  // ---------- sound (after a tap) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function tone(freqs, gap, dur, type) {
    if (!audio) return;
    try {
      freqs.forEach(function (f, i) {
        var t = audio.currentTime + i * (gap || 0.15), o = audio.createOscillator(), g = audio.createGain();
        o.type = type || 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.33, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.25));
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.25) + 0.05);
      });
    } catch (e) {}
  }
  /** A cannon boom: a falling low note. */
  function boom() {
    if (!audio) return;
    try {
      var t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.75);
    } catch (e) {}
  }
  var SOUNDS = {
    good: function () { tone([523, 659, 784, 1047], 0.09, 0.3); },
    gold: function () { tone([988, 1319, 988, 1568], 0.07, 0.18, 'square'); },
    bad: function () { tone([330, 262, 196], 0.18, 0.45); },
    boom: function () { boom(); },
    sea: function () { tone([196, 147, 110], 0.22, 0.6, 'sawtooth'); },
    fanfare: function () { tone([523, 523, 659, 784, 1047], 0.12, 0.35); },
  };
  var toastTimer = 0;
  function toast(text) {
    $('toastText').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 3500);
  }

  // ---------- big event banners (one at a time, tap or wait to go on) ----------
  var fxQueue = [], fxOn = false, fxTimer = 0, fxDone = null;
  /** o: { art, title, sub, gold (+/-), mood: good | bad | boom | sea | magic, sound, then } */
  function banner(o) {
    fxQueue.push(o);
    if (!fxOn) nextBanner();
  }
  function nextBanner() {
    var o = fxQueue.shift();
    if (!o) { fxOn = false; $('fx').hidden = true; var d = fxDone; fxDone = null; render(); if (d) d(); return; }
    fxOn = true;
    var fx = $('fx');
    fx.className = 'fx ' + (o.mood || 'good');
    $('fxArt').innerHTML = o.art || '';
    $('fxTitle').textContent = o.title;
    $('fxSub').textContent = o.sub || '';
    var g = $('fxGold');
    g.hidden = !o.gold;
    if (o.gold) countUp(g, o.gold);
    $('fxBits').innerHTML = o.mood === 'good' || o.mood === 'magic' ? range(14).map(function (i) {
      var a = (i / 14) * 360, d = 140 + (i % 3) * 40;
      return '<i style="--a:' + a + 'deg;--d:' + d + 'px;--t:' + (i % 4) * 0.05 + 's">' + (o.mood === 'magic' ? '✦' : COIN) + '</i>';
    }).join('') : '';
    fx.hidden = false;
    void fx.offsetWidth; // restart the animations
    fx.classList.add('go');
    if (SOUNDS[o.sound || o.mood]) SOUNDS[o.sound || o.mood]();
    clearTimeout(fxTimer);
    fxTimer = setTimeout(nextBanner, (o.wait || 2600) + 1000); // every pop-up stays a second longer
    if (o.then) fxDone = chain(fxDone, o.then);
  }
  function chain(a, b) { return a ? function () { a(); b(); } : b; }
  function countUp(el, v) {
    var sign = v > 0 ? '+' : '−', n = Math.abs(v), t0 = performance.now();
    el.className = 'fx-gold ' + (v > 0 ? 'up' : 'down');
    function step(t) {
      var k = Math.min(1, (t - t0) / 600);
      el.innerHTML = sign + Math.round(n * k) + ' ' + COIN;
      if (k < 1 && !$('fx').hidden) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  /** Run something once the banners on screen have finished. */
  function afterBanners(f) { if (fxOn) fxDone = chain(fxDone, f); else f(); }
  $('fx').addEventListener('click', function () { clearTimeout(fxTimer); nextBanner(); });

  // ---------- the island map ----------
  function newMap() {
    var nf = Math.min(players.length, 8), cells = shuffle(range(CELLS)), at = 0;
    var take = function (n) { var a = cells.slice(at, at + n); at += n; return a; };
    var m = { own: new Array(CELLS).fill(null), worth: new Array(CELLS).fill(0), ash: [], pirated: [], monster: [], order: {}, lock: {} };
    m.fort = spreadForts(nf, cells); // visible: 🏰 one per team (each team may own one), far apart
    cells = cells.filter(function (c) { return m.fort.indexOf(c) < 0; });
    m.treasure = take(TREASURES);   // visible: 💎 +5
    m.volcano = take(VOLCANOES);    // hidden: lose your newest island
    m.hurricane = take(HURRICANES); // hidden: the same, with a hurricane pop-up
    m.tsunami = take(TSUNAMIS);     // hidden: the same, with a tsunami pop-up
    m.pirate = take(PIRATES);       // hidden: miss your next turn
    m.chest = take(CHESTS);         // hidden: +10
    m.seaMonster = take(KRAKENS);   // hidden: the red Kraken hunts you: half your gold (3 of them, a new line each time)
    m.beard = take(1);              // hidden: Blackbeard +30
    m.kidd = take(1);               // hidden: Captain Kidd +30
    m.raid = take(RAIDS);           // hidden: a free Pirate Raid on another team
    m.krakenFound = 0; m.nature = {};   // how many Krakens were found; which event buried each ash island
    return m;
  }
  /** Fortresses at least 2 islands apart in every direction (3 steps); with many teams the map is too small,
      so the gap shrinks to 1 island. */
  function spreadForts(n, cells) {
    for (var gap = 3; gap >= 1; gap--) {
      for (var tries = 0; tries < 60; tries++) {
        var picked = [];
        shuffle(cells.slice()).forEach(function (c) {
          if (picked.length >= n) return;
          var ok = picked.every(function (p) { return Math.max(Math.abs(Math.floor(p / COLS) - Math.floor(c / COLS)), Math.abs(p % COLS - c % COLS)) >= gap; });
          if (ok) picked.push(c);
        });
        if (picked.length === n) return picked;
      }
    }
    return cells.slice(0, n);
  }
  function blocked(c) { return has(S.map.ash, c) || has(S.map.pirated, c) || has(S.map.monster, c); }
  function owned(id) { var a = []; S.map.own.forEach(function (o, c) { if (o === id) a.push(c); }); return a; }
  function emptyCells() { var a = []; S.map.own.forEach(function (o, c) { if (!o && !blocked(c)) a.push(c); }); return a; }
  function near(c) {
    var r = Math.floor(c / COLS), col = c % COLS, out = [];
    [[r - 1, col], [r + 1, col], [r, col - 1], [r, col + 1]].forEach(function (p) {
      if (p[0] >= 0 && p[0] < ROWS && p[1] >= 0 && p[1] < COLS) out.push(p[0] * COLS + p[1]);
    });
    return out;
  }
  function ownsFort(id) { return S.map.fort.some(function (c) { return S.map.own[c] === id; }); }
  /** A fortress, and its owner's islands next to it, can't be sunk or stolen. */
  function guarded(c) {
    var o = S.map.own[c];
    if (!o) return false;
    if (has(S.map.fort, c)) return true;
    return near(c).some(function (n) { return has(S.map.fort, n) && S.map.own[n] === o; });
  }
  function locked(c) { return (S.map.lock[c] || 0) > S.turn; }
  /** Enemy islands this team can sink or steal. */
  function targets(id) {
    return range(CELLS).filter(function (c) { var o = S.map.own[c]; return o && o !== id && !guarded(c) && !locked(c); });
  }
  /** Empty islands this team can claim (one fortress per team). */
  function claimCells(id) {
    var fort = ownsFort(id);
    return emptyCells().filter(function (c) { return !(fort && has(S.map.fort, c)); });
  }
  function biggestGroup(id) {
    var seen = {}, best = 0;
    owned(id).forEach(function (c) {
      if (seen[c]) return;
      var stack = [c], size = 0; seen[c] = true;
      while (stack.length) {
        var x = stack.pop(); size++;
        near(x).forEach(function (y) { if (!seen[y] && S.map.own[y] === id) { seen[y] = true; stack.push(y); } });
      }
      best = Math.max(best, size);
    });
    return best;
  }
  /** The team(s) with the biggest connected group of islands (+10 at the end). */
  function empireLeaders() {
    var sizes = players.map(function (t) { return biggestGroup(t.id); }), max = Math.max.apply(null, sizes.concat([0]));
    if (max < 2) return [];
    return players.filter(function (t, i) { return sizes[i] === max; }).map(function (t) { return t.id; });
  }
  function finalPts(id) { return gold(id) + (empireLeaders().indexOf(id) >= 0 ? EMPIRE : 0); }
  function addPts(id, d, why) {
    var now = gold(id), next = Math.max(0, now + d), real = next - now; // gold never goes below 0
    if (!real) return 0;
    S.pts[id] = next;
    Kru.score(id, real, why);
    return real;
  }
  /** The team's newest islands (not fortresses), newest first. */
  function newest(id) {
    var mine = (S.map.order[id] || []).filter(function (x) { return S.map.own[x] === id && !has(S.map.fort, x); });
    var rest = owned(id).filter(function (x) { return mine.indexOf(x) < 0 && !has(S.map.fort, x); });
    return mine.reverse().concat(rest.reverse());
  }
  function loseIsland(id, c, why) {
    var w = S.map.worth[c];
    S.map.own[c] = null; S.map.worth[c] = 0; delete S.map.lock[c];
    return addPts(id, -w, why);
  }

  // ---------- drawing ----------
  var HIDDEN_ICON = { volcano: '🌋', pirate: '☠', chest: '<span class="pic">' + ART.chest() + '</span>', seaMonster: '<span class="pic">' + ART.kraken() + '</span>', hurricane: '🌀', tsunami: '🌊', beard: '<span class="pic">' + ART.pirate() + '</span>', kidd: '<span class="pic">' + ART.pirate() + '</span>', raid: '🏴‍☠️' };
  var NATURE = { volcano: '🌋', hurricane: '🌀', tsunami: '🌊' };
  function renderMap() {
    var cl = S.claim, step = cl && cl.steps[0], can = step ? stepCells(cl.id, step) : [], leaders = empireLeaders();
    $('map').className = 'map' + (step ? ' aim ' + step.m : '') + (S.reveal ? ' reveal' : '');
    $('map').innerHTML = range(CELLS).map(function (c) {
      var o = S.map.own[c], pir = has(S.map.pirated, c), ash = has(S.map.ash, c), mon = has(S.map.monster, c);
      var fort = has(S.map.fort, c), tr = has(S.map.treasure, c);
      var hid = null;
      if (S.reveal && !o && !blocked(c)) Object.keys(HIDDEN_ICON).forEach(function (k) { if (has(S.map[k], c)) hid = k; });
      var cls = 'isle' + (o ? ' owned' : '') + (pir || ash || mon ? ' ash' : '') + (tr && !o ? ' treasure' : '') + (fort ? ' fort' : '') +
        (o && guarded(c) && !fort ? ' guard' : '') + (can.indexOf(c) >= 0 ? ' can' : '') + (o && leaders.indexOf(o) >= 0 ? ' empire' : '') + (hid ? ' hidden-reveal' : '');
      var label = pir ? '☠' : ash ? NATURE[(S.map.nature || {})[c]] || '🌋' : mon ? '<span class="pic">' + ART.kraken() + '</span>' :
        o ? '<span class="n">' + (players.indexOf(team(o)) + 1) + '</span><span class="w">' + S.map.worth[c] + '</span>' + (fort ? '<span class="tag">🏰</span>' : locked(c) ? '<span class="tag">🔒</span>' : '') :
        fort ? '🏰' : tr ? '💎' : hid ? HIDDEN_ICON[hid] : '';
      var name = o ? ', ' + esc(tname(o)) + ', ' + S.map.worth[c] + ' gold' + (fort ? ', fortress' : '') : pir ? ', pirates' : ash ? ', ' + ((S.map.nature || {})[c] || 'volcano') : mon ? ', kraken' : fort ? ', fortress' : tr ? ', treasure' : ', empty';
      return '<button class="' + cls + '" data-c="' + c + '"' + (o ? ' style="--c:' + color(o) + '"' : '') + ' aria-label="Island ' + (c + 1) + name + '">' + label + '</button>';
    }).join('');
  }
  function renderLegend() {
    var cur = current(), leaders = empireLeaders();
    $('legend').className = 'legend' + (players.length > 5 ? ' many' : ''); // 6+ teams: numbers and gold only
    $('legend').innerHTML = players.map(function (t, i) {
      var g = gold(t.id), bump = shownGold[t.id] !== undefined && shownGold[t.id] !== g ? (g > shownGold[t.id] ? ' up' : ' down') : '';
      shownGold[t.id] = g;
      var flags = (S.skip[t.id] ? ' ⏸' : '') + (ownsFort(t.id) ? ' 🏰' : '') + (leaders.indexOf(t.id) >= 0 ? ' 👑' : '');
      return '<span class="lg' + (cur && t.id === cur.id && S.phase === 'play' ? ' now' : '') + '"><i style="background:' + color(t.id) + '">' + Kru.teamNo(t) + '</i>' +
        ' <b class="g' + bump + '">' + g + COIN + '</b> · ' + owned(t.id).length + '🏝' + flags + '</span>';
    }).join('');
  }
  var HINT = { claim: 'tap an empty island', sink: '💣 tap an enemy island to sink it', steal: '⚔ tap an enemy island to steal it' };
  function render() {
    if (!S) return;
    var cur = current(), cl = S.claim, step = cl && cl.steps[0];
    $('turn').innerHTML = !cur ? 'Add students to play' : S.phase === 'done' ? '🗺 The secret islands are revealed!' :
      step ? '<i class="dot" style="background:' + color(cl.id) + '"></i>' + esc(tname(cl.id)) + ': ' + HINT[step.m] + (step.m === 'claim' ? ' (+' + (step.v + (step.dig ? DIG : 0)) + ' ' + COIN + ')' : '') :
      '<i class="dot" style="background:' + color(cur.id) + '"></i>' + esc(cur.name) + "'s turn" + (S.lastEnd ? ' · 🏁 Last round' : '');
    $('ask').hidden = !!cl || S.phase === 'done';
    $('ask').disabled = busy || S.phase !== 'play';
    $('toPodium').hidden = S.phase !== 'done';
    renderMap(); renderLegend();
  }

  // ---------- undo: the state before the last question ----------
  function snapshot() {
    S.hist.push(JSON.parse(JSON.stringify({ map: S.map, pts: S.pts, turn: S.turn, skip: S.skip, powers: S.powers, lastEnd: S.lastEnd })));
    if (S.hist.length > 20) S.hist.shift();
  }
  function undo() {
    var h = S.hist.pop();
    if (!h) return false;
    players.forEach(function (t) { var d = (h.pts[t.id] || 0) - gold(t.id); if (d) Kru.score(t.id, d, 'undo'); });
    S.map = h.map; S.pts = h.pts; S.turn = h.turn; S.skip = h.skip; S.powers = h.powers; S.lastEnd = h.lastEnd || 0;
    S.claim = null; S.choice = null; S.phase = 'play'; S.reveal = false;
    $('choiceBack').hidden = true;
    save(); render();
    return true;
  }

  // ---------- claiming, sinking and stealing (a list of steps for one team) ----------
  function stepCells(id, step) {
    if (step.m === 'claim') return claimCells(id);
    return targets(id);
  }
  /** Start the steps; a step with nothing to tap is skipped (a claim on a full map becomes a steal). */
  function startSteps(id, steps) {
    S.claim = { id: id, steps: steps };
    prepStep();
  }
  function prepStep() {
    var cl = S.claim;
    while (cl && cl.steps.length) {
      var s = cl.steps[0];
      if (s.m === 'claim' && !claimCells(cl.id).length && targets(cl.id).length) { s.m = 'steal'; toast('The map is full: steal an island instead!'); }
      if (stepCells(cl.id, s).length) break;
      toast(s.m === 'claim' ? 'No island to claim.' : 'No enemy island can be hit right now.');
      cl.steps.shift();
    }
    if (!cl || !cl.steps.length) {
      var free = cl && cl.raidAfter ? cl.id : null; // a raid island was claimed: a free Pirate Raid before the turn ends
      S.claim = null;
      if (free && targets(free).length) { S.choice = { id: free, kind: 'raid', free: true, v: 0 }; save(); render(); afterBanners(openChoice); return; }
      if (free) toast('No enemy island to attack yet.');
      nextTurn(); return;
    }
    var step = cl.steps[0];
    if (step.m === 'sink' && step.announce) {
      step.announce = false;
      banner({ art: ART.cannon(), title: 'CANNON FIRE!', sub: tname(cl.id) + ': aim at an enemy island!', mood: 'boom', sound: 'boom', wait: 1800 });
    }
    save(); render();
  }
  function stepDone() {
    if (!S.claim) return;
    S.claim.steps.shift();
    afterBanners(prepStep);
    save(); render();
  }
  function tapIsland(c) {
    var cl = S.claim, step = cl && cl.steps[0];
    if (!step || fxOn) return;
    if (stepCells(cl.id, step).indexOf(c) < 0) {
      if (S.map.own[c] && S.map.own[c] !== cl.id && guarded(c)) toast('🏰 That island is protected by a fortress.');
      else if (locked(c)) toast('🔒 That island was just stolen: it is safe for one round.');
      return;
    }
    unlockAudio();
    if (step.m === 'claim') claimEmpty(cl.id, c, step);
    else if (step.m === 'sink') sink(cl.id, c);
    else steal(cl.id, c);
    stepDone();
  }
  // the Kraken is hunting the players: a different line every time one is found
  var KRAKEN_LINES = [
    { title: 'THE KRAKEN!', say: '"Fresh sailors on MY island? How delicious!"' },
    { title: 'THE KRAKEN RETURNS!', say: '"You again?! I have been HUNTING you!"' },
    { title: 'THE KRAKEN IS FURIOUS!', say: '"The last of the hunt! No more hiding, little sailors!"' },
  ];
  function claimEmpty(id, c, step) {
    var t = tname(id), m = S.map;
    var nat = ['volcano', 'hurricane', 'tsunami'].filter(function (n) { return has(m[n], c); })[0];
    if (nat) {
      drop(m[nat], c); m.ash.push(c); (m.nature = m.nature || {})[c] = nat;
      var lost = newest(id)[0];
      var g = lost != null ? loseIsland(id, lost, nat) : 0;
      var EV = {
        volcano: { title: 'VOLCANO!', art: ART.volcano(), lost: "'s newest island is buried in ash!", sound: 'boom' },
        hurricane: { title: 'HURRICANE!', art: ART.hurricane(), lost: "'s newest island is blown away by the storm!", sound: 'sea' },
        tsunami: { title: 'TSUNAMI!', art: ART.tsunami(), lost: "'s newest island is swallowed by a giant wave!", sound: 'sea' },
      }[nat];
      banner({ art: EV.art, title: EV.title, sub: lost != null ? t + EV.lost : t + ' had no island to lose. Phew!', gold: g, mood: 'bad', sound: EV.sound });
      return;
    }
    if (has(m.pirate, c)) {
      drop(m.pirate, c); m.pirated.push(c);
      S.skip[id] = 1;
      banner({ art: ART.pirates(), title: 'PIRATE AMBUSH!', sub: t + ' is captured and misses the next turn!', mood: 'bad' });
      return;
    }
    if (has(m.seaMonster, c)) {
      drop(m.seaMonster, c); m.monster.push(c);
      var n = Math.min(KRAKEN_LINES.length, (m.krakenFound = (m.krakenFound || 0) + 1)) - 1, K = KRAKEN_LINES[n];
      var half = Math.floor(gold(id) / 2), eaten = half ? addPts(id, -half, 'kraken') : 0;
      banner({ art: ART.kraken(), title: K.title, sub: K.say + ' ' + (eaten ? 'It grabs half of ' + t + "'s gold!" : t + ' had no gold to take. Lucky!'), gold: eaten, mood: 'bad', sound: 'sea', wait: 2800 });
      return;
    }
    var beard = has(m.beard, c), kidd = has(m.kidd, c), raidIsle = has(m.raid, c), chest = has(m.chest, c), gem = has(m.treasure, c), fort = has(m.fort, c);
    var worth = step.v + (step.dig ? DIG : 0) + (beard || kidd ? BEARD : 0) + (chest ? CHEST : 0) + (gem ? GEM : 0);
    if (kidd) drop(m.kidd, c);
    if (raidIsle) { drop(m.raid, c); if (S.claim) S.claim.raidAfter = true; } // a free Pirate Raid after this claim
    if (beard) drop(m.beard, c);
    if (chest) drop(m.chest, c);
    if (gem) drop(m.treasure, c);
    m.own[c] = id; m.worth[c] = worth; (m.order[id] = m.order[id] || []).push(c);
    addPts(id, worth, beard ? "Blackbeard's treasure" : kidd ? "Captain Kidd's treasure" : raidIsle ? 'raid island' : chest ? 'treasure chest' : gem ? 'treasure island' : fort ? 'fortress' : 'island');
    var col = color(id);
    if (beard) banner({ art: ART.beard(), title: "BLACKBEARD'S TREASURE!", sub: t + ' found the legendary pirate gold!', gold: worth, mood: 'magic', sound: 'fanfare', wait: 3000 });
    else if (kidd) banner({ art: ART.beard(), title: "CAPTAIN KIDD'S TREASURE!", sub: t + ' found the hidden pirate gold!', gold: worth, mood: 'magic', sound: 'fanfare', wait: 3000 });
    else if (raidIsle) banner({ art: ART.raid(), title: 'FREE PIRATE RAID!', sub: t + ' found a pirate crew! Attack another team!', gold: worth, mood: 'magic', sound: 'fanfare', wait: 2600 });
    else if (chest) banner({ art: ART.chest(), title: 'TREASURE CHEST!', sub: t + ' digs up a chest full of gold!', gold: worth, mood: 'good', sound: 'gold' });
    else if (gem) banner({ art: ART.gem(), title: 'SPARKLING TREASURE!', sub: t + ' grabs the treasure island!', gold: worth, mood: 'good', sound: 'gold' });
    else if (fort) banner({ art: ART.fort(col), title: 'FORTRESS CAPTURED!', sub: 'Nobody can sink or steal it, or ' + t + "'s islands next to it!", gold: worth, mood: 'good' });
    else if (step.dig) banner({ art: ART.dig(), title: 'STRUCK GOLD!', sub: t + ' digs deep and finds extra gold!', gold: worth, mood: 'good', sound: 'gold' });
    else if (step.second) banner({ art: ART.double(col), title: 'DOUBLE CLAIM!', sub: t + ' plants a second flag!', gold: worth, mood: 'good', wait: 1800 });
    else banner({ art: ART.island(col), title: 'LAND HO!', sub: t + ' claims a new island!', gold: worth, mood: 'good', wait: 1800 });
  }
  function sink(id, c) {
    var o = S.map.own[c], g = loseIsland(o, c, 'island sunk');
    banner({ art: ART.boom(), title: 'KABOOM!', sub: tname(id) + ' sinks ' + tname(o) + "'s island!", gold: g, mood: 'boom', sound: 'boom' });
  }
  function steal(id, c) {
    var o = S.map.own[c], w = S.map.worth[c];
    S.map.own[c] = id; (S.map.order[id] = S.map.order[id] || []).push(c);
    S.map.lock[c] = S.turn + players.length; // safe for one round, so it can't be stolen straight back
    addPts(id, w, 'stole an island'); addPts(o, -w, 'island stolen');
    banner({ art: ART.steal(), title: 'STOLEN!', sub: tname(id) + ' takes an island from ' + tname(o) + '! 🔒 Safe for one round.', gold: w, mood: 'good', sound: 'gold' });
  }
  $('map').addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) tapIsland(+b.dataset.c); });

  // ---------- reward choices: hard / impossible answers and Pirate Raid ----------
  function openChoice() {
    var ch = S.choice;
    if (ch.kind === 'full') { // the map is full: end the game or go on
      $('choiceArt').innerHTML = ART.map();
      $('choiceTitle').textContent = '🗺 THE MAP IS FULL! End the game?';
      $('choices').innerHTML = '<button class="btn ch" data-ch="end"><span class="ch-art">' + ART.crown() + '</span><b>🏁 End the game</b><small>Treasure map, empire bonus and final scores</small></button>' +
        '<button class="btn ch" data-ch="go"><span class="ch-art">' + ART.steal() + '</span><b>⚔ Keep playing</b><small>Every right answer steals an island now</small></button>';
      $('choiceBack').hidden = false;
      return;
    }
    var id = ch.id, enemy = targets(id).length > 0, art = $('choiceArt');
    var opts = ch.kind === 'raid' ? [
      { k: 'sink', art: ART.boom(), title: '💣 Sink', sub: 'Blast an enemy island', off: !enemy },
      { k: 'steal', art: ART.steal(), title: '⚔ Steal', sub: 'Take an enemy island', off: !enemy },
      { k: 'two', art: ART.double(color(id)), title: '🏝🏝 Claim 2', sub: '2 new islands (+' + ch.v + ' each)' },
    ].filter(function (o) { return !(ch.free && o.k === 'two'); }) : [
      { k: 'dig', art: ART.dig(), title: '💰 Gold Dig', sub: 'Island + ' + DIG + ' extra gold' },
      { k: 'cannon', art: ART.cannon(), title: '💣 Cannon Fire', sub: 'Claim 1, then sink an enemy island', off: !enemy },
      { k: 'two', art: ART.double(color(id)), title: '🏝🏝 Double Claim', sub: '2 islands (+' + ch.v + ' each)' },
    ];
    art.innerHTML = ch.kind === 'raid' ? ART.raid() : ART.chest();
    $('choiceTitle').textContent = ch.kind === 'raid' ? '🏴‍☠️ ' + (ch.free ? 'FREE ' : '') + 'PIRATE RAID! ' + tname(id) + ', choose your attack' : '⭐ BIG ANSWER! ' + tname(id) + ', choose your reward';
    $('choices').innerHTML = opts.map(function (o) {
      return '<button class="btn ch" data-ch="' + o.k + '"' + (o.off ? ' disabled' : '') + '><span class="ch-art">' + o.art + '</span><b>' + o.title + '</b><small>' + (o.off ? 'No enemy island to hit yet' : o.sub) + '</small></button>';
    }).join('');
    $('choiceBack').hidden = false;
  }
  $('choices').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ch]');
    if (!b || b.disabled || !S.choice) return;
    unlockAudio();
    var ch = S.choice, k = b.dataset.ch, v = ch.v, steps;
    if (ch.kind === 'full') { // end the game, or keep playing (the next turn goes on)
      S.choice = null; $('choiceBack').hidden = true; save();
      if (k === 'end') endGame(); else nextTurn();
      return;
    }
    if (k === 'dig') steps = [{ m: 'claim', v: v, dig: true }];
    else if (k === 'cannon') steps = [{ m: 'claim', v: v }, { m: 'sink', announce: true }];
    else if (k === 'two') steps = [{ m: 'claim', v: v }, { m: 'claim', v: v, second: true }];
    else if (k === 'sink') steps = [{ m: 'sink' }];
    else steps = [{ m: 'steal' }];
    S.choice = null;
    $('choiceBack').hidden = true;
    tone([660, 880, 1175], 0.08);
    startSteps(ch.id, steps);
  });

  /** The next team's turn: a new round brings a Message in a Bottle; the Last round ends the game; pirates skip a turn. */
  function nextTurn() {
    // the map just got full: ask once whether to end the game (they can keep playing)
    if (S.phase === 'play' && !S.fullAsked && !emptyCells().length) {
      S.fullAsked = true; S.choice = { kind: 'full' }; save(); render(); afterBanners(openChoice);
      return;
    }
    if (advance()) return;
    for (var i = 0; i < players.length; i++) {
      var cur = current();
      if (!S.skip[cur.id]) break;
      S.skip[cur.id] = 0;
      banner({ art: ART.pirates(), title: 'STILL CAPTURED!', sub: cur.name + ' is still a prisoner of the pirates. Next team!', mood: 'bad', wait: 2000 });
      if (advance()) return;
    }
    save(); render();
  }
  /** One step forward. Returns true when the game ended. */
  function advance() {
    S.turn++;
    if (players.length && S.turn % players.length === 0) {
      if (S.lastEnd && S.turn >= S.lastEnd) { endGame(); return true; }
      bottle();
    }
    return false;
  }
  function bottle() {
    var gs = players.map(function (t) { return gold(t.id); }), min = Math.min.apply(null, gs), max = Math.max.apply(null, gs);
    if (players.length < 2 || min === max) return;
    var last = players.filter(function (t) { return gold(t.id) === min; });
    last.forEach(function (t) { addPts(t.id, BOTTLE, 'message in a bottle'); });
    banner({ art: ART.bottle(), title: 'MESSAGE IN A BOTTLE!', sub: last.map(function (t) { return t.name; }).join(' & ') + ' (last place) finds a map to hidden gold!', gold: BOTTLE, mood: 'magic' });
  }

  // ---------- the end: Last round, the treasure map and the empire ----------
  function endGame() {
    S.phase = 'done'; S.reveal = true; S.claim = null; S.choice = null; S.lastEnd = 0;
    save(); render();
    banner({ art: ART.map(), title: 'THE TREASURE MAP!', sub: 'Look where all the secret islands were hiding!', mood: 'magic', wait: 3200 });
    var lead = empireLeaders();
    if (lead.length) banner({ art: ART.crown(), title: 'ISLAND EMPIRE!', sub: 'Biggest group of islands: ' + lead.map(tname).join(' & '), gold: EMPIRE, mood: 'good', sound: 'fanfare', wait: 3000 });
    // the map stays on screen with its secrets; a button goes on to the podium (Henry, Nov 23)
    afterBanners(render);
  }
  function showPodium() { realShow({ keepPlaying: function () { S.phase = 'play'; S.reveal = false; save(); render(); } }); }
  $('toPodium').addEventListener('click', showPodium);
  function lastRound() {
    var n = Math.max(1, players.length);
    if (S.lastEnd) { S.lastEnd = 0; save(); render(); toast('Last round cancelled.'); return; }
    // the round in progress is the last one; at the start of a round, that whole round
    S.lastEnd = S.turn % n === 0 ? S.turn + n : Math.ceil(S.turn / n) * n;
    var turnsLeft = S.lastEnd - S.turn;
    save(); render();
    banner({ art: ART.flag(), title: 'LAST ROUND!', sub: turnsLeft === n ? 'Every team gets one more turn. Make it count!' : turnsLeft + ' more turn' + (turnsLeft === 1 ? '' : 's') + ' so every team gets the same number!', mood: 'magic', sound: 'fanfare' });
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
    if (own.length) decks.push({ key: 'bank', label: 'Quiz Dash questions', sub: own.length + ' questions, easy to impossible', qs: deckQs(own, '', true) });
    var every = [];
    QZ.builtIn.forEach(function (s) { every = every.concat(deckQs(s.questions, s.name)); });
    if (every.length) decks.push({ key: 'qb-all', label: 'Battle of Wits: all topics', sub: every.length + ' questions', qs: every });
    QZ.builtIn.forEach(function (s) { decks.push({ key: 'qb:' + s.name, label: 'Battle of Wits: ' + s.name, sub: s.questions.length + ' questions', qs: deckQs(s.questions, s.name) }); });
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
  /** The next question: a tier at random (hard and impossible are rarer). */
  function pickQuestion() {
    var avail = ORDER.filter(function (t) { return POOL[t].length; });
    if (!avail.length) return null;
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
  var PAUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor"/></svg>';
  var PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  function renderClock() {
    var s = Math.max(0, Math.ceil(left));
    $('digits').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    $('digits').className = 'digits' + (left <= 0 ? ' done' : left <= 5 && running ? ' warn' : '');
    // a || button while the clock runs (orange), a |> button when stopped (green)
    $('go').className = 'btn pausebtn ' + (running ? 'is-running' : 'is-paused');
    $('go').innerHTML = running ? PAUSE_ICON : PLAY_ICON;
    $('go').setAttribute('aria-label', running ? 'Pause the timer' : left <= 0 ? 'Start the timer again' : 'Start the timer');
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
    $('qWho').textContent = t.name + (who ? ' · 🎯 ' + who : '');
    $('qTier').innerHTML = tier.label + ' · ' + tier.pts + ' ' + COIN + (tier.reward ? ' · ⭐ reward' : '');
    $('qTier').className = 'tier ' + tierOf(Q);
    $('qTopic').textContent = Q.set ? '· ' + Q.set : '';
    $('qBody').innerHTML = KruQuiz.html(Q, shown);
    (Q._gone || []).forEach(function (i) { var c = $('qBody').querySelectorAll('.kq-choice')[i]; if (c) c.classList.add('gone'); });
    // Reveal first: then it goes away and ✗ Wrong, ✓ Right and No Answer take its place
    $('reveal').hidden = shown;
    $('wrong').hidden = $('right').hidden = $('noAnswer').hidden = !shown;
    renderPowers();
    KruQuiz.fit($('stage'));
  }
  function used(id, p) { return !!(S.powers[id] && S.powers[id][p]); }
  function use(id, p) { (S.powers[id] = S.powers[id] || {})[p] = true; save(); }
  function renderPowers() {
    var id = current().id;
    $('powers').innerHTML = '<span class="pw-lab">Power-ups:</span>' + POWERS.map(function (p) {
      var on = p.id === 'raid' && raid;
      var off = used(id, p.id) || (p.id === 'fifty' && (!Array.isArray(Q.choices) || Q.choices.length < 4 || !!Q._gone)) ||
        (shown && p.id !== 'time') || (p.id === 'free' && raid); // no Free answer with a Pirate Raid
      return '<button class="btn pw' + (on ? ' on' : '') + (used(id, p.id) ? ' used' : '') + '" data-pw="' + p.id + '"' + (off && !on ? ' disabled' : '') +
        ' aria-pressed="' + on + '">' + (on ? '🏴‍☠️ RAID: ON' : p.label) + '</button>';
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
      toast('🎟 ' + current().name + ' used Free Play!');
      rightAnswer();
    } else if (p === 'raid') {
      raid = !raid; tone(raid ? [392, 523, 659] : [440], 0.08); renderPowers();
    }
  });
  function ask() {
    if (busy || !current() || S.claim || S.choice || S.phase !== 'play' || fxOn) return;
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
    Q = Object.assign({}, q); shown = false; raid = false;
    snapshot(); save();
    stopTimer(); total = left = S.secs; renderClock();
    $('qBack').hidden = false;
    renderQuestion();
    tone([660, 880], 0.12);
    startTimer();
  }
  function closeQuestion() { stopTimer(); $('qBack').hidden = true; }
  function rightAnswer() {
    var t = current(), tier = TIERS[tierOf(Q)], v = tier.pts, rd = raid;
    raid = false;
    if (rd) use(t.id, 'raid');
    closeQuestion();
    if (rd || tier.reward) {
      S.choice = { id: t.id, kind: rd ? 'raid' : 'reward', v: v };
      save(); render();
      if (rd) banner({ art: ART.raid(), title: 'RAID SUCCESS!', sub: t.name + "'s pirates storm the islands!", mood: 'magic', sound: 'fanfare', wait: 1800 });
      afterBanners(openChoice);
      return;
    }
    startSteps(t.id, [{ m: 'claim', v: v }]);
  }
  // INCORRECT pop-up: a line of encouragement, rotating, never the same one twice in a row
  var ENC = ["Good try, matey! The next one's yours!", "Don't give up, crew!", 'Even pirates miss sometimes!', 'Shake it off and sail on!',
    'Every mistake teaches the crew!', 'Chin up, captain!', 'So close! Try again next turn!', 'The treasure is still out there!'];
  var lastEnc = -1;
  function encourage() { var i = Math.floor(Math.random() * ENC.length); if (i === lastEnc) i = (i + 1) % ENC.length; lastEnc = i; return ENC[i]; }
  /** Wrong answer (no gold lost) or no answer (-3 gold); a failed Pirate Raid also loses the 2 newest islands. */
  function missed(silent) {
    unlockAudio();
    var t = current(), rd = raid;
    raid = false;
    if (rd) use(t.id, 'raid');
    closeQuestion();
    if (!silent) banner({ art: ART.incorrect(), title: 'INCORRECT', sub: encourage(), mood: 'bad', sound: 'bad' });
    if (silent) {
      var g = addPts(t.id, -NO_ANSWER, 'no answer');
      banner({ art: ART.silence(), title: 'SILENCE ON DECK!', sub: 'No answer from ' + t.name + '. Always have a guess!', gold: g, mood: 'bad' });
    }
    if (rd) {
      var lost = newest(t.id).slice(0, 2), g2 = 0;
      lost.forEach(function (c) { g2 += loseIsland(t.id, c, 'raid failed'); });
      banner({ art: ART.sinking(), title: 'RAID FAILED!', sub: lost.length ? t.name + ' loses ' + (lost.length === 2 ? 'its 2 newest islands' : 'its newest island') + '!' : t.name + ' had no islands to lose. Phew!', gold: g2, mood: 'bad', sound: 'sea' });
    }
    afterBanners(nextTurn);
  }
  $('ask').addEventListener('click', ask);
  $('go').addEventListener('click', function () { if (running) { stopTimer(); renderClock(); } else startTimer(); });
  $('reveal').addEventListener('click', function () { unlockAudio(); stopTimer(); renderClock(); shown = true; tone([523, 659]); renderQuestion(); });
  $('right').addEventListener('click', rightAnswer);
  $('wrong').addEventListener('click', function () { missed(false); });
  $('noAnswer').addEventListener('click', function () { missed(true); });

  // ---------- ⋯ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function renderSecs() { KruMenu.timer($('secsRow'), S.secs, function (v) { S.secs = v; save(); }); } // the alarm-clock timer (shared/kru-menu.js)
  function renderWho() { $('whoOn').textContent = '🎯 Who answers: ' + (S.who ? 'on' : 'off'); $('whoOn').setAttribute('aria-pressed', String(!!S.who)); }
  $('more').addEventListener('click', function () {
    renderSecs(); renderWho(); disarm();
    $('undoMove').disabled = !S.hist.length || busy;
    $('skip').disabled = busy || !!S.claim || !!S.choice || S.phase !== 'play';
    $('lastRound').disabled = busy || S.phase !== 'play';
    $('lastRound').textContent = S.lastEnd ? 'Cancel the last round' : '🏁 Last round';
    $('menuBack').hidden = false;
  });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('whoOn').addEventListener('click', function () { S.who = !S.who; save(); renderWho(); });
  $('deckBtn').addEventListener('click', function () { closeMenu(); openDecks(); });
  $('skip').addEventListener('click', function () { closeMenu(); nextTurn(); });
  $('undoMove').addEventListener('click', function () { closeMenu(); if (undo()) toast('Back to before the last question.'); });
  $('lastRound').addEventListener('click', function () { closeMenu(); unlockAudio(); lastRound(); });
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: 'Quiz Island' }); });
  function disarm() { $('newGame').classList.remove('armed'); $('newGame').textContent = 'New Game'; }
  $('newGame').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again to confirm'; setTimeout(disarm, 3500); return; }
    players.forEach(function (t) { var p = gold(t.id); if (p) Kru.score(t.id, -p, 'reset'); });
    fresh(S.deck);
    $('choiceBack').hidden = true;
    save(); closeMenu(); render();
  });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden || !$('deckBack').hidden || !$('choiceBack').hidden) return;
    if (!$('fx').hidden) { if (e.code === 'Space') { e.preventDefault(); $('fx').click(); } return; }
    if (!$('qBack').hidden) {
      if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
      else if (e.key === 'a' || e.key === 'A') $('reveal').click();
    } else if (e.code === 'Space') { e.preventDefault(); ask(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', function () { if (!$('qBack').hidden) KruQuiz.fit($('stage')); });

  // End Game, 🏆 and Kru's Finish always show the treasure map first, then the podium button
  var realShow = null;
  function hookEnd() {
    if (realShow) return;
    realShow = KruEnd.show;
    KruEnd.show = function (o) { if (S && S.phase === 'play') endGame(); else realShow(o); };
  }
  Kru.onFinishRequest(function () { Kru.finish(teams.map(function (t) { return { teamId: t.id, points: t.teacher ? 0 : finalPts(t.id) }; })); });

  // ---------- start ----------
  function fresh(deck) {
    S = { v: 3, level: S ? S.level : '', deck: deck || '', map: newMap(), pts: {}, turn: 0, skip: {}, powers: {}, mpicked: {}, who: S ? !!S.who : false,
      secs: S ? S.secs : 30, hist: [], claim: null, choice: null, phase: 'play', lastEnd: 0, reveal: false, introDone: S ? S.introDone : false, order: {}, qi: {} };
    shownGold = {};
    buildPool();
  }
  var contentReady = fetch('/games/race-board/content.json').then(function (r) { return r.json(); });
  var ownReady = fetch('content.json').then(function (r) { return r.json(); }); // Quiz Island's own How to play slides
  Kru.ready(function (session) {
    Promise.all([contentReady, KruQuiz.load(session.level, session), ownReady]).then(function (all) {
      var c = all[0], QZ = all[1], mine = all[2], lv = c.questions && c.questions[QZ.level] ? QZ.level : 'M.2';
      DECKS = buildDecks(c, QZ, lv);
      teams = Kru.allTeams();
      players = teams.filter(function (t) { return !t.teacher; });
      KruEnd.setup({ standings: function () { return players.map(function (t) { return { name: t.name, points: finalPts(t.id) }; }); } });
      hookEnd();
      var saved = session.resume;
      if (saved && saved.v === 3 && saved.level === QZ.level && saved.map && saved.map.own && saved.map.own.length === CELLS && (!saved.deck || deckByKey(saved.deck))) {
        S = saved; buildPoolKeep();
      } else {
        S = null; fresh(session.setKey && deckByKey(session.setKey) ? session.setKey : QZ.unit ? 'unit' : ''); // the deck picked before the team builder
        S.level = QZ.level;
      }
      S.secs = KruMenu.snap(S.secs); S.hist = S.hist || []; S.skip = S.skip || {}; S.powers = S.powers || {}; S.mpicked = S.mpicked || {}; S.phase = S.phase || 'play';
      players.forEach(function (t) { shownGold[t.id] = gold(t.id); });
      INTRO = KruIntro.forLevel(mine, QZ.level);
      render();
      var afterIntro = function () {
        S.introDone = true; save();
        if (!S.deck) openDecks();
        else if (S.choice) openChoice();
        else if (S.claim) prepStep();
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
