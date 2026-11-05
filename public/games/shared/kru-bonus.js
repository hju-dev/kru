/**
 * Kru bonus cards, shared by the games. Two kinds:
 *   before: shown when a round starts ("Words with U count double")  ~1 round in 3
 *   secret: hidden, revealed when the answers are revealed / the round ends  ~1 round in 4
 * Cards live in the game's content.json:
 *   "bonus": { "before": [ { "id", "name", "text", "points"? } ], "secret": [ ... ] }
 * points = a "+N" Henry can give to teams that earned it (tap the ★ chip → tap teams). No points = a rule only.
 * only = ["short"]: the card only comes up when the game says the round is that kind (KruBonus.next(prev, key, ["short"])).
 *   Quiz Battle: "short" (short answer) or "choice" (A-D). Spelling counts makes no sense before A-D.
 *
 * Use (in the game):
 *   KruBonus.setup({ cards, bar, beforeEl, teams: () => [...], award: (teamId, delta, card) => {}, save })
 *   S.bonus = KruBonus.next(S.bonus, key)   // a new round / question: maybe announce a before card
 *   KruBonus.reveal()                       // answers revealed / time up: maybe announce the secret card
 *   KruBonus.attach(S.bonus)                // after a reload: show the chip again
 */
(function () {
  'use strict';
  var P_BEFORE = 1 / 3, P_SECRET = 1 / 4;
  var cfg = null, state = null, chip = null, box = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function pick(list, lastId) {
    if (!list || !list.length) return null;
    var options = list.length > 1 ? list.filter(function (c) { return c.id !== lastId; }) : list;
    return options[Math.floor(Math.random() * options.length)];
  }

  /** Cards allowed this round: no "only", or an "only" that matches one of the round's tags. */
  function allowed(list, tags) {
    if (!list) return null;
    return list.filter(function (c) {
      return !c.only || c.only.some(function (t) { return (tags || []).indexOf(t) >= 0; });
    });
  }
  /** Pure: decide the cards for a new round. rnd() is Math.random (replaceable in tests). */
  function draw(cards, prev, key, rnd, tags) {
    rnd = rnd || Math.random;
    var b = cards && allowed(cards.before, tags), s = cards && allowed(cards.secret, tags);
    var before = b && b.length && rnd() < P_BEFORE ? pick(b, prev && prev.before && prev.before.id) : null;
    var secret = s && s.length && rnd() < P_SECRET ? pick(s, prev && prev.secret && prev.secret.id) : null;
    return { key: key, before: before, secret: secret, shown: false, awarded: { before: [], secret: [] } };
  }

  // ---------- the ★ chip in the game's top bar ----------
  function renderChip() {
    if (!chip) return;
    var cards = active();
    chip.hidden = !cards.length;
    if (!cards.length) return;
    chip.innerHTML = '<span aria-hidden="true">★</span> ' + esc(cards.map(function (c) { return c.card.name; }).join(' + '));
    chip.classList.toggle('secret', cards.some(function (c) { return c.kind === 'secret'; }));
  }
  function active() {
    var out = [];
    if (state && state.before) out.push({ kind: 'before', card: state.before });
    if (state && state.secret && state.shown) out.push({ kind: 'secret', card: state.secret });
    return out;
  }

  // ---------- the big card (+ give points to teams) ----------
  function open(kind, announce) {
    var card = state && state[kind];
    if (!card) return;
    if (box) box.remove();
    box = document.createElement('div');
    box.className = 'kb';
    box.setAttribute('role', 'dialog');
    var teams = cfg && cfg.teams ? cfg.teams() : [];
    var given = state.awarded[kind] || (state.awarded[kind] = []);
    var pts = card.points;
    var html = '<div class="kb-card ' + kind + (announce ? ' pop' : '') + '">' +
      '<div class="kb-label">' + (kind === 'secret' ? 'Secret bonus!' : 'Bonus card') + '</div>' +
      '<div class="kb-name">' + esc(card.name) + '</div>' +
      '<div class="kb-text">' + esc(card.text) + '</div>';
    if (pts && teams.length) {
      html += '<div class="kb-hint">Tap each team that earned it (+' + pts + '). Tap again to take it back.</div><div class="kb-teams">' +
        teams.map(function (t) {
          var on = given.indexOf(t.id) >= 0;
          return '<button class="kb-team' + (on ? ' on' : '') + '" data-t="' + esc(t.id) + '">' + esc(t.name) + (on ? ' ✓ +' + pts : '') + '</button>';
        }).join('') + '</div>';
    }
    html += '<button class="kb-ok">' + (announce && kind === 'before' ? 'OK, play!' : 'Close') + '</button></div>';
    box.innerHTML = html;
    document.body.appendChild(box);
    box.querySelector('.kb-ok').addEventListener('click', close);
    box.addEventListener('click', function (e) {
      if (e.target === box) return close();
      var b = e.target.closest('[data-t]');
      if (!b || !cfg || !cfg.award) return;
      var id = b.dataset.t, i = given.indexOf(id);
      if (i >= 0) { given.splice(i, 1); cfg.award(id, -pts, card); }
      else { given.push(id); cfg.award(id, pts, card); }
      if (cfg.save) cfg.save();
      open(kind, false);
    });
  }
  function close() { if (box) box.remove(); box = null; }

  var api = {
    draw: draw,
    setup: function (c) {
      cfg = c;
      if (c.bar && !chip) {
        chip = document.createElement('button');
        chip.className = 'kb-chip';
        chip.hidden = true;
        chip.setAttribute('aria-label', 'Bonus card');
        chip.addEventListener('click', function () {
          var cards = active();
          if (cards.length) open(cards[cards.length - 1].kind, false);
          // two cards at once: open the secret one; its Close shows the other via the chip again
        });
        if (c.beforeEl) c.bar.insertBefore(chip, c.beforeEl); else c.bar.appendChild(chip);
      }
    },
    /** A new round: returns the new bonus state (keep it in the game's saved state). Same key = no change. */
    next: function (prev, key, tags) {
      if (prev && prev.key === key) { state = prev; renderChip(); return prev; }
      state = draw(cfg && cfg.cards, prev, key, null, tags);
      renderChip();
      if (state.before) setTimeout(function () { open('before', true); }, 0);
      return state;
    },
    /** Answers revealed / time up: show the secret card, once. */
    reveal: function () {
      if (!state || !state.secret || state.shown) return;
      state.shown = true;
      if (cfg && cfg.save) cfg.save();
      renderChip();
      open('secret', true);
    },
    attach: function (s) { state = s || null; renderChip(); },
    /** Teams already given this round's bonus (to undo it with the round). */
    current: function () { return state; },
    isOpen: function () { return !!box; },
  };
  window.KruBonus = api;
})();
