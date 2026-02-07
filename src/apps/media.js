export function openMedia({ makeWindow, files, state }) {
  makeWindow("media", "Media Player", (content) => {
    const stage = state.unlocked.mediaReveal
      ? "Secondary decode completed from cam2_20030418.dat"
      : "Run `strings /media/cam2_20030418.dat` in Terminal to attempt secondary decode.";

    content.innerHTML = `<div><strong>Loaded media:</strong> hallway_capture.avi</div>
      <div class='notice'>Codec pack missing. Partial metadata only.</div>
      <div class='notice'>${stage}</div>
      <pre style='white-space:pre-wrap; margin-top:8px'>${files["/media/hallway_capture.avi"]}</pre>`;
  });
}
