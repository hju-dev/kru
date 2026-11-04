/* Read & Remember: read the story (timer), then Hide story → three questions, then Show answers. */
(function () {
  'use strict';
  KruCards.start({
    title: 'Read & Remember',
    logo: 'Read &amp; <b>Remember</b>',
    extra: '/games/shared/stories.json',
    compact: true,
    items: function (c, level, stories) { return stories[level]; },
    reveal: true,
    steps: ['Hide story', 'Answers'],
    timer: { secs: 60, options: [30, 45, 60, 90, 120] },
    timeUpReveals: false,
    points: [{ d: -1, label: '−1' }, { d: 1, label: '+1' }, { d: 2, label: '+2' }, { d: 3, label: '+3 All right' }],
    card: function (st, o) {
      if (o.step === 0) {
        return '<div class="story-title">' + o.esc(st.title) + '</div><p class="story" data-fit="24,18">' + o.esc(st.sentences.join(' ')) + '</p>';
      }
      return '<div class="story-title">' + o.esc(st.title) + ' <span class="muted">· the story is hidden</span></div><ol class="qs" data-fit="26,18">' +
        st.questions.map(function (q) {
          return '<li><span>' + o.esc(q.q) + '</span>' + (o.revealed ? '<span class="a">' + o.esc(q.a) + '</span>' : '') + '</li>';
        }).join('') + '</ol>';
    },
  });
})();
