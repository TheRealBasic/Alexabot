export function openMedia({ makeWindow, files, state }) {
  makeWindow("media", "Media Player", (content, win) => {
    const stage = state.unlocked.mediaReveal
      ? "Secondary decode completed from cam2_20030418.dat"
      : "Run `strings /media/cam2_20030418.dat` in Terminal to attempt secondary decode.";

    content.innerHTML = `<div class='app-shell'><div class='system-label'>media decode monitor</div><div class='panel-dense'><div class='kv-diagnostics'><div class='kv-row'><span class='kv-key'>asset</span><span class='kv-value'>hallway_capture.avi</span></div><div class='kv-row'><span class='kv-key'>codec</span><span class='kv-value'><span class='status-badge fault'>missing</span></span></div></div><div class='notice'>${stage}</div><pre style='white-space:pre-wrap; margin-top:6px'>${files["/media/hallway_capture.avi"]}</pre></div></div>`;
    win?.setHealth?.(state.unlocked.mediaReveal ? 'active' : 'stale');
  });
}
