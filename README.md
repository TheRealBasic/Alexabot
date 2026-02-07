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
