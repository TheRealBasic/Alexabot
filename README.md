# EIDOLON OS // Recovery Image

A browser-based narrative desktop simulation with progression across three acts.

## Run

```bash
npm run dev
```

Then open `http://localhost:4173`.

## Controls

- Double-click/click desktop icons or Start menu entries.
- Terminal commands: `help`, `ls`, `cd`, `cat`, `clear`, `pwd`, `unlock archive`, `set-time HH:MM`, `recover --manifest`, `strings <file>`, `whoami`, `history`, `date`, `reset-session`.

## Save Data

Progress is persisted to `localStorage` under `eidolon_state_v1`.
You can reset from **Start → Reset Session**.

## UI Style Guide (Compact)

Use these shared styles when building or updating `src/apps/*.js` content so the desktop stays consistent.

### Design tokens (`src/styles/tokens.css`)

- **Spacing scale**: `--space-1` through `--space-8` for margins, padding, and gaps.
- **Typography**: `--font-size-xs|sm|md|lg|xl|display` and `--font-ui` / `--font-mono`.
- **Radii**: `--radius-none|sm|md`.
- **Elevation**: `--elevation-1` (panel/window shadow), `--elevation-2` (glow text-shadow).
- **Motion**: `--duration-fast|base|slow` for transitions/animations.
- **Color semantics**: prefer `--color-*` values (`--color-text`, `--color-warning`, `--color-danger`, etc.) over raw hex values.

### Reusable components (`src/styles/components.css`)

- `.panel-card`: shared panel shell for framed blocks.
- `.input-field`: default text input appearance for login/lobby and future forms.
- `.btn-primary` / `.btn-secondary`: standard action buttons.
- `.start-btn`, `.start-item`, `.task`, `.icon`, `.win-controls button`: include unified `:hover`, `:focus-visible`, `:active`, `:disabled` states.

### Layout and effects

- Keep positioning/layout primitives in `src/styles/layout.css`.
- Keep cinematic/flicker/scanline animation rules in `src/styles/effects.css`.
- In `index.html`, load styles in this order: `tokens.css` → `layout.css` → `components.css` → `effects.css`.
