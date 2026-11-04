# Kru (ครู): ESL Games Library app — build plan for Claude Code (v2)

Owner: Henry (ESL teacher, Ayutthaya Wittayalai School)
Sister project: Raeng (แรง), React + Vite PWA, dark mobile-first UI. Reuse its stack, conventions and deploy setup.
"Kru" is a working name.

## 1. What we are building

A home-screen web app (PWA) on Henry's **iPhone 13 mini**. It holds his classroom games and tools, knows his class rosters, lets him form teams before each game, and sends final scores to a Google Sheet.

**How he uses it:**
- He **AirPlays (Screen Mirroring) the iPhone to the classroom smartboard** and holds the phone **sideways** (812 × 375 CSS px).
- He taps a class, sets up teams, picks a game, plays, then submits the scores.
- Students see exactly what is on the phone. Henry is fine with that and teaches around it.

**Decisions already made:**

| Topic | Decision |
|---|---|
| Framework | **React + Vite + TypeScript + vite-plugin-pwa** |
| Devices | **Games: iPhone only** (iPhone 13 mini, landscape); they don't need laptop layouts. **Admin dashboard (rosters, teams, results, settings): must work on both the iPhone and a laptop browser** (section 8b). |
| Users | Henry only. One "sign-in" (a secret key) on his phone. |
| Rosters | Student number (1–30) + nickname, kept in a **private Google Sheet**. Never in the code or the repo. |
| Scores | Every team member receives the team's final points. The spreadsheet gets **one row per student per game**, with teammates listed for reference. |
| Debate grading | No individual speaker grades. Team points go to each player. |
| Difficulty | Every game has a **level switch: M.1 / M.2 / M.3**. It changes the content but not the mechanics. |
| Old chat-built games | Dropped (Pelmanism, Prove It!, Word Factory, Jeopardy). They're replaced by new games (section 7). |
| Source of truth | **This repo is the master copy of every game.** Changes made in claude.ai chats are copied into the repo; the repo is never overwritten from claude.ai. |

## 2. The classroom flow (core of the app)

```
Library ─► Choose class ─► Choose game ─► Set up players ─► Play ─► Review scores ─► Submit
```

1. **Choose class:** a grid of class buttons from the Rosters sheet (M.1/2, M.1/3, M.2/1, M.2/2, M.2/3, M.3/1, M.3/2, M.3/3 and so on). The last class used is highlighted.
2. **Choose game:** the library, filtered to games that fit. Picking a class sets the default level from its grade (M.3/2 → M.3); Henry can change it.
3. **Set up players:**
   - **Solo or Group.** Each game declares what it supports. Some are group-only, and a tool like the Name Picker is solo.
   - **Solo:** every present student plays as themselves.
   - **Group:** Henry sets **team size** (2–6), and the app creates the right number of team bins (rounded up from present students ÷ size). He can add or remove a bin.
   - **Absent students:** tap a name to mark it absent. It's greyed out and left out of play and results.
4. **Play:** the game opens full screen with the class, level and teams already loaded.
5. **Review scores:** when the game ends (or Henry taps "Finish"), a results screen lists each team, its members and its points.
   - Points can be edited.
   - Ranks are calculated automatically.
   - A **Discard** option is available.
6. **Submit:** the scores are written to the Google Sheet. If offline, they're queued and sent later (section 5).

### Team setup screen (drag names into bins)

- **Layout (landscape):**
  - Left: an **Unassigned** pool of name chips (No. + nickname, for example "12 · Mild").
  - Right: the team bins in a grid.
  - Top bar: mode, team size, buttons.
- **Ways to move students:**
  - **Tap to place (the primary method):** tap a chip to select it (it lifts and highlights), then tap a bin to drop it there. Tapping another chip while one is selected switches the selection; tapping the selected chip again deselects it. Tapping a bin's empty space with nothing selected does nothing. Multi-select is a bonus: tap several chips, then one bin.
  - **Drag (secondary):** drag a chip from the pool into a bin, between bins, or back to the pool. Use pointer events so touch works. A library like `@dnd-kit` is fine; test touch on iOS. Dragging must never get in the way of tap-to-place (no accidental drags from a tap).
