/* Just a Minute: one student talks on a topic until the timer ends. Reveal shows three ideas to help.
   Challenge! stops the timer; the teacher takes 1 point from the team at fault (or no one). */
(function () {
  'use strict';
  KruCards.start({
    title: 'Just a Minute',
    logo: 'Just a <b>Minute</b>',
    items: function (c, level) { return c[level].items; },
    reveal: true,
    timer: { secs: 60, options: [30, 45, 60, 90] },
    timeUpReveals: true,
    challenge: { penalty: 1 },
    points: [{ d: -1, label: '−1' }, { d: 2, label: '+2 Half the time', why: 'half the time' }, { d: 5, label: '+5 To the end', why: 'to the end' }],
    card: function (it, o) {
      return '<div class="sub">Talk about…</div><div class="big" data-fit="46,24">' + o.esc(it.topic) + '</div>' +
        (o.revealed ? '<div class="ideas">' + it.ideas.map(function (i) { return '<span>' + o.esc(i) + '</span>'; }).join('') + '</div>'
          : '<div class="sub">No long stops · no repeats · stay on the topic</div>');
    },
  });
})();
