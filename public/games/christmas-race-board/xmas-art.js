/* Christmas Dash (Henry, Nov 19): drawn pictures. A Santa with a white beard (the same on every device),
   a Santa hat for the podium, and a picture for every rebus answer (content.json "pic"), shown on Reveal.
   Each is an SVG string, viewBox 0 0 120 120. */
(function () {
  'use strict';
  var W = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  function svg(b) { return W + b + '</svg>'; }
  var snowGround = '<path d="M0 100c20-8 40-8 60 0s40 8 60 0v20H0z" fill="#eef6ff"/>';
  var flakes = '<g fill="#fff"><circle cx="18" cy="20" r="2.5"/><circle cx="96" cy="16" r="2"/><circle cx="104" cy="44" r="2.5"/><circle cx="12" cy="56" r="2"/><circle cx="60" cy="10" r="2"/></g>';
  function snowman(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<circle cx="0" cy="22" r="22" fill="#fff" stroke="#bcd3e6" stroke-width="2"/><circle cx="0" cy="-12" r="16" fill="#fff" stroke="#bcd3e6" stroke-width="2"/>' +
      '<circle cx="-5" cy="-15" r="2" fill="#222"/><circle cx="5" cy="-15" r="2" fill="#222"/><path d="M0-11l12 3-12 2z" fill="#ff8a1f"/>' +
      '<path d="M-14-2h28" stroke="#d7263d" stroke-width="5" stroke-linecap="round"/><path d="M8 0v12" stroke="#d7263d" stroke-width="5"/>' +
      '<circle cx="0" cy="14" r="2.2" fill="#222"/><circle cx="0" cy="24" r="2.2" fill="#222"/>' +
      '<path d="M-12-26h24v-4h-6v-12h-12v12h-6z" fill="#222"/></g>';
  }
  function tree(x, y, s, star) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path d="M0-44l22 30h-10l18 24h-12l16 22h-68l16-22h-12l18-24h-10z" fill="#2f9e5b" stroke="#1d6b3c" stroke-width="2"/>' +
      '<rect x="-5" y="32" width="10" height="10" fill="#7a4b1f"/><circle cx="-8" cy="-6" r="3" fill="#d7263d"/><circle cx="9" cy="10" r="3" fill="#ffc94a"/><circle cx="-12" cy="22" r="3" fill="#4cc9f0"/><circle cx="14" cy="26" r="3" fill="#d7263d"/>' +
      (star ? '<path d="M0-54l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffc94a"/>' : '') + '</g>';
  }
  function gift(x, y, s, c, r) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><rect x="-20" y="-16" width="40" height="32" rx="3" fill="' + c + '"/><rect x="-23" y="-22" width="46" height="9" rx="2" fill="' + c + '"/>' +
      '<rect x="-4" y="-22" width="8" height="38" fill="' + r + '"/><path d="M0-22c-12-14-22-4-10 0M0-22c12-14 22-4 10 0" stroke="' + r + '" stroke-width="4" fill="none"/></g>';
  }
  function santaFace(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<path d="M-30-8c4-34 52-40 62-6l14 26-10 4-10-18z" fill="#d7263d"/><circle cx="46" cy="20" r="7" fill="#fff"/>' +
      '<rect x="-34" y="-12" width="66" height="14" rx="7" fill="#fff"/>' +
      '<circle cx="0" cy="14" r="22" fill="#f6c9a6"/>' +
      '<path d="M-26 12c-4 30 18 46 26 46s30-16 26-46c-6 10-12 14-26 14s-20-4-26-14z" fill="#fff" stroke="#dfe6ee" stroke-width="2"/>' +
      '<path d="M-14 22c6-6 12-4 14 0 2-4 8-6 14 0-4 6-10 4-14 1-4 3-10 5-14-1z" fill="#fff" stroke="#dfe6ee" stroke-width="1.5"/>' +
      '<circle cx="-8" cy="10" r="2.5" fill="#222"/><circle cx="8" cy="10" r="2.5" fill="#222"/><circle cx="0" cy="17" r="4" fill="#ef8f8f"/>' +
      '<path d="M-13 3l7-2M13 3l-7-2" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>';
  }
  function deer(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path d="M-30 6c0-14 12-20 30-20s26 6 26 18l-4 26h-6l-2-16h-30l-4 16h-6z" fill="#9a6232"/>' +
      '<path d="M20-12l10-26 12 2-6 8 8 4-14 4z" fill="#9a6232"/><path d="M28-34l-6-14M28-34l8-12M22-44l-8-4M36-42l8-6" stroke="#6b3d1a" stroke-width="3.5" stroke-linecap="round"/>' +
      '<circle cx="38" cy="-30" r="1.8" fill="#222"/><circle cx="44" cy="-24" r="4" fill="#d7263d"/></g>';
  }
  var P = {
    santa: function () { return svg(santaFace(60, 46, 1.25)); },
    hat: function () {
      return svg('<path d="M14 92c6-50 40-74 78-58l10 34-14 2-6-18c-18-8-40 10-46 40z" fill="#d7263d"/><circle cx="96" cy="74" r="10" fill="#fff"/><rect x="8" y="86" width="78" height="20" rx="10" fill="#fff"/>');
    },
    snowman: function () { return svg(flakes + snowGround + snowman(60, 64, 1.15)); },
    snowball: function () { return svg(flakes + snowGround + '<circle cx="60" cy="62" r="30" fill="#fff" stroke="#bcd3e6" stroke-width="3"/><path d="M44 50c6-8 16-10 24-8" stroke="#dfeaf4" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M92 40l12-6M94 54l14 0M90 28l8-10" stroke="#bcd3e6" stroke-width="4" stroke-linecap="round"/>'); },
    angel: function () { return svg('<rect width="120" height="120" fill="#eef6ff"/><path d="M60 24c-10 0-14 8-14 14s4 12 14 12 14-6 14-12-4-14-14-14zM46 52c-26-6-34 10-34 18 10-6 22-6 32 2l-6 34h44l-6-34c10-8 22-8 32-2 0-8-8-24-34-18z" fill="#cfe3f5" stroke="#9cbbd8" stroke-width="2.5"/>' + flakes); },
    globe: function () { return svg('<rect x="30" y="92" width="60" height="18" rx="4" fill="#8a5a2b"/><circle cx="60" cy="58" r="38" fill="#bfe9ff" fill-opacity="0.65" stroke="#7fb8d8" stroke-width="3"/><path d="M26 74c20-8 48-8 68 0-6 12-20 18-34 18s-28-6-34-18z" fill="#fff"/>' + tree(60, 70, 0.55, true) + '<circle cx="44" cy="36" r="2" fill="#fff"/><circle cx="78" cy="46" r="2" fill="#fff"/><path d="M40 30c6-6 14-8 20-8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>'); },
    candycane: function () { return svg('<path d="M48 108V44c0-28 40-28 40 0v6" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M48 108V44c0-28 40-28 40 0v6" stroke="#d7263d" stroke-width="14" fill="none" stroke-linecap="round" stroke-dasharray="9 9"/>'); },
    cocoa: function () { return svg('<path d="M28 50h56l-6 50H34z" fill="#d7263d"/><path d="M84 60c18 0 18 26 0 26" stroke="#d7263d" stroke-width="7" fill="none"/><ellipse cx="56" cy="50" rx="28" ry="7" fill="#6b3d1a"/><circle cx="48" cy="48" r="5" fill="#fff"/><circle cx="60" cy="46" r="5" fill="#fff"/><path d="M44 36c-4-8 4-12 0-20M58 34c-4-8 4-12 0-20M72 36c-4-8 4-12 0-20" stroke="#cfd6dd" stroke-width="3" fill="none" stroke-linecap="round"/>'); },
    snowstorm: function () { return svg('<rect width="120" height="120" fill="#cfe0ee"/><path d="M20 46c0-14 16-20 26-12 6-14 30-14 34 2 14-2 22 8 20 18H20z" fill="#7d93a8"/><g stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M30 70l-10 14M50 74l-10 14M70 70l-10 14M90 74l-10 14M40 92l-6 10M80 92l-6 10"/></g><path d="M8 60c20-6 30 6 50 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>'); },
    reindeer: function () { return svg(snowGround + deer(54, 70, 1.15)); },
    silentnight: function () { return svg('<rect width="120" height="120" rx="12" fill="#14213d"/><path d="M84 22a22 22 0 1 0 14 38 18 18 0 1 1-14-38z" fill="#ffd34d"/><g fill="#fff"><circle cx="20" cy="22" r="2"/><circle cx="42" cy="40" r="1.5"/><circle cx="60" cy="18" r="2"/><circle cx="24" cy="60" r="1.5"/></g><path d="M0 92c20-10 40-10 60 0s40 10 60 0v28H0z" fill="#eef6ff"/>' + tree(32, 86, 0.45, true) + '<path d="M70 88h20l-10-14z" fill="#3a2a1a"/><rect x="74" y="88" width="12" height="10" fill="#ffd34d"/>'); },
    giftwrap: function () { return svg('<rect x="16" y="20" width="56" height="80" rx="4" fill="#d7263d"/><path d="M16 34h56M16 52h56M16 70h56M16 88h56" stroke="#fff" stroke-width="3" stroke-dasharray="4 6"/>' + gift(84, 82, 0.9, '#2f9e5b', '#ffc94a') + '<path d="M66 18l20 20" stroke="#9aa5ad" stroke-width="5" stroke-linecap="round"/><circle cx="64" cy="16" r="6" fill="none" stroke="#9aa5ad" stroke-width="3"/>'); },
    pinecone: function () { return svg('<path d="M60 14c22 10 30 38 22 66-6 18-38 18-44 0-8-28 0-56 22-66z" fill="#8a5a2b" stroke="#4d2a0d" stroke-width="3"/><g fill="#b07a40" stroke="#4d2a0d" stroke-width="2"><path d="M44 40l16 8 16-8M40 56l20 10 20-10M42 72l18 10 18-10M48 88l12 6 12-6"/></g><path d="M60 14v-6" stroke="#4d2a0d" stroke-width="4"/>'); },
    fireplace: function () { return svg('<rect x="10" y="20" width="100" height="90" fill="#a0442c"/><path d="M10 34h100M10 52h100M10 70h100M10 88h100M40 20v14M80 20v14M28 34v18M64 34v18M98 34v18" stroke="#7a2f1d" stroke-width="2"/><rect x="4" y="14" width="112" height="10" fill="#6b3d1a"/><path d="M30 110V64a30 30 0 0 1 60 0v46z" fill="#1c1c22"/><path d="M60 104c-20 0-24-14-14-28 2 10 8 8 8 0 0-10 6-16 6-22 10 8 18 20 14 32-2 8-6 18-14 18z" fill="#ff8a1f"/><path d="M60 104c-10 0-12-8-6-16 4 6 6 2 6-4 6 6 8 12 6 16-1 3-3 4-6 4z" fill="#ffd34d"/><path d="M36 104h48" stroke="#6b3d1a" stroke-width="6"/>'); },
    candlelight: function () { return svg('<rect width="120" height="120" rx="12" fill="#22182e"/><circle cx="60" cy="40" r="30" fill="#ffd34d" fill-opacity="0.25"/><rect x="48" y="52" width="24" height="54" rx="4" fill="#fbf7ef"/><path d="M60 50v-6" stroke="#222" stroke-width="2"/><path d="M60 18c8 10 8 20 0 26-8-6-8-16 0-26z" fill="#ffb03a"/><path d="M60 28c4 6 4 10 0 14-4-4-4-8 0-14z" fill="#fff4b0"/><path d="M38 106h44" stroke="#c9a36a" stroke-width="6" stroke-linecap="round"/>'); },
    mistletoe: function () { return svg('<path d="M60 8v30" stroke="#d7263d" stroke-width="4"/><path d="M50 30c4 6 16 6 20 0" stroke="#d7263d" stroke-width="5" fill="none"/><g fill="#3fbf7f" stroke="#1d6b3c" stroke-width="2"><path d="M60 40c-26-4-40 10-38 24 16 2 32-8 38-24z"/><path d="M60 40c26-4 40 10 38 24-16 2-32-8-38-24z"/><path d="M60 40c-10 18-6 40 6 46 8-16 4-34-6-46z"/></g><circle cx="56" cy="46" r="5" fill="#fff" stroke="#cfd6dd"/><circle cx="66" cy="46" r="5" fill="#fff" stroke="#cfd6dd"/><circle cx="61" cy="54" r="5" fill="#fff" stroke="#cfd6dd"/>'); },
    snowfall: function () { return svg('<rect width="120" height="120" rx="12" fill="#2a4b6b"/><g fill="#fff"><circle cx="16" cy="20" r="4"/><circle cx="46" cy="12" r="3"/><circle cx="80" cy="24" r="5"/><circle cx="104" cy="12" r="3"/><circle cx="30" cy="44" r="5"/><circle cx="64" cy="48" r="3"/><circle cx="96" cy="52" r="4"/><circle cx="14" cy="72" r="3"/><circle cx="50" cy="76" r="4"/><circle cx="86" cy="80" r="3"/></g><path d="M0 96c20-8 40-8 60 0s40 8 60 0v24H0z" fill="#fff"/>'); },
    icicle: function () { return svg('<rect x="0" y="8" width="120" height="16" fill="#8a5a2b"/><path d="M0 22h120v6c-6 0-6 4-12 4s-6-4-12-4-6 4-12 4-6-4-12-4-6 4-12 4-6-4-12-4-6 4-12 4-6-4-12-4-6 4-12 4-6-4-12-4z" fill="#fff"/><g fill="#bfe9ff" stroke="#7fb8d8" stroke-width="2"><path d="M14 30l6 54 6-54z"/><path d="M38 30l5 36 5-36z"/><path d="M60 30l7 70 7-70z"/><path d="M86 30l5 42 5-42z"/><path d="M104 30l4 28 4-28z"/></g><path d="M64 40l2 30" stroke="#fff" stroke-width="2"/>'); },
    mitten: function () { return svg('<path d="M40 100V44c0-22 14-34 30-34s26 14 24 34l-4 28c8-8 18-4 18 6 0 8-14 16-22 22z" fill="#d7263d" stroke="#8f1525" stroke-width="3"/><rect x="34" y="92" width="58" height="20" rx="6" fill="#fff" stroke="#cfd6dd" stroke-width="2"/><path d="M50 40l8 8 8-8 8 8M50 60l8 8 8-8 8 8" stroke="#fff" stroke-width="4" fill="none"/>'); },
    northpole: function () { return svg(snowGround + '<rect x="54" y="18" width="12" height="86" fill="#fff"/><path d="M54 26h12M54 42h12M54 58h12M54 74h12M54 90h12" stroke="#d7263d" stroke-width="8"/><circle cx="60" cy="16" r="8" fill="#ffc94a"/><path d="M66 40h38l-6 9 6 9H66z" fill="#2f9e5b"/><text x="70" y="54" font-size="11" font-weight="900" fill="#fff" font-family="sans-serif">N</text>'); },
    peppermint: function () { return svg('<path d="M18 60l-12-10v20zM102 60l12-10v20z" fill="#fff" stroke="#cfd6dd" stroke-width="2"/><circle cx="60" cy="60" r="40" fill="#fff" stroke="#cfd6dd" stroke-width="3"/><g fill="#d7263d"><path d="M60 60L60 20a40 40 0 0 1 28 12z"/><path d="M60 60L100 60a40 40 0 0 1-12 28z"/><path d="M60 60L60 100a40 40 0 0 1-28-12z"/><path d="M60 60L20 60a40 40 0 0 1 12-28z"/></g><circle cx="60" cy="60" r="8" fill="#fff"/>'); },
    santacoming: function () { return svg('<rect width="120" height="120" rx="12" fill="#14213d"/><g fill="#fff"><circle cx="16" cy="18" r="1.6"/><circle cx="104" cy="14" r="1.6"/><circle cx="60" cy="10" r="1.4"/></g><path d="M0 104h120v16H0z" fill="#eef6ff"/><g fill="#3a4d6b"><rect x="10" y="70" width="18" height="34"/><rect x="32" y="56" width="16" height="48"/><rect x="88" y="62" width="22" height="42"/></g><g fill="#ffd34d"><rect x="14" y="76" width="4" height="4"/><rect x="36" y="62" width="4" height="4"/><rect x="94" y="70" width="4" height="4"/><rect x="102" y="80" width="4" height="4"/></g><path d="M40 40h40l-4 10H36z" fill="#d7263d"/><path d="M34 52c10 2 40 2 50-4" stroke="#ffc94a" stroke-width="3" fill="none"/>' + santaFace(56, 30, 0.45) + deer(96, 40, 0.38)); },
    rockin: function () { return svg('<path d="M18 60a42 42 0 0 1 70-30" stroke="#ffc94a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M88 22v12H76" stroke="#ffc94a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M102 60a42 42 0 0 1-70 30" stroke="#ffc94a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M32 98V86h12" stroke="#ffc94a" stroke-width="5" fill="none" stroke-linecap="round"/>' + tree(60, 64, 0.9, true) + '<path d="M86 34l6-4v12" stroke="#fff" stroke-width="3" fill="none"/><circle cx="88" cy="44" r="3" fill="#fff"/>'); },
    whitechristmas: function () { return svg('<rect width="120" height="120" rx="12" fill="#dfeaf4"/><path d="M0 84c20-8 40-8 60 0s40 8 60 0v36H0z" fill="#fff"/>' + tree(42, 70, 0.75, true) + gift(88, 92, 0.7, '#d7263d', '#ffc94a') + '<path d="M12 36c4 0 6-4 10-4M90 20c4 0 6-4 10-4" stroke="#fff" stroke-width="3" fill="none"/><g fill="#fff"><circle cx="70" cy="30" r="3"/><circle cx="20" cy="56" r="2.5"/><circle cx="104" cy="50" r="3"/></g><text x="74" y="26" font-size="16" font-weight="900" fill="#7d93a8" font-family="sans-serif">z z</text>'); },
  };
  window.XmasArt = P;
  // pictures inside rebus lines ("[[santa]]") and for the answer on Reveal (question "pic")
  window.KruQuizPics = P;
  // the drawn Santa and hat as CSS pictures (question header, podium winner)
  var url = function (s) { return 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")'; };
  document.documentElement.style.setProperty('--santa', url(P.santa()));
  document.documentElement.style.setProperty('--hat', url(P.hat()));
})();
