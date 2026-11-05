/* Would You Rather? Two choices; each team picks one and gives a reason. Built on the shared card engine. */
(function () {
  'use strict';
  var frames = {};
  KruCards.start({
    title: 'Would You Rather?',
    logo: 'Would You <b>Rather?</b>',
    items: function (c, level) { frames.f = c[level].frame; return c[level].items; },
    reveal: false,
    timer: { secs: 60, options: [30, 60, 90, 120] },
    points: [{ d: -1, label: '−1' }, { d: 1, label: '+1 Reason' }, { d: 2, label: '+2 Reason + linking word' }, { d: 3, label: '+3' }],
    card: function (it, o) {
      return '<div class="sub">Would you rather…</div>' +
        '<div class="wyr"><div class="opt a" data-fit="34,20">' + o.esc(it.a) + '</div><div class="or">or</div><div class="opt b" data-fit="34,20">' + o.esc(it.b) + '</div></div>' +
        (frames.f ? '<div class="sub frame">' + o.esc(frames.f) + '</div>' : '');
    },
  });
})();
