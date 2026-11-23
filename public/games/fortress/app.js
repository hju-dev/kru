/* Fortress (Henry, Nov 23): four teams defend a medieval base and attack each other. Made with Job, a student who
   helped create the game.
   - Every base: HQ (100 HP), Depot (60), two Towers (40 each).
   - A turn = a question (Quiz Dash bank, Battle of Wits sets or a unit). Right: the team picks 💣 a bomb (the size is
     random, bigger bombs are likelier on harder questions), 🩹 a repair (+HP to one building) or 🪙 gold.
   - After every team had its turn: the SHOP (gold buys bombs and repair kits), then FIRE (every team may fire its bombs at
     enemy buildings), then the Depots heal their base a little and the next round starts.
   - Towers stop small bombs, add 5% resistance each (max 17%) and shoot down a bomb 16% of the time each.
   - Depot destroyed: only easy and regular questions, no healing, no bombs (the shop sells only repair kits).
   - HQ destroyed: the team sacrifices another building, the HQ takes over that building's HP. No building left = out.
   - Power-ups (once each): +20 s, Free answer, Risk It (a bigger bomb or 3x gold; wrong = every building except the HQ loses
     half of its starting HP) and Alliance (skip your turn; the other team must skip too): shared towers and depots, +10% HQ
     resistance, and bombs can be shared (one size smaller for both) or kept.
   - Last base standing wins (allies who are the last ones left share first place). Points: 5 / 3 / 2 / 1 by place. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#9B7BFF'];
  var KEYS = ['hq', 'depot', 't1', 't2'];
  var MAXHP = { hq: 100, depot: 60, t1: 40, t2: 40 };
  var BNAME = { hq: 'HQ', depot: 'Depot', t1: 'Tower', t2: 'Tower' };
  var DMG = [20, 35, 55, 90], SIZES = ['Small', 'Medium', 'Large', 'Mega'];
  var ODDS = { easy: [70, 30, 0, 0], regular: [40, 45, 15, 0], hard: [0, 40, 50, 10], impossible: [0, 20, 50, 30] };
  var GOLD = { easy: 2, regular: 3, hard: 5, impossible: 7 };
  var HEAL = { easy: 10, regular: 20, hard: 35, impossible: 50 };
  var PRICE = [3, 5, 8, 14], KIT = 4, KIT_HP = 25;
  var ROUND_HEAL = 5, SHOOT = 0.16, RES = 0.05, RES_CAP = 0.17, ALLY_HQ = 0.1;
  var PLACE_PTS = [5, 3, 2, 1];
  var ORDER = ['easy', 'regular', 'hard', 'impossible'];
  var TIERS = {
    easy: { label: 'Easy', share: 30 },
    regular: { label: 'Regular', share: 45 },
    hard: { label: 'Hard', share: 17 },
    impossible: { label: 'Impossible', share: 8 },
  };
  var POWERS = [{ id: 'time', label: '+20 s' }, { id: 'free', label: 'Free Answer' }, { id: 'risk', label: '🎲 Risk It' }];
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

  // ---------- defense: towers and depots are shared with an ally ----------
  function towers(id) {
    var n = 0;
    [id, allyOf(id)].forEach(function (x) { if (x) ['t1', 't2'].forEach(function (k) { if (T(x).hp[k] > 0) n++; }); });
    return n;
  }
  function depotOk(id) { return T(id).hp.depot > 0 || (allyOf(id) ? T(allyOf(id)).hp.depot > 0 : false); }
  function resist(id, key) { return Math.min(RES_CAP, RES * towers(id)) + (key === 'hq' && allyOf(id) ? ALLY_HQ : 0); }
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
    $('fxJob').innerHTML = ART.job(); // Job, the student who helped create the game, is in every pop-up
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
    closeChoice(); closeQuestion(); save(); render();
    return true;
  }

  // ---------- the new game ----------
  function newTeams() {
    var t = {};
    players.forEach(function (p) {
      t[p.id] = { hp: { hq: MAXHP.hq, depot: MAXHP.depot, t1: MAXHP.t1, t2: MAXHP.t2 }, gold: 0, bombs: [], alive: true, ally: null, powers: {} };
    });
    return t;
  }
  function fresh(deck) {
    S = { v: 1, level: S ? S.level : '', deck: deck || '', t: newTeams(), phase: 'turn', round: 1, queue: [], cur: 0, skip: {}, elim: [], over: false,
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
      break;
    }
  }
  function advance() {
    if (S.over) return;
    S.cur++; S.aim = null; skipDead();
    if (S.cur < S.queue.length) { save(); render(); if (S.phase === 'shop') afterBanners(openShop); return; }
    if (S.phase === 'turn') { startPhase('shop', 'THE SHOP OPENS!', 'Spend your gold on bombs and repair kits.', ART.coin()); }
    else if (S.phase === 'shop') { startPhase('fire', 'FIRE AT WILL!', 'Aim your bombs at an enemy building.', ART.boom()); }
    else endRound();
  }
  function startPhase(name, title, sub, art) {
    S.phase = name; S.queue = living(); S.cur = 0; S.aim = null;
    skipDead();
    if (S.cur >= S.queue.length) { save(); advance2(name); return; }
    banner({ art: art, title: title, sub: sub, mood: 'magic', wait: 1500 });
    save(); render();
    if (name === 'shop') afterBanners(openShop);
  }
  /** a phase nobody can use (no gold / no bombs): go on to the next one */
  function advance2(name) { S.cur = S.queue.length; if (name === 'shop') startPhase('fire', 'FIRE AT WILL!', 'Aim your bombs at an enemy building.', ART.boom()); else endRound(); }
  function endRound() {
    var healed = [];
    living().forEach(function (id) {
      if (!depotOk(id)) return;
      var any = false;
      KEYS.forEach(function (k) { var h = T(id).hp[k]; if (h > 0 && h < MAXHP[k]) { T(id).hp[k] = Math.min(MAXHP[k], h + ROUND_HEAL); any = true; } });
      if (any) healed.push(tname(id));
    });
    S.round++;
    startTurns();
    var more = healed.length ? healed.join(', ') + ' healed a little.' : 'A new round begins.';
    banner({ art: ART.shield(), title: 'ROUND ' + S.round + '!', sub: more, mood: 'good', wait: 1500 });
    save(); render();
  }

  // ---------- damage, destruction, elimination ----------
  function setHp(id, key, hp) { T(id).hp[key] = Math.max(0, hp); }
  function fire(from, bi, to, key) {
    snap();
    var b = T(from).bombs.splice(bi, 1)[0];
    S.aim = null;
    var size = b.s, name = tname(to) + "'s " + BNAME[key];
    boom();
    if (size === 0 && towers(to) > 0) {
      banner({ art: ART.shield(), title: 'BLOCKED!', sub: 'The towers stop ' + tname(from) + "'s small bomb.", mood: 'good', sound: 'magic', wait: 1500 });
      afterBanners(continueFire); save(); return;
    }
    var n = towers(to), shot = n > 0 && Math.random() < 1 - Math.pow(1 - SHOOT, n);
    if (shot) {
      banner({ art: ART.shield(), title: 'SHOT DOWN!', sub: 'A tower shot down ' + tname(from) + "'s " + SIZES[size].toLowerCase() + ' bomb!', mood: 'good', sound: 'magic', wait: 1500 });
      afterBanners(continueFire); save(); return;
    }
    var dmg = Math.round(DMG[size] * (1 - resist(to, key)));
    var before = T(to).hp[key];
    setHp(to, key, before - dmg);
    var gone = T(to).hp[key] <= 0;
    banner({ art: ART.bomb(size), title: SIZES[size].toUpperCase() + ' BOMB!', sub: tname(from) + ' hits ' + name + ' for ' + dmg + (gone ? ': DESTROYED!' : '.'), mood: 'boom', wait: 1500 });
    if (gone && key === 'hq') afterBanners(function () { hqFell(to); });
    else afterBanners(continueFire);
    save();
  }
  function continueFire() {
    if (S.over) return;
    var id = curId();
    if (!id || !alive(id) || !T(id).bombs.length) advance(); else { save(); render(); }
  }
  /** The HQ is destroyed: sacrifice another building (the HQ takes its HP), or the base falls. */
  function hqFell(id) {
    var rest = KEYS.filter(function (k) { return k !== 'hq' && T(id).hp[k] > 0; });
    if (!rest.length) { eliminate(id); return; }
    banner({ art: ART.ruins(), title: 'HQ DESTROYED!', sub: tname(id) + ' must sacrifice a building to stay in the game.', mood: 'bad', wait: 1500 });
    afterBanners(function () {
      choose({ art: ART.hq(color(id)), title: tname(id) + ': sacrifice a building',
        options: rest.map(function (k) { return { html: '<b>' + BNAME[k] + '</b><small>HQ takes its ' + T(id).hp[k] + ' HP</small>', fn: function () {
          T(id).hp.hq = T(id).hp[k]; T(id).hp[k] = 0; closeChoice(); save();
          banner({ art: ART.hq(color(id)), title: 'HQ RESTORED!', sub: tname(id) + ' sacrificed its ' + BNAME[k] + '.', mood: 'magic', wait: 1500 });
          afterBanners(continueFire);
        } }; }) });
    });
  }
  function eliminate(id) {
    T(id).alive = false; T(id).hp.hq = 0;
    if (S.t[id].ally && S.t[S.t[id].ally]) S.t[S.t[id].ally].ally = null;
    S.elim.push(id);
    banner({ art: ART.ruins(), title: 'BASE FALLEN!', sub: tname(id) + ' is out of the game.', mood: 'bad', sound: 'bad' });
    afterBanners(function () { if (!checkEnd()) continueFire(); });
    save();
  }
  /** Over when one base is left, or every base left is allied with the others. */
  function checkEnd() {
    var l = living();
    var allied = l.length > 1 && l.every(function (id) { return l.every(function (o) { return o === id || allyOf(id) === o; }); });
    if (l.length > 1 && !allied) return false;
    S.over = true; S.phase = 'over'; S.cur = 0; S.queue = [];
    save();
    banner({ art: ART.trophy(), title: l.length > 1 ? 'THE ALLIES WIN!' : l.length ? tname(l[0]) + ' WINS!' : 'GAME OVER', sub: 'The last base standing!', mood: 'good', sound: 'fanfare' });
    afterBanners(render);
    return true;
  }

  // ---------- ranking and points ----------
  function ranking() {
    var l = living();
    var survivors = l.slice().sort(function (a, b) { return S.over ? 0 : totalHp(b) - totalHp(a); });
    var gone = S.elim.slice().reverse();
    var out = [], place = 1;
    if (S.over && survivors.length > 1) { survivors.forEach(function (id) { out.push({ id: id, rank: 1 }); }); place = 2; }
    else survivors.forEach(function (id) { out.push({ id: id, rank: place++ }); });
    gone.forEach(function (id) { out.push({ id: id, rank: place++ }); });
    return out;
  }
  function finalPts(id) {
    var r = ranking().filter(function (x) { return x.id === id; })[0];
    return r ? PLACE_PTS[Math.min(PLACE_PTS.length, r.rank) - 1] || 0 : 0;
  }

  // ---------- the board ----------
  function render() {
    if (!S) return;
    var id = curId(), phase = S.phase;
    var label = phase === 'over' ? 'Game over' : phase === 'turn' ? 'Round ' + S.round + ' · ' + tname(id) + "'s question" : phase === 'shop' ? 'Shop · ' + tname(id) : 'Fire · ' + tname(id);
    $('turn').textContent = id || phase === 'over' ? label : '';
    $('turn').style.color = id ? color(id) : '';
    var act = $('act');
    act.hidden = phase === 'fire' || (!id && phase !== 'over');
    act.textContent = phase === 'over' ? '🏆 Podium ▶' : phase === 'shop' ? 'Open the shop ▶' : 'Question ▶';
    $('board').innerHTML = players.map(function (t) { return baseHtml(t); }).join('');
    renderTray();
    document.body.classList.toggle('aiming', S.aim != null);
  }
  function baseHtml(t) {
    var id = t.id, d = T(id), cur = curId() === id && S.phase !== 'over';
    var ally = allyOf(id);
    var aim = S.aim != null && curId() && alive(id) && id !== curId() && ally !== curId() && allyOf(curId()) !== id;
    var bombs = [0, 1, 2, 3].map(function (s) {
      var n = d.bombs.filter(function (b) { return b.s === s; }).length;
      return n ? '<i class="bm" title="' + SIZES[s] + ' bomb">' + ART.bomb(s) + '<b>' + n + '</b></i>' : '';
    }).join('');
    var rows = KEYS.map(function (k) {
      var hp = d.hp[k], dead = hp <= 0, pct = Math.max(0, hp) / MAXHP[k] * 100;
      var ico = k === 'hq' ? ART.hq(color(id)) : k === 'depot' ? ART.depot() : ART.tower();
      return '<button class="bld' + (dead ? ' dead' : '') + (aim && !dead ? ' target' : '') + '" data-t="' + esc(id) + '" data-k="' + k + '"' + (aim && !dead ? '' : ' tabindex="-1"') +
        ' aria-label="' + esc(t.name) + ' ' + BNAME[k] + ', ' + Math.max(0, hp) + ' HP"><span class="ico">' + (dead ? ART.ruins() : ico) + '</span>' +
        '<span class="hp"><i class="' + (pct < 34 ? 'low' : pct < 67 ? 'mid' : '') + '" style="width:' + pct + '%"></i></span><span class="num">' + Math.max(0, hp) + '</span></button>';
    }).join('');
    return '<section class="base' + (cur ? ' cur' : '') + (d.alive ? '' : ' out') + '" style="--c:' + color(id) + '">' +
      '<div class="b-head">' + Kru.badge(t, color(id)) + '<span class="gold">' + coinHtml() + d.gold + '</span>' + (ally ? '<span class="ally" title="Allied with ' + esc(tname(ally)) + '">🤝</span>' : '') + '</div>' +
      '<div class="b-bombs">' + (bombs || '<span class="none">no bombs</span>') + '</div>' + rows + '</section>';
  }
  function coinHtml() { return '<span class="coin">' + ART.coin() + '</span>'; }
  $('board').addEventListener('click', function (e) {
    var b = e.target.closest('.bld.target');
    if (!b || S.aim == null) return;
    unlockAudio();
    fire(curId(), S.aim, b.dataset.t, b.dataset.k);
  });

  // ---------- fire tray ----------
  function renderTray() {
    var id = curId(), tray = $('tray');
    if (S.phase !== 'fire' || !id || !alive(id) || fxOn) { tray.hidden = true; return; }
    var d = T(id);
    tray.hidden = false;
    tray.innerHTML = '<span class="tray-lab" style="color:' + color(id) + '">' + esc(tname(id)) + ': ' + (S.aim == null ? 'tap a bomb' : 'tap an enemy building') + '</span>' +
      d.bombs.map(function (b, i) {
        return '<button class="btn bmb' + (S.aim === i ? ' on' : '') + '" data-b="' + i + '"><span class="bi">' + ART.bomb(b.s) + '</span>' + SIZES[b.s] + ' ' + DMG[b.s] + '</button>';
      }).join('') + '<button class="btn" id="fireDone">Done ▶</button>';
  }
  $('tray').addEventListener('click', function (e) {
    unlockAudio();
    var b = e.target.closest('[data-b]');
    if (b) { S.aim = S.aim === +b.dataset.b ? null : +b.dataset.b; render(); return; }
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
    var list = KEYS.filter(function (k) { return T(id).hp[k] > 0 && T(id).hp[k] < MAXHP[k]; });
    if (!list.length) { toast(tname(id) + ' has nothing to repair.'); return false; }
    choose({ art: ART.repair(), title: title, options: list.map(function (k) { return { html: '<b>' + BNAME[k] + (k.charAt(0) === 't' ? ' ' + k.charAt(1) : '') + '</b><small>' + T(id).hp[k] + ' / ' + MAXHP[k] + ' HP</small>', fn: function () { closeChoice(); fn(k); } }; }),
      foot: [{ label: 'Cancel', cls: 'ghost', fn: function () { closeChoice(); reopen(); } }] });
    return true;
  }
  var reopen = function () {};

  // ---------- the shop ----------
  function openShop() {
    var id = curId();
    if (S.phase !== 'shop' || !id) return;
    var d = T(id), dep = depotOk(id), ally = allyOf(id);
    reopen = openShop;
    var opts = PRICE.map(function (p, s) {
      return { html: '<b>' + SIZES[s] + ' bomb · ' + p + ' 🪙</b><small>' + DMG[s] + ' damage</small>', off: !dep || d.gold < p, fn: function () {
        snap(); d.gold -= p; d.bombs.push({ s: s }); save(); tone([660, 880], 0.08); openShop(); render(); } };
    });
    opts.push({ html: '<b>Repair kit · ' + KIT + ' 🪙</b><small>+' + KIT_HP + ' HP to one building</small>', off: d.gold < KIT, fn: function () {
      pickBuilding(id, 'Repair which building?', function (k) { snap(); d.gold -= KIT; d.hp[k] = Math.min(MAXHP[k], d.hp[k] + KIT_HP); save(); tone([523, 659, 784], 0.08); openShop(); render(); }); } });
    choose({ art: ART.coin(), title: tname(id) + ': ' + d.gold + ' gold' + (dep ? '' : ' · no Depot: only repair kits'), options: opts,
      foot: [{ label: 'Done ▶', cls: 'gold', fn: function () { closeChoice(); snap(); advance(); } }] });
    if (ally) $('choiceTitle').textContent += ' · allied with ' + tname(ally);
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
    }
    if (own.length) decks.push({ key: 'bank', label: 'Quiz Dash questions', sub: own.length + ' questions, easy to impossible', qs: deckQs(own, '', true) });
    var every = [];
    QZ.builtIn.forEach(function (s) { every = every.concat(deckQs(s.questions, s.name)); });
    if (every.length) decks.push({ key: 'qb-all', label: 'Battle of Wits: all topics', sub: every.length + ' questions', qs: every });
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
  /** The next question; without a Depot only easy and regular ones. */
  function pickQuestion(id) {
    var tiers = depotOk(id) ? ORDER : ['easy', 'regular'];
    var avail = tiers.filter(function (t) { return POOL[t].length; });
    if (!avail.length) avail = ORDER.filter(function (t) { return POOL[t].length; });
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
      var off = used(id, p.id) || (shown && p.id !== 'time') || (p.id === 'free' && risk);
      return '<button class="btn pw' + (on ? ' on' : '') + (used(id, p.id) ? ' used' : '') + '" data-pw="' + p.id + '"' + (off && !on ? ' disabled' : '') +
        ' aria-pressed="' + on + '">' + (on ? '🎲 RISK IT: ON' : p.label) + '</button>';
    }).join('');
  }
  $('powers').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pw]');
    if (!b || b.disabled) return;
    unlockAudio();
    var id = curId(), p = b.dataset.pw;
    if (p === 'time') {
      left = Math.max(0, left) + 20; total = Math.max(total, left);
      use(id, 'time'); tone([660, 880, 1047], 0.08);
      if (!running) startTimer(); else { endAt = Date.now() + left * 1000; renderClock(); }
      renderPowers();
    } else if (p === 'free') { use(id, 'free'); toast('🎟 ' + tname(id) + ' used Free Answer!'); rightAnswer(); }
    else if (p === 'risk') { risk = !risk; tone(risk ? [392, 523, 659] : [440], 0.08); renderPowers(); }
  });
  function ask() {
    var id = curId();
    if (!id || S.phase !== 'turn' || fxOn || !$('choiceBack').hidden) return;
    if (!S.deck) { openDecks(); return; }
    var q = pickQuestion(id);
    if (!q) { toast('This deck has no questions. Choose another deck.'); openDecks(); return; }
    snap(); unlockAudio();
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
  function rollBomb(tier, rk) {
    var s = weighted(ODDS[tier]);
    return rk ? Math.min(3, s + 1) : s;
  }
  function oddsText(tier, rk) {
    var o = ODDS[tier], parts = [];
    o.forEach(function (p, s) { if (p) parts.push(SIZES[Math.min(3, rk ? s + 1 : s)].toLowerCase()); });
    var uniq = parts.filter(function (x, i) { return parts.indexOf(x) === i; });
    return 'a ' + uniq.join(' or ') + ' bomb';
  }
  function rightAnswer() {
    var id = curId(), tier = tierOf(Q), rk = risk;
    risk = false;
    if (rk) use(id, 'risk');
    closeQuestion();
    banner({ art: ART.shield(), title: 'CORRECT!', sub: tname(id) + ' earns a reward!', mood: 'good', wait: 1200 });
    afterBanners(function () { rewardPanel(id, tier, rk); });
  }
  /** The reward after a right answer: a bomb, a repair or gold. */
  function rewardPanel(id, tier, rk) {
    var dep = depotOk(id), gold = GOLD[tier] * (rk ? 3 : 1);
    reopen = function () { rewardPanel(id, tier, rk); };
    choose({ art: ART.bomb(2), title: tname(id) + ': choose your reward' + (rk ? ' (Risk It!)' : ''),
      options: [
        { html: '<b>💣 A bomb</b><small>' + (dep ? oddsText(tier, rk) : 'Depot destroyed: no bombs') + '</small>', off: !dep, fn: function () { closeChoice(); gotBomb(id, rollBomb(tier, rk)); } },
        { html: '<b>🩹 Repair</b><small>+' + HEAL[tier] + ' HP to one building</small>', fn: function () {
          pickBuilding(id, 'Repair which building?', function (k) {
            T(id).hp[k] = Math.min(MAXHP[k], T(id).hp[k] + HEAL[tier]); save();
            banner({ art: ART.repair(), title: 'REPAIRED!', sub: tname(id) + "'s " + BNAME[k] + ' is stronger.', mood: 'good', wait: 1200 });
            afterBanners(advance);
          }); } },
        { html: '<b>' + coinHtml() + ' Gold +' + gold + '</b><small>spend it in the shop</small>', fn: function () {
          closeChoice(); T(id).gold += gold; save();
          banner({ art: ART.coin(), title: '+' + gold + ' GOLD!', sub: tname(id) + ' fills its treasury.', mood: 'good', wait: 1200 });
          afterBanners(advance); } },
      ] });
  }
  function gotBomb(id, size) {
    var ally = allyOf(id);
    banner({ art: ART.bomb(size), title: SIZES[size].toUpperCase() + ' BOMB!', sub: tname(id) + ' gets a ' + SIZES[size].toLowerCase() + ' bomb.', mood: 'good', sound: 'fanfare', wait: 1300 });
    afterBanners(function () {
      if (!ally) { T(id).bombs.push({ s: size }); save(); advance(); return; }
      choose({ art: ART.alliance(), title: 'Allies: keep it or share it?',
        options: [
          { html: '<b>Keep it</b><small>Only ' + esc(tname(id)) + ' can fire it</small>', fn: function () { closeChoice(); T(id).bombs.push({ s: size }); save(); advance(); } },
          { html: '<b>Share it</b><small>' + (size > 0 ? SIZES[size - 1] : SIZES[0]) + ' bomb for BOTH teams</small>', fn: function () {
            closeChoice(); var s2 = Math.max(0, size - 1); T(id).bombs.push({ s: s2 }); T(ally).bombs.push({ s: s2 }); save(); advance(); } },
        ] });
    });
  }
  function missed() {
    unlockAudio();
    var id = curId(), rk = risk;
    risk = false;
    if (rk) use(id, 'risk');
    closeQuestion();
    banner({ art: incorrectArt(), title: 'INCORRECT', sub: encourage(), mood: 'bad', sound: 'bad' });
    if (rk) {
      var hit = [];
      KEYS.forEach(function (k) { if (k !== 'hq' && T(id).hp[k] > 0) { T(id).hp[k] = Math.max(0, T(id).hp[k] - MAXHP[k] / 2); hit.push(k); } });
      banner({ art: ART.boom(), title: 'RISK BACKFIRES!', sub: tname(id) + ': every building except the HQ loses half of its starting HP!', mood: 'boom', wait: 1800 });
    }
    save();
    afterBanners(advance);
  }
  function incorrectArt() {
    return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="60" cy="56" r="44" fill="#e63946" stroke="#8f1525" stroke-width="5"/><path d="M40 36l40 40M80 36L40 76" stroke="#fff" stroke-width="12" stroke-linecap="round"/></svg>';
  }
  var ENC = ['Good try, knights! The next one is yours!', "Don't give up, defenders!", 'Even brave knights miss sometimes!', 'Hold the walls and try again!',
    'Every mistake makes the army wiser!', 'Chin up, commander!', 'So close! Next turn!', 'The castle still stands!'];
  var lastEnc = -1;
  function encourage() { var i = Math.floor(Math.random() * ENC.length); if (i === lastEnc) i = (i + 1) % ENC.length; lastEnc = i; return ENC[i]; }

  $('act').addEventListener('click', function () {
    unlockAudio();
    if (S.phase === 'over') { KruEnd.show(); return; }
    if (S.phase === 'shop') { openShop(); return; }
    ask();
  });
  $('go').addEventListener('click', function () { if (running) { stopTimer(); renderClock(); } else startTimer(); });
  $('reveal').addEventListener('click', function () { unlockAudio(); stopTimer(); renderClock(); shown = true; tone([523, 659]); renderQuestion(); });
  $('right').addEventListener('click', rightAnswer);
  $('wrong').addEventListener('click', missed);

  // ---------- alliance (a power-up: skip your turn, the other team must skip too) ----------
  function canAlly() {
    var id = curId();
    return S.phase === 'turn' && id && !used(id, 'ally') && !allyOf(id) && living().filter(function (o) { return o !== id && !allyOf(o); }).length > 0;
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
          closeChoice(); snap(); S.t[a].ally = b; S.t[b].ally = a; use(a, 'ally'); use(b, 'ally'); S.skip[b] = true; save();
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
  function renderSecs() { KruMenu.timer($('secsRow'), S.secs, function (v) { S.secs = v; save(); }); }
  $('more').addEventListener('click', function () {
    renderSecs(); disarm();
    $('undoMove').disabled = !S.hist.length;
    $('skip').disabled = S.phase === 'over' || !curId();
    $('menuBack').hidden = false;
  });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('deckBtn').addEventListener('click', function () { closeMenu(); openDecks(); });
  $('skip').addEventListener('click', function () { closeMenu(); snap(); closeChoice(); advance(); });
  $('undoMove').addEventListener('click', function () { closeMenu(); if (undo()) toast('Back one step.'); });
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: 'Fortress' }); });
  function disarm() { $('newGame').classList.remove('armed'); $('newGame').textContent = 'New Game'; }
  $('newGame').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again to confirm'; setTimeout(disarm, 3500); return; }
    fresh(S.deck);
    closeChoice(); closeQuestion();
    save(); closeMenu(); render();
  });
  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden || !$('deckBack').hidden || !$('choiceBack').hidden) return;
    if (!$('fx').hidden) { if (e.code === 'Space') { e.preventDefault(); $('fx').click(); } return; }
    if (!$('qBack').hidden) { if (e.code === 'Space') { e.preventDefault(); $('go').click(); } }
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', function () { if (!$('qBack').hidden) KruQuiz.fit($('stage')); });

  // End Game and Kru's Finish: if the game is still going, rank by remaining HP
  Kru.onFinishRequest(function () { Kru.finish(teams.map(function (t) { return { teamId: t.id, points: t.teacher ? 0 : finalPts(t.id) }; })); });

  // ---------- start ----------
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
      if (saved && saved.v === 1 && saved.level === QZ.level && saved.t && players.every(function (p) { return saved.t[p.id]; }) && (!saved.deck || deckByKey(saved.deck))) {
        S = saved; buildPoolKeep();
      } else { S = null; fresh(QZ.unit ? 'unit' : ''); S.level = QZ.level; }
      S.secs = KruMenu.snap(S.secs); S.hist = S.hist || []; S.skip = S.skip || {}; S.aim = null;
      skipDead();
      INTRO = KruIntro.forLevel(mine, QZ.level);
      // the Alliance button lives in the bar next to Question
      var ally = document.createElement('button');
      ally.className = 'btn'; ally.id = 'ally'; ally.textContent = '🤝 Ally';
      $('act').parentNode.insertBefore(ally, $('act'));
      ally.addEventListener('click', function () { unlockAudio(); openAlly(); });
      var baseRender = render;
      render = function () { baseRender(); ally.hidden = !canAlly(); };
      render();
      var afterIntro = function () { S.introDone = true; save(); if (!S.deck) openDecks(); else if (S.phase === 'shop') openShop(); };
      if (!S.introDone) KruIntro.show(INTRO, { title: 'Fortress' }).then(afterIntro); else afterIntro();
    }).catch(function (err) {
      $('board').textContent = 'Could not load the questions. Close the game and open it again.';
      if (window.console) console.error(err);
    });
  });
})();
