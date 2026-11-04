/* Class Order (a tool): go down the class list (by number or random). Now / on deck / done.
   Absent students are skipped today but keep their place. Kru remembers where you stopped for this class
   across lessons (Kru.saveKeep), so "anyone not reached goes first next lesson". No points. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  var here = [];   // students present now: { key, no, nick }
  var K = null;    // kept for this class: { v, mode, order: [key], done: [key], names: {key: {no, nick}} }
  var skipped = []; // keys marked absent today (skipped, not done); kept for the day with Kru.saveDay
  var history = []; // for Back: { key, kind: 'done' | 'skip' }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function key(m) { return m.no + ':' + m.nick; }
  function keep() { Kru.saveKeep(K); }
  function isHere(k) { return here.some(function (s) { return s.key === k; }); }
  function shuffled(list) {
    var a = list.slice();
    for (var j = a.length - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[r]; a[r] = x; }
    return a;
  }

  function newOrder(mode) {
    var byNo = here.slice().sort(function (a, b) { return a.no - b.no; }).map(function (s) { return s.key; });
    K = { v: 1, mode: mode, order: mode === 'random' ? shuffled(byNo) : byNo, done: [], names: {} };
    here.forEach(function (s) { K.names[s.key] = { no: s.no, nick: s.nick }; });
    skipped = []; history = [];
    Kru.saveDay({ skipped: skipped });
    keep();
  }
  /** Students in today's class who aren't in the kept order yet (new to the roster) go at the end. */
  function addNewcomers() {
    here.forEach(function (s) {
      if (K.order.indexOf(s.key) < 0) K.order.push(s.key);
      K.names[s.key] = { no: s.no, nick: s.nick };
    });
  }
  /** The waiting queue: not done, here today, not skipped. */
  function queue() {
    return K.order.filter(function (k) { return K.done.indexOf(k) < 0 && isHere(k) && skipped.indexOf(k) < 0; });
  }
  function label(k) { var n = K.names[k] || {}; return { no: n.no, nick: n.nick || k }; }

  function render() {
    var q = queue(), now = q[0], next = q[1];
    var doneCount = K.order.filter(function (k) { return K.done.indexOf(k) >= 0; }).length;
    $('info').textContent = doneCount + ' of ' + K.order.length + ' done · ' + (K.mode === 'random' ? 'random order' : 'by number');
    if (now) {
      var n = label(now);
      $('now').className = 'now';
      $('now').innerHTML = '<span class="no">' + esc(n.no) + '</span>' + esc(n.nick);
    } else {
      $('now').className = 'now finished';
      var waiting = K.order.filter(function (k) { return K.done.indexOf(k) < 0; }).length;
      $('now').textContent = waiting ? 'Everyone here has had a turn! (' + waiting + ' still to go next lesson)' : 'Everyone has had a turn!';
    }
    $('deck').innerHTML = next ? 'On deck: <b>' + esc(label(next).no + ' · ' + label(next).nick) + '</b>' : '';
    $('done').disabled = !now;
    $('absent').disabled = !now;
    $('back').disabled = !history.length;
    $('list').innerHTML = K.order.map(function (k) {
      var n = label(k), cls = k === now ? ' now' : K.done.indexOf(k) >= 0 ? ' done' : !isHere(k) || skipped.indexOf(k) >= 0 ? ' away' : '';
      return '<span class="chip' + cls + '"><span class="n">' + esc(n.no) + '</span>' + esc(n.nick) + '</span>';
    }).join('');
    var cur = $('list').querySelector('.now');
    if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
    fit();
  }
  function fit() {
    var el = $('now'), size = 64;
    if (el.classList.contains('finished')) { el.style.fontSize = ''; return; }
    el.style.fontSize = size + 'px';
    while (size > 30 && el.scrollWidth > el.clientWidth + 1) el.style.fontSize = (size -= 4) + 'px';
  }

  $('done').addEventListener('click', function () {
    var now = queue()[0];
    if (!now) return;
    K.done.push(now);
    history.push({ key: now, kind: 'done' });
    keep(); render();
  });
  $('absent').addEventListener('click', function () {
    var now = queue()[0];
    if (!now) return;
    skipped.push(now); // not done: they keep their place for next lesson
    Kru.saveDay({ skipped: skipped });
    history.push({ key: now, kind: 'skip' });
    render();
  });
  $('back').addEventListener('click', function () {
    var h = history.pop();
    if (!h) return;
    if (h.kind === 'done') { var i = K.done.lastIndexOf(h.key); if (i >= 0) K.done.splice(i, 1); keep(); }
    else { var j = skipped.lastIndexOf(h.key); if (j >= 0) skipped.splice(j, 1); Kru.saveDay({ skipped: skipped }); }
    render();
  });
  function closeMenu() { $('menuBack').hidden = true; }
  $('more').addEventListener('click', function () { $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('byNumber').addEventListener('click', function () { newOrder('number'); closeMenu(); render(); });
  $('random').addEventListener('click', function () { newOrder('random'); closeMenu(); render(); });
  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden) return;
    if (e.code === 'Space' || e.key === 'ArrowRight') { e.preventDefault(); $('done').click(); }
    else if (e.key === 'ArrowLeft') $('back').click();
  });
  window.addEventListener('resize', fit);

  // No points in Class Order: Finish just closes it (games.json "results": "scored").
  Kru.onFinishRequest(function () { Kru.finish([]); });

  Kru.ready(function (session) {
    here = session.teams.filter(function (t) { return t.members && t.members[0]; }).map(function (t) {
      var m = t.members[0];
      return { key: key(m), no: m.no, nick: m.nick };
    });
    var kept = session.keep;
    var today = session.day;
    if (kept && kept.v === 1 && Array.isArray(kept.order) && Array.isArray(kept.done)) { K = kept; K.names = K.names || {}; addNewcomers(); keep(); }
    else newOrder('number');
    if (today && Array.isArray(today.skipped)) skipped = today.skipped.filter(function (k) { return K.done.indexOf(k) < 0; });
    render();
  });
})();
