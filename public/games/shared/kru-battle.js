/**
 * Kru "Battle" engine (Henry, Nov 19): Battle of Wits, and later Battle of Readers / Battle of Writers.
 * Teams WRITE their answers on one board per team. A round = 5 questions:
 *   ask    each question has a timer (30 / 45 / 60 s); when it ends the next question comes by itself
 *          (3-second "Next question" countdown; Pause stops everything)
 *   pens   "Pens down!"
 *   review the 5 questions again, one at a time (Henry taps Next): the right answer + a short explanation;
 *          teams mark their own answers right or wrong
 *   bonus  2 hidden bonuses are revealed (tap a card to flip it)
 *   tally  each team says its points; Henry sets them with − / + and adds them to the scores
 *   result the round's points and the totals; Next round, or the final scores when the set is used up
 *
 * KruBattle.start({
 *   title: 'Battle of Wits', logo: 'Battle of <b>Wits</b>',
 *   load(session) -> Promise<{ sets: [{ key, name, questions }], hidden: [bonus], intro: [slides], problems?: [] }>,
 *   question?(q, { esc }) -> html   // optional custom drawing (ask screen); default: question + A-D / "write it"
 *   answer?(q, { esc }) -> html     // optional custom right answer (review screen)
 * })
 * A set can also bring its own rounds: { key, name, rounds: [{ read?: { title, sentences }, questions: [5] }] }
 * (Battle of Readers: a story to read first, then its 5 questions; the 📖 Story button shows it again).
 * A question may carry `hint` (the line under it, e.g. "Write T or F") and `quote` (a sentence shown big).
 * A hidden bonus: { id, icon, name, text, points, needs?: 'short' | 'choice' } (text may use {n} = a question
 * number and {letter} = a letter that starts one of the round's right answers).
 */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var ROUND = 5, GAP = 3;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function shuffle(a) { for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; } return a; }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }

  // big event banners per theme (shared kru-fx.js, Henry Nov 19): arena = Wits, library = Readers, quill = Writers
  var THEME_ART = { arena: 'swords', library: 'book', quill: 'quill' };
  var THEME_WORDS = { arena: 'Let the battle begin!', library: 'Open your minds… and your books!', quill: 'Pens ready? Write like a champion!' };
  function start(cfg) {
    var SETS = [], HIDDEN = [], INTRO = [], PROBLEMS = [], teams = [];
    var S = null, timer = 0, audio = null;
    var theme = cfg.theme || 'arena';
    function fx(o) { if (window.KruFx) KruFx.show(o); else if (o.then) o.then(); }
    if (window.KruFx) KruFx.theme(theme);

    // ---------- the screen ----------
    var main = document.createElement('main');
    main.className = 'game kbt';
    main.innerHTML =
      '<header class="bar"><span class="round">' + cfg.logo + '</span><span class="kbt-where" id="kbtWhere"></span><span class="grow"></span>' +
      '<button class="small" id="more" aria-haspopup="dialog" aria-label="Settings"><svg class="gear" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M9.6 4.16 L10.16 1.56 L13.84 1.56 L14.4 4.16 L15.14 4.42 L15.85 4.76 L18.08 3.32 L20.68 5.92 L19.24 8.15 L19.58 8.86 L19.84 9.6 L22.44 10.16 L22.44 13.84 L19.84 14.4 L19.58 15.14 L19.24 15.85 L20.68 18.08 L18.08 20.68 L15.85 19.24 L15.14 19.58 L14.4 19.84 L13.84 22.44 L10.16 22.44 L9.6 19.84 L8.86 19.58 L8.15 19.24 L5.92 20.68 L3.32 18.08 L4.76 15.85 L4.42 15.14 L4.16 14.4 L1.56 13.84 L1.56 10.16 L4.16 9.6 L4.42 8.86 L4.76 8.15 L3.32 5.92 L5.92 3.32 L8.15 4.76 L8.86 4.42 Z M15.6 12a3.6 3.6 0 1 0-7.2 0 3.6 3.6 0 1 0 7.2 0z"/></svg></button></header>' +
      '<section class="stage kbt-stage" id="kbtStage" aria-live="polite"></section>' +
      '<div class="controls kbt-controls" id="kbtControls"></div>' +
      '<div class="strip" id="kbtStrip" aria-label="Team scores"></div>' +
      '<div class="toast" id="toast" role="status" hidden><span id="toastText"></span><button class="small" id="toastUndo" hidden>Undo</button></div>';
    document.body.insertBefore(main, document.body.firstChild);
    var menu = document.createElement('div');
    menu.className = 'backdrop'; menu.id = 'menuBack'; menu.hidden = true;
    menu.innerHTML = '<div class="menu" role="dialog" aria-label="Settings">' +
      '<div class="menu-trow"><span class="menu-label">Time per question</span><div class="menu-rounds" id="secsRow"></div></div>' +
      (cfg.reading ? '<div class="menu-trow"><span class="menu-label">Time to read the story</span><div class="menu-rounds" id="readRow"></div></div>' : '') +
      '<div class="menu-row"><button class="btn" id="kbtSet">Choose another set</button><button class="btn" id="kbtRestartRound">Start round again</button></div>' +
      '<button class="btn ghost danger" id="kbtReset">New Game</button>' +
      '<button class="btn" id="howTo">How to play</button>' +
      '<button class="btn ghost" id="menuClose">Close</button></div>';
    document.body.appendChild(menu);
    var setsBack = document.createElement('div');
    setsBack.className = 'backdrop'; setsBack.id = 'setsBack'; setsBack.hidden = true;
    setsBack.innerHTML = '<div class="menu" role="dialog" aria-labelledby="setsTitle"><h2 class="round" id="setsTitle">Choose a question set</h2>' +
      '<div class="sets" id="sets"></div><p class="problems" id="problems" hidden></p><button class="btn ghost" id="setsClose" hidden>Cancel</button></div>';
    document.body.appendChild(setsBack);

    function save() { Kru.saveState(S); }
    function pts(id) { return S.pts[id] || 0; }
    function set() { return SETS.filter(function (s) { return s.key === S.setKey; })[0] || null; }
    function count(s) { return s.rounds ? s.rounds.length : s.questions.length; }
    function rounds() { var s = set(); return !s ? 0 : s.rounds ? s.rounds.length : Math.ceil(s.questions.length / ROUND); }
    /** This round's story (sets with their own rounds), or null. */
    function reading() { var s = set(); return s && s.rounds ? (s.rounds[S.order[S.round]] || {}).read || null : null; }
    /** The questions of the current round, in the shuffled order. */
    function roundQs() {
      var s = set();
      if (!s) return [];
      if (s.rounds) return ((s.rounds[S.order[S.round]] || {}).questions || []).slice(0, ROUND);
      return S.order.slice(S.round * ROUND, S.round * ROUND + ROUND).map(function (i) { return s.questions[i]; }).filter(Boolean);
    }
    function q() { return roundQs()[S.qi]; }

    // ---------- sound (after a tap) ----------
    function unlockAudio() {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
    }
    function tone(freqs, gap, dur) {
      if (!audio) return;
      try {
        freqs.forEach(function (f, i) {
          var t = audio.currentTime + i * (gap || 0.15), o = audio.createOscillator(), g = audio.createGain();
          o.type = 'triangle'; o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.3));
          o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.3) + 0.05);
        });
      } catch (e) {}
    }
    var toastTimer = 0;
    function toast(text) {
      $('toastText').textContent = text; $('toast').hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { $('toast').hidden = true; }, 3000);
    }

    // ---------- timer: clock based, survives a short sleep ----------
    function leftNow() { return S.running ? Math.max(0, (S.endAt - Date.now()) / 1000) : S.left; }
    function startClock(secs) { S.left = secs; S.total = secs; S.running = true; S.endAt = Date.now() + secs * 1000; save(); runTick(); }
    function pause() { if (!S.running) return; S.left = leftNow(); S.running = false; save(); render(); }
    function resume() { if (S.running) return; S.running = true; S.endAt = Date.now() + S.left * 1000; save(); runTick(); render(); }
    function runTick() { clearInterval(timer); timer = setInterval(tick, 200); tick(); }
    var lastBeep = -1;
    function tick() {
      if (!S || !S.running) return;
      var l = leftNow();
      if (S.phase === 'ask') {
        var s = Math.ceil(l);
        if (s <= 3 && s > 0 && s !== lastBeep) { lastBeep = s; tone([660], 0, 0.12); }
        if (l <= 0) { S.running = false; timeUp(); return; }
      } else if (S.phase === 'gap' && l <= 0) { S.running = false; nextQuestion(); return; }
      else if (S.phase === 'read' && l <= 0) { S.running = false; tone([880, 660], 0.18); askFirst(); return; }
      drawClock();
    }
    function drawClock() {
      var l = leftNow(), d = $('kbtDigits'), f = $('kbtFill'), g = $('kbtGap');
      if (d) { d.textContent = fmt(l); d.className = 'digits' + (l <= 5 && S.running ? ' warn' : ''); }
      if (f) f.style.transform = 'scaleX(' + (S.total ? l / S.total : 0) + ')';
      if (g) g.textContent = Math.max(1, Math.ceil(l));
    }

    // ---------- the flow ----------
    function beginRound() {
      S.qi = 0; S.rev = 0; S.flipped = []; S.tally = {}; S.bonus = pickBonuses(); S.peek = false;
      fx({ art: THEME_ART[theme], title: 'ROUND ' + (S.round + 1) + '!', sub: THEME_WORDS[theme], mood: 'good', sound: 'fanfare', wait: 1800, then: function () {
        if (reading()) { S.phase = 'read'; startClock(S.readSecs || 60); render(); tone([523, 659], 0.1); return; }
        askFirst();
      } });
    }
    function askFirst() {
      S.phase = 'ask'; S.qi = 0; S.peek = false; lastBeep = -1;
      startClock(S.secs); render(); tone([523, 659, 784], 0.1);
    }
    function timeUp() {
      tone([880, 660], 0.18);
      if (S.qi + 1 >= roundQs().length) {
        S.phase = 'pens'; save(); render();
        fx({ art: 'hourglass', title: 'PENS DOWN!', sub: 'Time to check the answers together.', mood: 'boom', sound: 'boom', wait: 1800 });
        return;
      }
      S.phase = 'gap'; startClock(GAP); render();
    }
    function nextQuestion() {
      S.qi++; S.phase = 'ask'; lastBeep = -1;
      startClock(S.secs); render(); tone([660, 880], 0.1);
    }
    /** Two hidden bonuses that fit this round's questions (not the same ones as last round). */
    function pickBonuses() {
      var qs = roundQs(), hasShort = qs.some(function (x) { return !Array.isArray(x.choices); }), hasChoice = qs.some(function (x) { return Array.isArray(x.choices); });
      var ok = HIDDEN.filter(function (b) { return (!b.needs || (b.needs === 'short' && hasShort) || (b.needs === 'choice' && hasChoice)) && (S.lastBonus || []).indexOf(b.id) < 0; });
      if (ok.length < 2) ok = HIDDEN.slice();
      var pick = shuffle(ok.slice()).slice(0, 2);
      S.lastBonus = pick.map(function (b) { return b.id; });
      var letters = qs.map(rightText).map(function (t) { return (t.match(/[A-Za-z]/) || [''])[0].toUpperCase(); }).filter(Boolean);
      return pick.map(function (b) {
        return { id: b.id, icon: b.icon, name: b.name, points: b.points,
          text: b.text.replace('{n}', String(1 + Math.floor(Math.random() * qs.length))).replace('{letter}', letters.length ? letters[Math.floor(Math.random() * letters.length)] : 'S') };
      });
    }
    function rightText(x) { return Array.isArray(x.choices) ? String(x.choices[x.answer]) : String(x.answer); }

    // ---------- drawing ----------
    function defaultQuestion(x) {
      var h = '<div class="kbt-q">' + esc(x.q) + '</div>' + (x.quote ? '<div class="kbt-quote">' + esc(x.quote) + '</div>' : '');
      if (x.hint) h += '<div class="kbt-hint">✍ ' + esc(x.hint) + '</div>';
      else if (Array.isArray(x.choices)) {
        h += '<div class="kbt-choices">' + x.choices.map(function (c, i) { return '<div class="kbt-choice"><b>' + 'ABCD'.charAt(i) + '</b><span>' + esc(c) + '</span></div>'; }).join('') + '</div>' +
          '<div class="kbt-hint">✍ Write the letter: A, B, C or D</div>';
      } else h += '<div class="kbt-hint">✍ Write your answer in words</div>';
      return h;
    }
    function defaultAnswer(x) {
      if (Array.isArray(x.choices)) return '<span class="kbt-letter">' + 'ABCD'.charAt(x.answer) + '</span> ' + esc(x.choices[x.answer]);
      return esc(x.answer);
    }
    function render() {
      var s = set(), ph = S.phase, st = $('kbtStage'), ct = $('kbtControls'), where = $('kbtWhere');
      main.className = 'game kbt ph-' + ph;
      renderStrip();
      if (!s) { st.innerHTML = '<div class="kbt-big">Choose a question set to start.</div>'; ct.innerHTML = '<button class="btn gold" data-do="sets">Choose a set ▶</button>'; where.textContent = ''; return; }
      var nr = rounds(), qs = roundQs(), roundLabel = 'Round ' + (S.round + 1) + '/' + nr;
      if (ph === 'start') {
        where.textContent = roundLabel;
        st.innerHTML = '<div class="kbt-big">' + esc(s.name) + '</div><div class="kbt-sub">Round ' + (S.round + 1) + ': ' + (reading() ? 'read a story, then ' : '') + qs.length + ' questions, ' + S.secs + ' seconds each.<br />Get your board and pen ready!</div>';
        ct.innerHTML = '<span class="grow"></span><button class="btn gold big" data-do="go">Start round ' + (S.round + 1) + ' ▶</button>';
      } else if (ph === 'read') {
        var rd = reading();
        where.textContent = roundLabel + ' · Read the story';
        st.innerHTML = storyHtml(rd);
        ct.innerHTML = '<span class="digits" id="kbtDigits"></span><div class="progress"><i id="kbtFill"></i></div>' +
          '<button class="btn" data-do="pause">' + (S.running ? 'Pause' : 'Resume') + '</button>' +
          '<button class="btn gold" data-do="readdone">Questions ▶</button>';
        drawClock(); fitStory();
      } else if (ph === 'ask' || ph === 'gap') {
        var x = q();
        where.textContent = roundLabel + ' · Question ' + (S.qi + 1) + '/' + qs.length;
        st.innerHTML = (cfg.question ? cfg.question(x, { esc: esc }) : defaultQuestion(x)) +
          (ph === 'gap' ? '<div class="kbt-gapbox"><span>⏱ Time’s up! Next question in</span><b id="kbtGap">3</b></div>' : '') +
          (S.peek && reading() ? '<div class="kbt-peek">' + storyHtml(reading()) + '</div>' : '');
        ct.innerHTML = '<span class="digits" id="kbtDigits"></span><div class="progress"><i id="kbtFill"></i></div>' +
          (reading() ? '<button class="btn" data-do="peek" aria-pressed="' + !!S.peek + '">📖 Story</button>' : '') +
          '<button class="btn" data-do="pause">' + (S.running ? 'Pause' : 'Resume') + '</button>' +
          '<button class="btn gold" data-do="skip">' + (S.qi + 1 >= qs.length ? 'Pens down ▶' : 'Next ▶') + '</button>';
        drawClock(); fit();
      } else if (ph === 'pens') {
        where.textContent = roundLabel;
        st.innerHTML = '<div class="kbt-big">✏️ Pens down!</div><div class="kbt-sub">Now let’s check the answers together.<br />Mark each answer ✓ or ✗ on your board.</div>';
        ct.innerHTML = '<span class="grow"></span><button class="btn gold big" data-do="review">Check the answers ▶</button>';
      } else if (ph === 'review') {
        var r = qs[S.rev];
        where.textContent = roundLabel + ' · Answer ' + (S.rev + 1) + '/' + qs.length;
        st.innerHTML = '<div class="kbt-rq"><span class="kbt-n">' + (S.rev + 1) + '</span>' + esc(r.q) + (r.quote ? ' <i class="kbt-rquote">' + esc(r.quote) + '</i>' : '') + '</div>' +
          '<div class="kbt-ans">✓ ' + (cfg.answer ? cfg.answer(r, { esc: esc }) : defaultAnswer(r)) + '</div>' +
          (r.why ? '<div class="kbt-why">💡 ' + esc(r.why) + '</div>' : '') +
          (r.read_aloud ? '<div class="kbt-why">🔊 ' + esc(r.read_aloud) + '</div>' : '') + // a lesson pack's read-aloud sentence
          '<div class="kbt-mark">Mark your answer: ✓ or ✗</div>';
        ct.innerHTML = '<button class="btn" data-do="back"' + (S.rev ? '' : ' disabled') + '>◀ Back</button><span class="grow"></span>' +
          (S.rev + 1 < qs.length ? '<button class="btn gold big" data-do="fwd">Next answer ▶</button>' : '<button class="btn gold big" data-do="bonus">Hidden bonuses! ▶</button>');
        fit();
      } else if (ph === 'bonus') {
        where.textContent = roundLabel;
        var all = S.flipped.length >= S.bonus.length;
        st.innerHTML = '<div class="kbt-btitle">🤫 Before you count… HIDDEN BONUSES!</div><div class="kbt-cards">' + S.bonus.map(function (b, i) {
          var on = S.flipped.indexOf(i) >= 0;
          return '<button class="kbt-card' + (on ? ' on' : '') + '" data-flip="' + i + '" aria-label="' + (on ? esc(b.name + ': ' + b.text) : 'Hidden bonus ' + (i + 1) + ': tap to reveal') + '">' +
            '<span class="back">?</span><span class="front"><i>' + esc(b.icon) + '</i><b>' + esc(b.name) + '</b><span>' + esc(b.text) + '</span><em>+' + b.points + '</em></span></button>';
        }).join('') + '</div>';
        ct.innerHTML = '<span class="kbt-tip">' + (all ? 'Add the bonuses to your right answers!' : 'Tap a card to reveal it') + '</span><span class="grow"></span>' +
          '<button class="btn gold big" data-do="tally"' + (all ? '' : ' disabled') + '>Count your points ▶</button>';
      } else if (ph === 'tally') {
        where.textContent = roundLabel + ' · Scores';
        st.innerHTML = '<div class="kbt-ttitle">How many points did each team get? <small>1 per right answer + bonuses</small></div><div class="kbt-tally">' + players().map(function (t) {
          var v = S.tally[t.id] || 0;
          return '<div class="kbt-trow" data-t="' + esc(t.id) + '">' + Kru.badge(t, color(t)) +
            '<button class="btn" data-d="-1" aria-label="One less"' + (v ? '' : ' disabled') + '>−</button><output>' + v + '</output><button class="btn" data-d="1" aria-label="One more">+</button></div>';
        }).join('') + '</div>';
        ct.innerHTML = '<button class="btn" data-do="bonusback">◀ Bonuses</button><span class="grow"></span><button class="btn gold big" data-do="add">Add to the scores ✓</button>';
      } else if (ph === 'result') {
        var last = S.round + 1 >= nr, got = S.roundPts[S.round] || {};
        where.textContent = roundLabel + ' · Results';
        var order = players().slice().sort(function (a, b) { return pts(b.id) - pts(a.id); });
        st.innerHTML = '<div class="kbt-ttitle">' + (last ? '🏁 That was the last round of this set!' : '⭐ Round ' + (S.round + 1) + ' results') + '</div><div class="kbt-board">' + order.map(function (t, i) {
          return '<div class="kbt-brow"><span class="kbt-rank">' + (1 + order.filter(function (o) { return pts(o.id) > pts(t.id); }).length) + '</span>' + Kru.badge(t, color(t)) + '<span class="kbt-plus">+' + (got[t.id] || 0) + '</span><b>' + pts(t.id) + '</b></div>';
        }).join('') + '</div>';
        ct.innerHTML = '<button class="btn" data-do="edit">Change scores</button><span class="grow"></span>' +
          (last ? '<button class="btn" data-do="sets">Another set</button><button class="btn gold big" data-do="final">🏆 Final scores</button>' : '<button class="btn gold big" data-do="nextround">Next round ▶</button>');
      }
    }
    function storyHtml(rd) {
      return '<div class="kbt-story"><div class="kbt-stitle">📖 ' + esc(rd.title) + '</div><p>' + rd.sentences.map(esc).join(' ') + '</p></div>';
    }
    /** The story fills the stage: the biggest text that fits (at least 18 px). */
    function fitStory() {
      var st = $('kbtStage'), p = st.querySelector('.kbt-story p'), size = 30;
      if (!p) return;
      var over = function () { return st.scrollHeight > st.clientHeight + 1; };
      p.style.fontSize = size + 'px';
      while (size > 18 && over()) p.style.fontSize = (size -= 1) + 'px';
    }
    function players() { return teams.filter(function (t) { return !t.teacher; }); }
    function color(t) { return COLORS[Math.max(0, teams.indexOf(t)) % COLORS.length]; }
    function renderStrip() {
      var max = Math.max.apply(null, teams.map(function (t) { return pts(t.id); }).concat([0]));
      $('kbtStrip').innerHTML = teams.map(function (t, i) {
        return '<div class="tile' + (max > 0 && pts(t.id) === max ? ' lead' : '') + '" style="--c:' + COLORS[i % COLORS.length] + '" aria-label="' + esc(t.name) + ', ' + pts(t.id) + ' points">' +
          '<span class="tn">' + Kru.badge(t, COLORS[i % COLORS.length]) + '</span><span class="tp">' + pts(t.id) + '</span></div>';
      }).join('');
    }
    /** Long questions shrink so everything fits the phone screen. */
    function fit() {
      var st = $('kbtStage'), el = st.querySelector('.kbt-q, .kbt-rq');
      if (!el) return;
      var over = function () { return st.scrollHeight > st.clientHeight + 1; };
      // [element, start size, smallest]: the question shrinks to 26 first, then the rest, then the question again
      var parts = [[el, 34, 26], [st.querySelector('.kbt-choices'), 26, 18], [st.querySelector('.kbt-quote'), 28, 18], [st.querySelector('.kbt-ans'), 34, 22], [st.querySelector('.kbt-why'), 20, 16], [st.querySelector('.kbt-hint'), 20, 16], [el, 26, 18]];
      parts.forEach(function (p) { if (p[0]) p[0].style.fontSize = p[1] + 'px'; });
      parts.forEach(function (p) {
        if (!p[0]) return;
        var size = Math.min(p[1], parseFloat(p[0].style.fontSize) || p[1]); // the question's second pass goes on from where it is
        p[0].style.fontSize = size + 'px';
        while (size > p[2] && over()) p[0].style.fontSize = (size -= 2) + 'px';
      });
    }

    // ---------- taps ----------
    main.addEventListener('click', function (e) {
      var b = e.target.closest('[data-do],[data-flip],[data-d]');
      if (!b || b.disabled) return;
      unlockAudio();
      if (b.dataset.flip != null) {
        var i = +b.dataset.flip;
        if (S.flipped.indexOf(i) < 0) {
          S.flipped.push(i); save(); render(); tone([523, 784, 1047, 1319], 0.08, 0.35);
          var bn = S.bonus[i];
          if (bn && window.KruFx) KruFx.flash({ art: 'star', title: bn.icon + ' ' + bn.name, sub: '+' + bn.points, mood: 'good' });
        }
        return;
      }
      if (b.dataset.d != null) {
        var row = b.closest('[data-t]'), id = row.dataset.t;
        S.tally[id] = Math.max(0, (S.tally[id] || 0) + Number(b.dataset.d)); save(); render(); return;
      }
      var d = b.dataset.do;
      if (d === 'sets') openSets();
      else if (d === 'go') beginRound();
      else if (d === 'pause') { if (S.running) pause(); else resume(); }
      else if (d === 'readdone') { S.running = false; askFirst(); }
      else if (d === 'peek') { S.peek = !S.peek; save(); render(); }
      else if (d === 'skip') { S.running = false; if (S.phase === 'gap') nextQuestion(); else timeUp(); }
      else if (d === 'review') { S.phase = 'review'; S.rev = 0; save(); render(); tone([523, 659], 0.1); }
      else if (d === 'fwd') { S.rev++; save(); render(); }
      else if (d === 'back') { S.rev = Math.max(0, S.rev - 1); save(); render(); }
      else if (d === 'bonus') { S.phase = 'bonus'; save(); render(); tone([392, 523, 659, 784], 0.1); }
      else if (d === 'tally') { S.phase = 'tally'; if (!S.roundPts[S.round]) S.tally = {}; save(); render(); }
      else if (d === 'bonusback') { S.phase = 'bonus'; save(); render(); }
      else if (d === 'add') addScores();
      else if (d === 'edit') { S.tally = Object.assign({}, S.roundPts[S.round] || {}); S.phase = 'tally'; save(); render(); }
      else if (d === 'nextround') { S.round++; S.phase = 'start'; save(); render(); }
      else if (d === 'final') KruEnd.show({ keepPlaying: function () { render(); } });
    });
    /** The tally becomes this round's points (changing them later only adds the difference). */
    function addScores() {
      var before = S.roundPts[S.round] || {};
      players().forEach(function (t) {
        var now = S.tally[t.id] || 0, d = now - (before[t.id] || 0);
        if (d) { S.pts[t.id] = pts(t.id) + d; Kru.score(t.id, d, 'round ' + (S.round + 1)); }
      });
      S.roundPts[S.round] = Object.assign({}, S.tally);
      S.phase = 'result'; save(); render();
      // the round's best team(s) get their moment
      var best = Math.max.apply(null, players().map(function (t) { return S.tally[t.id] || 0; }).concat([0]));
      var top = players().filter(function (t) { return best > 0 && (S.tally[t.id] || 0) === best; });
      if (top.length) fx({ art: top.length > 1 ? 'trophy' : 'crown', title: top.length > 1 ? 'ROUND ' + (S.round + 1) + ': A TIE AT THE TOP!' : 'ROUND ' + (S.round + 1) + ' CHAMPION!',
        sub: top.map(function (t) { return t.name; }).join(' & ') + ' scored the most this round!', delta: best, mood: 'good', sound: 'fanfare', wait: 2400 });
      else tone([523, 659, 784, 1047], 0.1, 0.35);
    }

    // ---------- sets ----------
    function openSets() {
      var groups = {};
      SETS.forEach(function (s) { (groups[s.group || ''] = groups[s.group || ''] || []).push(s); });
      $('sets').innerHTML = Object.keys(groups).map(function (g) {
        return (g ? '<h3>' + esc(g) + '</h3>' : '') + groups[g].map(function (s) {
          var n = s.rounds ? s.rounds.length : Math.ceil(s.questions.length / ROUND);
          return '<button class="btn" data-set="' + esc(s.key) + '"><b>' + esc(s.name) + '</b><br /><small>' + (s.rounds ? n + ' stories · ' : s.questions.length + ' questions · ') + n + ' round' + (n > 1 ? 's' : '') + '</small></button>';
        }).join('');
      }).join('') + (cfg.noSheetNote ? '' : '');
      if (PROBLEMS.length) {
        $('problems').textContent = PROBLEMS.length + ' row' + (PROBLEMS.length === 1 ? '' : 's') + ' in your Questions tab couldn\'t be used: ' +
          PROBLEMS.slice(0, 5).map(function (p) { return 'row ' + p.row + ' (' + p.problem + ')'; }).join('; ') + (PROBLEMS.length > 5 ? '…' : '');
        $('problems').hidden = false;
      }
      $('setsClose').hidden = !set();
      $('setsBack').hidden = false;
    }
    $('sets').addEventListener('click', function (e) {
      var b = e.target.closest('[data-set]');
      if (!b) return;
      S.setKey = b.dataset.set; S.setName = set().name;
      S.order = shuffle(range(count(set()))); S.round = 0; S.phase = 'start'; S.running = false; S.roundPts = {};
      save(); $('setsBack').hidden = true; render();
    });
    $('setsClose').addEventListener('click', function () { $('setsBack').hidden = true; });

    // ---------- ⚙ menu ----------
    function closeMenu() { $('menuBack').hidden = true; }
    function renderSecs() {
      KruMenu.timer($('secsRow'), S.secs, function (v) { S.secs = v; save(); }); // Time per question
      if ($('readRow')) KruMenu.timer($('readRow'), S.readSecs || 60, function (v) { S.readSecs = v; save(); }); // Time to read the story
    }
    function disarm() { $('kbtReset').classList.remove('armed'); $('kbtReset').textContent = 'New Game'; }
    $('more').addEventListener('click', function () { renderSecs(); disarm(); $('kbtRestartRound').disabled = !set(); $('menuBack').hidden = false; if (S.running && (S.phase === 'ask' || S.phase === 'read')) pause(); });
    $('menuClose').addEventListener('click', closeMenu);
    $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
    $('kbtSet').addEventListener('click', function () { closeMenu(); openSets(); });
    $('kbtRestartRound').addEventListener('click', function () {
      closeMenu();
      var got = S.roundPts[S.round];
      if (got) players().forEach(function (t) { if (got[t.id]) { S.pts[t.id] = pts(t.id) - got[t.id]; Kru.score(t.id, -got[t.id], 'round restarted'); } });
      delete S.roundPts[S.round];
      S.phase = 'start'; S.running = false; save(); render();
    });
    $('kbtReset').addEventListener('click', function () {
      var btn = this;
      if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tap again to confirm'; setTimeout(disarm, 3500); return; }
      teams.forEach(function (t) { if (pts(t.id)) Kru.score(t.id, -pts(t.id), 'reset'); });
      S.pts = {}; S.roundPts = {}; save(); closeMenu(); render();
    });
    $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: cfg.title }); });

    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
    window.addEventListener('resize', fit);
    Kru.onFinishRequest(function () { Kru.finish(teams.map(function (t) { return { teamId: t.id, points: pts(t.id) }; })); });

    // ---------- start ----------
    Kru.ready(function (session) {
      cfg.load(session).then(function (got) {
        SETS = got.sets.filter(function (s) { return (s.questions && s.questions.length) || (s.rounds && s.rounds.length); });
        HIDDEN = got.hidden || []; INTRO = got.intro || []; PROBLEMS = got.problems || [];
        teams = Kru.allTeams();
        KruEnd.setup({ standings: function () { return teams.map(function (t) { return { name: t.name, points: pts(t.id), teacher: !!t.teacher }; }); } });
        var saved = session.resume;
        if (saved && saved.v === 2 && saved.level === session.level && (!saved.setKey || SETS.some(function (s) { return s.key === saved.setKey && s.name === saved.setName && count(s) === saved.order.length; }))) S = saved;
        else S = { v: 2, level: session.level, setKey: null, order: [], round: 0, phase: 'start', qi: 0, rev: 0, flipped: [], bonus: [], tally: {}, roundPts: {}, pts: {}, secs: 30, running: false, left: 0, total: 0, endAt: 0 };
        // the set picked before the team builder: start with it (no set menu)
        var pre = session.setKey ? SETS.filter(function (x) { return x.key === session.setKey; })[0] : null;
        if (pre && S.setKey === null && S.order.length === 0) { S.setKey = pre.key; S.setName = pre.name; S.order = shuffle(range(count(pre))); }
        S.secs = KruMenu.snap(S.secs); if (S.readSecs) S.readSecs = KruMenu.snap(S.readSecs); // whole 10-second steps
        render();
        if (S.running) runTick();
        var after = function () { S.introDone = true; save(); if (!set()) openSets(); };
        if (!S.introDone) KruIntro.show(INTRO, { title: cfg.title }).then(after); else after();
      }).catch(function (err) {
        $('kbtStage').textContent = 'Could not load the questions. Close the game and open it again.';
        if (window.console) console.error(err);
      });
    });
  }

  window.KruBattle = { start: start, ROUND: ROUND };
})();
