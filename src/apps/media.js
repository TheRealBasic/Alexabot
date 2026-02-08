import { appendForensicTrace, appendTerminalEvent } from "../state.js";

function probeForState(state) {
  const revealed = state.unlocked.mediaReveal;
  return {
    container: revealed ? "RIFF/AVI (validated)" : "RIFF/AVI (header drift)",
    codecProbe: revealed ? "mpeg4/simple profile" : "unknown codec id 0x00E1",
    frameAnomaly: revealed ? "frame 228 temporal inversion (confirmed)" : "frame timing unavailable until secondary decode",
    checksum: revealed ? "cam2 payload checksum mismatch @ block 7" : "checksum pending decode pass"
  };
}

export function openMedia({ makeWindow, files, state, saveState }) {
  makeWindow("media", "Media Player", (content, win) => {
    const stage = state.unlocked.mediaReveal
      ? "Secondary decode completed from cam2_20030418.dat"
      : "Run `strings /media/cam2_20030418.dat` in Terminal to attempt secondary decode.";
    const probe = probeForState(state);

    content.innerHTML = `<div class='app-shell'><div class='system-label'>media decode monitor</div><div class='panel-dense'><div class='kv-diagnostics'>
      <div class='kv-row'><span class='kv-key'>asset</span><span class='kv-value'>hallway_capture.avi</span></div>
      <div class='kv-row'><span class='kv-key'>container</span><span class='kv-value'>${probe.container}</span></div>
      <div class='kv-row'><span class='kv-key'>codec probe</span><span class='kv-value'>${probe.codecProbe}</span></div>
      <div class='kv-row'><span class='kv-key'>frame anomalies</span><span class='kv-value'>${probe.frameAnomaly}</span></div>
      <div class='kv-row'><span class='kv-key'>checksum mismatch</span><span class='kv-value'>${probe.checksum}</span></div>
    </div><div class='notice'>${stage}</div><pre style='white-space:pre-wrap; margin-top:6px'>${files["/media/hallway_capture.avi"]}</pre></div></div>`;

    appendForensicTrace(state, "media.probe", `container=${probe.container}; codec=${probe.codecProbe}`);
    appendTerminalEvent(state, `media: probe hallway_capture.avi (${state.unlocked.mediaReveal ? "decoded" : "partial"})`);
    saveState();
    win?.setHealth?.(state.unlocked.mediaReveal ? "active" : "stale");
  });
}
