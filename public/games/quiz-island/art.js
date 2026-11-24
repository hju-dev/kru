/* Quiz Island (Henry, Nov 19): vector pictures for the big event banners and the reward choices.
   Each function returns an SVG string (viewBox 0 0 120 120). c = a team color where it matters. */
(function () {
  'use strict';
  var W = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  function svg(body) { return W + body + '</svg>'; }
  var waves = '<path d="M4 98c10-6 18-6 28 0s18 6 28 0 18-6 28 0 18 6 28 0v18H4z" fill="#1d6fa3"/><path d="M4 104c10-5 18-5 28 0s18 5 28 0 18-5 28 0 18 5 28 0" stroke="#7fd3ff" stroke-width="3" fill="none"/>';
  function palm(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<path d="M0 0c2-14 4-26 10-38" stroke="#8a5a2b" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M10-38c-10-6-22-4-28 4 10-2 18 0 28-4z" fill="#2fbf71"/><path d="M10-38c8-8 20-8 28-2-10 0-18 0-28 2z" fill="#25a862"/>' +
      '<path d="M10-38c-2-10 4-18 12-20-4 6-8 12-12 20z" fill="#3fd685"/><circle cx="10" cy="-36" r="3" fill="#7a4b1f"/></g>';
  }
  function isle(x, y, s, c) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><ellipse cx="0" cy="0" rx="36" ry="12" fill="#f0d58c"/><ellipse cx="0" cy="-3" rx="30" ry="8" fill="#ffe7a3"/>' +
      palm(-10, -4, 1) +
      (c ? '<path d="M16-6v-34" stroke="#3a2a1a" stroke-width="3"/><path d="M17-40l20 7-20 7z" fill="' + c + '" stroke="#111" stroke-width="1.5"/>' : '') + '</g>';
  }
  function coins(x, y) {
    return '<g transform="translate(' + x + ' ' + y + ')"><ellipse cx="0" cy="6" rx="10" ry="4" fill="#c98a00"/><ellipse cx="0" cy="2" rx="10" ry="4" fill="#ffc94a" stroke="#c98a00" stroke-width="1.5"/>' +
      '<ellipse cx="14" cy="8" rx="9" ry="3.6" fill="#c98a00"/><ellipse cx="14" cy="4" rx="9" ry="3.6" fill="#ffd970" stroke="#c98a00" stroke-width="1.5"/></g>';
  }
  var A = {
    island: function (c) { return svg(waves + isle(60, 92, 1.3, c) + '<circle cx="96" cy="22" r="10" fill="#ffd34d"/>'); },
    double: function (c) { return svg(waves + isle(34, 94, 0.9, c) + isle(86, 90, 0.95, c)); },
    dig: function () {
      return svg('<ellipse cx="60" cy="96" rx="44" ry="14" fill="#c9a36a"/><ellipse cx="60" cy="92" rx="26" ry="8" fill="#5b3b1c"/>' + coins(46, 84) + coins(64, 80) +
        '<g transform="rotate(-30 80 50)"><rect x="77" y="14" width="6" height="56" rx="3" fill="#8a5a2b"/><path d="M70 66h20l-4 22c-1 6-11 6-12 0z" fill="#b8c4cc" stroke="#55626b" stroke-width="2"/><rect x="70" y="10" width="20" height="6" rx="3" fill="#8a5a2b"/></g>' +
        '<path d="M28 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff4b0"/><path d="M96 26l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff4b0"/>');
    },
    chest: function () {
      return svg('<path d="M22 58h76v40H22z" fill="#8a4f1f" stroke="#4d2a0d" stroke-width="3"/><path d="M22 58c0-22 76-22 76 0" fill="#a8622a" stroke="#4d2a0d" stroke-width="3" transform="rotate(-18 22 58)"/>' +
        '<ellipse cx="60" cy="58" rx="36" ry="9" fill="#ffc94a"/>' + coins(40, 50) + coins(62, 46) +
        '<path d="M22 72h76" stroke="#ffc94a" stroke-width="5"/><rect x="54" y="66" width="12" height="14" rx="2" fill="#ffd970" stroke="#4d2a0d" stroke-width="2"/>' +
        '<path d="M30 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff4b0"/><path d="M92 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff4b0"/>');
    },
    coin: function () {
      return svg('<circle cx="60" cy="64" r="46" fill="#b07a00"/><circle cx="60" cy="58" r="46" fill="#ffc94a" stroke="#b07a00" stroke-width="4"/>' +
        '<circle cx="60" cy="58" r="33" fill="none" stroke="#e0a800" stroke-width="5"/><path d="M48 44h24l-6 28H54z" fill="#e0a800"/>' +
        '<path d="M36 34c8-8 18-11 28-11" stroke="#fff4b0" stroke-width="6" stroke-linecap="round" fill="none"/>');
    },
    /** Blackbeard: a pirate captain (good news!) with his gold. */
    pirate: function () {
      return svg('<path d="M30 70c0 26 60 26 60 0V58H30z" fill="#1c1c22"/>' +
        '<circle cx="60" cy="60" r="26" fill="#f2c79c" stroke="#7a4b1f" stroke-width="2"/>' +
        '<path d="M34 68c4 22 48 22 52 0-8 8-44 8-52 0z" fill="#1c1c22"/><path d="M50 74c6 3 14 3 20 0" stroke="#d7263d" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<circle cx="70" cy="56" r="3.5" fill="#1c1c22"/><path d="M42 50l18 10M44 50h10v8h-8z" stroke="#1c1c22" stroke-width="3" fill="#1c1c22"/>' +
        '<path d="M22 44c14-6 24-22 38-22s24 16 38 22c-12 6-26 6-38 6s-26 0-38-6z" fill="#1c1c22" stroke="#ffc94a" stroke-width="2.5"/>' +
        '<circle cx="60" cy="34" r="5" fill="#f4efe2"/><path d="M54 30l12 8M66 30l-12 8" stroke="#f4efe2" stroke-width="2"/>');
    },
    beard: function () {
      return svg(coins(22, 98) + coins(78, 100) + A.pirate().replace(W, '<g transform="translate(10 0) scale(0.84)">').replace('</svg>', '</g>'));
    },
    gem: function () {
      return svg('<path d="M30 46l14-18h32l14 18-30 50z" fill="#4cc9f0" stroke="#0a5f80" stroke-width="3"/><path d="M30 46h60M44 28l16 18 16-18M60 46v50M44 46l16 50 16-50" stroke="#0a5f80" stroke-width="2" fill="none"/>' +
        '<path d="M48 32l-6 12" stroke="#d9f6ff" stroke-width="4" stroke-linecap="round"/><path d="M98 22l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#fff"/><path d="M20 70l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff"/>');
    },
    fort: function (c) {
      return svg(waves + '<path d="M28 96V44h12v8h8v-8h12v8h8v-8h12v52z" fill="#8f97a6" stroke="#3b4150" stroke-width="3"/>' +
        '<path d="M50 96V74a10 10 0 0 1 20 0v22z" fill="#3b2a1a"/><rect x="36" y="58" width="8" height="10" fill="#3b4150"/><rect x="76" y="58" width="8" height="10" fill="#3b4150"/>' +
        '<path d="M60 44V18" stroke="#3b4150" stroke-width="3"/><path d="M61 18l22 7-22 7z" fill="' + (c || '#ffc94a') + '" stroke="#111" stroke-width="1.5"/>');
    },
    volcano: function () {
      return svg('<path d="M10 104l34-56h32l34 56z" fill="#6b4a3a" stroke="#3a241a" stroke-width="3"/><path d="M44 48h32l-6 10-8-4-6 8-6-6-6 4z" fill="#ff5a1f"/>' +
        '<path d="M52 56c-2 14-10 22-12 34M66 56c4 12 10 20 14 30" stroke="#ff8a1f" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<circle cx="50" cy="30" r="10" fill="#9a8f8a"/><circle cx="66" cy="22" r="13" fill="#b5aba6"/><circle cx="82" cy="30" r="9" fill="#9a8f8a"/>' +
        '<circle cx="36" cy="40" r="4" fill="#ffb03a"/><circle cx="88" cy="44" r="3" fill="#ffb03a"/>');
    },
    pirates: function () {
      return svg(waves + '<path d="M18 80h84l-12 18H30z" fill="#6b3d1a" stroke="#2c1608" stroke-width="3"/><path d="M60 80V16" stroke="#2c1608" stroke-width="4"/>' +
        '<path d="M60 20c-18 4-28 16-30 52h30z" fill="#1c1c22"/><path d="M62 24c14 6 22 18 22 48H62z" fill="#26262e"/>' +
        '<circle cx="46" cy="44" r="7" fill="#f4efe2"/><circle cx="43.5" cy="43" r="2" fill="#1c1c22"/><circle cx="48.5" cy="43" r="2" fill="#1c1c22"/>' +
        '<path d="M38 56l16-6M38 50l16 6" stroke="#f4efe2" stroke-width="3"/><path d="M60 16l16 5-16 5z" fill="#d7263d"/>');
    },
    /** The Kraken: a red sea monster (Henry, Nov 23) */
    kraken: function () {
      return svg('<g stroke="#b3122a" stroke-width="10" fill="none" stroke-linecap="round"><path d="M30 70C14 78 10 94 22 104"/><path d="M44 78C36 92 38 104 50 108"/><path d="M76 78C84 92 82 104 70 108"/><path d="M90 70C106 78 110 94 98 104"/></g>' +
        '<g fill="#ff9aa8"><circle cx="19" cy="90" r="2.4"/><circle cx="24" cy="100" r="2.4"/><circle cx="42" cy="94" r="2.4"/><circle cx="48" cy="104" r="2.4"/><circle cx="78" cy="94" r="2.4"/><circle cx="72" cy="104" r="2.4"/><circle cx="101" cy="90" r="2.4"/><circle cx="96" cy="100" r="2.4"/></g>' +
        '<path d="M60 8C34 8 24 34 28 56c3 14 14 22 32 22s29-8 32-22C96 34 86 8 60 8z" fill="#e63946" stroke="#8f1525" stroke-width="3"/>' +
        '<path d="M60 12c-6 12-6 26 0 38M46 16c-6 10-6 22-2 32M74 16c6 10 6 22 2 32" stroke="#b3122a" stroke-width="3" fill="none" opacity="0.6"/>' +
        '<circle cx="46" cy="58" r="10" fill="#fff"/><circle cx="74" cy="58" r="10" fill="#fff"/><circle cx="48" cy="60" r="5" fill="#111"/><circle cx="72" cy="60" r="5" fill="#111"/>' +
        '<path d="M34 46l22 8M86 46l-22 8" stroke="#5a0a15" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M48 72c8 6 16 6 24 0" stroke="#5a0a15" stroke-width="3" fill="#7a0f20"/><path d="M52 73l3 6 3-6M62 73l3 6 3-6" fill="#fff"/>');
    },
    /** Hurricane: a big spinning storm with a lightning bolt */
    hurricane: function () {
      return svg('<circle cx="60" cy="60" r="50" fill="#5f7ea8"/><path d="M60 14a46 46 0 0 1 46 46" stroke="#e8f1fb" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        '<path d="M106 60a46 46 0 0 1-46 46" stroke="#cfe0f2" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.85"/><path d="M60 106A46 46 0 0 1 14 60" stroke="#e8f1fb" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        '<path d="M14 60A46 46 0 0 1 60 14" stroke="#cfe0f2" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.85"/>' +
        '<path d="M60 26a34 34 0 0 1 34 34M60 94a34 34 0 0 1-34-34" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>' +
        '<circle cx="60" cy="60" r="12" fill="#2b3d5c"/><path d="M66 34L48 64h12l-6 24 22-34H62z" fill="#ffd34d" stroke="#c98a00" stroke-width="2.5" stroke-linejoin="round"/>');
    },
    /** Tsunami: a huge curling wave over a little island */
    tsunami: function () {
      return svg('<path d="M4 110V70C4 40 30 14 62 14c22 0 40 14 44 34-8-8-18-10-26-6 14 6 20 18 20 30v38z" fill="#2d8fd5" stroke="#145a94" stroke-width="3"/>' +
        '<path d="M62 14c22 0 40 14 44 34-8-8-18-10-26-6-4-14-10-22-18-28z" fill="#8fd6ff"/><path d="M14 84c12-6 24-6 36 0s24 6 36 0 20-4 28 0" stroke="#bfe9ff" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<circle cx="84" cy="42" r="3" fill="#fff"/><circle cx="94" cy="54" r="2.4" fill="#fff"/><circle cx="74" cy="34" r="2" fill="#fff"/>' +
        '<ellipse cx="34" cy="104" rx="26" ry="8" fill="#f0d58c"/><path d="M34 100v-16" stroke="#8a5a2b" stroke-width="3"/><path d="M34 84c-8-2-14 0-18 5 8-2 12-2 18-5zM34 84c6-4 12-4 18-2-6 0-12 1-18 2z" fill="#2fbf71"/>');
    },
    incorrect: function () {
      return svg('<circle cx="60" cy="56" r="44" fill="#e63946" stroke="#8f1525" stroke-width="5"/><path d="M40 36l40 40M80 36L40 76" stroke="#fff" stroke-width="12" stroke-linecap="round"/>' +
        '<path d="M10 106c10-6 18-6 28 0s18 6 28 0 18-6 28 0 18 6 28 0" stroke="#7fd3ff" stroke-width="4" fill="none"/>');
    },
    cannon: function () {
      return svg('<path d="M18 74l52-26 8 16-52 26z" fill="#2b2b33" stroke="#0e0e12" stroke-width="3"/><circle cx="26" cy="86" r="14" fill="#8a5a2b" stroke="#4d2a0d" stroke-width="3"/><circle cx="26" cy="86" r="4" fill="#4d2a0d"/>' +
        '<path d="M80 52l12-10 2 10 12-4-8 10 10 6-12 2 2 12-10-8-6 10-2-12" fill="#ffb03a" stroke="#ff5a1f" stroke-width="2"/><circle cx="104" cy="26" r="7" fill="#1c1c22"/><path d="M92 34l6-4" stroke="#ffd970" stroke-width="2"/>');
    },
    boom: function () {
      return svg('<path d="M60 10l10 22 22-10-8 22 24 6-22 10 14 20-24-4-2 24-14-18-14 18-2-24-24 4 14-20-22-10 24-6-8-22 22 10z" fill="#ff5a1f" stroke="#b02a00" stroke-width="3"/>' +
        '<path d="M60 30l6 14 14-6-5 14 15 4-14 6 9 12-15-2-1 15-9-11-9 11-1-15-15 2 9-12-14-6 15-4-5-14 14 6z" fill="#ffd34d"/>' +
        '<path d="M14 104c8-10 14-10 20 0M86 104c8-10 14-10 20 0" stroke="#7fd3ff" stroke-width="4" fill="none"/>');
    },
    steal: function () {
      return svg('<g stroke="#2b2b33" stroke-width="3"><path d="M24 22l60 70" stroke="#d8dee6" stroke-width="7"/><path d="M96 22l-60 70" stroke="#d8dee6" stroke-width="7"/></g>' +
        '<path d="M78 82l14 14M42 82l-14 14" stroke="#8a5a2b" stroke-width="8" stroke-linecap="round"/><path d="M72 76l16 0M48 76l-16 0" stroke="#ffc94a" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M60 36l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff4b0"/>');
    },
    raid: function () {
      return svg('<path d="M22 14v94" stroke="#5a3a1a" stroke-width="5"/><path d="M24 16c28-8 48 10 76 2v52c-28 8-48-10-76-2z" fill="#16161c" stroke="#000" stroke-width="2"/>' +
        '<circle cx="62" cy="38" r="12" fill="#f4efe2"/><circle cx="57" cy="36" r="3.4" fill="#16161c"/><circle cx="67" cy="36" r="3.4" fill="#16161c"/><path d="M58 46h8" stroke="#16161c" stroke-width="2"/>' +
        '<path d="M44 52l36 12M44 64l36-12" stroke="#f4efe2" stroke-width="5" stroke-linecap="round"/>');
    },
    sinking: function () {
      return svg('<g transform="rotate(28 60 70)"><path d="M18 74h84l-12 18H30z" fill="#6b3d1a" stroke="#2c1608" stroke-width="3"/><path d="M60 74V18" stroke="#2c1608" stroke-width="4"/><path d="M60 22c-16 4-24 16-26 48h26z" fill="#e8e1cf"/></g>' +
        waves + '<circle cx="30" cy="64" r="4" fill="#bfe9ff"/><circle cx="96" cy="58" r="3" fill="#bfe9ff"/><circle cx="84" cy="44" r="2.5" fill="#bfe9ff"/>');
    },
    silence: function () {
      return svg('<path d="M34 14h52M34 106h52" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/><path d="M40 18c0 26 40 26 40 42s-40 16-40 42M80 18c0 26-40 26-40 42s40 16 40 42" fill="#bfe9ff" stroke="#55626b" stroke-width="3"/>' +
        '<path d="M48 34h24l-12 14zM46 96c6-10 22-10 28 0z" fill="#ffc94a"/><text x="94" y="40" font-size="26" font-weight="900" fill="#ff5a5f" font-family="sans-serif">?</text>');
    },
    bottle: function () {
      return svg(waves + '<g transform="rotate(-24 60 60)"><rect x="38" y="40" width="44" height="34" rx="14" fill="#9fe3c4" fill-opacity="0.75" stroke="#2f8a64" stroke-width="3"/>' +
        '<rect x="80" y="50" width="16" height="14" rx="3" fill="#9fe3c4" stroke="#2f8a64" stroke-width="3"/><rect x="94" y="51" width="8" height="12" rx="2" fill="#a8622a"/>' +
        '<path d="M46 50h28v14H46z" fill="#fff6dc" stroke="#c9a36a" stroke-width="2"/><path d="M50 55h20M50 60h14" stroke="#c9a36a" stroke-width="2"/></g>');
    },
    crown: function () {
      return svg(waves + '<path d="M24 76l-6-40 24 18 18-30 18 30 24-18-6 40z" fill="#ffc94a" stroke="#b07a00" stroke-width="3"/><path d="M24 76h72v10H24z" fill="#e0a800" stroke="#b07a00" stroke-width="3"/>' +
        '<circle cx="60" cy="56" r="6" fill="#d7263d"/><circle cx="38" cy="62" r="4" fill="#4cc9f0"/><circle cx="82" cy="62" r="4" fill="#3fbf7f"/>');
    },
    map: function () {
      return svg('<path d="M14 24l28-8 36 10 28-8v80l-28 8-36-10-28 8z" fill="#f0d9a6" stroke="#9c7a45" stroke-width="3"/><path d="M42 16v80M78 26v80" stroke="#c9a36a" stroke-width="2"/>' +
        '<path d="M26 82c10-8 14-20 30-22s22-14 30-26" stroke="#8a5a2b" stroke-width="3" stroke-dasharray="5 5" fill="none"/>' +
        '<path d="M80 26l12 12M92 26l-12 12" stroke="#d7263d" stroke-width="5" stroke-linecap="round"/><circle cx="28" cy="84" r="4" fill="#3fbf7f"/>');
    },
    flag: function () {
      return svg('<path d="M28 12v100" stroke="#3a2a1a" stroke-width="5"/><path d="M30 14h70v48H30z" fill="#fff"/>' +
        '<path d="M30 14h14v12H30zM58 14h14v12H58zM86 14h14v12H86zM44 26h14v12H44zM72 26h14v12H72zM30 38h14v12H30zM58 38h14v12H58zM86 38h14v12H86zM44 50h14v12H44zM72 50h14v12H72z" fill="#16161c"/>');
    },
  };

  // ---------- the pirate crew: ten mascots, one per team (drawn at random in the opening reveal) ----------
  var CREW_COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C'];
  var CREW_NAMES = ['Captain Redbeard', 'Skeleton Sam', 'Mermaid Marina', 'Parrot Pete', 'Cook Biscuit', 'Admiral Ironclad', 'Cabin Boy Finn', 'Lady Cutlass', 'Gunner Gus', 'Lookout Lulu'];
  var SK = '#f2c79c', LN = '#2a1a0a';
  function head(skin) { return '<circle cx="60" cy="62" r="28" fill="' + (skin || SK) + '" stroke="' + LN + '" stroke-width="2.5"/>'; }
  function eyes(y) { return '<circle cx="50" cy="' + (y || 60) + '" r="3.4" fill="' + LN + '"/><circle cx="70" cy="' + (y || 60) + '" r="3.4" fill="' + LN + '"/>'; }
  function smile(y, w) { return '<path d="M' + (60 - (w || 10)) + ' ' + (y || 74) + 'q' + (w || 10) + ' 9 ' + (2 * (w || 10)) + ' 0" stroke="' + LN + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>'; }
  function body(c) { return '<path d="M24 116c2-20 16-30 36-30s34 10 36 30z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/>'; }
  var CREW = [
    // 0 Captain Redbeard: tricorn hat, red beard, eyepatch
    function (c) { return svg(body('#7a1d1d') + head() + '<path d="M34 70c4 24 48 24 52 0-8 10-44 10-52 0z" fill="#c2412d"/>' + eyes(58) + '<path d="M40 52l16 8" stroke="' + LN + '" stroke-width="3"/><circle cx="46" cy="58" r="6" fill="' + LN + '"/>' + smile(72, 8) + '<path d="M18 42c10-4 24-24 42-24s32 20 42 24c-14 8-28 6-42 6s-28 2-42-6z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/><circle cx="60" cy="34" r="5" fill="#f4efe2"/>'); },
    // 1 Skeleton Sam: skull with a bandana
    function (c) { return svg(body('#2b2b36') + '<circle cx="60" cy="60" r="28" fill="#f4efe2" stroke="' + LN + '" stroke-width="2.5"/><path d="M44 80h32v10H44z" fill="#f4efe2" stroke="' + LN + '" stroke-width="2.5"/><path d="M52 80v10M60 80v10M68 80v10" stroke="' + LN + '" stroke-width="2"/><circle cx="48" cy="60" r="7" fill="' + LN + '"/><circle cx="72" cy="60" r="7" fill="' + LN + '"/><path d="M60 68l-4 7h8z" fill="' + LN + '"/><path d="M30 46c8-14 22-18 30-18s22 4 30 18c-14-4-46-4-60 0z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/><path d="M92 42l14 6-10 6z" fill="' + c + '" stroke="' + LN + '" stroke-width="2"/>'); },
    // 2 Mermaid Marina: long hair, shell top, fin ears
    function (c) { return svg('<path d="M24 116c-8-40 2-72 36-72s44 32 36 72z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/>' + head() + '<path d="M32 56c0-24 14-32 28-32s28 8 28 32c-8-14-18-18-28-18s-20 4-28 18z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/>' + eyes(62) + smile(74, 8) + '<path d="M28 60l-10-6v14zM92 60l10-6v14z" fill="#2ec4b6" stroke="' + LN + '" stroke-width="2"/><path d="M40 104q20-18 40 0z" fill="#ff9ec7" stroke="' + LN + '" stroke-width="2.5"/><path d="M60 92v12M50 96l4 8M70 96l-4 8" stroke="' + LN + '" stroke-width="2"/>'); },
    // 3 Parrot Pete: a big parrot
    function (c) { return svg('<path d="M30 116c0-26 12-44 30-44s30 18 30 44z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/><circle cx="60" cy="52" r="26" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/><path d="M44 28q6-18 16-14-2 8-6 16zM58 24q8-16 18-8-4 6-10 14z" fill="#ff4d5a" stroke="' + LN + '" stroke-width="2"/><circle cx="48" cy="50" r="9" fill="#fff" stroke="' + LN + '" stroke-width="2"/><circle cx="72" cy="50" r="9" fill="#fff" stroke="' + LN + '" stroke-width="2"/><circle cx="50" cy="51" r="4" fill="' + LN + '"/><circle cx="70" cy="51" r="4" fill="' + LN + '"/><path d="M52 60q8-4 16 0l-8 20z" fill="#ffb703" stroke="' + LN + '" stroke-width="2.5"/><path d="M34 90l14 8M86 90l-14 8" stroke="' + LN + '" stroke-width="2.5"/>'); },
    // 4 Cook Biscuit: chef hat, bandana, big moustache
    function (c) { return svg(body('#f4efe2') + head() + '<path d="M36 40c-6-14 6-24 14-18 4-10 24-10 28 0 8-6 20 4 14 18z" fill="#fff" stroke="' + LN + '" stroke-width="2.5"/><path d="M36 40h48v8H36z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/>' + eyes(58) + '<path d="M44 68q8-8 16 0 8-8 16 0-8 10-16 4-8 6-16-4z" fill="#5a3a1a" stroke="' + LN + '" stroke-width="2"/>' + smile(78, 6) + '<circle cx="42" cy="66" r="3" fill="#ff9ec7"/><circle cx="78" cy="66" r="3" fill="#ff9ec7"/>'); },
    // 5 Admiral Ironclad: big hat, grey moustache, medals
    function (c) { return svg(body('#1f3a5f') + '<circle cx="42" cy="108" r="5" fill="#ffc94a" stroke="' + LN + '" stroke-width="2"/><circle cx="58" cy="110" r="5" fill="' + c + '" stroke="' + LN + '" stroke-width="2"/>' + head() + '<path d="M44 66q8-6 16 0 8-6 16 0-8 8-16 3-8 5-16-3z" fill="#d7d9de" stroke="' + LN + '" stroke-width="2"/>' + eyes(56) + '<path d="M44 48l12 3M76 48l-12 3" stroke="#aeb3bd" stroke-width="3"/><path d="M26 42c6-8 14-26 34-26s28 18 34 26c-10 6-24 4-34 4s-24 2-34-4z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/><path d="M48 30h24" stroke="#ffc94a" stroke-width="3"/><circle cx="60" cy="26" r="4" fill="#ffc94a"/>'); },
    // 6 Cabin Boy Finn: striped shirt, cap, freckles
    function (c) { return svg('<path d="M24 116c2-20 16-30 36-30s34 10 36 30z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/><path d="M30 104h60M34 96h52M42 90h36" stroke="#fff" stroke-width="4"/>' + head() + eyes(60) + '<circle cx="46" cy="66" r="1.6" fill="#a0643a"/><circle cx="50" cy="69" r="1.6" fill="#a0643a"/><circle cx="74" cy="66" r="1.6" fill="#a0643a"/><circle cx="70" cy="69" r="1.6" fill="#a0643a"/><path d="M48 72q12 10 24 0z" fill="#fff" stroke="' + LN + '" stroke-width="2"/><path d="M32 50c4-18 20-24 28-24s24 6 28 24c-12-6-44-6-56 0z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/><path d="M84 46l16 4-14 6z" fill="' + c + '" stroke="' + LN + '" stroke-width="2"/>'); },
    // 7 Lady Cutlass: bandana, braid, earring
    function (c) { return svg(body('#3a1d4a') + '<path d="M92 50c10 14 10 30 4 46" stroke="#5a2a14" stroke-width="9" fill="none" stroke-linecap="round"/>' + head() + '<path d="M32 52c2-18 16-26 28-26s26 8 28 26c-16-8-40-8-56 0z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/><path d="M32 50l-12 8 12 4z" fill="' + c + '" stroke="' + LN + '" stroke-width="2"/>' + eyes(62) + '<path d="M44 54q6-5 12 0M64 54q6-5 12 0" stroke="' + LN + '" stroke-width="2.5" fill="none"/>' + smile(74, 8) + '<circle cx="33" cy="70" r="4" fill="#ffc94a" stroke="' + LN + '" stroke-width="1.5"/>'); },
    // 8 Gunner Gus: sooty face, bandana, cannonball
    function (c) { return svg(body('#4a4a52') + head('#d9a878') + '<path d="M32 52c2-18 16-26 28-26s26 8 28 26c-16-8-40-8-56 0z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/><path d="M38 70c4 8 40 8 44 0" fill="#3b2a1d" opacity="0.55"/><circle cx="50" cy="60" r="4" fill="#fff" stroke="' + LN + '" stroke-width="2"/><circle cx="70" cy="60" r="4" fill="#fff" stroke="' + LN + '" stroke-width="2"/><circle cx="50" cy="61" r="2" fill="' + LN + '"/><circle cx="70" cy="61" r="2" fill="' + LN + '"/><path d="M44 72q16 14 32 0z" fill="#fff" stroke="' + LN + '" stroke-width="2.5"/><circle cx="98" cy="100" r="13" fill="#22222a" stroke="' + LN + '" stroke-width="2.5"/><path d="M96 88q2-10 8-12" stroke="#ff8a1f" stroke-width="3" fill="none"/><circle cx="106" cy="74" r="3" fill="#ffc94a"/>'); },
    // 9 Lookout Lulu: spyglass, bucket hat
    function (c) { return svg(body('#2f5d8a') + head() + '<path d="M34 46c2-8 12-16 26-16s24 8 26 16c-8 4-44 4-52 0z" fill="' + c + '" stroke="' + LN + '" stroke-width="2.5"/><path d="M28 46h64" stroke="' + LN + '" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="60" r="3.4" fill="' + LN + '"/><path d="M62 52l34-14 6 12-34 14z" fill="#b8742a" stroke="' + LN + '" stroke-width="2.5"/><path d="M84 42l8-3 4 9-8 3z" fill="#ffc94a" stroke="' + LN + '" stroke-width="2"/><circle cx="68" cy="60" r="7" fill="#cfe9ff" stroke="' + LN + '" stroke-width="2.5"/>' + smile(76, 7)); },
  ];
  A.crew = function (i, c) { return CREW[((i % CREW.length) + CREW.length) % CREW.length](c || '#ffb703'); };
  A.crewPool = CREW_NAMES.map(function (n, i) { return { name: n, color: CREW_COLORS[i] }; });
  A.crewColor = function (i) { return CREW_COLORS[((i % CREW_COLORS.length) + CREW_COLORS.length) % CREW_COLORS.length]; };
  window.QIArt = A;
  // pictures for the How to play slides ("[[coin]]" etc.)
  window.KruIntroIcons = { coin: A.coin(), chest: A.chest(), pirate: A.pirate(), boom: A.boom(), steal: A.steal(), double: A.double('#ffc94a'), fort: A.fort(), gem: A.gem(), volcano: A.volcano(), pirates: A.pirates(), kraken: A.kraken(), hurricane: A.hurricane(), tsunami: A.tsunami() };
})();
