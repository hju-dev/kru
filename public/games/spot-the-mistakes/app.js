/* Spot the Mistakes: a story with three mistakes in it. Teams find and fix them. Reveal shows wrong → right. */
(function () {
  'use strict';
  function re(word) { return new RegExp("(^|[^\\w'])(" + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\w])'); }
  KruCards.start({
    title: 'Spot the Mistakes',
    logo: 'Spot the <b>Mistakes</b>',
    extra: '/games/shared/stories.json',
    compact: true,
    items: function (c, level, stories) { return stories[level]; },
    reveal: true,
    timer: { secs: 90, options: [60, 90, 120, 180] },
    points: [{ d: -1, label: '−1' }, { d: 1, label: '+1' }, { d: 2, label: '+2' }, { d: 3, label: '+3 All three' }],
    card: function (st, o) {
      var parts = st.sentences.map(function (s, i) {
        var m = st.mistakes.filter(function (x) { return x.i === i; })[0];
        if (!m) return o.esc(s);
        var hit = s.match(re(m.right));
        if (!hit) return o.esc(s);
        var at = hit.index + hit[1].length, before = s.slice(0, at), after = s.slice(at + m.right.length);
        var mid = o.revealed ? '<del>' + o.esc(m.wrong) + '</del> <ins>' + o.esc(m.right) + '</ins>' : o.esc(m.wrong);
        return o.esc(before) + mid + o.esc(after);
      });
      return '<div class="story-title">' + o.esc(st.title) + ' <span class="hint">' + (o.revealed ? '' : '· find 3 mistakes') + '</span></div>' +
        '<p class="story" data-fit="24,18">' + parts.join(' ') + '</p>';
    },
  });
})();
