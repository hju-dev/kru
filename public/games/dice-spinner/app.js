/* Dice & Spinner (a tool): 1-3 dice, or a wheel with your own options (saved on the phone). */
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

  var S = { v: 1, tab: 'dice', dice: 1, options: PRESETS[0].options.slice(), noRepeat: false, out: [] };
  var rolling = false, spinning = false, angle = 0, audio = null;

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

  // ---------- tabs ----------
  function showTab(t) {
    S.tab = t; save();
    $('tabDice').setAttribute('aria-pressed', String(t === 'dice'));
    $('tabSpin').setAttribute('aria-pressed', String(t === 'spin'));
    $('diceView').hidden = t !== 'dice';
    $('spinView').hidden = t !== 'spin';
    $('edit').hidden = t !== 'spin';
    if (t === 'spin') drawWheel(); else renderDice();
  }
  $('tabDice').addEventListener('click', function () { showTab('dice'); });
  $('tabSpin').addEventListener('click', function () { showTab('spin'); });

  // ---------- dice ----------
  var faces = [1];
  function dieHtml(n) {
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
      faces = faces.map(function () { return 1 + Math.floor(Math.random() * 6); });
      renderDice();
      tone(300 + k * 40);
      if (++k < 10) setTimeout(step, 50 + k * 12);
      else { rolling = false; renderDice(); tone(880, 0.2); }
    })();
  }
  $('roll').addEventListener('click', roll);
  $('fewer').addEventListener('click', function () { S.dice = Math.max(1, S.dice - 1); save(); renderDice(); });
  $('moreDice').addEventListener('click', function () { S.dice = Math.min(3, S.dice + 1); save(); renderDice(); });

  // ---------- spinner ----------
  function live() { return S.options.filter(function (o, i) { return S.out.indexOf(i) < 0; }).length ? S.options.map(function (o, i) { return i; }).filter(function (i) { return S.out.indexOf(i) < 0; }) : []; }
  function drawWheel() {
    var c = $('wheel'), ctx = c.getContext('2d'), list = live(), n = list.length, r = c.width / 2;
    ctx.clearRect(0, 0, c.width, c.height);
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
    $('refill').hidden = !S.out.length;
    $('norepeat').textContent = "Don't repeat: " + (S.noRepeat ? 'on' : 'off');
    $('norepeat').setAttribute('aria-pressed', String(S.noRepeat));
    $('spin').disabled = n < 2 || spinning;
  }
  function spin() {
    var list = live();
    if (spinning || list.length < 2) return;
    unlockAudio();
    spinning = true;
    $('spin').disabled = true;
    var n = list.length, slice = 360 / n, pick = Math.floor(Math.random() * n);
    // the wheel turns clockwise; slice i covers [i*slice, (i+1)*slice) from the top
    var target = 360 - (pick * slice + slice / 2) + (Math.random() - 0.5) * slice * 0.6;
    var turns = 5 * 360;
    var base = angle - (angle % 360);
    angle = base + turns + target;
    $('wheel').style.transform = 'rotate(' + angle + 'deg)';
    $('result').className = 'result waiting';
    $('result').textContent = 'Spinning…';
    var ticks = 0, tick = setInterval(function () { tone(500 + (ticks++ % 3) * 60, 0.03); }, 140);
    setTimeout(function () {
      clearInterval(tick);
      spinning = false;
      var idx = list[pick];
      $('result').className = 'result';
      $('result').textContent = S.options[idx];
      tone(988, 0.25);
      if (S.noRepeat) {
        S.out.push(idx); save();
        // redraw without it, keeping the wheel where it stopped
        setTimeout(function () { $('wheel').style.transition = 'none'; angle = 0; $('wheel').style.transform = 'rotate(0deg)'; drawWheel(); $('wheel').offsetWidth; $('wheel').style.transition = ''; }, 900);
        $('note').textContent = live().length > 1 ? live().length + ' left on the wheel' : 'Last one! Tap "Put them all back" to start again.';
      } else $('note').textContent = '';
      drawWheel();
    }, 3300);
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
    if (e.code === 'Space') { e.preventDefault(); S.tab === 'dice' ? roll() : spin(); }
  });

  Kru.ready(function (session) {
    var r = session.resume;
    if (r && r.v === 1 && Array.isArray(r.options) && r.options.length >= 2) S = r;
    S.out = S.out || [];
    renderDice();
    $('result').className = 'result waiting';
    showTab(S.tab === 'spin' ? 'spin' : 'dice');
  });
})();
