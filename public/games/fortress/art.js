/* RedPoint: vector pictures (viewBox 0 0 120 120) for the bases, weapons, banners and LM2, the student who helped
   create the game. Every function returns an SVG string. */
(function () {
  'use strict';
  var W = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  function svg(body) { return W + body + '</svg>'; }
  var STONE = '#c9ccd6', STONE_D = '#8d92a3', ROOF = '#c0392b';
  var A = {
    /** HQ: a command bunker with a radar mast and a flag */
    hq: function (c) {
      return svg('<path d="M60 6v24" stroke="#cfd8dc" stroke-width="3"/><path d="M62 7l24 7-24 7z" fill="' + (c || '#e63946') + '" stroke="#111" stroke-width="2"/>' +
        '<path d="M44 30a16 16 0 0 1 32 0" stroke="#90a4ae" stroke-width="3" fill="none"/><circle cx="60" cy="30" r="3" fill="#ff5252"/>' +
        '<path d="M12 104V62l18-14h60l18 14v42z" fill="#5f6b5a" stroke="#2f372c" stroke-width="3"/><path d="M12 62l18-14h60l18 14z" fill="#79866f" stroke="#2f372c" stroke-width="3"/>' +
        '<rect x="46" y="74" width="28" height="30" rx="3" fill="#2b3128"/><path d="M46 84h28M46 94h28" stroke="#5f6b5a" stroke-width="2"/>' +
        '<rect x="20" y="70" width="18" height="8" rx="2" fill="#ffd54f"/><rect x="82" y="70" width="18" height="8" rx="2" fill="#ffd54f"/><path d="M14 104h92" stroke="#2f372c" stroke-width="4"/>');
    },
    /** Depot: a supply hangar with stacked crates */
    depot: function () {
      return svg('<path d="M10 104V60C10 38 34 26 60 26s50 12 50 34v44z" fill="#6d7b8a" stroke="#34404c" stroke-width="3"/>' +
        '<path d="M10 60C10 38 34 26 60 26s50 12 50 34" fill="none" stroke="#a9b8c6" stroke-width="3"/><path d="M22 60h76M28 48h64" stroke="#566574" stroke-width="2"/>' +
        '<rect x="38" y="66" width="44" height="38" fill="#2f3b47" stroke="#1c252e" stroke-width="2"/><path d="M60 66v38M38 85h44" stroke="#56677a" stroke-width="2"/>' +
        '<rect x="86" y="86" width="20" height="18" fill="#a1887f" stroke="#4e342e" stroke-width="2"/><rect x="14" y="90" width="18" height="14" fill="#a1887f" stroke="#4e342e" stroke-width="2"/><path d="M14 97h18M86 95h20" stroke="#4e342e" stroke-width="2"/>');
    },
    /** Defense tower: a radar / anti-air tower */
    tower: function () {
      return svg('<path d="M40 106V56h40v50z" fill="#78909c" stroke="#37474f" stroke-width="3"/><path d="M34 56h52v10H34z" fill="#546e7a" stroke="#37474f" stroke-width="3"/>' +
        '<path d="M46 66v40M60 66v40M74 66v40" stroke="#607d8b" stroke-width="2"/>' +
        '<path d="M60 56V34" stroke="#cfd8dc" stroke-width="4"/><path d="M36 30a24 24 0 0 1 48 0z" fill="#cfd8dc" stroke="#546e7a" stroke-width="3"/><path d="M60 30l16-14" stroke="#ef5350" stroke-width="4" stroke-linecap="round"/><circle cx="76" cy="16" r="3.5" fill="#ef5350"/>' +
        '<rect x="52" y="84" width="16" height="22" rx="2" fill="#263238"/>');
    },
    /** Bombs: size 0 small, 1 medium, 2 large, 3 mega */
    bomb: function (size) {
      var r = [18, 24, 31, 38][size || 0], col = ['#6a7385', '#3a4256', '#262b3a', '#7a1020'][size || 0];
      return svg('<circle cx="56" cy="70" r="' + r + '" fill="' + col + '" stroke="#111" stroke-width="3"/><ellipse cx="' + (56 - r * 0.35) + '" cy="' + (70 - r * 0.4) + '" rx="' + r * 0.22 + '" ry="' + r * 0.14 + '" fill="#fff" opacity="0.55"/>' +
        '<path d="M70 ' + (70 - r + 2) + 'q10-12 20-12" stroke="#c9a36a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M92 50l5-9 4 8 9 1-7 6 3 9-9-4-8 5 1-10-8-5z" fill="#ffb703" stroke="#ff6b1a" stroke-width="2"/>' +
        (size === 3 ? '<path d="M44 66l24 8M44 74l24-8" stroke="#ffd34d" stroke-width="4" stroke-linecap="round"/>' : ''));
    },
    /** The store's weapons, drawn as bombs and rockets (key = the item id) */
    weapon: function (key) {
      var body = function (x, y, w, h, c1, c2, tip) {
        return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + w / 2.4 + '" fill="' + c1 + '" stroke="#1c252e" stroke-width="2.5"/>' +
          '<path d="M' + x + ' ' + (y + 6) + 'q' + w / 2 + ' -' + (tip || 14) + ' ' + w + ' 0z" fill="' + c2 + '" stroke="#1c252e" stroke-width="2.5"/>';
      };
      var fins = function (x, y, w, c) { return '<path d="M' + x + ' ' + y + 'l-9 14h9zM' + (x + w) + ' ' + y + 'l9 14h-9z" fill="' + c + '" stroke="#1c252e" stroke-width="2"/>'; };
      var flame = function (x, y) { return '<path d="M' + x + ' ' + y + 'q-6 10 0 22q6 -12 0 -22z" fill="#ffb300"/><path d="M' + x + ' ' + y + 'q-3 6 0 12q3 -6 0 -12z" fill="#fff59d"/>'; };
      switch (key) {
        case 'crude': // a plain aerial bomb
          return svg('<ellipse cx="60" cy="64" rx="22" ry="34" fill="#546e7a" stroke="#1c252e" stroke-width="3"/><path d="M60 30v-8M52 22h16" stroke="#1c252e" stroke-width="4" stroke-linecap="round"/><path d="M42 40h36M40 64h40M42 88h36" stroke="#78909c" stroke-width="3"/><path d="M44 98l-10 12h12zM76 98l10 12H74z" fill="#546e7a" stroke="#1c252e" stroke-width="2"/>');
        case 'bomb': // a bigger bomb with a red nose band
          return svg('<ellipse cx="60" cy="62" rx="26" ry="38" fill="#37474f" stroke="#1c252e" stroke-width="3"/><path d="M36 38q24 -12 48 0" stroke="#ef5350" stroke-width="8" fill="none"/><path d="M60 24v-8" stroke="#1c252e" stroke-width="5"/><path d="M40 98l-12 12h14zM80 98l12 12H78z" fill="#37474f" stroke="#1c252e" stroke-width="2"/>');
        case 'scatter': // a cluster bomb: a big shell and little bomblets
          return svg('<ellipse cx="60" cy="44" rx="22" ry="30" fill="#607d8b" stroke="#1c252e" stroke-width="3"/><circle cx="34" cy="92" r="11" fill="#455a64" stroke="#1c252e" stroke-width="2.5"/><circle cx="60" cy="100" r="11" fill="#455a64" stroke="#1c252e" stroke-width="2.5"/><circle cx="86" cy="92" r="11" fill="#455a64" stroke="#1c252e" stroke-width="2.5"/><path d="M46 70l-10 10M60 74v14M74 70l10 10" stroke="#ffb300" stroke-width="3" stroke-dasharray="3 4"/>');
        case 'missile': // a high speed missile
          return svg('<g transform="rotate(35 60 60)">' + body(50, 14, 20, 68, '#eceff1', '#ef5350', 18) + fins(50, 72, 20, '#ef5350') + flame(60, 94) + '</g>');
        case 'dual': // two missiles
          return svg('<g transform="rotate(30 60 60)">' + body(38, 16, 16, 62, '#eceff1', '#ef5350', 16) + fins(38, 66, 16, '#ef5350') + flame(46, 86) + body(68, 22, 16, 62, '#eceff1', '#ef5350', 16) + fins(68, 72, 16, '#ef5350') + flame(76, 92) + '</g>');
        case 'jammer': // a satellite dish
          return svg('<path d="M24 64a40 40 0 0 0 60 -34z" fill="#b0bec5" stroke="#455a64" stroke-width="3"/><path d="M54 48l22 -22" stroke="#455a64" stroke-width="4"/><circle cx="80" cy="22" r="6" fill="#ef5350"/><path d="M92 38a24 24 0 0 1 4 22M100 30a36 36 0 0 1 6 34" stroke="#4fc3f7" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M40 64l-10 38h40l-10 -38" fill="#78909c" stroke="#37474f" stroke-width="3"/>');
        case 'tos': // a rocket launcher truck with a rack of rockets
          return svg('<rect x="14" y="78" width="90" height="16" rx="3" fill="#5f6b5a" stroke="#2f372c" stroke-width="3"/><rect x="82" y="64" width="24" height="16" rx="3" fill="#79866f" stroke="#2f372c" stroke-width="3"/><circle cx="32" cy="98" r="8" fill="#263238"/><circle cx="62" cy="98" r="8" fill="#263238"/><circle cx="90" cy="98" r="8" fill="#263238"/><g transform="rotate(-28 50 74)"><rect x="18" y="34" width="62" height="34" rx="3" fill="#455a64" stroke="#2f372c" stroke-width="3"/><circle cx="30" cy="44" r="5" fill="#ef5350"/><circle cx="46" cy="44" r="5" fill="#ef5350"/><circle cx="62" cy="44" r="5" fill="#ef5350"/><circle cx="30" cy="58" r="5" fill="#ef5350"/><circle cx="46" cy="58" r="5" fill="#ef5350"/><circle cx="62" cy="58" r="5" fill="#ef5350"/></g>');
        case 'avangard': // a hypersonic glide vehicle: a sharp wedge with heat glow
          return svg('<path d="M8 72L98 38l14 14L38 96z" fill="#cfd8dc" stroke="#1c252e" stroke-width="3"/><path d="M8 72l60 -16-20 30z" fill="#ef5350" stroke="#1c252e" stroke-width="2.5"/><path d="M98 38l14 14" stroke="#ffb300" stroke-width="6"/><path d="M14 90q-10 6 -8 18q16 -2 24 -14" fill="#ffb300"/><path d="M26 98q-6 4 -4 10q10 -2 14 -8" fill="#fff59d"/>');
        case 'sarmat': // a big strategic missile
          return svg('<g transform="rotate(20 60 60)">' + body(46, 6, 28, 84, '#eceff1', '#37474f', 22) + '<path d="M46 40h28M46 56h28" stroke="#ef5350" stroke-width="5"/>' + fins(46, 76, 28, '#37474f') + flame(60, 96) + '</g>');
        default:
          return A.bomb(1);
      }
    },
    boom: function () {
      return svg('<path d="M60 6l9 22 22-12-8 24 26 4-22 14 16 18-26-4 2 26-17-18-17 18 2-26-26 4 16-18L8 44l26-4-8-24 22 12z" fill="#ff8a1f" stroke="#c43c00" stroke-width="3"/><path d="M60 30l6 14 14-2-10 11 8 12-14-3-4 14-4-14-14 3 8-12-10-11 14 2z" fill="#ffd34d"/>');
    },
    shield: function () {
      return svg('<path d="M60 8l40 14v32c0 28-18 46-40 58C38 100 20 82 20 54V22z" fill="#4c8fe0" stroke="#1d4d91" stroke-width="4"/><path d="M60 22l26 9v22c0 18-11 31-26 40z" fill="#7fb4f0"/><path d="M44 58l12 12 22-26" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
    },
    repair: function () {
      return svg('<rect x="18" y="36" width="84" height="62" rx="10" fill="#fff" stroke="#c8ccd6" stroke-width="4"/><rect x="46" y="20" width="28" height="18" rx="6" fill="#e63946"/><path d="M50 52h20v14h14v20H70v14H50V86H36V66h14z" transform="translate(0 -8) scale(1 .9) translate(0 8)" fill="#e63946"/>');
    },
    coin: function () {
      return svg('<circle cx="60" cy="60" r="46" fill="#f4c542" stroke="#b07a00" stroke-width="6"/><circle cx="60" cy="60" r="34" fill="none" stroke="#c98a00" stroke-width="4"/><path d="M60 36v48M48 46h18a8 8 0 0 1 0 16H52a8 8 0 0 0 0 16h20" stroke="#b07a00" stroke-width="6" fill="none" stroke-linecap="round"/>');
    },
    alliance: function () {
      return svg('<path d="M10 70l24-18 22 8 16-8 38 22-18 18-14-6-14 10-18-8-12 8z" fill="#f2c9a0" stroke="#b07a4a" stroke-width="3"/><path d="M26 44l-18 14 8 10 18-12z" fill="#4c8fe0"/><path d="M94 44l18 14-8 10-18-12z" fill="#e0524c"/><path d="M60 20l4 8 8 1-6 6 2 8-8-4-8 4 2-8-6-6 8-1z" fill="#ffc94a"/>');
    },
    risk: function () {
      return svg('<rect x="22" y="22" width="76" height="76" rx="14" fill="#fff" stroke="#222" stroke-width="5"/><circle cx="42" cy="42" r="7" fill="#222"/><circle cx="78" cy="42" r="7" fill="#222"/><circle cx="60" cy="60" r="7" fill="#222"/><circle cx="42" cy="78" r="7" fill="#222"/><circle cx="78" cy="78" r="7" fill="#222"/>');
    },
    ruins: function () {
      return svg('<path d="M18 104V70l14-6 8 10 10-18 14 12 10-8 14 14 8-2v28z" fill="#8d92a3" stroke="#5c6173" stroke-width="3"/><path d="M30 60l8-26M60 66l6-34M86 74l10-22" stroke="#555a6d" stroke-width="4" stroke-linecap="round"/><circle cx="74" cy="26" r="9" fill="#999"/><circle cx="88" cy="16" r="6" fill="#bbb"/>');
    },
    trophy: function () {
      return svg('<path d="M34 16h52v30c0 18-12 30-26 30S34 64 34 46z" fill="#f4c542" stroke="#b07a00" stroke-width="4"/><path d="M34 24H16c0 18 8 28 20 30M86 24h18c0 18-8 28-20 30" stroke="#b07a00" stroke-width="5" fill="none"/><rect x="52" y="76" width="16" height="16" fill="#d99a00"/><rect x="38" y="92" width="44" height="12" rx="4" fill="#b07a00"/>');
    },
    /** LM2 (15, tall and slender, black hair, white short-sleeve shirt, khaki shorts, brown shoes) */
    job: function () {
      return svg('<ellipse cx="60" cy="113" rx="20" ry="4" fill="#000" opacity="0.18"/>' +
        // legs: thin
        '<rect x="51" y="86" width="6" height="22" rx="3" fill="#e8b98a"/><rect x="63" y="86" width="6" height="22" rx="3" fill="#e8b98a"/>' +
        '<ellipse cx="52" cy="109" rx="8" ry="3.6" fill="#6b3b1c"/><ellipse cx="68" cy="109" rx="8" ry="3.6" fill="#6b3b1c"/>' +
        // khaki shorts: narrow
        '<path d="M50.5 72h19l.8 16H60.6l-.6-5-.6 5H49.7z" fill="#c9b27c" stroke="#a8935a" stroke-width="1"/>' +
        // slim torso and short sleeves
        '<path d="M51.5 40h17l1.2 33H50.3z" fill="#fff" stroke="#d5d8e0" stroke-width="1.5"/><path d="M60 42v30" stroke="#d5d8e0" stroke-width="1.5"/>' +
        '<circle cx="60" cy="50" r="1.2" fill="#b9bdc9"/><circle cx="60" cy="58" r="1.2" fill="#b9bdc9"/><circle cx="60" cy="66" r="1.2" fill="#b9bdc9"/>' +
        '<path d="M51.5 41l-5.5 7 4 3.5 4-6z" fill="#fff" stroke="#d5d8e0" stroke-width="1.3"/><path d="M68.5 41l5.5 7-4 3.5-4-6z" fill="#fff" stroke="#d5d8e0" stroke-width="1.3"/>' +
        // thin arms
        '<rect x="43" y="48" width="4" height="23" rx="2" fill="#e8b98a" transform="rotate(5 45 48)"/><rect x="73" y="48" width="4" height="23" rx="2" fill="#e8b98a" transform="rotate(-5 75 48)"/>' +
        // neck and a smaller head
        '<rect x="56" y="33" width="8" height="9" rx="3" fill="#e8b98a"/><ellipse cx="60" cy="23" rx="12.5" ry="14.5" fill="#e8b98a"/>' +
        '<path d="M47 22c-1-11 7-17 14-17s13 5 12 16c-3-5-7-7-12-7-6 0-10 3-14 8z" fill="#111"/><path d="M47.5 22c-1.5 6 0 10 1.5 12-1-5 0-9 3-12z" fill="#111"/>' +
        '<circle cx="55" cy="26" r="1.7" fill="#222"/><circle cx="65" cy="26" r="1.7" fill="#222"/><path d="M55.5 32q4.5 3.5 9 0" stroke="#7a3b2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>');
    },
  };
  window.FtArt = A;
  /** A pop-up picture as a little animated cartoon scene (CSS in style.css): the missile streaks in and explodes, the shield ripples,
      the wrench spins and sparks, coins spin, smoke rises from ruins... kind = the picture's name. Only used inside the big pop-ups. */
  A.sc = function (kind, inner) { return '<div class="sc sc-' + kind + '">' + inner + '<i class="sc-a"></i><i class="sc-b"></i><i class="sc-c"></i></div>'; };
  window.KruIntroIcons = { hq: A.hq(), depot: A.depot(), tower: A.tower(), bomb1: A.weapon('crude'), bomb2: A.weapon('missile'), bomb3: A.weapon('avangard'), bomb4: A.weapon('sarmat'), coin: A.coin(), repair: A.repair(), alliance: A.alliance(), risk: A.risk(), job: A.job(), shield: A.shield() };
})();
