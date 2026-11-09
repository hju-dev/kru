/* Story Order: the five sentences of a story, mixed up (A-E). Teams write the right order. Reveal shows it.
   Stories come from the shared bank (games/shared/stories.json), one level harder than the level picked.
   Every 4th story is a challenge round: the middle sentence is hidden; teams order the other four (A-D) and say what
   the missing sentence was about. Double points. */
(function () {
  'use strict';
  // Henry (Nov 10): one level harder than before. M.1 reads the M.2 stories, M.2 the M.3 ones, M.3 the new harder set.
  var UP = { 'M.1': 'M.2', 'M.2': 'M.3', 'M.3': 'M.4' };
  var L = 'ABCDE';
  /** The same mixed-up order every time for a story (from its id), never the right order. */
  function mix(id, n) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    var a = [];
    for (var k = 0; k < n; k++) a.push(k);
    for (var j = n - 1; j > 0; j--) { h = (h * 1103515245 + 12345) >>> 0; var r = h % (j + 1); var x = a[j]; a[j] = a[r]; a[r] = x; }
    if (a.every(function (v, idx) { return v === idx; })) a.push(a.shift());
    return a;
  }
  KruCards.start({
    title: 'Story Order',
    logo: 'Story <b>Order</b>',
    extra: '/games/shared/stories.json',
    compact: true,
    items: function (c, level, stories) { return stories[UP[level]] || stories[level]; },
    challengeRound: { every: 4, title: 'Challenge round', text: 'one sentence is missing! · double points', double: true, banner: false },
    reveal: true,
    timer: { secs: 90, options: [60, 90, 120, 180] },
    points: [{ d: -1, label: '−1' }, { d: 1, label: '+1 Almost' }, { d: 2, label: '+2 All correct' }],
    card: function (st, o) {
      var m = mix(st.id, st.sentences.length);
      if (o.challenge) {
        // the middle sentence (in the right order) is hidden: the other four are A-D
        var miss = 2, four = m.filter(function (si) { return si !== miss; });
        var rows4 = o.revealed
          ? st.sentences.map(function (s, i) {
            return i === miss ? '<li class="ok missing"><span class="tag">?</span><span>' + o.esc(s) + '</span></li>'
              : '<li class="ok"><span class="tag">' + L[four.indexOf(i)] + '</span><span>' + o.esc(s) + '</span></li>';
          })
          : four.map(function (si, pos) { return '<li><span class="tag">' + L[pos] + '</span><span>' + o.esc(st.sentences[si]) + '</span></li>'; })
            .concat(['<li class="missing"><span class="tag">?</span><span><b class="chal-tag">⚡ ×2</b> One sentence is missing. What happens there?</span></li>']);
        return '<ol class="lines" data-fit="22,18" aria-label="' + o.esc(st.title) + '">' + rows4.join('') + '</ol>';
      }
      var answer = st.sentences.map(function (_, i) { return L[m.indexOf(i)]; }).join(' → ');
      var rows = o.revealed
        ? st.sentences.map(function (s, i) { return '<li class="ok"><span class="tag">' + L[m.indexOf(i)] + '</span><span>' + o.esc(s) + '</span></li>'; })
        : m.map(function (si, pos) { return '<li><span class="tag">' + L[pos] + '</span><span>' + o.esc(st.sentences[si]) + '</span></li>'; });
      // no title row: five long M.3 sentences need all the height. After Reveal, the letters down the left are the answer.
      return '<ol class="lines" data-fit="22,18" aria-label="' + o.esc(st.title) + (o.revealed ? ', answer ' + answer : '') + '">' + rows.join('') + '</ol>';
    },
  });
})();
