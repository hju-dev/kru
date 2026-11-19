/* Battle of Writers (Henry, Nov 19; replaces Sentence Builder and Sentence Scramble Race): the Battle routine with
   writing tasks, written on one board per team. Six kinds of task:
     🔀 put the words in order    ✏️ one sentence with 3 given words    🔧 fix the mistake (from the stories)
     ❗ add capitals and punctuation    🔗 join two sentences with a linking word    🎨 add describing words
   Sets: "All tasks, mixed" (a few of each kind), one set per kind, and a lesson pack's own scramble sentences. */
(function () {
  'use strict';
  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  var storiesReady = fetch('/games/shared/stories.json').then(function (r) { return r.json(); });

  function seeded(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  function shuffle(a, rand) {
    a = a.slice();
    for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(rand() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a;
  }
  /** "I played soccer." -> the words mixed up, no capital at the start (except I) and no end mark. */
  function scrambled(text, rand) {
    var words = text.replace(/[.!?]+$/, '').split(/\s+/);
    if (words[0] !== 'I' && !/^I'/.test(words[0])) words[0] = words[0].charAt(0).toLowerCase() + words[0].slice(1);
    var mixed = shuffle(words, rand);
    for (var t = 0; t < 5 && mixed.join(' ') === words.join(' '); t++) mixed = shuffle(words, rand);
    return mixed.join(' / ');
  }
  /** "I'm sorry, Ben." -> "im sorry ben": no capitals, no punctuation. */
  function stripped(text) { return text.toLowerCase().replace(/[.,!?;:'’"]/g, '').replace(/\s+/g, ' ').trim(); }
  function punctWhy(text) {
    var parts = ['a capital letter at the start'];
    if (/[A-Z]/.test(text.slice(1))) parts.push('capitals for names and "I"');
    if (/,/.test(text)) parts.push('a comma');
    if (/['’]/.test(text)) parts.push('an apostrophe');
    parts.push(/\?$/.test(text) ? 'a question mark at the end' : /!$/.test(text) ? 'an exclamation mark at the end' : 'a period at the end');
    return 'Check: ' + parts.join(', ') + '.';
  }

  var KINDS = {
    scramble: function (x, rand) { return { q: 'Put the words in order.', quote: scrambled(x.text, rand), hint: 'Write the whole sentence', answer: x.text, why: x.focus ? 'Grammar: ' + x.focus + '.' : '' }; },
    build: function (x) { return { q: 'Write ONE sentence with all 3 words.', quote: x.words.join('  ·  '), hint: 'Use all 3 words', answer: 'Any good sentence, e.g. ' + x.example, why: 'Check: all 3 words, a capital letter and a period.' }; },
    fix: function (x) { return { q: 'Find the mistake. Write the sentence correctly.', quote: x.wrong, hint: 'Write the whole sentence', answer: x.right, why: '"' + x.bad + '" should be "' + x.good + '".' }; },
    punctuate: function (x) { return { q: 'Add capital letters and punctuation.', quote: stripped(x.text), hint: 'Write it correctly', answer: x.text, why: punctWhy(x.text) }; },
    combine: function (x) { return { q: 'Join the two sentences with "' + x.link + '".', quote: x.a + '  +  ' + x.b, hint: 'Write ONE sentence', answer: x.answer, why: '"' + x.link + '" joins the two ideas.' }; },
    describe: function (x) { return { q: 'Make it better: add describing words.', quote: x.s, hint: 'Add at least 2 describing words', answer: 'Any good answer, e.g. ' + x.answer, why: 'Describing words (adjectives) tell us more: size, color, feeling…' }; },
  };
  var NAMES = { scramble: '🔀 Put the words in order', build: '✏️ Build a sentence', fix: '🔧 Fix the mistake', punctuate: '❗ Punctuate it', combine: '🔗 Join two sentences', describe: '🎨 Describe it' };

  KruBattle.start({
    title: 'Battle of Writers',
    logo: 'Battle of <b>Writers</b>',
    load: function (session) {
      return Promise.all([contentReady, storiesReady, KruQuiz.unit(session)]).then(function (all) {
        var c = all[0], stories = all[1], unit = all[2];
        var level = c[session.level] ? session.level : 'M.2', L = c[level];
        var rand = seeded(String(session.id || '') + level);
        // "fix the mistake" from the planted mistakes in this level's stories (a sentence with one wrong word)
        var fixes = [];
        (stories[level] || []).forEach(function (st) {
          (st.mistakes || []).forEach(function (m) {
            var s = st.sentences[m.i];
            if (s && s.indexOf(m.right) >= 0) fixes.push({ wrong: s.replace(m.right, m.wrong), right: s, bad: m.wrong, good: m.right });
          });
        });
        var src = { scramble: L.scramble, build: L.build, fix: fixes, punctuate: L.scramble, combine: L.combine, describe: L.describe };
        var make = function (kind, list) { return list.map(function (x) { return KINDS[kind](x, rand); }); };
        // all tasks, mixed: up to 12 of each kind, so no kind takes over
        var mixed = [];
        Object.keys(src).forEach(function (k) { mixed = mixed.concat(make(k, shuffle(src[k], rand).slice(0, 12))); });
        var sets = [];
        var mine = unit && Array.isArray(unit.scramble) ? unit.scramble.filter(function (x) { return x && x.text; }) : [];
        if (mine.length) {
          sets.push({ key: 'u-order', group: unit.title, name: '🔀 Put the words in order', questions: make('scramble', mine) });
          sets.push({ key: 'u-punct', group: unit.title, name: '❗ Punctuate it', questions: make('punctuate', mine) });
        }
        sets.push({ key: 'mixed', group: 'Built in', name: 'All tasks, mixed', questions: mixed });
        Object.keys(src).forEach(function (k) { sets.push({ key: k, group: 'Built in', name: NAMES[k], questions: make(k, src[k]) }); });
        return { sets: sets, hidden: c.hidden, intro: KruIntro.forLevel(c, level) };
      });
    },
  });
})();
