/**
 * Kru settings menu helpers (Henry, Nov 23), the same in every game:
 *
 *  - Every ⚙ menu (the one with a #menuClose button) loses its Close button. A round ✕ floats above the menu's
 *    top-right corner instead; tapping it runs the game's own close code.
 *  - New Game and End Game sit side by side at the very bottom of the menu (half width each). The game's own
 *    reset button (#restart, #resetScores, #newGame, #kbtReset) and #endGame are moved there.
 *  - KruMenu.timer(el, seconds, onChange, opts): the alarm-clock timer control, "− [ 30s ] +", 10-second steps.
 */
(function () {
  'use strict';
  var RESETS = ['restart', 'kbtReset', 'newGame', 'resetScores'];
  var X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" fill="none"/></svg>';
  var CLOCK = '<svg class="ktimer-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7.5" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
    '<path d="M12 8.8V13l3 1.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M3.6 6.4A4.6 4.6 0 0 1 8 3M20.4 6.4A4.6 4.6 0 0 0 16 3M6.2 20.2l-1.6 1.8M17.8 20.2l1.6 1.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  /** The game's reset button and End Game go side by side at the bottom of the menu. */
  function arrange(menu) {
    var foot = menu.querySelector('.kmenu-foot');
    if (!foot) { foot = document.createElement('div'); foot.className = 'kmenu-foot'; menu.appendChild(foot); }
    var reset = null;
    RESETS.forEach(function (id) { if (!reset) reset = document.getElementById(id); });
    [reset, document.getElementById('endGame')].forEach(function (b) {
      if (b && menu.contains(b) && b.parentNode !== foot) foot.appendChild(b);
    });
  }

  function enhance(close) {
    var menu = close.closest('.menu');
    if (!menu || menu.parentNode.classList.contains('kmenu-wrap')) return;
    var wrap = document.createElement('div');
    wrap.className = 'kmenu-wrap';
    menu.parentNode.insertBefore(wrap, menu);
    wrap.appendChild(menu);
    close.hidden = true; // the game still listens to it; the ✕ below presses it
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'kmenu-x'; x.setAttribute('aria-label', 'Close'); x.innerHTML = X;
    x.addEventListener('click', function () { close.click(); });
    wrap.appendChild(x);
    arrange(menu);
    // End Game arrives a moment later (KruEnd.setup): move it too
    new MutationObserver(function () { arrange(menu); }).observe(menu, { childList: true, subtree: true });
  }

  function scan() { var c = document.getElementById('menuClose'); if (c) enhance(c); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();

  /** Times are whole 10-second steps (old saved values like 45 snap to 50). */
  function snap(v, min, max) {
    var n = Math.round((Number(v) || 30) / 10) * 10;
    return Math.max(min || 10, Math.min(max || 300, n));
  }
  /** The alarm-clock timer control inside `el`: − [ 30s ] +. onChange(seconds) runs on every tap. */
  function timer(el, value, onChange, o) {
    o = o || {};
    var min = o.min || 10, max = o.max || 300, step = o.step || 10, v = snap(value, min, max);
    el.classList.add('ktimer');
    el.innerHTML = CLOCK +
      '<button type="button" class="btn" data-d="-1" aria-label="' + step + ' seconds less"' + (v <= min ? ' disabled' : '') + '>−</button>' +
      '<output aria-live="polite">' + v + 's</output>' +
      '<button type="button" class="btn" data-d="1" aria-label="' + step + ' seconds more"' + (v >= max ? ' disabled' : '') + '>+</button>';
    el._kt = { v: v, min: min, max: max, step: step, on: onChange };
    if (el._ktBound) return;
    el._ktBound = true;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]');
      if (!b || b.disabled) return;
      var t = el._kt, next = snap(t.v + Number(b.dataset.d) * t.step, t.min, t.max);
      if (next === t.v) return;
      t.on(next);
      timer(el, next, t.on, { min: t.min, max: t.max, step: t.step });
    });
  }

  window.KruMenu = { timer: timer, snap: snap, arrange: arrange };
})();
