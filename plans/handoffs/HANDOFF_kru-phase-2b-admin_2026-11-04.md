# Kru ESL games PWA: Phases 1, 2 and 2b built and deployed; waiting on Henry's Phase 2b checks before Phase 3

**Date:** 2026-11-04
**Status:** IN PROGRESS (Phase 2b deployed, awaiting Henry's phone + laptop testing; Phase 3 not started)
**Bead(s):** none (no `bd` installed on this machine)
**Epic:** Kru build plan (HANDOFF.md section 10: Phases 1 → 2 → 2b → 3 → 4 → 5)
**Chain:** `standalone-4cd22719` seq `1`
**Parent:** `none — first in chain`
**Prior chain:** none — first in chain

---

## Reference Documents

- `HANDOFF.md` (repo root): **the source of truth**. The full build plan Henry wrote: requirements, architecture, Sheet back end, Game SDK, admin dashboard, phases and acceptance checks. Read it before starting any phase.
- `CLAUDE.md` (repo root): working rules, key decisions, commands and implementation notes. Updated through Phase 2b. Read it first.
- `apps-script/README.md`: Henry's step-by-step deploy guide for the Sheet script, including "redeploy as a New version" and troubleshooting.
- `games.json`: game registry, imported by `src/lib/games.ts`.
- `legacy/games/*.html`: the four original claude.ai games, untouched, to migrate in Phase 3.
- Memory: `C:\Users\h\.claude\projects\C--Users-h-kru\memory\` holds `kru-deployment.md` (hosting facts and deploy gotchas) and `kru-phase-status.md`.
- Sister project for conventions: `C:\Users\h\raeng` (React + Vite PWA on Vercel, plain JS). Its `vercel.json` must NOT be copied (it sets `frame-ancestors 'none'`).

## The Goal

Build **Kru (ครู)**, a React + Vite + TypeScript PWA for Henry's ESL classroom games. He runs it from the home screen of his **iPhone 13 mini held sideways (812 × 375)**, AirPlayed to the classroom smartboard. The flow is: choose a class (rosters come from his private Google Sheet) → choose a game → set up teams (tap-to-place) → play the game full-screen in an iframe that talks to the app through the Kru SDK → review scores → submit (one Sheet row per student per game, with an offline outbox). An admin dashboard (`/admin`) works on both phone and laptop for rosters, saved teams, results and settings. Henry is a teacher, not a full-time developer. He wants plain language, one phase at a time, iPhone test steps after each phase, and **never any student data in the repo**.

## Where We Are

- **Phases 1, 2 and 2b are built, committed on `main`, pushed to GitHub (`hju-dev/kru`, public) and live on Vercel at https://kru-psi.vercel.app.** Pushing `main` auto-deploys.
- **Phase 1** (shell, sign-in, bootstrap, offline cache, `Code.gs`): Henry confirmed it on his iPhone (iOS 27.2) after three Sheet-related fixes (dates, duplicate class buttons, regex bug).
- **Phase 2** (team setup, play shell + SDK, Scoreboard game, results, outbox, Sheet writes): Henry confirmed all 7 checks. Three issues came up and were fixed:
  - Blurry top bar in portrait: fixed twice. The second fix (`--top-extra: 30px` in portrait) was the last change. **Henry has not yet confirmed it is sharp now.**
  - Duplicate students: fixed with internal student ids; Henry confirmed "good".
  - Roster check card: Henry confirmed "good".
- **Phase 2b** (admin dashboard: Overview, Rosters, Teams, Results, Content placeholder, Settings; `Code.gs` v5): built, browser-tested in demo mode at 375 × 812, 812 × 375 and 1440 × 900, and deployed at commit `80e8cce`. **Henry has not tested it yet**, and must first paste `Code.gs` v5 and redeploy it as a New version.
- **Tests: 56 passing** (`npm test`, Vitest) in 7 files. Lint clean (`npm run lint`), type-check and build clean (`npm run build`).
- **`apps-script/Code.gs` is at `KRU_SCRIPT_VERSION = 5`.** Actions:
  - Classroom: `ping`, `bootstrap`, `submitResults`, `saveTeamSet`, `deleteTeamSet`.
  - Admin: `results`, `updateSession`, `deleteSession`, `saveRoster`, `saveClass`, `renameClass`.
  - Menu functions: `setup` ("Kru → Set up tabs"), `showKey`, `makeNewKey`; `onOpen` builds the menu.
- Henry's Sheet already has v4 or later. He redeployed v2, v3 and v4 during the session. v5 is pending.
- App version string: `0.1.0` (`package.json`, shown in Settings via `__APP_VERSION__`).
- **Routes** (`src/App.tsx`): `/`, `/setup/:game`, `/play/:id`, `/results/:id`, and `/admin` with children `''` (Overview), `rosters`, `teams`, `results`, `content` and `settings`. `*` → Home. The Root component shows `SignIn` while signed out.
- **Games:** only `scoreboard` has `status: "ready"` in `games.json`. The 4 legacy games are `"migrate"` and the 5 new games are `"new"`; both show as "Coming soon" cards.
- **Kru SDK:** `public/sdk/kru.js` is implemented (ready / allTeams / saveState / score / finish / onFinishRequest, plus mock mode). `public/games/scoreboard/` is the reference game. Shared game CSS and fonts are in `public/games/shared/kru-game.css` and `public/fonts/*.woff2` (OFL licence in `public/fonts/LICENSE-OFL.txt`).
- **Privacy guard:** `scripts/check-privacy.mjs` runs as a pre-commit hook (`.githooks/pre-commit`, enabled by `npm install` via `prepare`). It caught 3 false positives during the session; each was fixed by adjusting placeholders, never by bypassing the hook.
- **No uncommitted changes** at handoff time (`git status` clean before this file was written).
- **Demo mode** ("Try demo" on sign-in) uses made-up students S1–S30 in 8 classes. Its admin Results are built from games submitted on the device (`demoResults()` in `src/store/admin.ts`).

## What We Tried (Chronological)

### Early: setup, planning, Phase 1, first deploy
1. **Read the handoff.** The handoff files arrived nested at `kru_handoff/kru/`, with a duplicate `HANDOFF.md` at the root plus `kru_handoff.zip`. Moved `games.json` to the root and the games into `legacy/games/`, deleted `kru_handoff/`, git-ignored the zip, and renamed branch `master` → `main` (Henry approved).
2. **Raised plan conflicts before coding** (Henry approved all):
   - Splash sizes must be 1125×2436 / 2436×1125, not the 1080×2340 in HANDOFF.
   - Add an optional `Classes` tab.
   - Cache bootstrap data in IndexedDB, not in the service worker.
   - Don't copy Raeng's `vercel.json`, which would block iframes.
   - Make every Apps Script call a POST, so the key never appears in a URL.
   - Wake Lock in home-screen apps was unreliable before iOS 18.4 (Henry is on 27.2, so fine).
   - Portrait Orientation Lock must be off for the app to rotate.
3. **Scaffolded Phase 1 by hand** (no `create-vite`). Package versions are newer than the model's training: Vite 8.3.5, React 19.3, React Router **8.5.1** (API is the same as v7: `createBrowserRouter`, `RouterProvider`), vite-plugin-pwa 2.0.0, Vitest 5.1, TypeScript 6.0, ESLint 10. The first `npm install` hit a network blip; a retry worked.
4. **Icons and splash:** `@vite-pwa/assets-generator` with `pwa-assets.config.ts`. Its preset already knows "iPhone 13 mini" = 1125×2436. The head links it printed named `...-light-...` files that didn't exist, so `index.html` links were written by hand to the real files.
5. **Browser testing (built-in browser pane):**
   - The first click on Connect "did nothing": the click coordinates were wrong because the screenshot was scaled; clicking by `ref` worked.
   - Offline test: stopped the preview server and reloaded. The app loaded from the service worker.
   - Faked a broken connection in IndexedDB: the pill turned red and the cached data stayed.
6. **Deploy:**
   - `vercel whoami` showed `Couldn't parse JSON file vercel.json`. A bash heredoc had dropped a backslash in the rewrite regex (`.*\.` instead of `.*\\.`). Fixed, and added `tests/config.test.ts`.
   - Found that `"prepare": "git config core.hooksPath .githooks"` would fail on Vercel (no git there). Replaced with a node one-liner wrapped in try/catch.
   - `gh repo create --public` was **blocked by the auto-mode classifier ("Create Public Surface")**, so Henry ran the commands himself.
   - **Mishap:** Henry ran `gh repo create` from `C:\Users\h` and then ran `git init` there, creating `C:\Users\h\.git`. I checked it was empty (0 commits, default config, created that minute) and deleted it. His next paste doubled the command (`hju-dev/krugh repo create...`). Then `vercel` said "No existing credentials" in his shell (my shell was logged in), so he ran `vercel login`.
   - `vercel --prod --yes` created project `hju-dev1/kru`, connected GitHub automatically, aliased `kru-psi.vercel.app`, and built with `vite build`.

### Mid: Phase 1 iPhone fixes, Phase 2 build
7. **Bug: class names showed as dates** ("Fri Jan 02 2026 … (เวลาอินโดจีน)"). Sheets had auto-converted typed `1/2` in the **Classes** tab into dates, while Rosters kept text `1/2`, so the date-named classes showed 0 students. Fix (Code.gs v2):
   - `readTable_` converts `Date` cells in the `Class` column back with `classText_(v, dateStyle_(ss))`. It uses month-first for `en_US / es_US / en_PH / fil_PH` locales, day-first otherwise, via `Utilities.formatDate` with the sheet time zone.
   - `setup()` now calls `protectClassColumn_` on every tab: it sets the Class column to number format `@` and rewrites existing Date cells.
   - The app's `levelFromClass` now also reads `1/2` → M.1 and `3/2P` → M.3.
   - Class names are single-line with an ellipsis.
8. **Bug: two copies each of 3/2P and 3/3P** (two empty, two full). Rosters had `3/2 P` (with a space) while Classes had `3/2P`. Fix (Code.gs v3): `classKey_(name)` (spaces removed, uppercase) is used for matching in `buildBootstrap_`. The Classes-tab spelling wins (`canonical()`), and team sets are mapped to the canonical name.
   - **Same heredoc backslash bug again:** a node script written via bash heredoc wrote `/s+/g` instead of `/\s+/g`. Caught by a new unit test before deploy and fixed with the Edit tool. **Lesson:** write scripts containing regexes to a file with the Write tool, or use Edit, instead of shell heredocs.
9. **Phase 2 design choices** (see Key Decisions):
   - Pure logic in `src/lib/teams.ts` and `src/lib/results.ts` first, with tests, including the HANDOFF "Joe test".
   - Code.gs v4 adds `submitResults` (idempotent via `planSubmission_`, using `LockService`), `saveTeamSet` and `deleteTeamSet`. Built an in-memory fake Sheet (`tests/fakeSheet.ts`) to run the real `doPost` end to end.
   - Added a **Scoreboard** game (not in HANDOFF) so Phase 2 could be tested end to end; Henry accepted it implicitly by testing it.
10. **Phase 2 browser testing found:**
    - The "Coming soon" label overlapped titles (it was absolute-positioned); moved it into the meta row.
    - **Team boxes overlapped when full.** CSS grid with `repeat(auto-fill, minmax(150px,1fr))` in a height-limited scroll container sized rows to the min-content of the wrapping chips. Fixed by switching `.bins` to `display:flex; flex-wrap:wrap; align-items:flex-start` with `.bin {flex: 1 1 150px}`.
    - The T. Henry button "didn't toggle": a false alarm caused by scaled screenshot coordinates. A JS `.click()` showed it works.
    - Scripted `chip.click()` then `bin.click()` failed (a stale React closure between synchronous clicks); real clicks worked.
    - Rename "failed" with a scripted `.blur()`. This is Raeng gotcha #4: programmatic blur doesn't trigger React `onBlur`. Real typing + Enter worked.
    - The privacy guard blocked the Phase 2 commit: `nick: 'S' + i` in `kru.js` was read as a nickname "S". Fixed by allowing `S\d{0,2}` in `isPlaceholder`.
11. **Phase 2 verified flows in the browser:**
    - Shuffle (26 students → 7 teams of 4/4/4/4/4/3/3) and Fill evenly.
    - Absent (remembered for the day per class).
    - Start blocked while anyone is unassigned.
    - The game received 7 teams + T. Henry, with the absent student excluded.
    - Scores survived a reload ("Continue ▶" banner).
    - Finish → Results ranks 17/12/12/1/0 → 1/2/2/4/5.
    - Submit in demo: "25 rows" (26 minus 1 absent).
    - Fake unreachable Sheet: outbox "Saved on this phone", and Settings showed "tried 2×".
    - Save/Load team sets worked; Solo mode worked.

### Late: Phase 2 iPhone feedback, Phase 2b build
12. **Blurry top bar in portrait** (Henry: "It's a bit blurry at the very top of the screen when vertical"). Cause: in Phase 2 I changed `.screen` padding from `sa-top + 10px` to `max(sa-top, 10px)` to save width when sideways, which pushed headers into the strip iOS blurs under the status bar.
    - Fix 1: `calc(var(--sa-top) + 14px)`. **Not enough** (Henry: "still blurry - move them down a bit more with some blank space at the top (vertical only)").
    - Fix 2: added a `--top-extra` custom property, `0px` by default and `30px` under `@media (orientation: portrait)`. Applied in `.screen`, `.setup`, `.sheet-backdrop`, `.play-menu-backdrop` and `.admin-main`. **Awaiting Henry's confirmation.**
13. **Duplicate students** (Henry: "there are multiple copies of certain students in the app. I can't start certain games…" and the Sheet results had copies too).
    - Root cause: student number was used as identity. Two students sharing a number (likely in mixed classes M.2/M.3) or a duplicated row broke `byNo` maps, React keys and shuffle.
    - Fix: `Student.id` (= `no`, or 1000+ when the number is shared), made by `cleanRoster()` in `src/lib/bootstrap.ts`. It also merges exact duplicate rows (same no + nickname, case-insensitive) and reports `rosterIssues`.
    - `Setup.tsx` was renamed `byNo` → `byId` and `presentNos` → `presentIds`, and uses ids everywhere. `binsFromTeamSet(teams, roster, presentIds)` matches saved members by no + nickname.
    - `upgradeCachedBootstrap()` adds ids to rosters cached by the old version.
    - Settings gained a "Roster check" card.
    - A large multi-edit script failed in bash with "unexpected EOF while looking for matching `''", so it was rewritten as a `.cjs` file in the scratchpad and run with node.
14. **Phase 2b build:**
    - Code.gs v5 admin actions, with 6 new fake-Sheet tests; all passed first try.
    - Admin store `src/store/admin.ts` and stats helpers `src/lib/stats.ts`.
    - Paste import `src/lib/rosterImport.ts` (one test of mine was wrong: `'1 / 2'` should match `'1/2'`).
    - Pages, layout, prefs (keep awake, term start).
15. **Phase 2b bug: React error #185** ("Maximum update depth exceeded") on `/admin/results`. Cause: zustand selectors returning a new array each call (`useApp((s) => s.data?.classes.map(...) ?? [])`). Fixed in 3 places by selecting the stored value and deriving with `useMemo` / `?? []` outside the selector. Recorded in CLAUDE.md.
16. **The privacy guard blocked the Phase 2b commit** on the test nickname `'S2b'`. Renamed it to `'S21'`.
17. **Phase 2b verified in the browser (demo):**
    - Overview cards; no sideways scroll at 1440.
    - Results: fixing points worked (Team 4: 7 → 9, "Updated just now ✓"), and delete → "Restore game" → restore worked.
    - By student (S1: 12 points in 2 games, average 6) and its history at 375 portrait.
    - Rosters at 812 × 375: paste merge "26, S26b / 27, S27 / S28" updated No. 26, added 27 and auto-numbered 28; an unsaved draft survived reload ("Restored your unsaved changes from last time.").
    - Teams: new set, shuffle, tap-to-place, save, duplicate, delete.
    - Settings at 812 × 375: Google Sheet, Outbox, Default team size (8 classes), Options (keep awake ✓, term 2026-11-01), This device, Tips.

## Key Decisions

- **Every Apps Script call is a POST** with JSON sent as `text/plain` and `redirect: "follow"`, including reads. *Rejected:* `GET ?action=bootstrap&key=…` from HANDOFF, because the key would end up in Google logs and history. `doGet` returns only `{ok:true, message:'Kru back end is running…'}`.
- **Optional `Classes` tab** (Class · Archived · DefaultTeamSize · Order). Classes that appear only in Rosters still show, sorted after the Classes-tab ones (order 2000+). Admin `saveClass` replaces HANDOFF's separate addClass/archiveClass; `renameClass` is separate.
- **Class matching ignores spaces and capitals everywhere** (`classKey_` in Code.gs, `classKeyOf` in `src/lib/bootstrap.ts`). The canonical display name comes from the Classes tab.
- **Internal student ids** instead of numbers for identity in the app (see What We Tried 13). The Sheet only ever receives `No` + `Nickname`.
- **Ranks are among student teams only.** The teacher team (Team 0, "T. Henry", id `t0`) is never written to Results; its points go to `Sessions.TeacherTeamPoints`. `TEACHER_NAME = 'T. Henry'` is a constant in `src/lib/session.ts`.
- **Tap-to-place is primary.** A tap switches the selection (per HANDOFF); a "Pick several" toggle enables multi-select. *Rejected:* multi-select by default, which conflicts with HANDOFF's "tapping another chip switches the selection". Drag is custom (`src/lib/useChipDrag.ts`), not `@dnd-kit`: touch needs a **280 ms hold** (`HOLD_MS`), moving more than 8 px first cancels (it's a scroll), mouse starts after 5 px, and a permanent non-passive `touchmove` listener blocks scrolling only while dragging.
- **Absent students are remembered per class per day** (IndexedDB key `absent:<class>:<YYYY-MM-DD>`).
- **Scoreboard game added** as the first SDK game so Phase 2 could be tested before Phase 3. It's also useful in class for paper or board activities.
- **Service worker `registerType: 'prompt'`** plus an Update toast, so a new version never loads mid-lesson. `navigateFallbackDenylist: [/^\/games\//, /^\/sdk\//]`.
- **Admin results are loaded whole** (`results` with `includeDeleted:true`), cached in IndexedDB `kru-admin`, and filtered and aggregated on the device. *Rejected for now:* server-side paging (HANDOFF says "paged"). Fine at the expected volume; revisit if slow.
- **Admin writes need internet.** Failed edits stay on screen, and roster edits are saved as device drafts (`kru-prefs` store, key `draft:roster:<class>`). *Rejected:* a general admin write queue like the results outbox (too complex for now).
- **Roster paste "Replace"** makes the pasted list active and keeps everyone else as **inactive** (never deletes), so history stays meaningful. "Merge" updates nicknames by number and adds new students.
- **`renameClass` renames everywhere**, including Results and Sessions history, so per-class totals stay continuous. It refuses a name already in use (different classKey).
- **Term start** for "top students this term" is a per-device pref. The default is the most recent of May 1 or Nov 1 (`defaultTermStart()` in `src/lib/prefs.ts`).
- **Content editing (HANDOFF 8b)** is deferred to after Phase 4 per HANDOFF; `/admin/content` is a placeholder.

## Evidence & Data

### Commit log (all on `main`, pushed, auto-deployed)

| Hash | Summary |
|---|---|
| `9e2e463` | Phase 1: app shell, sign-in, Sheet bootstrap, offline cache |
| `61a49cb` | Use LF line endings so the pre-commit hook works on every machine (`.gitattributes`) |
| `7b56fa2` | Fix invalid vercel.json (missing escape) and add a config test |
| `8252074` | Make the hook-install step safe on build servers without git |
| `53a9fa5` | Fix class names that Google Sheets turned into dates (Code.gs v2) |
| `f0541a0` | Match class names ignoring spaces and capitals (Code.gs v3) |
| `bf030c6` | Phase 2: team setup, play shell + SDK, results, outbox, Sheet writes (Code.gs v4) |
| `09f80ce` | Fix duplicate students and blurry top bar in portrait |
| `bcb6af6` | More blank space under the status bar when the phone is upright |
| `80e8cce` | Phase 2b: admin dashboard (phone and laptop) (Code.gs v5) |

### Code.gs version history (Henry must paste + "Deploy → Manage deployments → ✏️ → New version" each time)

| Version | Added | Henry deployed? |
|---|---|---|
| 1 | `ping`, `bootstrap`, `setup`/menu, key generation | yes |
| 2 | Date-converted Class cells read back as text; `protectClassColumn_` in setup | yes (and ran Set up tabs) |
| 3 | `classKey_` matching (spaces/capitals) in bootstrap | yes ("That fixed it") |
| 4 | `submitResults` (idempotent), `saveTeamSet`, `deleteTeamSet`, `TEXT_COLUMNS` formatting, `appendObjects_`, `withLock_` | yes (Phase 2 tests passed) |
| 5 | `results`, `updateSession`, `deleteSession`, `saveRoster`, `saveClass`, `renameClass`, `updateRows_`, `deleteRowsMatching_` | **NOT YET** |

### Test suite (56 tests, `npm test`)

| File | What it covers |
|---|---|
| `tests/api.test.ts` | `checkScriptUrl`, `parseReply` (HTML → "web page instead of data"), `callScript` POST/text-plain/key-in-body, offline error, `normalizeBootstrap`, `levelFromClass` (`1/2`, `3/2P`, `4/1`→null), `upgradeCachedBootstrap` |
| `tests/appsScript.test.ts` | `classText_` (month-first vs day-first), `buildBootstrap_` grouping/sorting/blank rows/Classes tab/team sets/space-and-capital matching, `planSubmission_`, `objectsToValues_` |
| `tests/appsScriptWrites.test.ts` | Real `doPost` vs `FakeSheet`: wrong key, submit rows, **resend = no duplicates**, sheet growth, team set save/replace/delete, delete leaves others; admin: results filter+order, updateSession, delete/restore, saveRoster class-scoped, saveClass create/update, renameClass + refusal |
| `tests/config.test.ts` | `vercel.json` parses; rewrite regex sends routes to index.html but not files, `/games/`, `/sdk/`; CSP has `frame-ancestors 'self'` and Google domains; `X-Frame-Options: SAMEORIGIN` |
| `tests/phase2.test.ts` | team logic (bin count, resize, moveTo, shuffle balance 26→[6,6,7,7], fillEvenly, load team set), shared-number ids, duplicate-row merge, `rankTeams` ties, **Joe test** |
| `tests/phase2b.test.ts` | `parsePasted` formats/header/auto-number/name-then-number, merge, replace, sharedNumbers, `filterSessions`, `studentTotals`, `teamsOf`, `toCsv` BOM + quoting |
| `tests/fakeSheet.ts` | helper: `FakeSheet` (rows, maxRows 1000, getRange/setValues/deleteRows/insertRowsAfter) + `fakeGoogle()` (SpreadsheetApp, PropertiesService key `test-key`, LockService, ContentService) |

### Joe test (HANDOFF acceptance), as asserted in `tests/phase2.test.ts`

```
Input: teams t1 [S1,S2] = 12, t2 [Joe(7), S8, S3] = 17, teacher t0 = 20, absent [9]
Joe row: { Date:'2026-11-04', Time:'14:05', Class:'M.3/2', Game:'Scoreboard', Level:'M.3', Mode:'group',
           Team:'Team 2', No:7, Nickname:'Joe', Points:17, Rank:1, Teammates:'S8, S3', Notes:'good game' }
rows: 5 (absent 9 has none, T. Henry has none); session.TeacherTeamPoints = 20; TeamCount = 2
```
("Joe", "Mild" and "Aomsin" are HANDOFF placeholders that Henry confirmed are not real students; they're in `scripts/privacy-allowlist.txt`.)

### Browser verification results (built-in browser pane, `npm run preview` on port 4173, demo mode)

| Check | Size | Result |
|---|---|---|
| Sign-in fits, error messages | 812×375 | ✓ "/dev" URL → "This is the test (/dev) address…" |
| Offline (server stopped) | 812×375 | ✓ app + classes load from SW + IndexedDB |
| Update toast | 812×375 | ✓ old version kept until Reload |
| Team setup layout | 812×375 | ✓ after the bins grid → flex fix |
| Shuffle 26 students | 812×375 | ✓ 7 teams 4/4/4/4/4/3/3 |
| Start validation | 812×375 | ✓ disabled with 1 unassigned |
| Game gets session | 812×375 | ✓ 7 teams + T. Henry, absent excluded |
| Resume after reload | 812×375 | ✓ "Team 1=12, Team 2=17, Team 3=1, …, T. Henry=2" preserved |
| Ranks | 812×375 | ✓ 17,12,12,1,0 → 1,2,2,4,5 |
| Submit row count | — | ✓ 25 (26 − 1 absent) |
| Outbox on failure | 812×375 | ✓ "Saved on this phone…", Settings "tried 2×" |
| Duplicate/shared numbers | 812×375 | ✓ 9 unique placed; Roster check lists both issues |
| Portrait top padding | 375×812 vs 812×375 | `.screen` padding-top 44px vs 14px (plus real safe-area on device) |
| Admin overview / results | 1440×900 | ✓ no horizontal scroll |
| Fix points / delete / restore | 1440×900 | ✓ Team 4 7→9; list 2→1→2 |
| By student + history | 375×812 | ✓ cards, back button, bottom tabs |
| Paste merge + draft restore | 812×375 | ✓ 28 rows; "Restored your unsaved changes…" |
| Team set CRUD | 812×375 / 1440 | ✓ save, duplicate, delete |

### Henry's iPhone test reports (verbatim results)

| Round | Report |
|---|---|
| Phase 1 | Everything fine except classes shown as dates (screenshot) → fixed v2; then "two copies of 3/2 P and 3/3 P, two empties, two fulls" → fixed v3; "That fixed it" |
| Phase 2 | 1 good; 2 works but duplicate students; 3 yes; 4 "It showed up in sheets on Submit"; 5 copies of students again; 6 worked; 7 all good; + blurry top bar in portrait |
| Phase 2 fix round 1 | 1 still blurry; 2 good; 3 good |
| Phase 2 fix round 2 | (not yet reported; pushed `bcb6af6`) Henry then said "Start phase 2B" without commenting on the blur |

### HANDOFF.md conflicts raised before Phase 1 (all approved by Henry)

| # | HANDOFF said | Problem | What we did |
|---|---|---|---|
| 1 | Splash 1080×2340 / 2340×1080 | iOS matches startup images by CSS px × DPR: 375×812 @3x = 1125×2436 | Used 1125×2436 and 2436×1125 |
| 2 | Rosters tab only (Class · No · Nickname · Active) | Nowhere to store archived/empty classes or default team size | Added an optional `Classes` tab |
| 3 | Workbox precaches "the last-fetched rosters" | Apps Script replies come via a cross-origin redirect to googleusercontent; caching them in the SW is messy | Bootstrap cached in IndexedDB |
| 4 | Reuse Raeng's deploy setup | Raeng `vercel.json` has `X-Frame-Options: DENY` + `frame-ancestors 'none'`, which kills game iframes | Kru has its own `vercel.json` (SAMEORIGIN, `frame-ancestors 'self'`) |
| 5 | `GET ?action=bootstrap&key=…` | Key in URL → Google logs, browser history | Every call is a POST (text/plain JSON) |
| 6 | Wake Lock "not certain" in home-screen apps | Broken in standalone PWAs before iOS 18.4 | Built as planned; Henry is on iOS 27.2; Auto-Lock → Never tip kept |
| 7 | (implicit) app rotates | Only if Portrait Orientation Lock is off | Added to Settings tips |

### Google Sheet tab schema (created by `setup()`; columns found by header name, order free)

| Tab | Columns | Written by |
|---|---|---|
| `Classes` | Class · Archived · DefaultTeamSize · Order | Henry, admin `saveClass` / `renameClass` |
| `Rosters` | Class · No · Nickname · Active (tick boxes, rows 2–1000) | Henry, admin `saveRoster` / `renameClass` |
| `TeamSets` | SetID · Class · Name · Team · No · Nickname · SavedAt (one row per member) | `saveTeamSet`, `deleteTeamSet` |
| `Results` | SessionID · Date · Time · Class · Game · Level · Mode · Team · No · Nickname · Points · Rank · Teammates · Notes · Deleted · EditedAt | `submitResults`, `updateSession`, `deleteSession` |
| `Sessions` | SessionID · Date · Class · Game · Level · Mode · TeamCount · TeacherTeamPoints · SubmittedAt · Deleted · EditedAt | same as Results |
| `Summary` | A1 note only: "Student totals will appear here (added in a later Kru update)." | Phase 5 (formulas; avoid `""` literals) |

Script Properties: `KRU_KEY` (secret key), `KRU_SHEET_ID` (set by `setup()`, fallback for `sheet_()`).

### Kru SDK message protocol (as implemented)

| Direction | Message | Handled in |
|---|---|---|
| game → shell | `{type:'kru:ready'}` | `Play.tsx` replies with `initMessage(session)` |
| shell → game | `{type:'kru:init', session:{id,class,level,mode,teams,teacherTeam,resume}}` | `kru.js` → `Kru.ready` callbacks |
| game → shell | `{type:'kru:state', state}` | `patch(id,{state})` (debounced IndexedDB save) |
| game → shell | `{type:'kru:score', teamId, delta, reason?}` | appended to `session.log`; fallback totals |
| shell → game | `{type:'kru:finish-request'}` | `Kru.onFinishRequest` callbacks |
| game → shell | `{type:'kru:finish', scores:[{teamId,points}], notes?}` | → status `review`, `/results/:id` |

Solo mode: one team per student, `id: 's' + studentId`, `name: nick`. Teacher team id `t0`. Bin/team ids from `newBinId()` = `'t' + 6 random base36 chars`.

### Gotchas discovered this session (don't re-learn)

| Gotcha | Symptom | Fix / rule |
|---|---|---|
| Bash heredoc drops backslashes in some quoting paths | `vercel.json` invalid; `classKey_` regex `/s+/` | Use Write/Edit tools or a `.cjs` file in the scratchpad |
| Bash multi-line node `-e` with backticks/quotes | "unexpected EOF while looking for matching `''" | Same: write the script to a file |
| Browser pane screenshots are scaled (e.g. 605 px wide for 812 viewport) | Clicks land in the wrong place; "button doesn't work" false alarms | Click by `ref` from `find`/`read_page`, or verify with JS `.click()` |
| Scripted `.blur()` doesn't fire React `onBlur` | Rename "didn't save" | Test with real typing + Enter (`computer type/key`) |
| Back-to-back scripted `.click()` on React elements | Second handler sees stale state | Add waits, or use real clicks |
| zustand selector returning new array/object | React error #185, white "Unexpected Application Error" | Select stored value; derive with `useMemo` outside |
| CSS grid auto rows in a fixed-height scroll container with wrapping flex children | Team boxes overlap | Use `flex-wrap` container instead |
| `max(env(safe-area-inset-top), Npx)` | Header under the iOS status-bar blur in portrait | `calc(sa-top + 14px + var(--top-extra))`, `--top-extra: 30px` in portrait |
| Google Sheets auto-dates `1/2` | Class buttons show long dates | `protectClassColumn_` + `classText_` |
| Spaces/capitals in class names | Duplicate class buttons | `classKey_` matching |
| Two students sharing a number | Copies of students, Start blocked | internal `id` via `cleanRoster` |
| Privacy guard false positives (`'S' + i`, `'S2b'`, example key pattern) | Commit blocked | Use S + digits placeholders; never bypass the hook |
| Old service worker in the preview tab | Old bundle after rebuild | In the browser pane: unregister SWs + delete caches via JS before reload (or tap Reload in the toast) |
| Vercel bot mitigation (Raeng gotcha #2) | 403 challenge pages | Poll `vercel ls` every ~15 s, not tight loops |

### Layout measurements / constants worth knowing

| Thing | Value |
|---|---|
| Target device | iPhone 13 mini, 812×375 CSS px landscape, 375×812 portrait, DPR 3 |
| Tap target | `--tap: 44px`; setup chips 38 px (pool) / 34 px (in teams); tool buttons 36 px |
| Admin breakpoint | sidebar ≥ 1024 px (220 px wide); bottom tabs below (52 px, 40 px in short landscape) |
| Table → cards | `.rtable.cards` under 600 px uses `data-label` |
| Setup layout | top bar 44 px, tool row 36 px (scrolls sideways inside), pool `minmax(170px, 0.32fr)` + bins (flex-wrap, `flex: 1 1 150px`) |
| Scoreboard cards | `minmax(165px,1fr)` group, `minmax(128px,1fr)` solo; points 38 px mono (28 px solo) |
| Home button | 44 px circle, top-right, fades to opacity 0.15 after 3 s |
| Outbox retry | on launch, on `online`, every 60 s; `callScript` timeout 20 s |
| Results freshness | admin store refetches if > 30 s old (or on Refresh) |
| Sessions kept | all unfinished + 30 most recent finished |

### Message pattern that works with Henry (keep using)

- End each phase with: what's new (plain words) → what I checked (numbers) → **what you need to do** (numbered, exact menu paths, e.g. "Deploy → Manage deployments → ✏️ → Version: New version → Deploy") → **numbered iPhone test list** → "When you're happy, I'll start Phase N".
- Say explicitly whether a change needs a **Code.gs redeploy** or only the **app Reload** (most fixes are app-only).
- Shell commands for Henry: separate ```bash blocks, `cd C:\Users\h\kru` first.

### Deployment facts

| Item | Value |
|---|---|
| Live URL | https://kru-psi.vercel.app (public alias; open) |
| Vercel | team `hju-dev1`, project `kru`, Git-connected, builds with `vite build` (skips `tsc`!) |
| GitHub | `hju-dev/kru`, public, branch `main` |
| Deployment Protection | on, but only for per-deployment URLs (e.g. `kru-1k4nac84d-hju-dev1.vercel.app`) |
| Checking deploy | `vercel ls kru` → look for `● Ready` (poll ~15 s; avoid hammering, see Raeng gotcha #2) |
| CSP | `script-src 'self'` (no inline scripts in games!), `connect-src 'self' https://script.google.com https://script.googleusercontent.com`, `frame-ancestors 'self'` |

## Code Analysis

- **`apps-script/Code.gs`** (~640 lines):
  - `doPost` parses JSON → `checkKey_` (constant-time compare against Script Property `KRU_KEY`; returns `not-set-up` or `unauthorised`) → `ACTIONS[req.action]`. Thrown errors become `{ok:false, error:'script-error', message}`.
  - Helpers: `readTable_` (header-keyed objects, skips blank rows, fixes Class dates), `headers_`, `columnValues_`, `appendObjects_` (inserts rows if past `getMaxRows`, sets `@` format on `TEXT_COLUMNS`, one `setValues`), `updateRows_(sh, match, change)` (per-row writes of changed rows only), `deleteRowsMatching_` / `deleteRowsWhere_` (bottom-up, contiguous runs), `withLock_` (`LockService.getScriptLock().waitLock(20000)`).
  - `TEXT_COLUMNS = ['SessionID','SetID','Class','Game','Level','Mode','Team','Name','Nickname','Teammates','Notes']`.
  - `newKey_()` makes four dash-separated groups of 5 characters from alphabet `abcdefghijkmnpqrstuvwxyz23456789` using two `Utilities.getUuid()`.
- **`planSubmission_(resultIds, sessionIds, id)`**: if the id is in Sessions → duplicate (write nothing). If it's in Results but not Sessions → write only the Sessions row (a previous attempt stopped halfway). Otherwise write both. Sessions is always written last as the commit marker.
- **`src/store/app.ts`** (zustand):
  - State: `status / conn / data / syncedAt / syncing / syncError / lastClass / outbox / sending`.
  - Actions: `init` (loads IndexedDB, runs `upgradeCachedBootstrap`, then sync + `sendOutbox`), `signIn` (ping + bootstrap), `signOut` (keeps outbox and sessions), `sync`, `queueResults` (writes the outbox to IndexedDB **before** the network), `sendOutbox` (sequential; stops on offline / timeout / unauthorised / not-json), `saveTeamSet`, `deleteTeamSet`.
- **`src/store/sessions.ts`**: `Session` records in IndexedDB key `sessions`. Saves are debounced 300 ms, and only the 30 most recent finished (submitted/discarded) sessions are kept.
- **`src/lib/session.ts` `Session`** fields:
  - `status: 'setup'|'playing'|'review'|'submitted'|'discarded'`, plus class, game, level, mode.
  - Setup: `size`, `bins` (student **ids**), `absent` (ids), `teacher`, `leaveOut`.
  - At start: `teams: {id,name,members:{no,nick}[]}[]`, `teacherTeam`.
  - Play and review: `state`, `log`, `scores: Record<teamId, number>`, `notes`, `submittedAt`.
  - `initMessage(s)` builds the `kru:init` message. `newSessionId()` gives `YYYYMMDD-HHMM-xxxx`.
- **`src/routes/Play.tsx`**:
  - Accepts `message` events only when `e.origin === location.origin && e.source === frame.contentWindow`.
  - On `kru:ready` it posts `initMessage`. `kru:state` → `patch state`; `kru:score` → appends to the log; `kru:finish` → scores (falling back to `totalsFromLog`) → status review → `/results/:id`.
  - "Finish & review" posts `kru:finish-request` and falls back to log totals after `FINISH_WAIT_MS = 2000`.
  - The home button fades after `FADE_MS = 3000`; a `pointerdown` listener on the iframe's contentDocument brings it back.
  - Wake lock follows `loadPrefs().keepAwake`. CSS shows a turn-sideways overlay in portrait.
- **`public/sdk/kru.js`**:
  - Mock mode when `?mock=1` or not inside an iframe. Mock options: `&mode=solo &level=M.1 &teams=6 &teacher=0`. Mock state lives in `sessionStorage` key `kru-mock-state:<path>`.
  - API: `Kru.ready(cb)`, `Kru.allTeams()` (adds the teacher team with `teacher:true`), `saveState`, `score`, `finish`, `onFinishRequest`.
- **`src/lib/useChipDrag.ts`**: constants `HOLD_MS=280`, `TOUCH_SLOP=8`, `MOUSE_SLOP=5`. Drop targets are `[data-drop]` elements (`"pool"` or a bin id). `wasDrag()` swallows the click that follows a drop for 80 ms.
- **`src/lib/stats.ts`**: `filterSessions`, `teamsOf` (rebuilds teams from student rows, rank then points), `studentTotals` (key = classKey|no|nick lowercased), `toCsv` (adds a `\ufeff` BOM, CRLF line endings, quotes values with `,`, `"` or newlines).
- **Theme variables (`src/theme.css`):** `--sa-*` safe-area insets, `--gutter: 16px`, `--tap: 44px`, `--top-extra` (0px, or 30px in portrait). `.screen` padding = `calc(sa-top + 14px + top-extra)` top, `max(sa-side, gutter)` sides, `max(sa-bottom, 10px)` bottom.

## Phase 3 Prep: What the Legacy Games Contain (read in full at session start)

All four are claude.ai artifacts with no doctype, `<html>` or `<head>`. They load Google Fonts and use inline `<script>`, both blocked by Kru's CSP, so the JS must move to external files.

| Game | Storage keys | Fonts | Key features to keep | Hardcoded stuff to remove / change |
|---|---|---|---|---|
| `tag-team.html` (~440 lines) | `ttt`, `ttt2` | Bricolage, DM Mono, Poppins | `TOPICS.m2` (20 relay topics), `TOPICS.m3` (15 debate motions); `CFG` m2 huddle 30 s / turn 25 s, m3 huddle 90 s / turn 30 s; topic spinner with tone ticks; FOR/AGAINST selects; drag-to-reorder speaking lane (pointer events + arrow keys); +3 Win / +1 Challenge / −1; undo log; "Challenge!" flash; keyboard Space/N/C/S | `ROSTERS` "32"/"33" (already S1–S30 sample names; Team 0 = "T. Henry") → take teams from session; level seg M.2/M.3 → session level; add an M.1 set (simpler relay topics, **20 s turns**); `order` per team → save via `Kru.saveState`; finish → each team's total |
| `word-rush.html` (~450 lines) | `wordrush` | Fredoka, Atkinson Hyperlegible, DM Mono | `PROMPTS_M1` (34: cat / rhyme / letter with example answers), `PROMPTS_M3` (29); `BONUS` cards with weights (classic, long/big words, golden letter, speed 30 s ×2, pass the pen 20 s beeps, spelling police, unique word, sentence, explain (M.3 only), double); `FINAL` round ×2; words × multiplier + bonus scoring; rounds 6–10, writing time 45–90 s; undo last round; winner screen | own team count (3–12) and team names → session teams; level select m1/m3 → session level; **write an M.2 prompt set** (between M.1 and M.3); move prompts to `content.json` |
| `think-tank-showdown.html` (~250 lines) | `ttshow` | Bricolage, DM Mono, Poppins | 4 rounds: Riddle Rush (40 s, 1 pt), Spot the Problem (45 s, 2 / steal 1), What Would Happen If…? (90 s, examples), Final Wager (60 s, bet 0–5); spare questions (flag `true` as 4th element); answer hidden until Reveal; 6-team scoreboard with rename and +1/+2/−1 | fixed 6 `TEAMS` → session teams; current content = **M.3**; **write M.1 and M.2 sets** (easier riddles, simpler claims); **needs a phone landscape layout** (currently stacks under 900 px) |
| `talk-timer.html` (~150 lines) | `m3timer` | DM Mono, Poppins | multi-phase presets (label + seconds), warn colour at ≤ min(30 s, 20 %), done pulse, chime at zero, auto-advance phases, keys Space/R/N; "Full screen" button (doesn't work on iPhone; remove) | `LESSONS` 1–4 hardcoded presets → **editable presets in the app** (name + phases); no teams, no results (`modes: []` in games.json); phone landscape layout |

Common migration checklist per game (HANDOFF 7a + rules):
- Full document with `<!doctype html>`, `<meta charset>`, `viewport-fit=cover`, `/games/shared/kru-game.css` (gives `[hidden]{display:none!important}`, `body{margin:0}`, self-hosted fonts). Word Rush and Think Tank break without `[hidden]`.
- `<script src="/sdk/kru.js">` then an external `app.js`. No inline scripts or `onclick=` attributes.
- `content.json` keyed `"M.1" / "M.2" / "M.3"`, fetched by the game (precached because the workbox glob includes json). Mark doubtful English with `todo`.
- Teams from `Kru.allTeams()`; state via `Kru.saveState`; scores via `Kru.onFinishRequest` → `Kru.finish`. Keep the top-right 56 px clear for the home button.
- Main controls ≥ 44 px tall; student-facing text ≥ 18 px at 812×375; secondary actions in a "⋯" menu; Reveal for answers; sound only after a tap.
- Each must work standalone with `?mock=1` (the SDK provides 30 placeholder students).
- Flip `status` to `"ready"` in `games.json` (and fix `file` paths), and remove each game's own localStorage use (the shell keeps state).

Draft `games.json` metadata already present: tag-team 40 min group; word-rush 30 min group; think-tank-showdown 17 min group; talk-timer tool (`modes: []`, `levels: []`). Note the Home card shows "Group/Solo" tags from `modes`; a tool with `modes: []` will show no tag, and Setup currently assumes group or solo, so Talk Timer needs a path that skips team setup.

## Session Timeline

| Order | Event |
|---|---|
| 1 | Read HANDOFF/games/legacy files; wrote CLAUDE.md; Phase 1 plan + 7 conflicts + 5 questions; Henry answered all |
| 2 | Tidied folders, renamed to `main`, scaffolded Phase 1, generated icons, wrote Code.gs v1 + README, privacy guard, tests (14) |
| 3 | Browser-tested Phase 1; committed `9e2e463`, `61a49cb` |
| 4 | Deploy: found the vercel.json escape bug and the prepare bug; gh public repo blocked by classifier; Henry ran commands (home-folder `git init` mishap cleaned up; doubled paste; `vercel login`); live at kru-psi |
| 5 | Henry's Phase 1 phone test: dates bug → v2; duplicate 3/2P → v3 (regex heredoc bug caught by test) → "That fixed it" |
| 6 | Phase 2 build: logic + tests, Code.gs v4 + fake Sheet, SDK, Scoreboard, Home library, Setup, Play, Results, Outbox; browser tests (grid overlap, Coming soon overlap); privacy false positive; `bf030c6` |
| 7 | Henry's Phase 2 test: duplicates + blur → ids/cleanRoster/RosterCheck + top padding (`09f80ce`); still blurry → `--top-extra` (`bcb6af6`) |
| 8 | Phase 2b build: Code.gs v5 + tests, admin store/stats/rosterImport, layout + 6 pages, prefs; React #185 fix; privacy false positive; `80e8cce` |
| 9 | Handoff written (this file) |

## Files Changed

### Source code (app)
- `index.html`: home-screen meta tags (`apple-mobile-web-app-capable`, `mobile-web-app-capable`, status bar `black-translucent`), icons, 2 startup images (1125×2436 portrait, 2436×1125 landscape), `viewport-fit=cover`.
- `src/main.tsx`: imports fonts (Poppins latin 500/700/800, DM Mono 500, Bricolage variable) and the theme; calls `requestPersistentStorage()`.
- `src/App.tsx`: router; Root runs init, sessions load, `online` → sync + sendOutbox, and a 60 s outbox retry interval (`OUTBOX_RETRY_MS`).
- `src/types.ts`: `Level`, `Student{id,no,nick,active}`, `ClassInfo`, `TeamSet`, `Bootstrap{…, rosterIssues}`, `RosterIssue`, `Connection`.
- `src/theme.css`: tokens, `.screen`, `.btn`, `.field`, `.card`, `.pill`, `--top-extra`.
- `src/lib/api.ts`: `ApiError`, `checkScriptUrl`, `parseReply`, `callScript` (20 s timeout), `ping`, `fetchBootstrap`, `submitResults`, `saveTeamSet`, `deleteTeamSet`, plus admin calls `fetchResults`, `updateSession`, `setSessionDeleted`, `saveRoster`, `saveClass`, `renameClass` (all no-ops in demo).
- `src/lib/bootstrap.ts`: `levelFromClass`, `compareClassNames`, `normalizeBootstrap`, `cleanRoster`, `upgradeCachedBootstrap`, `classKeyOf`.
- `src/lib/demo.ts`: `DEMO_URL='demo'`; 8 classes M.1/2…M.3/3 with 26–30 students; M.3/2 has No. 5 inactive.
- `src/lib/storage.ts`: idb-keyval store `kru`/`kv`. Keys: `connection`, `bootstrap`, `lastClass`, `sessions`, `outbox`, `absent:<cls>:<day>`. `clearAll` keeps sessions and outbox.
- `src/lib/teams.ts`, `src/lib/results.ts`, `src/lib/session.ts`, `src/lib/outbox.ts`, `src/lib/games.ts`, `src/lib/useChipDrag.ts`, `src/lib/useOnline.ts`, `src/lib/time.ts` (`timeAgo`).
- `src/lib/prefs.ts`: idb store `kru-prefs`; `loadPrefs` / `savePrefs` (`keepAwake`, `termStart`), `defaultTermStart`, `drafts.get/set/clear`.
- `src/lib/rosterImport.ts`: `parsePasted`, `mergeRoster`, `replaceRoster`, `sharedNumbers`.
- `src/lib/stats.ts`: see Code Analysis.
- `src/store/app.ts`, `src/store/sessions.ts`, `src/store/admin.ts` (`loadResults` with a 30 s freshness window, `updatePoints` recomputes ranks, `setDeleted`, `demoResults`, `adminErrorText`).
- `src/components/SyncPill.tsx`, `UpdateToast.tsx/.css`, `Sheet.tsx/.css` (modal replacement for browser dialogs, which block automation and are bad UX).
- `src/routes/SignIn.tsx/.css`, `Home.tsx/.css` (class grid + game library + resume banner + Dashboard badge), `Setup.tsx/.css`, `Play.tsx/.css`, `Results.tsx/.css`.
- `src/routes/admin/AdminLayout.tsx`, `Admin.css` (all dashboard styles: nav, tables → cards under 600 px, list items, split view, `.show-on-phone` / `.hide-on-phone` at 1024 px), `Overview.tsx`, `Rosters.tsx` (with `PasteSheet`, `ClassNameSheet`), `TeamsAdmin.tsx` (`SetList`, `SetEditor`; imports `../Setup.css` for chip/bin styles), `ResultsAdmin.tsx` (`SessionDetail`, `StudentHistory`, CSV `download()`), `Settings.tsx/.css` (Outbox exported, `RosterCheck`, `DevicePrefs`), `ClassDefaults.tsx`, `Content.tsx`.

### Games and SDK
- `public/sdk/kru.js`: SDK.
- `public/games/scoreboard/index.html`, `app.js`, `style.css`: Scoreboard game (−1 / +1 / +2, Undo, lead outline, solo compact cards, keeps the top-right corner clear for the home button).
- `public/games/shared/kru-game.css`: `@font-face` for `/fonts/*`, tokens, reset, `.game` safe-area padding.
- `public/fonts/`: 5 woff2 files + `LICENSE-OFL.txt`.

### Back end
- `apps-script/Code.gs` (v5), `apps-script/README.md` (setup, deploy, Classes tab, troubleshooting, including the date-class row).

### Tests
- `tests/*.test.ts` (6 files) + `tests/fakeSheet.ts`. See the Evidence table.

### Config and tooling
- `package.json`: scripts `dev`, `build` (`tsc -b && vite build`), `preview`, `lint`, `test`, `check:privacy`, `icons`, and `prepare` (node try/catch to set `core.hooksPath`).
- `vite.config.ts`: VitePWA config (prompt mode, manifest, workbox globs incl. woff2/json, navigateFallback), `define __APP_VERSION__`, Vitest config.
- `tsconfig.json` with references to `tsconfig.app.json` (src, `resolveJsonModule`), `tsconfig.node.json` (vite/pwa configs) and `tsconfig.test.json` (tests + node types + PWA types).
- `eslint.config.js` (flat config; ignores dist, legacy, apps-script, public).
- `pwa-assets.config.ts`, `public/kru-logo.svg` (placeholder gold "K"), generated icons and splash PNGs.
- `vercel.json` (SPA rewrite excluding files, games and sdk; CSP; `X-Frame-Options: SAMEORIGIN`; `sw.js` no-cache).
- `.gitignore` (zip, `.env*`, `.privacy-denylist.txt`, `*.csv` / `*.xlsx`), `.gitattributes` (LF; png and ico binary).
- `.githooks/pre-commit`, `scripts/check-privacy.mjs`, `scripts/privacy-allowlist.txt` (Mild, Joe, Aomsin, Team Mild, example key `k7m2p-xq9rt-b4hwz-3nfd8`).
- `.claude/launch.json`: `kru-preview` (port 4173) and `kru-dev` (port 5173) for the browser pane.
- `games.json`: added `scoreboard` (ready); legacy file paths → `legacy/games/…`, new-game paths → `public/games/…`.
- `CLAUDE.md`: created and kept updated (rules, decisions, commands, implementation notes).

## User Feedback & Preferences (REQUIRED — never omit)

- **Process rules from Henry's opening brief:**
  - "Finish one phase at a time, run its acceptance checks, then stop and tell me what to test on my iPhone before moving on."
  - "Never commit student names. Rosters and results live only in my Google Sheet. Check before every commit."
  - "If something in the plan doesn't work on iOS, say so and suggest an alternative rather than working around it silently."
  - "Keep me in plain language — I'm a teacher, not a full-time developer."
- **Hard rules for CLAUDE.md** (Henry asked for these): work phase by phase; no student data in the repo; tap-to-place is the primary team-sorting method; games are iPhone-landscape only; admin screens must work on phone and laptop.
- **Answers to my Phase 1 questions:**
  - "1. My google drive." (personal Gmail account owns the Sheet, so "Anyone" access works)
  - "2. Yes, and repo can be public as long as student information isn't public." (Vercel under hju-dev, public repo)
  - "3. Yes." (rename master → main)
  - "4. It's a placeholder." ("Team Mild" example)
  - "5. Yes." (Classes tab, POST for everything, folder tidy-up)
- **"Go ahead"**: approved the deploy (but the auto-mode classifier blocked me from creating the public repo, so Henry ran the commands himself).
- **Class names in his Sheet** are short forms like `1/2`, `1/3`, `2/2`, `3/2P`, `3/3P`, plus real classes **"M.2" and "M.3"** ("m.2 and m.3 are right"). Rosters had the spelling `3/2 P` with a space.
- On duplicates: "there are multiple copies of certain students in the app. I can't start certain games because there are multiple copies of students and I don't want to add them to the game if they aren't necessary. Can you look into this?"
- On blur: "It's a bit blurry at the very top of the screen when vertical. so it is hard to see the Library pill in settings, and then Kru on the main page and synced 1 minute ago and the dashboard pill." Then: "still blurry - move them down a bit more with some blank space at the top (vertical only)".
- Henry prefers short go-ahead messages: "That fixed it, start Phase 2", "Start phase 2B". He tests carefully and reports by numbered checklist item, so keep giving numbered test steps.
- Henry runs commands in **PowerShell from `C:\Users\h`** by default. Always give `cd C:\Users\h\kru` first, one command per code block. Warn him never to run `git init` if a "not a git repository" message appears.
- He reads the Sheet directly to verify ("It showed up in sheets on Submit"), so Sheet-visible results matter.

## Where We're Going

1. **Wait for Henry's Phase 2b test report** (7 numbered checks from the last message: Results edit/delete/restore, By student, Rosters add/sync/inactive, Paste merge, Teams edit + classroom Load, CSV in Excel, laptop sign-in at `/admin`). He must first paste **Code.gs v5** and redeploy as a New version, then tap Reload in the app.
2. **Also confirm the portrait blur fix** (`--top-extra: 30px`, commit `bcb6af6`). If it's still blurry, increase `--top-extra` in `src/theme.css` (for example to 44px). Check whether `apple-mobile-web-app-status-bar-style` = `black` (opaque) would be better than `black-translucent`.
3. **Fix whatever Henry reports**, re-run `npm test` / `npm run lint` / `npm run build` and the browser check, then commit + push. Tell him exactly what to redeploy: app only, or Code.gs too (bump `KRU_SCRIPT_VERSION`).
4. **Phase 3 (after Henry's OK):** migrate the 4 legacy games (`legacy/games/tag-team.html`, `word-rush.html`, `think-tank-showdown.html`, `talk-timer.html`) into `public/games/<slug>/index.html` + **external** JS + `content.json` keyed by M.1/M.2/M.3. Per HANDOFF 7a:
   - Each game gets a full document, the `[hidden]` reset, self-hosted fonts (`/games/shared/kru-game.css`), and the SDK.
   - Tag-Team: teams from the session; add an M.1 set (20 s turns).
   - Word Rush: write an M.2 prompt set.
   - Think Tank: write M.1 and M.2 sets plus a phone landscape layout.
   - Talk Timer: presets editable in the app; phone layout; no teams or results (`modes: []`).
   - All games: main controls ≥ 44 pt, student text ≥ 18 px, and a `todo` field on doubtful content. Flip `status` to `"ready"` in `games.json`.
5. **Phase 4:** new games (Name Picker, Sentence Scramble, Quiz Battle, Board Race, Hot Seat Vocab) with M.1–M.3 content and `?mock=1`. **Phase 5:** polish (Recently played, favourites, `Summary` tab formulas without `""` literals, empty and error states). Content editor after Phase 4.

## Risks & Blockers

- **Henry hasn't deployed Code.gs v5 yet.** Until he does, every admin action returns `unknown-action` (the app shows "The Sheet's script reported a problem: unknown-action").
- **Vercel builds with `vite build` only**, so type errors don't block a deploy. Always run `npm run build` locally before pushing.
- **The auto-mode classifier blocks public-surface actions** (e.g. `gh repo create --public`). Pushing to the existing repo worked fine; anything new and public needs Henry.
- **Shell heredoc + backslashes:** bit twice (`vercel.json` regex, `classKey_` regex) and once caused a bash EOF error. Use the Write/Edit tools or a `.cjs` file in the scratchpad for multi-line scripts with regexes or backticks.
- **CSP `script-src 'self'`**: legacy games use inline `<script>` and Google Fonts links. Phase 3 must move JS to external files and switch to `/fonts/` or the migrated games will silently fail to run.
- **Admin results load everything at once.** At about 48k rows a year (30 students × 5 games/week × 8 classes × 40 weeks) the response may reach several MB. Fine for now; add server-side filters (the `results` action already accepts class/game/level/from/to) if it gets slow.

## Open Questions

- Is the portrait top bar sharp now with 30px extra space? (Not yet answered.)
- Does iOS standalone mode download the CSV via `<a download>` or open a share sheet? Untested on the device; possibly fall back to `navigator.share({files})`.
- Do the earlier duplicate Results rows from the Phase 2 test submission still exist in Henry's Sheet? I told him to delete them manually, or use Delete game in the new Results screen.
- Should "top students this term" have a smarter default term start for Henry's school calendar? Currently May 1 / Nov 1, editable in Settings → Options.

## Quick Start for Next Session

```bash
# Reference docs (read first)
#   HANDOFF.md  (the plan; Phase 3 = section 7a + 10)
#   CLAUDE.md   (rules, decisions, implementation notes)
#   memory: C:\Users\h\.claude\projects\C--Users-h-kru\memory\kru-phase-status.md

# Key files to read first
#   src/routes/Play.tsx + public/sdk/kru.js + public/games/scoreboard/app.js   (SDK pattern for Phase 3 games)
#   apps-script/Code.gs                                                         (back end, v5)
#   src/store/app.ts, src/store/admin.ts, src/lib/session.ts                    (state)
#   legacy/games/*.html                                                         (Phase 3 sources)

# Verify current state
cd C:/Users/h/kru && npm test && npm run lint && npm run build
git status && git log --oneline -3          # expect 80e8cce at or near the top, clean tree
vercel ls kru | head -3                      # latest deploy should be ● Ready

# Browser check (built-in browser pane): preview_start name "kru-preview" (port 4173), then "Try demo"

# Next action
# Ask Henry for his Phase 2b test results (and whether the portrait top bar is sharp now).
# Fix anything reported; only when he says OK, start Phase 3 (migrate the 4 legacy games to the SDK).
```

## Session Closed
**Closed at:** 2026-11-04 17:25 +0700
**Commit:** e5d5ad4
**Session status:** Handed off to next session
