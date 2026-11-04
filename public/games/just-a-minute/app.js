/* Just a Minute: one student talks on a topic until the timer ends. Reveal shows three ideas to help. */
(function () {
  'use strict';
  KruCards.start({
    title: 'Just a Minute',
    logo: 'Just a <b>Minute</b>',
    items: function (c, level) { return c[level].items; },
    reveal: true,
    timer: { secs: 60, options: [30, 45, 60, 90] },
    timeUpReveals: true,
    points: [{ d: -1, label: '−1' }, { d: 1, label: '+1 Good challenge' }, { d: 1, label: '+1 Half the time', why: 'half the time' }, { d: 3, label: '+3 To the end' }],
    card: function (it, o) {
      return '<div class="sub">Talk about…</div><div class="big" data-fit="46,24">' + o.esc(it.topic) + '</div>' +
        (o.revealed ? '<div class="ideas">' + it.ideas.map(function (i) { return '<span>' + o.esc(i) + '</span>'; }).join('') + '</div>'
          : '<div class="sub">No long stops · no repeats · stay on the topic</div>');
    },
  });
})();
