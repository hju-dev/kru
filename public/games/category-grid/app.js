/* Category Grid: a letter + five categories; teams write a word for each that starts with the letter. */
(function () {
  'use strict';
  KruCards.start({
    title: 'Category Grid',
    logo: 'Category <b>Grid</b>',
    items: function (c, level) { return c[level].items; },
    reveal: true,
    timer: { secs: 120, options: [60, 90, 120, 180] },
    points: [{ d: -1, label: '−1' }, { d: 1, label: '+1' }, { d: 2, label: '+2 Only us' }, { d: 5, label: '+5' }],
    card: function (it, o) {
      return '<div class="cg"><div class="letter">' + o.esc(it.letter) + '</div><div class="cats">' +
        it.cats.map(function (c) {
          return '<div class="cat"><b>' + o.esc(c.name) + '</b>' + (o.revealed ? '<span>' + o.esc(c.examples.join(', ')) + '</span>' : '') + '</div>';
        }).join('') + '</div></div>';
    },
  });
})();
