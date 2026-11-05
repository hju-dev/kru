/**
 * Kru card-game engine, shared by the simpler team games (Would You Rather, Just a Minute, Sentence Builder,
 * Category Grid, and the reading games). Each game gives a config; the engine builds the screen:
 *   top bar (title, ★ bonus chip, ⋯) · card area (with "6/50" in the corner) · timer + Start / Reveal / Next
 *   · team strip (tap a team to give points) · ⋯ menu (time, previous, undo, How to play, reset, End game).
 * It also handles: content.json per level, a new shuffled order every game, saving through Kru, How to play
 * slides, bonus cards, final scores.
 *
 * KruCards.start({
 *   title: 'Would You Rather?', logo: 'Would You <b>Rather?</b>',
 *   items: function (content, level) { return content[level].items; },   // the pool (50+)
 *   card: function (item, info) { return html; },     // info: { step, revealed, level, esc }; use data-fit="max,min" on big text
 *   steps: ['Hide story', 'Show answers'],             // optional: several reveal taps (default one 'Reveal'); step counts them
 *   order: function (items) { return [indexes]; },     // optional: a new order each game (default: shuffle every card)
 *   bonusKey: function (item) { return 'story-7'; },    // optional: cards with the same key share one bonus round
 *   extra: '/games/shared/stories.json',               // optional: a second file, passed to items(content, level, extra)
 *   compact: true,                                     // optional: timer + buttons in the top bar (more room for long texts)
 *   reveal: true | function (item) { return bool },    // is there an answer to reveal?
 *   timer: { secs: 60, options: [30, 60, 90] } | null,
 *   points: [{ d: 1, label: '+1 Good reason' }, ...],  // the buttons when you tap a team
 *   challenge: { penalty: 1 },                         // optional: a Challenge! button that stops the timer and asks
 *                                                      //   which team loses the points (or no one)
 *   timer: { secs: 30, adjust: 10, min: 10, max: 300 }, // adjust: −10 / +10 buttons beside the clock
 *   tag: true,                                         // optional: "Tag ▶" restarts the clock for the next speaker
 *   picker: true,                                      // optional: "Pick a team" spinner in the top bar
 *   noScores: true,                                    // optional: no team strip, points or final scores (warm-ups)
 *   onReveal / onNext: optional hooks
 * })
 */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }

  function start(cfg) {
    var $ = function (id) { return document.getElementById(id); };
    var ITEMS = [], teams = [], S = null, INTRO = [], content = null;
    var left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null, panelTeam = null;
    var hasTimer = !!cfg.timer;
    var adjust = hasTimer && cfg.timer.adjust ? cfg.timer.adjust : 0;
    var MIN = hasTimer && cfg.timer.min || 10, MAX = hasTimer && cfg.timer.max || 600;

    // ---------- the screen ----------
    var main = document.querySelector('main.game');
    main.classList.add('kc');
    if (cfg.noScores) main.classList.add('no-scores');
    if (cfg.compact) main.classList.add('compact');
    main.innerHTML =
      '<header class="bar"><span class="logo">' + (cfg.logo || esc(cfg.title)) + '</span><span class="grow"></span>' +
      '<button class="small" id="more" aria-haspopup="dialog" aria-label="More options">⋯</button></header>' +
      '<section class="stage" id="stage" aria-live="polite"><div class="card" id="card">Loading…</div></section>' +
      '<div class="controls' + (adjust || cfg.tag ? ' tight' : '') + '">' +
      (hasTimer ? (adjust ? '<button class="btn adj" id="minus" aria-label="10 seconds less">−10</button>' : '') +
        '<span class="digits" id="digits">0:00</span>' +
        (adjust ? '<button class="btn adj" id="plus" aria-label="10 seconds more">+10</button>' : '') +
        '<div class="progress"><i id="fill"></i></div><button class="btn" id="go">Start timer</button>' +
        (cfg.tag ? '<button class="btn teal" id="tag">Tag ▶</button>' : '') : '<span class="grow"></span>') +
      (cfg.challenge ? '<button class="btn coral" id="challenge">Challenge!</button>' : '') +
      '<button class="btn teal" id="reveal">Reveal</button><button class="btn gold" id="next">Next ▶</button></div>' +
      '<div class="strip" id="strip" role="group" aria-label="Teams: tap one to give points"></div>' +
      '<div class="toast" id="toast" role="status" hidden><span id="toastText"></span><button class="small" id="toastUndo">Undo</button></div>';
    document.body.insertAdjacentHTML('beforeend',
      '<div class="backdrop" id="panelBack" hidden><div class="panel" role="dialog" aria-labelledby="panelName">' +
      '<div class="panel-head"><div><b id="panelName"></b> · <span id="panelPts"></span><div class="panel-members" id="panelMembers"></div></div>' +
      '<button class="small" id="panelClose" aria-label="Close">✕</button></div><div class="panel-btns" id="panelBtns"></div></div></div>' +
      (cfg.challenge ? '<div class="backdrop" id="chalBack" hidden><div class="panel" role="dialog" aria-labelledby="chalTitle">' +
        '<div class="panel-head"><div><b id="chalTitle">Challenge!</b><div class="panel-members">Which team made the mistake? They lose ' + cfg.challenge.penalty + '.</div></div>' +
        '<button class="small" id="chalClose" aria-label="Close">✕</button></div><div class="panel-btns" id="chalBtns"></div>' +
        '<button class="btn ghost chal-none" id="chalNone">No point: carry on</button></div></div>' : '') +
      '<div class="backdrop" id="menuBack" hidden><div class="menu" role="dialog" aria-label="More options">' +
      (hasTimer ? '<div class="menu-row" id="secsRow"></div>' : '') +
      '<div class="menu-row"><button class="btn" id="prev">◀ Previous card</button><button class="btn" id="undo">Undo last points</button></div>' +
      '<div class="menu-row"><button class="btn" id="howTo">How to play</button><button class="btn ghost danger" id="resetScores">Reset all scores</button></div>' +
      '<button class="btn ghost" id="menuClose">Close</button></div></div>');

    if (cfg.compact) {
      var bar = main.querySelector('.bar'), ctr = main.querySelector('.controls');
      while (ctr.firstChild) bar.insertBefore(ctr.firstChild, $('more'));
      ctr.remove();
    }
    function save() { Kru.saveState(S); }
    function pts(id) { return S.pts[id] || 0; }
    function team(id) { return teams.find(function (t) { return t.id === id; }); }
    function item() { return ITEMS[S.order[S.pos]]; }
    var STEPS = cfg.steps || ['Reveal'];
    function stepOf(pos) { var r = S.revealed[pos]; return r === true ? STEPS.length : r || 0; }
    function newOrder() { return cfg.order ? cfg.order(ITEMS) : shuffled(ITEMS.length); }
    function canReveal(it) { return typeof cfg.reveal === 'function' ? !!cfg.reveal(it) : !!cfg.reveal; }

    // ---------- sound (after a tap) ----------
    function unlockAudio() {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
    }
    function tone(freqs, gap) {
      if (!audio) return;
      try {
        freqs.forEach(function (f, i) {
          var t = audio.currentTime + i * (gap || 0.15), o = audio.createOscillator(), g = audio.createGain();
          o.type = 'triangle'; o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.38, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
          o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.36);
        });
      } catch (e) {}
    }

    // ---------- timer ----------
    function renderClock() {
      if (!hasTimer) return;
      $('digits').textContent = fmt(left);
      $('fill').style.transform = 'scaleX(' + (total ? Math.max(0, left) / total : 0) + ')';
      $('digits').className = 'digits' + (left <= 0 ? ' done' : left <= 10 && running ? ' warn' : '');
      $('go').textContent = running ? 'Pause' : left <= 0 ? 'Again' : left < total ? 'Resume' : cfg.compact || adjust ? 'Start' : 'Start timer';
      if (adjust) { $('minus').disabled = S.secs <= MIN; $('plus').disabled = S.secs >= MAX; }
    }
    function tick() {
      if (!running) return;
      left = (endAt - Date.now()) / 1000;
      if (left <= 0) {
        left = 0; running = false; clearInterval(timer); tone([880, 660, 990], 0.2);
        if (cfg.timeUpReveals) KruBonus.reveal();
      }
      renderClock();
    }
    function stopTimer() { if (running) left = Math.max(0, (endAt - Date.now()) / 1000); running = false; clearInterval(timer); }
    function startTimer() {
      unlockAudio();
      if (left <= 0) left = total;
      running = true; endAt = Date.now() + left * 1000;
      clearInterval(timer); timer = setInterval(tick, 200); renderClock();
    }
    function resetTimer() { if (!hasTimer) return; stopTimer(); total = left = S.secs; renderClock(); }

    // ---------- card ----------
    function fit() {
      var stage = $('stage');
      var els = Array.prototype.slice.call(stage.querySelectorAll('[data-fit]'));
      els.forEach(function (el) { el.style.fontSize = el.dataset.fit.split(',')[0] + 'px'; });
      // shrink the biggest text first, a step at a time, until the card fits
      for (var guard = 0; guard < 80 && stage.scrollHeight > stage.clientHeight + 1; guard++) {
        var shrunk = false;
        els.forEach(function (el) {
          var mm = el.dataset.fit.split(','), size = parseFloat(el.style.fontSize), min = +mm[1];
          if (size > min && stage.scrollHeight > stage.clientHeight + 1) { el.style.fontSize = Math.max(min, size - 2) + 'px'; shrunk = true; }
        });
        if (!shrunk) break;
      }
    }
    function render() {
      var it = item();
      if (!it) return;
      var step = stepOf(S.pos), revealed = step >= STEPS.length;
      $('card').innerHTML = cfg.card(it, { step: step, revealed: revealed, level: S.level, esc: esc });
      KruCorner.set($('stage'), (S.pos + 1) + '/' + S.order.length);
      var r = canReveal(it);
      $('reveal').hidden = !r;
      $('reveal').disabled = revealed;
      $('reveal').textContent = STEPS[Math.min(step, STEPS.length - 1)];
      bonusRound(cfg.bonusKey ? 'k' + cfg.bonusKey(it) + '-' + S.order.length : 'c' + S.order[S.pos] + '-' + S.pos);
      renderTeams();
      renderClock();
      fit();
    }
    function goTo(pos) {
      if (pos >= S.order.length) {
        S.order = newOrder(); S.pos = 0; S.revealed = {};
        toast('That was the last card. Starting again with a new order.', false);
      } else S.pos = Math.max(0, pos);
      S.speaker = 1;
      save(); resetTimer(); render();
      if (cfg.onNext) cfg.onNext(item());
    }

    // ---------- teams + points ----------
    function renderTeams() {
      if (cfg.noScores) { $('strip').hidden = true; return; }
      var max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }));
      $('strip').innerHTML = teams.map(function (t, i) {
        return '<button class="tile' + (max > 0 && pts(t.id) === max ? ' lead' : '') + '" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-label="' + esc(t.name) + ', ' + pts(t.id) + ' points. Tap to give points">' +
          '<span class="tn">' + esc(t.name) + '</span><span class="tp">' + pts(t.id) + '</span></button>';
      }).join('');
    }
    function addPoints(id, d, why) {
      if (!d) return;
      S.pts[id] = pts(id) + d;
      S.log.push({ t: id, d: d });
      if (S.log.length > 500) S.log.shift();
      save();
      Kru.score(id, d, why || cfg.title);
      renderTeams();
      toast(team(id).name + ' ' + (d > 0 ? '+' : '−') + Math.abs(d), true);
    }
    function undo() {
      var L = S.log.pop();
      if (!L) return;
      S.pts[L.t] = pts(L.t) - L.d;
      save(); Kru.score(L.t, -L.d, 'undo'); renderTeams();
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
    function openPanel(id) {
      var t = team(id);
      if (!t) return;
      panelTeam = t;
      $('panelName').textContent = t.name;
      $('panelPts').textContent = pts(id) + ' points';
      $('panelMembers').textContent = t.teacher ? 'Teacher' : t.members.map(function (m) { return m.nick; }).join(', ');
      $('panelBtns').innerHTML = (cfg.points || [{ d: -1, label: '−1' }, { d: 1, label: '+1' }, { d: 2, label: '+2' }]).map(function (b) {
        return '<button class="btn' + (b.d > 0 ? ' gold' : '') + '" data-d="' + b.d + '" data-why="' + esc(b.why || b.label) + '">' + esc(b.label) + '</button>';
      }).join('');
      $('panelBack').hidden = false;
    }
    function closePanel() { $('panelBack').hidden = true; panelTeam = null; }
    $('strip').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) openPanel(b.dataset.t); });
    $('panelBtns').addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]');
      if (!b || !panelTeam) return;
      unlockAudio();
      addPoints(panelTeam.id, Number(b.dataset.d), b.dataset.why);
      if (Number(b.dataset.d) > 0) tone([784, 988], 0.1);
      closePanel();
    });
    $('panelClose').addEventListener('click', closePanel);
    $('panelBack').addEventListener('click', function (e) { if (e.target === this) closePanel(); });
    $('toastUndo').addEventListener('click', undo);

    // ---------- challenge: stop the timer, then take points from the team at fault ----------
    function closeChallenge() { $('chalBack').hidden = true; }
    if (cfg.challenge) {
      $('challenge').addEventListener('click', function () {
        unlockAudio();
        stopTimer(); renderClock();
        tone([220, 196], 0.15);
        $('chalBtns').innerHTML = teams.map(function (t, i) {
          return '<button class="btn" data-ct="' + esc(t.id) + '" style="border-top:5px solid ' + COLORS[i % COLORS.length] + '">' + esc(t.name) + ' −' + cfg.challenge.penalty + '</button>';
        }).join('');
        $('chalBack').hidden = false;
      });
      $('chalBtns').addEventListener('click', function (e) {
        var b = e.target.closest('[data-ct]');
        if (!b) return;
        addPoints(b.dataset.ct, -cfg.challenge.penalty, 'challenge');
        closeChallenge();
      });
      $('chalNone').addEventListener('click', closeChallenge);
      $('chalClose').addEventListener('click', closeChallenge);
      $('chalBack').addEventListener('click', function (e) { if (e.target === this) closeChallenge(); });
    }

    // ---------- bonus cards ----------
    function bonusRound(key) { var b = KruBonus.next(S.kbonus, key); if (b !== S.kbonus) { S.kbonus = b; save(); } }

    // ---------- main buttons ----------
    if (hasTimer) $('go').addEventListener('click', function () { if (running) { stopTimer(); renderClock(); } else startTimer(); });
    function adjustBy(d) {
      var secs = Math.max(MIN, Math.min(MAX, S.secs + d)), real = secs - S.secs;
      if (!real) return;
      S.secs = secs; save();
      if (running) { left = Math.max(1, left + real); endAt = Date.now() + left * 1000; } else left = left >= total || left <= 0 ? secs : Math.max(1, left + real);
      total = secs;
      renderClock();
    }
    if (adjust) {
      $('minus').addEventListener('click', function () { adjustBy(-adjust); });
      $('plus').addEventListener('click', function () { adjustBy(adjust); });
    }
    // Tag: the next speaker gets a fresh clock straight away
    if (cfg.tag) $('tag').addEventListener('click', function () {
      unlockAudio();
      S.speaker = (S.speaker || 1) + 1; save();
      tone([880, 1175], 0.1);
      stopTimer(); left = total = S.secs; startTimer();
      toast('TAG! Speaker ' + S.speaker + ': go!', false);
    });
    $('reveal').addEventListener('click', function () {
      unlockAudio();
      var step = stepOf(S.pos) + 1;
      S.revealed[S.pos] = step; save();
      if (step < STEPS.length) { resetTimer(); render(); return; } // a middle step (e.g. hide the story): the timer can run again
      stopTimer(); tone([523, 659]); render();
      KruBonus.reveal();
      if (cfg.onReveal) cfg.onReveal(item());
    });
    $('next').addEventListener('click', function () {
      // no answer to reveal on this card: the secret bonus (if any) shows when moving on
      if (!canReveal(item())) KruBonus.reveal();
      goTo(S.pos + 1);
    });

    // ---------- ⋯ menu ----------
    function renderSecs() {
      if (!hasTimer) return;
      $('secsRow').innerHTML = cfg.timer.options.map(function (s) { return '<button class="btn" data-secs="' + s + '" aria-pressed="' + (s === S.secs) + '">' + fmt(s) + '</button>'; }).join('');
    }
    function closeMenu() { $('menuBack').hidden = true; }
    function disarm() { $('resetScores').classList.remove('armed'); $('resetScores').textContent = 'Reset all scores'; }
    $('more').addEventListener('click', function () { renderSecs(); $('undo').disabled = !S.log.length; $('prev').disabled = S.pos === 0; disarm(); $('menuBack').hidden = false; });
    $('menuClose').addEventListener('click', closeMenu);
    $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
    if (hasTimer) $('secsRow').addEventListener('click', function (e) {
      var b = e.target.closest('[data-secs]');
      if (!b) return;
      S.secs = +b.dataset.secs; save(); resetTimer(); renderSecs();
    });
    $('prev').addEventListener('click', function () { goTo(S.pos - 1); closeMenu(); });
    $('undo').addEventListener('click', function () { undo(); closeMenu(); });
    $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: cfg.title }); });
    $('resetScores').addEventListener('click', function () {
      var btn = this;
      if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again: all scores back to 0'; setTimeout(disarm, 3500); return; }
      teams.forEach(function (t) { if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'reset'); });
      S.pts = {}; S.log = [];
      save(); closeMenu(); renderTeams();
    });

    document.addEventListener('keydown', function (e) {
      if (!$('menuBack').hidden || !$('panelBack').hidden || (cfg.challenge && !$('chalBack').hidden)) return;
      if (e.code === 'Space' && hasTimer) { e.preventDefault(); $('go').click(); }
      else if (e.key === 'ArrowRight') $('next').click();
      else if ((e.key === 'a' || e.key === 'A') && !$('reveal').hidden) $('reveal').click();
    });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
    window.addEventListener('resize', fit);

    Kru.onFinishRequest(function () {
      Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
    });

    var getJson = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); };
    var contentReady = Promise.all([getJson('content.json'), cfg.extra ? getJson(cfg.extra) : null]);
    Kru.ready(function (session) {
      contentReady.then(function (both) {
        var c = both[0], extra = both[1];
        content = c;
        var level = c[session.level] || (extra && extra[session.level]) ? session.level : 'M.2';
        ITEMS = cfg.items(c, level, extra);
        teams = Kru.allTeams();
        KruBonus.setup({ cards: c.bonus, bar: $('more').parentNode, beforeEl: $('more'), teams: function () { return teams; }, save: function () { save(); },
          award: function (id, d, card) { addPoints(id, d, 'bonus: ' + card.name); } });
        if (!cfg.noScores) KruEnd.setup({ standings: function () { return teams.map(function (t) { return { name: t.name, points: pts(t.id), teacher: !!t.teacher }; }); } });
        if (cfg.picker) KruPicker.setup({ bar: $('more').parentNode, beforeEl: $('more'), teams: function () { return teams; },
          get: function () { return S.picked || []; }, set: function (ids) { S.picked = ids; save(); } });
        var saved = session.resume;
        if (saved && saved.v === 1 && saved.level === level && Array.isArray(saved.order) && saved.order.length === ITEMS.length) S = saved;
        else S = { v: 1, level: level, order: newOrder(), pos: 0, revealed: {}, secs: hasTimer ? cfg.timer.secs : 0, pts: {}, log: [], introDone: false };
        if (adjust) S.secs = Math.max(MIN, Math.min(MAX, S.secs || cfg.timer.secs));
        total = left = S.secs;
        render();
        INTRO = KruIntro.forLevel(c, level);
        if (!S.introDone) KruIntro.show(INTRO, { title: cfg.title }).then(function () { S.introDone = true; save(); });
      }).catch(function (err) {
        $('card').textContent = 'Could not load the cards. Close the game and open it again.';
        if (window.console) console.error(err);
      });
    });

    return { esc: esc };
  }

  window.KruCards = { start: start, esc: esc };
})();
