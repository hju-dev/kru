/* Word Rush: teams write as many words as they can for a prompt. Bonus cards change the scoring.
   Points = words × multiplier + bonus. Teams come from the Kru session; prompts from content.json. */
(function () {
  'use strict';
  var COLORS = ['#FFD23F', '#FF7B6B', '#7FD3FF', '#7CE0B3', '#C9A8FF', '#FFB27A', '#F7F3E8', '#9BE36D', '#FF9EC7', '#6FE3E3', '#E8D38C', '#B3C7FF'];
  var KIND = { cat: 'Category', rhyme: 'Rhyme time', letter: 'Letter challenge' };
  var LETTERS = ['S', 'T', 'A', 'E', 'R', 'N'];
  // name3 / text3 = the harder M.3 version of a card; levels = only for those levels
  var BONUS = [
    { id: 'classic', name: 'Classic round', text: '1 point per word. Simple!', weight: 2 },
    { id: 'long', name: 'Long words', text: 'Words with 6 or more letters count twice. Count them twice in your total!', name3: 'Big words', text3: 'Words with 3 or more syllables count twice. Count them twice in your total!', weight: 2 },
    { id: 'gold', name: 'Golden letter', text: '', weight: 2 },
    { id: 'speed', name: 'Speed round', text: 'Only 30 seconds, but every word is worth 2 points!', secs: 30, mult: 2, weight: 1 },
    { id: 'pen', name: 'Pass the pen', text: 'Change the writer every 20 seconds. Listen for the beep!', pen: true, weight: 1 },
    { id: 'spell', name: 'Spelling police', text: 'Every wrong spelling = minus 1 point. Write carefully!', weight: 1 },
    { id: 'unique', name: 'Unique word', text: 'After counting, each team says its best word. Nobody else has it? +3 bonus!', weight: 1 },
    { id: 'sentence', name: 'Sentence challenge', text: 'Say ONE correct sentence with 3 of your words: +3 bonus!', text3: 'Say ONE correct sentence with 4 of your words AND a linking word (because, although, so): +3 bonus!', weight: 1 },
    { id: 'double', name: 'Double points', text: 'Every word is worth 2 points!', mult: 2, weight: 1 },
  ];
  var FINAL = { id: 'final', name: 'FINAL ROUND: Double points', text: 'Every word is worth 2 points. Give it everything!', mult: 2 };
  var $ = function (id) { return document.getElementById(id); };

  var PROMPTS = [];
  var teams = [];
  var S = null;
  var left = 0, total = 0, running = false, endAt = 0, timer = 0, nextBeep = 0, audio = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  /** Prompts may use <em> for the key words; everything else is shown as plain text. */
  function promptHtml(s) { return esc(s).replace(/&lt;(\/?)em&gt;/g, '<$1em>'); }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function save() { Kru.saveState(S); }
  function m3() { return S.level === 'M.3'; }
  function isFinal() { return S.round >= S.rounds; }
  function bonus() { return isFinal() ? FINAL : (BONUS.find(function (b) { return b.id === S.bonus; }) || BONUS[0]); }
  function mult() { return bonus().mult || 1; }
  function roundSecs() { return bonus().secs || S.secs; }
  function total_(id) { return S.totals[id] || 0; }
  function entry(id) { return S.entry[id] || (S.entry[id] = { w: 0, b: 0 }); }

  // ---------- sound (started inside a tap, for the iPhone) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }
  function tone(freqs, gap) {
    if (!audio) return;
    gap = gap || 0.2;
    try {
      freqs.forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * gap;
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.35);
      });
    } catch (e) {}
  }

  // ---------- prompt + bonus ----------
  function pickPrompt() {
    var pool = PROMPTS.map(function (_, i) { return i; }).filter(function (i) { return S.used.indexOf(i) < 0 && i !== S.prompt; });
    if (!pool.length) { S.used = []; pool = PROMPTS.map(function (_, i) { return i; }).filter(function (i) { return i !== S.prompt; }); }
    // variety: roughly every third round is a rhyme or letter prompt
    var want = S.round % 3 === 2 ? ['rhyme', 'letter'] : ['cat'];
    var pref = pool.filter(function (i) { return want.indexOf(PROMPTS[i].kind) >= 0; });
    var list = pref.length ? pref : pool;
    S.prompt = list[Math.floor(Math.random() * list.length)];
    S.used.push(S.prompt);
  }
  function pickBonus() {
    var bag = [];
    BONUS.forEach(function (b) {
      if (b.id !== S.bonus && (!b.levels || b.levels.indexOf(S.level) >= 0)) for (var k = 0; k < b.weight; k++) bag.push(b.id);
    });
    S.bonus = bag[Math.floor(Math.random() * bag.length)];
    S.gold = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }

  function fitPrompt() {
    var box = $('promptbox'), p = $('prompt'), size = 44;
    p.style.fontSize = size + 'px';
    while (size > 22 && box.scrollHeight > box.clientHeight + 1) p.style.fontSize = (size -= 2) + 'px';
  }

  function renderRound() {
    bonusRound('round' + S.round);
    var p = PROMPTS[S.prompt], b = bonus();
    $('kind').textContent = isFinal() ? 'Final round' : KIND[p.kind] || 'Category';
    $('kind').className = 'kind ' + (isFinal() ? 'final' : p.kind === 'cat' ? '' : p.kind);
    $('prompt').innerHTML = promptHtml(p.prompt);
    $('bname').textContent = b.id === 'gold' ? 'Golden letter: ' + S.gold : (m3() && b.name3) || b.name;
    $('btext').textContent = b.id === 'gold'
      ? 'Words with the letter ' + S.gold + ' in them count twice. Count them twice in your total!'
      : (m3() && b.text3) || b.text;
    $('examples').innerHTML = '<b>Example answers:</b> ' + esc(p.examples);
    $('examples').hidden = true;
    $('bonusCard').hidden = false;
    $('showEx').textContent = 'Show examples';
    KruCorner.set($('promptbox'), S.round + '/' + S.rounds);
    stopTimer();
    total = left = roundSecs();
    $('phase').textContent = 'Ready? Pens up!';
    $('pens').textContent = '';
    renderClock();
    fitPrompt();
  }

  // ---------- timer ----------
  function renderClock() {
    $('digits').textContent = fmt(left);
    $('fill').style.transform = 'scaleX(' + (total ? Math.max(0, left) / total : 0) + ')';
    $('clock').classList.toggle('warn', left > 0 && left <= 10);
    $('clock').classList.toggle('done', left <= 0);
    $('go').textContent = running ? 'Pause' : left <= 0 ? 'Restart' : left < total ? 'Resume' : 'Start';
  }
  function tick() {
    if (!running) return;
    left = (endAt - Date.now()) / 1000;
    if (bonus().pen && left > 0 && total - left >= nextBeep) {
      tone([660]);
      $('pens').textContent = 'Pass the pen!';
      nextBeep += 20;
      setTimeout(function () { if ($('pens').textContent === 'Pass the pen!') $('pens').textContent = ''; }, 2500);
    }
    if (left <= 0) {
      left = 0; running = false; clearInterval(timer);
      tone([880, 660, 990]);
      $('phase').textContent = 'Pens down! Count your words.';
    }
    renderClock();
  }
  function startTimer() {
    unlockAudio();
    if (left <= 0) left = total;
    if (left === total) nextBeep = 20;
    running = true;
    endAt = Date.now() + left * 1000;
    $('phase').textContent = 'Write!';
    clearInterval(timer);
    timer = setInterval(tick, 200);
    renderClock();
  }
  function stopTimer() {
    if (running) left = Math.max(0, (endAt - Date.now()) / 1000);
    running = false;
    clearInterval(timer);
  }

  // ---------- scores ----------
  function roundPoints(id) { var e = entry(id); return Math.max(0, e.w) * mult() + e.b; }
  function renderTeams() {
    var max = Math.max.apply(null, teams.map(function (t) { return total_(t.id); }));
    $('teams').innerHTML = teams.map(function (t, i) {
      var e = entry(t.id), pts = roundPoints(t.id);
      return '<div class="team' + (max > 0 && total_(t.id) === max ? ' lead' : '') + (S.added ? ' done-entry' : '') + '" data-t="' + esc(t.id) + '" style="--c:' + COLORS[i % COLORS.length] + '">' +
        '<span class="name">' + esc(t.name) + '</span><span class="total">' + total_(t.id) + '</span>' +
        '<div class="row"><span class="lab">Words</span>' +
          '<button class="step" data-k="w" data-d="-1" aria-label="' + esc(t.name) + ' one word less">−</button>' +
          '<output>' + e.w + '</output>' +
          '<button class="step" data-k="w" data-d="1" aria-label="' + esc(t.name) + ' one more word">+1</button>' +
          '<button class="step" data-k="w" data-d="5" aria-label="' + esc(t.name) + ' five more words">+5</button></div>' +
        '<div class="row"><span class="lab">Bonus</span>' +
          '<button class="step" data-k="b" data-d="-1" aria-label="' + esc(t.name) + ' bonus minus 1">−1</button>' +
          '<output>' + (e.b > 0 ? '+' : '') + e.b + '</output>' +
          '<button class="step" data-k="b" data-d="1" aria-label="' + esc(t.name) + ' bonus plus 1">+1</button>' +
          '<button class="step" data-k="b" data-d="3" aria-label="' + esc(t.name) + ' bonus plus 3">+3</button></div>' +
        '<div class="last">' + (S.added ? esc(S.last[t.id] || '') : 'This round: <b>' + pts + '</b>') + '</div>' +
        '</div>';
    }).join('');
    $('scoreHint').innerHTML = 'Round ' + S.round + ': tap in each team\'s <b>words</b> and any <b>bonus</b>. Points = words × <b>' + mult() + '</b> + bonus.';
    $('addRound').hidden = S.added;
    $('nextRound').hidden = !S.added;
    $('nextRound').textContent = isFinal() ? 'See the winner ▶' : 'Next round ▶';
  }
  $('teams').addEventListener('click', function (e) {
    var b = e.target.closest('[data-k]');
    if (!b || S.added) return;
    var id = b.closest('[data-t]').dataset.t, en = entry(id), d = Number(b.dataset.d);
    if (b.dataset.k === 'w') en.w = Math.max(0, Math.min(199, en.w + d));
    else en.b = Math.max(-30, Math.min(30, en.b + d));
    save();
    renderTeams();
  });

  function toast(t) {
    $('toast').textContent = t;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { $('toast').textContent = ''; }, 5000);
  }

  function addRound() {
    var m = mult(), any = false;
    // keep this round's taps and card, so Undo can bring them back
    var rec = { round: S.round, pts: {}, entry: JSON.parse(JSON.stringify(S.entry)), prompt: S.prompt, bonus: S.bonus, gold: S.gold };
    teams.forEach(function (t) {
      var e = entry(t.id), pts = roundPoints(t.id);
      if (e.w || e.b) any = true;
      rec.pts[t.id] = pts;
      S.totals[t.id] = total_(t.id) + pts;
      S.last[t.id] = 'Round ' + S.round + ': ' + e.w + ' word' + (e.w === 1 ? '' : 's') + (m > 1 ? ' × ' + m : '') +
        (e.b ? (e.b > 0 ? ' + ' : ' − ') + Math.abs(e.b) : '') + ' = ' + pts;
      if (pts) Kru.score(t.id, pts, 'round ' + S.round);
    });
    if (!any) { toast('Tap in at least one team\'s words first.'); return; }
    S.history.push(rec);
    S.added = true;
    save();
    renderTeams();
    var best = Math.max.apply(null, teams.map(function (t) { return rec.pts[t.id]; }));
    var who = teams.filter(function (t) { return rec.pts[t.id] === best; }).map(function (t) { return t.name; });
    toast('Best this round: ' + who.join(' & ') + ' (' + best + ')');
  }
  function undoRound() {
    var rec = S.history.pop();
    if (!rec) return;
    teams.forEach(function (t) {
      var p = rec.pts[t.id] || 0;
      S.totals[t.id] = total_(t.id) - p;
      if (p) Kru.score(t.id, -p, 'undo round ' + rec.round);
    });
    // back to that round, with its prompt, card and taps, ready to fix
    S.round = rec.round;
    if (rec.entry) S.entry = rec.entry;
    if (rec.prompt !== undefined && PROMPTS[rec.prompt]) { S.prompt = rec.prompt; S.bonus = rec.bonus; S.gold = rec.gold; }
    S.added = false;
    S.last = {};
    save();
    renderRound();
    renderTeams();
    toast('Round ' + rec.round + ' removed. Fix the scores and add it again.');
  }
  function nextRound() {
    if (isFinal()) return showWinner();
    S.round++;
    S.added = false;
    S.entry = {};
    pickPrompt();
    if (!isFinal()) pickBonus();
    save();
    renderRound();
    showView('round');
  }
  function showWinner() {
    var sorted = teams.slice().sort(function (a, b) { return total_(b.id) - total_(a.id); });
    var max = total_(sorted[0].id);
    var winners = sorted.filter(function (t) { return total_(t.id) === max; }).map(function (t) { return t.name; });
    $('winTitle').textContent = 'Winner: ' + winners.join(' & ') + ' (' + max + ')';
    $('finalList').innerHTML = sorted.map(function (t) { return '<li>' + esc(t.name) + ': <b>' + total_(t.id) + '</b></li>'; }).join('');
    $('winBack').hidden = false;
    tone([523, 659, 784, 1047], 0.16);
  }

  function showView(v) {
    $('roundView').hidden = v !== 'round';
    $('scoreView').hidden = v !== 'scores';
    S.view = v;
    save();
    if (v === 'round') fitPrompt(); else renderTeams();
  }

  // ---------- buttons ----------
  $('go').addEventListener('click', function () {
    if (running) { stopTimer(); $('phase').textContent = 'Paused'; renderClock(); } else startTimer();
  });
  $('reset').addEventListener('click', function () {
    stopTimer(); total = left = roundSecs();
    $('phase').textContent = 'Ready? Pens up!'; $('pens').textContent = '';
    renderClock();
  });
  $('showEx').addEventListener('click', function () {
    var ex = $('examples');
    ex.hidden = !ex.hidden;
    $('bonusCard').hidden = !ex.hidden; // examples take the bonus card's place (they come after the writing)
    $('showEx').textContent = ex.hidden ? 'Show examples' : 'Hide examples';
    fitPrompt();
  });
  $('toScores').addEventListener('click', function () { stopTimer(); renderClock(); showView('scores'); KruBonus.reveal(); });
  $('toRound').addEventListener('click', function () { showView('round'); });
  $('addRound').addEventListener('click', addRound);
  $('nextRound').addEventListener('click', nextRound);
  $('winClose').addEventListener('click', function () { $('winBack').hidden = true; });

  // ⋯ menu
  function renderMenu() {
    $('roundsOut').textContent = S.rounds;
    $('roundsDown').disabled = S.rounds <= Math.max(6, S.round);
    $('roundsUp').disabled = S.rounds >= 10;
    document.querySelectorAll('[data-secs]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.secs === S.secs)); });
    $('undoRound').disabled = !S.history.length;
    $('swapBonus').disabled = isFinal();
  }
  function openMenu() { renderMenu(); disarm(); $('menuBack').hidden = false; }
  function closeMenu() { $('menuBack').hidden = true; }
  $('more').addEventListener('click', openMenu);
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('swapPrompt').addEventListener('click', function () { pickPrompt(); save(); renderRound(); closeMenu(); showView('round'); });
  $('swapBonus').addEventListener('click', function () { pickBonus(); save(); renderRound(); closeMenu(); showView('round'); });
  $('roundsDown').addEventListener('click', function () { S.rounds = Math.max(6, S.round, S.rounds - 1); save(); renderMenu(); renderRound(); });
  $('roundsUp').addEventListener('click', function () { S.rounds = Math.min(10, S.rounds + 1); save(); renderMenu(); renderRound(); });
  document.querySelectorAll('[data-secs]').forEach(function (b) {
    b.addEventListener('click', function () { S.secs = +b.dataset.secs; save(); renderMenu(); renderRound(); });
  });
  $('undoRound').addEventListener('click', function () { undoRound(); closeMenu(); showView('scores'); });
  function disarm() { $('newGame').classList.remove('armed'); $('newGame').textContent = 'New game (scores back to 0)'; }
  $('newGame').addEventListener('click', function () {
    var btn = this;
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed'); btn.textContent = 'Tap again: start again from round 1';
      setTimeout(disarm, 3500);
      return;
    }
    teams.forEach(function (t) { if (total_(t.id)) Kru.score(t.id, -total_(t.id), 'new game'); });
    S = fresh(S.level, S.rounds, S.secs);
    pickPrompt(); pickBonus(); save();
    closeMenu(); renderRound(); showView('round');
  });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden || $('roundView').hidden) return;
    if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', function () { if (!$('roundView').hidden) fitPrompt(); });

  Kru.onFinishRequest(function () {
    Kru.finish(teams.map(function (t) { return { teamId: t.id, points: total_(t.id) }; }));
  });

  // ---------- start ----------
  function fresh(level, rounds, secs) {
    return { v: 1, level: level, rounds: rounds || 8, secs: secs || 60, round: 1, used: [], prompt: null, bonus: null, gold: 'S',
      added: false, totals: {}, last: {}, history: [], entry: {}, view: 'round' };
  }
  // How to play slides: before the game starts, and from the ⋯ menu
  var INTRO = [];
  function showIntro() { return KruIntro.show(INTRO, { title: 'Word Rush' }); }
  $('howTo').addEventListener('click', function () { $('menuBack').hidden = true; showIntro(); });

  // ---------- bonus cards (shared: games/shared/kru-bonus.js) ----------
  // before cards pop up when a round starts; secret cards at the reveal. Points: tap the ★ chip, then teams.
  function bonusRound(key) { var b = KruBonus.next(S.kbonus, key); if (b !== S.kbonus) { S.kbonus = b; save(); } }

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (content) {
      var level = content[session.level] ? session.level : 'M.2';
      PROMPTS = content[level].prompts;
      teams = Kru.allTeams();
      KruEnd.setup({ standings: function () { return teams.map(function (t) { return { name: t.name, points: total_(t.id), teacher: !!t.teacher }; }); } });
      KruBonus.setup({ cards: content.bonus, bar: $('more').parentNode, beforeEl: $('more'), teams: function () { return teams; }, save: function () { save(); },
        award: function (id, d, card) {
          // before the round is added: into this round's Bonus; after: straight onto the total
          if (!S.added) entry(id).b += d;
          else { S.totals[id] = total_(id) + d; Kru.score(id, d, 'bonus: ' + card.name); }
          save(); renderTeams();
        } });
      var saved = session.resume;
      if (saved && saved.v === 1 && saved.level === level && PROMPTS[saved.prompt]) {
        S = saved;
      } else {
        S = fresh(level);
        pickPrompt(); pickBonus(); save();
      }
      $('lvl').textContent = level;
      renderRound();
      renderTeams();
      INTRO = KruIntro.forLevel(content, level);
      if (!S.introDone) showIntro().then(function () { S.introDone = true; save(); });
      showView(S.view === 'scores' ? 'scores' : 'round');
    }).catch(function () {
      $('prompt').textContent = 'Could not load the prompts. Close the game and open it again.';
    });
  });
})();
