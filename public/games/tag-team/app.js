/* Tag-Team Talk and Tag-Team Debate (two games, one app: games/tag-team-debate/index.html loads this file too).
   The level's content.json section says which: mode "relay" or "debate".
   Relay (Tag-Team Talk): one team at the front; its speakers take turns on one topic; at each chime: TAG!
   Debate (Tag-Team Debate): FOR team vs AGAINST team; speakers alternate, starting with FOR.
   Teams and speakers come from the Kru session. Speaking order: tap two names to swap, or hold and drag. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var HOLD_MS = 280, SLOP = 8;

  var C = null;       // content for this level
  var teams = [];
  var S = null;       // saved: { v, level, mode, front, forT, againstT, order, used, topic, pts, log }
  var phase = 'ready', turn = 0, total = 0, left = 0, running = false, endAt = 0, timer = 0, audio = null;
  var picked = null;  // { team, k } waiting for a second tap

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function save() { Kru.saveState(S); }
  function debate() { return C.mode === 'debate'; }
  function team(id) { return teams.find(function (t) { return t.id === id; }); }
  function pts(id) { return S.pts[id] || 0; }

  // ---------- speakers ----------
  function key(m) { return m.no + ':' + m.nick; }
  function membersOf(id) {
    var t = team(id);
    if (!t) return [];
    if (t.teacher || !t.members.length) return [{ no: 0, nick: t.name }];
    return t.members;
  }
  function order(id) {
    var base = membersOf(id), saved = S.order[id];
    if (saved && saved.length === base.length) {
      var byKey = {};
      base.forEach(function (m) { byKey[key(m)] = m; });
      var list = saved.map(function (k) { return byKey[k]; });
      if (list.every(Boolean)) return list;
    }
    return base.slice();
  }
  function size() {
    if (!debate()) return Math.max(1, membersOf(S.front).length);
    return Math.max(1, Math.min(6, Math.max(membersOf(S.forT).length, membersOf(S.againstT).length)));
  }
  function turns() { return debate() ? size() * 2 : size(); }
  /** What a lane slot shows: [name, small line, team id, member index or -1] */
  function slot(i) {
    var n = size();
    if (!debate()) {
      var m = order(S.front)[i];
      var role = n === 1 ? 'start + finish' : i === 0 ? 'start' : i === n - 1 ? 'finish' : 'continue';
      return [m ? m.nick : 'Speaker ' + (i + 1), role, S.front, m ? i : -1];
    }
    var side = i % 2, k = Math.floor(i / 2), id = side === 0 ? S.forT : S.againstT, list = order(id);
    var label = side === 0 ? 'FOR' : 'AGAINST';
    var r = k === 0 ? 'opening' : k === n - 1 ? 'closing' : 'reply';
    if (list.length === 1) return [list[0].nick, label + ' · ' + r, id, -1];
    if (!list[k]) return ['Extra turn', label + ' · strongest speaker', id, -1];
    return [list[k].nick, label + ' · ' + r, id, k];
  }
  function moveSpeaker(id, from, to, swap) {
    var list = order(id);
    if (from === to || to < 0 || to >= list.length) return;
    if (swap) { var x = list[from]; list[from] = list[to]; list[to] = x; }
    else { var m = list.splice(from, 1)[0]; list.splice(to, 0, m); }
    S.order[id] = list.map(key);
    save();
    renderLane();
  }

  // ---------- sound (started inside a tap, for the iPhone) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }
  function tone(freqs, gap, dur, vol) {
    if (!audio) return;
    gap = gap || 0.18; dur = dur || 0.3; vol = vol || 0.35;
    try {
      freqs.forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * gap;
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.05);
      });
    } catch (e) {}
  }
  function flash(text, cls, ms) {
    var f = $('flash');
    f.textContent = text;
    f.className = 'flash ' + (cls || '');
    f.hidden = false;
    clearTimeout(flash.t);
    flash.t = setTimeout(function () { f.hidden = true; }, ms || 900);
  }

  // ---------- timer ----------
  function run() {
    unlockAudio();
    running = true;
    endAt = Date.now() + left * 1000;
    clearInterval(timer);
    timer = setInterval(tick, 200);
    render();
  }
  function pause() {
    if (running) left = Math.max(0, (endAt - Date.now()) / 1000);
    running = false;
    clearInterval(timer);
    render();
  }
  function tick() {
    if (!running) return;
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) {
      if (phase === 'huddle') { tone([523, 659, 784]); startTalk(); return; }
      if (phase === 'talk') {
        if (turn + 1 < turns()) {
          turn++; total = C.turn; endAt = Date.now() + total * 1000; left = total;
          tone([880, 1175], 0.12, 0.22); flash('TAG!', 'tag-flash', 700);
        } else {
          left = 0; running = false; clearInterval(timer); phase = 'done';
          KruBonus.reveal();
          tone([784, 659, 523, 392], 0.2, 0.35);
        }
      }
    }
    render();
  }
  function startHuddle() { phase = 'huddle'; total = left = C.huddle; turn = 0; picked = null; run(); }
  function startTalk() { phase = 'talk'; turn = 0; total = left = C.turn; picked = null; tone([660, 880], 0.12); run(); }
  function nextSpeaker() {
    if (phase !== 'talk') return;
    if (turn + 1 < turns()) {
      turn++; total = left = C.turn;
      tone([880, 1175], 0.12, 0.22); flash('TAG!', 'tag-flash', 600);
      if (running) endAt = Date.now() + left * 1000;
      render();
    } else { pause(); phase = 'done'; render(); KruBonus.reveal(); }
  }
  function resetAll() {
    if (phase === 'done') S.turnNo = (S.turnNo || 0) + 1; // the next team's turn
    pause(); phase = 'ready'; turn = 0; total = left = C.turn;
    bonusRound('turn' + (S.turnNo || 0));
    render();
  }

  // ---------- topic ----------
  function fitTopic() {
    var box = $('topic').parentNode.parentNode, el = $('topic'), sz = 32;
    el.style.fontSize = sz + 'px';
    while (sz > 16 && box.scrollHeight > box.clientHeight + 1) el.style.fontSize = (sz -= 2) + 'px';
  }
  function spin() {
    unlockAudio();
    var list = C.topics, pool = list.filter(function (t) { return S.used.indexOf(t) < 0; });
    if (!pool.length) { S.used = []; pool = list.slice(); }
    var pick = pool[Math.floor(Math.random() * pool.length)];
    S.used.push(pick);
    S.topic = pick;
    save();
    resetAll();
    var el = $('topic'), k = 0;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = pick; fitTopic(); tone([988], 0, 0.25); return; }
    el.classList.add('spinning');
    var iv = setInterval(function () {
      el.textContent = list[Math.floor(Math.random() * list.length)];
      tone([300 + k * 25], 0, 0.05, 0.12);
      fitTopic();
      if (++k > 14) { clearInterval(iv); el.textContent = pick; el.classList.remove('spinning'); fitTopic(); tone([988, 1319], 0.1, 0.3); }
    }, 70);
  }

  // ---------- render ----------
  var TEXT = {
    ready: ['Ready', function () { return S.topic ? 'Start the huddle when the team is ready.' : 'Spin a topic, then start the huddle.'; }],
    huddle: ['Huddle!', function () { return debate() ? 'FOR team and AGAINST team: plan your points and your replies.' : 'Plan who says what. The first speaker starts, the last speaker finishes.'; }],
    talk: [null, function () { return debate() ? 'Answer the last point first, then add a new one.' : 'Keep talking until the chime. Then TAG!'; }],
    done: ["Time's up!", function () { return 'Audience: any challenges? Give points, then the next team.'; }],
  };
  function render() {
    $('digits').textContent = fmt(left);
    $('fill').style.transform = 'scaleX(' + (total ? Math.max(0, left) / total : 0) + ')';
    $('fill').style.background = left <= 5 && running ? 'var(--coral)' : debate() && phase === 'talk' ? (turn % 2 ? 'var(--against)' : 'var(--for)') : 'var(--gold)';
    $('phase').textContent = phase === 'talk' ? slot(turn)[0] + ' is talking' : TEXT[phase][0];
    $('sub').textContent = TEXT[phase][1]();
    var main = $('main');
    main.textContent = phase === 'ready' ? 'Start huddle' : phase === 'huddle' ? 'Start talking' : phase === 'talk' ? (turn + 1 < turns() ? 'Next speaker' : 'Finish turn') : 'New round';
    $('pause').textContent = running ? 'Pause' : 'Resume';
    $('pause').disabled = phase === 'ready' || phase === 'done';
    paintLane();
  }
  function renderLane() {
    var n = size(), lane = $('lane');
    lane.style.setProperty('--n', n);
    var html = '';
    for (var i = 0; i < turns(); i++) {
      var s = slot(i), cls = debate() ? (i % 2 ? ' against' : ' for') : '';
      var pos = debate() ? ' style="grid-row:' + ((i % 2) + 1) + ';grid-column:' + (Math.floor(i / 2) + 1) + '"' : '';
      var movable = s[3] >= 0 && membersOf(s[2]).length > 1;
      var data = movable ? ' data-team="' + esc(s[2]) + '" data-k="' + s[3] + '"' : '';
      html += '<div class="slot' + cls + (movable ? ' movable' : '') + '" id="slot-' + i + '"' + pos + data + '>' + esc(s[0]) + '<small>' + esc(s[1]) + '</small></div>';
    }
    lane.innerHTML = html;
    paintLane();
  }
  function paintLane() {
    for (var i = 0; i < turns(); i++) {
      var el = $('slot-' + i);
      if (!el) continue;
      el.classList.toggle('now', phase === 'talk' && i === turn);
      el.classList.toggle('done', phase === 'talk' ? i < turn : phase === 'done');
      el.classList.toggle('picked', !!picked && el.dataset.team === picked.team && +el.dataset.k === picked.k);
    }
  }
  function renderPicks() {
    function btn(role, id, side) {
      var t = team(id);
      return '<button class="pick ' + role + '" data-role="' + role + '"><span class="side">' + side + '</span>' + esc(t ? t.name : '?') + ' ▾</button>';
    }
    $('picks').innerHTML = debate()
      ? btn('for', S.forT, 'FOR') + '<span class="vs">vs</span>' + btn('against', S.againstT, 'AGAINST')
      : btn('front', S.front, 'AT THE FRONT');
  }
  function renderTeams() {
    var max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }));
    $('strip').innerHTML = teams.map(function (t) {
      var role = debate() ? (t.id === S.forT ? ' is-for' : t.id === S.againstT ? ' is-against' : '') : t.id === S.front ? ' is-front' : '';
      return '<button class="tile' + role + (max > 0 && pts(t.id) === max ? ' lead' : '') + '" data-t="' + esc(t.id) + '" aria-label="' + esc(t.name) + ', ' + pts(t.id) + ' points. Tap to give points">' +
        '<span class="tn">' + esc(t.name) + '</span><span class="tp">' + pts(t.id) + '</span></button>';
    }).join('');
  }
  function renderAll() {
    $('logoMode').textContent = C.title;
    $('topicLabel').textContent = C.label;
    $('topic').textContent = S.topic || 'Tap Spin to choose a ' + C.label.toLowerCase();
    renderPicks();
    renderLane();
    renderTeams();
    render();
    fitTopic();
  }

  // ---------- choosing teams ----------
  var choosing = null;
  function openChoose(role) {
    choosing = role;
    var current = role === 'for' ? S.forT : role === 'against' ? S.againstT : S.front;
    $('chooseTitle').textContent = role === 'for' ? 'Which team is FOR?' : role === 'against' ? 'Which team is AGAINST?' : 'Which team is at the front?';
    $('chooseList').innerHTML = teams.map(function (t) {
      var who = t.teacher ? 'Teacher' : t.members.map(function (m) { return m.nick; }).join(', ');
      return '<button class="btn" data-pick="' + esc(t.id) + '" aria-pressed="' + (t.id === current) + '">' + esc(t.name) + '<small>' + esc(who) + '</small></button>';
    }).join('');
    $('chooseBack').hidden = false;
  }
  $('picks').addEventListener('click', function (e) {
    var b = e.target.closest('[data-role]');
    if (b) openChoose(b.dataset.role);
  });
  $('chooseList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick]');
    if (!b) return;
    var id = b.dataset.pick;
    if (choosing === 'front') S.front = id;
    else if (choosing === 'for') { if (id === S.againstT) S.againstT = S.forT; S.forT = id; }
    else { if (id === S.forT) S.forT = S.againstT; S.againstT = id; }
    picked = null;
    save();
    $('chooseBack').hidden = true;
    resetAll();
    renderAll();
  });
  $('chooseClose').addEventListener('click', function () { $('chooseBack').hidden = true; });
  $('chooseBack').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });

  // ---------- speaking order: tap two names to swap (main way); hold and drag (also works) ----------
  var drag = null, hold = null, justDragged = false;
  $('lane').addEventListener('click', function (e) {
    if (justDragged) return;
    var el = e.target.closest('.slot.movable');
    if (!el || phase === 'talk') return;
    var id = el.dataset.team, k = +el.dataset.k;
    if (picked && picked.team === id && picked.k === k) picked = null;
    else if (picked && picked.team === id) { moveSpeaker(id, picked.k, k, true); picked = null; }
    else picked = { team: id, k: k };
    paintLane();
  });
  $('lane').addEventListener('pointerdown', function (e) {
    var el = e.target.closest('.slot.movable');
    if (!el || phase === 'talk') return;
    var start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    var begin = function () {
      drag = { el: el, team: el.dataset.team, k: +el.dataset.k, over: null };
      el.classList.add('dragging');
      try { $('lane').setPointerCapture(start.id); } catch (err) {}
    };
    // touch: hold still for a moment, then drag (a quick tap stays a tap). Mouse: drag once it moves.
    hold = { el: el, start: start, mouse: e.pointerType === 'mouse', begin: begin, t: e.pointerType === 'mouse' ? 0 : setTimeout(begin, HOLD_MS) };
  });
  $('lane').addEventListener('pointermove', function (e) {
    if (hold && !drag) {
      var moved = Math.hypot(e.clientX - hold.start.x, e.clientY - hold.start.y);
      if (hold.mouse && moved > 5) hold.begin();
      else if (!hold.mouse && moved > SLOP) { clearTimeout(hold.t); hold = null; }
    }
    if (!drag) return;
    var t = document.elementFromPoint(e.clientX, e.clientY), el = t && t.closest('.slot.movable');
    if (drag.over && drag.over !== el) drag.over.classList.remove('target');
    if (el && el !== drag.el && el.dataset.team === drag.team) { el.classList.add('target'); drag.over = el; } else drag.over = null;
  });
  function endDrag() {
    if (hold) { clearTimeout(hold.t); hold = null; }
    if (!drag) return;
    var d = drag;
    drag = null;
    d.el.classList.remove('dragging');
    if (d.over) {
      d.over.classList.remove('target');
      picked = null;
      moveSpeaker(d.team, d.k, +d.over.dataset.k, false);
      justDragged = true;
      setTimeout(function () { justDragged = false; }, 80);
    }
  }
  $('lane').addEventListener('pointerup', endDrag);
  $('lane').addEventListener('pointercancel', endDrag);

  // ---------- points ----------
  var panelTeam = null;
  function openPanel(id) {
    var t = team(id);
    if (!t) return;
    panelTeam = t;
    $('panelName').textContent = t.name;
    $('panelPts').textContent = pts(id) + ' points';
    $('panelMembers').textContent = t.teacher ? 'Teacher' : t.members.map(function (m) { return m.nick; }).join(', ');
    $('panelBack').hidden = false;
  }
  function closePanel() { $('panelBack').hidden = true; panelTeam = null; }
  $('strip').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]');
    if (b) openPanel(b.dataset.t);
  });
  $('panelBtns').addEventListener('click', function (e) {
    var b = e.target.closest('[data-d]');
    if (!b || !panelTeam) return;
    bump(panelTeam.id, Number(b.dataset.d), b.dataset.why);
    closePanel();
  });
  $('panelClose').addEventListener('click', closePanel);
  $('panelBack').addEventListener('click', function (e) { if (e.target === this) closePanel(); });

  function bump(id, d, why) {
    var before = pts(id), after = Math.max(0, before + d), real = after - before;
    if (!real) return;
    S.pts[id] = after;
    S.log.push({ t: id, d: real, why: why });
    if (S.log.length > 300) S.log.shift();
    save();
    Kru.score(id, real, why);
    renderTeams();
    toast(team(id).name + ' ' + (real > 0 ? '+' : '−') + Math.abs(real) + ' (' + why + ')');
  }
  function undo() {
    var L = S.log.pop();
    if (!L) return;
    S.pts[L.t] = Math.max(0, pts(L.t) - L.d);
    save();
    Kru.score(L.t, -L.d, 'undo');
    renderTeams();
    $('toast').hidden = true;
  }
  var toastTimer = 0;
  function toast(text) {
    $('toastText').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').hidden = true; }, 5000);
  }
  $('toastUndo').addEventListener('click', undo);

  // ---------- main buttons ----------
  $('spin').addEventListener('click', spin);
  $('main').addEventListener('click', function () {
    if (phase === 'ready') startHuddle();
    else if (phase === 'huddle') startTalk();
    else if (phase === 'talk') nextSpeaker();
    else resetAll();
  });
  $('pause').addEventListener('click', function () { running ? pause() : run(); });
  $('challenge').addEventListener('click', function () {
    unlockAudio();
    if (running) pause();
    tone([220, 196], 0.15, 0.3, 0.4);
    flash('CHALLENGE!', '', 1400);
  });

  // ---------- ⋯ menu ----------
  function closeMenu() { $('menuBack').hidden = true; }
  function disarm() { $('resetScores').classList.remove('armed'); $('resetScores').textContent = 'Reset all scores'; }
  $('more').addEventListener('click', function () { $('undo').disabled = !S.log.length; disarm(); $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('resetTimer').addEventListener('click', function () { resetAll(); closeMenu(); });
  $('resetOrder').addEventListener('click', function () {
    [S.front, S.forT, S.againstT].forEach(function (id) { delete S.order[id]; });
    picked = null; save(); renderLane(); closeMenu();
  });
  $('undo').addEventListener('click', function () { undo(); closeMenu(); });
  // How to play slides: before the game starts, and from the ⋯ menu
  var INTRO = [];
  function showIntro() { return KruIntro.show(INTRO, { title: debate() ? 'Tag-Team Debate' : 'Tag-Team Talk' }); }
  $('howTo').addEventListener('click', function () { closeMenu(); showIntro(); });
  $('resetScores').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed'); btn.textContent = 'Tap again: all scores back to 0';
      setTimeout(disarm, 3500);
      return;
    }
    teams.forEach(function (t) { if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'reset'); });
    S.pts = {}; S.log = [];
    save(); renderTeams(); closeMenu();
  });

  document.addEventListener('keydown', function (e) {
    var open = ['menuBack', 'panelBack', 'chooseBack'].some(function (id) { return !$(id).hidden; });
    if (open) return;
    var k = e.key.toLowerCase();
    if (e.code === 'Space') {
      e.preventDefault();
      if (phase === 'ready') startHuddle(); else if (phase === 'done') resetAll(); else running ? pause() : run();
    } else if (k === 'n') nextSpeaker();
    else if (k === 'c') $('challenge').click();
    else if (k === 's') spin();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', fitTopic);

  Kru.onFinishRequest(function () {
    Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
  });

  // ---------- start ----------
  // ---------- bonus cards (shared: games/shared/kru-bonus.js) ----------
  // before cards pop up when a round starts; secret cards at the reveal. Points: tap the ★ chip, then teams.
  function bonusRound(key) { var b = KruBonus.next(S.kbonus, key); if (b !== S.kbonus) { S.kbonus = b; save(); } }

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    Promise.all([contentReady, window.KruQuiz ? KruQuiz.unit(session) : null]).then(function (both) {
      var content = both[0], unit = both[1];
      var level = content[session.level] ? session.level : 'M.2';
      C = content[level];
      // Tag-Team Debate with a unit from Henry's lessons: that unit's motions
      if (unit && C.mode === 'debate' && unit.motions && unit.motions.length) C = Object.assign({}, C, { topics: unit.motions });
      teams = Kru.allTeams();
      KruEnd.setup({ standings: function () { return teams.map(function (t) { return { name: t.name, points: pts(t.id), teacher: !!t.teacher }; }); } });
      KruBonus.setup({ cards: content.bonus, bar: $('more').parentNode, beforeEl: $('more'), teams: function () { return teams; }, save: function () { save(); },
        award: function (id, d, card) { bump(id, d, 'bonus: ' + card.name); } });
      var students = teams.filter(function (t) { return !t.teacher; });
      var first = (students[0] || teams[0]).id, second = (students[1] || teams.find(function (t) { return t.id !== first; }) || teams[0]).id;
      var saved = session.resume;
      // old saves have no mode: back then M.3 was the debate and M.1 / M.2 the relay
      var savedMode = saved && (saved.mode || (saved.level === 'M.3' ? 'debate' : 'relay'));
      if (saved && saved.v === 1 && saved.level === level && savedMode === C.mode) S = saved;
      else S = { v: 1, level: level, front: first, forT: first, againstT: second, order: {}, used: [], topic: null, pts: {}, log: [] };
      // teams can't change during a session, but be safe if a saved id is missing
      if (!team(S.front)) S.front = first;
      if (!team(S.forT)) S.forT = first;
      if (!team(S.againstT)) S.againstT = second;
      S.mode = C.mode;
      S.order = S.order || {}; S.pts = S.pts || {}; S.log = S.log || []; S.used = S.used || [];
      total = left = C.turn;
      bonusRound('turn' + (S.turnNo || 0));
      renderAll();
      INTRO = KruIntro.forLevel(content, level);
      if (!S.introDone) showIntro().then(function () { S.introDone = true; save(); });
    }).catch(function () {
      $('topic').textContent = 'Could not load the topics. Close the game and open it again.';
    });
  });
})();
