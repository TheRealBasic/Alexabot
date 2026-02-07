export function openNotes({ makeWindow, state, saveState }) {
  makeWindow("notes", "Notes", (content) => {
    const text = state.notesDraft || "The cursor was already here when I opened this.\n\n";
    content.innerHTML = "<textarea id='notesArea'></textarea><div class='notice' id='notesMeta'>autosave enabled — revision control unavailable</div>";
    const area = content.querySelector("#notesArea");
    const meta = content.querySelector("#notesMeta");
    area.value = text;

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
