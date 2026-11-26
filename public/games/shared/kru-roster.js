/**
 * Team roster pop-up (Henry, Nov 26): tap a team in any game's score panel -> see its students and change the teams
 * during the game. Tap-to-place (CLAUDE.md rule 3): tap a student, then tap the team to move them to.
 *
 *   KruRoster.open(teamId, { color: fn(teamId) -> css colour, teams: [ids the game plays], onChange: fn() })
 *   KruRoster.link(el, teamId, opts)   // turns a "members" line inside a game's own team panel into a button that opens it
 *   KruRoster.addButton(el, teamId, opts) // or adds a small "✎ Change" button after a game's own member list
 *
 * Changes go to Kru with Kru.saveTeams(): the shell rebuilds session.teams from the member keys, so the Results rows
 * follow the move (a moved student gets the new team's points, an added one the full team score, a removed one no row).
 * Members are changed IN PLACE on Kru.session.teams, so a game holding those team objects sees the new students.
 * Not in Solo mode, not for the teacher's team; a team always keeps at least one student.
 */
(function () {
  'use strict';
  var PALETTE = ['#FFB703', '#FF6B6B', '#2EC4B6', '#9B7BFF', '#4CC9F0', '#A7D129', '#F15BB5', '#FF9F1C', '#00BBF9', '#C77DFF'];
  var back = null, cur = null, sel = null, adding = false, armed = false, opts = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sess() { return window.Kru && Kru.session; }
  function teams() { var s = sess(); return s ? s.teams : []; }
  function byId(id) { return teams().filter(function (t) { return t.id === id; })[0] || null; }
  function playable() {
    var ids = opts.teams && opts.teams.length ? opts.teams : teams().map(function (t) { return t.id; });
    return ids.map(byId).filter(Boolean);
  }
  function colorOf(id) {
    if (opts.color) { try { var c = opts.color(id); if (c) return c; } catch (e) {} }
    var i = teams().map(function (t) { return t.id; }).indexOf(id);
    return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
  }
  function badge(t) { return Kru.badge(t, colorOf(t.id)); }
  function keyOf(m) { return m.key || m.no + '|' + m.nick; }
  function bench() { var s = sess(); if (!s) return []; if (!s.bench) s.bench = []; return s.bench; }

  /** true when this game can edit teams at all (group mode, a real team) */
  function canEdit(teamId) {
    var s = sess();
    return !!(s && s.mode === 'group' && byId(teamId));
  }

  function build() {
    if (back) return;
    back = document.createElement('div');
    back.className = 'kroster-back'; back.hidden = true;
    back.innerHTML = '<div class="kroster" role="dialog" aria-label="Team members"><div class="kr-head" id="krHead"></div><div class="kr-body" id="krBody"></div><div class="kr-foot" id="krFoot"></div></div>';
    document.body.appendChild(back);
    back.addEventListener('click', function (e) {
      if (e.target === back) return close();
      var b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.dataset.kx) return close();
      if (b.dataset.kteam) { cur = b.dataset.kteam; sel = null; adding = false; armed = false; return render(); }
      if (b.dataset.km) { sel = sel === b.dataset.km ? null : b.dataset.km; armed = false; adding = false; return render(); }
      if (b.dataset.kto) return move(sel, b.dataset.kto);
      if (b.dataset.kdel) { if (!armed) { armed = true; return render(); } return remove(sel); }
      if (b.dataset.kadd) { adding = !adding; sel = null; armed = false; return render(); }
      if (b.dataset.kpick) return add(b.dataset.kpick);
    });
  }

  function render() {
    var t = byId(cur);
    if (!t) return close();
    var kr = back.querySelector('.kroster');
    kr.style.setProperty('--kc', colorOf(t.id));
    back.querySelector('#krHead').innerHTML = badge(t) + '<b>' + esc(t.name) + '</b><small>' + t.members.length + ' student' + (t.members.length === 1 ? '' : 's') + '</small><span class="kr-grow"></span><span class="kr-tabs">' + playable().map(function (o) {
      return '<button class="kr-tab' + (o.id === t.id ? ' on' : '') + '" data-kteam="' + esc(o.id) + '" style="--kt:' + colorOf(o.id) + '" aria-label="Show ' + esc(o.name) + '">' + esc(Kru.teamNo(o)) + '</button>';
    }).join('') + '</span><button class="kr-x" data-kx="1" aria-label="Close">✕</button>';
    var body = '';
    if (adding) {
      var list = bench();
      body = '<p class="kr-note">Tap a student to add them to ' + esc(t.name) + ':</p><div class="kr-grid">' +
        (list.length ? list.map(function (m) { return '<button class="kr-chip add" data-kpick="' + esc(keyOf(m)) + '">＋ ' + esc(m.nick) + '</button>'; }).join('') : '<p class="kr-note">Everybody in the class is already on a team.</p>') + '</div>';
    } else {
      body = '<div class="kr-grid">' + t.members.map(function (m) {
        var k = keyOf(m);
        return '<button class="kr-chip' + (sel === k ? ' sel' : '') + '" data-km="' + esc(k) + '" aria-pressed="' + (sel === k) + '">' + esc(m.nick) + '</button>';
      }).join('') + '</div>';
    }
    back.querySelector('#krBody').innerHTML = body;
    var foot = '';
    if (sel && !adding) {
      var m = t.members.filter(function (x) { return keyOf(x) === sel; })[0];
      var last = t.members.length <= 1;
      var others = playable().filter(function (o) { return o.id !== t.id; });
      foot = '<span class="kr-lab">Move <b>' + esc(m ? m.nick : '') + '</b> to:</span>' + others.map(function (o) {
        return '<button class="kr-to" data-kto="' + esc(o.id) + '" style="--kt:' + colorOf(o.id) + '"' + (last ? ' disabled' : '') + ' aria-label="Move to ' + esc(o.name) + '">' + badge(o) + '</button>';
      }).join('') + '<span class="kr-grow"></span><button class="kr-btn danger' + (armed ? ' armed' : '') + '" data-kdel="1"' + (last ? ' disabled' : '') + '>' + (armed ? 'Tap again: remove' : 'Remove (absent)') + '</button>' +
        (last ? '<span class="kr-note">A team needs at least one student.</span>' : '');
    } else {
      foot = '<span class="kr-lab">' + (adding ? '' : 'Tap a student to move or remove them.') + '</span><span class="kr-grow"></span><button class="kr-btn" data-kadd="1">' + (adding ? '← Back to the team' : '＋ Add a student') + '</button>';
    }
    back.querySelector('#krFoot').innerHTML = foot;
  }

  function changed(msg) {
    Kru.saveTeams();
    if (opts.onChange) { try { opts.onChange(); } catch (e) {} }
    sel = null; armed = false;
    render();
    if (msg) flash(msg);
  }
  function flash(msg) {
    var f = document.createElement('div');
    f.className = 'kr-flash'; f.textContent = msg;
    back.querySelector('.kroster').appendChild(f);
    setTimeout(function () { f.remove(); }, 1600);
  }
  function take(t, key) {
    var i = t.members.map(keyOf).indexOf(key);
    return i < 0 ? null : t.members.splice(i, 1)[0];
  }
  function move(key, toId) {
    var t = byId(cur), to = byId(toId);
    if (!t || !to || t.members.length <= 1) return;
    var m = take(t, key);
    if (!m) return;
    to.members.push(m);
    changed(m.nick + ' → ' + to.name);
  }
  function remove(key) {
    var t = byId(cur);
    if (!t || t.members.length <= 1) return;
    var m = take(t, key);
    if (!m) return;
    bench().push(m);
    changed(m.nick + ' is out of the game');
  }
  function add(key) {
    var t = byId(cur), b = bench(), i = b.map(keyOf).indexOf(key);
    if (!t || i < 0) return;
    var m = b.splice(i, 1)[0];
    t.members.push(m);
    adding = false;
    changed(m.nick + ' joined ' + t.name);
  }

  function open(teamId, o) {
    if (!canEdit(teamId)) return false;
    opts = o || {};
    build();
    cur = teamId; sel = null; adding = false; armed = false;
    render();
    back.hidden = false;
    return true;
  }
  function close() { if (back) back.hidden = true; cur = null; }

  /** A game's own team panel shows the members: make that line a button that opens the roster. */
  function link(el, teamId, o) {
    if (!el) return;
    var t = byId(teamId);
    if (!t || !canEdit(teamId)) return;
    el.innerHTML = '<button class="kr-link" type="button">👥 ' + esc(t.members.map(function (m) { return m.nick; }).join(', ') || 'No students') + ' <span class="kr-edit">✎</span></button>';
    el.firstChild.addEventListener('click', function (e) { e.stopPropagation(); open(teamId, o); });
  }

  /** Add a small "✎ Change" button at the end of a game's own member list (the list itself stays as it is). */
  function addButton(el, teamId, o) {
    if (!el || !canEdit(teamId)) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'kr-link'; b.innerHTML = '✎ Change';
    b.addEventListener('click', function (e) { e.stopPropagation(); open(teamId, o); });
    el.appendChild(b);
  }

  window.KruRoster = { open: open, close: close, link: link, addButton: addButton, canEdit: canEdit };
})();
