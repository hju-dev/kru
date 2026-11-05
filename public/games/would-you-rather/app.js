/* Would You Rather? Two silly choices. A warm-up with no points: tap "Pick a team" and that team
   says its choice and why. Built on the shared card engine. */
(function () {
  'use strict';
  var frames = {};
  KruCards.start({
    title: 'Would You Rather?',
    logo: 'Would You <b>Rather?</b>',
    items: function (c, level) { frames.f = c[level].frame; return c[level].items; },
    reveal: false,
    timer: { secs: 30, options: [15, 30, 45, 60] },
    noScores: true,
    picker: true,
    card: function (it, o) {
      return '<div class="sub">Would you rather…</div>' +
        '<div class="wyr"><div class="opt a" data-fit="40,22">' + o.esc(it.a) + '</div><div class="or">or</div><div class="opt b" data-fit="40,22">' + o.esc(it.b) + '</div></div>' +
        (frames.f ? '<div class="sub frame">' + o.esc(frames.f) + '</div>' : '');
    },
  });
})();
