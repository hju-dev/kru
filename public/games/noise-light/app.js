/* Noise Light (a tool). Sign: tap green / yellow / red. Noise meter: the microphone measures how loud the
   room is and sets the color (sensitivity 1-10). The sound is never recorded or sent anywhere. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var SIGNS = {
    green: { word: 'Talk', sub: 'Normal voices' },
    yellow: { word: 'Quiet voices', sub: 'Whisper, please' },
    red: { word: 'Silence', sub: 'No talking' },
  };
  var S = { v: 1, mode: 'sign', color: 'green', sens: 5 };
  var stream = null, ctx = null, analyser = null, data = null, raf = 0, smooth = 0, loudSince = 0;

  function save() { Kru.saveState(S); }
  function setLight(color, word, sub) {
    var l = $('light');
    l.className = 'light ' + color;
    $('word').textContent = word;
    $('sub').textContent = sub;
  }
  function renderSign() { var s = SIGNS[S.color]; setLight(S.color, s.word, s.sub); }

  function showMode(m) {
    S.mode = m; save();
    $('modeSign').setAttribute('aria-pressed', String(m === 'sign'));
    $('modeMeter').setAttribute('aria-pressed', String(m === 'meter'));
    $('signBtns').hidden = m !== 'sign';
    $('meterBtns').hidden = m !== 'meter';
    $('meter').hidden = m !== 'meter';
    $('sens').textContent = S.sens;
    if (m === 'sign') { stop(); renderSign(); }
    else { setLight('green', 'Noise meter', stream ? 'Listening…' : 'Tap Start listening'); placeMarks(); }
  }
  $('modeSign').addEventListener('click', function () { showMode('sign'); });
  $('modeMeter').addEventListener('click', function () { showMode('meter'); });
  $('signBtns').addEventListener('click', function (e) {
    var b = e.target.closest('[data-c]');
    if (!b) return;
    S.color = b.dataset.c; save(); renderSign();
  });
  // tap the light itself to go to the next color (sign mode)
  $('light').addEventListener('click', function () {
    if (S.mode !== 'sign') return;
    S.color = S.color === 'green' ? 'yellow' : S.color === 'yellow' ? 'red' : 'green'; save(); renderSign();
  });

  // ---------- noise meter ----------
  // thresholds on a 0..1 loudness scale; higher sensitivity = turns yellow / red at a lower noise
  function limits() { var k = 1 - (S.sens - 1) * 0.07; return { y: 0.35 * k, r: 0.6 * k }; }
  function placeMarks() { var t = limits(); $('markY').style.left = t.y * 100 + '%'; $('markR').style.left = t.r * 100 + '%'; }
  function start() {
    if (stream) return stop();
    $('msg').textContent = '';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('msg').textContent = 'This device can\'t use the microphone here.'; return; }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (s) {
      stream = s;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      var src = ctx.createMediaStreamSource(s);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      data = new Float32Array(analyser.fftSize);
      src.connect(analyser);
      $('listen').textContent = 'Stop listening';
      $('sub').textContent = 'Listening…';
      loop();
    }).catch(function () {
      $('msg').textContent = 'Microphone not allowed. Check Settings → Safari → Microphone.';
    });
  }
  function stop() {
    cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    if (ctx) try { ctx.close(); } catch (e) {}
    stream = null; ctx = null; analyser = null;
    $('listen').textContent = 'Start listening';
    $('level').style.width = '0';
  }
  function loop() {
    if (!analyser) return;
    analyser.getFloatTimeDomainData(data);
    var sum = 0;
    for (var i = 0; i < data.length; i++) sum += data[i] * data[i];
    var rms = Math.sqrt(sum / data.length);
    // roughly 0 (silent room) .. 1 (very loud), on a log scale
    var level = Math.max(0, Math.min(1, (20 * Math.log10(rms + 1e-6) + 60) / 50));
    smooth = smooth * 0.85 + level * 0.15;
    $('level').style.width = (smooth * 100).toFixed(1) + '%';
    var t = limits(), now = Date.now();
    var color = smooth >= t.r ? 'red' : smooth >= t.y ? 'yellow' : 'green';
    if (color === 'red') { if (!loudSince) loudSince = now; } else loudSince = 0;
    var alarm = loudSince && now - loudSince > 1500;
    setLight(color, alarm ? 'Too loud!' : color === 'green' ? 'Good' : color === 'yellow' ? 'Getting loud' : 'Loud!', 'Listening…');
    $('light').classList.toggle('alarm', !!alarm);
    raf = requestAnimationFrame(loop);
  }
  $('listen').addEventListener('click', start);
  $('sensDown').addEventListener('click', function () { S.sens = Math.max(1, S.sens - 1); save(); $('sens').textContent = S.sens; placeMarks(); });
  $('sensUp').addEventListener('click', function () { S.sens = Math.min(10, S.sens + 1); save(); $('sens').textContent = S.sens; placeMarks(); });
  // stop the microphone when the app goes to the background
  document.addEventListener('visibilitychange', function () { if (document.visibilityState !== 'visible') stop(); });
  window.addEventListener('pagehide', stop);

  Kru.ready(function (session) {
    var r = session.resume;
    if (r && r.v === 1 && SIGNS[r.color]) S = r;
    showMode(S.mode === 'meter' ? 'meter' : 'sign');
  });
})();