- **Team names:** each bin is "Team 1…n" by default. Tap the name to rename it ("Dragons", "Team Mild"…).
- **Buttons:**
  - **Shuffle**: random, balanced teams.
  - **Fill evenly**: put the unassigned students into the smallest teams.
  - **Clear**.
  - **Load saved teams** and **Save these teams** (a name like "Debate teams"). Saved team sets are stored in the Sheet so they survive a phone reset.
- **Teacher team:**
  - Option to add **Team 0 · T. Henry** (Henry plays against the class).
  - Team 0's points are **not** written to the student results.
  - They are kept in the session record.
- **Validation:** Start is disabled until no present student is unassigned (or Henry confirms "leave unassigned out"). Empty bins are allowed but flagged.

## 3. Platform facts and limits (verify on the phone)

My best understanding of iOS as of mid-2026. Henry checks each one on the device.

| Topic | Expected behaviour | What to do |
|---|---|---|
| Address bar | No Safari UI when launched from the home-screen icon with manifest `"display": "standalone"` + `apple-mobile-web-app-capable`. | Do both. Test from the icon, not Safari. |
| Fullscreen API | iPhone Safari doesn't support `element.requestFullscreen()` for normal elements. | "Full screen" = the game fills the standalone viewport. |
| Orientation lock | iOS ignores the manifest `orientation`. | Design for landscape and show a "Turn sideways" hint in portrait during play. |
| Safe areas | The notch is on the left or right in landscape. | `viewport-fit=cover` + `env(safe-area-inset-*)` everywhere. |
| Screen sleep | Wake Lock is supported in Safari 16.4+. **Not certain** it's reliable in home-screen apps on every iOS version. | Request on game open, re-request on `visibilitychange`, fail silently. Settings tip: Auto-Lock → Never in class. |
| Storage | The home-screen app has its own storage, separate from Safari. | Call `navigator.storage.persist()`. The Sheet is the backup for rosters, team sets and results. |
| Audio | Web Audio starts after a tap; the silent switch may mute it. | Test with the switch both ways. |
| AirPlay | Mirrors the phone exactly, with side bars on a 16:9 board. It needs the classroom network or Apple TV peer-to-peer. | Nothing to build. Henry keeps a charger at the board (mirroring and a wake lock drain the battery). |

## 4. Architecture

- **Shell (React):**
  - Classroom routes (phone-first): `/` (class picker + library), `/setup/:game`, `/play/:session`, `/results/:session`.
  - Admin routes (responsive: phone and laptop): `/admin` (overview), `/admin/rosters`, `/admin/teams`, `/admin/results`, `/admin/content`, `/admin/settings`.
  - State: Zustand or React context, persisted to IndexedDB (`idb-keyval`).
