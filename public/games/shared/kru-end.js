/**
 * Shared bits for team games:
 *  - KruCorner.set(stageEl, '6/50')  the question counter in the top-right corner of the question area
 *  - KruEnd.setup({ standings })     the end of every scored game is the same, wherever Henry starts it:
 *        🏆 in the top bar, "End game & final scores" in the ⋯ menu, Kru's home → Finish, or the game
 *        itself at its natural end (KruEnd.show()). First the podium (3rd, 2nd, then 1st, with a drumroll
 *        and confetti), then "Save scores & finish" (sends the scores) or the full list.
 *    standings() returns [{ name, points, teacher? }]
 *  - KruEnd.show({ keepPlaying })      keepPlaying(): optional, runs when Henry chooses "Keep playing"
 */
(function () {
  'use strict';
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /** The students on a team, e.g. "S1, S9, S17": from the standings if a game sends them, else from the Kru session. */
  function membersOf(t) {
    var list = t.members;
    if (!list && window.Kru && Kru.allTeams) {
      var found = Kru.allTeams().filter(function (x) { return x.name === t.name; })[0];
      list = found && found.members;
    }
    return (list || []).map(function (m) { return m.nick; }).filter(Boolean).join(', ');
  }
  window.KruMembers = membersOf;

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

  var cfg = null, box = null, opts = {};
  function keepPlaying() { var k = opts.keepPlaying; opts = {}; if (k) k(); }
  function save() { opts = {}; Kru.endGame(); }
  /** The ranked final scoreboard (also the last step of the podium). */
  function showList() {
    if (box) box.remove();
    var list = (cfg && cfg.standings ? cfg.standings() : []).slice().sort(function (a, b) { return b.points - a.points; });
    var students = list.filter(function (t) { return !t.teacher; });
    var rank = 0, prev = null;
    var rows = students.map(function (t, i) {
      if (t.points !== prev) { rank = i + 1; prev = t.points; }
      var who = membersOf(t);
      return '<li class="ke-row' + (rank === 1 ? ' first' : '') + '"><span class="ke-rank">' + rank + '</span><span class="ke-name">' + esc(t.name) +
        (who ? '<small class="ke-mem">' + esc(who) + '</small>' : '') + '</span><b>' + t.points + '</b></li>';
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
      if (b.dataset.k === 'save') { box.remove(); box = null; save(); }
      else { box.remove(); box = null; keepPlaying(); }
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
        window.KruEnd.show();
      });
      // 🏆 in the top bar, next to ⋯: always one tap from the winners
      var more = document.getElementById('more');
      if (more && !document.getElementById('keTrophy')) {
        var t = document.createElement('button');
        t.id = 'keTrophy';
        t.type = 'button';
        t.className = (more.className || 'small') + ' ke-trophy';
        t.setAttribute('aria-label', 'Winners and final scores');
        t.textContent = '🏆';
        more.parentNode.insertBefore(t, more);
        t.addEventListener('click', function () { window.KruEnd.show(); });
      }
      // Kru's home → Finish: the podium first, then the scores are sent
      if (window.Kru && Kru.beforeFinish) Kru.beforeFinish(function () { window.KruEnd.show(); });
    },
    show: function (o) {
      opts = o || {};
      KruPodium.show(cfg && cfg.standings ? cfg.standings() : [], showList, { save: save, keepPlaying: function () { if (box) { box.remove(); box = null; } keepPlaying(); } });
    },
    list: showList,
  };
})();

/**
 * KruPodium: the end-of-game reveal. A dark stage, a drumroll, then 3rd, 2nd and (after a longer
 * drumroll) 1st place rise up, with a fanfare and confetti for the winner. Tap to skip ahead.
 * Ties share a step. The teacher's team is never on the podium. With no points yet it goes
 * straight to the score list.
 *   KruPodium.show(standings, then, actions)   standings: [{ name, points, teacher? }]   then(): the score list
 *     actions: { save(), keepPlaying() }: buttons on the podium once 1st place is revealed
 *   KruPodium.places(standings)       -> [[1st names...], [2nd...], [3rd...]] (pure, for tests)
 */
