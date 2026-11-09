# WIP: harder reading games (Henry, Nov 9) — not merged

Henry asked:
- Read & Remember, Story Order, Spot the Mistakes: M.1 gets the old M.2 difficulty, M.2 gets old M.3, M.3 gets NEW harder stories.
- Read & Remember: questions go easy (1) → medium (2) → hard (3); read timer and answer timer each adjustable ±15 s; remove the "Remember the title" secret bonus card.
- All three games: challenge questions and/or challenge rounds.

Plan (decided):
- Do NOT shift public/games/shared/stories.json levels (True or False Race also uses it and Henry didn't ask). Add a new key "M.4" (50 harder stories, complete: 5 sentences, 4 tf with 2 true, 3 questions e/m/h, 3 mistakes in 3 sentences), and in the three games map levels up: items = stories[{M.1:'M.2', M.2:'M.3', M.3:'M.4'}[level]].
- Fix typo "Chiang Ruby" → "Chiang Rai" in stories.json (7 places, story m2-7).
- plans/wip/reading-questions.cjs = new questions for the old M.2 and M.3 stories: per id [index of old question kept as #1 (easy), medium q, a, hard q, a]. Apply to stories.json `questions`.
- Card engine (public/games/shared/kru-cards.js): `timer.stepSecs: [read, answer]` (S.secsBy, ± buttons change the current step's time; labels use cfg.timer.adjust instead of hardcoded 10); `challengeRound: { every: 4, text, timer: 0.5, double: true }` → banner on the card, o.challenge passed to card(), points ×2.
- Challenge twists: Read & Remember = half reading time; Story Order = one sentence hidden ("?"), say what's missing; Spot the Mistakes = number of mistakes not shown. All double points. Add a How to play slide in each.
- Update tests/phase4.test.ts (bank test incl. M.4), check every card fits 712×354 at ≥18 px in the browser, then PR + merge (rule 7).
