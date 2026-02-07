export function openNotes({ makeWindow, state, saveState }) {
  makeWindow("notes", "Notes", (content) => {
    const text = state.notesDraft || "The cursor was already here when I opened this.\n\n";

    const viewed = state.viewed || {};
    const seenContinuity = (viewed["/home/operator/docs/continuity_overview.txt"] || 0) > 0;
    const seenRecoveryHelp = (viewed["/system/help/recovery_help.txt"] || 0) > 0;
    const seenTriangulation = (viewed["/home/operator/docs/triangulation_protocol.txt"] || 0) > 0;
    const ranRecover = (state.terminalHistory || []).some((line) => /^recover\s+--manifest/i.test(line || ""));
    const ranStrings = (state.terminalHistory || []).some((line) => /^strings\s+\/media\/cam2_20030418\.dat/i.test(line || ""));

    const prompts = [];

    if (!seenContinuity) prompts.push("Open /home/operator/docs/continuity_overview.txt and compare language with incident logs.");
    if (seenContinuity && !state.unlocked.archive) prompts.push("Archive path ready: use Help guided authorization or terminal unlock path.");
    if (state.chapter >= 2 && !seenRecoveryHelp) prompts.push("Read /system/help/recovery_help.txt in Explorer for maintenance window constraints.");
    if (state.chapter >= 2 && seenRecoveryHelp && !ranRecover) prompts.push("You have recovery instructions—attempt manifest restoration during maintenance sync.");
    if (state.chapter >= 2 && state.unlocked.mediaPartial && !ranStrings) prompts.push("Partial media extract indicates cam2 string payload—verify with terminal or media unlock.");
    if (state.chapter >= 3 && !seenTriangulation) prompts.push("Locate triangulation protocol in docs and combine it with terminal + settings evidence.");
    if (state.chapter >= 3 && seenTriangulation && ranRecover && !state.unlocked.witnessMap) prompts.push("All three channels touched. Open Help to compile composite witness map.");

    content.innerHTML = "<textarea id='notesArea'></textarea><div class='notice'>autosave enabled — revision control unavailable</div><div id='promptBox' class='notice' style='margin-top:8px'></div>";
    const area = content.querySelector("#notesArea");
    const promptBox = content.querySelector("#promptBox");
    area.value = text;

    promptBox.innerHTML = prompts.length
      ? `<strong>Reactive prompts:</strong><ul>${prompts.map((prompt) => `<li>${prompt}</li>`).join("")}</ul>`
      : "Reactive prompts: No active prompts. Maintain continuity.";

    area.oninput = () => {
      state.notesDraft = area.value;
      saveState();
    };
  });
}
