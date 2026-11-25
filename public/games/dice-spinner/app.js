/* Dice, Spinner, Coin (a tool): 1-3 dice with 2-20 sides, a wheel with your own options, or a coin to flip.
   Choices are saved on the phone. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  // which of the 9 pip spots are on for 1-6
  var FACES = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  var PRESETS = [
    { name: 'Numbers 1–10', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
    { name: 'Yes / No', options: ['Yes', 'No'] },
    { name: 'Teams 1–6', options: ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Team 6'] },
    { name: 'Who starts?', options: ['Boys', 'Girls', 'Left side', 'Right side', 'Front row', 'Back row'] },
    { name: 'Rewards', options: ['+1 point', '+2 points', 'Free choice', 'Pick a song', 'Double points', 'Try again'] },
  ];

  var MIN_SIDES = 2, MAX_SIDES = 20;
  var S = { v: 1, tab: 'dice', dice: 1, sides: 6, options: PRESETS[0].options.slice(), noRepeat: false, out: [], coin: { heads: 0, tails: 0 } };
  var rolling = false, spinning = false, flipping = false, angle = 0, coinTurns = 0, audio = null;

  function save() { Kru.saveState(S); }
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function tone(f, dur) {
    if (!audio) return;
    try {
      var t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.06));
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.06) + 0.02);
    } catch (e) {}
  }

  function note(f, at, dur, vol, type) {
    if (!audio) return;
    try {
      var t = audio.currentTime + (at || 0), o = audio.createOscillator(), g = audio.createGain();
      o.type = type || 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.3));
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.3) + 0.03);
    } catch (e) {}
  }
  /** Someone was picked: a rising run, a big chord and a sparkle on top (much louder and longer than the old single beep). */
  function fanfare() {
    [523, 659, 784, 1047, 1319].forEach(function (f, i) { note(f, i * 0.09, 0.32, 0.36); });
    [523, 659, 784, 1047].forEach(function (f) { note(f, 0.5, 1.1, 0.2, 'sawtooth'); note(f / 2, 0.5, 1.1, 0.25, 'triangle'); });
    [1568, 2093, 1760, 2349].forEach(function (f, i) { note(f, 0.62 + i * 0.1, 0.25, 0.16); });
    if (audio) {
      try { // a boom
        var t = audio.currentTime + 0.5, o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
        g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.5);
      } catch (e) {}
    }
  }

  // ---------- random effects when a team is picked ----------
  var EFFECTS = ['confetti', 'fire', 'tornado', 'fireworks', 'stars', 'lightning', 'bubbles'];
  var fxRaf = 0;
  function runEffect(kind) {
    var c = $('fx'), st = $('spinStage');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cancelAnimationFrame(fxRaf);
    c.width = st.clientWidth; c.height = st.clientHeight;
    var ctx = c.getContext('2d'), W = c.width, H = c.height, parts = [], t0 = performance.now(), last = t0, spawnAcc = 0, flashes = [], bolt = null;
    var DUR = 3200;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function star(x, y, r, rot) {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * 0.45 : r, a = rot + (i * Math.PI) / 5; ctx.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr); }
      ctx.closePath(); ctx.fill();
    }
    if (kind === 'confetti') for (var i = 0; i < 170; i++) parts.push({ x: rnd(0, W), y: rnd(-H, 0), vx: rnd(-40, 40), vy: rnd(140, 340), w: rnd(8, 16), h: rnd(5, 10), r: rnd(0, 6), vr: rnd(-8, 8), c: COLORS[i % COLORS.length] });
    if (kind === 'stars') for (var j = 0; j < 70; j++) parts.push({ x: rnd(0, W), y: rnd(-H, 0), vx: rnd(-30, 30), vy: rnd(120, 300), s: rnd(8, 22), r: rnd(0, 6), vr: rnd(-4, 4) });
    if (kind === 'bubbles') for (var b = 0; b < 60; b++) parts.push({ x: rnd(0, W), y: rnd(H, H * 1.6), vy: -rnd(70, 220), s: rnd(8, 34), ph: rnd(0, 6) });
    if (kind === 'tornado') for (var k = 0; k < 150; k++) parts.push({ a: rnd(0, 6.28), h: Math.random(), w: rnd(2.5, 6), s: rnd(3, 7), tone: Math.floor(rnd(0, 3)) });
    if (kind === 'lightning') flashes = [0.15, 0.55, 0.95].map(function (t) { return t * 1000; });
    function makeBolt() { var x = rnd(W * 0.25, W * 0.75), y = 0, pts = [[x, y]]; while (y < H * 0.8) { x += rnd(-40, 40); y += rnd(30, 60); pts.push([x, y]); } return pts; }

    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000), t = now - t0; last = now;
      ctx.clearRect(0, 0, W, H);
      var fade = t > DUR - 600 ? Math.max(0, (DUR - t) / 600) : 1;
      ctx.globalAlpha = fade;
      if (kind === 'confetti') parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (kind === 'stars') parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; ctx.fillStyle = (Math.floor(t / 120) + p.s) % 2 ? '#ffd23f' : '#fff3b0'; star(p.x, p.y, p.s, p.r); });
      if (kind === 'bubbles') parts.forEach(function (p) { p.y += p.vy * dt; p.x += Math.sin(t / 300 + p.ph) * 0.8; ctx.strokeStyle = 'rgb(160 225 255 / 0.9)'; ctx.fillStyle = 'rgb(160 225 255 / 0.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); ctx.stroke(); });
      if (kind === 'fire') {
        spawnAcc += dt * 140;
        while (spawnAcc > 1) { spawnAcc--; if (t < DUR - 900) parts.push({ x: rnd(0, W), y: H + 10, vx: rnd(-25, 25), vy: -rnd(160, 380), s: rnd(16, 38), life: 0, max: rnd(0.8, 1.5) }); }
        ctx.globalCompositeOperation = 'lighter';
        parts = parts.filter(function (p) { p.life += dt; return p.life < p.max; });
        parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; var u = p.life / p.max, g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * (1 - u * 0.5)); g.addColorStop(0, 'rgb(255 240 150 / ' + (0.9 * (1 - u)) + ')'); g.addColorStop(0.5, 'rgb(255 120 20 / ' + (0.7 * (1 - u)) + ')'); g.addColorStop(1, 'rgb(200 20 0 / 0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); });
        ctx.globalCompositeOperation = 'source-over';
      }
      if (kind === 'tornado') {
        var cx = W / 2 + Math.sin(t / 400) * 40;
        parts.forEach(function (p) { p.a += dt * (6 + (1 - p.h) * 8); var rad = 12 + p.h * Math.min(W, H) * 0.34, x = cx + Math.cos(p.a) * rad + Math.sin(t / 250 + p.h * 4) * 10, y = H - p.h * H * 0.95; ctx.fillStyle = ['#c9d3df', '#8fa0b3', '#e8eef5'][p.tone]; ctx.globalAlpha = fade * (0.55 + 0.45 * Math.sin(p.a)); ctx.beginPath(); ctx.ellipse(x, y, p.w * 2.2, p.w, 0, 0, 6.28); ctx.fill(); });
      }
      if (kind === 'fireworks') {
        spawnAcc += dt;
        if (spawnAcc > 0.32 && t < DUR - 900) { spawnAcc = 0; var bx = rnd(W * 0.15, W * 0.85), by = rnd(H * 0.12, H * 0.55), hue = rnd(0, 360); for (var q = 0; q < 44; q++) { var ang = (q / 44) * 6.28, sp = rnd(90, 230); parts.push({ x: bx, y: by, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: rnd(0.9, 1.5), hue: hue + rnd(-25, 25) }); } }
        parts = parts.filter(function (p) { p.life += dt; return p.life < p.max; });
        parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; ctx.globalAlpha = fade * (1 - p.life / p.max); ctx.fillStyle = 'hsl(' + p.hue + ' 100% 62%)'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, 6.28); ctx.fill(); });
      }
      if (kind === 'lightning') {
        flashes.forEach(function (f) {
          var u = t - f;
          if (u >= 0 && u < 220) {
            if (!bolt || bolt.at !== f) bolt = { at: f, pts: makeBolt() };
            ctx.globalAlpha = fade * (1 - u / 220) * 0.55; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = fade; ctx.strokeStyle = '#fff6b0'; ctx.shadowColor = '#7fb2ff'; ctx.shadowBlur = 24; ctx.lineWidth = 6; ctx.beginPath();
            bolt.pts.forEach(function (p2, ix) { ix ? ctx.lineTo(p2[0], p2[1]) : ctx.moveTo(p2[0], p2[1]); }); ctx.stroke(); ctx.shadowBlur = 0;
          }
        });
      }
      ctx.globalAlpha = 1;
      if (t < DUR) fxRaf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    }
    fxRaf = requestAnimationFrame(frame);
  }
  var popTimer = 0;
  function announce(text) {
    $('pickName').textContent = text;
    $('pickPop').hidden = false;
    clearTimeout(popTimer);
    popTimer = setTimeout(function () { $('pickPop').hidden = true; }, 4500);
    fanfare();
    runEffect(EFFECTS[Math.floor(Math.random() * EFFECTS.length)]);
  }
  $('pickPop').addEventListener('click', function () { $('pickPop').hidden = true; clearTimeout(popTimer); });

  // ---------- tabs ----------
  function showTab(t) {
    S.tab = t; save();
    $('tabDice').setAttribute('aria-pressed', String(t === 'dice'));
    $('tabSpin').setAttribute('aria-pressed', String(t === 'spin'));
    $('tabCoin').setAttribute('aria-pressed', String(t === 'coin'));
    $('diceView').hidden = t !== 'dice';
    $('spinView').hidden = t !== 'spin';
    $('coinView').hidden = t !== 'coin';
    $('edit').hidden = t !== 'spin';
    if (t === 'spin') drawWheel(); else if (t === 'coin') renderCoin(); else renderDice();
  }
  $('tabDice').addEventListener('click', function () { showTab('dice'); });
  $('tabSpin').addEventListener('click', function () { showTab('spin'); });
  $('tabCoin').addEventListener('click', function () { showTab('coin'); });

  // ---------- dice ----------
  var faces = [1];
  function dieHtml(n) {
    if (S.sides !== 6) return '<div class="die num' + (rolling ? ' rolling' : '') + '" aria-label="' + n + '"><span>' + n + '</span></div>';
    var on = FACES[n];
    var pips = '';
    for (var i = 0; i < 9; i++) pips += '<span class="pip' + (on.indexOf(i) >= 0 ? ' on' : '') + '"></span>';
    return '<div class="die' + (rolling ? ' rolling' : '') + '" aria-label="' + n + '">' + pips + '</div>';
  }
  function renderDice() {
    while (faces.length < S.dice) faces.push(1);
    faces = faces.slice(0, S.dice);
    $('dice').innerHTML = faces.map(dieHtml).join('');
    $('count').textContent = S.dice;
    $('fewer').disabled = S.dice <= 1 || rolling;
    $('moreDice').disabled = S.dice >= 3 || rolling;
    $('sides').textContent = S.sides;
    $('fewerSides').disabled = S.sides <= MIN_SIDES || rolling;
    $('moreSides').disabled = S.sides >= MAX_SIDES || rolling;
    $('total').textContent = rolling || S.dice === 1 ? '' : 'Total: ' + faces.reduce(function (a, b) { return a + b; }, 0);
    // smaller dice when there are 3
    var size = S.dice === 3 ? 120 : 150;
    Array.prototype.forEach.call(document.querySelectorAll('.die'), function (d) { d.style.width = d.style.height = size + 'px'; });
  }
  function roll() {
    if (rolling) return;
    unlockAudio();
    rolling = true;
    var k = 0;
    (function step() {
      faces = faces.map(function () { return 1 + Math.floor(Math.random() * S.sides); });
      renderDice();
      tone(300 + k * 40);
      if (++k < 10) setTimeout(step, 50 + k * 12);
      else { rolling = false; renderDice(); tone(880, 0.2); }
    })();
  }
  $('roll').addEventListener('click', roll);
  $('fewer').addEventListener('click', function () { S.dice = Math.max(1, S.dice - 1); save(); renderDice(); });
  $('moreDice').addEventListener('click', function () { S.dice = Math.min(3, S.dice + 1); save(); renderDice(); });
  function setSides(n) {
    S.sides = Math.max(MIN_SIDES, Math.min(MAX_SIDES, n));
    faces = faces.map(function (f) { return Math.min(f, S.sides); });
    save(); renderDice();
  }
  $('fewerSides').addEventListener('click', function () { setSides(S.sides - 1); });
  $('moreSides').addEventListener('click', function () { setSides(S.sides + 1); });

  // ---------- coin ----------
  function renderCoin() {
    var c = S.coin, n = c.heads + c.tails;
    $('tally').textContent = n ? 'Heads ' + c.heads + ' · Tails ' + c.tails : '';
  }
  function flip() {
    if (flipping) return;
    unlockAudio();
    flipping = true;
    $('flip').disabled = true;
    var heads = Math.random() < 0.5;
    // whole turns so it lands the right way up: even half-turns = heads
    coinTurns += 10 + (heads === (coinTurns % 2 === 0) ? 0 : 1);
    var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('coin').style.transform = 'rotateY(' + coinTurns * 180 + 'deg)';
    $('coinResult').className = 'coin-result waiting';
    $('coinResult').textContent = 'Flipping…';
    var k = 0, ticks = setInterval(function () { tone(700 + (k++ % 2) * 200, 0.03); }, 110);
    setTimeout(function () {
      clearInterval(ticks);
      flipping = false;
      $('flip').disabled = false;
      S.coin[heads ? 'heads' : 'tails']++; save();
      $('coinResult').className = 'coin-result';
      $('coinResult').textContent = heads ? 'Heads!' : 'Tails!';
      tone(988, 0.25);
      renderCoin();
    }, calm ? 50 : 1600);
  }
  $('flip').addEventListener('click', flip);

  // ---------- spinner ----------
  function live() { return S.options.filter(function (o, i) { return S.out.indexOf(i) < 0; }).length ? S.options.map(function (o, i) { return i; }).filter(function (i) { return S.out.indexOf(i) < 0; }) : []; }
  function drawWheel() {
    var c = $('wheel'), ctx = c.getContext('2d'), list = live(), n = list.length, r = c.width / 2;
    ctx.clearRect(0, 0, c.width, c.height);
    $('refill').hidden = !S.out.length;
    $('norepeat').textContent = "Don't repeat: " + (S.noRepeat ? 'on' : 'off');
    $('norepeat').setAttribute('aria-pressed', String(S.noRepeat));
    $('spin').disabled = n < 1 || spinning;
    if (!n) return;
    var slice = (Math.PI * 2) / n;
    list.forEach(function (idx, i) {
      var a0 = -Math.PI / 2 + i * slice;
      ctx.beginPath(); ctx.moveTo(r, r); ctx.arc(r, r, r - 4, a0, a0 + slice); ctx.closePath();
      ctx.fillStyle = COLORS[idx % COLORS.length]; ctx.fill();
      ctx.strokeStyle = '#17151f'; ctx.lineWidth = 4; ctx.stroke();
      // label along the middle of the slice
      ctx.save(); ctx.translate(r, r); ctx.rotate(a0 + slice / 2);
      ctx.fillStyle = '#17151f'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      var size = Math.max(18, Math.min(44, Math.floor(420 / Math.max(6, n))));
      ctx.font = '800 ' + size + 'px Bricolage Grotesque, Poppins, sans-serif';
      var text = S.options[idx]; if (text.length > 14) text = text.slice(0, 13) + '…';
      ctx.fillText(text, r - 22, 0);
      ctx.restore();
    });
  }
  function spin() {
    var list = live();
    if (spinning || list.length < 1) return;
    unlockAudio();
    spinning = true;
    $('spin').disabled = true;
    var n = list.length, slice = 360 / n, pick = Math.floor(Math.random() * n);
    // the wheel turns clockwise; slice i covers [i*slice, (i+1)*slice) from the top
    var target = 360 - (pick * slice + slice / 2) + (Math.random() - 0.5) * slice * 0.6;
    var turns = 14 * 360;
    var base = angle - (angle % 360);
    angle = base + turns + target;
    $('wheel').style.transform = 'rotate(' + angle + 'deg)';
    $('pickPop').hidden = true;
    $('wheel').parentNode.classList.add('spinning');
    $('result').className = 'result waiting';
    $('result').textContent = 'Spinning…';
    var tickT = 0, ticks = 0, tickDelay = 40, tick = 0;
    (function ticker() { tone(480 + (ticks++ % 4) * 70, 0.03); tickT += tickDelay; tickDelay *= 1.07; if (tickT < 4200 && spinning) tick = setTimeout(ticker, tickDelay); })();
    setTimeout(function () {
      clearTimeout(tick);
      spinning = false;
      $('wheel').parentNode.classList.remove('spinning');
      var idx = list[pick];
      $('result').className = 'result';
      $('result').textContent = S.options[idx];
      announce(S.options[idx]);
      if (S.noRepeat) {
        S.out.push(idx); save();
        // redraw without it, keeping the wheel where it stopped
        setTimeout(function () { $('wheel').style.transition = 'none'; angle = 0; $('wheel').style.transform = 'rotate(0deg)'; drawWheel(); $('wheel').offsetWidth; $('wheel').style.transition = ''; }, 900);
        $('note').textContent = live().length > 1 ? live().length + ' left on the wheel' : live().length === 1 ? 'Last one! You can still spin it.' : 'Everyone has had a turn! Tap "Put them all back".';
      } else $('note').textContent = '';
      drawWheel();
    }, 4500);
  }
  $('spin').addEventListener('click', spin);
  $('norepeat').addEventListener('click', function () { S.noRepeat = !S.noRepeat; if (!S.noRepeat) S.out = []; save(); drawWheel(); });
  $('refill').addEventListener('click', function () { S.out = []; save(); $('note').textContent = ''; drawWheel(); });

  // ---------- options editor ----------
  function openEdit() {
    $('presets').innerHTML = PRESETS.map(function (p, i) { return '<button class="btn ghost" data-p="' + i + '">' + p.name + '</button>'; }).join('');
    $('options').value = S.options.join('\n');
    $('editBack').hidden = false;
  }
  function saveEdit() {
    var list = $('options').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 24);
    if (list.length < 2) { $('options').focus(); return; }
    S.options = list; S.out = []; save();
    $('editBack').hidden = true;
    $('result').className = 'result waiting'; $('result').textContent = 'Tap Spin!'; $('note').textContent = '';
    drawWheel();
  }
  $('edit').addEventListener('click', openEdit);
  $('presets').addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]');
    if (b) $('options').value = PRESETS[+b.dataset.p].options.join('\n');
  });
  $('editSave').addEventListener('click', saveEdit);
  $('editSave2').addEventListener('click', saveEdit);
  $('editCancel').addEventListener('click', function () { $('editBack').hidden = true; });

  document.addEventListener('keydown', function (e) {
    if (!$('editBack').hidden) return;
    if (e.code === 'Space') { e.preventDefault(); S.tab === 'dice' ? roll() : S.tab === 'coin' ? flip() : spin(); }
  });

  Kru.ready(function (session) {
    var r = session.resume;
    if (r && r.v === 1 && Array.isArray(r.options) && r.options.length >= 2) S = r;
    S.out = S.out || [];
    S.sides = S.sides >= MIN_SIDES && S.sides <= MAX_SIDES ? S.sides : 6; // older saves: 6-sided
    S.coin = S.coin || { heads: 0, tails: 0 };
    renderDice();
    $('result').className = 'result waiting';
    showTab(S.tab === 'spin' || S.tab === 'coin' ? S.tab : 'dice');
  });
})();
