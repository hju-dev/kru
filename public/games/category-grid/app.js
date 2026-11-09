/* Category Grid: a letter + five categories; teams write a word for each that starts with the letter.
   Henry's rules (Nov 9): every extra word with the letter adds a point (horse 1, heavy horse 2, huge heavy horse 3);
   no word twice in a round. No bonus cards. */
(function () {
  'use strict';
  KruCards.start({
    title: 'Category Grid',
    logo: 'Category <b>Grid</b>',
    items: function (c, level) { return c[level].items; },
    reveal: true,
    timer: { secs: 120, options: [60, 90, 120, 180] },
    // tap a team: +1 / +3 / +5 / −1 add up for the round, then Done ✓ (Henry)
    points: [{ d: 1, label: '+1' }, { d: 3, label: '+3' }, { d: 5, label: '+5' }, { d: -1, label: '−1' }],
    tally: true,
    card: function (it, o) {
      return '<div class="cg"><div class="letter">' + o.esc(it.letter) + '</div><div class="cats">' +
        it.cats.map(function (c) {
          return '<div class="cat"><b>' + o.esc(c.name) + '</b>' + (o.revealed ? '<span>' + o.esc(c.examples.join(', ')) + '</span>' : '') + '</div>';
        }).join('') + '</div></div>';
    },
  });
})();
