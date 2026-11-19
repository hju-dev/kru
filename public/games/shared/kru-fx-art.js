/* Kru banner pictures (kru-fx.js): one SVG per name, viewBox 0 0 120 120. c = an optional team color.
   Race (Quiz Dash), Christmas (Christmas Dash), game show (Jeopardy), brain lab (Think Tank Showdown),
   arena / library / quill (Battle of Wits / Readers / Writers). */
(function () {
  'use strict';
  var W = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  function svg(b) { return W + b + '</svg>'; }
  var spark = function (x, y, s) { return '<path transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')" d="M0-8l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#fff6c0"/>'; };
  var A = {
    // ---------- shared ----------
    trophy: function () {
      return svg('<path d="M36 18h48v18c0 20-10 32-24 32S36 56 36 36z" fill="#ffc94a" stroke="#b07a00" stroke-width="3"/>' +
        '<path d="M36 26H22c0 16 8 22 16 22M84 26h14c0 16-8 22-16 22" stroke="#b07a00" stroke-width="5" fill="none"/>' +
        '<path d="M54 68h12v14H54z" fill="#e0a800"/><path d="M38 84h44l4 16H34z" fill="#8a5a2b" stroke="#4d2a0d" stroke-width="3"/>' +
        '<path d="M48 26c0 14 4 22 8 26" stroke="#fff4b0" stroke-width="5" fill="none" stroke-linecap="round"/>' + spark(98, 14) + spark(18, 70, 0.8));
    },
    star: function () {
      return svg('<path d="M60 10l14 30 32 4-24 22 6 32-28-16-28 16 6-32-24-22 32-4z" fill="#ffc94a" stroke="#b07a00" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M60 26l7 16" stroke="#fff4b0" stroke-width="5" stroke-linecap="round"/>' + spark(102, 18) + spark(16, 92, 0.9));
    },
    cross: function () {
      return svg('<circle cx="60" cy="60" r="46" fill="#ff5a5f" stroke="#8f1525" stroke-width="4"/><path d="M40 40l40 40M80 40L40 80" stroke="#fff" stroke-width="12" stroke-linecap="round"/>');
    },
    dice: function () {
      var pip = function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="5" fill="#222"/>'; };
      return svg('<g transform="rotate(-12 44 64)"><rect x="16" y="38" width="52" height="52" rx="10" fill="#fff" stroke="#c9d1d9" stroke-width="3"/>' + pip(30, 52) + pip(42, 64) + pip(54, 76) + '</g>' +
        '<g transform="rotate(14 82 50)"><rect x="58" y="24" width="48" height="48" rx="10" fill="#fff" stroke="#c9d1d9" stroke-width="3"/>' + pip(70, 36) + pip(94, 36) + pip(70, 60) + pip(94, 60) + '</g>' + spark(100, 92));
    },
    stopwatch: function () {
      return svg('<circle cx="60" cy="66" r="40" fill="#fff" stroke="#3b4150" stroke-width="6"/><rect x="50" y="12" width="20" height="12" rx="3" fill="#3b4150"/>' +
        '<path d="M60 66V38M60 66l18 12" stroke="#d7263d" stroke-width="6" stroke-linecap="round"/><circle cx="60" cy="66" r="5" fill="#3b4150"/>' +
        '<text x="74" y="56" font-size="20" font-weight="900" fill="#2f9e5b" font-family="sans-serif">+20</text>');
    },
    ticket: function () {
      return svg('<g transform="rotate(-10 60 60)"><path d="M14 40h92v12a8 8 0 0 0 0 16v12H14V68a8 8 0 0 0 0-16z" fill="#ffc94a" stroke="#b07a00" stroke-width="3"/>' +
        '<path d="M80 40v40" stroke="#b07a00" stroke-width="3" stroke-dasharray="4 4"/><text x="24" y="66" font-size="16" font-weight="900" fill="#7a4b00" font-family="sans-serif">FREE</text></g>' + spark(104, 22));
    },
    shield: function () {
      return svg('<path d="M60 10l40 14v30c0 28-18 46-40 56-22-10-40-28-40-56V24z" fill="#4cc9f0" stroke="#0a5f80" stroke-width="4"/>' +
        '<path d="M60 22l28 10v22c0 20-12 34-28 42z" fill="#8fe0ff"/><path d="M44 58l12 12 22-24" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
    },
    fifty: function () {
      return svg('<rect x="10" y="22" width="46" height="76" rx="10" fill="#fff" stroke="#c9d1d9" stroke-width="3"/><rect x="64" y="22" width="46" height="76" rx="10" fill="#fff" stroke="#c9d1d9" stroke-width="3" opacity="0.5"/>' +
        '<text x="33" y="70" text-anchor="middle" font-size="30" font-weight="900" fill="#2f9e5b" font-family="sans-serif">50</text><text x="87" y="70" text-anchor="middle" font-size="30" font-weight="900" fill="#999" font-family="sans-serif">50</text>' +
        '<path d="M70 32l34 56" stroke="#ff5a5f" stroke-width="6" stroke-linecap="round"/>');
    },
    flame: function () {
      return svg('<path d="M60 8c8 22 32 30 32 60a32 32 0 0 1-64 0c0-16 8-24 12-32 2 10 6 14 10 14-4-20 2-32 10-42z" fill="#ff8a1f" stroke="#b02a00" stroke-width="3"/>' +
        '<path d="M60 52c4 10 16 14 16 30a16 16 0 0 1-32 0c0-10 6-14 8-20 2 6 4 8 6 8-2-8 0-14 2-18z" fill="#ffd34d"/>');
    },
    crown: function () {
      return svg('<path d="M18 86l-6-52 28 22 20-34 20 34 28-22-6 52z" fill="#ffc94a" stroke="#b07a00" stroke-width="3"/><path d="M18 86h84v12H18z" fill="#e0a800" stroke="#b07a00" stroke-width="3"/>' +
        '<circle cx="60" cy="64" r="7" fill="#d7263d"/><circle cx="36" cy="70" r="5" fill="#4cc9f0"/><circle cx="84" cy="70" r="5" fill="#3fbf7f"/>' + spark(104, 22) + spark(14, 20, 0.8));
    },
    hourglass: function () {
      return svg('<path d="M34 14h52M34 106h52" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/><path d="M40 18c0 26 40 26 40 42s-40 16-40 42M80 18c0 26-40 26-40 42s40 16 40 42" fill="#bfe9ff" stroke="#55626b" stroke-width="3"/>' +
        '<path d="M48 34h24l-12 14zM46 96c6-10 22-10 28 0z" fill="#ffc94a"/>');
    },
    medal: function (c) {
      return svg('<path d="M40 8h16l10 40H50zM80 8H64L54 48h16z" fill="' + (c || '#d7263d') + '"/><circle cx="60" cy="78" r="30" fill="#ffc94a" stroke="#b07a00" stroke-width="4"/>' +
        '<circle cx="60" cy="78" r="20" fill="none" stroke="#e0a800" stroke-width="4"/><text x="60" y="88" text-anchor="middle" font-size="28" font-weight="900" fill="#7a4b00" font-family="sans-serif">1</text>');
    },
    // ---------- race ----------
    checkflag: function () {
      return svg('<path d="M24 10v104" stroke="#3b2a1a" stroke-width="6" stroke-linecap="round"/><path d="M27 12c20-6 40 6 60 0s20-4 26-2v52c-6-2-6 0-26 2s-40-6-60 0z" fill="#fff" stroke="#111" stroke-width="2"/>' +
        '<path d="M27 12h14v13H27zM55 12h14v13H55zM83 10h14v13H83zM41 25h14v13H41zM69 25h14v13H69zM97 23h14v13H97zM27 38h14v13H27zM55 38h14v13H55zM83 37h14v13H83z" fill="#111"/>');
    },
    rocket: function () {
      return svg('<g transform="rotate(40 60 60)"><path d="M60 8c18 14 22 40 16 70H44c-6-30-2-56 16-70z" fill="#e8edf2" stroke="#55626b" stroke-width="3"/><circle cx="60" cy="42" r="9" fill="#4cc9f0" stroke="#0a5f80" stroke-width="3"/>' +
        '<path d="M44 66l-14 18 16-2zM76 66l14 18-16-2z" fill="#d7263d"/><path d="M48 80c4 18 8 26 12 30 4-4 8-12 12-30z" fill="#ff8a1f"/><path d="M54 80c2 10 4 16 6 18 2-2 4-8 6-18z" fill="#ffd34d"/></g>');
    },
    oil: function () {
      return svg('<path d="M14 82c0-14 20-14 30-10 8-12 30-14 40-2 12-4 26 2 24 14-2 12-22 18-46 18S14 96 14 82z" fill="#1c1c22"/>' +
        '<path d="M30 80c10-4 22-2 30 2M70 76c8-2 18 0 22 4" stroke="#6a5acd" stroke-width="3" fill="none" opacity="0.7"/><path d="M40 86c10 2 20 2 30 0" stroke="#ff7ad9" stroke-width="2" fill="none" opacity="0.6"/>' +
        '<path d="M60 18c8 12 12 20 12 28a12 12 0 0 1-24 0c0-8 4-16 12-28z" fill="#1c1c22"/><path d="M56 40c0-4 2-8 4-10" stroke="#555" stroke-width="3" fill="none"/>');
    },
    cone: function () {
      return svg('<path d="M60 12l26 80H34z" fill="#ff8a1f" stroke="#b04a00" stroke-width="3"/><path d="M48 50h24l5 16H43z" fill="#fff"/><path d="M22 92h76v14H22z" fill="#ff8a1f" stroke="#b04a00" stroke-width="3"/>' +
        '<path d="M14 34l12 6M106 34l-12 6M20 18l10 10M100 18L90 28" stroke="#ffd34d" stroke-width="4" stroke-linecap="round"/>');
    },
    pit: function () {
      return svg('<rect x="20" y="20" width="80" height="80" rx="16" fill="#2b2b33" stroke="#ffd23f" stroke-width="4"/><rect x="42" y="40" width="12" height="40" rx="3" fill="#ffd23f"/><rect x="66" y="40" width="12" height="40" rx="3" fill="#ffd23f"/>');
    },
    // ---------- Christmas ----------
    gift: function () {
      return svg('<rect x="20" y="48" width="80" height="58" rx="5" fill="#d7263d" stroke="#8f1525" stroke-width="3"/><rect x="14" y="34" width="92" height="18" rx="4" fill="#e63946" stroke="#8f1525" stroke-width="3"/>' +
        '<path d="M54 34h12v72H54z" fill="#ffc94a"/><path d="M60 34c-18-24-36-8-18 0M60 34c18-24 36-8 18 0" stroke="#ffc94a" stroke-width="7" fill="none" stroke-linecap="round"/>' + spark(104, 22) + spark(14, 24, 0.8));
    },
    coal: function () {
      return svg('<path d="M24 78l14-30 30-6 26 18 4 30-28 14-36-4z" fill="#2a2a30" stroke="#111" stroke-width="3"/><path d="M38 48l16 20 14-26M54 68l26 22M24 78l30-10" stroke="#3d3d45" stroke-width="3" fill="none"/>' +
        '<path d="M46 56l6 6" stroke="#6b6b75" stroke-width="3" stroke-linecap="round"/><path d="M20 30c4-6 10-6 12 0M88 24c4-6 10-6 12 0" stroke="#9aa5ad" stroke-width="3" fill="none"/>');
    },
    sleigh: function () {
      return svg('<path d="M10 90h90c8 0 12-6 10-12" stroke="#ffc94a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M22 86l-6-34c14 0 22 8 28 16h40l14-16c4 22-6 34-22 34z" fill="#d7263d" stroke="#8f1525" stroke-width="3"/>' +
        '<path d="M30 88v-6M86 88v-6" stroke="#ffc94a" stroke-width="4"/>' + '<rect x="46" y="44" width="22" height="18" rx="3" fill="#2f9e5b"/><rect x="54" y="44" width="6" height="18" fill="#ffc94a"/>' + spark(102, 22) + spark(80, 14, 0.7));
    },
    snowflake: function () {
      var arm = '<path d="M60 60V14M60 26l-10-10M60 26l10-10M60 42l-12-8M60 42l12-8" stroke="#bfe9ff" stroke-width="6" stroke-linecap="round" fill="none"/>';
      return svg([0, 60, 120, 180, 240, 300].map(function (a) { return '<g transform="rotate(' + a + ' 60 60)">' + arm + '</g>'; }).join('') + '<circle cx="60" cy="60" r="8" fill="#fff"/>');
    },
    tree: function () {
      return svg('<path d="M60 10l26 34H72l22 28H78l20 26H22l20-26H26l22-28H34z" fill="#2f9e5b" stroke="#1d6b3c" stroke-width="3"/><rect x="52" y="98" width="16" height="14" fill="#7a4b1f"/>' +
        '<path d="M60 2l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#ffc94a"/><circle cx="48" cy="50" r="4" fill="#d7263d"/><circle cx="72" cy="66" r="4" fill="#ffc94a"/><circle cx="44" cy="82" r="4" fill="#4cc9f0"/><circle cx="78" cy="88" r="4" fill="#d7263d"/>');
    },
    // ---------- game show ----------
    spotlight: function () {
      return svg('<path d="M48 14h24l30 96H18z" fill="#fff6c0" opacity="0.35"/><rect x="44" y="6" width="32" height="18" rx="4" fill="#3b4150"/><ellipse cx="60" cy="100" rx="42" ry="10" fill="#fff6c0" opacity="0.6"/>' +
        '<path d="M60 48l8 16 18 2-13 12 4 18-17-9-17 9 4-18-13-12 18-2z" fill="#ffc94a" stroke="#b07a00" stroke-width="2"/>');
    },
    buzzer: function () {
      return svg('<ellipse cx="60" cy="88" rx="44" ry="14" fill="#3b4150"/><rect x="16" y="64" width="88" height="24" fill="#3b4150"/><ellipse cx="60" cy="64" rx="44" ry="14" fill="#55626b"/>' +
        '<ellipse cx="60" cy="56" rx="30" ry="10" fill="#d7263d"/><path d="M30 56c0-14 60-14 60 0" fill="#ff5a5f"/><path d="M14 22l12 12M106 22L94 34M60 8v14" stroke="#ff5a5f" stroke-width="5" stroke-linecap="round"/>');
    },
    double: function () {
      return svg('<rect x="10" y="26" width="100" height="68" rx="12" fill="#1b1f6b" stroke="#ffd23f" stroke-width="4"/><text x="60" y="72" text-anchor="middle" font-size="38" font-weight="900" fill="#ffd23f" font-family="sans-serif">×2</text>' + spark(104, 18) + spark(16, 104, 0.9));
    },
    // ---------- brain lab ----------
    bulb: function () {
      return svg('<path d="M60 10a32 32 0 0 0-20 57c4 4 6 9 6 14h28c0-5 2-10 6-14a32 32 0 0 0-20-57z" fill="#ffe27a" stroke="#b07a00" stroke-width="3"/><rect x="46" y="84" width="28" height="18" rx="4" fill="#9aa5ad"/>' +
        '<path d="M52 66c0-12 16-12 16 0M56 66V52M64 66V52" stroke="#b07a00" stroke-width="3" fill="none"/><path d="M14 40h10M96 40h10M24 14l8 8M96 14l-8 8" stroke="#ffd34d" stroke-width="4" stroke-linecap="round"/>');
    },
    flask: function () {
      return svg('<path d="M48 12h24M52 12v30L22 96c-4 8 2 14 10 14h56c8 0 14-6 10-14L68 42V12" fill="#e8edf2" stroke="#55626b" stroke-width="4"/><path d="M34 78h52l10 18c2 6-2 10-8 10H32c-6 0-10-4-8-10z" fill="#4ef0c8"/>' +
        '<circle cx="50" cy="90" r="4" fill="#fff"/><circle cx="66" cy="84" r="3" fill="#fff"/><path d="M78 20c6-6 12-4 14 2M30 26c-4-6-10-6-12 0" stroke="#9aa5ad" stroke-width="3" fill="none"/>');
    },
    brain: function () {
      return svg('<path d="M58 22c-14-8-32 2-30 16-14 4-14 24-2 30-4 14 10 26 22 20 6 10 22 8 26-2 12 6 26-4 22-18 12-6 10-26-4-30 0-14-18-22-30-14" fill="#ff9ec7" stroke="#b0457a" stroke-width="3"/>' +
        '<path d="M58 22v74M42 40c6 4 10 4 16 0M40 62c8 6 12 6 18 0M74 44c-6 4-10 4-16 0M78 66c-8 6-12 6-20 0" stroke="#b0457a" stroke-width="3" fill="none"/>' + spark(104, 18) + spark(16, 18, 0.8));
    },
    chips: function () {
      var chip = function (y, c) { return '<ellipse cx="60" cy="' + (y + 6) + '" rx="34" ry="11" fill="#111" opacity="0.3"/><ellipse cx="60" cy="' + y + '" rx="34" ry="11" fill="' + c + '" stroke="#fff" stroke-width="3" stroke-dasharray="8 6"/>'; };
      return svg(chip(96, '#d7263d') + chip(80, '#2f9e5b') + chip(64, '#1f5a96') + chip(48, '#ffc94a') + '<text x="60" y="36" text-anchor="middle" font-size="18" font-weight="900" fill="#fff" font-family="sans-serif">ALL IN</text>');
    },
    // ---------- arena / library / quill ----------
    swords: function () {
      return svg('<path d="M24 22l60 70" stroke="#d8dee6" stroke-width="7"/><path d="M96 22L36 92" stroke="#d8dee6" stroke-width="7"/><path d="M78 82l14 14M42 82l-14 14" stroke="#8a5a2b" stroke-width="8" stroke-linecap="round"/>' +
        '<path d="M72 76h16M48 76H32" stroke="#ffc94a" stroke-width="6" stroke-linecap="round"/>' + spark(60, 44));
    },
    book: function () {
      return svg('<path d="M60 30c-14-10-32-10-46-4v70c14-6 32-6 46 4 14-10 32-10 46-4V26c-14-6-32-6-46 4z" fill="#fbf7ef" stroke="#8a5a2b" stroke-width="4"/>' +
        '<path d="M60 30v70" stroke="#8a5a2b" stroke-width="3"/><path d="M24 40c10-2 20-2 28 2M24 52c10-2 20-2 28 2M24 64c10-2 20-2 28 2M68 42c8-4 18-4 28-2M68 54c8-4 18-4 28-2M68 66c8-4 18-4 28-2" stroke="#c9a36a" stroke-width="3" fill="none"/>' + spark(104, 16) + spark(16, 16, 0.8));
    },
    quill: function () {
      return svg('<path d="M98 10C60 18 38 46 30 86l10 2C50 54 70 32 98 10z" fill="#fbf7ef" stroke="#9cb3c9" stroke-width="3"/><path d="M98 10C80 30 60 50 40 88" stroke="#9cb3c9" stroke-width="2" fill="none"/>' +
        '<path d="M30 86l-8 22 16-16z" fill="#142a4a"/><path d="M20 106c14-4 30-4 46 0" stroke="#142a4a" stroke-width="4" stroke-linecap="round" fill="none"/>' + spark(30, 30));
    },
    scroll: function () {
      return svg('<rect x="22" y="24" width="76" height="72" fill="#f0d9a6" stroke="#9c7a45" stroke-width="3"/><rect x="14" y="16" width="92" height="12" rx="6" fill="#c9a36a" stroke="#9c7a45" stroke-width="3"/><rect x="14" y="92" width="92" height="12" rx="6" fill="#c9a36a" stroke="#9c7a45" stroke-width="3"/>' +
        '<path d="M34 44h52M34 56h44M34 68h50M34 80h30" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/>');
    },
  };
  window.KruFxArt = A;
})();
