export function openNotes({ makeWindow, state, saveState }) {
  makeWindow("notes", "Notes", (content, win) => {
    const text = state.notesDraft || "The cursor was already here when I opened this.\n\n";
    content.innerHTML = "<div class='app-shell'><div class='system-label'>scratch buffer</div><textarea id='notesArea'></textarea><div class='notice' id='notesMeta'>autosave enabled — revision control unavailable</div></div>";
    const area = content.querySelector("#notesArea");
    const meta = content.querySelector("#notesMeta");
    area.value = text;
    win?.setHealth?.("active");

    const updateMeta = () => {
      const words = area.value.trim() ? area.value.trim().split(/\s+/).length : 0;
      meta.textContent = `autosave enabled — ${words} words`;
    };

    updateMeta();
    area.oninput = () => {
      state.notesDraft = area.value;
      updateMeta();
      saveState();
    };
  });
}
