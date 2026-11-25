/**
 * Gossip Circle / Group Maker: the pure logic (no screen code), so Vitest can run it.
 *
 *   KruGroups.sizes(n, g)                      -> group sizes (n split as evenly as possible into floor(n/g) groups, never 1-2)
 *   KruGroups.teacherJoins(mode, n, g, force)  -> true when the teacher plays ('auto' = only when it makes every group exactly g)
 *   KruGroups.pairCounts(rounds)               -> { 'a|b': times together }
 *   KruGroups.cost(groups, counts)             -> sum over same-group pairs of (times together)^2
 *   KruGroups.repeats(groups, counts)          -> number of pairs in a group that have already been together
 *   KruGroups.shuffle(players, g, counts, opt) -> { groups, cost, repeats }   (random start + swaps that lower the cost)
 *   KruGroups.estimate(players, g, counts)     -> about how many more rounds can be played with no repeats
 *   KruGroups.role(seat, q)                    -> 'ask' | 'report' | 'check' | 'observe'  (seat 0-based, q = question 1, 2, 3...)
 */
(function () {
  'use strict';

  function sizes(n, g) {
    g = g || 3;
    if (n <= 0) return [];
    var k = Math.max(1, Math.floor(n / g)), base = Math.floor(n / k), extra = n - base * k, out = [];
    for (var i = 0; i < k; i++) out.push(base + (i < extra ? 1 : 0));
    return out;
  }

  function teacherJoins(mode, n, g, force) {
    if (typeof force === 'boolean') return force;
    g = g || 3;
    if (mode === 'always') return true;
    if (mode === 'never') return false;
    return n > 0 && (n + 1) % g === 0; // auto: only when the teacher makes every group exactly g
  }

  function pk(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

  function pairCounts(rounds) {
    var c = {};
    (rounds || []).forEach(function (r) {
      (r.groups || r).forEach(function (grp) {
        for (var i = 0; i < grp.length; i++) for (var j = i + 1; j < grp.length; j++) { var k = pk(grp[i], grp[j]); c[k] = (c[k] || 0) + 1; }
      });
    });
    return c;
  }

  function cost(groups, counts) {
    var t = 0;
    groups.forEach(function (grp) {
      for (var i = 0; i < grp.length; i++) for (var j = i + 1; j < grp.length; j++) { var v = counts[pk(grp[i], grp[j])] || 0; t += v * v; }
    });
    return t;
  }

  function repeats(groups, counts) {
    var t = 0;
    groups.forEach(function (grp) {
      for (var i = 0; i < grp.length; i++) for (var j = i + 1; j < grp.length; j++) if (counts[pk(grp[i], grp[j])]) t++;
    });
    return t;
  }

  function shuffled(a) {
    a = a.slice();
    for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }

  function split(list, szs) {
    var out = [], at = 0;
    szs.forEach(function (s) { out.push(list.slice(at, at + s)); at += s; });
    return out;
  }

  /** How much player p costs inside group grp (ignoring p itself at index skip). */
  function pcost(p, grp, counts, skip) {
    var t = 0;
    for (var i = 0; i < grp.length; i++) if (i !== skip) { var v = counts[pk(p, grp[i])] || 0; t += v * v; }
    return t;
  }

  function shuffle(players, g, counts, opt) {
    opt = opt || {};
    counts = counts || {};
    var restarts = opt.restarts || 300, swaps = opt.swaps || 2000, szs = sizes(players.length, g);
    var best = null, bestCost = Infinity;
    for (var r = 0; r < restarts; r++) {
      var groups = split(shuffled(players), szs), c = cost(groups, counts);
      if (groups.length > 1) {
        for (var s = 0; s < swaps && c > 0; s++) {
          var a = Math.floor(Math.random() * groups.length), b = Math.floor(Math.random() * (groups.length - 1));
          if (b >= a) b++;
          var i = Math.floor(Math.random() * groups[a].length), j = Math.floor(Math.random() * groups[b].length);
          var p = groups[a][i], q = groups[b][j];
          var before = pcost(p, groups[a], counts, i) + pcost(q, groups[b], counts, j);
          // after the swap p sits in b (without q) and q in a (without p)
          var after = pcost(p, groups[b], counts, j) + pcost(q, groups[a], counts, i);
          if (after < before) { groups[a][i] = q; groups[b][j] = p; c += after - before; }
        }
      }
      if (c < bestCost) { bestCost = c; best = groups; if (c === 0) break; }
    }
    best = best.map(shuffled).sort(function () { return Math.random() - 0.5; }); // random seats, random group order
    return { groups: best, cost: bestCost, repeats: repeats(best, counts) };
  }

  /** An estimate: play pretend rounds until a repeat is unavoidable (capped at 40). */
  function estimate(players, g, counts) {
    var c = {}, k;
    for (k in counts) c[k] = counts[k];
    var n = 0;
    while (n < 40) {
      var r = shuffle(players, g, c, { restarts: 25, swaps: 1500 });
      if (r.cost > 0) break;
      var add = pairCounts([r.groups]);
      for (k in add) c[k] = (c[k] || 0) + add[k];
      n++;
    }
    return n;
  }

  function role(seat, q) {
    if (seat >= 3) return 'observe';
    var ask = (q - 1) % 3, off = (seat - ask + 3) % 3;
    return off === 0 ? 'ask' : off === 1 ? 'report' : 'check';
  }

  var api = { sizes: sizes, teacherJoins: teacherJoins, pairCounts: pairCounts, cost: cost, repeats: repeats, shuffle: shuffle, estimate: estimate, role: role };
  if (typeof window !== 'undefined') window.KruGroups = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
