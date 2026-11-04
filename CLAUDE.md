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

## graphify

If `graphify-out/graph.json` exists, use `graphify query` / `path` / `explain` for codebase questions, and run `graphify update .` after code changes.
