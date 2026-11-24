/**
 * Shared quiz questions for Jeopardy and Race Board.
 * Questions come from Quiz Battle's built-in sets (games/quiz-battle/content.json, 5 sets of 10 per level),
 * plus Henry's own sets from the Questions tab of his Sheet (session.questions) when a game wants them.
 * A question: { q, choices?: [A, B, C, D], answer: index (multiple choice) or text (short answer), double }.
 *
 *   KruQuiz.load(level, session) -> Promise<{ level, builtIn: [{ name, questions }], fromSheet: [...], unit }>
 *   KruQuiz.unit(session)        -> Promise<unit | null>: the unit Henry picked on the setup screen
 *                                   (public/units/<id>.json: { title, level, sets, words, motions }), if it fits the level
 *   KruQuiz.html(q, shown)       -> the question, A-D choices (right one green once shown) or the short answer;
 *                                   a lesson pack's read_aloud sentence shows big after the reveal (wrong choices hidden then)
 *   KruQuiz.fit(stageEl)         -> shrinks the question, then the choices, until the stage fits
 */
(function () {
  'use strict';
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function valid(q) { return q && q.q && (Array.isArray(q.choices) ? q.choices.length >= 2 && q.choices[q.answer] != null : q.answer != null && q.answer !== ''); }

  /** The unit picked on the setup screen (made from Henry's Gamma lessons), or null. Never fails: no unit = built-in. */
  function unit(session) {
    var id = session && session.unit;
    if (!id || !/^[a-z0-9-]+$/.test(id)) return Promise.resolve(null);
    return fetch('/units/' + id + '.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (u) {
      if (!u || (u.level && u.level !== 'any' && session.level && u.level !== session.level)) return null; // 'any' = Trivia, for every level
      u.sets = (u.sets || []).map(function (s) { return { name: String(s.name), questions: (s.questions || []).filter(valid) }; })
        .filter(function (s) { return s.questions.length; });
      return u;
    }).catch(function () { return null; });
  }

  function load(level, session) {
    var unitReady = unit(session);
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
      return unitReady.then(function (u) { return { level: lv, builtIn: clean(c[lv].sets), fromSheet: clean(mine), unit: u }; });
    });
  }

  /** The sentence the class reads aloud after the reveal (Unit 8 lesson packs). */
  function say(text) {
    return '<div class="kq-say" data-kq="say"><span class="kq-say-lab">🗣 Read aloud</span><span class="kq-say-t">' + esc(text) + '</span></div>';
  }

  /** A drawn picture a game provides (window.KruQuizPics, e.g. Christmas Dash), or '' */
  function pic(name) {
    var P = window.KruQuizPics || {}, f = P[name];
    return f ? (typeof f === 'function' ? f() : f) : '';
  }
  function picText(s) {
    return esc(s).replace(/\[\[([a-z0-9-]+)\]\]/g, function (m, k) { var p = pic(k); return p ? '<span class="kq-ri">' + p + '</span>' : m; });
  }
  function html(q, shown) {
    var h = '<div class="kq-q" data-kq="q">' + esc(q.q) + '</div>';
    // a rebus puzzle (Christmas Race Board): picture lines of emoji and words, shown big under the question
    if (Array.isArray(q.rebus) && q.rebus.length) {
      h += '<div class="kq-rebus" data-kq="rebus">' + q.rebus.map(function (l) { return '<div>' + picText(l) + '</div>'; }).join('') + '</div>';
    }
    if (Array.isArray(q.choices)) {
      var said = shown && q.read_aloud;
      h += '<div class="kq-choices' + (said ? ' kq-said' : '') + '" data-kq="ch">' + q.choices.map(function (c, i) {
        var cls = shown ? (i === q.answer ? ' right' : ' wrong') : '';
        return '<div class="kq-choice' + cls + '"><span class="kq-letter">' + 'ABCD'.charAt(i) + '</span><span>' + esc(c) + '</span></div>';
      }).join('') + '</div>';
    } else {
      var ap = shown && q.pic ? pic(q.pic) : ''; // the answer's picture on Reveal (rebus puzzles)
      h += shown ? (ap ? '<div class="kq-reveal"><span class="kq-pic">' + ap + '</span><div class="kq-ans">' + esc(q.answer) + '</div></div>' : '<div class="kq-ans">' + esc(q.answer) + '</div>') : '<div class="kq-short">' + esc(window.KruQuiz.shortHint) + '</div>';
    }
    if (shown && q.read_aloud) h += say(q.read_aloud);
    return h;
  }

  function fit(stage) {
    if (!stage) return;
    var q = stage.querySelector('[data-kq=q]'), ch = stage.querySelector('[data-kq=ch]'), sy = stage.querySelector('[data-kq=say]'), rb = stage.querySelector('[data-kq=rebus]'), qs = 32, cs = 24, ss = 34, rs = 56;
    if (!q) return;
    var over = function () { return stage.scrollHeight > stage.clientHeight + 1; };
    q.style.fontSize = qs + 'px';
    if (ch) ch.style.setProperty('--ch', cs + 'px');
    if (sy) sy.style.fontSize = ss + 'px';
    if (rb) rb.style.fontSize = rs + 'px';
    while (rb && rs > 30 && over()) rb.style.fontSize = (rs -= 4) + 'px';
    while (qs > 22 && over()) q.style.fontSize = (qs -= 2) + 'px';
    while (ch && cs > 18 && over()) ch.style.setProperty('--ch', (cs -= 2) + 'px');
    while (qs > 18 && over()) q.style.fontSize = (qs -= 2) + 'px';
    while (sy && ss > 18 && over()) sy.style.fontSize = (ss -= 2) + 'px';
    // still too tall: drop the right-answer box when the read-aloud sentence already says it
    var right = ch && ch.querySelector('.kq-choice.right span:last-child'), norm = function (t) { return t.toLowerCase().replace(/[.!?]+$/, '').trim(); };
    if (sy && right && over() && norm(sy.textContent).indexOf(norm(right.textContent)) >= 0) ch.style.display = 'none';
  }

  // the line under a question with no A-D choices; a game can change it (Quiz Island: say it out loud)
  var TIERS = [['easy', 'Easy'], ['regular', 'Regular'], ['hard', 'Hard'], ['impossible', 'Impossible']];
  /** Is this difficulty switched on? `off` = { easy: true, ... } (the saved list of switched-off levels). */
  function tierOn(off, t) { return !(off && off[t]); }
  /**
   * The "Question levels" switches in a game's settings (Henry, Nov 25): Easy / Regular / Hard / Impossible, on or off any time.
   * `counts` = { easy: n, ... } questions in the deck (a level with none is greyed out); at least one level always stays on.
   * onChange(off) runs after each tap; the game saves `off` (S.tiersOff) and its next question follows the switches.
   */
  function tierRow(el, off, counts, onChange) {
    off = off || {};
    function paint() {
      el.className = 'kq-tiers';
      el.innerHTML = '<span class="kq-tiers-lab">Question levels</span>' + TIERS.map(function (t) {
        var none = el._counts && !el._counts[t[0]], on = !none && tierOn(el._off, t[0]);
        return '<button type="button" class="btn kq-tier ' + t[0] + '" data-t="' + t[0] + '" aria-pressed="' + on + '"' + (none ? ' disabled' : '') + '>' + t[1] + '</button>';
      }).join('');
    }
    if (!el._kqBound) {
      el._kqBound = true;
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-t]');
        if (!b || b.disabled) return;
        var t = b.dataset.t, now = el._off, next = Object.assign({}, now);
        if (tierOn(now, t)) next[t] = true; else delete next[t];
        var left = TIERS.filter(function (x) { return (!el._counts || el._counts[x[0]]) && tierOn(next, x[0]); });
        if (!left.length) return; // never switch every level off
        el._off = next; el._cb(next); paint();
      });
    }
    el._off = off; el._counts = counts; el._cb = onChange;
    paint();
  }

  window.KruQuiz = { tierRow: tierRow, tierOn: tierOn, shortHint: 'Short answer: write or say it', load: load, unit: unit, html: html, say: say, fit: fit, valid: valid, esc: esc };
})();
