/* Point 1-4 (folder and id: fortress; Henry, Nov 23-24; modern military / future warfare theme): four teams defend a base
   and attack each other. Made with LM2, a student who helped create the game.
   - Every base: HQ 10,000 HP, Depot 6,000, two Towers 4,000 each; an intact Depot heals every building 450 HP per round.
   - A turn = a question. Right: the team picks 💣 a weapon (random, better ones are likelier on harder questions), 🩹 a
     repair or 🪙 gold. Power-ups (once each): Question Change (swap the question for a Hard or Impossible one: more
     gold), Free Answer, Risk It (a better weapon or 5x gold; wrong = every building except the HQ loses half its
     starting HP) and Alliance. Free Answer and Question Change cannot be combined; Risk It still can.
   - After every team had its turn: the Haishi Trade Company store (weapons and repair kits, kits are kept in the
     inventory and can bring back even a destroyed building), then FIRE, then the next round.
   - Towers shoot weapons down: [LQ] 100%, [Q] 16%, [HQ] 8%, the Sarmat 1% with both towers; one tower left = half.
   - Depot destroyed: question gold is halved, no healing, [Q] and [HQ] cost 1.6x.
   - HQ destroyed: use a repair kit (kept, or bought on the spot), or sacrifice another building; nothing left = out.
     An eliminated team joins one of the remaining teams (it shares that team's final points).
   - Games last 6 rounds by default (2-15): then the strongest base (most HP) wins. Otherwise the last base standing.
   - Points: 5 / 3 / 2 / 1 by place. (A winner who beat an alliance gets bonus points in the grading, noted at the end.) */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#9B7BFF'];
  var KEYS = ['hq', 'depot', 't1', 't2'];
  var MAXHP = { hq: 10000, depot: 6000, t1: 4000, t2: 4000 };
  var BNAME = { hq: 'HQ', depot: 'Depot', t1: 'Tower', t2: 'Tower' };
  // the store (Haishi Trade Company): mode = one target | scatter (all but the chosen one) | dual (two targets) | all (every building of one team) | jam (skip a turn)
  var ITEMS = {
    crude: { name: 'Crude Bomb', cls: 'LQ', dmg: 250, price: 200, mode: 'one', info: '250 DMG · one target' },
    bomb: { name: 'Bomb', cls: 'LQ', dmg: 750, price: 350, mode: 'one', info: '750 DMG · one target' },
    scatter: { name: 'Scatter Bomb', cls: 'LQ', dmg: 650, price: 500, mode: 'scatter', info: '650 DMG · all but the chosen target' },
    missile: { name: 'High Speed Missile', cls: 'Q', dmg: 1750, price: 1500, mode: 'one', info: '1,750 DMG · one target' },
    dual: { name: 'Dual Headed Missile', cls: 'Q', dmg: 1500, price: 2400, mode: 'dual', info: '1,500 DMG · two targets' },
    jammer: { name: 'Signal Jammer', cls: 'Q', dmg: 0, price: 4000, mode: 'jam', info: "skips an enemy team's turn (one per team per round)" },
    tos: { name: 'TOS-2M', cls: 'HQ', dmg: 2000, price: 10000, mode: 'all', curse: true, info: '2000 DMG · all targets · curses their next weapon' },
    avangard: { name: 'Avangard', cls: 'HQ', dmg: 4000, price: 15000, mode: 'one', info: '4000 DMG · one target' },
    sarmat: { name: 'RS-28 Sarmat', cls: 'HQ', dmg: 9000, price: 30000, mode: 'all', chance: 0.01, info: '9000 DMG · all targets · 1% shot down' },
  };
  var IORDER = ['crude', 'bomb', 'scatter', 'missile', 'dual', 'jammer', 'tos', 'avangard', 'sarmat'];
  var SHOOT = { LQ: 1, Q: 0.16, HQ: 0.08 }; // per tower: Q 8%, HQ 4% (Nov 25 spec); [LQ] 100% = the student's design (Henry chose it, Nov 25): cheap bombs only land once the towers are down
  // the chance of each item (same order as IORDER) from a right answer, by question tier
  var ODDS = {
    easy: [60, 30, 10, 0, 0, 0, 0, 0, 0],
    regular: [20, 35, 25, 15, 5, 0, 0, 0, 0],
    hard: [0, 10, 15, 30, 20, 15, 5, 5, 0],
    impossible: [0, 0, 0, 10, 15, 10, 25, 40, 0], // the RS-28 Sarmat can only be bought in the store
  };
  var GOLD = { easy: 150, regular: 250, hard: 500, impossible: 836 }; // base gold per question (Nov 25 spec; impossible is 836 on purpose)
  var GOLD_EARLY = 4.5, GOLD_LATE = 7.5, LATE_FROM = 3, RISK_GOLD = 5; // x4.5 in rounds 1-2, x7.5 from round 3; Risk It pays 5x
  function goldBoost() { return S.round >= LATE_FROM ? GOLD_LATE : GOLD_EARLY; }
  var HEAL = { easy: 1500, regular: 2500, hard: 4000, impossible: 6000 };
  var KIT = 400, KIT_RISE = 200, KIT_HP = 1350; // the price rises every round, so buy kits early
  var ROUND_HEAL = 450, RES = 0.05, RES_CAP = 0.17, ALLY_HQ = 0.1, NO_DEPOT_GOLD = 0.5, NO_DEPOT_PRICE = 1.6, CURSE_CHANCE = 0.4;
  var DEFAULT_ROUNDS = 6; // a round takes about 6-8 minutes with four teams (⚙ changes it)
  var PLACE_PTS = [5, 3, 2, 1];
  var ORDER = ['easy', 'regular', 'hard', 'impossible'];
  var TIERS = {
    easy: { label: 'Easy', share: 30 },
    regular: { label: 'Regular', share: 45 },
    hard: { label: 'Hard', share: 17 },
    impossible: { label: 'Impossible', share: 8 },
  };
  var POWERS = [{ id: 'change', label: '🔁 Question Change' }, { id: 'free', label: 'Free Answer' }, { id: 'risk', label: '🎲 Risk It' }];
  // ---------- two rule sets (Henry, Nov 25) ----------
  // LM2 = the student's version, exactly as built above (nothing in it changes). SMASH = a faster, fairer version:
  // every weapon works the first time you play it (no tower shoot-down: towers are ARMOR), a right answer is an
  // attack straight away (no gold, no store), and a wrong answer simply means no attack.
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var RISK_LOSS = 0.5; // Risk It, wrong answer: every building except the HQ loses this share of its starting HP
  var SM_ITEMS = {
    crude: { name: 'Crude Bomb', cls: 'LQ', dmg: 600, price: 0, mode: 'one' },
    bomb: { name: 'Bomb', cls: 'LQ', dmg: 1000, price: 0, mode: 'one' },
    scatter: { name: 'Scatter Bomb', cls: 'LQ', dmg: 700, price: 0, mode: 'scatter' },
    missile: { name: 'High Speed Missile', cls: 'Q', dmg: 1800, price: 0, mode: 'one' },
    dual: { name: 'Dual Headed Missile', cls: 'Q', dmg: 1100, price: 0, mode: 'dual' },
    jammer: { name: 'Signal Jammer', cls: 'Q', dmg: 0, price: 0, mode: 'jam' },
    tos: { name: 'TOS-2M', cls: 'HQ', dmg: 1300, price: 0, mode: 'all' },
    avangard: { name: 'Avangard', cls: 'HQ', dmg: 3200, price: 0, mode: 'one' },
    sarmat: { name: 'RS-28 Sarmat', cls: 'HQ', dmg: 2000, price: 0, mode: 'all' },
  };
  var SM_OPTS = { easy: ['crude'], regular: ['bomb', 'scatter'], hard: ['missile', 'dual', 'jammer'], impossible: ['avangard', 'tos', 'jammer'] }; // a right answer: pick one of these (or Repair)
  var SM_REPAIR = { easy: 800, regular: 1200, hard: 1800, impossible: 3000 };
  var SM_STREAK = 3, SM_RISK = 1.5; // 3 right answers in a row unlock the RS-28 Sarmat; Risk It = x1.5 damage
  var RULESETS = {
    lm2: { MAXHP: clone(MAXHP), ITEMS: clone(ITEMS), SHOOT: clone(SHOOT), RES: RES, RES_CAP: RES_CAP, ROUND_HEAL: ROUND_HEAL, DEFAULT_ROUNDS: DEFAULT_ROUNDS, RISK_LOSS: 0.5, share: [30, 45, 17, 8] },
    smash: { MAXHP: { hq: 3200, depot: 2000, t1: 1400, t2: 1400 }, ITEMS: SM_ITEMS, SHOOT: { LQ: 0, Q: 0, HQ: 0 }, RES: 0.15, RES_CAP: 0.3, ROUND_HEAL: 250, DEFAULT_ROUNDS: 6, RISK_LOSS: 0.3, share: [20, 40, 28, 12] },
  };
  function applyRules(name) {
    var r = RULESETS[name] || RULESETS.lm2;
    MAXHP = r.MAXHP; ITEMS = r.ITEMS; SHOOT = r.SHOOT; RES = r.RES; RES_CAP = r.RES_CAP; ROUND_HEAL = r.ROUND_HEAL; DEFAULT_ROUNDS = r.DEFAULT_ROUNDS; RISK_LOSS = r.RISK_LOSS;
    ORDER.forEach(function (t, i) { TIERS[t].share = r.share[i]; });
    DESC = name === 'smash' ? DESC_SMASH : DESC_LM2;
  }
  function isSmash() { return !!S && S.rules === 'smash'; }
  var $ = function (id) { return document.getElementById(id); };
  var esc = KruQuiz.esc;
  var ART = window.FtArt;
  KruQuiz.shortHint = 'Short answer: say it out loud';

  var DECKS = [], POOL = {}, teams = [], players = [], INTRO = [];
  var S = null;
  var left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null;
  var Q = null, shown = false, risk = false;

  function save() { Kru.saveState(S); }
  function shuffle(a) { for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; } return a; }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function weighted(w) { var sum = 0, i; for (i = 0; i < w.length; i++) sum += w[i]; var r = Math.random() * sum; for (i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; } return w.length - 1; }
  function team(id) { return players.filter(function (t) { return t.id === id; })[0]; }
  function tname(id) { var t = team(id); return t ? t.name : ''; }
  function color(id) { var i = players.map(function (t) { return t.id; }).indexOf(id); return COLORS[(i < 0 ? 0 : i) % COLORS.length]; }
  function T(id) { return S.t[id]; }
  function alive(id) { return !!S.t[id] && S.t[id].alive; }
  function living() { return players.filter(function (t) { return alive(t.id); }).map(function (t) { return t.id; }); }
  function allyOf(id) { var a = S.t[id] && S.t[id].ally; return a && alive(a) ? a : null; }
  function curId() { return S.queue[S.cur] || null; }
  function tierOf(q) { return TIERS[q.tier] ? q.tier : 'regular'; }
  /** 12000 -> "12k", 7500 -> "7.5k" (the board is small) */
  function kfmt(n) { n = Math.max(0, Math.round(n)); return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n); }
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // ---------- defense: towers and depots are shared with an ally ----------
  function towers(id) {
    var n = 0;
    [id, allyOf(id)].forEach(function (x) { if (x) ['t1', 't2'].forEach(function (k) { if (T(x).hp[k] > 0) n++; }); });
    return n;
  }
  function depotOk(id) { return T(id).hp.depot > 0 || (allyOf(id) ? T(allyOf(id)).hp.depot > 0 : false); }
  function resist(id, key) { return Math.min(RES_CAP, RES * towers(id)) + (key === 'hq' && allyOf(id) ? ALLY_HQ : 0); }
  /** your own Depot gone: the gold from questions is halved and [Q] items and better cost 1.6x */
  function goldMult(id) { return depotOk(id) ? 1 : NO_DEPOT_GOLD; }
  /** the chance the towers shoot this item down: the full class chance with both towers, half with one, none with none */
  function shootChance(it, id) { return (it.chance != null ? it.chance : SHOOT[it.cls]) * Math.min(1, towers(id) / 2); }
  function priceOf(id, key) { var it = ITEMS[key]; return Math.round(it.price * (it.cls !== 'LQ' && !depotOk(id) ? NO_DEPOT_PRICE : 1)); }
  function kitPrice() { return KIT + KIT_RISE * (S.round - 1); }
  function totalHp(id) { return KEYS.reduce(function (n, k) { return n + Math.max(0, T(id).hp[k]); }, 0); }

  // ---------- sound ----------
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
    bad: function () { tone([330, 262, 196], 0.18, 0.45); },
    boom: function () { boom(); },
    fanfare: function () { tone([523, 523, 659, 784, 1047], 0.12, 0.35); },
    magic: function () { tone([784, 988, 1175], 0.1, 0.3); },
  };
  var toastTimer = 0;
  function toast(text) {
    $('toastText').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 3500);
  }

  // ---------- big event banners (one at a time) ----------
  var fxQueue = [], fxOn = false, fxTimer = 0, fxDone = null;
  /** o: { art, title, sub, mood: good | bad | boom | magic, sound, then, wait } */
  function banner(o) { fxQueue.push(o); if (!fxOn) nextBanner(); }
  function nextBanner() {
    var o = fxQueue.shift();
    if (!o) { fxOn = false; $('fx').hidden = true; var d = fxDone; fxDone = null; render(); if (d) d(); return; }
    fxOn = true;
    var fx = $('fx');
    fx.className = 'fx ' + (o.mood || 'good');
    $('fxArt').innerHTML = o.art || '';
    $('fxTitle').textContent = o.title;
    $('fxSub').textContent = o.sub || '';
    $('fxJob').innerHTML = ART.job(); // LM2, the student who helped create the game, is in every pop-up
    $('fxBits').innerHTML = o.mood === 'good' || o.mood === 'magic' ? range(14).map(function (i) {
      var a = (i / 14) * 360, d2 = 140 + (i % 3) * 40;
      return '<i style="--a:' + a + 'deg;--d:' + d2 + 'px;--t:' + (i % 4) * 0.05 + 's">✦</i>';
    }).join('') : '';
    fx.hidden = false;
    void fx.offsetWidth;
    fx.classList.add('go');
    if (SOUNDS[o.sound || o.mood]) SOUNDS[o.sound || o.mood]();
    clearTimeout(fxTimer);
    fxTimer = setTimeout(nextBanner, (o.wait || 2600) + 1000);
    if (o.then) fxDone = chain(fxDone, o.then);
  }
  function chain(a, b) { return a ? function () { a(); b(); } : b; }
  function afterBanners(f) { if (fxOn) fxDone = chain(fxDone, f); else f(); }
  $('fx').addEventListener('click', function () { clearTimeout(fxTimer); nextBanner(); });

  // ---------- undo: a snapshot before every action ----------
  function snap() {
    var h = S.hist; S.hist = [];
    h.push(JSON.stringify(S)); S.hist = h;
    if (S.hist.length > 25) S.hist.shift();
  }
  function undo() {
    var h = S.hist.pop();
    if (!h) return false;
    var hist = S.hist;
    S = JSON.parse(h); S.hist = hist;
    S.aim = null; fxQueue = []; fxOn = false; $('fx').hidden = true; clearTimeout(fxTimer);
    closeChoice(); closeShop(); closeQuestion(); save(); render();
    return true;
  }

  // ---------- the new game ----------
  function newTeams() {
    var t = {};
    players.forEach(function (p) {
      t[p.id] = { hp: { hq: MAXHP.hq, depot: MAXHP.depot, t1: MAXHP.t1, t2: MAXHP.t2 }, gold: 0, kits: 0, bombs: [], alive: true, ally: null, powers: {}, curse: false, streak: 0 };
    });
    return t;
  }
  function fresh(deck) {
    var rules = S && S.rules ? S.rules : 'smash', picked = S ? !!S.rulesPicked : false; // the rules survive a New Game
    applyRules(rules);
    S = { v: 4, rules: rules, rulesPicked: picked, started: false, level: S ? S.level : '', deck: deck || '', t: newTeams(), phase: 'turn', round: 1, queue: [], cur: 0, skip: {}, elim: [], over: false,
      maxRounds: S ? S.maxRounds : DEFAULT_ROUNDS, joined: {}, hitBy: {}, allyLog: [], byHp: false, bonusNote: '', tieNote: '',
      aim: null, secs: S ? S.secs : 30, hist: [], introDone: S ? S.introDone : false, order: {}, qi: {} };
    S.queue = living();
    buildPool();
  }

  // ---------- phases: turn -> shop -> fire -> next round ----------
  function startTurns() { S.phase = 'turn'; S.queue = living(); S.cur = 0; S.aim = null; skipDead(); }
  function skipDead() {
    while (S.cur < S.queue.length) {
      var id = S.queue[S.cur];
      if (!alive(id)) { S.cur++; continue; }
      if (S.phase === 'turn' && S.skip[id]) { S.skip[id] = false; toast(tname(id) + ' skips this turn.'); S.cur++; continue; }
      if (S.phase === 'shop' && !T(id).gold) { S.cur++; continue; }
      if (S.phase === 'fire' && !T(id).bombs.length) { S.cur++; continue; }
      if (S.phase === 'repair' && !canRepair(id)) { S.cur++; continue; }
      break;
    }
  }
  function advance() {
    if (S.over) return;
    if (isSmash() && S.queue[S.cur] && S.t[S.queue[S.cur]]) S.t[S.queue[S.cur]].bombs = []; // an unfired weapon does not carry over
    S.cur++; S.aim = null; skipDead();
    if (S.cur < S.queue.length) { save(); render(); if (S.phase === 'shop') afterBanners(openShop); else if (S.phase === 'repair') afterBanners(openRepair); return; }
    if (S.phase === 'turn' && isSmash()) { endRound(); return; }
    if (S.phase === 'turn') { startPhase('shop', 'HAISHI TRADE COMPANY IS OPEN!', 'Spend your gold on weapons and repair kits.', ART.coin()); }
    else if (S.phase === 'shop') { startPhase('fire', 'FIRE AT WILL!', 'Aim your bombs at an enemy building.', ART.boom()); }
    else if (S.phase === 'fire') { startPhase('repair', 'END OF ROUND!', 'Use your repair kits as often as you like.', ART.repair()); }
    else endRound();
  }
  function startPhase(name, title, sub, art) {
    S.phase = name; S.queue = living(); S.cur = 0; S.aim = null;
    skipDead();
    if (S.cur >= S.queue.length) { save(); advance2(name); return; }
    banner({ art: art, title: title, sub: sub, mood: 'magic', wait: 1500 });
    save(); render();
    if (name === 'shop') afterBanners(openShop);
    else if (name === 'repair') afterBanners(openRepair);
  }
  /** a phase nobody can use (no gold / no bombs): go on to the next one */
  function advance2(name) { S.cur = S.queue.length; if (name === 'shop') startPhase('fire', 'FIRE AT WILL!', 'Aim your bombs at an enemy building.', ART.boom()); else if (name === 'fire') startPhase('repair', 'END OF ROUND!', 'Use your repair kits as often as you like.', ART.repair()); else endRound(); }
  function endRound() {
    var healed = [];
    living().forEach(function (id) {
      if (!depotOk(id)) return;
      var any = false;
      KEYS.forEach(function (k) { var h = T(id).hp[k]; if (h > 0 && h < MAXHP[k]) { T(id).hp[k] = Math.min(MAXHP[k], h + ROUND_HEAL); any = true; } });
      if (any) healed.push(tname(id));
    });
    if (S.round >= (S.maxRounds || DEFAULT_ROUNDS)) { timesUp(); return; } // the planned rounds are over: the strongest base wins
    S.round++;
    startTurns();
    var more = healed.length ? healed.join(', ') + ' healed a little.' : 'A new round begins.';
    banner({ art: ART.shield(), title: 'ROUND ' + S.round + ' OF ' + (S.maxRounds || DEFAULT_ROUNDS) + '!', sub: more, mood: 'good', wait: 1500 });
    save(); render();
  }

  // ---------- damage, destruction, elimination ----------
  function setHp(id, key, hp) { T(id).hp[key] = Math.max(0, hp); }
  function enemies(id) { return living().filter(function (o) { return o !== id && allyOf(id) !== o; }); }
  function aliveKeys(id) { return KEYS.filter(function (b) { return T(id).hp[b] > 0; }); }
  /** Which buildings a launch hits, from what the teacher tapped. */
  function expand(it, picks) {
    if (it.mode === 'scatter') return aliveKeys(picks[0].t).filter(function (b) { return b !== picks[0].b; }).map(function (b) { return { t: picks[0].t, b: b }; });
    if (it.mode === 'all') return aliveKeys(picks[0].t).map(function (b) { return { t: picks[0].t, b: b }; });
    return picks.slice();
  }
  function launch(from, bomb, picks) {
    snap();
    var bi = T(from).bombs.indexOf(bomb), it = ITEMS[bomb.k];
    if (bi < 0) bi = T(from).bombs.map(function (x) { return x.k; }).indexOf(bomb.k);
    T(from).bombs.splice(bi, 1);
    S.aim = null;
    var boost = S.boost || 1; S.boost = 0; // SMASH: Risk It = x1.5 damage
    boom();
    if (it.mode === 'jam') {
      var jt = picks[0].t;
      S.skip[jt] = true; S.jamUsed = S.jamUsed || {}; S.jamUsed[from] = S.round; save();
      banner({ art: ART.risk(), title: 'SIGNAL JAMMED!', sub: tname(jt) + ' will skip its next turn.', mood: 'magic', wait: 1500 });
      afterBanners(continueFire);
      return;
    }
    var hits = expand(it, picks), hitTeams = [];
    hits.forEach(function (h) { if (hitTeams.indexOf(h.t) < 0) hitTeams.push(h.t); });
    var shot = [];
    hitTeams.forEach(function (t) { if (Math.random() < shootChance(it, t)) shot.push(t); });
    var landed = hits.filter(function (h) { return shot.indexOf(h.t) < 0; });
    var landedTeams = hitTeams.filter(function (t) { return shot.indexOf(t) < 0; });
    landedTeams.forEach(function (t) { S.hitBy[t] = from; }); // the team that destroyed you can be joined later
    if (!landed.length) {
      banner({ art: ART.shield(), title: 'SHOT DOWN!', sub: "A tower shot down " + tname(from) + "'s " + it.name + '!', mood: 'good', sound: 'magic', wait: 1500 });
      afterBanners(continueFire); save(); return;
    }
    var destroyed = 0, total = 0;
    landed.forEach(function (h) {
      var dmg = Math.round(it.dmg * boost * (1 - resist(h.t, h.b)));
      var was = T(h.t).hp[h.b];
      setHp(h.t, h.b, was - dmg); total += Math.min(was, dmg);
      if (T(h.t).hp[h.b] <= 0) destroyed++;
    });
    if (it.curse) landedTeams.forEach(function (t) { T(t).curse = true; });
    var where = landedTeams.map(tname).join(' & ');
    var sub = tname(from) + ' hits ' + where + (landed.length > 1 ? ' (' + landed.length + ' buildings)' : "'s " + BNAME[landed[0].b]) + ' for ' + money(total) + (destroyed ? ': ' + destroyed + ' DESTROYED!' : '.') +
      (shot.length ? ' Shot down at ' + shot.map(tname).join(' & ') + '.' : '') + (it.curse ? ' Their next bomb is cursed!' : '');
    banner({ art: ART.weapon(bomb.k), title: it.name.toUpperCase() + '!', sub: sub, mood: 'boom', wait: 1800 });
    save();
    afterBanners(function () { processFalls(landedTeams, continueFire); });
  }
  /** Teams whose HQ fell, one after the other. */
  function processFalls(list, done) {
    if (!list.length) { done(); return; }
    var id = list[0], rest = list.slice(1);
    if (alive(id) && T(id).hp.hq <= 0) hqFell(id, function () { processFalls(rest, done); });
    else processFalls(rest, done);
  }
  function continueFire() {
    if (S.over) return;
    var id = curId();
    if (!id || !alive(id) || !T(id).bombs.length) advance(); else { save(); render(); }
  }
  /** The HQ is destroyed: use a repair kit (kept, or bought on the spot), sacrifice another building, or the base falls. */
  function hqFell(id, next) {
    var d = T(id), rest = KEYS.filter(function (b) { return b !== 'hq' && d.hp[b] > 0; });
    var kp = kitPrice(), haveKit = d.kits > 0, canBuy = !haveKit && d.gold >= kp;
    if (!rest.length && !haveKit && !canBuy) { eliminate(id, next); return; }
    banner({ art: ART.ruins(), title: 'HQ DESTROYED!', sub: tname(id) + ' is on the brink! It can still fight on.', mood: 'bad', wait: 1500 });
    afterBanners(function () {
      var opts = [];
      if (haveKit || canBuy) opts.push({ html: '<b>🧰 ' + (haveKit ? 'Use a repair kit' : 'Buy and use a repair kit (' + money(kp) + ' gold)') + '</b><small>the HQ comes back with ' + money(KIT_HP) + ' HP' + (haveKit ? ' · you have ' + d.kits : '') + '</small>', fn: function () {
        if (haveKit) d.kits--; else d.gold -= kp;
        d.hp.hq = KIT_HP; closeChoice(); save();
        banner({ art: ART.repair(), title: 'EMERGENCY REPAIRS!', sub: tname(id) + "'s HQ is back in action!", mood: 'magic', wait: 1500 });
        afterBanners(next);
      } });
      rest.forEach(function (b) { opts.push({ html: '<b>Sacrifice the ' + BNAME[b] + '</b><small>the HQ takes its ' + money(d.hp[b]) + ' HP</small>', fn: function () {
        d.hp.hq = d.hp[b]; d.hp[b] = 0; closeChoice(); save();
        banner({ art: ART.hq(color(id)), title: 'HQ RESTORED!', sub: tname(id) + ' sacrificed its ' + BNAME[b] + '.', mood: 'magic', wait: 1500 });
        afterBanners(next);
      } }); });
      opts.push({ html: '<b>Surrender</b><small>' + esc(tname(id)) + ' is out and joins another team</small>', fn: function () { closeChoice(); eliminate(id, next); } });
      choose({ art: ART.hq(color(id)), title: tname(id) + ': the HQ fell. What now?', options: opts });
    });
  }
  function eliminate(id, next) {
    T(id).alive = false; T(id).hp.hq = 0;
    if (S.t[id].ally && S.t[S.t[id].ally]) S.t[S.t[id].ally].ally = null;
    S.elim.push(id);
    banner({ art: ART.ruins(), title: 'BASE FALLEN!', sub: tname(id) + ' is out of the fight.', mood: 'bad', sound: 'bad' });
    dissolveAlliances();
    afterBanners(function () {
      var l = living();
      if (l.length <= 1) { if (l.length) S.joined[id] = l[0]; checkEnd(); return; }
      joinChoice(id, function () { if (!checkEnd()) next(); });
    });
    save();
  }
  /** An eliminated team chooses which remaining team to join (even the one that destroyed it); it shares that team's points. */
  function joinChoice(id, done) {
    var hit = S.hitBy[id];
    choose({ art: ART.alliance(), title: tname(id) + ' is out. Join which team?',
      options: living().map(function (o) { return { html: '<b>' + esc(tname(o)) + '</b><small>' + (o === hit ? 'the team that destroyed you · ' : '') + money(totalHp(o)) + ' HP left</small>', fn: function () {
        S.joined[id] = o; closeChoice(); save();
        banner({ art: ART.alliance(), title: 'NEW RECRUITS!', sub: tname(id) + ' joins ' + tname(o) + ' and shares its points.', mood: 'magic', wait: 1600 });
        afterBanners(done);
      } }; }) });
  }
  /** Two bases left: every alliance ends. */
  function dissolveAlliances() {
    var l = living();
    if (l.length !== 2 || allyOf(l[0]) !== l[1]) return;
    T(l[0]).ally = null; T(l[1]).ally = null;
    banner({ art: ART.alliance(), title: 'ALLIANCE BROKEN!', sub: 'Only two bases are left: ' + tname(l[0]) + ' and ' + tname(l[1]) + ' fight alone!', mood: 'bad', wait: 1800 });
  }
  /** The size of the biggest alliance the winner beat (they were allied and both lost), or 0. For the grading bonus (Henry). */
  function allianceBeaten(winner) {
    var parent = {};
    function find(x) { if (!parent[x]) parent[x] = x; while (parent[x] !== x) x = parent[x]; return x; }
    (S.allyLog || []).forEach(function (p) { parent[find(p[0])] = find(p[1]); });
    var groups = {};
    Object.keys(parent).forEach(function (x) { var r = find(x); (groups[r] = groups[r] || []).push(x); });
    var best = 0;
    Object.keys(groups).forEach(function (r) { if (groups[r].indexOf(winner) < 0 && groups[r].length > best) best = groups[r].length; });
    return best >= 2 ? best : 0;
  }
  function finish(winner, title, sub) {
    var n = allianceBeaten(winner);
    S.bonusNote = n ? tname(winner) + ' beat an alliance of ' + n + ' teams: bonus points in the grading!' : '';
    S.over = true; S.phase = 'over'; S.cur = 0; S.queue = [];
    save();
    banner({ art: ART.trophy(), title: title, sub: sub + (S.bonusNote ? ' ' + S.bonusNote : ''), mood: 'good', sound: 'fanfare', wait: S.bonusNote ? 3600 : 2600 });
    afterBanners(render);
  }
  /** Over when one base is left. */
  function checkEnd() {
    var l = living();
    if (l.length > 1) return false;
    if (!l.length) { S.over = true; S.phase = 'over'; S.cur = 0; S.queue = []; save(); banner({ art: ART.trophy(), title: 'GAME OVER', sub: 'No base is left.', mood: 'bad' }); afterBanners(render); return true; }
    finish(l[0], tname(l[0]) + ' WINS!', 'The last base standing!');
    return true;
  }
  /** The planned rounds are over: the strongest base (most HP) wins. */
  function timesUp() {
    S.byHp = true;
    var r = ranking(), winner = r[0] && r[0].id;
    if (!winner) { checkEnd(); return; }
    var hpOf = function (x) { return totalHp(x.id); }, alive2 = r.filter(function (x) { return alive(x.id); });
    var nobody = alive2.length > 1 && alive2.every(function (x) { return hpOf(x) === hpOf(alive2[0]); }); // nobody landed a hit that lasted
    var sharedTop = alive2.filter(function (x) { return x.rank === 1; });
    var sub = tname(winner) + ' has the strongest base and wins!';
    if (sharedTop.length > 1) sub = sharedTop.map(function (x) { return tname(x.id); }).join(' and ') + ' are tied for first and share the points!';
    else if (alive2[1] && hpOf(alive2[0]) === hpOf(alive2[1])) sub = tname(winner) + ' wins the tie: the same health, but the most gold and weapons left.';
    if (nobody) sub = 'Nobody won a fight! ' + sub;
    S.tieNote = nobody || sharedTop.length > 1 ? sub : '';
    finish(winner, "TIME'S UP!", sub);
  }

  // ---------- ranking and points ----------
  function ranking() {
    var l = living();
    // the strongest base first; the same health: the most gold left, then the most weapons left; still equal = a shared place
    var key = function (id) { return [totalHp(id), T(id).gold, T(id).bombs.length]; };
    var cmp = function (a, b) { var x = key(a), y = key(b); for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return y[i] - x[i]; return 0; };
    var survivors = l.slice().sort(cmp);
    var gone = S.elim.slice().reverse();
    var out = [], place = 1;
    survivors.forEach(function (id, i) { out.push({ id: id, rank: i > 0 && cmp(survivors[i - 1], id) === 0 ? out[i - 1].rank : i + 1 }); });
    place = survivors.length + 1;
    gone.forEach(function (id) { out.push({ id: id, rank: place++ }); });
    return out;
  }
  function finalPts(id) {
    if (S.joined && S.joined[id] && S.joined[id] !== id) return finalPts(S.joined[id]); // an eliminated team shares the points of the team it joined
    var all = ranking(), r = all.filter(function (x) { return x.id === id; })[0];
    if (!r) return 0;
    var same = all.filter(function (x) { return x.rank === r.rank; }).length, sum = 0; // a shared place shares the points of the places it covers
    for (var p = r.rank; p < r.rank + same; p++) sum += PLACE_PTS[Math.min(PLACE_PTS.length, p) - 1] || 0;
    return Math.floor(sum / same);
  }

  // ---------- the board ----------
  function render() {
    if (!S) return;
    var id = curId(), phase = S.phase;
    var rl = 'R' + S.round + '/' + (S.maxRounds || DEFAULT_ROUNDS);
    var label = phase === 'over' ? (S.bonusNote ? '🏆 ' + S.bonusNote : S.tieNote ? '🏆 ' + S.tieNote : 'Game over') : phase === 'turn' ? rl + ' · ' + tname(id) + "'s question" : phase === 'shop' ? rl + ' · Store · ' + tname(id) : phase === 'repair' ? rl + ' · Repairs · ' + tname(id) : rl + ' · Fire · ' + tname(id);
    $('turn').textContent = id || phase === 'over' ? label : '';
    $('turn').style.color = id ? color(id) : '';
    var act = $('act');
    act.hidden = phase === 'fire' || (isSmash() && !!S.aim) || (!id && phase !== 'over');
    act.textContent = phase === 'over' ? '🏆 Podium ▶' : phase === 'shop' ? 'Open the store ▶' : phase === 'repair' ? 'Repair ▶' : 'Question ▶';
    $('board').innerHTML = players.map(function (t) { return baseHtml(t); }).join('');
    renderTray();
    document.body.classList.toggle('aiming', !!S.aim);
  }
  function baseHtml(t) {
    var id = t.id, d = T(id), cur = curId() === id && S.phase !== 'over';
    var ally = allyOf(id);
    var aim = !!S.aim && curId() && alive(id) && id !== curId() && ally !== curId() && allyOf(curId()) !== id; // an enemy base the bomb can be aimed at
    var bombs = IORDER.map(function (key) {
      var n = d.bombs.filter(function (b) { return b.k === key; }).length;
      return n ? '<i class="bm" title="' + ITEMS[key].name + '">' + ART.weapon(key) + '<b>' + n + '</b></i>' : '';
    }).join('');
    var rows = KEYS.map(function (k) {
      var hp = d.hp[k], dead = hp <= 0, pct = Math.max(0, hp) / MAXHP[k] * 100;
      var ico = k === 'hq' ? ART.hq(color(id)) : k === 'depot' ? ART.depot() : ART.tower();
      return '<button class="bld' + (dead ? ' dead' : '') + '' + '" data-t="' + esc(id) + '" data-k="' + k + '"' + ' tabindex="-1"' +
        ' aria-label="' + esc(t.name) + ' ' + BNAME[k] + ', ' + Math.max(0, hp) + ' HP"><span class="ico">' + (dead ? ART.ruins() : ico) + '</span>' +
        '<span class="hp"><i class="' + (pct < 34 ? 'low' : pct < 67 ? 'mid' : '') + '" style="width:' + pct + '%"></i></span><span class="num">' + kfmt(hp) + '</span></button>';
    }).join('');
    return '<section class="base' + (cur ? ' cur' : '') + (d.alive ? '' : ' out') + (aim ? ' target' : '') + '" data-t="' + esc(id) + '" style="--c:' + color(id) + '">' +
      '<div class="b-head">' + Kru.badge(t, color(id)) + (isSmash() ? (d.streak > 0 ? '<span class="gold" title="Right answers in a row (3 unlocks the Sarmat)">🔥' + d.streak + '</span>' : '') : '<span class="gold">' + coinHtml() + kfmt(d.gold) + '</span>' + (d.kits ? '<span class="kits" title="Repair kits">🧰' + d.kits + '</span>' : '')) + (ally ? '<span class="ally" title="Allied with ' + esc(tname(ally)) + '">🤝</span>' : '') + '</div>' +
      (S.joined && S.joined[id] ? '<div class="joined">joined ' + Kru.badge(team(S.joined[id]), color(S.joined[id])) + '</div>' : '') +
      (isSmash() ? '' : '<div class="b-bombs">' + (bombs || '<span class="none">no bombs</span>') + '</div>') + rows + '</section>';
  }
  function coinHtml() { return '<span class="coin">' + ART.coin() + '</span>'; }
  // tap the team you want to hit; then a bigger menu shows its buildings
  $('board').addEventListener('click', function (e) {
    var b = e.target.closest('.base.target');
    if (!b || !S.aim) return;
    unlockAudio();
    openTarget(b.dataset.t);
  });
  var DESC = {
    hq: 'The command HQ. If it falls the team is out, unless it uses a repair kit or sacrifices a building.',
    depot: 'Supplies and repairs: heals every building each round. Without it: no healing, question gold halved.',
    t1: 'Shoots weapons down and gives all buildings 5% resistance.',
    t2: 'Shoots weapons down and gives all buildings 5% resistance.',
  };
  var DESC_LM2 = DESC;
  var DESC_SMASH = {
    hq: 'The command HQ. If it falls the team is out, unless it sacrifices a building.',
    depot: 'Heals every damaged building 250 HP at the end of each round.',
    t1: 'ARMOR: each standing tower blocks 15% of all damage to this base.',
    t2: 'ARMOR: each standing tower blocks 15% of all damage to this base.',
  };
  function closeAim() { $('aimBack').hidden = true; }
  function openTarget(tid) {
    var a = S.aim, it = ITEMS[a.k], t = T(tid), from = curId();
    $('aim').style.setProperty('--c', color(tid)); $('aim').dataset.t = tid;
    $('aimWho').innerHTML = Kru.badge(team(tid), color(tid));
    $('aimTitle').textContent = tname(tid) + ' · ' + it.name + (it.mode === 'dual' ? ' (target ' + (a.picks.length + 1) + ' of 2)' : '');
    var n = towers(tid), chance = shootChance(it, tid);
    $('aimNote').textContent = 'Towers standing: ' + n + (n ? ' · they shoot this ' + it.name + ' down ' + (Math.round(chance * 1000) / 10) + '% of the time' + (n < 2 ? ' (halved: a tower is gone)' : '') : ' · nothing can shoot it down') + ' · resistance ' + Math.round(Math.min(RES_CAP, RES * n) * 100) + '%' + (depotOk(tid) ? '' : ' · their Depot is down: no healing');
    if (isSmash()) {
      var armor = Math.min(RES_CAP, RES * n), hitDmg = Math.round(it.dmg * (S.boost || 1) * (1 - armor));
      $('aimNote').textContent = 'Towers standing: ' + n + ' · armor blocks ' + Math.round(armor * 100) + '% of the damage' + (it.mode === 'jam' ? '' : ' · hits for ' + money(hitDmg) + (it.mode === 'scatter' || it.mode === 'all' ? ' each building' : '')) + (depotOk(tid) ? '' : ' · their Depot is down: no healing');
    }
    var asText = { one: 'Tap the building to hit', scatter: 'Tap the building to SPARE: all the others are hit', dual: 'Tap the building to hit', all: 'Every building of this team is hit', jam: 'This team skips its next turn' }[it.mode];
    var cards = KEYS.map(function (k) {
      var hp = t.hp[k], dead = hp <= 0, taken = (a.picks || []).some(function (p) { return p.t === tid && p.b === k; });
      var ico = k === 'hq' ? ART.hq(color(tid)) : k === 'depot' ? ART.depot() : ART.tower();
      var pct = Math.max(0, hp) / MAXHP[k] * 100;
      var hit = it.mode === 'all' || it.mode === 'jam' ? false : true;
      return '<button class="acard' + (dead ? ' dead' : '') + '" data-k="' + k + '"' + (dead || taken || !hit ? ' disabled' : '') + '><span class="si-ico">' + (dead ? ART.ruins() : ico) + '</span>' +
        '<b>' + BNAME[k] + (k.charAt(0) === 't' ? ' ' + k.charAt(1) : '') + '</b>' +
        '<span class="hp"><i style="width:' + pct + '%"></i></span><span class="ahp">' + (dead ? 'destroyed' : money(hp) + ' / ' + money(MAXHP[k]) + ' HP') + '</span>' +
        '<small>' + DESC[k] + '</small></button>';
    }).join('');
    var whole = it.mode === 'all' || it.mode === 'jam';
    // a whole-base weapon (TOS-2M, Sarmat, Jammer): the Fire button comes FIRST so it is never pushed off the small screen
    $('aimGrid').className = 'aim-grid' + (whole ? ' compact' : '');
    $('aimGrid').innerHTML = (whole ? '<button class="btn gold aim-go" data-go="1">' + (it.mode === 'jam' ? '📡 Jam ' + esc(tname(tid)) : '💥 Fire at the whole base') + '</button>' : '') + cards + (whole ? '' : '<div class="aim-hint">' + asText + '</div>');
    $('aimBack').hidden = false;
  }
  function pickTarget(tid, key) {
    var a = S.aim, it = ITEMS[a.k];
    closeAim();
    a.picks.push({ t: tid, b: key });
    if (a.picks.length < (it.mode === 'dual' ? 2 : 1)) { render(); return; } // the second target of a Dual Headed Missile
    var bomb = T(curId()).bombs.filter(function (x) { return x.k === a.k; })[0];
    launch(curId(), bomb, a.picks);
  }
  $('aimGrid').addEventListener('click', function (e) {
    if (S.aim == null) return;
    var tid = $('aim').dataset.t;
    var b = e.target.closest('[data-k],[data-go]');
    if (!b || b.disabled) return;
    unlockAudio();
    pickTarget(tid, b.dataset.go ? 'hq' : b.dataset.k);
  });
  $('aimCancel').addEventListener('click', closeAim);

  // ---------- fire tray ----------
  var AIMTEXT = { one: 'tap the team to hit', scatter: 'tap the team to hit', dual: 'tap the team to hit', all: 'tap the team to hit', jam: 'tap the team to jam' };
  function renderTray() {
    var id = curId(), tray = $('tray');
    if (isSmash() && S.aim && id && alive(id) && !fxOn) {
      tray.hidden = false;
      tray.innerHTML = '<span class="tray-lab" style="color:' + color(id) + '">' + esc(tname(id)) + ': ' + ITEMS[S.aim.k].name + ' ready: ' + AIMTEXT[ITEMS[S.aim.k].mode] + (ITEMS[S.aim.k].mode === 'dual' ? ' (' + (S.aim.picks.length + 1) + ' of 2)' : '') + '</span><button class="btn" id="smChange">↩ Pick another</button>';
      return;
    }
    if (S.phase !== 'fire' || !id || !alive(id) || fxOn) { tray.hidden = true; return; }
    var d = T(id), counts = {};
    d.bombs.forEach(function (b) { counts[b.k] = (counts[b.k] || 0) + 1; });
    tray.hidden = false;
    var a = S.aim, lab = a ? ITEMS[a.k].name + ': ' + AIMTEXT[ITEMS[a.k].mode] + (ITEMS[a.k].mode === 'dual' ? ' (' + (a.picks.length + 1) + ' of 2)' : '') : 'tap a bomb';
    tray.innerHTML = '<span class="tray-lab" style="color:' + color(id) + '">' + esc(tname(id)) + ': ' + lab + '</span>' +
      IORDER.filter(function (key) { return counts[key]; }).map(function (key) {
        return '<button class="btn bmb' + (a && a.k === key ? ' on' : '') + '" data-k="' + key + '"><span class="bi">' + ART.weapon(key) + '</span>' + ITEMS[key].name + ' ×' + counts[key] + '</button>';
      }).join('') + '<button class="btn" id="fireDone">Done ▶</button>';
  }
  $('tray').addEventListener('click', function (e) {
    unlockAudio();
    if (e.target.closest('#smChange') && S.pending) { // SMASH: take the weapon back and pick again (the question stays answered)
      var p = S.pending; T(p.id).bombs = []; S.aim = null; S.boost = 0; save(); render(); smashReward(p.id, p.tier, p.rk); return;
    }
    var b = e.target.closest('[data-k]');
    if (b) {
      if (b.dataset.k === 'jammer' && S.jamUsed && S.jamUsed[curId()] === S.round) { toast(tname(curId()) + ' already used a Signal Jammer this round.'); return; }
      S.aim = S.aim && S.aim.k === b.dataset.k ? null : { k: b.dataset.k, picks: [] }; render(); return;
    }
    if (e.target.closest('#fireDone')) { snap(); advance(); }
  });

  // ---------- one panel for every choice ----------
  var choiceOpts = null;
  function choose(o) {
    choiceOpts = o;
    $('choiceArt').innerHTML = o.art || '';
    $('choiceTitle').textContent = o.title;
    $('choices').innerHTML = o.options.map(function (x, i) { return '<button class="btn ch" data-i="' + i + '"' + (x.off ? ' disabled' : '') + '>' + x.html + '</button>'; }).join('');
    $('choiceFoot').innerHTML = (o.foot || []).map(function (f, i) { return '<button class="btn ' + (f.cls || '') + '" data-f="' + i + '">' + f.label + '</button>'; }).join('');
    $('choiceBack').hidden = false;
  }
  function closeChoice() { $('choiceBack').hidden = true; choiceOpts = null; }
  $('choices').addEventListener('click', function (e) {
    var b = e.target.closest('[data-i]');
    if (!b || b.disabled || !choiceOpts) return;
    unlockAudio();
    choiceOpts.options[+b.dataset.i].fn();
  });
  $('choiceFoot').addEventListener('click', function (e) {
    var b = e.target.closest('[data-f]');
    if (b && choiceOpts) choiceOpts.foot[+b.dataset.f].fn();
  });
  function pickBuilding(id, title, fn) {
    var list = KEYS.filter(function (k) { return T(id).hp[k] < MAXHP[k]; }); // damaged OR destroyed (a kit rebuilds it)
    if (!list.length) { toast(tname(id) + ' has nothing to repair.'); return false; }
    choose({ art: ART.repair(), title: title, options: list.map(function (k) { return { html: '<b>' + BNAME[k] + (k.charAt(0) === 't' ? ' ' + k.charAt(1) : '') + '</b><small>' + (T(id).hp[k] <= 0 ? 'destroyed · rebuild it' : money(T(id).hp[k]) + ' / ' + money(MAXHP[k]) + ' HP') + '</small>', fn: function () { closeChoice(); fn(k); } }; }),
      foot: [{ label: 'Cancel', cls: 'ghost', fn: function () { closeChoice(); reopen(); } }] });
    return true;
  }
  var reopen = function () {};

  // ---------- the store: Haishi Trade Company (one screen in the buying team's color; inventory and the cart) ----------
  var cart = null, cartFor = '';
  function closeShop() { $('shopBack').hidden = true; }
  /** buy a weapon; a team hit by the TOS-2M has a 40% chance that its next weapon explodes in its own Depot */
  function buyBomb(id, key) {
    var d = T(id), it = ITEMS[key], price = priceOf(id, key);
    snap();
    d.gold -= price;
    cart.spent += price; cart.items[key] = (cart.items[key] || 0) + 1;
    if (d.curse) {
      d.curse = false;
      if (Math.random() < CURSE_CHANCE) {
        closeShop();
        cart.items[key]--;
        setHp(id, 'depot', d.hp.depot - it.dmg);
        KEYS.forEach(function (b) { if (b !== 'depot' && d.hp[b] > 0) setHp(id, b, d.hp[b] - it.dmg / 2); });
        save();
        banner({ art: ART.boom(), title: 'CURSED WEAPON!', sub: tname(id) + "'s new " + it.name + ' exploded in the Depot!', mood: 'boom', wait: 1800 });
        afterBanners(function () { processFalls([id], function () { if (S.over) return; if (alive(id)) openShop(); else advance(); }); });
        return;
      }
    }
    d.bombs.push({ k: key });
    save(); tone([660, 880], 0.08); renderShop(id); render();
  }
  /** a repair kit goes into the inventory (use it any time in the store, or when the HQ falls) */
  function buyKit(id) {
    var d = T(id), kp = kitPrice();
    snap(); d.gold -= kp; d.kits++;
    cart.spent += kp; cart.items.kit = (cart.items.kit || 0) + 1;
    save(); tone([523, 659, 784], 0.08); renderShop(id); render();
  }
  /** use a kit from the inventory on any building: it repairs a damaged one or rebuilds a destroyed one */
  function useKit(id) {
    var d = T(id);
    if (d.kits < 1) return;
    closeShop();
    var ok = pickBuilding(id, 'Use a repair kit on which building?', function (k) {
      snap(); d.kits--; d.hp[k] = Math.min(MAXHP[k], d.hp[k] + KIT_HP);
      save(); tone([523, 659, 784], 0.08); openShop(); render();
    });
    if (!ok) openShop();
  }
  // ---------- end of round: repair kits can be used as many times as the team has them ----------
  function canRepair(id) { var d = T(id); return d.kits > 0 && KEYS.some(function (k) { return d.hp[k] < MAXHP[k]; }); }
  function openRepair() {
    var id = curId();
    if (S.phase !== 'repair' || !id || fxOn) return;
    if (!canRepair(id)) { closeChoice(); advance(); return; }
    var d = T(id);
    reopen = openRepair;
    var list = KEYS.filter(function (k) { return d.hp[k] < MAXHP[k]; });
    choose({ art: ART.repair(), title: tname(id) + ': repairs (' + d.kits + ' kit' + (d.kits === 1 ? '' : 's') + ' left)',
      options: list.map(function (k) {
        return { html: '<b>' + BNAME[k] + (k.charAt(0) === 't' ? ' ' + k.charAt(1) : '') + '</b><small>' + (d.hp[k] <= 0 ? 'destroyed · rebuild it' : money(d.hp[k]) + ' / ' + money(MAXHP[k]) + ' HP') + ' · +' + money(KIT_HP) + '</small>',
          fn: function () { closeChoice(); snap(); d.kits--; d.hp[k] = Math.min(MAXHP[k], d.hp[k] + KIT_HP); save(); tone([523, 659, 784], 0.08); render(); openRepair(); } };
      }),
      foot: [{ label: 'Done', cls: 'gold', fn: function () { closeChoice(); snap(); advance(); } }] });
  }
  function openShop() {
    var id = curId();
    if (S.phase !== 'shop' || !id) return;
    reopen = openShop;
    if (cartFor !== id + ':' + S.round) { cart = { spent: 0, items: {} }; cartFor = id + ':' + S.round; }
    renderShop(id);
  }
  function renderShop(id) {
    var d = T(id), ally = allyOf(id), kp = kitPrice();
    $('shop').style.setProperty('--c', color(id));
    // the buying team and its gold sit together, under the company name (the corner buttons never cover them)
    $('shopBuyer').innerHTML = Kru.badge(team(id), color(id)) + '<b class="buyer-name">' + esc(tname(id)) + ' is buying</b>' +
      '<span class="shop-gold">' + coinHtml() + ' ' + money(d.gold) + '</span>' +
      '<span class="buyer-note">' + (ally ? '🤝 allied with ' + esc(tname(ally)) + ' ' : '') + (depotOk(id) ? '' : '⚠ no Depot: [Q]+ cost 1.6x ') + (d.curse ? '☠ cursed ' : '') + '</span>';
    var cards = [{ key: 'kit', name: 'Repair kit', price: kp, cls: '', icon: ART.repair(), info: '+' + money(KIT_HP) + ' HP · keep it' }].concat(IORDER.map(function (key) {
      var it = ITEMS[key];
      return { key: key, name: it.name, price: priceOf(id, key), cls: it.cls, icon: ART.weapon(key), info: it.mode === 'jam' ? 'skip a turn' : money(it.dmg) + ' · ' + { one: '1 target', scatter: 'all but 1', dual: '2 targets', all: 'whole base' }[it.mode] };
    }));
    $('shopGrid').innerHTML = cards.map(function (c) {
      return '<button class="sitem" data-i="' + c.key + '"' + (d.gold < c.price ? ' disabled' : '') + '><span class="si-ico">' + c.icon + '</span><b>' + c.name + '</b>' +
        '<span class="si-price">' + coinHtml() + ' ' + money(c.price) + '</span><small>' + (c.cls ? '[' + c.cls + '] ' : '') + c.info + '</small></button>';
    }).join('');
    // the team's inventory: weapons and repair kits
    var counts = {};
    d.bombs.forEach(function (b) { counts[b.k] = (counts[b.k] || 0) + 1; });
    var inv = IORDER.filter(function (k) { return counts[k]; }).map(function (k) {
      return '<span class="chip-c" title="' + ITEMS[k].name + '"><i>' + ART.weapon(k) + '</i>' + ITEMS[k].name + ' ×' + counts[k] + '</span>';
    }).join('') + (d.kits ? '<span class="chip-c kit"><i>' + ART.repair() + '</i>Repair kit ×' + d.kits + '</span>' : '');
    $('shopInv').innerHTML = '<span class="cart-lab">📦 Inventory:</span>' + (inv || '<span class="cart-empty">nothing yet</span>') +
      (d.kits ? '<button class="btn use-kit" data-use="kit">🧰 Use a kit</button>' : '');
    var names = { kit: 'Repair kit' };
    var chips = Object.keys(cart.items).filter(function (k2) { return cart.items[k2] > 0; }).map(function (k2) {
      return '<span class="chip-c"><i>' + (k2 === 'kit' ? ART.repair() : ART.weapon(k2)) + '</i>' + (names[k2] || ITEMS[k2].name) + ' ×' + cart.items[k2] + '</span>';
    }).join('');
    $('shopCart').innerHTML = '<span class="cart-lab">🛒 Bought now' + (cart.spent ? ' · ' + money(cart.spent) + ' spent' : '') + ':</span>' + (chips || '<span class="cart-empty">tap an item to buy it</span>');
    $('shopBack').hidden = false;
  }
  $('shopGrid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-i]');
    var id = curId();
    if (!b || b.disabled || !id || S.phase !== 'shop') return;
    unlockAudio();
    if (b.dataset.i === 'kit') buyKit(id); else buyBomb(id, b.dataset.i);
  });
  $('shopInv').addEventListener('click', function (e) {
    if (e.target.closest('[data-use]') && curId() && S.phase === 'shop') { unlockAudio(); useKit(curId()); }
  });
  $('shopDone').addEventListener('click', function () { closeShop(); snap(); advance(); });

  // ---------- teacher tools: give gold, kits, weapons or repairs at any time (Henry's admin mode) ----------
  var toolTeam = null;
  function renderTools() {
    var ids = living();
    if (!ids.length) { $('toolsBody').innerHTML = '<p>No team is left.</p>'; return; }
    if (!toolTeam || ids.indexOf(toolTeam) < 0) toolTeam = ids[0];
    var d = T(toolTeam);
    $('tools').style.setProperty('--c', color(toolTeam));
    var body = '<div class="tt-teams">' + ids.map(function (i) {
      return '<button class="btn tt-team' + (i === toolTeam ? ' on' : '') + '" data-tt="' + esc(i) + '" style="--c:' + color(i) + '">' + Kru.badge(team(i), color(i)) + '</button>';
    }).join('') + '</div>' +
      '<div class="tt-row"><b>🪙 Gold: ' + money(d.gold) + '</b>' + [-5000, -1000, 1000, 5000, 10000, 25000].map(function (v) { return '<button class="btn" data-tg="' + v + '">' + (v > 0 ? '+' : '−') + money(Math.abs(v)) + '</button>'; }).join('') + '</div>' +
      '<div class="tt-row"><b>🏦 HTC Funding, every team:</b>' + [1000, 5000, 10000, 25000].map(function (v) { return '<button class="btn" data-ta="' + v + '">+' + money(v) + '</button>'; }).join('') + '</div>' +
      '<div class="tt-row"><b>⚙ This team:</b><button class="btn" data-tx="fix">Fully repair all</button><button class="btn" data-tx="skip">' + (S.skip[toolTeam] ? 'Cancel skip' : 'Skip its next turn') + '</button><button class="btn" data-tx="round">Add a round (' + (S.maxRounds || DEFAULT_ROUNDS) + ')</button></div>' +
      '<div class="tt-row"><b>🧰 Repair kits: ' + d.kits + '</b><button class="btn" data-tk="-1">−1</button><button class="btn" data-tk="1">+1</button></div>' +
      '<div class="tt-row"><b>🚀 Give a weapon:</b>' + IORDER.map(function (k) { return '<button class="btn tt-w" data-ti="' + k + '" title="' + ITEMS[k].name + '"><span class="bi">' + ART.weapon(k) + '</span>' + ITEMS[k].name + '</button>'; }).join('') + '</div>' +
      '<div class="tt-row"><b>🏗 Buildings:</b>' + KEYS.map(function (k) {
        return '<span class="tt-b"><i>' + BNAME[k] + (k.charAt(0) === 't' ? ' ' + k.charAt(1) : '') + ': ' + money(d.hp[k]) + '/' + money(MAXHP[k]) + '</i>' +
          '<button class="btn" data-tb="' + k + ':-1000">−1k</button><button class="btn" data-tb="' + k + ':1000">+1k</button><button class="btn" data-tb="' + k + ':full">full</button></span>';
      }).join('') + '</div>';
    if (isSmash()) body = body.replace(/<div class="tt-row"><b>(🪙 Gold|🏦 HTC|🧰 Repair kits|🚀 Give a weapon)[\s\S]*?<\/div>/g, ''); // no gold or kits in SMASH
    $('toolsBody').innerHTML = body;
  }
  function openTools() { renderTools(); $('toolsBack').hidden = false; }
  $('toolsBody').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !toolTeam) return;
    var d = T(toolTeam);
    if (b.dataset.tt) { toolTeam = b.dataset.tt; renderTools(); return; }
    snap();
    if (b.dataset.tg) d.gold = Math.max(0, d.gold + Number(b.dataset.tg));
    else if (b.dataset.ta) living().forEach(function (i) { T(i).gold += Number(b.dataset.ta); });
    else if (b.dataset.tx === 'fix') KEYS.forEach(function (k) { d.hp[k] = MAXHP[k]; });
    else if (b.dataset.tx === 'skip') S.skip[toolTeam] = !S.skip[toolTeam];
    else if (b.dataset.tx === 'round') S.maxRounds = Math.min(15, (S.maxRounds || DEFAULT_ROUNDS) + 1);
    else if (b.dataset.tk) d.kits = Math.max(0, d.kits + Number(b.dataset.tk));
    else if (b.dataset.ti) d.bombs.push({ k: b.dataset.ti });
    else if (b.dataset.tb) {
      var p = b.dataset.tb.split(':'), k = p[0];
      d.hp[k] = p[1] === 'full' ? MAXHP[k] : Math.max(0, Math.min(MAXHP[k], d.hp[k] + Number(p[1])));
    }
    save(); render(); renderTools();
    if (!$('shopBack').hidden && curId() === toolTeam) renderShop(toolTeam);
  });
  $('toolsClose').addEventListener('click', function () { $('toolsBack').hidden = true; });
  $('toolsBtn').addEventListener('click', function () { closeMenu(); openTools(); });

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
  function buildPoolKeep() {
    var d = deckByKey(S.deck);
    POOL = { easy: [], regular: [], hard: [], impossible: [] };
    if (d) d.qs.forEach(function (q) { POOL[tierOf(q)].push(q); });
    var ok = S.order && S.qi && ORDER.every(function (t) { return S.order[t] && S.order[t].length === POOL[t].length; });
    if (!ok) buildPool();
  }
  /** The next question. */
  function pickQuestion(id, forceTier) {
    var tiers = ORDER;
    var avail = tiers.filter(function (t) { return POOL[t].length; });
    if (!avail.length) avail = ORDER.filter(function (t) { return POOL[t].length; });
    if (!avail.length) return null;
    if (forceTier && !POOL[forceTier].length) return null;
    var tier = forceTier || avail[weighted(avail.map(function (t) { return TIERS[t].share; }))];
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
    $('go').className = 'btn pausebtn ' + (running ? 'is-running' : 'is-paused');
    $('go').innerHTML = running ? PAUSE_ICON : PLAY_ICON;
    $('go').setAttribute('aria-label', running ? 'Pause the timer' : 'Start the timer');
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
    var id = curId(), tier = TIERS[tierOf(Q)];
    $('qWho').textContent = tname(id);
    $('qTier').textContent = tier.label;
    $('qTier').className = 'tier ' + tierOf(Q);
    $('qTopic').textContent = Q.set ? '· ' + Q.set : '';
    $('qBody').innerHTML = KruQuiz.html(Q, shown);
    $('reveal').hidden = shown;
    $('wrong').hidden = $('right').hidden = !shown;
    renderPowers();
    KruQuiz.fit($('stage'));
  }
  function used(id, p) { return !!T(id).powers[p]; }
  function use(id, p) { T(id).powers[p] = true; save(); }
  function renderPowers() {
    var id = curId();
    $('powers').innerHTML = '<span class="pw-lab">Power-ups:</span>' + POWERS.map(function (p) {
      var on = p.id === 'risk' && risk;
      // no stacking: Question Change and Free Answer cannot be combined (Risk It still works with them)
      var off = used(id, p.id) || shown || (p.id === 'free' && (risk || Q._changed)) || (p.id === 'change' && Q._changed);
      return '<button class="btn pw' + (on ? ' on' : '') + (used(id, p.id) ? ' used' : '') + '" data-pw="' + p.id + '"' + (off && !on ? ' disabled' : '') +
        ' aria-pressed="' + on + '">' + (on ? '🎲 RISK IT: ON' : p.label) + '</button>';
    }).join('');
  }
  $('powers').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pw]');
    if (!b || b.disabled) return;
    unlockAudio();
    var id = curId(), p = b.dataset.pw;
    if (p === 'change') {
      choose({ art: ART.risk(), title: 'Question Change: swap it for a harder one (' + (isSmash() ? 'bigger weapons!' : 'more gold!') + ')',
        options: ['hard', 'impossible'].map(function (t) { return { html: '<b>' + TIERS[t].label + ' question</b><small>' + (isSmash() ? 'a bigger weapon if you win it' : money(GOLD[t]) + ' gold if you win it') + '</small>', fn: function () { changeQuestion(t); } }; }),
        foot: [{ label: 'Cancel', cls: 'ghost', fn: closeChoice }] });
    } else if (p === 'free') { use(id, 'free'); toast('🎟 ' + tname(id) + ' used Free Answer!'); rightAnswer(); }
    else if (p === 'risk') { risk = !risk; tone(risk ? [392, 523, 659] : [440], 0.08); renderPowers(); }
  });
  /** Question Change: the question is replaced by a Hard or an Impossible one (a bigger reward). */
  function changeQuestion(tier) {
    closeChoice();
    var id = curId(), q = pickQuestion(id, tier);
    if (!q) { toast('There are no ' + TIERS[tier].label.toLowerCase() + ' questions in this deck.'); return; }
    use(id, 'change');
    Q = Object.assign({}, q, { _changed: true }); shown = false;
    stopTimer(); total = left = S.secs; renderClock(); renderQuestion(); startTimer();
    tone([523, 659, 784], 0.08);
    toast('🔁 Question changed to ' + TIERS[tier].label + '!');
  }
  function ask() {
    var id = curId();
    if (!id || S.phase !== 'turn' || fxOn || !$('choiceBack').hidden) return;
    if (!S.deck) { openDecks(); return; }
    var q = pickQuestion(id);
    if (!q) { toast('This deck has no questions. Choose another deck.'); openDecks(); return; }
    snap(); unlockAudio(); S.started = true;
    Q = Object.assign({}, q); shown = false; risk = false;
    save();
    stopTimer(); total = left = S.secs; renderClock();
    $('qBack').hidden = false;
    renderQuestion();
    tone([660, 880], 0.12);
    startTimer();
  }
  function closeQuestion() { stopTimer(); $('qBack').hidden = true; }

  // ---------- rewards ----------
  function rollItem(tier, rk) {
    var i = weighted(ODDS[tier]);
    return IORDER[rk ? Math.min(IORDER.indexOf('avangard'), i + 1) : i]; // never the Sarmat from a reward
  }
  function oddsText(tier, rk) {
    var by = { LQ: 0, Q: 0, HQ: 0 }, sum = 0;
    ODDS[tier].forEach(function (p, i) { var j = rk ? Math.min(IORDER.indexOf('avangard'), i + 1) : i; by[ITEMS[IORDER[j]].cls] += p; sum += p; });
    return ['LQ', 'Q', 'HQ'].filter(function (c) { return by[c]; }).map(function (c) { return '[' + c + '] ' + Math.round(by[c] / sum * 100) + '%'; }).join(' · ');
  }
  function rightAnswer() {
    var id = curId(), tier = tierOf(Q), rk = risk;
    risk = false;
    if (rk) use(id, 'risk');
    closeQuestion();
    banner({ art: ART.shield(), title: 'CORRECT!', sub: tname(id) + ' earns a reward!', mood: 'good', wait: 1200 });
    if (isSmash()) T(id).streak = (T(id).streak || 0) + 1;
    afterBanners(function () { if (isSmash()) smashReward(id, tier, rk); else rewardPanel(id, tier, rk); });
  }
  /** The reward after a right answer: a bomb, a repair or gold. */
  function rewardPanel(id, tier, rk) {
    var gold = Math.round(GOLD[tier] * goldBoost() * (rk ? RISK_GOLD : 1) * goldMult(id));
    reopen = function () { rewardPanel(id, tier, rk); };
    choose({ art: ART.weapon('missile'), title: tname(id) + ': choose your reward' + (rk ? ' (Risk It!)' : ''),
      options: [
        { html: '<b>💣 A bomb</b><small>random: ' + oddsText(tier, rk) + '</small>', fn: function () { closeChoice(); gotBomb(id, rollItem(tier, rk)); } },
        { html: '<b>🩹 Repair</b><small>+' + money(HEAL[tier]) + ' HP to one building</small>', fn: function () {
          pickBuilding(id, 'Repair which building?', function (b) {
            T(id).hp[b] = Math.min(MAXHP[b], T(id).hp[b] + HEAL[tier]); save();
            banner({ art: ART.repair(), title: 'REPAIRED!', sub: tname(id) + "'s " + BNAME[b] + ' is stronger.', mood: 'good', wait: 1200 });
            afterBanners(advance);
          }); } },
        { html: '<b>' + coinHtml() + ' Gold +' + money(gold) + '</b><small>spend it in the store</small>', fn: function () {
          closeChoice(); T(id).gold += gold; save();
          banner({ art: ART.coin(), title: '+' + money(gold) + ' GOLD!', sub: tname(id) + ' fills its treasury.', mood: 'good', wait: 1200 });
          afterBanners(advance); } },
      ] });
  }
  /** SMASH: a right answer = pick a weapon for this difficulty (or a repair), then tap the base to fire at. No gold, no store, no dice. */
  function smashReward(id, tier, rk) {
    var d = T(id), boost = rk ? SM_RISK : 1;
    S.pending = { id: id, tier: tier, rk: rk };
    reopen = function () { smashReward(id, tier, rk); };
    var keys = SM_OPTS[tier].filter(function (k) { return !(k === 'jammer' && S.jamUsed && S.jamUsed[id] === S.round); });
    var streakOn = (d.streak || 0) >= SM_STREAK;
    if (streakOn) keys.unshift('sarmat');
    var modeText = { one: '1 target', scatter: 'all but 1', dual: '2 targets', all: 'whole base' };
    var opts = keys.map(function (k) {
      var it = ITEMS[k];
      return { html: '<b>' + it.name + '</b><small>[' + it.cls + '] ' + (it.mode === 'jam' ? 'the target skips its next turn' : money(Math.round(it.dmg * boost)) + ' · ' + modeText[it.mode]) + '</small>', fn: function () { closeChoice(); smashArm(id, k, rk); } };
    });
    var heal = Math.round(SM_REPAIR[tier] * boost);
    opts.push({ html: '<b>🛠 Repair</b><small>+' + money(heal) + ' HP to one building</small>', off: !KEYS.some(function (b) { return d.hp[b] < MAXHP[b]; }), fn: function () {
      closeChoice();
      pickBuilding(id, 'Repair which building?', function (b) {
        d.hp[b] = Math.min(MAXHP[b], d.hp[b] + heal); save();
        banner({ art: ART.repair(), title: 'REPAIRED!', sub: tname(id) + "'s " + BNAME[b] + ' is stronger.', mood: 'good', wait: 1200 });
        afterBanners(advance);
      });
    } });
    choose({ art: ART.weapon(streakOn ? 'sarmat' : 'missile'), title: tname(id) + ': ' + (streakOn ? '🔥 ' + SM_STREAK + ' in a row! The RS-28 Sarmat is unlocked' : 'pick your reward') + (rk ? ' (Risk It: x' + SM_RISK + ')' : ''), options: opts });
  }
  function smashArm(id, key, rk) {
    var d = T(id);
    if (key === 'sarmat') d.streak = 0;
    d.bombs = [{ k: key }]; S.boost = rk ? SM_RISK : 0; S.aim = { k: key, picks: [] };
    save(); render(); tone([523, 659, 784], 0.08);
  }
  function gotBomb(id, key) {
    var ally = allyOf(id), it = ITEMS[key];
    banner({ art: ART.weapon(key), title: it.name.toUpperCase() + '!', sub: tname(id) + ' gets a ' + it.name + ' [' + it.cls + '].', mood: 'good', sound: 'fanfare', wait: 1300 });
    afterBanners(function () {
      if (!ally) { T(id).bombs.push({ k: key }); save(); advance(); return; }
      var weaker = IORDER[Math.max(0, IORDER.indexOf(key) - 1)];
      choose({ art: ART.alliance(), title: 'Allies: keep it or share it?',
        options: [
          { html: '<b>Keep it</b><small>Only ' + esc(tname(id)) + ' can fire the ' + it.name + '</small>', fn: function () { closeChoice(); T(id).bombs.push({ k: key }); save(); advance(); } },
          { html: '<b>Share it</b><small>a ' + ITEMS[weaker].name + ' for BOTH teams</small>', fn: function () {
            closeChoice(); T(id).bombs.push({ k: weaker }); T(ally).bombs.push({ k: weaker }); save(); advance(); } },
        ] });
    });
  }
  function missed() {
    unlockAudio();
    var id = curId(), rk = risk;
    risk = false;
    if (rk) use(id, 'risk');
    closeQuestion();
    if (isSmash()) T(id).streak = 0;
    banner({ art: incorrectArt(), title: 'INCORRECT', sub: encourage(), mood: 'bad', sound: 'bad' });
    if (rk) {
      var hit = [];
      KEYS.forEach(function (k) { if (k !== 'hq' && T(id).hp[k] > 0) { T(id).hp[k] = Math.max(0, T(id).hp[k] - MAXHP[k] * RISK_LOSS); hit.push(k); } });
      banner({ art: ART.boom(), title: 'RISK BACKFIRES!', sub: tname(id) + (isSmash() ? ': every building except the HQ loses ' + Math.round(RISK_LOSS * 100) + '% of its starting HP!' : ': every building except the HQ loses half of its starting HP!'), mood: 'boom', wait: 1800 });
    }
    save();
    afterBanners(advance);
  }
  function incorrectArt() {
    return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="60" cy="56" r="44" fill="#e63946" stroke="#8f1525" stroke-width="5"/><path d="M40 36l40 40M80 36L40 76" stroke="#fff" stroke-width="12" stroke-linecap="round"/></svg>';
  }
  var ENC = ['Good try, commander! Regroup and fire again!', "Don't give up, soldiers!", 'Even the best strategists miss sometimes!', 'Hold the line and try again!',
    'Every mistake makes the army wiser!', 'Eyes up, commander!', 'So close! Next turn!', 'The base is still standing!'];
  var lastEnc = -1;
  function encourage() { var i = Math.floor(Math.random() * ENC.length); if (i === lastEnc) i = (i + 1) % ENC.length; lastEnc = i; return ENC[i]; }

  $('act').addEventListener('click', function () {
    unlockAudio();
    if (S.phase === 'over') { KruEnd.show(); return; }
    if (S.phase === 'shop') { openShop(); return; }
    if (S.phase === 'repair') { openRepair(); return; }
    ask();
  });
  $('go').addEventListener('click', function () { if (running) { stopTimer(); renderClock(); } else startTimer(); });
  $('reveal').addEventListener('click', function () { unlockAudio(); stopTimer(); renderClock(); shown = true; tone([523, 659]); renderQuestion(); });
  $('right').addEventListener('click', rightAnswer);
  $('wrong').addEventListener('click', missed);

  // ---------- alliance (a power-up: skip your turn, the other team must skip too) ----------
  function canAlly() {
    var id = curId();
    return !isSmash() && S.phase === 'turn' && id && living().length > 2 && !used(id, 'ally') && !allyOf(id) && living().filter(function (o) { return o !== id && !allyOf(o); }).length > 0;
  }
  function openAlly() {
    if (!canAlly() || fxOn) return;
    var id = curId();
    var others = living().filter(function (o) { return o !== id && !allyOf(o) && !used(o, 'ally'); });
    reopen = function () {};
    choose({ art: ART.alliance(), title: tname(id) + ': ally with which team?',
      options: others.map(function (o) { return { html: '<b>' + esc(tname(o)) + '</b><small>must also skip its turn</small>', fn: function () { askPartner(id, o); } }; }),
      foot: [{ label: 'Cancel', cls: 'ghost', fn: closeChoice }] });
  }
  function askPartner(a, b) {
    choose({ art: ART.alliance(), title: tname(b) + ': ally with ' + tname(a) + '?',
      options: [
        { html: '<b>Yes: skip my turn and ally</b><small>shared towers and depots, bombs can be shared</small>', fn: function () {
          closeChoice(); snap(); S.t[a].ally = b; S.t[b].ally = a; use(a, 'ally'); use(b, 'ally'); S.skip[b] = true; (S.allyLog = S.allyLog || []).push([a, b]); save();
          banner({ art: ART.alliance(), title: 'ALLIANCE!', sub: tname(a) + ' and ' + tname(b) + ' join forces!', mood: 'magic', sound: 'fanfare' });
          afterBanners(advance); } },
        { html: '<b>No deal</b><small>' + esc(tname(a)) + "'s power-up is wasted</small>", fn: function () {
          closeChoice(); snap(); use(a, 'ally'); save();
          banner({ art: ART.alliance(), title: 'NO DEAL!', sub: tname(b) + ' said no. ' + tname(a) + ' skips this turn.', mood: 'bad', wait: 1500 });
          afterBanners(advance); } },
      ] });
  }

  // ---------- ⋯ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function renderSecs() {
    KruMenu.timer($('secsRow'), S.secs, function (v) { S.secs = v; save(); });
    // rounds in the game: 4 fit about 30 minutes (the strongest base wins at the end)
    var n = S.maxRounds || DEFAULT_ROUNDS;
    $('roundsRow').classList.add('ktimer');
    $('roundsRow').innerHTML = '<button type="button" class="btn" data-r="-1"' + (n <= 2 ? ' disabled' : '') + ' aria-label="One round less">−</button><output>' + n + ' rounds</output><button type="button" class="btn" data-r="1"' + (n >= 15 ? ' disabled' : '') + ' aria-label="One round more">+</button>';
  }
  $('roundsRow').addEventListener('click', function (e) {
    var b = e.target.closest('[data-r]');
    if (!b || b.disabled) return;
    S.maxRounds = Math.max(2, Math.min(15, (S.maxRounds || DEFAULT_ROUNDS) + Number(b.dataset.r))); save(); renderSecs(); render();
  });
  $('more').addEventListener('click', function () {
    renderSecs(); disarm();
    $('undoMove').disabled = !S.hist.length; updateRulesBtn();
    $('skip').disabled = S.phase === 'over' || !curId();
    $('menuBack').hidden = false;
  });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('deckBtn').addEventListener('click', function () { closeMenu(); openDecks(); });
  $('skip').addEventListener('click', function () { closeMenu(); snap(); closeChoice(); closeShop(); closeAim(); advance(); });
  $('undoMove').addEventListener('click', function () { closeMenu(); if (undo()) toast('Back one step.'); });
  var MINE = {};
  function introSlides() { return isSmash() && MINE.introSmash ? KruIntro.forLevel({ intro: MINE.introSmash }, S.level) : KruIntro.forLevel(MINE, S.level); }
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(introSlides(), { title: 'Point 1-4' }); });
  /** Choose the rules before the first question: SMASH (new, faster) or LM2 (the original). */
  function pickRules(next) {
    reopen = function () {};
    var mk = function (name) { return function () {
      closeChoice();
      var deck = S.deck; S.rules = name; fresh(deck); S.rulesPicked = true; S.introDone = false; skipDead(); save(); render(); updateRulesBtn();
      next();
    }; };
    choose({ art: ART.shield(), title: 'Choose the rules',
      options: [
        { html: '<b>SMASH</b><small>New and fast: answer a question, then fire right away. Towers are armor. About 25 minutes.</small>', fn: mk('smash') },
        { html: '<b>LM2</b><small>The original game: gold, the store, random bomb rewards and tower shoot-down.</small>', fn: mk('lm2') },
      ] });
  }
  function updateRulesBtn() {
    var open = !S.started && S.round === 1;
    $('rulesBtn').textContent = 'Rules: ' + (isSmash() ? 'SMASH' : 'LM2') + (open ? '' : ' 🔒');
    $('rulesBtn').disabled = !open;
  }
  $('rulesBtn').addEventListener('click', function () { closeMenu(); pickRules(function () { if (!S.deck) openDecks(); }); });
  function disarm() { $('newGame').classList.remove('armed'); $('newGame').textContent = 'New Game'; }
  $('newGame').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again to confirm'; setTimeout(disarm, 3500); return; }
    fresh(S.deck);
    closeChoice(); closeShop(); closeAim(); closeQuestion();
    save(); closeMenu(); render();
  });
  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden || !$('deckBack').hidden || !$('choiceBack').hidden || !$('shopBack').hidden || !$('aimBack').hidden || !$('toolsBack').hidden) return;
    if (!$('fx').hidden) { if (e.code === 'Space') { e.preventDefault(); $('fx').click(); } return; }
    if (!$('qBack').hidden) { if (e.code === 'Space') { e.preventDefault(); $('go').click(); } }
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', function () { if (!$('qBack').hidden) KruQuiz.fit($('stage')); });

  // End Game and Kru's Finish: if the game is still going, rank by remaining HP
  Kru.onFinishRequest(function () { Kru.finish(teams.map(function (t) { return { teamId: t.id, points: t.teacher ? 0 : finalPts(t.id) }; })); });

  // ---------- start ----------
  if (/[?&]mock=1/.test(location.search)) window.__ft = function () { return S; }; // for testing in mock mode only
  var contentReady = fetch('/games/race-board/content.json').then(function (r) { return r.json(); });
  var ownReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    Promise.all([contentReady, KruQuiz.load(session.level, session), ownReady]).then(function (all) {
      var c = all[0], QZ = all[1], mine = all[2], lv = c.questions && c.questions[QZ.level] ? QZ.level : 'M.2';
      DECKS = buildDecks(c, QZ, lv);
      teams = Kru.allTeams();
      players = teams.filter(function (t) { return !t.teacher; }).slice(0, 4);
      KruEnd.setup({ standings: function () { return players.map(function (t) { return { name: t.name, points: finalPts(t.id) }; }); } });
      var saved = session.resume;
      if (saved && saved.v === 4 && saved.level === QZ.level && saved.t && players.every(function (p) { return saved.t[p.id]; }) && (!saved.deck || deckByKey(saved.deck))) {
        S = saved; S.rules = S.rules || 'lm2'; if (S.rulesPicked === undefined) S.rulesPicked = true; applyRules(S.rules); buildPoolKeep(); // older saves are LM2 games
      } else { S = null; fresh(session.setKey && deckByKey(session.setKey) ? session.setKey : QZ.unit ? 'unit' : ''); S.level = QZ.level; } // the deck picked before the team builder
      S.secs = KruMenu.snap(S.secs); S.hist = S.hist || []; S.skip = S.skip || {}; S.aim = null;
      skipDead();
      MINE = mine;
      // the Alliance button lives in the bar next to Question
      var ally = document.createElement('button');
      ally.className = 'btn'; ally.id = 'ally'; ally.textContent = '🤝 Ally';
      $('act').parentNode.insertBefore(ally, $('act'));
      ally.addEventListener('click', function () { unlockAudio(); openAlly(); });
      var baseRender = render;
      render = function () { baseRender(); ally.hidden = !canAlly(); };
      render();
      var afterIntro = function () { S.introDone = true; save(); if (!S.deck) openDecks(); else if (S.phase === 'shop') openShop(); else if (S.phase === 'repair') openRepair(); };
      var startFlow = function () { if (!S.introDone) KruIntro.show(introSlides(), { title: 'Point 1-4' }).then(afterIntro); else afterIntro(); };
      if (!S.rulesPicked) pickRules(startFlow); else startFlow();
    }).catch(function (err) {
      $('board').textContent = 'Could not load the questions. Close the game and open it again.';
      if (window.console) console.error(err);
    });
  });
})();
