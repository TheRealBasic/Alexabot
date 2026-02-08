export function openSystemMonitor({ makeWindow, state }) {
  makeWindow("sysmon", "System Monitor", (content) => {
    const trust = Number(state.teamTrustScore || 0);
    const conflicts = Array.isArray(state.recentConflicts) ? state.recentConflicts.length : 0;
    content.innerHTML = `<div class="app-shell">
      <div class="system-label">system monitor lite</div>
      <div class="panel-dense">
        <div>cpu load: ${24 + Math.max(0, trust) * 3}%</div>
        <div>memory free: ${43120 - conflicts * 1500} kB</div>
        <div>archive-daemon: ${state.chapter >= 2 ? "degraded" : "active"}</div>
        <div>rtc-sync: active</div>
        <div>relay-link: ${state.sessionMode === "coop" ? "active" : "idle"}</div>
      </div>
    </div>`;
  });
}
