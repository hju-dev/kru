/**
 * Kru Game SDK — the contract between the Kru app (shell) and every game.
 *
 * In a game page:
 *   <script src="/sdk/kru.js"></script>
 *   Kru.ready(function (session) { ...build the game from session.teams, session.level... })
 *   Kru.saveState(state)                  // the shell keeps it; comes back as session.resume
 *   Kru.score(teamId, delta, reason)      // optional live log
 *   Kru.onFinishRequest(function () { Kru.finish([{ teamId, points }], notes) })
 *
 * Opened on its own (not inside Kru) or with ?mock=1, the game gets a fake class of 30
 * placeholder students. Extra mock options: &mode=solo  &level=M.1  &teams=6  &teacher=0
 */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var inFrame = window.parent !== window;
  var mock = params.get('mock') === '1' || !inFrame;
  var mockKey = 'kru-mock-state:' + location.pathname;

  var session = null;
  var readyCallbacks = [];
  var finishCallbacks = [];

  function post(msg) {
    if (!mock) window.parent.postMessage(msg, location.origin);
  }

  function start(s) {
    session = s;
    Kru.session = s;
    readyCallbacks.splice(0).forEach(function (cb) { cb(s); });
  }

  function mockSession() {
    var mode = params.get('mode') === 'solo' ? 'solo' : 'group';
    var level = /^M\.[123]$/.test(params.get('level') || '') ? params.get('level') : 'M.2';
    var students = [];
    for (var i = 1; i <= 30; i++) students.push({ no: i, nick: 'S' + i });
    var teams;
    if (mode === 'solo') {
      teams = students.map(function (s) { return { id: 's' + s.no, name: s.nick, members: [s] }; });
    } else {
      var n = Math.max(2, Math.min(10, Number(params.get('teams')) || 6));
      teams = [];
      for (var t = 0; t < n; t++) teams.push({ id: 't' + (t + 1), name: 'Team ' + (t + 1), members: [] });
      students.forEach(function (s, k) { teams[k % n].members.push(s); });
    }
    var resume;
    try { resume = JSON.parse(sessionStorage.getItem(mockKey) || 'null') || undefined; } catch (e) {}
    return {
      id: 'mock',
      class: 'M.' + level.slice(2) + '/1',
      level: level,
      mode: mode,
      teams: teams,
      teacherTeam: params.get('teacher') === '0' ? null : { id: 't0', name: 'T. Henry' },
      resume: resume,
    };
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    var d = e.data || {};
    if (d.type === 'kru:init') start(d.session);
    else if (d.type === 'kru:finish-request') {
      finishCallbacks.forEach(function (cb) { cb(); });
    }
  });

  var Kru = {
    /** true when running on its own for development */
    mock: mock,
    session: null,

    /** Calls cb(session) once the shell has sent the class, level and teams. */
    ready: function (cb) {
      if (session) cb(session);
      else readyCallbacks.push(cb);
    },

    /** Teams plus the teacher team (if playing), for building a scoreboard. */
    allTeams: function () {
      if (!session) return [];
      var list = session.teams.slice();
      if (session.teacherTeam) list.push({ id: session.teacherTeam.id, name: session.teacherTeam.name, members: [], teacher: true });
      return list;
    },

    saveState: function (state) {
      if (mock) {
        try { sessionStorage.setItem(mockKey, JSON.stringify(state)); } catch (e) {}
      } else post({ type: 'kru:state', state: state });
    },

    score: function (teamId, delta, reason) {
      post({ type: 'kru:score', teamId: teamId, delta: delta, reason: reason });
    },

    finish: function (scores, notes) {
      if (mock) console.log('[Kru mock] finish', scores, notes || '');
      post({ type: 'kru:finish', scores: scores, notes: notes });
    },

    /** cb runs when Henry taps "Finish & review scores". It should call Kru.finish(...). */
    onFinishRequest: function (cb) {
      finishCallbacks.push(cb);
    },
  };

  window.Kru = Kru;

  if (mock) setTimeout(function () { start(mockSession()); }, 0);
  else post({ type: 'kru:ready' });
})();