- **Games:** each game is **its own page**, `public/games/<slug>/index.html` (plain HTML/JS, or a small Vite/React entry if it's complex). The shell loads it in a **full-viewport same-origin iframe**.
  - Games stay independent, so one broken game can't break the app.
  - A game can be developed and tested on its own with a mock session (`?mock=1`).
- **Home button:** a translucent button over the iframe (top-right, offset by safe-area insets). It fades after 3 seconds and reappears on tap.
  - Tapping it opens a small sheet: **Finish & review scores · Back to library (keep game) · Restart game**.
- **Kru Game SDK** (`public/sdk/kru.js`, about 100 lines): the contract between the shell and every game (section 6).
- **Content packs:** each game's content lives in `public/games/<slug>/content.json`, keyed by level (`"M.1"`, `"M.2"`, `"M.3"`). Henry can edit content without touching game code.
- **Offline:** Workbox precaches the shell, every game, the content packs, self-hosted fonts and the last-fetched rosters.
  - Use `skipWaiting` with an "Update available, tap to reload" toast. A game never changes mid-lesson.
- **Fonts:** self-host every font in `public/fonts/`. No Google Fonts requests, so everything works offline.

## 5. Google Sheet back end (Apps Script)

Henry already writes Google Apps Script, so the back end is one Sheet plus one script in `apps-script/Code.gs` (Claude Code writes it; Henry deploys it).

### Sheet tabs

| Tab | Columns | Notes |
|---|---|---|
| `Rosters` | Class · No · Nickname · Active | Henry types or pastes these. Classes are read from here; nothing is hardcoded. |
| `TeamSets` | SetID · Class · Name · Team · No · Nickname · SavedAt | Written by the app's "Save these teams". |
| `Results` | SessionID · Date · Time · Class · Game · Level · Mode · Team · No · Nickname · Points · Rank · Teammates · Notes | **One row per student per game.** Example: Joe is in Team 2, which scored 17, so Joe's row has Points 17, Rank 2, and Teammates listing the others. Absent students get no row. |
| `Sessions` | SessionID · Date · Class · Game · Level · Mode · TeamCount · TeacherTeamPoints · SubmittedAt | One row per game played. |
| `Summary` | (formulas) | Per student per class: total points, games played, average. Use QUERY/SUMIFS formulas that are built by the script on first run. Avoid formulas that rely on empty-string literals ("") — they broke on Henry's earlier Drive-converted Sheets. |

### Script endpoints (one web app URL)

- `GET ?action=bootstrap&key=…` returns `{ classes: [...], rosters: {...}, teamSets: [...] }`.
- `POST {action:"submitResults", key, session, rows}` appends to Sessions and Results. **Idempotent on SessionID**: a resend after a timeout must not create duplicate rows. Check for the SessionID first.
- `POST {action:"saveTeamSet", key, set}` / `{action:"deleteTeamSet", key, setId}`.
- Admin dashboard endpoints:
  - `GET ?action=results&key=…&class=&game=&from=&to=` returns sessions with their rows (paged, newest first).
  - `POST {action:"updateSession", key, sessionId, rows}` corrects points or rank for a session. It rewrites that session's rows and records `EditedAt`.
  - `POST {action:"deleteSession", key, sessionId}` deletes a session's rows. It's a soft delete: set `Deleted = TRUE` so totals ignore it and it can be restored.
  - `POST {action:"saveRoster", key, class, students:[{no, nick, active}]}` replaces one class's roster.
  - `POST {action:"addClass" | "renameClass" | "archiveClass", key, …}`.
  - `POST {action:"saveContent", key, game, level, pack}` is optional (see 8b, Content). It stores edited content packs in a `Content` tab, which overrides the bundled `content.json`.
- Add `Deleted` and `EditedAt` columns to `Results` and `Sessions`. Every total and summary ignores deleted rows.
- Writes use `LockService` so two quick submissions (phone + laptop) can't interleave.
- **Auth:**
  - A secret key stored in Script Properties. Requests without it get `{ok:false, error:"unauthorised"}`.
  - The app's **Sign in** screen asks for the web app URL and the key once, then stores them on the phone. The key is never in the repo.
- **CORS:** send POST bodies as `Content-Type: text/plain` (JSON string). This avoids the browser preflight, which Apps Script web apps don't answer. Responses come back after Google's redirect, so use `fetch` with `redirect: "follow"`.
- **Deploy:** Execute as **Me**, access **Anyone**. The key is the protection. Include step-by-step deploy notes for Henry in `apps-script/README.md`, including "redeploy as a new version after editing".

### Offline outbox

- Submitted results go to an IndexedDB **outbox** first, then the app tries to send them.
- On failure they stay queued. The app retries on launch, on `online` and on a 60-second timer while open.
- A badge on Settings shows "2 results waiting to send". Henry can view the queued sessions and resend or delete one.
- Rosters and team sets are cached on the phone. With no signal, the app still works using the last bootstrap.

## 6. Kru Game SDK (shell ⇄ game contract)

Messages go between shell and iframe with `postMessage` (same origin, but still check `event.origin`).

**Shell → game**
```ts
{ type: "kru:init", session: {
    id: string, class: "M.3/2", level: "M.1" | "M.2" | "M.3",
    mode: "solo" | "group",
    teams: [{ id: "t1", name: "Dragons", members: [{ no: 12, nick: "Mild" }] }],   // solo: one team per student
    teacherTeam: { id: "t0", name: "T. Henry" } | null,
    resume?: any            // the game's own saved state, if reopened
}}
{ type: "kru:finish-request" }   // Henry tapped "Finish & review scores"
```

**Game → shell**
```ts
{ type: "kru:ready" }
{ type: "kru:state", state: any }                    // the game saves its state through the shell (keyed by session)
{ type: "kru:score", teamId: string, delta: number, reason?: string }   // optional live log
{ type: "kru:finish", scores: [{ teamId: string, points: number }], notes?: string }
```

**Rules:**
- Games **must not** keep their own rosters or hardcode classes.
- Games read `level` and load the matching section of `content.json`.
- Games must work on their own with `?mock=1`, using a built-in fake session of 30 students, for development.
- Every game shows its own scoreboard **using the session's team names**.

## 7. Games

**Shared requirements for every game:**
- **Phone controls:** the 2–3 main actions (Start, Next, Reveal, +points) are **≥ 44 pt tall**. Secondary actions go in a "⋯" menu. Don't shrink everything to fit.
- **Board legibility:** text that matters to students is ≥ 18px at 812 × 375 (it's scaled up on the board).
- **Answers:** answers or examples stay hidden until a deliberate **Reveal** tap.
- **Content:** level content lives in `content.json` with at least **M.1, M.2 and M.3** sections. M.1 is A2–B1, M.2 is B1, M.3 is B1+. Content must be accurate English; mark anything doubtful in a `todo` field for Henry to check.
- **Sound:** chimes are optional and play only after a tap.

### 7a. Migrate the existing games (files in `games/`)

These are claude.ai artifacts, which were wrapped in a skeleton at publish time. Each needs:
- A full document: doctype, `<html>`, head with `charset` and `viewport-fit=cover`.
- The reset `[hidden]{display:none!important} body{margin:0}`. **Word Rush and Think Tank Showdown break without `[hidden]`.**
- Self-hosted fonts.
- The SDK.

| Game | Changes |
|---|---|
| **Tag-Team Talk / Debate** (`tag-team.html`) | **Remove the hardcoded M.3/2 and M.3/3 rosters** (privacy: they mustn't end up in the repo). Take teams from the session. Keep: topic spinner, huddle/turn timer, FOR/AGAINST picker, drag-to-reorder speaking order (per team, saved in game state), +3 Win / +1 Challenge / −1 scoring. Team 0 = session `teacherTeam`. Level: M.2 relay topics, M.3 debate motions, add M.1 (simpler relay topics, shorter 20 s turns). On Finish, send each team's total. |
| **Word Rush** (`word-rush.html`) | Teams from session (remove its own team count). Content to `content.json`: it has M.1 and M.3 prompt sets. **Write an M.2 set** (between the two). Keep bonus cards and the words × multiplier + bonus scoring. |
| **Think Tank Showdown** (`think-tank-showdown.html`) | Teams from session. Content to `content.json`: the current set is M.3. **Write M.1 and M.2 sets** (easier riddles and simpler claims). Needs the **phone landscape layout**. |
| **Talk Timer** (`talk-timer.html`) | A tool with no teams and no results. Make presets editable in the app (name + phases) instead of hardcoded lesson presets. Needs the phone landscape layout. |

### 7b. New games

| Game | Mode | How it plays | Scoring | Level changes |
|---|---|---|---|---|
| **Name Picker / Hot Seat** | Solo (tool) | Spins a random present student. The **no-repeat** rule is on until everyone has been picked, and "picked" is remembered per class for the day. Optional question card from the level pack (for example "Tell me one thing you did on holiday"). | Optional: +1 / +2 to the picked student. | Question cards per level |
| **Sentence Scramble Race** | Group | A sentence is shown as jumbled word tiles on the board. Teams write the correct sentence on paper. Henry taps the first correct team, then Reveal. | 3 / 2 / 1 for the first three correct teams. | M.1 5–7 words, past simple; M.2 8–10 words, past continuous and linking words; M.3 11–14 words, relative clauses and conditionals |
| **Quiz Battle** | Group | Multiple choice or short answer, one question at a time, with a timer. Teams hold up answers. Henry taps the teams that were right. Question sets are chosen per unit. | +1 per correct team, ×2 on "double" questions. | Question bank per level, tagged by unit/topic. **Must make it easy for Henry to add sets later** (JSON, or paste into a `Questions` tab in the Sheet). |
| **Board Race** | Group (2–6 teams) | A category or task is shown (for example "past simple of these verbs", "jobs", "idiom endings"). One runner per team writes on the whiteboard. Round timer. Henry taps points per team. | Henry taps points. | Prompt sets per level (M.1 verb forms, M.2 holiday words and past continuous, M.3 idioms and collocations) |
| **Hot Seat Vocab** | Group | One student per team sits facing away from the board. The word is shown and teammates describe it without saying it. 60-second rounds, Skip allowed. | +1 per word guessed. | Word lists per level (M.3 = the harder Person / Place / Thing / Idea list) |

(Team Maker isn't a separate game any more: it's the team setup screen, section 2.)

## 8. Library UI

- **Look:** dark and app-like, close to Raeng's. Built landscape-first at 812 × 375, and portrait works too.
- **Home:**
  - The class picker row at the top.
  - Below it, game cards: thumbnail, title, Solo/Group badge, minutes, level dots.
  - A **Recently played** row.
  - **Favourites.**
- **Dashboard button:** opens the admin dashboard (section 8b), where all settings, rosters, teams and results live. The library only shows a small sync and outbox indicator.
- **App icon and splash:** `apple-touch-icon` 180, manifest icons 192/512 + maskable, and `apple-touch-startup-image` for the 13 mini (1080×2340, 2340×1080) to avoid a white flash.

## 8b. Admin dashboard (phone and laptop)

The same app at `/admin`, reached from a **Dashboard** button in the library and opened directly on a laptop browser. Henry signs in on the laptop with the same script URL + key. This is where he sets things up and reads scores; the classroom screens stay phone-only.

**Layout:**
- **Laptop (≥ 1024 px):** a left sidebar (Overview · Rosters · Teams · Results · Content · Settings) and a wide content area with real tables.
- **Phone:** the sidebar becomes a bottom tab bar, and tables become stacked cards with the same actions.
- Test at **375 px portrait, 812 × 375 landscape and 1440 × 900**. No horizontal page scroll; wide tables scroll inside their own container.

**Screens:**
- **Overview:**
  - Last 5 sessions (class, game, date, top team).
  - Outbox status ("2 waiting to send").
  - Last synced time.
  - The term's top 5 students per class.
- **Rosters:**
  - Pick a class, then see a table of No. · Nickname · Active.
  - Inline edit, add row, deactivate (keep their history; don't delete).
  - **Paste import:** paste two columns from a spreadsheet ("1 [tab] Aomsin"), preview, then replace or merge.
  - Add, rename or archive a class.
- **Teams:**
  - The saved team sets per class: view, rename, duplicate, delete.
  - Edit with the same tap-to-place bins as the classroom setup screen, laid out wider on a laptop.
- **Results:**
  - Filters: class, game, level, date range.
  - **By session:** the sessions list. Open one to see teams, members and points; edit a team's points (all members' rows update), or soft-delete or restore the session.
  - **By student:** one row per student with total points, games played, average and last played. Click a student to see their history.
  - **Export CSV** for the current filter, for school records.
  - An "Open in Google Sheets" link.
- **Content (optional, can come after Phase 4):**
  - Per game and level, edit the content pack in a simple form: list editors for prompts, words, sentences and questions, with Add / Remove / Reorder.
  - Saved to the `Content` tab, so Henry can fix a bad riddle from his laptop without a code change.
  - A "Reset to built-in" option.
- **Settings:**
  - Sign in / out, script URL, test connection.
  - Sync now.
  - Outbox (view, resend, delete).
  - Default team size per class.
  - Keep screen awake (phone).
  - App version / check for update.
  - Tips.

**Notes:**
- The admin screens use the same dark theme, at normal desktop sizes on a laptop (14–16 px body text).
- Editing in two places: the Sheet is the source of truth. The dashboard refreshes after every write and shows "Updated just now". If a write fails (offline, script error), it shows what failed and keeps the edit for retry. Nothing is silently lost.
- Games still run only on the phone, but **opening the library on a laptop shouldn't break anything**. Games may just look cramped or oversized there, which is fine.

## 9. Hosting

- Static hosting with HTTPS: whatever hosts Raeng, otherwise Cloudflare Pages or Netlify. `start_url` / `scope` = `/`.
- **The repo can be public** because it contains no student data: rosters and results live only in the private Sheet. Double-check this before the first push (grep for nicknames from the old Tag-Team file).

## 10. Build phases and acceptance checks

**Phase 1: Shell, install, back end**
- [ ] Vite + React + TS + PWA scaffold, manifest, icons, splash, dark theme, safe areas.
- [ ] `apps-script/Code.gs` + README, Sheet tabs created by a setup function.
- [ ] Sign in → bootstrap → classes and rosters appear. Works offline from the cache afterwards.

**Phase 2: Class → setup → results → Sheet**
- [ ] Team setup: Solo/Group, team size, drag **and** tap-to-place, rename, absent, shuffle, fill evenly, save/load team sets, Team 0.
- [ ] Results screen: edit points, ranks, submit.
- [ ] **Joe test:** Joe (No. 7) is in Team 2, and Team 2 finishes with 17. Results gets a row: Joe, 7, Team 2, 17, rank, teammates. Absent students have no row. Team 0 isn't in Results.
- [ ] Offline submit goes to the outbox and sends when back online. Resending the same session creates no duplicate rows.

**Phase 2b: Admin dashboard**
- [ ] Sidebar layout on a laptop, bottom tabs on the phone. Works at 375 px, 812 × 375 and 1440 × 900 with no horizontal page scroll.
- [ ] Rosters: edit, paste import, deactivate, add class. Changes appear on the phone after Sync.
- [ ] Results: session list, edit a team's points (all members update), soft delete / restore, by-student totals, CSV export.
- [ ] Teams: saved sets editable with tap-to-place.

**Phase 3: Migrate the 4 games to the SDK**
- [ ] Each runs from the session, with no hardcoded rosters, and its levels come from content.json.
- [ ] Word Rush gets an M.2 set; Showdown gets M.1 and M.2 sets; Tag-Team gets an M.1 set.
- [ ] Showdown and Talk Timer get phone layouts. All of them use ≥ 44 pt main controls.

**Phase 4: New games**
- [ ] Name Picker, Sentence Scramble Race, Quiz Battle, Board Race, Hot Seat Vocab, each with M.1/M.2/M.3 content and a `?mock=1` mode.

**Phase 5: Polish**
- [ ] Recently played, favourites, update toast, `Summary` tab formulas, empty and error states.

**Checks only Henry can do (on the iPhone):**
- [ ] Opens from the home-screen icon with no address bar, in both orientations.
- [ ] The notch doesn't cover controls with the phone turned either way.
- [ ] Dragging names works with a finger, and tap-to-place works.
- [ ] The screen stays awake during a game (or he sets Auto-Lock to Never).
- [ ] Chimes play with the silent switch on and off.
- [ ] Mirrored to the smartboard, the text is readable from the back row.
- [ ] Submitted scores appear in the Sheet correctly for one real class.

## 11. Out of scope (for now)

- Running games on a laptop, iPad or Android (the admin dashboard does run on a laptop).
- Students using their own devices.
- A second "presenter" screen (the phone and the board show the same thing; that's accepted).
- Accounts beyond Henry's key.

## Files in this handoff

- `HANDOFF.md`: this plan
- `games.json`: draft registry
- `games/*.html`: the four current games as published on claude.ai. In `tag-team.html` the real class rosters have already been replaced with sample names (S1–S30), so no student data is in this handoff.
