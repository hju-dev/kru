/* Quiz Grand Prix (the old Quiz Dash, Henry Nov 25): the racing theme. One vehicle per team, racing puns for the
   pop-ups, racing versions of the chance and secret cards (same effects as before), and the overtaking scene.
   Christmas Dash does not load this file. window.KruRacing = { count, name(i), vehicle(i, color), overtake(...), POOLS, CHANCE, SECRET }. */
(function () {
  'use strict';
  function shade(hex, amt) {
    var h = String(hex).replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  var INK = '#14202b', GLASS = '#cfe9ff';
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C']; // each ride has its own colour, so a team's colour = its ride's colour
  var REVEAL = { skin: 'garage', title: 'Meet your racers!', sign: 'GARAGE', labels: { open: 'Open the garage ▶', who: 'drives the', next: 'Next team ▶', start: 'Start the race ▶' } };
  function wheel(cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#1b1b1f" stroke="' + INK + '" stroke-width="2"/><circle cx="' + cx + '" cy="' + cy + '" r="' + Math.round(r * 0.45) + '" fill="#c9ced6"/>';
  }
  function wrap(inner) { return '<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' + inner + '</g></svg>'; }
  var NAMES = ['Formula racer', 'Sports car', 'Pickup truck', 'Motorbike', 'Monster truck', 'Tuk-tuk', 'Go-kart', 'Rocket dragster', 'Bus', 'Jeep'];
  var ART = [
    // 0 Formula racer
    function (c) { return wrap('<rect x="8" y="34" width="20" height="6" rx="2" fill="' + shade(c, -40) + '"/><path d="M16 40v22" /><path d="M16 66L40 54L64 50L82 42L106 42L114 52L140 56L156 68L150 72L16 72Z" fill="' + c + '"/><path d="M82 42L90 36L102 38L106 42Z" fill="' + GLASS + '"/><circle cx="94" cy="34" r="8" fill="#f4c542"/>' + wheel(40, 72, 14) + wheel(124, 72, 14)); },
    // 1 Sports car
    function (c) { return wrap('<path d="M10 64Q12 50 40 48L62 32Q70 28 96 30L120 48Q148 50 152 64L152 72L10 72Z" fill="' + c + '"/><path d="M68 35L94 34L110 47L58 47Z" fill="' + GLASS + '"/><path d="M12 58h14" stroke="#ffe066"/>' + wheel(42, 72, 13) + wheel(120, 72, 13)); },
    // 2 Pickup truck
    function (c) { return wrap('<rect x="10" y="46" width="62" height="26" rx="3" fill="' + shade(c, -35) + '"/><path d="M72 46L82 30L110 30L122 46L148 50L150 72L72 72Z" fill="' + c + '"/><path d="M86 34L106 34L114 46L80 46Z" fill="' + GLASS + '"/>' + wheel(36, 72, 14) + wheel(124, 72, 14)); },
    // 3 Motorbike
    function (c) { return wrap(wheel(36, 68, 17) + wheel(126, 68, 17) + '<path d="M36 68L66 50L98 50L126 68" fill="none"/><path d="M62 46Q80 34 100 46L92 54L68 54Z" fill="' + c + '"/><path d="M66 46L74 30L86 34L82 50Z" fill="' + shade(c, -45) + '"/><circle cx="76" cy="22" r="9" fill="' + c + '"/><path d="M98 46L112 36L118 40" fill="none"/>'); },
    // 4 Monster truck
    function (c) { return wrap('<rect x="22" y="34" width="116" height="26" rx="8" fill="' + c + '"/><path d="M62 34L72 16L110 16L122 34Z" fill="' + shade(c, -30) + '"/><path d="M74 20L106 20L114 34L68 34Z" fill="' + GLASS + '"/><path d="M40 60L40 66M122 60L122 66" />' + wheel(40, 68, 20) + wheel(122, 68, 20)); },
    // 5 Tuk-tuk
    function (c) { return wrap('<path d="M42 58Q42 40 62 40L108 40L122 58L122 72L42 72Z" fill="' + c + '"/><path d="M36 40Q80 10 126 40Z" fill="' + shade(c, -45) + '"/><path d="M60 44L104 44L112 56L58 56Z" fill="' + GLASS + '"/><circle cx="132" cy="62" r="4" fill="#ffe066"/>' + wheel(62, 72, 13) + wheel(130, 74, 10)); },
    // 6 Go-kart
    function (c) { return wrap('<rect x="30" y="52" width="100" height="16" rx="7" fill="' + c + '"/><rect x="128" y="56" width="14" height="10" rx="4" fill="' + shade(c, -40) + '"/><path d="M104 52L112 36" fill="none"/><circle cx="82" cy="38" r="10" fill="#f4c542"/><path d="M82 48L78 54" fill="none"/>' + wheel(46, 72, 11) + wheel(114, 72, 11)); },
    // 7 Rocket dragster
    function (c) { return wrap('<path d="M16 58L-2 62L16 68Z" fill="#ff8a1f"/><path d="M12 60L110 52Q150 54 156 62Q150 70 110 70L12 66Z" fill="' + c + '"/><path d="M22 58L32 38L46 56Z" fill="' + shade(c, -45) + '"/><circle cx="96" cy="52" r="8" fill="' + GLASS + '"/>' + wheel(34, 72, 10) + wheel(132, 72, 10)); },
    // 8 Bus
    function (c) { return wrap('<rect x="12" y="26" width="136" height="44" rx="10" fill="' + c + '"/><path d="M24 34h20v14H24zM50 34h20v14H50zM76 34h20v14H76zM102 34h20v14h-20z" fill="' + GLASS + '"/><path d="M126 34h14v36h-14z" fill="' + shade(c, -30) + '"/>' + wheel(44, 72, 12) + wheel(116, 72, 12)); },
    // 9 Jeep
    function (c) { return wrap('<path d="M22 56L26 40L56 40L66 26L112 26L118 40L142 42L146 72L22 72Z" fill="' + c + '"/><path d="M70 30L108 30L112 40L64 40Z" fill="' + GLASS + '"/><circle cx="16" cy="56" r="12" fill="#1b1b1f"/>' + wheel(52, 72, 13) + wheel(122, 72, 13)); },
  ];

  /** The vehicle of team number i (0-based) in the team's colour, as an SVG string. */
  function vehicle(i, color) { return ART[((i % ART.length) + ART.length) % ART.length](color || '#ffb703'); }
  function name(i) { return NAMES[((i % NAMES.length) + NAMES.length) % NAMES.length]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /** The overtaking scene for a banner: team A (index ia) blasts past team B (index ib). */
  function overtake(ia, ca, na, ib, cb, nb) {
    return '<div class="ovt"><i class="ovt-road"></i><i class="ovt-line"></i>' +
      '<div class="ovt-car b" style="--c:' + cb + '">' + vehicle(ib, cb) + '<em>' + esc(nb) + '</em></div>' +
      '<div class="ovt-car a" style="--c:' + ca + '">' + vehicle(ia, ca) + '<em>' + esc(na) + '</em></div>' +
      '<span class="ovt-wind"></span></div>';
  }

  // racing puns for the big pop-ups: [title, sub]; {t} = the team, {n} = squares, {place} = 1st / 2nd / 3rd / the race
  var POOLS = {
    right: [['PEDAL TO THE METAL!', '{t} floors it!'], ['VROOM VROOM!', '{t} hits the gas!'], ['GREEN LIGHT!', '{t} is off like a rocket!'], ['FULL THROTTLE!', 'Nothing can stop {t}!'],
      ['NITRO ON!', '{t} is burning rubber!'], ['LEFT IN THE DUST!', '{t} is racing ahead!'], ['TIRES SCREECHING!', '{t} takes the corner like a pro!'], ['ENGINES ROARING!', '{t} is on a roll!'],
      ['TURBO CHARGED!', 'Great driving, {t}!'], ['FAST AND FURIOUS!', '{t} knows the way!'], ['SHIFTING GEARS!', '{t} is in high gear!'], ['SMOOTH DRIVING!', '{t} owns the track!']],
    riskWin: [['NITRO RUSH!', '{t} rolls 2 GOLDEN DICE!'], ['ALL-IN OVERDRIVE!', '{t} rolls 2 GOLDEN DICE!'], ['RISK PAID OFF!', '{t} rolls 2 GOLDEN DICE!']],
    go: [['TURBO BOOST!', '{t}: forward {n}!'], ['NITRO STRIP!', '{t} rockets forward {n}!'], ['SPEED PAD!', '{t} zooms ahead {n}!'], ['SLIPSTREAM!', '{t} drafts forward {n}!'], ['GREEN FLAG ZONE!', '{t}: forward {n}!']],
    back: [['OIL SLICK!', '{t}: back {n}!'], ['FLAT TIRE!', '{t} drops back {n}!'], ['ROAD WORKS!', '{t} takes a detour back {n}!'], ['SPIN OUT!', '{t} spins back {n}!'], ['GRAVEL TRAP!', '{t} slides back {n}!']],
    again: [['ROLL AGAIN!', '{t} gets another roll!'], ['BONUS LAP!', '{t} rolls again!'], ['SECOND GEAR!', '{t} shifts up and rolls again!']],
    finish: [['FINISH LINE!', '{t} finishes {place}!'], ['CHECKERED FLAG!', '{t} finishes {place}!'], ['WHAT A RACE!', '{t} finishes {place}!']],
    shield: [['ROLL CAGE!', '{t} does not move back!'], ['AIRBAG!', '{t} stays on the track!']],
    skip: [['PIT STOP!', '{t} misses this turn: {why}. Your pit crew will have you roaring again soon!'], ['RED FLAG!', '{t} sits this one out: {why}. Back on the track next turn!'], ['TOWED TO THE PITS!', '{t} loses a turn: {why}. Hang in there, the race is long!']],
    bounce: [['EXACT FINISH!', '{t} overshot the finish and bounced back {n}. You must roll the exact number to cross the line!'], ['TOO FAST!', '{t} roared past the line and bounced back {n}. To win, roll the exact number!'], ['BRAKE, BRAKE!', '{t} overshot FINISH and rolls back {n}. Only an exact roll crosses the line!']],
    free: [['FREE LAP!', '{t} rolls for free!'], ['PIT CREW TO THE RESCUE!', '{t} rolls for free!']],
  };
  // wrong answers: INCORRECT plus an encouraging racing line
  var ENC = ['Just a flat tire! Fix it and roll on!', 'Pit stop time! You can still catch up!', 'Even Formula 1 drivers spin out!', 'Shake it off and keep racing!',
    'Check your mirrors: the race is far from over!', 'Time to refuel and try again!', 'A bumpy road, but the race is long!', 'Out of gas? Not for long!'];

  // chance cards: the same effects as before, told as a racing story ("then" is what happens)
  var CHANCE = {
    back2: ['FLAT TIRE!', 'A sharp stone cuts your tire! Limp back 2 squares.'],
    ahead3: ['SLIPSTREAM!', 'You catch the draft of the car in front! Zoom ahead 3 squares.'],
    ahead1: ['TAILWIND!', 'A little tailwind pushes you along. Move ahead 1 square.'],
    roll2: ['NITRO BOOST!', 'The crew bolts on a nitro boost! Roll 2 dice right now.'],
    again: ['GREEN LIGHT!', 'Green light all the way! Roll again.'],
    dbl: ['TWIN TURBO!', 'Twin turbo installed! Your next right answer rolls 2 dice.'],
    skip: ['PIT STOP!', 'Engine trouble! Your crew needs a pit stop: skip your next turn.'],
    mathsci: ['RACE ENGINEER!', 'Your race engineer calls on the radio: your next question is a math or science question.'],
    swap: ['OVERTAKE!', 'Time to overtake! Switch places with the team of your choice.'],
    shield: ['ROLL CAGE!', 'You fit a roll cage 🛡: your next wrong answer does not move you back.'],
    others: ['OIL SPILL!', 'Oil spill on the track! Every other team goes back 1 square.'],
    leap: ['HAIRPIN SHORTCUT!', 'You spot a shortcut through the hairpin! Jump just past the team in front of you.'],
  };
  var SECRET = {
    trap: ['🚧 Secret road block!', '{t} hits a hidden barrier and sits in the pits: skip the next turn.'],
    slide: ['🚀 Secret shortcut!', '{t} finds a hidden shortcut and zooms forward {n} squares!'],
    trapSq: '🚧', slideSq: '🚀',
  };

  window.KruRacing = { WHY: { skip: 'engine trouble and a pit stop', trap: 'a hidden road block' }, REVEAL: REVEAL, color: function (i) { return COLORS[((i % COLORS.length) + COLORS.length) % COLORS.length]; }, pool: NAMES.map(function (n, i) { return { name: n, color: COLORS[i % COLORS.length] }; }), PREFIX: '🏁 ', OVERTAKE: { title: 'OVERTAKE!', verb: 'blasts past' }, count: ART.length, name: name, vehicle: vehicle, overtake: overtake, shade: shade, POOLS: POOLS, ENC: ENC, CHANCE: CHANCE, SECRET: SECRET };
})();
