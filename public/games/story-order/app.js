/* Story Order: the five sentences of a story, mixed up (A-E). Teams write the right order. Reveal shows it.
   Stories come from the shared bank (games/shared/stories.json). */
(function () {
  'use strict';
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
    items: function (c, level, stories) { return stories[level]; },
    reveal: true,
    timer: { secs: 90, options: [60, 90, 120, 180] },
    points: [{ d: -1, label: '−1' }, { d: 1, label: '+1 Almost' }, { d: 2, label: '+2 All correct' }],
    card: function (st, o) {
      var m = mix(st.id, st.sentences.length);
      var answer = st.sentences.map(function (_, i) { return L[m.indexOf(i)]; }).join(' → ');
      var rows = o.revealed
        ? st.sentences.map(function (s, i) { return '<li class="ok"><span class="tag">' + L[m.indexOf(i)] + '</span><span>' + o.esc(s) + '</span></li>'; })
        : m.map(function (si, pos) { return '<li><span class="tag">' + L[pos] + '</span><span>' + o.esc(st.sentences[si]) + '</span></li>'; });
      // no title row: five long M.3 sentences need all the height. After Reveal, the letters down the left are the answer.
      return '<ol class="lines" data-fit="22,18" aria-label="' + o.esc(st.title) + (o.revealed ? ', answer ' + answer : '') + '">' + rows.join('') + '</ol>';
    },
  });
})();
