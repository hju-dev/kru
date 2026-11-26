/**
 * Animated pop-up scenes (Henry, Nov 26; CSS in kru-scene.css). Used by kru-fx.js (Quiz Grand Prix, North Pole Grand Prix,
 * the Battle games, Think Tank) and by Quiz Island's own banner.
 *
 *   KruScene.wrap(kind, svg)         -> the picture inside a moving scene (zoom | spinout | boom | bounce | spin | tumble |
 *                                       shake | ripple | wobble | swim | pop)
 *   KruScene.kindFor(artName, mood)  -> a fitting scene for a KruFxArt name, else one for the mood
 *   KruScene.extras(card, mood)      -> adds a shine across the card, confetti (good / magic) or a white flash (boom)
 */
(function () {
  'use strict';
  var KINDS = ['zoom', 'spinout', 'boom', 'bounce', 'spin', 'tumble', 'shake', 'ripple', 'wobble', 'swim', 'pop'];
  // the art names of kru-fx-art.js
  var BY_ART = {
    trophy: 'bounce', star: 'spin', cross: 'shake', dice: 'tumble', stopwatch: 'wobble', ticket: 'wobble', shield: 'ripple',
    fifty: 'pop', flame: 'boom', crown: 'bounce', hourglass: 'tumble', medal: 'spin', checkflag: 'wobble', rocket: 'zoom',
    oil: 'spinout', cone: 'shake', pit: 'shake', gift: 'bounce', coal: 'shake', sleigh: 'zoom', snowflake: 'spin', tree: 'bounce',
    spotlight: 'pop', buzzer: 'shake', double: 'pop', bulb: 'pop', flask: 'wobble', brain: 'pop', chips: 'spin', swords: 'boom',
    book: 'pop', quill: 'wobble', scroll: 'pop',
  };
  var BY_MOOD = { good: 'pop', bad: 'shake', boom: 'boom', magic: 'spin', sea: 'swim' };
  var COLORS = ['#ff6b6b', '#ffd23f', '#4cc9f0', '#a7d129', '#c79bff', '#ff9f1c', '#ffffff'];

  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function wrap(kind, svg) {
    if (!svg) return '';
    if (KINDS.indexOf(kind) < 0) kind = 'pop';
    return '<div class="ksc ksc-' + kind + '">' + svg + '<i class="ksc-a"></i><i class="ksc-b"></i><i class="ksc-c"></i><i class="ksc-d"></i></div>';
  }
  function kindFor(art, mood) {
    if (typeof art === 'string' && BY_ART[art]) return BY_ART[art];
    return BY_MOOD[mood] || 'pop';
  }
  /** card = the pop-up card element; overlay = the full-screen pop-up (for confetti and the flash). */
  function extras(card, overlay, mood) {
    [card, overlay].forEach(function (el) {
      if (!el) return;
      Array.prototype.slice.call(el.querySelectorAll(':scope > .ksc-shine, :scope > .ksc-confetti, :scope > .ksc-flashbg')).forEach(function (x) { x.remove(); });
    });
    if (reduced()) return;
    if (card) { var sh = document.createElement('div'); sh.className = 'ksc-shine'; card.appendChild(sh); }
    if (!overlay) return;
    if (mood === 'good' || mood === 'magic') {
      var c = document.createElement('div'), html = '';
      c.className = 'ksc-confetti';
      for (var i = 0; i < 28; i++) {
        html += '<i style="left:' + Math.round(Math.random() * 100) + '%;background:' + COLORS[i % COLORS.length] + ';--t:' + (Math.random() * 0.5).toFixed(2) + 's;--dur:' +
          (1.4 + Math.random() * 1.2).toFixed(2) + 's;--dx:' + Math.round(Math.random() * 120 - 60) + 'px;--r:' + Math.round(Math.random() * 900 - 450) + 'deg"></i>';
      }
      c.innerHTML = html;
      overlay.insertBefore(c, card && card.parentNode === overlay ? card : overlay.firstChild);
    } else if (mood === 'boom') {
      var f = document.createElement('div');
      f.className = 'ksc-flashbg';
      overlay.appendChild(f);
    }
  }

  window.KruScene = { wrap: wrap, kindFor: kindFor, extras: extras, KINDS: KINDS };
})();
