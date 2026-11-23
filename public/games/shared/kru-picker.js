/**
 * Kru team picker: a "Pick a team" button for the top bar. Tap it and the team names flash past,
 * slow down and land on one team (sound after the tap, as iOS needs). No team is picked twice
 * until every team has had a turn. The teacher's team is never picked.
 *
 *   KruPicker.setup({
 *     bar: barEl, beforeEl: moreButton,        // where the button goes
 *     teams: function () { return teams; },    // Kru.allTeams()
 *     get: function () { return S.picked; },   // ids already picked this round (saved by the game)
 *     set: function (ids) { S.picked = ids; save(); },
 *     onPick: function (team) {},              // optional
 *   })
 *   KruPicker.pick()                           // open it from code
 *   KruPicker.next(ids, allIds, random)        // pure: -> { id, picked } (for tests)
 *   KruPicker.member({ team, get, set, onDone }) // "Who answers?": one student of a team at random (see below)
 */
(function () {
  'use strict';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /** The next team: never one already picked; once all have had a turn, start a new round. */
  function next(picked, all, random) {
    random = random || Math.random;
    var done = (picked || []).filter(function (id) { return all.indexOf(id) >= 0; });
    var left = all.filter(function (id) { return done.indexOf(id) < 0; });
    if (!left.length) { done = []; left = all.slice(); }
    var id = left[Math.floor(random() * left.length)];
    return { id: id, picked: done.concat([id]) };
  }

  var cfg = null, audio = null, box = null, spinning = false;
  function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function tone(f, dur, vol) {
    if (!audio) return;
    try {
      var t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.05));
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.05) + 0.03);
    } catch (e) {}
  }
  function students() { return (cfg.teams() || []).filter(function (t) { return !t.teacher; }); }

  function close() { if (box) box.hidden = true; spinning = false; }
  function build() {
    box = document.createElement('div');
    box.className = 'kpk';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Pick a team');
    box.innerHTML = '<div class="kpk-card"><div class="kpk-label">Next up…</div>' +
      '<div class="kpk-name" aria-live="polite"></div><div class="kpk-members"></div><div class="kpk-left"></div>' +
      '<div class="kpk-btns"><button class="kpk-btn ghost" data-k="again">Pick again</button><button class="kpk-btn go" data-k="ok">OK, go!</button></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]');
      if (b && b.dataset.k === 'again' && !spinning) pick();
      else if (b && b.dataset.k === 'ok' && !spinning) close();
    });
  }

  function pick() {
    if (spinning) return;
    var list = students();
    if (!cfg || !list.length) return;
    unlock();
    if (!box) build();
    var ids = list.map(function (t) { return t.id; });
    var r = next(cfg.get ? cfg.get() : [], ids);
    if (cfg.set) cfg.set(r.picked);
    var team = list.filter(function (t) { return t.id === r.id; })[0];
    var name = box.querySelector('.kpk-name'), card = box.querySelector('.kpk-card');
    box.hidden = false;
    spinning = true;
    card.classList.remove('landed');
    box.querySelector('.kpk-members').textContent = '';
    box.querySelector('.kpk-left').textContent = '';
    box.querySelector('.kpk-btns').style.visibility = 'hidden';
    var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var k = 0, steps = calm ? 0 : 16 + Math.floor(Math.random() * 6);
    (function step() {
      if (box.hidden) return;
      if (k < steps) {
        var t = list[(k + Math.floor(Math.random() * list.length)) % list.length];
        name.textContent = t.name;
        name.style.color = COLORS[list.indexOf(t) % COLORS.length];
        tone(420 + (k % 4) * 70);
        k++;
        setTimeout(step, 40 + k * k * 0.6); // slows down like a wheel (about 2.5 s)
        return;
      }
      spinning = false;
      name.textContent = team.name;
      name.style.color = COLORS[list.indexOf(team) % COLORS.length];
      card.classList.add('landed');
      box.querySelector('.kpk-members').textContent = (team.members || []).map(function (m) { return m.nick; }).join(', ');
      var left = ids.length - r.picked.length;
      box.querySelector('.kpk-left').textContent = left ? left + ' team' + (left > 1 ? 's' : '') + ' still to go' : 'Every team has had a turn';
      box.querySelector('.kpk-btns').style.visibility = '';
      tone(784, 0.18, 0.3); setTimeout(function () { tone(1047, 0.3, 0.3); }, 120);
      if (cfg.onPick) cfg.onPick(team);
    })();
  }

  // ---------- "Who answers?": one student of a team, at random ----------
  // KruPicker.member({ team, get: function () { return ids; }, set: function (ids) {}, onDone: function (student) {} })
  // Spins through the team's students and lands on one; nobody twice until the whole team has answered (the team's list
  // of picked ids is kept by the game). OK, go! calls onDone(student). A team with no students calls onDone(null).
  function mid(m) { return String(m.id != null ? m.id : m.no); }
  var mbox = null, mcur = null, mspin = false;
  function member(o) {
    var list = (o.team && o.team.members) || [];
    if (!list.length) { if (o.onDone) o.onDone(null); return; }
    mcur = o;
    unlock();
    if (!mbox) {
      mbox = document.createElement('div');
      mbox.className = 'kpk';
      mbox.hidden = true;
      mbox.setAttribute('role', 'dialog');
      mbox.setAttribute('aria-label', 'Who answers?');
      mbox.innerHTML = '<div class="kpk-card"><div class="kpk-label"></div><div class="kpk-name" aria-live="polite"></div><div class="kpk-members"></div>' +
        '<div class="kpk-left"></div><div class="kpk-btns"><button class="kpk-btn ghost" data-k="again">Pick again</button><button class="kpk-btn go" data-k="ok">OK, go!</button></div></div>';
      document.body.appendChild(mbox);
      mbox.addEventListener('click', function (e) {
        var b = e.target.closest('[data-k]');
        if (!b || mspin) return;
        if (b.dataset.k === 'again') memberSpin();
        else { mbox.hidden = true; var o2 = mcur, st = mbox._who; if (o2 && o2.onDone) o2.onDone(st); }
      });
    }
    memberSpin();
  }
  function memberSpin() {
    var o = mcur, list = o.team.members, ids = list.map(mid);
    var r = next(o.get ? o.get() : [], ids);
    if (o.set) o.set(r.picked);
    var who = list.filter(function (m) { return mid(m) === r.id; })[0];
    mbox._who = who;
    var name = mbox.querySelector('.kpk-name'), card = mbox.querySelector('.kpk-card');
    mbox.hidden = false;
    mspin = true;
    card.classList.remove('landed');
    mbox.querySelector('.kpk-label').textContent = o.team.name + ': who answers?';
    mbox.querySelector('.kpk-members').textContent = '';
    mbox.querySelector('.kpk-left').textContent = '';
    mbox.querySelector('.kpk-btns').style.visibility = 'hidden';
    var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var k = 0, steps = calm ? 0 : 14 + Math.floor(Math.random() * 6);
    (function step() {
      if (mbox.hidden) return;
      if (k < steps) {
        var m = list[(k + Math.floor(Math.random() * list.length)) % list.length];
        name.textContent = m.nick;
        name.style.color = COLORS[list.indexOf(m) % COLORS.length];
        tone(420 + (k % 4) * 70);
        k++;
        setTimeout(step, 40 + k * k * 0.6);
        return;
      }
      mspin = false;
      name.textContent = who.nick;
      name.style.color = COLORS[list.indexOf(who) % COLORS.length];
      card.classList.add('landed');
      var left = ids.length - r.picked.length;
      mbox.querySelector('.kpk-left').textContent = left ? left + ' still to go in this team' : 'Everyone in this team has answered';
      mbox.querySelector('.kpk-btns').style.visibility = '';
      tone(784, 0.18, 0.3); setTimeout(function () { tone(1047, 0.3, 0.3); }, 120);
    })();
  }

  function setup(c) {
    cfg = c;
    if (!c.bar || document.getElementById('kpkOpen')) return;
    var b = document.createElement('button');
    b.className = 'small kpk-open';
    b.id = 'kpkOpen';
    b.type = 'button';
    b.innerHTML = '<span aria-hidden="true">🎯</span> ' + (c.label || 'Pick a team');
    c.bar.insertBefore(b, c.beforeEl || null);
    b.addEventListener('click', pick);
  }

  window.KruPicker = { setup: setup, pick: pick, member: member, next: next, esc: esc };
})();
