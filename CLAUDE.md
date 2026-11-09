# Kru (ครู) — ESL classroom games PWA

**Source of truth: [HANDOFF.md](HANDOFF.md).** Read it before starting any phase. This file is the short version plus the working rules.

The owner (Henry) is an ESL teacher, not a full-time developer. Explain things in plain language. When asking him to test something, give exact steps for his iPhone.

## Working rules (always)

1. **Work phase by phase** (HANDOFF section 10). Finish one phase, run its acceptance checks, then **stop** and tell Henry what to test on his iPhone. Don't start the next phase until he says OK.
2. **No student data in the repo, ever.** Rosters, nicknames and results live only in Henry's private Google Sheet. Mock or demo data uses placeholder names only (`S1`…`S30`, "Student 12"). **Before every commit, run `npm run check:privacy`** and look at the staged diff. Never commit `.env*`, the Sheet URL, the script URL or the secret key.
3. **Tap-to-place is the primary way to sort students into teams.** Drag is secondary and must never get in the way of a tap (no accidental drags).
4. **Games are iPhone-landscape only** (iPhone 13 mini, 812 × 375 CSS px, minus safe areas). Don't build laptop layouts for games. **Admin screens (`/admin/*`) must work on the phone (375 portrait, 812 × 375 landscape) and a laptop (1440 × 900)**, with no horizontal page scroll.
5. **If something in the plan doesn't work on iOS, say so** and suggest an alternative. Don't quietly work around it.
6. The repo is the master copy of every game. Never overwrite repo files with versions from claude.ai chats; merge changes in by hand.
7. **Henry pre-approves commits, pushes and merges into `main`** (said 2026-11-04: "I give pre-approval to all merges and commits and pushes that claude code does"). No need to ask first, but only when `npm test`, `npm run lint`, `npm run build` and `npm run check:privacy` all pass. Work on the session's branch, open a PR, then merge it yourself; if GitHub's merge API fails, fast-forward `main` with `git push origin HEAD:main` (branch must be based on the latest `origin/main`). Never force-push `main` or rewrite its history. Pushing `main` deploys live, so after merging, tell Henry what changed, whether **Code.gs needs redeploying** (and do that bump in its own clearly flagged PR), and what to test. This does not change rule 1: still stop at the end of each phase for his iPhone test.

## Key decisions

| Topic | Decision |
|---|---|
| Stack | React + Vite + TypeScript + vite-plugin-pwa. Zustand for state, persisted with `idb-keyval` (IndexedDB). React Router. |
| Hosting | Vercel (same as the sister project Raeng), static only, no serverless functions. `start_url` / `scope` = `/`. |
| Back end | One private Google Sheet + Apps Script web app (`apps-script/Code.gs`). Henry deploys it: Execute as **Me**, access **Anyone**, protected by a secret key in Script Properties. |
| Auth | Henry only. The Sign-in screen stores the script URL + key on the device. Never in the repo. |
| Requests | POST bodies are JSON sent as `Content-Type: text/plain` (no CORS preflight); `fetch` with `redirect: "follow"`. Writes are idempotent (`submitResults` checks SessionID first) and use `LockService`. |
| Offline | Workbox precaches the shell, games, content packs and fonts. Bootstrap data (classes, rosters, team sets) is cached in IndexedDB. Results go to an IndexedDB outbox first and retry on launch, on `online` and every 60 s. |
| Results | One Sheet row per student per game. Every team member gets the team's points. Absent students get no row. Team 0 (teacher) is never written to Results, only to Sessions. Deletes are soft (`Deleted = TRUE`). |
| Games | Each game is its own page at `public/games/<slug>/index.html`, run in a full-viewport same-origin iframe. They talk to the shell only through the Kru SDK (`public/sdk/kru.js`, `postMessage`, check `event.origin`). Games never store rosters or hardcode classes. Every game runs on its own with `?mock=1`. |
| Levels | Every game has M.1 / M.2 / M.3. Content lives in `public/games/<slug>/content.json`, keyed by level. Doubtful content gets a `todo` field. |
| Fonts | Self-hosted only. No Google Fonts requests. |
| Language | **American English** everywhere in the app (Henry, 2026-11-04): color, favorite, vacation, movie, soccer, store, math, mom, on the weekend, period (not full stop). Tested in `tests/games.test.ts` ("American English"). |
| Game UI | Main controls ≥ 44 pt tall; student-facing text ≥ 18 px at 812 × 375; answers stay hidden until a deliberate Reveal tap; sound only after a tap. |

