/* Scoreboard: +1 / +2 / −1 per team. Uses the session's team names; saves through the shell. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var $ = function (id) { return document.getElementById(id); };
  var teams = [];
  var state = { points: {}, log: [] };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function render() {
    var max = Math.max.apply(null, teams.map(function (t) { return state.points[t.id] || 0; }));
    $('teams').innerHTML = teams.map(function (t, i) {
      var p = state.points[t.id] || 0;
      var lead = max > 0 && p === max ? ' lead' : '';
      var members = t.teacher ? 'Teacher' : t.members.map(function (m) { return m.nick; }).join(', ');
      return '<div class="team' + lead + (t.teacher ? ' teacher' : '') + '" style="--c:' + COLORS[i % COLORS.length] + '">' +
        '<div class="name">' + esc(t.name) + '</div>' +
        '<div class="pts" id="pts-' + esc(t.id) + '">' + p + '</div>' +
        '<div class="members">' + esc(members) + '</div>' +
        '<div class="btns">' +
          '<button data-t="' + esc(t.id) + '" data-d="-1" aria-label="' + esc(t.name) + ' minus 1">−1</button>' +
          '<button class="plus" data-t="' + esc(t.id) + '" data-d="1" aria-label="' + esc(t.name) + ' plus 1">+1</button>' +
          '<button class="plus" data-t="' + esc(t.id) + '" data-d="2" aria-label="' + esc(t.name) + ' plus 2">+2</button>' +
        '</div></div>';
    }).join('');
    $('undo').disabled = state.log.length === 0;
  }

  function change(teamId, delta) {
    state.points[teamId] = (state.points[teamId] || 0) + delta;
    state.log.push({ t: teamId, d: delta });
    if (state.log.length > 300) state.log.shift();
    Kru.saveState(state);
    Kru.score(teamId, delta);
    render();
  }

  $('teams').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-t]');
    if (b) change(b.dataset.t, Number(b.dataset.d));
  });

  $('undo').addEventListener('click', function () {
    var last = state.log.pop();
    if (!last) return;
    state.points[last.t] = (state.points[last.t] || 0) - last.d;
    Kru.saveState(state);
    Kru.score(last.t, -last.d, 'undo');
    render();
  });

  Kru.onFinishRequest(function () {
    Kru.finish(teams.map(function (t) { return { teamId: t.id, points: state.points[t.id] || 0 }; }));
  });

  Kru.ready(function (session) {
    teams = Kru.allTeams();
    if (session.resume && session.resume.points) state = session.resume;
    $('teams').classList.toggle('solo', session.mode === 'solo');
    $('teams').classList.toggle('many', session.mode !== 'solo' && teams.length >= 9); // compact cards: 3 rows fit the phone
    $('meta').textContent = session.class + (session.mode === 'solo' ? ' · solo' : ' · ' + session.teams.length + ' teams');
    $('hint').textContent = Kru.mock
      ? 'Mock mode: placeholder students. Inside Kru, use the home button → Finish to review scores.'
      : 'When you are done, tap the home button → Finish & review scores.';
    render();
  });
})();
