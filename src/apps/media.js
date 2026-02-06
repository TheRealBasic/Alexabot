export function openMedia({ makeWindow, files, state }) {
  makeWindow("media", "Media Player", (content) => {
    content.innerHTML = `<div><strong>Loaded media:</strong> hallway_capture.avi</div>
      <div class='notice'>Codec pack missing. Partial metadata only.</div>
      <pre style='white-space:pre-wrap; margin-top:8px'>${files["/media/hallway_capture.avi"]}\n${state.unlocked.mediaReveal ? "\nSecondary decode channel detected in cam2_20030418.dat" : ""}</pre>`;
  });
}
