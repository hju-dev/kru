/**
 * Shared bits for team games:
 *  - KruCorner.set(stageEl, '6/50')  the question counter in the top-right corner of the question area
 *  - KruEnd.setup({ standings })     adds "End game & final scores" to the ⋯ menu: a ranked final
 *                                    scoreboard, then "Save scores & finish" (same as Kru's home → Finish)
 *    standings() returns [{ name, points, teacher? }]
 */
(function () {
  'use strict';
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  window.KruCorner = {
    set: function (stage, text) {
      if (!stage) return;
      var el = stage.querySelector(':scope > .kru-corner');
      if (!el) {
        el = document.createElement('span');
        el.className = 'kru-corner';
        stage.classList.add('kru-has-corner');
        stage.appendChild(el);
      }
      el.textContent = text || '';
      el.hidden = !text;
    },
  };

  var cfg = null, box = null;
  function show() {
    if (box) box.remove();
    var list = (cfg && cfg.standings ? cfg.standings() : []).slice().sort(function (a, b) { return b.points - a.points; });
    var students = list.filter(function (t) { return !t.teacher; });
    var rank = 0, prev = null;
    var rows = students.map(function (t, i) {
      if (t.points !== prev) { rank = i + 1; prev = t.points; }
      return '<li class="ke-row' + (rank === 1 ? ' first' : '') + '"><span class="ke-rank">' + rank + '</span><span class="ke-name">' + esc(t.name) + '</span><b>' + t.points + '</b></li>';
    }).join('');
    var teacher = list.filter(function (t) { return t.teacher; }).map(function (t) {
      return '<li class="ke-row teacher"><span class="ke-rank">T</span><span class="ke-name">' + esc(t.name) + '</span><b>' + t.points + '</b></li>';
    }).join('');
    var top = students.filter(function (t) { return t.points === (students[0] && students[0].points); });
    box = document.createElement('div');
    box.className = 'ke';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Final scores');
    box.innerHTML = '<div class="ke-card">' +
      '<div class="ke-title">' + (top.length && students[0].points > 0 ? 'Winner: ' + esc(top.map(function (t) { return t.name; }).join(' & ')) : 'Final scores') + '</div>' +
      '<ol class="ke-list">' + rows + teacher + '</ol>' +
      '<div class="ke-btns"><button class="ke-btn ghost" data-k="back">Keep playing</button><button class="ke-btn go" data-k="save">Save scores &amp; finish</button></div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]');
      if (!b) return;
      if (b.dataset.k === 'save') { box.remove(); box = null; Kru.endGame(); }
      else { box.remove(); box = null; }
    });
  }

  window.KruEnd = {
    setup: function (c) {
      cfg = c;
      var close = document.getElementById('menuClose');
      if (!close || document.getElementById('endGame')) return;
      var btn = document.createElement('button');
      btn.className = close.className.replace('ghost', '').trim() || 'btn';
      btn.id = 'endGame';
      btn.textContent = 'End game & final scores';
      close.parentNode.insertBefore(btn, close);
      btn.addEventListener('click', function () {
        var back = document.getElementById('menuBack');
        if (back) back.hidden = true;
        show();
      });
    },
    show: show,
  };
})();
