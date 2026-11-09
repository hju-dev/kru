/* Read & Remember: read the story (reading timer), then Hide story → three questions (answering timer), then Show answers.
   Questions go easy → medium → hard. Both timers: −15 / +15. Every 4th story is a challenge round: half the reading time,
   double points. */
(function () {
  'use strict';
  // Henry (Nov 10): one level harder than before. M.1 reads the M.2 stories, M.2 the M.3 ones, M.3 the new harder set.
  var UP = { 'M.1': 'M.2', 'M.2': 'M.3', 'M.3': 'M.4' };
  KruCards.start({
    title: 'Read & Remember',
    logo: 'Read &amp; <b>Remember</b>',
    extra: '/games/shared/stories.json',
    compact: true,
    items: function (c, level, stories) { return stories[UP[level]] || stories[level]; },
    reveal: true,
    steps: ['Hide story', 'Answers'],
    timer: { secs: 60, adjust: 15, min: 15, max: 300, stepSecs: [60, 60], stepLabels: ['Read', 'Answer'], options: [30, 45, 60, 90, 120] },
    challengeRound: { every: 4, title: 'Challenge round', text: 'half the reading time · double points', timer: 0.5, timerStep: 0, double: true, banner: false },
    timeUpReveals: false,
    points: [{ d: -1, label: '−1' }, { d: 1, label: '+1' }, { d: 2, label: '+2' }, { d: 3, label: '+3 All right' }],
    card: function (st, o) {
      if (o.step === 0) {
        return '<div class="story-title">' + (o.challenge ? '<span class="chal-tag">⚡ ×2</span> ' : '') + o.esc(st.title) + '</div><p class="story" data-fit="24,18">' + o.esc(st.sentences.join(' ')) + '</p>';
      }
      return '<div class="story-title">' + (o.challenge ? '<span class="chal-tag">⚡ ×2</span> ' : '') + o.esc(st.title) + ' <span class="muted">· the story is hidden</span></div><ol class="qs" data-fit="26,18">' +
        st.questions.map(function (q, i) {
          return '<li><span><b class="lvl l' + i + '">' + ['Easy', 'Medium', 'Hard'][i] + '</b> ' + o.esc(q.q) + '</span>' + (o.revealed ? '<span class="a">' + o.esc(q.a) + '</span>' : '') + '</li>';
        }).join('') + '</ol>';
    },
  });
})();
