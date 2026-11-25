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
  var NAMES = ['Giant sneaker', 'Flying pig buggy', 'Toilet racer', 'Biplane', 'Monster truck', 'Tuk-tuk', 'Tank', 'Rocket dragster', 'Giant snail'];
  var ART = [
    // 0 Giant sneaker
    function (c) { return wrap('<path d="M-4 44h12M-6 54h14M-2 64h10" stroke="#ffffff" stroke-opacity="0.7" fill="none"/><path d="M14 26L50 26L58 32Q92 34 112 46Q146 50 152 62L152 68L14 68Z" fill="' + c + '"/><path d="M26 26L44 12L54 26Z" fill="' + shade(c, -40) + '"/><path d="M20 52Q44 62 66 48" stroke="#fff" fill="none"/><path d="M60 48l10-10M76 50l10-10M92 54l10-10" stroke="#fff" fill="none"/><rect x="12" y="64" width="142" height="9" rx="4" fill="#f6f3ec"/>' + wheel(40, 78, 10) + wheel(126, 78, 10)); },
    // 1 Flying pig buggy
    function (c) { return wrap('<path d="M72 34Q58 6 36 14Q50 22 56 36Z" fill="#ffffff"/><path d="M84 34Q76 4 54 6Q68 16 70 36Z" fill="#ffffff"/><ellipse cx="80" cy="50" rx="40" ry="24" fill="' + c + '"/><path d="M42 46q-12-4-8-14q10 0 6 8q4 4-2 6" fill="none"/><circle cx="122" cy="44" r="17" fill="' + c + '"/><path d="M110 32L114 16L126 28Z" fill="' + shade(c, -35) + '"/><ellipse cx="136" cy="48" rx="9" ry="7" fill="' + shade(c, 30) + '"/><circle cx="133" cy="48" r="1.6" fill="#14202b"/><circle cx="139" cy="48" r="1.6" fill="#14202b"/><circle cx="124" cy="38" r="3" fill="#14202b"/><rect x="52" y="68" width="62" height="9" rx="4" fill="' + shade(c, -45) + '"/>' + wheel(64, 80, 9) + wheel(104, 80, 9)); },
    // 2 Toilet racer
    function (c) { return wrap('<rect x="18" y="12" width="34" height="38" rx="5" fill="#f6f3ec"/><path d="M26 18h14" /><rect x="34" y="52" width="62" height="16" rx="4" fill="#f6f3ec"/><path d="M40 42H122Q122 62 98 62H68Q40 62 40 42Z" fill="' + c + '"/><rect x="36" y="36" width="90" height="9" rx="4" fill="#f6f3ec"/>' + wheel(48, 78, 10) + wheel(108, 78, 10)); },
    // 3 Biplane
    function (c) { return wrap('<path d="M64 30V54M104 30V54" fill="none" stroke="#c9ced6" stroke-width="3"/><path d="M26 46L8 24L28 36Z" fill="' + shade(c, -40) + '"/><path d="M14 52L30 46L30 52Z" fill="' + shade(c, -40) + '"/><path d="M20 48Q20 38 36 38L122 40Q142 42 142 50Q142 60 122 60L36 60Q20 60 20 48Z" fill="' + c + '"/><circle cx="84" cy="38" r="8" fill="#f4c542"/><path d="M76 36Q84 28 92 36" fill="#6b4a2b"/><rect x="40" y="52" width="82" height="7" rx="3" fill="#e8ecf3"/><rect x="42" y="22" width="86" height="8" rx="4" fill="#e8ecf3"/><path d="M142 36L146 64" stroke="#8a8f99" stroke-width="4" fill="none"/><path d="M80 60L74 74M104 60L110 74" fill="none" stroke="#c9ced6" stroke-width="4"/>' + wheel(74, 78, 9) + wheel(110, 78, 9)); },
    // 4 Monster truck (skull, flames and a lightning bolt)
    function (c) { return wrap('<rect x="22" y="34" width="116" height="26" rx="8" fill="' + c + '"/><path d="M62 34L72 16L110 16L122 34Z" fill="' + shade(c, -30) + '"/><path d="M74 20L106 20L114 34L68 34Z" fill="' + GLASS + '"/><path d="M24 59Q28 47 34 55Q36 44 42 55Q46 49 50 59Z" fill="#ff8a1f" stroke-width="1.5"/><circle cx="44" cy="43" r="8" fill="#f6f3ec" stroke-width="1.5"/><rect x="39" y="48" width="10" height="5" rx="2" fill="#f6f3ec" stroke-width="1.5"/><circle cx="41" cy="43" r="2.2" fill="#14202b" stroke="none"/><circle cx="47" cy="43" r="2.2" fill="#14202b" stroke="none"/><path d="M42 50v3M46 50v3" stroke-width="1"/><path d="M130 37L120 51L127 51L122 60L136 45L129 45Z" fill="#ffe066" stroke-width="1.5"/><path d="M40 60L40 66M122 60L122 66" />' + wheel(40, 68, 20) + wheel(122, 68, 20)); },
    // 5 Tuk-tuk (Bangkok style: dark canopy, open back seat, yellow cab)
    function (c) { return wrap('<path d="M14 24V56M90 26V56" stroke="#c9ced6" stroke-width="3.5" fill="none"/><rect x="12" y="34" width="9" height="22" rx="3" fill="#5b3a1e"/><rect x="24" y="46" width="60" height="9" rx="2" fill="#b9c4e0" stroke-width="2"/><rect x="10" y="54" width="86" height="20" rx="3" fill="' + c + '"/><path d="M12 61h82" stroke="#ffe066" stroke-width="2.5" fill="none"/><path d="M96 58Q106 52 118 58L118 64L96 64Z" fill="#f4e842" stroke-width="2"/><path d="M112 56L124 28L136 28L141 56L148 60L148 74L112 74Z" fill="' + c + '"/><path d="M114 54L124 28L136 28L139 54Z" fill="#f4e842"/><path d="M126 32L134 32L136 46L122 46Z" fill="' + GLASS + '" stroke-width="2"/><circle cx="148" cy="62" r="4" fill="#ffe066" stroke-width="2"/><path d="M6 14Q70 8 140 22L138 30Q70 21 6 23Z" fill="#4b5578"/><path d="M124 22L126 14L134 14L135 24Z" fill="#f6f3ec" stroke-width="2"/><path d="M20 68Q36 50 52 68Z" fill="#c9ced6"/>' + wheel(36, 76, 13) + wheel(136, 78, 9)); },
    // 6 Tank
    function (c) { return wrap('<rect x="108" y="29" width="46" height="7" rx="3" fill="#5b6270"/><rect x="148" y="27" width="8" height="11" rx="2" fill="#5b6270"/><path d="M26 58L38 40L124 40L138 58Z" fill="' + c + '"/><path d="M60 40L68 24L104 24L112 40Z" fill="' + shade(c, -30) + '"/><path d="M84 44L86 49L92 49.5L87.5 53L89 58L84 55L79 58L80.5 53L76 49.5L82 49Z" fill="#fff" stroke-width="1.2"/><rect x="12" y="58" width="134" height="22" rx="11" fill="#3a3f4a"/><circle cx="30" cy="69" r="7" fill="#8a8f99" stroke-width="2"/><circle cx="56" cy="69" r="7" fill="#8a8f99" stroke-width="2"/><circle cx="82" cy="69" r="7" fill="#8a8f99" stroke-width="2"/><circle cx="108" cy="69" r="7" fill="#8a8f99" stroke-width="2"/><circle cx="130" cy="69" r="7" fill="#8a8f99" stroke-width="2"/>'); },
    // 7 Rocket dragster (flames shooting from the exhausts)
    function (c) { return wrap('<g transform="translate(20 4) scale(0.86)"><path d="M16 50Q-8 36 -14 48Q0 52 -12 56Q2 58 -10 64Q4 62 -6 70Q10 66 16 62Z" fill="#ff8a1f"/><path d="M16 53Q-2 46 -6 54Q4 56 -4 60Q8 60 16 58Z" fill="#ffe066" stroke-width="2"/><rect x="14" y="48" width="14" height="6" rx="2" fill="#8a8f99"/><rect x="14" y="58" width="14" height="6" rx="2" fill="#8a8f99"/><path d="M12 60L110 52Q150 54 156 62Q150 70 110 70L12 66Z" fill="' + c + '"/><path d="M22 58L32 38L46 56Z" fill="' + shade(c, -45) + '"/><circle cx="96" cy="52" r="8" fill="' + GLASS + '"/>' + wheel(34, 72, 10) + wheel(132, 72, 10) + '</g>'); },
    // 8 Giant snail
    function (c) { return wrap('<g transform="translate(-4 9) scale(0.9)"><path d="M140 60L146 36M152 62L162 38" fill="none" stroke="#cfd88a" stroke-width="5"/><circle cx="146" cy="34" r="4.5" fill="#fff"/><circle cx="162" cy="36" r="4.5" fill="#fff"/><path d="M16 74Q14 62 34 62L132 62Q156 62 152 74Q150 80 134 80L26 80Q16 80 16 74Z" fill="#cfd88a"/><circle cx="140" cy="68" r="12" fill="#cfd88a"/><circle cx="72" cy="42" r="28" fill="' + c + '"/><path d="M72 42m-17 0a17 17 0 1 1 17 17M72 42m-8 0a8 8 0 1 1 8 8" fill="none" stroke="' + shade(c, -55) + '"/><circle cx="72" cy="8" r="8" fill="#f4c542"/><path d="M64 5Q72 -3 80 5Z" fill="#d62f2f"/><path d="M72 16V20" /></g>'); },
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

  /** One pool of nine vehicles (Henry, Nov 25: no Typical / Wildcard choice). A single choice = every team draws from it, no pick screen. */
  var CHOICES = [{ id: 'all', label: 'All', sub: 'Every vehicle', pool: [0, 1, 2, 3, 4, 5, 6, 7, 8] }];
  window.KruRacing = { CHOICES: CHOICES, palette: COLORS, WHY: { skip: 'engine trouble and a pit stop', trap: 'a hidden road block' }, REVEAL: REVEAL, color: function (i) { return COLORS[((i % COLORS.length) + COLORS.length) % COLORS.length]; }, pool: NAMES.map(function (n, i) { return { name: n, color: COLORS[i % COLORS.length] }; }), PREFIX: '🏁 ', OVERTAKE: { title: 'OVERTAKE!', verb: 'blasts past' }, count: ART.length, name: name, vehicle: vehicle, overtake: overtake, shade: shade, POOLS: POOLS, ENC: ENC, CHANCE: CHANCE, SECRET: SECRET };
})();
