/**
 * Shared quiz questions for Quiz Board and Race Board.
 * Questions come from Quiz Battle's built-in sets (games/quiz-battle/content.json, 5 sets of 10 per level),
 * plus Henry's own sets from the Questions tab of his Sheet (session.questions) when a game wants them.
 * A question: { q, choices?: [A, B, C, D], answer: index (multiple choice) or text (short answer), double }.
 *
 *   KruQuiz.load(level, session) -> Promise<{ level, builtIn: [{ name, questions }], fromSheet: [...] }>
 *   KruQuiz.html(q, shown)       -> the question, A-D choices (right one green once shown) or the short answer
 *   KruQuiz.fit(stageEl)         -> shrinks the question, then the choices, until the stage fits
 */
(function () {
  'use strict';
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function valid(q) { return q && q.q && (Array.isArray(q.choices) ? q.choices.length >= 2 && q.choices[q.answer] != null : q.answer != null && q.answer !== ''); }

  function load(level, session) {
    return fetch('/games/quiz-battle/content.json').then(function (r) {
      if (!r.ok) throw new Error('questions ' + r.status);
      return r.json();
    }).then(function (c) {
      var lv = c[level] ? level : 'M.2';
      var clean = function (sets) {
        return (sets || []).map(function (s) { return { name: String(s.name || 'Questions'), questions: (s.questions || []).filter(valid) }; })
          .filter(function (s) { return s.questions.length; });
      };
      var mine = session && Array.isArray(session.questions) ? session.questions : [];
      return { level: lv, builtIn: clean(c[lv].sets), fromSheet: clean(mine) };
    });
  }

  function html(q, shown) {
    var h = '<div class="kq-q" data-kq="q">' + esc(q.q) + '</div>';
    if (Array.isArray(q.choices)) {
      h += '<div class="kq-choices" data-kq="ch">' + q.choices.map(function (c, i) {
        var cls = shown ? (i === q.answer ? ' right' : ' wrong') : '';
        return '<div class="kq-choice' + cls + '"><span class="kq-letter">' + 'ABCD'.charAt(i) + '</span><span>' + esc(c) + '</span></div>';
      }).join('') + '</div>';
    } else {
      h += shown ? '<div class="kq-ans">' + esc(q.answer) + '</div>' : '<div class="kq-short">Short answer: write or say it</div>';
    }
    return h;
  }

  function fit(stage) {
    if (!stage) return;
    var q = stage.querySelector('[data-kq=q]'), ch = stage.querySelector('[data-kq=ch]'), qs = 32, cs = 24;
    if (!q) return;
    var over = function () { return stage.scrollHeight > stage.clientHeight + 1; };
    q.style.fontSize = qs + 'px';
    if (ch) ch.style.setProperty('--ch', cs + 'px');
    while (qs > 22 && over()) q.style.fontSize = (qs -= 2) + 'px';
    while (ch && cs > 18 && over()) ch.style.setProperty('--ch', (cs -= 2) + 'px');
    while (qs > 18 && over()) q.style.fontSize = (qs -= 2) + 'px';
  }

  window.KruQuiz = { load: load, html: html, fit: fit, valid: valid, esc: esc };
})();
