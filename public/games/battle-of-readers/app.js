/* Battle of Readers (Henry, Nov 19; replaces Reading Island): the Battle routine with a story each round.
   Read the story together (45-120 s, then it goes away; 📖 Story shows it again), then 5 questions written on one
   board per team: 2 true or false, 2 questions about the story, 1 "find the mistake". Then the class checks the
   answers, hidden bonuses, the tally. Stories: games/shared/stories.json (50 per level; "Harder stories" = the
   next level up). The 5 questions are picked at random, the same ones for the whole game (seeded by the session). */
(function () {
  'use strict';
  var UP = { 'M.1': 'M.2', 'M.2': 'M.3', 'M.3': 'M.4' };
  var storiesReady = fetch('/games/shared/stories.json').then(function (r) { return r.json(); });
  var contentReady = fetch('content.json').then(function (r) { return r.json(); });

  /** A small seeded random (so a reload keeps the same questions). */
  function seeded(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  function pick(list, n, rand) {
    var a = list.slice();
    for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(rand() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; }
    return a.slice(0, n);
  }
  /** One story = one round: the story to read, then 5 questions. */
  function round(st, rand) {
    var qs = [];
    pick(st.tf || [], 2, rand).forEach(function (t) {
      qs.push({ q: 'True or false?', quote: t.s, hint: 'Write T (true) or F (false)', answer: t.a ? 'True' : 'False',
        why: t.a ? 'The story says this.' : 'The story says: ' + (t.fix || 'something different') });
    });
    pick(st.questions || [], 2, rand).forEach(function (q) {
      qs.push({ q: q.q, hint: 'Write a short answer', answer: q.a, why: '' });
    });
    var m = pick(st.mistakes || [], 1, rand)[0];
    if (m && st.sentences[m.i] && st.sentences[m.i].indexOf(m.right) >= 0) {
      qs.push({ q: 'Find the mistake. Write the correct word.', quote: st.sentences[m.i].replace(m.right, m.wrong), hint: 'Write the correct word',
        answer: m.right, why: '"' + m.wrong + '" should be "' + m.right + '".' });
    }
    return { read: { title: st.title, sentences: st.sentences }, questions: pick(qs, qs.length, rand) };
  }

  KruBattle.start({
    theme: 'library',
    title: 'Battle of Readers',
    logo: 'Battle of <b>Readers</b>',
    reading: true,
    load: function (session) {
      return Promise.all([storiesReady, contentReady]).then(function (both) {
        var stories = both[0], content = both[1];
        var level = stories[session.level] ? session.level : 'M.2', up = UP[level];
        var rand = seeded(String(session.id || '') + level);
        var sets = [{ key: 'lv', group: 'Stories', name: 'Stories (' + level + ')', rounds: stories[level].map(function (s) { return round(s, rand); }) }];
        if (stories[up]) sets.push({ key: 'up', group: 'Stories', name: 'Harder stories', rounds: stories[up].map(function (s) { return round(s, rand); }) });
        return { sets: sets, hidden: content.hidden, intro: KruIntro.forLevel(content, level) };
      });
    },
  });
})();
