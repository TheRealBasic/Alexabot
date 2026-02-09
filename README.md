# EIDOLON OS // Recovery Image

A browser-based narrative desktop simulation where you investigate a failing continuity system through files, terminal commands, and (optionally) co-op role play.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Quick Start (Solo)](#quick-start-solo)
- [Quick Start (Co-op / Multiplayer)](#quick-start-co-op--multiplayer)
- [Gameplay Basics](#gameplay-basics)
- [Terminal Commands](#terminal-commands)
- [Progression Guide (High Level)](#progression-guide-high-level)
- [Saving and Resetting](#saving-and-resetting)
- [Testing](#testing)
- [Style & UI Consistency Notes](#style--ui-consistency-notes)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

EIDOLON OS presents a retro desktop UI with in-world applications (Explorer, Terminal, Notes, Media, Help, Settings) and a branching progression system.

You move through 3 chapters by uncovering evidence, completing objectives, and (in co-op) coordinating between **operator** and **observer** roles.

## Features

- Story progression across 3 chapters.
- In-world file system with hidden/revealed content.
- Terminal-driven puzzle and command interactions.
- Role-aware command restrictions (observer vs operator in co-op).
- Trust/conflict tracking in co-op that influences end-state flavor.
- Local save state (solo) and persistent room snapshots (multiplayer server).

## Project Structure

```text
.
├── index.html
├── src/
│   ├── apps/               # Desktop app windows (terminal, explorer, notes, ...)
│   ├── progression/        # Action reducer + behavior reactions
│   ├── styles/             # tokens/layout/components/effects CSS
│   ├── content.js          # In-world filesystem and dynamic file visibility
│   ├── state.js            # Save schema + chapter/objective state helpers
│   ├── main.js             # App bootstrap + desktop orchestration + co-op hooks
│   └── ...
├── server/
│   ├── multiplayer-server.js
│   └── room-store.js
└── tests/
```

## Requirements

- Node.js 18+ recommended.
- npm.
- Python 3 (used by the current `npm run dev` script, which serves static files).

## Quick Start (Solo)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm run dev
   ```
3. Open:
   ```text
   http://localhost:4173
   ```

## Quick Start (Co-op / Multiplayer)

You need two processes:

1. Static web app server:
   ```bash
   npm run dev
   ```
2. WebSocket multiplayer server:
   ```bash
   npm run dev:multiplayer
   ```

Then open the app in two clients/browsers and join/create the same room from the in-game lobby.

### Multiplayer server defaults

- WebSocket URL: `ws://localhost:8787`
- Default port comes from `MULTIPLAYER_PORT` (fallback `8787`).
- Optional JWT join validation can be enabled by setting `MULTIPLAYER_JWT_SECRET`.


### Wakeful Thread Live AI Guide (optional)

To run the in-game chat as a live AI copilot with full session context:

1. Start the web app and multiplayer server (if using co-op):
   ```bash
   npm run dev
   npm run dev:multiplayer
   ```
2. Export your model key:
   ```bash
   export OPENAI_API_KEY=your_key_here
   ```
   PowerShell equivalent:
   ```powershell
   $env:OPENAI_API_KEY = "your_key_here"
   $env:WAKEFUL_AI_MODEL = "gpt-4o-mini"
   ```
3. Start the Wakeful AI service:
   ```bash
   npm run dev:wakeful-ai
   ```
4. Open the game and switch Chat mode from `LOCAL CORE` to `LIVE AI`.

Defaults:

- Endpoint: `http://localhost:8790/ai/wakeful-thread/respond`
- Override endpoint from URL with `?ai=http://host:port/ai/wakeful-thread/respond`
- Override model with `WAKEFUL_AI_MODEL` (or `OPENAI_MODEL`; default `gpt-4.1`)

Quick API smoke test:

```bash
curl -sS -X POST http://localhost:8790/ai/wakeful-thread/respond \
  -H "content-type: application/json" \
  -d '{"player":{"id":"me","role":"operator"},"progress":{"chapter":1},"recent":{},"prompt":"hello"}'
```

PowerShell smoke test:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8790/ai/wakeful-thread/respond" `
  -ContentType "application/json" `
  -Body '{"player":{"id":"me","role":"operator"},"progress":{"chapter":1},"recent":{},"prompt":"hello"}'
```

If PowerShell reports a `500` error, fetch and print the response body to see the exact backend detail:

```powershell
try {
  Invoke-RestMethod -Method Post -Uri "http://localhost:8790/ai/wakeful-thread/respond" `
    -ContentType "application/json" `
    -Body '{"player":{"id":"me","role":"operator"},"progress":{"chapter":1},"recent":{},"prompt":"hello"}'
} catch {
  $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $reader.ReadToEnd()
}
```

Common `500` detail values:

- `OPENAI_API_KEY missing` → key not set in the same shell session that launched `npm run dev:wakeful-ai`.
- `openai 401 ...` → invalid key or wrong OpenAI project/org permissions.
- `openai 404 ...` or model-not-found style message → set `WAKEFUL_AI_MODEL=gpt-4o-mini` and restart the wakeful AI service.
- `model: undefined` in backend detail → clear bad env values and set either `WAKEFUL_AI_MODEL` or `OPENAI_MODEL`, then fully restart the wakeful AI process.

PowerShell reset example:

```powershell
Remove-Item Env:WAKEFUL_AI_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:OPENAI_MODEL -ErrorAction SilentlyContinue
$env:WAKEFUL_AI_MODEL = "gpt-4o-mini"
npm run dev:wakeful-ai
```

The assistant receives chapter, objectives, recent terminal commands, forensic trail, and role data so it can provide progression-aware guidance in-character.

### Multiplayer room persistence

By default, room snapshots are saved under:

- `server/.room-store`

Important env vars:

- `ROOM_STORE_DIR`
- `ROOM_HISTORY_LIMIT`
- `ROOM_TTL_MS`
- `ROOM_ARCHIVE_EXPIRED`
- `PRELOAD_ROOMS_ON_START`

## Gameplay Basics

- Use desktop icons or Start menu entries to open apps.
- The **Terminal** is central for progression.
- The **Explorer** lets you read story files and logs.
- The **Objectives panel** tracks visible goals based on role/chapter.
- Chapter progression is state-driven; key objectives unlock subsequent acts.

## Terminal Commands

Core commands:

- `help`
- `ls`
- `cd`
- `cat`
- `clear`
- `pwd`
- `whoami`
- `history`
- `date`
- `reset-session`

Progression-focused commands:

- `unlock archive`
- `set-time HH:MM`
- `recover --manifest`
- `strings <file>`

Observer/co-op support commands:

- `anomaly-hint`
- `ping operator`
- `relay exec <code>`

Notes:

- In co-op, some commands are restricted to the **operator** role.
- `recover --manifest` is only allowed during the in-game maintenance window.

## Progression Guide (High Level)

- **Chapter 1** centers on archive access and clock alignment.
- **Chapter 2** centers on recovery/decoding and audit evidence.
- **Chapter 3** resolves based on trust/conflict trajectory (most visible in co-op).

For a full step-by-step practical walkthrough, see:

- `Dev_Playthrough.txt`

## Saving and Resetting

Solo session progress is stored in browser `localStorage` under:

- `eidolon_state_v1`

Reset options:

- Use terminal: `reset-session`
- Or clear storage from browser devtools.

## Testing

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

Track CI runs and artifacts in [GitHub Actions workflow history](../../actions/workflows/ci.yml).

Run lint checks before committing code changes:

```bash
npm run lint
```

Use `npm run lint:fix` when you want ESLint to auto-fix safe issues.

Format code with Prettier before opening a PR:

```bash
npm run format
```

Validate formatting in CI/local preflight checks:

```bash
npm run format:check
```

Run the test suite when validating behavior and regression risk:

```bash
npm test
```

Run coverage with Node's built-in test runner coverage flags:

```bash
npm run test:coverage
```

Coverage thresholds are enforced globally (lines/functions/branches) and CI will fail if coverage drops below the configured baseline.

The repository uses Node's built-in test runner (`node --test`).

## Style & UI Consistency Notes

Use these shared styles when building/updating `src/apps/*.js` content to keep UI consistent.

### Design tokens (`src/styles/tokens.css`)

- Spacing: `--space-1` through `--space-8`
- Typography: `--font-size-xs|sm|md|lg|xl|display`, `--font-ui`, `--font-mono`
- Radii: `--radius-none|sm|md`
- Elevation: `--elevation-1`, `--elevation-2`
- Motion: `--duration-fast|base|slow`
- Semantic colors: `--color-*` variables

### Reusable components (`src/styles/components.css`)

- `.panel-card`
- `.input-field`
- `.btn-primary`, `.btn-secondary`
- Shared interactive states for Start/taskbar/icon/window controls

### Layout and effects

- Keep layout primitives in `src/styles/layout.css`
- Keep cinematic/flicker/scanline rules in `src/styles/effects.css`
- In `index.html`, load styles in this order:
  `tokens.css` → `layout.css` → `components.css` → `effects.css`

## Troubleshooting

- **Blank page or missing assets:** confirm static server is running on `:4173`.
- **Co-op not connecting:** confirm multiplayer server is running on `:8787` (or your configured port).
- **Progression seems stuck:** check objectives, read more files in Explorer, and verify command syntax in Terminal.
- **Need a fresh run:** execute `reset-session` in Terminal.

## License

See [LICENSE](./LICENSE).
