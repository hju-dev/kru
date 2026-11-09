/* Spot the Mistakes: a story with three mistakes in it. Teams find and fix them. Reveal shows wrong → right.
   Stories are one level harder than the level picked. Every 4th story is a challenge round: the number of mistakes
   is a secret, and teams must also say WHY each one is wrong. Double points. */
(function () {
  'use strict';
  // Henry (Nov 10): one level harder than before. M.1 reads the M.2 stories, M.2 the M.3 ones, M.3 the new harder set.
  var UP = { 'M.1': 'M.2', 'M.2': 'M.3', 'M.3': 'M.4' };
  function re(word) { return new RegExp("(^|[^\\w'])(" + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\w])'); }
  KruCards.start({
    title: 'Spot the Mistakes',
    logo: 'Spot the <b>Mistakes</b>',
    extra: '/games/shared/stories.json',
    compact: true,
    items: function (c, level, stories) { return stories[UP[level]] || stories[level]; },
    challengeRound: { every: 4, title: 'Challenge round', text: 'how many mistakes? Find them and say WHY · double points', double: true, banner: false },
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
      return '<div class="story-title">' + (o.challenge ? '<span class="chal-tag">⚡ ×2</span> ' : '') + o.esc(st.title) + ' <span class="hint">' + (o.revealed ? '' : o.challenge ? '· how many mistakes?' : '· find 3 mistakes') + '</span></div>' +
        '<p class="story" data-fit="24,18">' + parts.join(' ') + '</p>';
    },
  });
})();
