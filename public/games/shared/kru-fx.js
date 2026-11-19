/**
 * Kru big event banners (Henry, Nov 19): the Quiz Island style "moments" for any game, themed per game.
 *
 *   KruFx.theme('race')                        // race | xmas | show | lab | arena | library | quill
 *   KruFx.show({ art: 'trophy', title: 'FINISH LINE!', sub: 'Team 2 finishes 1st!', delta: 3, mood: 'good', then: fn })
 *   KruFx.flash({ title: '+2', sub: 'Team 3', mood: 'good' })   // a quick one that never blocks a tap
 *   KruFx.after(fn)                            // run fn once the banners on screen are done
 *
 * art: a name from window.KruFxArt (kru-fx-art.js) or an SVG string. mood: good | bad | boom | magic.
 * A banner waits ~2.2 s (or a tap), banners queue up, and `then` runs when that banner has gone.
 * Sounds play only after the first tap on the page (iOS). Reduce Motion: no movement, same banners.
 */
(function () {
  'use strict';
  var BITS = { race: '🏁', xmas: '❄', show: '★', lab: '⚡', arena: '⚔', library: '📖', quill: '✒', '': '★' };
  var themeName = '', box = null, flashBox = null, queue = [], on = false, timer = 0, done = null, audio = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function art(a, color) {
    if (!a) return '';
    if (a.charAt && a.charAt(0) === '<') return a;
    var f = (window.KruFxArt || {})[a];
    return f ? f(color) : '';
  }

  // ---------- sound (the page's first tap unlocks it) ----------
  function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  document.addEventListener('pointerdown', unlock, true);
  function tone(freqs, gap, dur, type) {
    if (!audio) return;
    try {
      freqs.forEach(function (f, i) {
        var t = audio.currentTime + i * (gap || 0.12), o = audio.createOscillator(), g = audio.createGain();
        o.type = type || 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.25));
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.25) + 0.05);
      });
    } catch (e) {}
  }
  function boom() {
    if (!audio) return;
    try {
      var t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.55);
      g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.65);
    } catch (e) {}
  }
  var SOUND = {
    good: function () { tone([523, 659, 784, 1047], 0.08, 0.3); },
    bad: function () { tone([330, 262, 196], 0.16, 0.4); },
    boom: boom,
    magic: function () { tone([784, 988, 1175, 1568], 0.07, 0.3, 'sine'); },
    fanfare: function () { tone([523, 523, 659, 784, 1047], 0.11, 0.35); },
  };

  // ---------- the big banner ----------
  function build() {
    if (box) return;
    box = document.createElement('div');
    box.className = 'kfx'; box.hidden = true; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'assertive');
    box.innerHTML = '<div class="kfx-rays"></div><div class="kfx-bits"></div><div class="kfx-card"><div class="kfx-art"></div><div class="kfx-text">' +
      '<div class="kfx-title"></div><div class="kfx-sub"></div><div class="kfx-delta" hidden></div></div></div><div class="kfx-tap">tap to continue</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function () { clearTimeout(timer); next(); });
    flashBox = document.createElement('div');
    flashBox.className = 'kfx-flash'; flashBox.hidden = true; flashBox.setAttribute('aria-hidden', 'true');
    document.body.appendChild(flashBox);
  }
  function next() {
    var o = queue.shift();
    if (!o) {
      on = false; box.hidden = true;
      var d = done; done = null; if (d) d();
      return;
    }
    on = true;
    box.className = 'kfx t-' + (themeName || 'none') + ' ' + (o.mood || 'good');
    box.querySelector('.kfx-art').innerHTML = art(o.art, o.color);
    box.querySelector('.kfx-title').textContent = o.title || '';
    box.querySelector('.kfx-sub').textContent = o.sub || '';
    var dl = box.querySelector('.kfx-delta');
    dl.hidden = !o.delta;
    if (o.delta) countUp(dl, o.delta, o.unit || '');
    var bit = o.mood === 'bad' ? '' : BITS[themeName] || '★';
    box.querySelector('.kfx-bits').innerHTML = bit ? Array.apply(null, Array(12)).map(function (_, i) {
      return '<i style="--a:' + (i * 30) + 'deg;--d:' + (130 + (i % 3) * 40) + 'px;--t:' + (i % 4) * 0.05 + 's">' + bit + '</i>';
    }).join('') : '';
    box.hidden = false;
    box.classList.remove('go'); void box.offsetWidth; box.classList.add('go');
    var snd = SOUND[o.sound || o.mood];
    if (snd) snd();
    clearTimeout(timer);
    timer = setTimeout(next, o.wait || 2200);
    if (o.then) done = chain(done, o.then);
  }
  function chain(a, b) { return a ? function () { a(); b(); } : b; }
  function countUp(el, v, unit) {
    var sign = v > 0 ? '+' : '−', n = Math.abs(v), t0 = performance.now();
    el.className = 'kfx-delta ' + (v > 0 ? 'up' : 'down');
    (function step(t) {
      var k = Math.min(1, ((t || t0) - t0) / 500);
      el.textContent = sign + Math.round(n * k) + (unit ? ' ' + unit : '');
      if (k < 1) requestAnimationFrame(step);
    })();
  }

  window.KruFx = {
    theme: function (name) { themeName = name || ''; },
    show: function (o) { build(); queue.push(o); if (!on) next(); },
    /** A quick banner at the top that never blocks a tap (e.g. points for one team). */
    flash: function (o) {
      build();
      flashBox.className = 'kfx-flash t-' + (themeName || 'none') + ' ' + (o.mood || 'good');
      flashBox.innerHTML = (o.art ? '<span class="kfx-fart">' + art(o.art, o.color) + '</span>' : '') + '<b>' + esc(o.title) + '</b>' + (o.sub ? '<span>' + esc(o.sub) + '</span>' : '');
      flashBox.hidden = false;
      flashBox.classList.remove('go'); void flashBox.offsetWidth; flashBox.classList.add('go');
      var snd = SOUND[o.sound || ''];
      if (snd) snd();
      clearTimeout(flashBox._t);
      flashBox._t = setTimeout(function () { flashBox.hidden = true; }, o.wait || 1400);
    },
    after: function (f) { if (on) done = chain(done, f); else f(); },
    busy: function () { return on; },
  };
})();
