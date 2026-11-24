/* North Pole Grand Prix (the old Christmas Dash, Henry Nov 25): the winter version of the racing theme. It gives
   Race Board's code (race-board/app.js) the same API as race-board/racing.js, so both games play the same:
   ten winter rides (one per team, in the team's colour), Christmas puns for the pop-ups, Christmas versions of the
   12 chance cards and the two secret squares (same effects), and the overtaking scene on a snowy road.
   window.KruRacing = { count, name(i), vehicle(i, color), overtake(...), POOLS, ENC, CHANCE, SECRET, PREFIX, OVERTAKE }. */
(function () {
  'use strict';
  function shade(hex, amt) {
    var h = String(hex).replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  var COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C']; // each ride has its own colour, so a team's colour = its ride's colour
  var REVEAL = { skin: 'workshop', title: 'Meet your rides!', sign: "SANTA'S WORKSHOP", labels: { open: 'Open the workshop ▶', who: 'gets', next: 'Next team ▶', start: 'Start the race ▶' } };
  var INK = '#1b2a3a', WOOD = '#8b5a2b', GOLD = '#e0b13c', SNOW = '#f7fbff', SKIN = '#ffd6b8', GLASS = '#cfe9ff';
  function wrap(inner) { return '<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' + inner + '</g></svg>'; }
  function wheel(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#2a2a32"/><circle cx="' + cx + '" cy="' + cy + '" r="' + Math.round(r * 0.45) + '" fill="#d8dde6" stroke-width="2"/>'; }
  var NAMES = ["Santa's sleigh", 'Reindeer sled', 'Snowmobile', 'Gingerbread van', 'Snowman on skis', 'Penguin toboggan', 'Elf skateboard', 'Polar bear sled', 'Toy train', 'Cocoa mug truck'];
  var ART = [
    // 0 Santa's sleigh
    function (c) { return wrap('<path d="M16 76L132 76Q152 76 150 58" fill="none" stroke="' + GOLD + '" stroke-width="5"/><path d="M44 66V76M112 66V76" fill="none"/><path d="M22 50L122 50Q134 50 136 36L150 36Q152 58 132 67L36 67Q20 65 22 50Z" fill="' + c + '"/><circle cx="104" cy="38" r="13" fill="' + WOOD + '"/><circle cx="76" cy="34" r="9" fill="' + SKIN + '"/><path d="M66 30Q76 8 90 28Z" fill="#e63946"/><circle cx="90" cy="28" r="4" fill="' + SNOW + '" stroke-width="2"/><path d="M68 38Q76 54 84 38Z" fill="' + SNOW + '" stroke-width="2"/>'); },
    // 1 Reindeer sled
    function (c) { return wrap('<path d="M14 76L102 76Q114 76 110 66" fill="none" stroke="' + GOLD + '" stroke-width="5"/><path d="M26 58L96 58L102 70L22 70Z" fill="' + c + '"/><path d="M96 60L112 54" fill="none"/><ellipse cx="128" cy="52" rx="16" ry="10" fill="#a0643a"/><path d="M118 60V72M138 60V72" fill="none"/><circle cx="146" cy="40" r="8" fill="#a0643a"/><circle cx="152" cy="42" r="3.5" fill="#e63946" stroke-width="2"/><path d="M142 33L136 20L142 24L146 14M148 33L152 20L158 22" fill="none" stroke-width="2.5"/>'); },
    // 2 Snowmobile
    function (c) { return wrap('<rect x="20" y="62" width="62" height="14" rx="7" fill="#2b2b30"/><path d="M92 72Q130 76 150 64" fill="none" stroke="' + GOLD + '" stroke-width="5"/><path d="M30 56Q34 40 56 40L88 40L108 50L136 52L140 64L30 64Z" fill="' + c + '"/><path d="M90 40L100 28L112 50Z" fill="' + GLASS + '"/><circle cx="66" cy="26" r="8" fill="' + SNOW + '"/><path d="M60 36L58 46L76 44L72 34Z" fill="#2f9e5a"/>'); },
    // 3 Gingerbread van
    function (c) { return wrap('<path d="M14 56Q16 40 36 40L100 40L120 56L146 58L148 72L14 72Z" fill="#b8743a"/><path d="M36 40L100 40L108 48L28 48Z" fill="' + c + '"/><path d="M40 52h20v10H40zM66 52h20v10H66z" fill="' + GLASS + '" stroke-width="2"/><path d="M16 66q6 6 12 0t12 0 12 0 12 0 12 0 12 0 12 0 12 0" fill="none" stroke="' + SNOW + '" stroke-width="3"/><circle cx="108" cy="62" r="4" fill="#e63946" stroke-width="2"/>' + wheel(42, 74, 12) + wheel(122, 74, 12)); },
    // 4 Snowman on skis
    function (c) { return wrap('<path d="M10 78L150 78" fill="none" stroke="' + WOOD + '" stroke-width="7"/><circle cx="78" cy="58" r="17" fill="' + SNOW + '"/><circle cx="78" cy="32" r="12" fill="' + SNOW + '"/><path d="M66 24h24M70 24V10h16v14" fill="#2a2a32"/><path d="M66 40q12 8 24 0" fill="none" stroke="' + c + '" stroke-width="6"/><path d="M80 32l16 3-16 3z" fill="#ff8a1f" stroke-width="2"/><path d="M62 54L36 44M94 54L120 66M120 66L124 80" fill="none" stroke="' + WOOD + '" stroke-width="3"/>'); },
    // 5 Penguin toboggan
    function (c) { return wrap('<path d="M16 76L136 76Q152 76 150 54" fill="none" stroke="' + GOLD + '" stroke-width="5"/><path d="M22 62L132 62L140 52L148 54Q148 70 132 70L26 70Z" fill="' + c + '"/><ellipse cx="82" cy="44" rx="14" ry="19" fill="#1d2330"/><ellipse cx="85" cy="48" rx="8" ry="13" fill="' + SNOW + '" stroke-width="2"/><path d="M94 32l12 4-12 4z" fill="#ff8a1f" stroke-width="2"/><path d="M70 28q12 8 24 0" fill="none" stroke="' + c + '" stroke-width="5"/><path d="M76 62l-4 6M92 62l4 6" stroke="#ff8a1f"/>'); },
    // 6 Elf on a skateboard
    function (c) { return wrap('<rect x="30" y="68" width="100" height="8" rx="4" fill="' + c + '"/>' + wheel(46, 80, 6) + wheel(114, 80, 6) + '<path d="M70 66L76 46L92 46L98 66" fill="#2f9e5a"/><path d="M68 66h8M96 66h8" /><circle cx="84" cy="34" r="9" fill="' + SKIN + '"/><path d="M74 30L88 6L96 30Z" fill="#2f9e5a"/><circle cx="88" cy="6" r="4" fill="' + GOLD + '" stroke-width="2"/><path d="M74 50L58 56M94 50L112 44" fill="none"/>'); },
    // 7 Polar bear sled
    function (c) { return wrap('<path d="M14 78L126 78Q142 78 140 66" fill="none" stroke="' + GOLD + '" stroke-width="5"/><path d="M26 62L132 62L138 74L22 74Z" fill="' + c + '"/><ellipse cx="86" cy="48" rx="26" ry="15" fill="' + SNOW + '"/><circle cx="116" cy="40" r="11" fill="' + SNOW + '"/><circle cx="108" cy="30" r="4" fill="' + SNOW + '" stroke-width="2"/><circle cx="124" cy="31" r="4" fill="' + SNOW + '" stroke-width="2"/><circle cx="124" cy="43" r="3.5" fill="#1d2330"/><path d="M72 62v-8M98 62v-8" /><path d="M112 52q8 6 16 0" fill="none" stroke="' + c + '" stroke-width="5"/>'); },
    // 8 Toy train
    function (c) { return wrap('<rect x="12" y="44" width="56" height="24" rx="5" fill="' + shade(c, -30) + '"/><rect x="26" y="30" width="22" height="16" rx="3" fill="#e63946"/><path d="M26 38h22M37 30v16" stroke="' + SNOW + '" stroke-width="2.5"/><path d="M68 56h14" fill="none"/><rect x="82" y="40" width="60" height="28" rx="6" fill="' + c + '"/><rect x="82" y="30" width="26" height="14" rx="3" fill="' + c + '"/><rect x="124" y="24" width="12" height="16" rx="2" fill="#2a2a32"/><circle cx="130" cy="16" r="5" fill="' + SNOW + '" stroke-width="2"/><rect x="88" y="33" width="14" height="8" fill="' + GLASS + '" stroke-width="2"/>' + wheel(28, 72, 8) + wheel(54, 72, 8) + wheel(98, 72, 9) + wheel(128, 72, 9)); },
    // 9 Cocoa mug truck
    function (c) { return wrap('<path d="M40 38L112 38L106 70L46 70Z" fill="' + c + '"/><path d="M112 46Q138 46 130 62L108 62" fill="none" stroke-width="5"/><path d="M46 46h60" stroke="' + SNOW + '" stroke-width="3" fill="none"/><circle cx="58" cy="34" r="7" fill="' + SNOW + '"/><circle cx="76" cy="31" r="8" fill="' + SNOW + '"/><circle cx="94" cy="34" r="7" fill="' + SNOW + '"/><path d="M70 22q-4-6 0-12M84 22q-4-6 0-12" fill="none" stroke="#c9ced6" stroke-width="2.5"/>' + wheel(58, 74, 11) + wheel(100, 74, 11)); },
  ];
  function vehicle(i, color) { return ART[((i % ART.length) + ART.length) % ART.length](color || '#ffb703'); }
  function name(i) { return NAMES[((i % NAMES.length) + NAMES.length) % NAMES.length]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /** The overtaking scene: team A's ride swooshes past team B's on a snowy road. */
  function overtake(ia, ca, na, ib, cb, nb) {
    return '<div class="ovt xmas"><i class="ovt-road"></i><i class="ovt-line"></i>' +
      '<div class="ovt-car b" style="--c:' + cb + '">' + vehicle(ib, cb) + '<em>' + esc(nb) + '</em></div>' +
      '<div class="ovt-car a" style="--c:' + ca + '">' + vehicle(ia, ca) + '<em>' + esc(na) + '</em></div>' +
      '<span class="ovt-wind"></span></div>';
  }

  var POOLS = {
    right: [['HO HO HO!', '{t} got it right!'], ['SANTA APPROVES!', '{t} is on the nice list!'], ['MERRY MAGIC!', 'Great answer, {t}!'], ['JOLLY GOOD!', '{t} knows their stuff!'],
      ['SLEIGH-TASTIC!', '{t} zooms ahead!'], ['WONDERFUL!', 'The elves cheer for {t}!'], ['GOLD STAR!', '{t} earns a Christmas star!'], ['FA LA LA LA!', 'Perfect, {t}!'],
      ['DING DING DING!', 'Bells ring for {t}!'], ['MERRY CORRECT!', 'Santa is proud of {t}!'], ['JINGLE ALL THE WAY!', '{t} is on a roll!'], ['REINDEER POWER!', '{t} flies down the track!']],
    riskWin: [['CHRISTMAS MIRACLE!', '{t} rolls 2 GOLDEN DICE!'], ['NORTH POLE JACKPOT!', '{t} rolls 2 GOLDEN DICE!'], ['SANTA SAYS YES!', '{t} rolls 2 GOLDEN DICE!']],
    go: [['SLEIGH RIDE!', '{t}: forward {n}!'], ['REINDEER BOOST!', '{t} zooms forward {n}!'], ['JINGLE SPEED!', '{t} jingles ahead {n}!'], ['SNOWY SLOPE!', '{t} slides forward {n}!'], ['CANDY CANE EXPRESS!', '{t}: forward {n}!']],
    back: [['SLIPPED ON THE ICE!', '{t}: back {n}!'], ['SNOWDRIFT!', '{t} gets stuck back {n}!'], ['BLIZZARD!', '{t} is blown back {n}!'], ['LUMP OF COAL!', '{t} drops back {n}!'], ['FROZEN PUDDLE!', '{t} skids back {n}!']],
    again: [['ROLL AGAIN!', '{t} gets another roll!'], ['SANTA SAYS GO!', '{t} rolls again!'], ['TWINKLE TWICE!', '{t} gets another roll!']],
    finish: [['HOME FOR CHRISTMAS!', '{t} finishes {place}!'], ['NORTH POLE REACHED!', '{t} finishes {place}!'], ['WRAPPED UP!', '{t} finishes {place}!']],
    shield: [['SNOW SHIELD!', '{t} does not move back!'], ['SNOWMAN GUARD!', '{t} stays on the track!']],
    free: [['FREE GIFT!', '{t} rolls for free!'], ['ELF TO THE RESCUE!', '{t} rolls for free!']],
  };
  var ENC = ['Santa still believes in you!', 'Keep your Christmas spirit up!', 'Good try! The elves are cheering!', 'Even Rudolph gets lost sometimes!',
    'Shake it off, team! Next time!', 'Keep going! The magic is coming!', "Great effort! Don't give up!", 'Santa says: try again next turn!'];

  var CHANCE = {
    back2: ['SNOWDRIFT!', 'A big snowdrift blocks the path! Slide back 2 squares.'],
    ahead3: ['REINDEER BURST!', 'The reindeer find a burst of speed! Zoom ahead 3 squares.'],
    ahead1: ['JINGLE TAILWIND!', 'A friendly breeze blows you along. Move ahead 1 square.'],
    roll2: ['DOUBLE JINGLE!', 'Santa rings the bells twice! Roll 2 dice right now.'],
    again: ['SANTA SAYS GO!', 'The elves wave you on! Roll again.'],
    dbl: ['MAGIC DUST!', 'Sprinkled with sleigh dust! Your next right answer rolls 2 dice.'],
    skip: ['HOT COCOA BREAK!', 'Time for a cocoa break by the fire: skip your next turn.'],
    mathsci: ['ELF HOMEWORK!', 'An elf hands you a puzzle: your next question is a math or science question.'],
    swap: ['SLEIGH SWITCH!', 'Time to overtake! Switch places with the team of your choice.'],
    shield: ['SNOW SHIELD!', 'A friendly snowman guards you 🛡: your next wrong answer does not move you back.'],
    others: ['SNOWBALL FIGHT!', 'A giant snowball fight breaks out! Every other team goes back 1 square.'],
    leap: ['CHIMNEY SHORTCUT!', 'You zoom down a secret chimney shortcut! Jump just past the team in front of you.'],
  };
  var SECRET = {
    trap: ['🧊 Secret snow trap!', '{t} gets stuck in a snowbank: skip the next turn.'],
    slide: ['🛷 Secret ski slope!', '{t} finds a secret ski slope and zooms forward {n} squares!'],
    trapSq: '🧊', slideSq: '🛷',
  };

  window.KruRacing = {
    REVEAL: REVEAL, color: function (i) { return COLORS[((i % COLORS.length) + COLORS.length) % COLORS.length]; }, pool: NAMES.map(function (n, i) { return { name: n, color: COLORS[i % COLORS.length] }; }),
    count: ART.length, name: name, vehicle: vehicle, overtake: overtake, shade: shade, POOLS: POOLS, ENC: ENC, CHANCE: CHANCE, SECRET: SECRET,
    PREFIX: '🎄 ', OVERTAKE: { title: 'SLEIGH SWITCH!', verb: 'swooshes past' },
  };
})();
