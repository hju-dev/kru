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
legacy/games/       the four original claude.ai games, untouched, for reference until Phase 3
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
- Per-device prefs (`src/lib/prefs.ts`): keep screen awake, term start date.
- **Tools** (games with `modes: []` in games.json, e.g. Talk Timer) skip class choice and team setup: Home → `/tool/:game` (`src/routes/Tool.tsx`). The shell answers `kru:ready` with a session that has `mode: 'tool'`, no teams, and `resume` = the tool's saved settings (IndexedDB `tool:<slug>`); `kru:state` saves them. No results.
- `tests/games.test.ts` checks every `ready` game: file path, full document, SDK + shared CSS, no inline scripts/handlers, no Google Fonts, no localStorage.
- Phase 3 (Henry's choices): games go live one at a time; Word Rush scores by tap buttons (no keyboard); Talk Timer presets saved on the phone only.

## graphify

If `graphify-out/graph.json` exists, use `graphify query` / `path` / `explain` for codebase questions, and run `graphify update .` after code changes.
