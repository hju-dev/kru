/* One-Word Story: the whole class in a circle, one word each, building a story from an opener.
   A beat tells the next person when to say their word (no tapping for each word). "Period!" ends a
   sentence. When the story time is up, the last person finishes the sentence, then one student
   retells the whole story in 30 seconds. No points: a speaking warm-up. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ROUNDS = [120, 180, 240, 300], BEATS = [3, 4, 5, 6, 8, 10], RETELL = 30;

  var OPENERS = [], S = null, INTRO = [];
  var phase = 'ready', left = 0, total = 0, beatLeft = 0, running = false, endAt = 0, beatAt = 0, timer = 0, audio = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function save() { Kru.saveState(S); }
  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }

  // ---------- sound (after a tap) ----------
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function tone(freqs, gap, dur, vol) {
    if (!audio) return;
    try {
      freqs.forEach(function (f, i) {
        var t = audio.currentTime + i * (gap || 0.15), o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.25));
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.25) + 0.05);
      });
    } catch (e) {}
  }
  function flash(text, ms) {
    var f = $('flash');
    f.textContent = text;
    f.hidden = false;
    clearTimeout(flash.t);
    flash.t = setTimeout(function () { f.hidden = true; }, ms || 800);
  }

  // ---------- the story ----------
  function opener() { return OPENERS[S.order[S.pos]] || ''; }
  function fitOpener() {
    var stage = $('stage'), el = $('opener'), size = 46;
    el.style.fontSize = size + 'px';
    while (size > 24 && stage.scrollHeight > stage.clientHeight + 1) el.style.fontSize = (size -= 2) + 'px';
  }
  var TEXT = {
    ready: 'Ready',
    story: 'One word each!',
    last: 'Finish the sentence!',
    retell: 'Retell the story',
    done: 'The end!',
  };
  function render() {
    $('opener').textContent = opener() + ' …';
    $('counts').textContent = phase === 'ready' ? 'Make a circle · read the opener together' :
      S.words + ' word' + (S.words === 1 ? '' : 's') + ' · ' + S.sentences + ' sentence' + (S.sentences === 1 ? '' : 's');
    $('digits').textContent = fmt(left);
    $('digits').className = 'digits' + (left <= 0 && phase !== 'ready' ? ' done' : left <= 10 && running ? ' warn' : '');
    $('phase').textContent = TEXT[phase];
    var story = phase === 'story';
    $('beat').classList.toggle('on', story && running);
    $('beatNum').textContent = story ? Math.max(1, Math.ceil(beatLeft)) : S.beat;
    $('go').hidden = phase === 'last' || phase === 'done';
    $('go').textContent = phase === 'ready' ? 'Start story' : running ? 'Pause' : 'Resume';
    $('period').disabled = !(story || phase === 'last');
    $('retell').hidden = !(phase === 'last' || phase === 'retell' || phase === 'done');
    $('retell').disabled = phase === 'retell';
    $('retell').textContent = phase === 'done' ? 'Retell again' : 'Retell ' + fmt(RETELL);
    fitOpener();
  }

  // ---------- timers ----------
  function run() {
    unlockAudio();
    running = true;
    endAt = Date.now() + left * 1000;
    beatAt = Date.now() + beatLeft * 1000;
    clearInterval(timer);
    timer = setInterval(tick, 100);
    render();
  }
  function pause() {
    if (running) { left = Math.max(0, (endAt - Date.now()) / 1000); beatLeft = Math.max(0, (beatAt - Date.now()) / 1000); }
    running = false;
    clearInterval(timer);
    render();
  }
  function tick() {
    if (!running) return;
    var now = Date.now();
    left = (endAt - now) / 1000;
    if (phase === 'story') {
      beatLeft = (beatAt - now) / 1000;
      if (beatLeft <= 0) {
        // the beat: the next person says their word
        S.words++; save();
        beatAt = now + S.beat * 1000; beatLeft = S.beat;
        tone([660], 0, 0.12, 0.25);
        var b = $('beat'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
      }
      if (left <= 0) {
        running = false; clearInterval(timer); left = 0; phase = 'last';
        tone([880, 660, 990], 0.2);
        flash("TIME'S UP!", 1400);
      }
    } else if (phase === 'retell' && left <= 0) {
      running = false; clearInterval(timer); left = 0; phase = 'done';
      tone([784, 659, 523, 392], 0.18, 0.35);
    }
    render();
  }
  function startStory() {
    phase = 'story'; total = left = S.round; beatLeft = S.beat;
    S.words = 0; S.sentences = 0; save();
    tone([523, 659, 784], 0.12);
    run();
  }
  function startRetell() { phase = 'retell'; total = left = RETELL; tone([660, 880], 0.12); run(); }
  function resetStory() {
    pause(); phase = 'ready'; total = left = S.round; beatLeft = S.beat; S.words = 0; S.sentences = 0; save(); render();
  }
  function goTo(pos) {
    if (pos >= S.order.length) { S.order = shuffled(OPENERS.length); pos = 0; }
    S.pos = pos; save(); resetStory();
  }

  // ---------- buttons ----------
  $('go').addEventListener('click', function () {
    if (phase === 'ready') startStory(); else if (running) pause(); else run();
  });
  $('period').addEventListener('click', function () {
    unlockAudio();
    S.sentences++; save();
    tone([392, 523], 0.1, 0.3, 0.35);
    flash('PERIOD!', 700);
    render();
  });
  $('retell').addEventListener('click', function () { if (phase !== 'retell') { pause(); startRetell(); } });
  $('next').addEventListener('click', function () { unlockAudio(); goTo(S.pos + 1); });

  // ---------- ⋯ menu ----------
  function renderMenu() {
    $('roundRow').innerHTML = ROUNDS.map(function (s) { return '<button class="btn" data-round="' + s + '" aria-pressed="' + (s === S.round) + '">' + fmt(s) + '</button>'; }).join('');
    $('beatRow').innerHTML = BEATS.map(function (s) { return '<button class="btn" data-beat="' + s + '" aria-pressed="' + (s === S.beat) + '">' + s + ' s</button>'; }).join('');
  }
  function closeMenu() { $('menuBack').hidden = true; }
  $('more').addEventListener('click', function () { renderMenu(); $('menuBack').hidden = false; });
  $('menuClose').addEventListener('click', closeMenu);
  $('menuBack').addEventListener('click', function (e) { if (e.target === this) closeMenu(); });
  $('roundRow').addEventListener('click', function (e) {
    var b = e.target.closest('[data-round]');
    if (!b) return;
    S.round = +b.dataset.round; save(); renderMenu();
    if (phase === 'ready') { total = left = S.round; render(); }
  });
  $('beatRow').addEventListener('click', function (e) {
    var b = e.target.closest('[data-beat]');
    if (!b) return;
    S.beat = +b.dataset.beat; save(); renderMenu();
    if (phase !== 'story') { beatLeft = S.beat; render(); }
  });
  $('howTo').addEventListener('click', function () { closeMenu(); KruIntro.show(INTRO, { title: 'One-Word Story' }); });
  $('resetStory').addEventListener('click', function () { closeMenu(); resetStory(); });

  document.addEventListener('keydown', function (e) {
    if (!$('menuBack').hidden) return;
    if (e.code === 'Space') { e.preventDefault(); $('go').hidden ? $('retell').click() : $('go').click(); }
    else if (e.key === '.' || e.key === 'p') $('period').click();
    else if (e.key === 'ArrowRight') $('next').click();
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('resize', fitOpener);

  // no points in this game: Finish just closes it
  Kru.onFinishRequest(function () { Kru.finish([]); });

  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (c) {
      var level = c[session.level] ? session.level : 'M.2';
      OPENERS = c[level].openers;
      var saved = session.resume;
      if (saved && saved.v === 1 && saved.level === level && Array.isArray(saved.order) && saved.order.length === OPENERS.length) S = saved;
      else S = { v: 1, level: level, order: shuffled(OPENERS.length), pos: 0, round: 240, beat: 5, words: 0, sentences: 0, introDone: false };
      if (ROUNDS.indexOf(S.round) < 0) S.round = 240;
      if (BEATS.indexOf(S.beat) < 0) S.beat = 5;
      total = left = S.round; beatLeft = S.beat;
      render();
      INTRO = KruIntro.forLevel(c, level);
      if (!S.introDone) KruIntro.show(INTRO, { title: 'One-Word Story' }).then(function () { S.introDone = true; save(); });
    }).catch(function () { $('opener').textContent = 'Could not load the story openers. Close the game and open it again.'; });
  });
})();
