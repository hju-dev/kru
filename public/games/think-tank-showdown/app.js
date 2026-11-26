/* Think Tank Showdown: 4 rounds (Riddles, Rebus, Puzzles, Wager).
   Nov 23 rules: teams fill in a paper score card. Each question has a timer; when it runs out the doors close
   (a ? in the middle) and open on the next question. After the last question of a round: the answer key
   (Henry checks the cards), a secret bonus, and Henry types the points in by hand. No Reveal, no bonus cards between questions.
   Teams come from the Kru session; questions from content.json for the session's level.
   Final Wager (Henry, Nov 9): teams bet any of their points (ALL IN) before the question; the bet shows above each
   team's score; after Reveal, Henry marks every team right or wrong, then the bets are added or taken away. */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var $ = function (id) { return document.getElementById(id); };

  var ROUNDS = [];
  var teams = [];
  var S = null; // saved state: { v, level, r, qi, shown, key, secs, seen, rbonus, bused, pts, wager, marks, settled, log }
  var BONUS = [];
  var left = 0, total = 0, running = false, endAt = 0, timer = 0, audio = null;
  var panelTeam = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function save() { Kru.saveState(S); }
  function round() { return ROUNDS[S.r]; }
  // big brain-lab banners (shared kru-fx.js, Henry Nov 19)
  var ROUND_ART = { answer: ['bulb', 'Riddles: think fast!'], rebus: ['brain', 'Pictures and words hide the answer!'], logic: ['flask', 'Use the clues like a scientist!'], wager: ['chips', 'Bet your points: ALL IN?'] };
  function fx(o) { if (window.KruFx) KruFx.show(o); else if (o.then) o.then(); }
  function question() { return round().qs[S.qi]; }
  function pts(id) { return S.pts[id] || 0; }

  // ---------- sound (started inside a tap, for the iPhone) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }
  function chime() {
    if (!audio) return;
    try {
      [988, 784, 1175].forEach(function (f, i) {
        var t = audio.currentTime + i * 0.22, o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.4);
      });
    } catch (e) {}
  }

  // ---------- timer ----------
  var PAUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor"/></svg>';
  var PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  function secsFor(R) { return (S && S.secs && S.secs[R.kind]) || R.secs || 30; }
  function renderClock() {
    $('digits').textContent = fmt(left);
    $('fill').style.transform = 'scaleX(' + (total ? Math.max(0, left) / total : 0) + ')';
    $('digits').className = 'digits' + (left <= 0 ? ' done' : left <= 10 ? ' warn' : '');
    // a || button while the clock runs (orange), a |> button when stopped (green)
    $('go').className = 'btn pausebtn ' + (running ? 'is-running' : 'is-paused');
    $('go').innerHTML = running ? PAUSE_ICON : PLAY_ICON;
    $('go').setAttribute('aria-label', running ? 'Pause the timer' : 'Start the timer');
  }
  function tick() {
    if (!running) return;
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) { left = 0; running = false; clearInterval(timer); chime(); renderClock(); advance(true); return; } // time's up: the doors close
    renderClock();
  }
  function stopTimer() {
    if (running) left = Math.max(0, (endAt - Date.now()) / 1000);
    running = false;
    clearInterval(timer);
  }
  function startTimer() {
    unlockAudio();
    if (!S.shown) showQuestion();
    if (left <= 0) left = total;
    running = true;
    endAt = Date.now() + left * 1000;
    clearInterval(timer);
    timer = setInterval(tick, 200);
    renderClock();
  }

  // ---------- stage ----------
  function mainCount() { return round().qs.filter(function (q) { return !q.spare; }).length; }
  function mainIndex() {
    var n = 0;
    for (var j = 0; j <= S.qi; j++) if (!round().qs[j].spare) n++;
    return n;
  }
  function nextMain() {
    var qs = round().qs;
    for (var j = S.qi + 1; j < qs.length; j++) if (!qs[j].spare) return j;
    return -1;
  }

  // ---------- doors: close from the outside in with a ? in the middle, then open on the next question ----------
  var doorsBusy = false;
  function thud() {
    if (!audio) return;
    try {
      var t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.25);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.35);
    } catch (e) {}
  }
  /** mid() runs while the doors are shut; done() when they have opened again. */
  function doors(mid, done) {
    var el = $('doors');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doorsBusy || reduce) { mid(); if (done) done(); return; }
    doorsBusy = true;
    el.className = 'doors closing';
    setTimeout(function () {
      el.className = 'doors closed';
      thud();
      mid();
      setTimeout(function () {
        el.className = 'doors opening';
        setTimeout(function () { el.className = 'doors'; doorsBusy = false; if (done) done(); }, 700);
      }, 500);
    }, 700);
  }
  /** Next question (by itself at 0:00, or the Skip button); after the last one: the answer key. */
  function advance(auto) {
    var keep = auto || running;
    stopTimer();
    var j = nextMain();
    doors(function () { if (j >= 0) goTo(S.r, j); else showKey(); }, function () { if (keep && j >= 0 && !S.key) startTimer(); });
  }
  function showKey() { stopTimer(); S.key = true; save(); load(true); }

  function plain(t) { return String(t).replace(/\[line\]/g, ' / ').replace(/\[(?:big|small|up|down):([^\]]+)\]/g, '$1'); }
  /** The answer key after a round: every question that was shown, its answer and the reason. */
  function renderKey() {
    var R = round(), seen = (S.seen && S.seen[S.r]) || [];
    $('keyHead').textContent = 'Answer key · check the score cards, then tap a team to add its points';
    $('keyList').innerHTML = seen.map(function (j, n) {
      var Q = R.qs[j];
      var qt = R.kind === 'logic' ? Q.q.split('\n').pop() : R.kind === 'rebus' ? plain((Q.show || [Q.q]).join(' · ')) : Q.q;
      return '<li><span class="kn">' + (n + 1) + '</span><div class="kb"><b class="ka">' + esc(Q.a || '') +
        (Q.herring ? ' <em class="fish">🐟 trick question</em>' : '') + '</b><span class="kq">' + esc(qt) + '</span>' +
        (Q.why ? '<span class="kw">' + esc(Q.why) + '</span>' : '') + '</div></li>';
    }).join('');
    var b = BONUS.filter(function (c) { return c.id === (S.rbonus || {})[S.r]; })[0];
    $('keyBonus').hidden = !b;
    if (b) $('keyBonus').innerHTML = '🎁 <b>Secret bonus: ' + esc(b.name) + '</b> ' + esc(b.text);
  }
  function revealBonus() {
    if (!BONUS.length || (S.rbonus && S.rbonus[S.r])) return;
    var fresh = BONUS.filter(function (c) { return S.bused.indexOf(c.id) < 0; });
    if (!fresh.length) { S.bused = []; fresh = BONUS; }
    var card = fresh[Math.floor(Math.random() * fresh.length)];
    S.bused.push(card.id); S.rbonus[S.r] = card.id; save();
    fx({ art: 'brain', title: 'SECRET BONUS!', sub: card.name, mood: 'magic', sound: 'fanfare', then: function () { load(true); } });
  }

  // ---------- rebus: rows of words / emoji; [big:X] [small:X] [up:X] [down:X] and a [line] row ----------
  function rebusHTML(Q) {
    return '<div class="rebus">' + (Q.show || [Q.q]).map(function (row) {
      if (row === '[line]') return '<hr class="rb-line">';
      var html = esc(row).replace(/\[(big|small|up|down):([^\]]+)\]/g, function (m, kind, t) {
        if (kind === 'up' || kind === 'down') {
          var letters = t.split('');
          if (kind === 'up') letters.reverse();
          return '<span class="rb-col rb-' + kind + '">' + letters.map(function (x) { return '<i>' + x + '</i>'; }).join('') + '</span>';
        }
        return '<span class="rb-' + kind + '">' + t + '</span>';
      });
      return '<div class="rb-row">' + html + '</div>';
    }).join('') + '</div>';
  }

  /** Shrink the question until the stage fits (long questions, many clues); never below 18 px. */
  function fitQuestion() {
    var stage = $('stage'), q = $('q');
    var size = q.classList.contains('is-rebus') ? 60 : q.classList.contains('logic') ? 26 : 34;
    var over = function () { return stage.scrollHeight > stage.clientHeight + 1 || q.scrollWidth > q.clientWidth + 1; };
    q.style.fontSize = size + 'px';
    while (size > 18 && over()) q.style.fontSize = (size -= 2) + 'px';
  }

  function load(keepTimer) {
    if (!keepTimer) { stopTimer(); total = left = secsFor(round()); }
    var R = round(), Q = question(), wager = R.kind === 'wager', key = !!S.key;
    $('round').innerHTML = esc(R.tag) + ': <b>' + esc(R.name) + '</b>';
    $('qnum').innerHTML = !key && Q.spare ? '<span class="spare">Spare question</span>' : '';
    KruCorner.set($('stage'), key || Q.spare ? '' : mainIndex() + '/' + mainCount());
    $('rule').textContent = R.rule || '';
    // logic puzzles need the whole stage for their clues
    $('rule').hidden = key || R.kind === 'logic' || !R.rule;
    document.querySelector('main.tts').classList.toggle('logic-round', R.kind === 'logic');
    $('q').hidden = key;
    $('key').hidden = !key;
    if (key) renderKey();
    else {
      if (S.shown && R.kind === 'rebus') $('q').innerHTML = rebusHTML(Q);
      else $('q').textContent = S.shown ? Q.q : 'Teams: decide your bet first. Any of your points, or ALL IN!';
      $('q').classList.toggle('waiting', !S.shown);
      $('q').classList.toggle('logic', S.shown && R.kind === 'logic');
      $('q').classList.toggle('is-rebus', S.shown && R.kind === 'rebus');
    }
    var timing = !key && !(wager && !S.shown);
    $('show').hidden = key || S.shown;
    $('bets').hidden = key || !wager || S.shown;
    $('go').hidden = !timing;
    $('digits').hidden = !timing;
    document.querySelector('.controls .progress').hidden = !timing;
    $('mark').hidden = !(wager && key && !S.settled);
    $('bonus').hidden = !(key && BONUS.length && !(S.rbonus && S.rbonus[S.r]));
    $('next').textContent = key ? (S.r + 1 < ROUNDS.length ? 'Next round ▶' : '🏆 See the winners') : 'Skip ▶';
    $('next').hidden = !key && wager && !S.shown;
    $('spare').disabled = !R.qs.some(function (q) { return q.spare; });
    $('prev').disabled = S.r === 0 && S.qi === 0 && !S.key;
    renderTeams();
    renderClock();
    if (!key) fitQuestion();
  }
  function goTo(r, qi) {
    var newRound = r !== S.r && qi === 0 && r > 0; // not the very first question (the slides are showing then)
    S.r = r; S.qi = qi;
    S.key = false;
    S.shown = round().kind !== 'wager'; // wager: question hidden until bets are made
    S.wager = {}; S.marks = {}; S.settled = false; // a new question: new bets
    S.seen = S.seen || {};
    var seen = S.seen[r] = S.seen[r] || [];
    if (seen.indexOf(qi) < 0) seen.push(qi);
    save();
    load();
    if (newRound) {
      var ra = ROUND_ART[round().kind] || ['brain', ''];
      fx({ art: ra[0], title: 'ROUND ' + (r + 1) + ': ' + String(round().name || '').toUpperCase() + '!', sub: ra[1], mood: round().kind === 'wager' ? 'magic' : 'good', sound: 'fanfare' });
    }
  }
  /** A round's first question (fresh answer key). */
  function enterRound(r) { S.seen = S.seen || {}; S.seen[r] = []; goTo(r, 0); }
  function showQuestion() { S.shown = true; save(); load(true); }

  // ---------- teams ----------
  function renderTeams() {
    var max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }));
    var wager = round().kind === 'wager';
    $('strip').innerHTML = teams.map(function (t, i) {
      var p = pts(t.id), bet = S.wager[t.id] || 0;
      return '<button class="tile' + (max > 0 && p === max ? ' lead' : '') + '" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-label="' + esc(t.name) + ', ' + p + ' points. Tap to give points">' +
        '<span class="tn">' + Kru.badge(t, COLORS[i % COLORS.length]) + '</span>' +
        (wager && !S.settled ? '<span class="tb' + (bet && bet === p ? ' allin' : '') + '">' + (bet && bet === p ? 'ALL IN ' + bet : 'bet ' + bet) + '</span>' : '') +
        '<span class="tp">' + p + '</span></button>';
    }).join('');
  }

  function addPoints(id, d, why) {
    if (!d) return;
    S.pts[id] = pts(id) + d;
    S.log.push({ t: id, d: d });
    if (S.log.length > 300) S.log.shift();
    save();
    Kru.score(id, d, why);
    renderTeams();
    var team = teams.find(function (t) { return t.id === id; });
    toast(team.name + ' ' + (d > 0 ? '+' : '−') + Math.abs(d));
    if (window.KruFx && round().kind !== 'wager') KruFx.flash({ art: d > 0 ? 'bulb' : 'flask', title: (d > 0 ? '+' : '−') + Math.abs(d), sub: team.name, mood: d > 0 ? 'good' : 'bad' });
  }
  function undo() {
    var last = S.log.pop();
    if (!last) return;
    S.pts[last.t] = pts(last.t) - last.d;
    save();
    Kru.score(last.t, -last.d, 'undo');
    renderTeams();
    hideToast();
  }

  var toastTimer = 0;
  function toast(text) {
    $('toastText').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }
  function hideToast() { $('toast').hidden = true; }

  // ---------- points panel ----------
  function maxBet(id) { return Math.max(0, pts(id)); } // any of your points: ALL IN = all of them
  function openPanel(id) {
    var t = teams.find(function (x) { return x.id === id; });
    if (!t) return;
    panelTeam = t;
    // Final Wager: the bets (before the question) or right / wrong (after Reveal) for every team at once
    if (round().kind === 'wager' && !S.settled) { panelTeam = null; if (S.key) openMarks(); else openBets(); return; }
    $('panelName').textContent = t.name;
    $('panelPts').textContent = pts(id) + ' points';
    $('panelMembers').textContent = t.teacher ? 'Teacher' : t.members.map(function (m) { return m.nick; }).join(', ');
    // Nov 26: the members line opens the roster pop-up (move, add or remove students)
    if (!t.teacher && window.KruRoster) KruRoster.link($('panelMembers'), id, { color: function (x) { var i = teams.map(function (o) { return o.id; }).indexOf(x); return COLORS[(i < 0 ? 0 : i) % COLORS.length]; }, onChange: function () { if (panelTeam) openPanel(panelTeam.id); } });
    $('panelBack').hidden = false;
  }
  function closePanel() { $('panelBack').hidden = true; panelTeam = null; }

  $('strip').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]');
    if (b) openPanel(b.dataset.t);
  });
  $('panelNormal').addEventListener('click', function (e) {
    var b = e.target.closest('[data-d]');
    if (!b || !panelTeam) return;
    addPoints(panelTeam.id, Number(b.dataset.d), round().name);
    // in the answer key Henry adds several amounts in a row: the panel stays open
    if (S.key) $('panelPts').textContent = pts(panelTeam.id) + ' points'; else closePanel();
  });
  // ---------- Final Wager: bets for every team (− / + / ALL IN), then right / wrong for every team ----------
  function players() { return teams.filter(function (t) { return !t.teacher || pts(t.id) > 0; }); }
  function openBets() {
    $('betList').innerHTML = players().map(function (t) {
      var b = S.wager[t.id] || 0, max = maxBet(t.id);
      return '<div class="wrow" data-w="' + esc(t.id) + '"><span class="wn">' + esc(t.name) + '<small>' + pts(t.id) + ' pts</small></span>' +
        '<button class="btn" data-bet="-1" aria-label="Bet 1 less"' + (b <= 0 ? ' disabled' : '') + '>−</button>' +
        '<output class="wb' + (b && b === max ? ' allin' : '') + '">' + b + '</output>' +
        '<button class="btn" data-bet="1" aria-label="Bet 1 more"' + (b >= max ? ' disabled' : '') + '>+</button>' +
        '<button class="btn gold allin-btn" data-bet="all"' + (!max ? ' disabled' : '') + ' aria-pressed="' + (b > 0 && b === max) + '">ALL IN</button></div>';
    }).join('');
    $('betsBack').hidden = false;
  }
  $('betList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-bet]'), row = e.target.closest('[data-w]');
    if (!b || !row) return;
    var id = row.dataset.w, max = maxBet(id), cur = S.wager[id] || 0;
    S.wager[id] = b.dataset.bet === 'all' ? (cur === max ? 0 : max) : Math.max(0, Math.min(max, cur + Number(b.dataset.bet)));
    save(); renderTeams(); openBets();
  });
  $('betsDone').addEventListener('click', function () { $('betsBack').hidden = true; });
  $('betsBack').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });
  $('bets').addEventListener('click', openBets);

  function openMarks() {
    $('markList').innerHTML = players().map(function (t) {
      var m = S.marks[t.id], b = S.wager[t.id] || 0;
      return '<div class="wrow" data-m="' + esc(t.id) + '"><span class="wn">' + esc(t.name) + '<small>' + (b && b === pts(t.id) ? 'ALL IN ' : 'bet ') + b + '</small></span>' +
        '<button class="btn mk-right" data-mark="right" aria-pressed="' + (m === 'right') + '">✓ Right</button>' +
        '<button class="btn mk-wrong" data-mark="wrong" aria-pressed="' + (m === 'wrong') + '">✗ Wrong</button></div>';
    }).join('');
    var all = players().every(function (t) { return S.marks[t.id]; });
    $('markApply').disabled = !all;
    $('markApply').textContent = all ? 'Add up the scores ✓' : 'Mark every team first';
    $('marksBack').hidden = false;
  }
  $('markList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mark]'), row = e.target.closest('[data-m]');
    if (!b || !row) return;
    S.marks[row.dataset.m] = S.marks[row.dataset.m] === b.dataset.mark ? undefined : b.dataset.mark;
    save(); openMarks();
  });
  $('markApply').addEventListener('click', function () {
    var allIn = [];
    players().forEach(function (t) {
      var bet = S.wager[t.id] || 0;
      if (bet && bet === pts(t.id)) allIn.push({ t: t, won: S.marks[t.id] === 'right', bet: bet });
      if (bet) addPoints(t.id, S.marks[t.id] === 'right' ? bet : -bet, S.marks[t.id] === 'right' ? 'won the wager' : 'lost the wager');
    });
    // the ALL IN teams get their own moment; otherwise one banner for the wagers
    allIn.forEach(function (a) {
      fx(a.won ? { art: 'chips', title: 'ALL IN… AND WON!', sub: a.t.name + ' doubled their points!', delta: a.bet, mood: 'magic', sound: 'fanfare' }
        : { art: 'flask', title: 'ALL IN… AND LOST!', sub: a.t.name + ' loses everything!', delta: -a.bet, mood: 'boom', sound: 'boom' });
    });
    if (!allIn.length) fx({ art: 'chips', title: 'THE WAGERS ARE IN!', sub: 'Bets won and lost. Check the scores!', mood: 'magic' });
    S.settled = true;
    save();
    $('marksBack').hidden = true;
    load(true);
    unlockAudio(); chime();
  });
  $('markClose').addEventListener('click', function () { $('marksBack').hidden = true; });
  $('mark').addEventListener('click', openMarks);
  $('panelClose').addEventListener('click', closePanel);
  $('panelBack').addEventListener('click', function (e) { if (e.target === this) closePanel(); });

  // ---------- main buttons ----------
  $('show').addEventListener('click', showQuestion);
  $('go').addEventListener('click', function () {
    if (running) { stopTimer(); renderClock(); } else startTimer();
  });
  $('bonus').addEventListener('click', revealBonus);
  $('next').addEventListener('click', function () {
    if (S.key) {
      if (S.r + 1 < ROUNDS.length) enterRound(S.r + 1);
      else KruEnd.show(); // the last round: the podium, then Save scores & finish
      return;
    }
    unlockAudio();
    advance(false);
  });
  $('toastUndo').addEventListener('click', undo);

  // ---------- ⋯ menu ----------
  function renderSecs() {
    var R = round();
    $('timeLabel').textContent = 'Time: ' + (R.short || R.name);
    KruMenu.timer($('secsRow'), secsFor(R), function (v) {
      S.secs = S.secs || {}; S.secs[R.kind] = v; save();
      if (!running && !S.key && (left === total || left <= 0)) { total = left = v; renderClock(); }
    }, { min: 10, max: 300 });
  }
  function openMenu() {
    $('menuRounds').innerHTML = ROUNDS.map(function (R, i) {
      return '<button class="btn" data-r="' + i + '" aria-pressed="' + (i === S.r) + '">' + (i + 1) + '. ' + esc(R.short || R.name) + '</button>';
    }).join('');
    $('undo').disabled = !S.log.length;
    renderSecs();
    disarm($('resetScores'));
    if (running) { stopTimer(); renderClock(); }
    $('menuBack').hidden = false;
  }
  function closeMenu() { $('menuBack').hidden = true; }
  $('more').addEventListener('click', openMenu);
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('menuRounds').addEventListener('click', function (e) {
    var b = e.target.closest('[data-r]');
    if (b) { enterRound(+b.dataset.r); closeMenu(); }
  });
  $('prev').addEventListener('click', function () {
    if (S.key) goTo(S.r, S.qi);
    else if (S.qi > 0) goTo(S.r, S.qi - 1);
    else if (S.r > 0) goTo(S.r - 1, ROUNDS[S.r - 1].qs.length - 1);
    closeMenu();
  });
  $('spare').addEventListener('click', function () {
    var qs = round().qs, sp = [];
    qs.forEach(function (q, j) { if (q.spare) sp.push(j); });
    if (!sp.length) return;
    var k = sp.find(function (j) { return j > S.qi; });
    goTo(S.r, k === undefined ? sp[0] : k);
    closeMenu();
  });
  $('undo').addEventListener('click', function () { undo(); closeMenu(); });
  function disarm(btn) { btn.classList.remove('armed'); btn.textContent = 'New Game'; }
  $('resetScores').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = 'Tap again to confirm';
      setTimeout(function () { disarm(btn); }, 3500);
      return;
    }
    teams.forEach(function (t) {
      if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'reset');
    });
    S.pts = {}; S.wager = {}; S.marks = {}; S.settled = false; S.log = [];
    save();
    closeMenu();
    load(true);
  });

  document.addEventListener('keydown', function (e) {
    if (!$('panelBack').hidden || !$('menuBack').hidden || !$('betsBack').hidden || !$('marksBack').hidden || doorsBusy) return;
    if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
    else if (e.key === 'ArrowRight') $('next').click();
    else if (e.key === 'ArrowLeft') $('prev').click();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', function () { fitQuestion(); });

  Kru.onFinishRequest(function () {
    Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; }));
  });

  // ---------- start ----------
  // ---------- question pools: each game draws "play" main + "spares" spare questions per round ----------
  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }
  function newDraw(pools) {
    return pools.map(function (r) { return shuffled(r.qs.length).slice(0, (r.play || r.qs.length) + (r.spares || 0)); });
  }
  function validDraw(pools, draw) {
    return Array.isArray(draw) && draw.length === pools.length && draw.every(function (d, i) {
      return Array.isArray(d) && d.length && d.every(function (k) { return k >= 0 && k < pools[i].qs.length; });
    });
  }
  function drawRounds(pools, draw) {
    return pools.map(function (r, i) {
      var copy = {};
      Object.keys(r).forEach(function (k) { copy[k] = r[k]; });
      copy.qs = draw[i].map(function (k, j) {
        var q = r.qs[k];
        var out = { spare: j >= (r.play || draw[i].length) };
        Object.keys(q).forEach(function (k) { out[k] = q[k]; });
        return out;
      });
      return copy;
    });
  }

  // How to play slides: before the game starts, and from the ⋯ menu
  var INTRO = [];
  function showIntro() { return KruIntro.show(INTRO, { title: 'Think Tank Showdown' }); }
  $('howTo').addEventListener('click', function () { $('menuBack').hidden = true; showIntro(); });

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    if (window.KruFx) KruFx.theme('lab');
    contentReady.then(function (content) {
      var level = content[session.level] ? session.level : 'M.2';
      var pools = content[level].rounds;
      teams = Kru.allTeams();
      KruEnd.setup({ standings: function () { return teams.map(function (t) { return { name: t.name, points: pts(t.id), teacher: !!t.teacher }; }); } });
      BONUS = (content.bonus && content.bonus.secret) || [];
      INTRO = KruIntro.forLevel(content, level);
      var saved = session.resume;
      if (saved && saved.v === 3 && saved.level === level && validDraw(pools, saved.draw)) {
        S = saved;
        ROUNDS = drawRounds(pools, S.draw);
      }
      if (S && ROUNDS[S.r] && ROUNDS[S.r].qs[S.qi]) {
        S.pts = S.pts || {}; S.wager = S.wager || {}; S.marks = S.marks || {}; S.log = S.log || [];
        S.secs = S.secs || {}; S.seen = S.seen || {}; S.rbonus = S.rbonus || {}; S.bused = S.bused || [];
        load();
      } else {
        // a new game: a fresh random mix of questions from each round's pool
        S = { v: 3, level: level, draw: newDraw(pools), r: 0, qi: 0, shown: true, key: false, secs: {}, seen: {}, rbonus: {}, bused: [], pts: {}, wager: {}, marks: {}, settled: false, log: [] };
        ROUNDS = drawRounds(pools, S.draw);
        enterRound(0);
      }
      if (!S.introDone) showIntro().then(function () { S.introDone = true; save(); });
    }).catch(function () {
      $('q').textContent = 'Could not load the questions. Close the game and open it again.';
    });
  });
})();
