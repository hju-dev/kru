/* Scan It!: a real-world text (menu, bus or train schedule, poster, weather, opening hours, sale ad, league table, movie times)
   and three questions. Teams scan for the answers. Reveal shows them. Texts are in content.json (generated from data). */
(function () {
  'use strict';
  KruCards.start({
    title: 'Scan It!',
    logo: 'Scan <b>It!</b>',
    compact: true,
    items: function (c, level) { return c[level].items; },
    reveal: true,
    timer: { secs: 60, options: [30, 45, 60, 90, 120] },
    points: [{ d: -1, label: '−1' }, { d: 1, label: '+1' }, { d: 2, label: '+2' }, { d: 3, label: '+3 All right' }],
    card: function (it, o) {
      var e = o.esc;
      var table = '<table class="doc-t">' +
        (it.cols.length ? '<thead><tr>' + it.cols.map(function (h) { return '<th>' + e(h) + '</th>'; }).join('') + '</tr></thead>' : '') +
        '<tbody>' + it.rows.map(function (r) {
          return '<tr>' + r.map(function (c, i) { return it.cols.length || i ? '<td' + (it.cols[i] === 'Shows' ? ' class="wrap"' : '') + '>' + e(c) + '</td>' : '<th scope="row">' + e(c) + '</th>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
      return '<div class="scan">' +
        '<div class="doc" data-fit="19,18"><div class="doc-head"><span class="kind">' + e(it.kind) + '</span>' + e(it.head) + '</div>' + table + '</div>' +
        '<ol class="qs" data-fit="21,18">' + it.qs.map(function (q) {
          return '<li><span>' + e(q.q) + '</span>' + (o.revealed ? ' <b class="a">→ ' + e(q.a) + '</b>' : '') + '</li>';
        }).join('') + '</ol></div>';
    },
  });
})();
