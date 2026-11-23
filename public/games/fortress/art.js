/* Fortress: vector pictures (viewBox 0 0 120 120) for the bases, bombs, banners and Job, the student who helped
   create the game. Every function returns an SVG string. */
(function () {
  'use strict';
  var W = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  function svg(body) { return W + body + '</svg>'; }
  var STONE = '#c9ccd6', STONE_D = '#8d92a3', ROOF = '#c0392b';
  var A = {
    /** HQ: a castle keep with a flag */
    hq: function (c) {
      return svg('<path d="M60 8v26" stroke="#3a2a1a" stroke-width="4"/><path d="M62 9l28 9-28 9z" fill="' + (c || '#e63946') + '" stroke="#111" stroke-width="2"/>' +
        '<path d="M22 100V44h12v-8h12v8h8V30h12v14h8v-8h12v8h12v56z" fill="' + STONE + '" stroke="' + STONE_D + '" stroke-width="3"/>' +
        '<path d="M48 100V76a12 12 0 0 1 24 0v24z" fill="#5b3b1c"/><rect x="30" y="54" width="8" height="14" rx="3" fill="#2b3150"/><rect x="82" y="54" width="8" height="14" rx="3" fill="#2b3150"/>');
    },
    /** Depot: a supply barn with crates */
    depot: function () {
      return svg('<path d="M14 54L60 24l46 30v46H14z" fill="#b5651d" stroke="#6b3b0f" stroke-width="3"/><path d="M8 56L60 20l52 36" stroke="' + ROOF + '" stroke-width="8" fill="none" stroke-linejoin="round"/>' +
        '<rect x="42" y="62" width="36" height="38" fill="#6b3b0f"/><path d="M42 62l36 38M78 62L42 100" stroke="#e0b070" stroke-width="3"/>' +
        '<rect x="84" y="82" width="18" height="18" fill="#d9a05b" stroke="#6b3b0f" stroke-width="2"/><rect x="18" y="86" width="16" height="14" fill="#d9a05b" stroke="#6b3b0f" stroke-width="2"/>');
    },
    /** Defense tower */
    tower: function () {
      return svg('<path d="M36 104V40h48v64z" fill="' + STONE + '" stroke="' + STONE_D + '" stroke-width="3"/><path d="M30 40V26h10v6h8v-6h8v6h8v-6h10v14z" fill="' + STONE + '" stroke="' + STONE_D + '" stroke-width="3"/>' +
        '<rect x="54" y="56" width="12" height="22" rx="6" fill="#2b3150"/><path d="M52 104V92a8 8 0 0 1 16 0v12z" fill="#5b3b1c"/><path d="M60 26V8" stroke="#3a2a1a" stroke-width="3"/><path d="M60 8l16 5-16 5z" fill="#f4c542"/>');
    },
    /** Bombs: size 0 small, 1 medium, 2 large, 3 mega */
    bomb: function (size) {
      var r = [18, 24, 31, 38][size || 0], col = ['#6a7385', '#3a4256', '#262b3a', '#7a1020'][size || 0];
      return svg('<circle cx="56" cy="70" r="' + r + '" fill="' + col + '" stroke="#111" stroke-width="3"/><ellipse cx="' + (56 - r * 0.35) + '" cy="' + (70 - r * 0.4) + '" rx="' + r * 0.22 + '" ry="' + r * 0.14 + '" fill="#fff" opacity="0.55"/>' +
        '<path d="M70 ' + (70 - r + 2) + 'q10-12 20-12" stroke="#c9a36a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M92 50l5-9 4 8 9 1-7 6 3 9-9-4-8 5 1-10-8-5z" fill="#ffb703" stroke="#ff6b1a" stroke-width="2"/>' +
        (size === 3 ? '<path d="M44 66l24 8M44 74l24-8" stroke="#ffd34d" stroke-width="4" stroke-linecap="round"/>' : ''));
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
    /** Job (15, tall and slender, black hair, white short-sleeve shirt, khaki shorts, brown shoes) */
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
  window.KruIntroIcons = { hq: A.hq(), depot: A.depot(), tower: A.tower(), bomb1: A.bomb(0), bomb2: A.bomb(1), bomb3: A.bomb(2), bomb4: A.bomb(3), coin: A.coin(), repair: A.repair(), alliance: A.alliance(), risk: A.risk(), job: A.job(), shield: A.shield() };
})();