## iOS facts to design around (HANDOFF section 3)

- No Fullscreen API on iPhone; "full screen" means filling the standalone (home-screen) viewport.
- iOS ignores manifest `orientation`. Show a "Turn sideways" hint in portrait during play.
- `viewport-fit=cover` + `env(safe-area-inset-*)` everywhere. In landscape the notch side and home bar eat space.
- Wake Lock: request on game open and again on `visibilitychange`, and fail silently.
- Hosting headers must allow **same-origin iframes** (`frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`) and `connect-src` to `script.google.com` + `script.googleusercontent.com`. Don't copy Raeng's `vercel.json` as-is: it has `frame-ancestors 'none'` / `DENY`, which would break every game.

## Folder structure (target; built up phase by phase)

```
apps-script/        Code.gs (Sheet back end) + README.md (deploy steps for Henry)
public/
  games/<slug>/     index.html + content.json per game
  sdk/kru.js        shell ⇄ game contract
  fonts/            self-hosted fonts (or bundled via @fontsource)
  icons/, splash/   app icons and iPhone startup images
src/
  routes/           classroom screens (/, /setup, /play, /results) and admin (/admin/*)
  components/
  lib/              api client, storage, outbox
  store/            Zustand stores
games.json          game registry
scripts/            build helpers + check-privacy
HANDOFF.md          the full plan
```

## Commands

- `npm run dev` — local dev server
- `npm run build` — type-check + production build
- `npm run preview` — serve the production build (use this to test offline/PWA behaviour; the service worker only runs here, not in dev)
- `npm run lint`
- `npm test` — unit tests (Vitest), including `apps-script/Code.gs` pure functions loaded via `node:vm`
- `npm run check:privacy` — scan the repo for roster-like data, keys and private URLs. Also runs automatically as a git pre-commit hook (`.githooks/pre-commit`, enabled by `npm install` via the `prepare` script). Placeholder names go in `scripts/privacy-allowlist.txt`; real nicknames can go in the git-ignored `.privacy-denylist.txt`.
- `npm run icons` — regenerate icons and iPhone splash images from `public/kru-logo.svg`

Demo mode: on the Sign-in screen, "Try demo" uses made-up students (S1…S30) with no Sheet.

## Implementation notes

