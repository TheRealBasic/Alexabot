export function openNotes({ makeWindow, state, saveState }) {
  makeWindow("notes", "Notes", (content) => {
    const text = state.notesDraft || "The cursor was already here when I opened this.\n\n";
    content.innerHTML = "<textarea id='notesArea'></textarea><div class='notice'>autosave enabled — revision control unavailable</div>";
    const area = content.querySelector("#notesArea");
    area.value = text;
    area.oninput = () => {
      state.notesDraft = area.value;
      saveState();
    };
  });
}
