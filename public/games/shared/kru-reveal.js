/**
 * KruReveal (Henry, Nov 25): the "meet your ride" cut scene. Each team in turn gets a surprise: a door rolls up (a garage,
 * Santa's workshop, a captain's cabin) and a randomly picked vehicle / mascot drives or steps out, with a rumble, a fanfare and
 * confetti. Nobody gets the same one twice.
 *
 *   KruReveal.run({
 *     skin: 'garage' | 'workshop' | 'cabin',
 *     title: 'Meet your racers!', sign: 'GARAGE',
 *     teams: [{ id, name }],                       // the teams, in the order they are revealed
 *     pool: [{ name, color }],                     // every possible ride (any number; teams get different ones)
 *     art: function (poolIndex, color) -> svg html // the picture that comes out of the door
 *     badge: function (team, color) -> html        // optional: the team's number badge
 *     labels: { open, next, start, who },          // optional button / caption words
 *     choices: [{ id, label, sub, pool: [poolIndex...] }]   // optional: each team first picks a style, then draws from that pool
 *     palette: [colors]                            // optional: with choices, a repeated vehicle gets an unused colour from here
 *     done: function (assign, colors)              // assign = { teamId: poolIndex }, colors = { teamId: colour } (choices only)
 *   })
 *   KruReveal.draw(count, poolSize) -> [poolIndex...]   (pure: different random picks, for tests)
 * Skip ▶ gives every remaining team a random ride at once. Reduce Motion: no door movement, same result.
 */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; } return a; }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  /** `count` different picks out of `poolSize` (wraps round only when there are more teams than rides). */
  function draw(count, poolSize) {
    var out = [], bag = [];
    for (var i = 0; i < count; i++) { if (!bag.length) bag = shuffle(range(poolSize)); out.push(bag.shift()); }
    return out;
  }

  // ---------- sound (the first tap unlocks it on iPhone) ----------
  var audio = null;
  function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  document.addEventListener('pointerdown', unlock, true);
  function note(f, at, dur, vol, type) {
    if (!audio) return;
    try {
      var t = audio.currentTime + (at || 0), o = audio.createOscillator(), g = audio.createGain();
      o.type = type || 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.2));
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.2) + 0.05);
    } catch (e) {}
  }
  function rumble() { // the door rolling up: a low growl that rises
    if (!audio) return;
    try {
      var t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(48, t); o.frequency.exponentialRampToValueAtTime(130, t + 1.5);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 1.75);
    } catch (e) {}
  }
  function fanfare() { [523, 659, 784].forEach(function (f, i) { note(f, i * 0.12, 0.22, 0.32); }); [523, 659, 784, 1047].forEach(function (f) { note(f, 0.4, 1, 0.2); }); }

  var CONFETTI = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#F6F3EC'];
  var box = null, timers = [];
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function clear() { timers.forEach(clearTimeout); timers = []; }

  function run(cfg) {
    var teams = cfg.teams || [], pool = cfg.pool || [];
    if (!teams.length || !pool.length) { if (cfg.done) cfg.done({}); return; }
    if (box) box.remove();
    clear(); unlock();
    var L = Object.assign({ open: 'Open the door ▶', next: 'Next team ▶', start: 'Start! ▶', who: 'gets', skip: 'Skip ▶' }, cfg.labels || {});
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var choices = cfg.choices && cfg.choices.length ? cfg.choices : null, assign = {}, colors = {}, bags = {}, usedColors = {};
    if (!choices) { var picks = draw(teams.length, pool.length); teams.forEach(function (t, i) { assign[t.id] = picks[i]; }); }
    /** Choice mode: a team's pick of Typical / Wildcard gives it a vehicle from that pool (no repeats until the pool is used up) in its own colour. */
    function give(t, choice) {
      if (!bags[choice.id] || !bags[choice.id].length) bags[choice.id] = shuffle(choice.pool);
      var idx = bags[choice.id].shift(), col = pool[idx].color;
      if (usedColors[col]) { var spare = (cfg.palette || []).filter(function (x) { return !usedColors[x]; }); if (spare.length) col = spare[0]; }
      usedColors[col] = 1; assign[t.id] = idx; colors[t.id] = col;
    }
    if (choices && choices.length === 1) teams.forEach(function (t) { give(t, choices[0]); }); // one pool: no pick screen
    var at = 0, opened = false;

    box = document.createElement('div');
    box.className = 'krv skin-' + (cfg.skin || 'garage');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', cfg.title || 'Meet your ride');
    box.innerHTML = '<button class="krv-skip" type="button">' + esc(L.skip) + '</button>' +
      '<div class="krv-head"><span class="krv-title">' + esc(cfg.title || 'Meet your ride!') + '</span><span class="krv-count"></span></div>' +
      '<div class="krv-stage"><div class="krv-frame"><div class="krv-sign">' + esc(cfg.sign || '') + '</div>' +
      '<div class="krv-inside"><div class="krv-spot"></div><div class="krv-item"></div></div><div class="krv-door"><i></i></div></div></div>' +
      '<div class="krv-who"><span class="krv-team"></span><span class="krv-name" aria-live="polite"></span></div>' +
      '<div class="krv-pick" hidden></div>' +
      '<div class="krv-btns"><button class="krv-go" type="button"></button></div>';
    document.body.appendChild(box);
    var q = function (s) { return box.querySelector(s); };

    function showTeam(i) {
      var t = teams[i];
      opened = false;
      box.classList.remove('shake', 'open', 'shown');
      q('.krv-count').textContent = 'Team ' + (i + 1) + ' of ' + teams.length;
      var choosing = !!choices && assign[t.id] == null;
      box.classList.toggle('choosing', choosing);
      q('.krv-pick').hidden = !choosing;
      if (choosing) {
        q('.krv-pick').innerHTML = choices.map(function (c) {
          return '<button type="button" class="krv-opt" data-c="' + esc(c.id) + '"><b>' + esc(c.label) + '</b><span>' + esc(c.sub || '') + '</span>' +
            '<em>' + c.pool.map(function (k) { return '<i>' + cfg.art(k, '#c9ced6') + '</i>'; }).join('') + '</em></button>';
        }).join('');
      }
      q('.krv-team').innerHTML = (cfg.badge ? cfg.badge(t, '#8a8fa0') + ' ' : '') + '<b>' + esc(t.name) + '</b>';
      q('.krv-name').textContent = choosing ? (L.choose || 'Pick a style!') : '?';
      q('.krv-item').innerHTML = '';
      q('.krv-go').textContent = L.open;
      q('.krv-go').focus();
    }
    function open() {
      if (opened) return;
      opened = true;
      var idx = assign[teams[at].id], p = pool[idx], col = colors[teams[at].id] || p.color;
      p = { name: p.name, color: col };
      q('.krv-item').innerHTML = cfg.art(idx, col);
      box.style.setProperty('--ride', col);
      q('.krv-go').disabled = true;
      rumble();
      if (calm) { box.classList.add('open', 'shown'); reveal(p); return; }
      box.classList.add('shake');
      later(550, function () { box.classList.remove('shake'); box.classList.add('open'); });
      later(2000, function () { box.classList.add('shown'); reveal(p); });
    }
    function reveal(p) {
      q('.krv-name').innerHTML = esc(L.who) + ' <b style="color:' + esc(p.color) + '">' + esc(p.name) + '!</b>';
      var last = at >= teams.length - 1;
      q('.krv-go').textContent = last ? L.start : L.next;
      q('.krv-go').disabled = false;
      fanfare();
      if (!calm) {
        var layer = document.createElement('div');
        layer.className = 'krv-confetti';
        var h = '';
        for (var i = 0; i < 50; i++) h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + CONFETTI[i % CONFETTI.length] + ';animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's;animation-duration:' + (1.8 + Math.random() * 1.4).toFixed(2) + 's;--x:' + Math.round(Math.random() * 100 - 50) + 'px"></i>';
        layer.innerHTML = h;
        box.appendChild(layer);
        later(3600, function () { layer.remove(); });
      }
    }
    function finish() {
      clear();
      if (box) { box.remove(); box = null; }
      if (choices) teams.forEach(function (t) { if (assign[t.id] == null) give(t, choices[Math.floor(Math.random() * choices.length)]); }); // Skip: random style for every team that has not picked
      if (cfg.done) cfg.done(assign, colors);
    }
    box.addEventListener('click', function (e) {
      if (e.target.closest('.krv-skip')) { finish(); return; }
      var opt = e.target.closest('.krv-opt');
      if (opt) {
        give(teams[at], choices.filter(function (c) { return c.id === opt.dataset.c; })[0]);
        showTeam(at);
        return;
      }
      if (!e.target.closest('.krv-go')) return;
      if (!opened) open();
      else if (at < teams.length - 1) { at++; showTeam(at); }
      else finish();
    });
    showTeam(0);
  }

  window.KruReveal = { run: run, draw: draw };
})();