- Every Apps Script call is a POST (JSON as `text/plain`), including reads, so the key never appears in a URL. `doGet` returns only a "running" message, never data.
- Bootstrap data is cached in IndexedDB (`kru` DB, `kv` store via idb-keyval), not by the service worker.
- `Classes` tab (Class · Archived · DefaultTeamSize · Order) is optional; classes found only in `Rosters` still appear.
- Splash images are 1125×2436 / 2436×1125 (iPhone 13 mini is 375×812 CSS px @3x), not the 1080×2340 in HANDOFF.
- Service worker uses `registerType: 'prompt'`: updates wait for Henry to tap Reload in the toast.
- Sessions (setup → playing → review → submitted/discarded) live in IndexedDB (`sessions` key, `src/store/sessions.ts`). Results go to the IndexedDB `outbox` before any network call (`src/store/app.ts` `queueResults`).
- Team-setup logic is pure in `src/lib/teams.ts`; Sheet rows are built in `src/lib/results.ts` (`buildSubmission`, the Joe test lives in `tests/phase2.test.ts`). Ranks are among student teams only; the teacher team's points go to `Sessions.TeacherTeamPoints`.
- Drag (`src/lib/useChipDrag.ts`) needs a ~280 ms hold on touch, so taps and scrolling are never mistaken for drags.
- Games: plain HTML in `public/games/<slug>/` with **external** JS files (CSP `script-src 'self'` forbids inline scripts). Shared fonts/reset: `public/games/shared/kru-game.css`. `public/games/scoreboard/` is the reference game for the SDK.
- `tests/appsScriptWrites.test.ts` runs the real `Code.gs` against an in-memory fake Sheet (`tests/fakeSheet.ts`); bump `KRU_SCRIPT_VERSION` whenever Code.gs changes, since Henry must redeploy it.
- Browser-automation gotcha: scripted `.blur()` doesn't trigger React `onBlur`; test inputs with real typing.
- Students have an internal `id` (= `no` unless two students in a class share a number; then 1000+). Team setup, bins and absent lists use ids; the Sheet only ever gets `no` + nickname. See `cleanRoster` in `src/lib/bootstrap.ts`.
- Zustand selectors must return stable values: never `useApp((s) => s.x ?? [])` or `.map()` inside a selector (React error #185, endless re-render). Select the stored value, then derive with `useMemo`.
- Admin dashboard (`/admin/*`, `src/routes/admin/`): `AdminLayout` = sidebar ≥ 1024 px, bottom tabs below. Results are loaded whole (`results` action, including deleted) into `src/store/admin.ts`, cached in IndexedDB (`kru-admin`), and filtered/aggregated on the device (`src/lib/stats.ts`). Admin writes need internet; failed edits stay on screen (roster drafts in `kru-prefs` IndexedDB) for retry.
- Code.gs v5 admin actions: `results`, `updateSession`, `deleteSession` (soft), `saveRoster`, `saveClass` (add/archive/default team size), `renameClass` (renames in every tab). Class matching everywhere ignores spaces and capitals.
- Code.gs v9 roster Order: `Rosters.Order` = Henry's order within a class (mixed classes repeat numbers); filled by Set up tabs from row order, kept by `saveRoster` (`keepOrders_`), copied to `Results.Order` on submit and backfilled by Set up tabs. Class tabs + Summary sort by it.
- Code.gs v8 class tabs: one tab per class (named after the class) with live QUERY/FILTER formulas over Results (student totals at A3, games newest first at G3). Results stays the only master copy. Made by Set up tabs, on first submit / new class (`tryClassTab_` never throws), renamed with the class. A1 starting "Kru class tab:" marks Kru's own tabs; others are never overwritten.
- Shared game pieces (Nov 2026): `kru-end.js` also has `KruPodium` (3rd, 2nd, 1st reveal before the score list, used by every game with End game); `kru-picker.js` = "Pick a team" spinner (no repeats until all teams had a turn); `kru-quiz.js` = Quiz Battle questions + A-D rendering for Quiz Board and Race Board. `KruCards` options: `noScores`, `picker`, `tag`, `timer.adjust`, `challenge` (the last three were for Just a Second; kept in the engine).
- **Tag-Team Talk** (Henry, Nov 6): 100 topics per level, each `{ topic, ideas: [3 hints] }` (Just a Second's topics merged in); Hints button shows them (`S.hints`, hidden again on Spin); 🎯 Pick a team (`KruPicker`, Talk only) sets the team at the front. Nov 9: Talk has **no bonus cards** (`BONUS` false when content has no `bonus`), huddle 60 s then the clock stops (phase `set`, "Start talking"), 20 s per speaker changeable ±5 s in ⋯ (`S.turnSecs`, 5-120), `crazy` topic list per level (50, with hints) behind "Crazy topics only" (`S.crazy`), bigger speaker boxes (`.lane.relay`), two-column ⋯ menu; challenge rule = 5 seconds of silence (Talk + Debate slides). Debate motions stay plain strings (no hints, no picker). **Just a Second was removed**; `RETIRED_GAMES` in `src/lib/games.ts` keeps its title for old sessions/Sheet rows, and a leftover in-progress session goes straight to review (`RetiredGame` in Play.tsx). To retire a game: delete it from games.json + its folder, add it to `RETIRED_GAMES`.
- **Teams screen + team size + preview** (Henry, Nov 9): team size is 1-15 (`TEAM_SIZE_MIN/MAX` in `src/lib/teams.ts`, also the admin class default). Group games start on a "Find your team!" screen (`src/components/TeamsReveal.tsx`, all teams fit with no scroll: a fit loop picks columns + font size): Setup sets `teamsShown: false`, Play shows `TeamsScreen` until "Start the game"; "Change teams" sets the session back to `setup` and Play redirects to `/setup/<game>`. Library cards have a **?** (not tools) → `/preview/<game>?level=` (`src/routes/Preview.tsx`): the game in `?mock=1` practice mode with the mock save cleared, so the How to play slides show first; ⌂ menu = level, start again, back.
- **Race Board** (Henry, Nov 9): 60 squares (12 × 5 snake), its own question bank in `content.json` `questions[level]` (tier easy/regular/hard/impossible, cat english/math/science/general; 165 per level since Nov 10 (old M.1 removed as too easy, old M.2 → M.1, old M.3 → M.2, new harder M.3), generated by a scratch script with the right answer spread A-D). Tier dice in `TIERS` (easy 1 die weighted 1-3, regular fair, hard 2 dice mostly 7+, impossible 2 dice mostly 9+; shares 30/45/17/8); wrong = back die; exact roll to finish (bounce back). Squares: ★ / ⚠ / 🎲 / ? chance (12 cards incl. swap, shield, double dice, math-or-science next) + 2 secret squares (trap = skip a turn, slide = +8) placed at random per game, first team only (also when moving back). Unit / Sheet questions get guessed tiers (A-D regular, short or double hard). Timer starts by itself; team buttons show who is on a team. Save version 2 (`sizes` must match the pools).
- Units (Gamma lessons → games): `public/units/<id>.json` (sets of quiz questions, words, motions) + `public/units/index.json`. Made by Claude reading Henry's Gamma decks through the Gamma connector, converted to American spelling. Setup screen shows a unit menu for games with `"units": true` (`src/lib/units.ts`); the unit id goes in the session (`initMessage`) and games load it with `KruQuiz.unit(session)`. Mock: `&unit=<id>`. Adding a unit = new JSON + index entry, no code.
- Code.gs v6: optional `Questions` tab (Level · Set · Question · A · B · C · D · Answer · Double) for Quiz Battle; `bootstrap` returns `questions` (sets per level, from pure `buildQuestions_`) and `questionProblems` (Sheet row + reason). Missing tab = no questions. `setup()` formats it as plain text with tick boxes in Double.
- Code.gs v7: **Summary tab** = live QUERY formulas over Results (student totals: Class · No · Nickname · Total points · Games at A3; class totals at H3; deleted rows left out), built from where the Results columns really are (`summaryFormulas_`). `setup()` writes it only if the tab is new, empty or still Kru's own (A1 starts with "Kru Summary" or the old placeholder).
- **Library sections** (Henry): games.json `section` = quizzes / reading / speaking / writing / tools; `librarySections()` in src/lib/games.ts orders sections A-Z with Tools last and games A-Z; empty sections hidden; colours + SVG icons (`src/components/SectionIcon.tsx`).
- Per-device prefs (`src/lib/prefs.ts`): keep screen awake, term start date.
- **Tools** (games with `modes: []` in games.json, e.g. Talk Timer) skip class choice and team setup: Home → `/tool/:game` (`src/routes/Tool.tsx`). The shell answers `kru:ready` with a session that has `mode: 'tool'`, no teams, and `resume` = the tool's saved settings (IndexedDB `tool:<slug>`); `kru:state` saves them. No results.
- `tests/games.test.ts` checks every `ready` game: file path, full document, SDK + shared CSS, no inline scripts/handlers, no Google Fonts, no localStorage.
- Phase 3 (Henry's choices): games go live one at a time; Word Rush scores by tap buttons (no keyboard); Talk Timer presets saved on the phone only.
- Phase 3 game pattern (all four migrated games): `fetch('content.json')` + `Kru.ready` → level section, `Kru.allTeams()`; state saved with `Kru.saveState` on every change and restored from `session.resume` only if `v` and `level` match; points via `Kru.score` + `Kru.finish` on finish request; clock-based timers (`endAt`, survive a short sleep); audio unlocked inside a tap (`navigator.audioSession.type = 'playback'` where supported); the main screen fits 712 × 354 (iPhone minus notch/home bar), long text shrinks in a fit loop; secondary actions in a ⋯ menu; top-right 56 px kept clear for the home button. Scoring: a team strip along the bottom, tap a team → points panel → Undo message. Tag-Team speaking order: tap two names to swap (primary), hold 280 ms and drag (secondary).
- Word Rush self-hosts Fredoka + Atkinson Hyperlegible (OFL 1.1, `public/fonts/`).
- The four original claude.ai games (`legacy/games/`) were removed after Henry checked the migrated versions (2026-11-04). They are in git history before commit `dcf95bb` if ever needed.
- **Day memory** (Phase 4): `Kru.saveDay(data)` → shell stores IndexedDB `day:<game>:<classKey>:<YYYY-MM-DD>`; it comes back as `session.day` in `kru:init` (Play.tsx). Name Picker uses it for "already picked today".
- games.json `"results": "scored"` (Name Picker): only teams with non-zero points get Results rows (`buildSubmission(..., { onlyScored: true })`, `submittedTeams` in `src/lib/results.ts`); if nobody scored, the review screen offers "Close (nothing to save)".
- games.json `"sheetQuestions": true` (Quiz Battle): Play.tsx adds `session.questions` (the Sheet's Questions-tab sets for the session's level, from the last Sync, cleaned by `normalizeQuestions`) and `session.questionProblems` to `kru:init`. Demo mode has one fake "Demo set from the Sheet" per level.
- **How to play slides** (Henry, after Phase 4): every student game shows short slides before it starts (`public/games/shared/kru-intro.js` + `.css`, `KruIntro.show(slides, {title})`), again from ⋯ → How to play. Slides live in `content.json` `intro` (a level section can override with its own `intro`): 2-6 slides, title ≤ 30 chars, ≤ 2 lines of ≤ 90 chars, plus an `example` (chips / result / big + tag / rows / note). Shown once per game session (`S.introDone`). Teacher tools (Scoreboard, Talk Timer) have none. Tested in `tests/games.test.ts`.
- **Content pools** (Henry): every game with questions has **≥ 50 per level**, in a new order every game (tests in `tests/phase4.test.ts`). Think Tank draws per round from pools (`play` main + `spares` per round, saved in `S.draw`, save version 3); since Nov 9 its rounds are Riddle Rush / Rebus Round (`show` rows with [big:] [small:] [up:] [down:] [line] tokens, emoji + text) / Logic Puzzles (written in a scratch generator that brute-forces each puzzle to exactly one answer; logic round hides the rule line, uses row tiles, shows only the question line after Reveal) / Final Wager (bet any points or ALL IN, bets panel for all teams, bet shown above the score, Mark answers → right/wrong for every team → Add up the scores); M.3 only: trick questions (`herring: true`, 🐟 badge on Reveal) and one useless clue per logic puzzle; Quiz Battle has 5 built-in sets of 10 + "All topics, shuffled", and shuffles every set when chosen.
- **20 Questions** (`twenty-questions`, Speaking, Group + Solo, no levels): Henry thinks of the answer; the board shows only the category (Person / Place / Thing / Idea / Any noun, or Random picks one). Questions per round 1-100 (default 20, ⋯ menu). Group: each team has its own counter, tap a tile = −1. Solo: one shared class counter. Got it! → pick the winning team / student; points = questions left (min 1). `results: 'scored-solo'` = only winners are saved in Solo; all teams in Group. The teacher team doesn't play.
- **Bonus cards** (Henry): shared `public/games/shared/kru-bonus.js` + `.css`. content.json `bonus: { before: [...], secret: [...] }` (id, name ≤ 24, text ≤ 70, optional points 1-5). Each round: before card ~1/3 (pops up, then a ★ chip in the top bar), secret card ~1/4 (pops up at the game's reveal / time-up). Points: tap the ★ chip → tap the teams that earned it (tap again to take back) → the game's own award callback. Stored as `S.kbonus` (Word Rush already uses `S.bonus` for its own every-round card, so it only has secret cards). No bonus in Think Tank's Final Wager, 20 Questions or the tools.
- **Talk Timer rules** (from Henry's lesson slides): each starting preset in `public/games/talk-timer/content.json` has `rules` (slides, same format as How to play; the Fix It! Pitch ones are an unconfirmed draft). A Rules button next to the timer name shows them (`KruIntro`). A timer Henry edits can have its own rules (`rulesText`, one per line → 2 lines per slide), which replace the built-in ones; built-in rules are looked up by preset id, so they also work for presets saved on the phone before rules existed.
- **Counters + End game** (Henry): question counters read "6/50" in the top-right corner of the question area (`KruCorner.set(stageEl, text)`), not in the top bar; Quiz Battle's bar shows only "Quiz Battle" (no topic). Every team game has ⋯ → "End game & final scores" (`KruEnd.setup({ standings })`, shared `games/shared/kru-end.js` + `.css`): ranked final scores, then "Save scores & finish" = `Kru.endGame()` (SDK: runs the game's own finish, same as home → Finish).
- **Tools** (Henry asked for all three): **Class Order** (class tool: by number or random; Done / Absent: skip / Back; who has had a turn is kept across lessons with `Kru.saveKeep` → IndexedDB `keep:<game>:<classKey>`, back as `session.keep`; today's skips in day memory), **Dice & Spinner** (1-3 dice; wheel with own options + presets, Don't repeat), **Noise Light** (sign mode + microphone noise meter; vercel.json `Permissions-Policy: microphone=(self)` and the Tool iframe `allow="screen-wake-lock; microphone"`; sound is analysed on the phone only, never recorded or sent). Opening a class tool reuses its open session for that class.
- Name Picker is a plain name picker and a **class tool** (games.json `classTool: true`, section Tools): Home → pick a class → `quickSession()` (src/lib/session.ts) starts it straight away with every present student (today's absent list from team setup is used); no setup, no slides. Inside: "Absent: pick again" (remembered for the day in `day.absent`), points hidden unless "Show points" is on.
- **Card engine** (`public/games/shared/kru-cards.js` + `.css`, `KruCards.start(cfg)`): builds the whole screen for simple team card games (top bar, card + corner counter, optional timer, Reveal/Next, team strip + points panel, ⋯ menu, bonus, End game, save/resume, slides). Used by Would You Rather? (Speaking), Sentence Builder, Category Grid (Writing). A game only gives `items`, `card(item, {revealed, esc})`, `reveal`, `timer`, `points`. Category Grid rounds are generated from word lists (scratch script, not in the repo); every example starts with the round's letter (tested). Category Grid (Nov 9): no bonus cards; slides teach "more words, more points" (huge heavy horse = 3) and "no word twice"; engine option `tally: true` keeps the points window open, +1/+3/+5/−1 add up and Done ✓ saves one score.
- **Reading games** (all on the card engine, `compact: true` = timer + buttons in the top bar and shorter team tiles, for long texts): Story Order, Read & Remember, True or False Race, Spot the Mistakes share **`public/games/shared/stories.json`** (engine option `extra`; 50+ stories per level: 5 sentences, 4 true/false with `fix`, 3 questions, 3 `mistakes` {i, right, wrong}). Engine extras: `steps` (several reveal taps, e.g. Hide story → Answers), `order` (True or False keeps a story's 4 statements together), `bonusKey` (one bonus round per story). Scan It! has its own generated texts (menu, schedule, poster, weather, opening hours, sale ad, league table, movie times; answers computed; scratch generator not in the repo). Every card fits 712 × 354 at ≥ 18 px (checked in the browser for every card and step).
- **Phase 5 polish:** Home has **Favorites** (★ on every card, its own 44 px button) and **Recently played** (last 6 opened) rows above the sections, per device in `kru-prefs` (`src/store/library.ts`, pure helpers `src/lib/library.ts`); cards keep their section color. The update toast waits until Henry is out of `/play` and `/tool`. Route `errorElement` = `ErrorScreen` (Reload / Back to library). A game or tool that doesn't send `kru:ready` within 12 s shows `FrameStuck` (Try again / Back to library; `useFrameReady`). Setup says how to add students when a class has none.
- Browser-test gotcha: the shell saves game state with a 300 ms debounce, so a test that reloads within ~0.3 s of a tap loses that tap. Wait ≥ 0.7 s before reloading.

## graphify

If `graphify-out/graph.json` exists, use `graphify query` / `path` / `explain` for codebase questions, and run `graphify update .` after code changes.