(function () {
  'use strict';
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  var CONFETTI = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#F6F3EC'];

  /** Top three different scores (above 0), each with every team on that score. */
  function places(standings) {
    var students = (standings || []).filter(function (t) { return !t.teacher && t.points > 0; })
      .sort(function (a, b) { return b.points - a.points; });
    var out = [];
    students.forEach(function (t) {
      var last = out[out.length - 1];
      if (last && last.points === t.points) last.teams.push(t);
      else if (out.length < 3) out.push({ points: t.points, teams: [t] });
    });
    return out;
  }

  // ---------- sound (End game is a tap, so the iPhone lets it play) ----------
  var audio = null;
  function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function note(f, at, dur, vol, type) {
    if (!audio) return;
    try {
      var t = audio.currentTime + (at || 0), o = audio.createOscillator(), g = audio.createGain();
      o.type = type || 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.2));
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.2) + 0.05);
    } catch (e) {}
  }
  function drumroll(secs) {
    for (var t = 0; t < secs; t += 0.055) note(90 + Math.random() * 30, t, 0.06, 0.08 + 0.25 * (t / secs), 'square');
    note(70, secs, 0.5, 0.45, 'triangle'); // the crash
  }
  function sting(freqs) { freqs.forEach(function (f, i) { note(f, i * 0.09, 0.35, 0.3); }); }
  function fanfare() {
    [523, 659, 784].forEach(function (f, i) { note(f, i * 0.13, 0.22, 0.32); });
    [523, 659, 784, 1047].forEach(function (f) { note(f, 0.42, 1.1, 0.22); });
  }

  function confetti(box) {
    var layer = document.createElement('div');
    layer.className = 'kp-confetti';
    var html = '';
    for (var i = 0; i < 90; i++) {
      html += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + CONFETTI[i % CONFETTI.length] +
        ';animation-delay:' + (Math.random() * 0.9).toFixed(2) + 's;animation-duration:' + (2.4 + Math.random() * 1.8).toFixed(2) +
        's;--r:' + Math.round(Math.random() * 720 - 360) + 'deg;--x:' + Math.round(Math.random() * 120 - 60) + 'px"></i>';
    }
    layer.innerHTML = html;
    box.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 5200);
  }

  var box = null, timers = [];
  function clear() { timers.forEach(clearTimeout); timers = []; }
  /** Big teams (up to 15 students): shorter steps first, then smaller member names, until every column fits. */
  function fitPodium(b) {
    if (!b || !b.isConnected) return;
    var stage = b.querySelector('.kp-stage'), cols = b.querySelectorAll('.kp-col');
    var tooTall = function () {
      for (var i = 0; i < cols.length; i++) if (cols[i].offsetHeight > stage.clientHeight + 1) return true;
      return false;
    };
    var step = 1, mem = 17;
    b.style.setProperty('--kp-step', step); b.style.setProperty('--kp-mem', mem + 'px');
    while (tooTall() && step > 0.35) { step = Math.round((step - 0.1) * 100) / 100; b.style.setProperty('--kp-step', step); }
    while (tooTall() && mem > 11) { mem--; b.style.setProperty('--kp-mem', mem + 'px'); }
  }
  if (window.addEventListener) window.addEventListener('resize', function () { fitPodium(box); });
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }

  function show(standings, then, actions) {
    actions = actions || {};
    var P = places(standings);
    if (!P.length) { if (then) then(); return; } // no points yet: straight to the list
    if (box) box.remove();
    clear();
    unlock();
    var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var LABEL = ['1st', '2nd', '3rd'];
    // on screen: 2nd · 1st · 3rd
    var order = [1, 0, 2].filter(function (i) { return P[i]; });
    box = document.createElement('div');
    box.className = 'kp' + (calm ? ' calm' : '');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'The winners');
    box.innerHTML = '<div class="kp-lights" aria-hidden="true"></div>' +
      '<div class="kp-title" aria-live="polite">And the winners are…</div>' +
      '<div class="kp-stage">' + order.map(function (i) {
        var names = P[i].teams.map(function (t) { return esc(t.name); }).join(' & ');
        var who = P[i].teams.map(function (t) {
          var m = window.KruMembers ? window.KruMembers(t) : '';
          return m ? (P[i].teams.length > 1 ? esc(t.name) + ': ' : '') + esc(m) : '';
        }).filter(Boolean).join(' · ');
        return '<div class="kp-col p' + (i + 1) + '" data-p="' + (i + 1) + '">' +
          '<div class="kp-who"><span class="kp-name">' + names + '</span>' + (who ? '<span class="kp-mem">' + who + '</span>' : '') +
          '<span class="kp-pts">' + P[i].points + (P[i].points === 1 ? ' point' : ' points') + '</span></div>' +
          '<div class="kp-step"><span>' + LABEL[i] + '</span></div></div>';
      }).join('') + '</div>' +
      '<div class="kp-btns"><button class="ke-btn ghost" data-k="skip">Skip ▶</button></div>';
    document.body.appendChild(box);
    fitPodium(box);

    function reveal(p) {
      var col = box && box.querySelector('.kp-col.p' + p);
      if (col) col.classList.add('up');
    }
    function done() {
      clear();
      [3, 2, 1].forEach(reveal);
      box.classList.add('done');
      var top = P[0].teams.map(function (t) { return t.name; }).join(' & ');
      box.querySelector('.kp-title').textContent = (P[0].teams.length > 1 ? 'Winners: ' : 'Winner: ') + top + '!';
      box.querySelector('.kp-btns').innerHTML = (actions.keepPlaying ? '<button class="ke-btn ghost" data-k="keep">Keep playing</button>' : '') +
        '<button class="ke-btn ghost" data-k="list">All scores</button>' +
        (actions.save ? '<button class="ke-btn go" data-k="save">Save scores &amp; finish ✓</button>' : '');
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]');
      if (b && b.dataset.k === 'list') { clear(); box.remove(); box = null; if (then) then(); return; }
      if (b && b.dataset.k === 'save') { clear(); box.remove(); box = null; actions.save(); return; }
      if (b && b.dataset.k === 'keep') { clear(); box.remove(); box = null; actions.keepPlaying(); return; }
      if (!box.classList.contains('done')) done(); // a tap anywhere skips to the end
    });

    if (calm) { done(); return; }
    // 3rd → 2nd → (drumroll) → 1st
    var t = 0;
    drumroll(1.4); t += 1500;
    if (P[2]) { later(t, function () { reveal(3); sting([392, 523]); }); t += 1300; }
    if (P[1]) { later(t, function () { reveal(2); sting([440, 587]); }); t += 1400; }
    later(t, function () { box.querySelector('.kp-title').textContent = 'And in first place…'; drumroll(2); });
    t += 2100;
    later(t, function () { reveal(1); fanfare(); confetti(box); done(); });
  }

  window.KruPodium = { show: show, places: places };
})();
