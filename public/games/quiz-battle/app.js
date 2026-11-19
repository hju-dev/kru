/* Battle of Wits (Henry, Nov 19; was Quiz Battle): teams write answers on one board per team. Rounds of 5 questions,
   30 / 45 / 60 s each, the next question comes by itself; then the class checks the answers together (answer +
   explanation), hidden bonuses are revealed, and each team's points are added. The screen and the flow are the
   shared Battle engine (games/shared/kru-battle.js).
   Question sets: built-in (content.json, 5 per level, each question with a "why"), "All topics, shuffled", the unit
   picked on the setup screen, and Henry's own sets from the Questions tab of his Sheet (session.questions). */
(function () {
  'use strict';
  var contentReady = fetch('content.json').then(function (r) { return r.json(); });
  KruBattle.start({
    theme: 'arena',
    title: 'Battle of Wits',
    logo: 'Battle of <b>Wits</b>',
    load: function (session) {
      return Promise.all([contentReady, KruQuiz.unit(session)]).then(function (both) {
        var content = both[0], unit = both[1], sets = [];
        var level = content[session.level] ? session.level : 'M.2';
        var builtIn = content[level].sets;
        if (unit) {
          var all = [].concat.apply([], unit.sets.map(function (s) { return s.questions; }));
          sets.push({ key: 'uall', group: unit.title, name: unit.title.replace(/^.*Unit \d+[^:]*: /, '') + ': all, shuffled', questions: all });
          unit.sets.forEach(function (s, i) { sets.push({ key: 'u:' + i, group: unit.title, name: s.name, questions: s.questions }); });
        }
        sets.push({ key: 'all', group: 'Built in', name: 'All topics, shuffled', questions: [].concat.apply([], builtIn.map(function (s) { return s.questions; })) });
        builtIn.forEach(function (s, i) { sets.push({ key: 'b:' + i, group: 'Built in', name: s.name, questions: s.questions }); });
        var sheet = Array.isArray(session.questions) ? session.questions.filter(function (s) { return s && Array.isArray(s.questions) && s.questions.length; }) : [];
        sheet.forEach(function (s, i) { sets.push({ key: 's:' + i, group: 'From your Sheet', name: s.name, questions: s.questions }); });
        return { sets: sets, hidden: content.hidden, intro: KruIntro.forLevel(content, level), problems: Array.isArray(session.questionProblems) ? session.questionProblems : [] };
      });
    },
  });
})();
