/* Sentence Builder: three word cards; teams write one correct sentence using all three. Reveal = an example. */
(function () {
  'use strict';
  var COLORS = ['var(--gold)', 'var(--teal)', 'var(--coral)'];
  KruCards.start({
    title: 'Sentence Builder',
    logo: 'Sentence <b>Builder</b>',
    items: function (c, level) { return c[level].items; },
    reveal: true,
    timer: { secs: 90, options: [60, 90, 120, 180] },
    points: [{ d: -1, label: '−1' }, { d: 1, label: '+1 Small mistake' }, { d: 2, label: '+2 Correct' }, { d: 1, label: '+1 Best sentence', why: 'best sentence' }],
    card: function (it, o) {
      return '<div class="sub">Use all three words in one sentence</div><div class="words">' +
        it.words.map(function (w, i) { return '<span class="word" data-fit="40,22" style="--c:' + COLORS[i] + '">' + o.esc(w) + '</span>'; }).join('') + '</div>' +
        (o.revealed ? '<div class="answer" data-fit="22,18">' + o.esc(it.example) + '</div>' : '');
    },
  });
})();
