/* True or False Race: a story stays on the board; one statement at a time. Teams show True or False fast.
   Four statements per story, kept together (stories in a new order every game). */
(function () {
  'use strict';
  function shuffle(a) { for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var x = a[j]; a[j] = a[k]; a[k] = x; } return a; }
  KruCards.start({
    title: 'True or False Race',
    logo: 'True or False <b>Race</b>',
    extra: '/games/shared/stories.json',
    compact: true,
    items: function (c, level, stories) {
      var out = [];
      stories[level].forEach(function (st) { st.tf.forEach(function (t, n) { out.push({ story: st, t: t, n: n }); }); });
      return out;
    },
    // stories shuffled, and the four statements of each story shuffled, but kept together
    order: function (items) {
      var groups = {};
      items.forEach(function (it, i) { (groups[it.story.id] = groups[it.story.id] || []).push(i); });
      return shuffle(Object.keys(groups)).reduce(function (acc, id) { return acc.concat(shuffle(groups[id])); }, []);
    },
    bonusKey: function (it) { return it.story.id; },
    reveal: true,
    timer: { secs: 20, options: [10, 15, 20, 30, 45] },
    points: [{ d: -1, label: '−1' }, { d: 1, label: '+1 Correct' }, { d: 2, label: '+2 First + correct' }],
    card: function (it, o) {
      var t = it.t;
      // after Reveal the story steps aside: the answer (and the true fact) get the room
      var story = o.revealed ? '<p class="story small"><b class="story-title">' + o.esc(it.story.title) + '</b></p>'
        : '<p class="story small" data-fit="20,18"><b class="story-title">' + o.esc(it.story.title) + '.</b> ' + o.esc(it.story.sentences.join(' ')) + '</p>';
      return story +
        '<div class="tf"><span class="stmt" data-fit="30,20">' + o.esc(t.s) + '</span>' +
        (o.revealed ? '<span class="verdict ' + (t.a ? 'yes' : 'no') + '">' + (t.a ? 'TRUE' : 'FALSE') + '</span>' : '<span class="verdict wait">True or False?</span>') + '</div>' +
        (o.revealed && !t.a ? '<div class="fix" data-fit="28,18">✓ ' + o.esc(t.fix) + '</div>' : '');
    },
  });
})();
