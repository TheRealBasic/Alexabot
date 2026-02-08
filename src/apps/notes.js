import { appendForensicTrace, appendTerminalEvent } from "../state.js";

function stamp(ts = Date.now()) {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19);
}

export function openNotes({ makeWindow, state, saveState }) {
  makeWindow("notes", "Notes", (content, win) => {
    const text = state.notesDraft || "The cursor was already here when I opened this.\n\n";
    if (!Array.isArray(state.notesRevisions)) state.notesRevisions = [];
    if (!Array.isArray(state.notesConflictMarkers)) state.notesConflictMarkers = [];

    content.innerHTML = "<div class='app-shell'><div class='system-label'>scratch buffer</div><textarea id='notesArea'></textarea><div class='notice' id='notesMeta'>autosave enabled — revision control unavailable</div><div class='kv-diagnostics' id='notesRevisions'></div></div>";
    const area = content.querySelector("#notesArea");
    const meta = content.querySelector("#notesMeta");
    const revisionsPanel = content.querySelector("#notesRevisions");
    area.value = text;
    win?.setHealth?.("active");

    const renderRevisions = () => {
      const recent = state.notesRevisions.slice(-4).reverse();
      const conflicts = state.notesConflictMarkers.slice(-2).reverse();
      const rows = [];
      for (const rev of recent) {
        rows.push(`<div class='kv-row'><span class='kv-key'>rev ${rev.id}</span><span class='kv-value'>${rev.ts} · ${rev.words} words</span></div>`);
      }
      for (const marker of conflicts) {
        rows.push(`<div class='kv-row'><span class='kv-key err'>conflict</span><span class='kv-value'>${marker.ts} · ${marker.note}</span></div>`);
      }
      revisionsPanel.innerHTML = rows.join("") || "<div class='kv-row'><span class='kv-key'>rev</span><span class='kv-value'>no revisions captured</span></div>";
    };

    const updateMeta = () => {
      const words = area.value.trim() ? area.value.trim().split(/\s+/).length : 0;
      const latestRev = state.notesRevisions[state.notesRevisions.length - 1];
      const lastSaved = latestRev ? latestRev.ts : "n/a";
      meta.textContent = `autosave enabled — ${words} words — last revision ${lastSaved}`;
    };

    let autosaveTimer = null;
    const queueRevision = () => {
      if (autosaveTimer) clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        const value = area.value;
        const ts = stamp();
        const words = value.trim() ? value.trim().split(/\s+/).length : 0;
        const id = (state.notesRevisions.at(-1)?.id || 0) + 1;
        state.notesRevisions.push({ id, ts, words, snapshot: value.slice(0, 220) });
        state.notesRevisions = state.notesRevisions.slice(-12);

        if (state.notesRevisions.length > 1) {
          const previous = state.notesRevisions[state.notesRevisions.length - 2];
          if (Math.abs(previous.words - words) >= 25) {
            state.notesConflictMarkers.push({ ts, note: "concurrent buffer divergence resolved by mediator" });
            state.notesConflictMarkers = state.notesConflictMarkers.slice(-8);
            appendForensicTrace(state, "notes.conflict", `revision=${id}`);
            appendTerminalEvent(state, `notes: conflict marker inserted rev=${id}`);
            win?.setHealth?.("stale");
          } else {
            win?.setHealth?.("active");
          }
        }

        appendForensicTrace(state, "notes.autosave", `revision=${id}; words=${words}`);
        appendTerminalEvent(state, `notes: autosave rev=${id}`);
        saveState();
        updateMeta();
        renderRevisions();
      }, 500);
    };

    updateMeta();
    renderRevisions();

    area.oninput = () => {
      state.notesDraft = area.value;
      updateMeta();
      queueRevision();
    };
  });
}
