/**
 * North Pole Grand Prix: Challenge and Forfeit screens (Henry, Nov 26).
 *
 *   XmasStage.run({ kind: 'challenge' | 'forfeit', card: { title, text }, team, color, badge, picked, refuse, done })
 *
 * 1. The card: title, what to do, "🎅 Santa picks a student" (a random student from the team, a jingle spin, no repeats
 *    until the whole team had a go: `picked` = the list of ids already picked, changed in place) and "OK ▶"
 *    (a forfeit says "✅ Take Forfeit" and also offers "Refuse: roll the back dice" = refuse()).
 * 2. A flash, then a themed screen that fits the card (orchestra stage, snowy night, ice rink, workshop, rooftop, gym...),
 *    with floating pictures, the picked student, a timer Henry starts himself when the card names a time ("10 seconds"),
 *    and "✅ Challenge complete" / "✅ Forfeit done" = done().
 * Reduce Motion: no movement (the screens still change).
 */
(function () {
  'use strict';
  // scene backgrounds (CSS .xs-<scene> in christmas.css) + floating pictures per card title
  var CARDS = {
    'Frozen Snowman': ['snow', '⛄❄️🧊✨'], 'Reindeer Antlers': ['snow', '🦌🔔⭐✨'], 'Penguin Party': ['ice', '🐧🐧❄️🎉'],
    'Robot Dance': ['party', '🤖⚙️🔩💡'], 'Giant Present': ['gifts', '🎁🎀✨🎁'], "Santa's Laugh": ['workshop', '🎅😂🔔✨'],
    'The Invisible Orchestra': ['stage', '🎻🎺🥁🎵🎶'], 'Christmas Tree': ['snow', '🎄⭐🎁✨'], 'Slow-Motion Celebration': ['party', '💰🎉🏆✨'],
    'Hot Chocolate Disaster': ['cocoa', '☕🔥🍫💨'], 'Animal Kingdom': ['jungle', '🦁🐘🐒🦜'], 'Ice Skating': ['ice', '⛸️❄️✨⛸️'],
    'Jazz Hands': ['stage', '🙌✨🎷🎶'], 'The Wave': ['stage', '🌊🙋👋🌊'], 'Christmas Sound Effects': ['workshop', '🔔🦌🎅🔊'],
    'Stuck in the Chimney': ['rooftop', '🎅🏠🌙⭐'], 'Snowball Fight': ['snow', '⚪❄️☃️⚪'], 'Superhero Landing': ['city', '🦸💥⚡✨'],
    'Sleigh Pullers': ['snow', '🛷🦌💨🎁'], 'Elf Workshop': ['workshop', '🔨🧸🎁🪀'],
    'Sleepy Santa': ['bedroom', '🎅😴💤🌙'], 'The Royal Bow': ['royal', '👑🙇✨💎'], 'Frozen!': ['snow', '🧊❄️⛄✨'],
    'Animal Impression': ['jungle', '🐶🐱🐮🐸'], 'Tiny Mouse': ['workshop', '🐭🧀🎄✨'], 'Air Guitar': ['party', '🎸🤘⚡🎶'],
    'Cookie Monster': ['cocoa', '🍪🥛😋🍪'], 'Funny Face': ['party', '🤪😜😝🤡'], 'Snow Angel': ['snow', '👼❄️✨⭐'],
    'Christmas Dance': ['party', '💃🕺🎶✨'], 'Monster Voice': ['bedroom', '👹🎁❓👻'], 'Christmas Morning': ['gifts', '🎁🎄🌅🧦'],
    'Reindeer Jumps': ['gym', '🦌💪⬆️✨'], 'Santa Squats': ['gym', '🎅💪⬇️✨'], 'Elf Balance': ['gym', '🧝⚖️✨🦶'],
    'Late for the Sleigh': ['gym', '🏃🛷⏰💨'], 'Snowman Plank': ['gym', '⛄💪⏱️✨'], 'Touch the Snow': ['gym', '❄️🙆✨⬆️'],
    'Rudolph Hops': ['gym', '🦌🐾✨🔴'],
  };
  var box = null, timer = 0, audio = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function reduced() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function tone(freqs, gap, dur, vol, type) {
    if (!audio) return;
    try {
      freqs.forEach(function (f, i) {
        var t = audio.currentTime + i * (gap || 0.1), o = audio.createOscillator(), g = audio.createGain();
        o.type = type || 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.2));
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.2) + 0.05);
      });
    } catch (e) {}
  }
  /** "for 10 seconds" -> 10; no time on the card -> 0 (no timer). */
  function secsOf(text) { var m = /(\d+)\s*seconds?/i.exec(text || ''); return m ? Number(m[1]) : 0; }
  function sceneOf(card, kind) {
    var c = CARDS[card.title];
    return c ? { scene: c[0], icons: pics(c[1]) } : { scene: kind === 'forfeit' ? 'gym' : 'snow', icons: pics('🎄🎁✨⭐') };
  }
  /** Split a string of emoji into pictures (keeps ⚙️ / ⛸️ in one piece). */
  function pics(str) {
    return str.match(/\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*/gu) || [];
  }
  function floaters(icons) {
    if (reduced()) return '';
    var h = '';
    for (var i = 0; i < 14; i++) {
      h += '<i style="left:' + ((i * 37) % 100) + '%;--d:' + (5 + (i % 5)) + 's;--t:-' + (i * 0.7).toFixed(1) + 's;--s:' + (26 + (i % 4) * 8) + 'px">' + icons[i % icons.length] + '</i>';
    }
    return '<div class="xs-float" aria-hidden="true">' + h + '</div>';
  }
  function close() { clearInterval(timer); if (box) { box.remove(); box = null; } }

  function run(o) {
    unlock(); close();
    var kind = o.kind || 'challenge', card = o.card, team = o.team || { members: [] }, sc = sceneOf(card, kind);
    var secs = secsOf(card.text), who = '', label = kind === 'forfeit' ? '🎭 FORFEIT' : '🎄 CHALLENGE';
    box = document.createElement('div');
    box.className = 'xstage xs-' + sc.scene + ' xs-' + kind;
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', label + ': ' + card.title);
    document.body.appendChild(box);
    var q = function (s) { return box.querySelector(s); };

    // ---------- 1. the card ----------
    function cardView() {
      box.classList.remove('live');
      box.innerHTML = '<div class="xs-card"><div class="xs-top"><span class="xs-kind">' + label + '</span>' + (o.badge || '') + '<span class="xs-team">' + esc(team.name || '') + '</span></div>' +
        '<div class="xs-title">' + esc(card.title) + '</div><div class="xs-text">' + esc(card.text) + '</div>' +
        '<div class="xs-who" aria-live="polite">' + (who ? '⭐ ' + esc(who) + ' ⭐' : '') + '</div>' +
        '<div class="xs-btns">' + ((team.members || []).length ? '<button class="xs-btn pick" data-x="pick">🎅 Santa picks a student</button>' : '') +
        (kind === 'forfeit' ? '<button class="xs-btn ghost" data-x="refuse">Refuse: roll the back dice</button><button class="xs-btn go" data-x="go">✅ Take Forfeit</button>'
          : '<button class="xs-btn go" data-x="go">OK ▶</button>') + '</div></div>';
    }
    // a jingle spin through the team's names; no repeats until the whole team had a go
    function pick() {
      var ms = team.members || [], ids = ms.map(function (m) { return String(m.key || m.no); });
      var used = o.picked || [], left = ids.filter(function (x) { return used.indexOf(x) < 0; });
      if (!left.length) { used.length = 0; left = ids.slice(); }
      var win = left[Math.floor(Math.random() * left.length)], m = ms[ids.indexOf(win)];
      used.push(win);
      var el = q('.xs-who'), n = 0, steps = reduced() ? 0 : 14, b = q('[data-x="pick"]');
      if (b) b.disabled = true;
      var step = function () {
        if (!box) return;
        if (n >= steps) {
          who = m.nick; el.textContent = '⭐ ' + who + ' ⭐'; el.classList.add('land');
          tone([784, 988, 1175, 1568], 0.07, 0.3, 0.3, 'sine'); if (b) b.disabled = false; return;
        }
        el.classList.remove('land'); el.textContent = '🎁 ' + ms[Math.floor(Math.random() * ms.length)].nick + ' 🎁';
        tone([1200 + (n % 2) * 300], 0, 0.05, 0.12, 'sine');
        n++; setTimeout(step, 40 + n * n);
      };
      step();
    }

    // ---------- 2. the themed screen ----------
    var left = secs, running = false, endAt = 0;
    function sceneView() {
      box.innerHTML = '<div class="xs-flash"></div>' + floaters(sc.icons) +
        '<div class="xs-live"><div class="xs-top"><span class="xs-kind">' + label + '</span>' + (o.badge || '') + '<span class="xs-team">' + esc(team.name || '') + '</span></div>' +
        '<div class="xs-title big">' + esc(card.title) + '</div>' + (who ? '<div class="xs-who on">⭐ ' + esc(who) + ' ⭐</div>' : '') +
        '<div class="xs-text">' + esc(card.text) + '</div>' +
        '<div class="xs-btns">' + (secs ? '<span class="xs-clock" aria-live="off">' + fmt(left) + '</span><button class="xs-btn" data-x="time">▶ Start ' + secs + ' s</button>' : '') +
        '<button class="xs-btn go" data-x="done">✅ ' + (kind === 'forfeit' ? 'Forfeit done: stay put' : 'Challenge complete') + '</button></div></div>';
      box.classList.add('live');
      tone(kind === 'forfeit' ? [392, 523, 659] : [523, 659, 784, 1047], 0.08, 0.3, 0.3);
    }
    function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
    function paint() { var c = q('.xs-clock'); if (c) { c.textContent = fmt(left); c.classList.toggle('hot', running && left <= 3); } var b = q('[data-x="time"]'); if (b) b.textContent = running ? '|| Pause' : left <= 0 ? '↻ Again' : left < secs ? '▶ Go on' : '▶ Start ' + secs + ' s'; }
    function tick() {
      var was = Math.ceil(left);
      left = (endAt - Date.now()) / 1000;
      if (left <= 0) { left = 0; running = false; clearInterval(timer); tone([880, 660, 880, 1175], 0.15, 0.3, 0.35); box && box.classList.add('times-up'); }
      else if (Math.ceil(left) !== was) tone([660], 0, 0.06, 0.15);
      paint();
    }
    function toggleTime() {
      if (running) { running = false; clearInterval(timer); left = Math.max(0, (endAt - Date.now()) / 1000); paint(); return; }
      if (left <= 0) left = secs;
      box.classList.remove('times-up');
      running = true; endAt = Date.now() + left * 1000; clearInterval(timer); timer = setInterval(tick, 100); paint();
    }

    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-x]');
      if (!b || b.disabled) return;
      unlock();
      var x = b.dataset.x;
      if (x === 'pick') pick();
      else if (x === 'go') sceneView();
      else if (x === 'time') toggleTime();
      else if (x === 'refuse') { close(); if (o.refuse) o.refuse(); }
      else if (x === 'done') { close(); if (o.done) o.done(who); }
    });
    cardView();
  }

  window.XmasStage = { run: run, close: close, secsOf: secsOf, CARDS: CARDS };
})();
