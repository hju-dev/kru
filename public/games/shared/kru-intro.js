/**
 * Kru "How to play" slides: big, short, one idea per slide, with an example. Shown before a game starts
 * and again from the game's ⋯ menu. Slides live in the game's content.json:
 *
 *   "intro": [ { "title": "...", "text": ["one short line", "another"], "example": { ... } } ]
 *   (a level section can have its own "intro" to replace the shared one)
 *
 * example (all parts optional):
 *   label:  small heading, e.g. "Example"
 *   chips:  ["went", "I", "school", "to"]       -> word tiles
 *   result: "I went to school."                  -> shown after an arrow, in green
 *   big:    "firefighter"  (+ tag: "PERSON")     -> one big card
 *   rows:   [["1st", "+3"], ["2nd", "+2"]]        -> two-column list
 *   note:   "small grey line"
 *
 * Use:  KruIntro.show(slides).then(start)      KruIntro.forLevel(content, level) -> slides
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function exampleHtml(ex) {
    if (!ex) return '';
    var h = '<div class="ki-ex">';
    if (ex.label) h += '<div class="ki-label">' + esc(ex.label) + '</div>';
    if (ex.big) h += '<div class="ki-big">' + (ex.tag ? '<span class="ki-tag">' + esc(ex.tag) + '</span>' : '') + '<span>' + esc(ex.big) + '</span></div>';
    if (ex.chips) h += '<div class="ki-chips">' + ex.chips.map(function (c) { return '<span class="ki-chip">' + esc(c) + '</span>'; }).join('') + '</div>';
    if (ex.rows) {
      h += '<div class="ki-rows">' + ex.rows.map(function (r) {
        return '<div class="ki-row"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>';
      }).join('') + '</div>';
    }
    if (ex.result) h += '<div class="ki-result"><span aria-hidden="true">→</span> ' + esc(ex.result) + '</div>';
    if (ex.note) h += '<div class="ki-note">' + esc(ex.note) + '</div>';
    return h + '</div>';
  }

  var box = null;

  function show(slides, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (!slides || !slides.length) return resolve();
      if (box) box.remove();
      var i = 0;
      box = document.createElement('div');
      box.className = 'ki';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'How to play');
      box.innerHTML =
        '<div class="ki-card">' +
        '<div class="ki-top"><span class="ki-game"></span><button class="ki-skip" type="button">Skip</button></div>' +
        '<div class="ki-body" aria-live="polite"></div>' +
        '<div class="ki-nav">' +
        '<button class="ki-btn ki-back" type="button">◀ Back</button>' +
        '<span class="ki-dots"></span>' +
        '<button class="ki-btn ki-next" type="button">Next ▶</button>' +
        '</div></div>';
      document.body.appendChild(box);
      var body = box.querySelector('.ki-body');
      box.querySelector('.ki-game').textContent = opts.title || 'How to play';

      function fit() {
        // shrink everything a little until the slide fits the phone screen
        var size = 100;
        body.style.fontSize = '';
        while (size > 80 && body.scrollHeight > body.clientHeight + 1) { // 80%: text stays >= 18 px
          size -= 5;
          body.style.fontSize = size + '%';
        }
      }
      function render() {
        var s = slides[i];
        var lines = Array.isArray(s.text) ? s.text : s.text ? [s.text] : [];
        body.innerHTML = '<h2 class="ki-title">' + esc(s.title || '') + '</h2>' +
          lines.map(function (t) { return '<p class="ki-text">' + esc(t) + '</p>'; }).join('') +
          exampleHtml(s.example);
        box.querySelector('.ki-dots').innerHTML = slides.map(function (_, k) { return '<i' + (k === i ? ' class="on"' : '') + '></i>'; }).join('');
        box.querySelector('.ki-back').disabled = i === 0;
        var last = i === slides.length - 1;
        var next = box.querySelector('.ki-next');
        next.textContent = last ? (opts.done || "Let's play! ▶") : 'Next ▶';
        next.classList.toggle('go', last);
        fit();
      }
      function close() {
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('resize', fit);
        if (box) box.remove();
        box = null;
        resolve();
      }
      function onKey(e) {
        if (e.key === 'ArrowRight' || e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); go(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); go(-1); }
        else if (e.key === 'Escape') close();
      }
      function go(d) {
        if (d > 0 && i === slides.length - 1) return close();
        i = Math.max(0, Math.min(slides.length - 1, i + d));
        render();
      }
      box.querySelector('.ki-next').addEventListener('click', function () { go(1); });
      box.querySelector('.ki-back').addEventListener('click', function () { go(-1); });
      box.querySelector('.ki-skip').addEventListener('click', close);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', fit);
      render();
    });
  }

  function forLevel(content, level) {
    if (!content) return [];
    var sec = content[level];
    return (sec && sec.intro) || content.intro || [];
  }

  window.KruIntro = { show: show, forLevel: forLevel, isOpen: function () { return !!box; } };
})();
