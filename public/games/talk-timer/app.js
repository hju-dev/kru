/* Talk Timer: presets of one or more timed phases, a chime at zero. No teams, no results.
   Henry's presets are saved through Kru (on this phone) and come back as session.resume. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MAX_SECS = 99 * 60 + 59;
  var RETIRED = ['one-word-story']; // now the One-Word Story game

  var starting = null;            // content.json
  var data = { v: 1, presets: [], current: null };
  var phaseIdx = 0, total = 0, left = 0, running = false, endAt = 0, timer = 0;
  var audio = null;

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function fmt(s) {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function newId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function save() { Kru.saveState(data); }
  /** Rules slides for a timer: Henry's own (one per line) or the built-in ones for that timer. */
  function rulesFor(p) {
    if (!p) return [];
    var own = String(p.rulesText || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (own.length) {
      var slides = [];
      for (var i = 0; i < own.length; i += 2) slides.push({ title: p.name, text: own.slice(i, i + 2) });
      if (slides.length === 1) slides.push({ title: p.name, text: ['Ready? Tap Start!'] });
      return slides;
    }
    var built = starting && starting.presets.find(function (x) { return x.id === p.id; });
    return (built && built.rules) || [];
  }
  function preset() {
    return data.presets.find(function (p) { return p.id === data.current; }) || data.presets[0] || null;
  }
  function valid(p) {
    return p && typeof p.name === 'string' && Array.isArray(p.phases) && p.phases.length > 0 &&
      p.phases.every(function (ph) { return typeof ph.label === 'string' && ph.secs > 0; });
  }

  // ---------- sound (only after a tap; iPhone needs the audio started inside a tap) ----------
  function unlockAudio() {
    try {
      // ask iOS to treat this as media playback, so the chime is less likely to be muted by the silent switch
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (e) {}
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }
  function chime(last) {
    if (!audio) return;
    try {
      var notes = last ? [880, 660, 990] : [660, 880];
      notes.forEach(function (f, i) {
        var t = audio.currentTime + i * 0.25;
        var o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.45, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g).connect(audio.destination);
        o.start(t); o.stop(t + 0.4);
      });
    } catch (e) {}
  }

  // ---------- timer (clock-based, so it stays right if the phone sleeps for a moment) ----------
  function loadPhase(i) {
    var p = preset();
    phaseIdx = i;
    total = left = p.phases[i].secs;
    render();
  }
  function tick() {
    if (!running) return;
    var p = preset();
    left = (endAt - Date.now()) / 1000;
    while (left <= 0 && running) {
      if (phaseIdx + 1 < p.phases.length) {
        chime(false);
        phaseIdx++;
        total = p.phases[phaseIdx].secs;
        endAt += total * 1000;
        left = (endAt - Date.now()) / 1000;
      } else {
        chime(true);
        left = 0;
        running = false;
        clearInterval(timer);
      }
    }
    render();
  }
  function start() {
    unlockAudio();
    if (left <= 0) loadPhase(0);
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

  function render() {
    var p = preset();
    if (!p) return;
    var ph = p.phases[phaseIdx], nxt = p.phases[phaseIdx + 1];
    $('pickName').textContent = p.name;
    $('rules').hidden = !rulesFor(p).length;
    $('steps').textContent = p.phases.length > 1 ? 'Phase ' + (phaseIdx + 1) + ' of ' + p.phases.length : '';
    $('phase').textContent = ph.label;
    $('digits').textContent = fmt(left);
    $('fill').style.transform = 'scaleX(' + (total ? Math.max(0, left) / total : 0) + ')';
    $('next').textContent = nxt ? 'Then: ' + nxt.label + ' (' + fmt(nxt.secs) + ')' : '';
    var st = $('stage');
    st.classList.toggle('warn', left > 0 && left <= Math.min(30, total * 0.2));
    st.classList.toggle('done', left <= 0);
    $('go').textContent = running ? 'Pause' : left <= 0 ? 'Restart' : left < total ? 'Resume' : 'Start';
    $('skip').disabled = p.phases.length < 2;
  }

  function choose(id) {
    pause();
    data.current = id;
    save();
    loadPhase(0);
  }

  // ---------- timer list ----------
  function summary(p) { return p.phases.map(function (ph) { return fmt(ph.secs); }).join(' → '); }
  function openList() {
    pause();
    $('cards').innerHTML = data.presets.map(function (p) {
      return '<div class="card' + (p.id === data.current ? ' on' : '') + '">' +
        '<button class="card-pick" data-pick="' + esc(p.id) + '"><b>' + esc(p.name) + '</b><span>' + summary(p) + '</span></button>' +
        '<button class="card-edit" data-edit="' + esc(p.id) + '" aria-label="Edit ' + esc(p.name) + '">Edit</button></div>';
    }).join('');
    disarm($('restore'), 'Restore starting timers');
    $('list').hidden = false;
  }
  function closeList() { $('list').hidden = true; }

  $('cards').addEventListener('click', function (e) {
    var pick = e.target.closest('[data-pick]'), edit = e.target.closest('[data-edit]');
    if (pick) { choose(pick.dataset.pick); closeList(); }
    else if (edit) openEditor(edit.dataset.edit);
  });

  // two-tap buttons for anything that throws work away
  function arm(btn, text) {
    if (btn.classList.contains('armed')) return true;
    btn.classList.add('armed');
    btn.textContent = text;
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { disarm(btn, btn.dataset.label); }, 3500);
    return false;
  }
  function disarm(btn, label) {
    btn.dataset.label = label;
    btn.classList.remove('armed');
    btn.textContent = label;
  }

  $('restore').addEventListener('click', function () {
    if (!arm(this, 'Tap again: undo all my changes')) return;
    data.presets = clone(starting.presets);
    data.current = starting.start;
    save();
    loadPhase(0);
    openList();
  });

  // ---------- editor ----------
  var draft = null, draftIsNew = false;

  function openEditor(id) {
    var p = data.presets.find(function (x) { return x.id === id; });
    draftIsNew = !p;
    draft = p ? clone(p) : { id: newId(), name: '', phases: [{ label: 'Talk!', secs: 60 }] };
    $('editTitle').textContent = draftIsNew ? 'New timer' : 'Edit timer';
    $('editName').value = draft.name;
    $('editRules').value = draft.rulesText || '';
    $('editDelete').hidden = draftIsNew || data.presets.length < 2;
    disarm($('editDelete'), 'Delete timer');
    renderPhases();
    $('editor').hidden = false;
  }
  function closeEditor() { $('editor').hidden = true; draft = null; }

  function renderPhases() {
    $('editPhases').innerHTML = draft.phases.map(function (ph, i) {
      return '<div class="ph" data-i="' + i + '">' +
        '<span class="num">' + (i + 1) + '</span>' +
        '<input data-label="' + i + '" value="' + esc(ph.label) + '" maxlength="60" aria-label="Phase ' + (i + 1) + ' words on screen" />' +
        '<span class="time">' +
          '<button class="step" data-add="-60">−1m</button><button class="step" data-add="-10">−10s</button>' +
          '<output>' + fmt(ph.secs) + '</output>' +
          '<button class="step" data-add="10">+10s</button><button class="step" data-add="60">+1m</button>' +
        '</span>' +
        (draft.phases.length > 1 ? '<button class="ph-remove" data-remove="' + i + '" aria-label="Remove phase ' + (i + 1) + '">✕</button>' : '') +
        '</div>';
    }).join('');
  }

  $('editPhases').addEventListener('input', function (e) {
    var i = e.target.dataset.label;
    if (i !== undefined) draft.phases[+i].label = e.target.value;
  });
  $('editPhases').addEventListener('click', function (e) {
    var row = e.target.closest('.ph');
    if (!row) return;
    var i = +row.dataset.i, add = e.target.closest('[data-add]'), rm = e.target.closest('[data-remove]');
    if (add) {
      var ph = draft.phases[i];
      ph.secs = Math.min(MAX_SECS, Math.max(5, ph.secs + Number(add.dataset.add)));
      row.querySelector('output').textContent = fmt(ph.secs);
    } else if (rm) {
      draft.phases.splice(i, 1);
      renderPhases();
    }
  });
  $('addPhase').addEventListener('click', function () {
    draft.phases.push({ label: 'Next phase', secs: 30 });
    renderPhases();
  });
  $('editCancel').addEventListener('click', closeEditor);
  function saveEdit() {
    draft.name = $('editName').value.trim() || 'My timer';
    draft.rulesText = $('editRules').value.trim();
    draft.phases.forEach(function (ph, k) { ph.label = ph.label.trim() || 'Phase ' + (k + 1); });
    var i = data.presets.findIndex(function (x) { return x.id === draft.id; });
    if (i >= 0) data.presets[i] = draft; else data.presets.push(draft);
    var id = draft.id;
    closeEditor();
    choose(id);
    openList();
  }
  $('editSave').addEventListener('click', saveEdit);
  $('editSave2').addEventListener('click', saveEdit);
  $('editDelete').addEventListener('click', function () {
    if (!arm(this, 'Tap again to delete')) return;
    var id = draft.id;
    data.presets = data.presets.filter(function (x) { return x.id !== id; });
    if (data.current === id) data.current = data.presets[0].id;
    save();
    closeEditor();
    loadPhase(0);
    openList();
  });
  $('add').addEventListener('click', function () { openEditor(null); });
  $('listDone').addEventListener('click', closeList);

  // ---------- main controls ----------
  $('pick').addEventListener('click', openList);
  $('rules').addEventListener('click', function () { KruIntro.show(rulesFor(preset()), { title: preset().name, done: 'Close' }); });
  $('go').addEventListener('click', function () { running ? pause() : start(); });
  $('reset').addEventListener('click', function () { pause(); loadPhase(0); });
  $('skip').addEventListener('click', function () {
    var p = preset(), wasRunning = running;
    pause();
    loadPhase(phaseIdx + 1 < p.phases.length ? phaseIdx + 1 : 0);
    if (wasRunning) start();
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || !$('list').hidden || !$('editor').hidden) return;
    if (e.code === 'Space') { e.preventDefault(); $('go').click(); }
    else if (e.key === 'r' || e.key === 'R') $('reset').click();
    else if (e.key === 'n' || e.key === 'N') $('skip').click();
  });
  // coming back to the app: catch the clock up straight away
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });

  // ---------- start up ----------
  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  Kru.ready(function (session) {
    contentReady.then(function (content) {
      starting = content;
      var saved = session.resume;
      if (saved && Array.isArray(saved.presets) && saved.presets.filter(valid).length) {
        // presets that became their own game (One-Word Story) leave the saved list too
        data = { v: 1, presets: saved.presets.filter(valid).filter(function (p) { return RETIRED.indexOf(p.id) < 0; }), current: saved.current };
        if (!data.presets.length) data.presets = clone(content.presets);
      } else {
        data = { v: 1, presets: clone(content.presets), current: content.start };
      }
      if (!preset()) data.current = data.presets[0].id;
      data.current = preset().id;
      loadPhase(0);
    }).catch(function () {
      $('pickName').textContent = 'Could not load the timers. Close and open Talk Timer again.';
    });
  });
})();
